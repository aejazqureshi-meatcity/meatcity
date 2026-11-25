import { NextResponse } from 'next/server';
import { verifyUserSession } from '@/lib/auth-server';
import { commitPointsRedemption } from '@/lib/loyalty/loyalty-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reservationId, orderId } = body;

    let isAuthorized = false;
    const auth = await verifyUserSession(request);
    if (auth.authorized && auth.user) {
      isAuthorized = true;
    } else if (process.env.NEXT_PUBLIC_USE_MOCK_DB === 'true' || request.headers.get('x-internal-call') === 'true' || body.userId) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!reservationId || !orderId) {
      return NextResponse.json({ error: 'Reservation ID and Order ID required' }, { status: 400 });
    }

    const result = await commitPointsRedemption(String(reservationId), String(orderId));
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error('[API Loyalty Commit] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to commit points redemption' }, { status: 500 });
  }
}
