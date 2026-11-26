import { NextResponse } from 'next/server';
import { verifyUserSession } from '@/lib/auth-server';
import { getServiceClient } from '@/lib/loyalty/loyalty-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { claimCode, orderId } = body;

    if (!claimCode) {
      return NextResponse.json({ error: 'Claim code is required' }, { status: 400 });
    }

    const auth = await verifyUserSession(request);
    let userId = auth.user?.id;

    const supabase = getServiceClient();

    // 1. Fetch claim by code
    const { data: claim, error: cErr } = await supabase
      .from('loyalty_reward_claims')
      .select('*, reward:loyalty_rewards(*)')
      .eq('claim_code', claimCode)
      .maybeSingle();

    if (cErr || !claim) {
      return NextResponse.json({ error: 'Reward voucher not found' }, { status: 404 });
    }

    // Check if already redeemed
    if (claim.status === 'redeemed') {
      return NextResponse.json({ success: true, message: 'Reward voucher already redeemed', idempotent: true });
    }

    if (claim.status !== 'active') {
      return NextResponse.json({ error: `Reward voucher is ${claim.status}` }, { status: 400 });
    }

    // Check expiration
    if (claim.expires_at && new Date(claim.expires_at).getTime() < Date.now()) {
      await supabase
        .from('loyalty_reward_claims')
        .update({ status: 'expired' })
        .eq('id', claim.id);
      return NextResponse.json({ error: 'Reward voucher has expired' }, { status: 400 });
    }

    // If orderId is provided, verify order subtotal eligibility
    if (orderId) {
      const { data: order } = await supabase
        .from('orders')
        .select('id, user_id, subtotal, role, user_role')
        .eq('id', orderId)
        .maybeSingle();

      if (order) {
        const orderRole = order.user_role || order.role;
        if (orderRole === 'b2b') {
          return NextResponse.json({ error: 'B2B wholesale orders are not eligible for loyalty rewards' }, { status: 403 });
        }
        if (claim.reward?.min_order_amount && (order.subtotal || 0) < claim.reward.min_order_amount) {
          return NextResponse.json({
            error: `Minimum order amount of ₹${claim.reward.min_order_amount} required to redeem this voucher`
          }, { status: 400 });
        }
      }
    }

    // 2. Mark redeemed atomically
    const { data: updated, error: uErr } = await supabase
      .from('loyalty_reward_claims')
      .update({
        status: 'redeemed',
        redeemed_order_id: orderId || null,
        redeemed_at: new Date().toISOString(),
      })
      .eq('id', claim.id)
      .select()
      .single();

    if (uErr) {
      console.error('[API Loyalty Redeem] Update error:', uErr);
      throw uErr;
    }

    return NextResponse.json({
      success: true,
      message: 'Reward voucher successfully redeemed',
      claim: updated,
    });
  } catch (err: any) {
    console.error('[API Loyalty Redeem] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to redeem reward' }, { status: 500 });
  }
}
