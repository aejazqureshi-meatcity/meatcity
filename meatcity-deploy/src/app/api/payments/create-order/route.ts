import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { amount, receipt } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required.' }, { status: 400 });
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Check if we should use mock payment mode (mock DB active or development)
    const isMock = process.env.NEXT_PUBLIC_USE_MOCK_DB === 'true' || 
                   !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                   !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                   process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your_supabase_project_url_here');

    if (!isMock) {
      if (!keyId || !keySecret) {
        return NextResponse.json({ error: 'Razorpay credentials not configured in production.' }, { status: 500 });
      }
    }

    if (isMock) {
      // Return a simulated Razorpay order ID
      const mockOrderId = 'order_mock_' + Math.random().toString(36).substr(2, 9);
      return NextResponse.json({
        success: true,
        id: mockOrderId,
        amount: amount * 100,
        currency: 'INR',
        isMock: true
      });
    }

    // Call actual Razorpay orders API using basic auth
    const authString = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // in paise
        currency: 'INR',
        receipt: receipt || 'rcpt_' + Math.floor(Math.random() * 1000000)
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Razorpay orders API error:', errorText);
      return NextResponse.json({ error: 'Failed to initiate Razorpay transaction.' }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      id: data.id,
      amount: data.amount,
      currency: data.currency,
      isMock: false
    });
  } catch (error: any) {
    console.error('Failed to create payment order:', error);
    return NextResponse.json({ error: error.message || 'Server error occurred.' }, { status: 500 });
  }
}
