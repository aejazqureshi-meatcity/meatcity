import { NextResponse } from 'next/server';
import { verifyUserSession } from '@/lib/auth-server';
import { reservePoints } from '@/lib/loyalty/loyalty-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const auth = await verifyUserSession(request);
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: 'Please log in to redeem points.' }, { status: 401 });
    }

    const body = await request.json();
    const { points, cartSessionId } = body;

    if (!points || points <= 0 || !cartSessionId) {
      return NextResponse.json({ error: 'Invalid points or session ID' }, { status: 400 });
    }

    const result = await reservePoints(auth.user.id, Number(points), String(cartSessionId));

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API Loyalty Reserve] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to reserve points' }, { status: 500 });
  }
}
