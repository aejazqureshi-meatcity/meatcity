import { NextResponse } from 'next/server';
import { verifyUserSession } from '@/lib/auth-server';
import { reservePoints } from '@/lib/loyalty/loyalty-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { points, cartSessionId } = body;

    let userId: string | undefined = undefined;
    const auth = await verifyUserSession(request);
    if (auth.authorized && auth.user) {
      userId = auth.user.id;
    } else if (body.userId) {
      userId = String(body.userId);
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Please log in to redeem points.' }, { status: 401 });
    }

    if (!points || points <= 0 || !cartSessionId) {
      return NextResponse.json({ success: false, error: 'Invalid points or session ID' }, { status: 400 });
    }

    const result = await reservePoints(userId, Number(points), String(cartSessionId));

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error('[API Loyalty Reserve] Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to reserve points' }, { status: 400 });
  }
}
