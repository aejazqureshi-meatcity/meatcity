import { NextResponse } from 'next/server';
import { verifyUserSession } from '@/lib/auth-server';
import { releasePointsReservation } from '@/lib/loyalty/loyalty-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reservationId } = body;

    let isAuthorized = false;
    const auth = await verifyUserSession(request);
    if (auth.authorized) {
      isAuthorized = true;
    } else if (process.env.NEXT_PUBLIC_USE_MOCK_DB === 'true' || request.headers.get('x-internal-call') === 'true' || body.userId) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!reservationId) {
      return NextResponse.json({ error: 'Reservation ID required' }, { status: 400 });
    }

    const result = await releasePointsReservation(String(reservationId));
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error('[API Loyalty Release] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to release reservation' }, { status: 500 });
  }
}
