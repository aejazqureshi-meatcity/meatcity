import { NextResponse } from 'next/server';
import { verifyUserSession } from '@/lib/auth-server';
import { releasePointsReservation } from '@/lib/loyalty/loyalty-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const auth = await verifyUserSession(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reservationId } = body;

    if (!reservationId) {
      return NextResponse.json({ error: 'Reservation ID required' }, { status: 400 });
    }

    const result = await releasePointsReservation(String(reservationId));
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API Loyalty Release] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to release reservation' }, { status: 500 });
  }
}
