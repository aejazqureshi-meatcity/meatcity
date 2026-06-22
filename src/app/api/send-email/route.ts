import { NextResponse } from 'next/server';
import { sendOrderEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { order } = body;
    if (!order) {
      return NextResponse.json({ error: 'Order details required' }, { status: 400 });
    }

    const result = await sendOrderEmail(order);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API send-email error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
