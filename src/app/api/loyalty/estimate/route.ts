import { NextResponse } from 'next/server';
import { verifyUserSession } from '@/lib/auth-server';
import { estimateOrderPoints } from '@/lib/loyalty/loyalty-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const subtotal = Number(body.subtotal || 0);
    const userRole = body.userRole || body.role || 'b2c';
    const couponApplied = Boolean(body.couponApplied);

    // Optional user verification to get available balance and tier multiplier
    let userId: string | undefined = undefined;
    const auth = await verifyUserSession(request);
    if (auth.authorized && auth.user) {
      userId = auth.user.id;
    } else if (body.userId) {
      userId = String(body.userId);
    }

    const estimate = await estimateOrderPoints(
      Number(subtotal), 
      userId, 
      userRole, 
      Boolean(couponApplied)
    );

    return NextResponse.json({
      success: true,
      ...estimate,
    });
  } catch (err: any) {
    console.error('[API Loyalty Estimate] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to calculate estimate' }, { status: 500 });
  }
}
