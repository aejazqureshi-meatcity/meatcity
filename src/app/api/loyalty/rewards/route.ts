import { NextResponse } from 'next/server';
import { verifyUserSession } from '@/lib/auth-server';
import { getServiceClient } from '@/lib/loyalty/loyalty-service';

export const dynamic = 'force-dynamic';

// GET: Fetch active rewards catalog
export async function GET() {
  try {
    const supabase = getServiceClient();
    const { data: rewards, error } = await supabase
      .from('loyalty_rewards')
      .select('*')
      .eq('is_active', true)
      .order('points_cost', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ success: true, rewards: rewards || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Claim a reward using points
export async function POST(request: Request) {
  try {
    const auth = await verifyUserSession(request);
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: 'Please log in to claim rewards.' }, { status: 401 });
    }

    const body = await request.json();
    const { rewardId } = body;
    if (!rewardId) {
      return NextResponse.json({ error: 'Reward ID is required' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // 1. Fetch reward
    const { data: reward, error: rErr } = await supabase
      .from('loyalty_rewards')
      .select('*')
      .eq('id', rewardId)
      .single();

    if (rErr || !reward || !reward.is_active) {
      return NextResponse.json({ error: 'Reward is no longer active or available' }, { status: 400 });
    }

    // 2. Fetch customer account
    const { data: account, error: aErr } = await supabase
      .from('loyalty_accounts')
      .select('*')
      .eq('user_id', auth.user.id)
      .single();

    if (aErr || !account) {
      return NextResponse.json({ error: 'Loyalty account not found' }, { status: 400 });
    }

    if (account.points_balance < reward.points_cost) {
      return NextResponse.json({ 
        error: `Insufficient points. You need ${reward.points_cost} points, but have ${account.points_balance}.` 
      }, { status: 400 });
    }

    // 3. Deduct points and generate claim voucher code
    const newBalance = account.points_balance - reward.points_cost;
    const claimCode = 'MC-RWD-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    // Insert debit ledger
    await supabase.from('loyalty_points_ledger').insert({
      user_id: auth.user.id,
      transaction_type: 'redeemed',
      points: -reward.points_cost,
      balance_after: newBalance,
      description: `Redeemed points for reward: ${reward.title}`,
    });

    // Update account balance
    await supabase
      .from('loyalty_accounts')
      .update({
        points_balance: newBalance,
        lifetime_points_redeemed: account.lifetime_points_redeemed + reward.points_cost,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', auth.user.id);

    // Insert claim
    const { data: claim, error: cErr } = await supabase
      .from('loyalty_reward_claims')
      .insert({
        reward_id: reward.id,
        user_id: auth.user.id,
        points_spent: reward.points_cost,
        claim_code: claimCode,
        status: 'active',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (cErr) throw cErr;

    return NextResponse.json({
      success: true,
      claimCode,
      claim,
      newBalance,
    });
  } catch (err: any) {
    console.error('[API Loyalty Claim] Error:', err);
    return NextResponse.json({ error: err.message || 'Claim failed' }, { status: 500 });
  }
}
