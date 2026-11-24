import { NextResponse } from 'next/server';
import { verifyUserSession } from '@/lib/auth-server';
import { awardOrderLoyalty, reverseOrderLoyalty } from '@/lib/loyalty/loyalty-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Can be called by authenticated admin, delivery partner, or internal webhook
    const auth = await verifyUserSession(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, action, reason } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    if (action === 'reverse') {
      const result = await reverseOrderLoyalty(String(orderId), reason || 'Order cancelled');
      return NextResponse.json(result);
    } else {
      const result = await awardOrderLoyalty(String(orderId));
      return NextResponse.json(result);
    }
  } catch (err: any) {
    console.error('[API Loyalty Award Order] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to process order loyalty' }, { status: 500 });
  }
}
