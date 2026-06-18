import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      paymentType, // 'order' or 'repayment'
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature,
      payload // contains orderPayload or repayment details
    } = body;

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Check if we are running in mock payment mode (mock DB active or development)
    const isMock = process.env.NEXT_PUBLIC_USE_MOCK_DB === 'true' || 
                   !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                   !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                   process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your_supabase_project_url_here');

    if (!isMock) {
      if (!keyId || !keySecret) {
        return NextResponse.json({ error: 'Razorpay credentials not configured in production.' }, { status: 500 });
      }

      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        return NextResponse.json({ error: 'Missing payment signature credentials.' }, { status: 400 });
      }

      // Perform server-side HMAC verification
      const generated_signature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generated_signature !== razorpay_signature) {
        console.error('Razorpay signature verification failed.');
        return NextResponse.json({ error: 'Payment verification failed. Security breach logged.' }, { status: 400 });
      }
    }

    // Initialize database client (retains user cookie auth context)
    const supabase = createClient();

    if (paymentType === 'order') {
      const { orderPayload } = payload;
      if (!orderPayload) {
        return NextResponse.json({ error: 'Missing order details.' }, { status: 400 });
      }

      // Add payment verification details to the order payload
      const secureOrderPayload = {
        ...orderPayload,
        payment_status: 'Paid',
        payment_ref: razorpay_payment_id || 'mock_pay_id_' + Math.random().toString(36).substr(2, 9)
      };

      // Write order directly to database
      const { error: orderError } = await supabase.from('orders').insert(secureOrderPayload);
      if (orderError) {
        console.error('Failed to save verified order:', orderError);
        return NextResponse.json({ error: 'Failed to write order: ' + orderError.message }, { status: 500 });
      }

      // Insert notifications for user and admin
      try {
        await supabase.from('notifications').insert({
          user_id: secureOrderPayload.user_id,
          title: 'Order Placed successfully 🎉',
          message: `Your order ${secureOrderPayload.id} for ₹${secureOrderPayload.total} has been verified and placed.`,
          type: 'new_order'
        });

        await supabase.from('notifications').insert({
          user_id: 'd7b7b123-1234-5678-abcd-123456789abc', // Admin ID
          title: 'New Order Verified 📦',
          message: `Order ${secureOrderPayload.id} placed by ${secureOrderPayload.customer_name} for ₹${secureOrderPayload.total} has been paid and verified.`,
          type: 'new_order'
        });
      } catch (nErr) {
        console.error('Failed to trigger database notifications:', nErr);
      }

      return NextResponse.json({ success: true, orderId: secureOrderPayload.id });

    } else if (paymentType === 'repayment') {
      const { userId, amount } = payload;
      if (!userId || !amount || amount <= 0) {
        return NextResponse.json({ error: 'Missing repayment parameters.' }, { status: 400 });
      }

      const paymentRef = razorpay_payment_id || 'mock_pay_ref_' + Math.random().toString(36).substr(2, 9);

      // Create a verified payment entry
      const paymentPayload = {
        id: 'pay-' + Math.random().toString(36).substr(2, 9),
        user_id: userId,
        amount: amount,
        status: 'Verified',
        payment_method: 'Online (Razorpay)',
        payment_ref: paymentRef,
        created_at: new Date().toISOString()
      };

      const { error: payError } = await supabase.from('payments').insert(paymentPayload);
      if (payError) {
        console.error('Failed to save repayment record:', payError);
        return NextResponse.json({ error: 'Failed to save repayment: ' + payError.message }, { status: 500 });
      }

      // Update B2B user's ledger and available credit limit
      const { data: userProfile } = await supabase.from('users').select('*').eq('id', userId).single();
      if (userProfile) {
        const newOutstanding = Math.max(0, (userProfile.outstanding_balance || 0) - amount);
        const newUsed = Math.max(0, (userProfile.credit_used || 0) - amount);
        const newAvailable = (userProfile.credit_limit || 50000) - newOutstanding;

        const ledgerEntry = {
          date: new Date().toISOString(),
          description: `Online Payment (Verified) - Ref: ${paymentRef}`,
          debit: 0,
          credit: amount,
          balance: newOutstanding
        };

        const updatedLedger = [...(userProfile.ledger || []), ledgerEntry];

        await supabase.from('users').update({
          outstanding_balance: newOutstanding,
          credit_used: newUsed,
          credit_available: newAvailable,
          last_payment_date: new Date().toISOString().split('T')[0],
          ledger: updatedLedger
        }).eq('id', userId);

        try {
          await supabase.from('notifications').insert({
            user_id: userId,
            title: 'Repayment Approved 👍',
            message: `Your payment of ₹${amount} has been verified. Available credit updated to ₹${newAvailable}.`,
            type: 'payment_repayment'
          });
        } catch (nErr) {
          console.error('Failed to send repayment notification:', nErr);
        }
      }

      return NextResponse.json({ success: true, paymentRef });
    }

    return NextResponse.json({ error: 'Invalid payment verification type.' }, { status: 400 });
  } catch (error: any) {
    console.error('Failed to verify payment:', error);
    return NextResponse.json({ error: error.message || 'Server error occurred.' }, { status: 500 });
  }
}
