import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth-server';
import { getServiceClient, getLoyaltySettings } from '@/lib/loyalty/loyalty-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await verifyAdminSession(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Admin authorization required' }, { status: auth.status || 401 });
    }

    const supabase = getServiceClient();
    const settings = await getLoyaltySettings();

    // 1. Fetch loyalty accounts count & totals
    const { data: accounts, error: accErr } = await supabase
      .from('loyalty_accounts')
      .select('tier_id, points_balance, lifetime_points_earned, lifetime_points_redeemed, lifetime_spend, total_orders_completed, is_suspended');

    const totalEnrolled = accounts?.length || 0;
    const totalPointsEarned = accounts?.reduce((sum: number, a: any) => sum + (a.lifetime_points_earned || 0), 0) || 0;
    const totalPointsRedeemed = accounts?.reduce((sum: number, a: any) => sum + (a.lifetime_points_redeemed || 0), 0) || 0;
    const activePointsBalance = accounts?.reduce((sum: number, a: any) => sum + (a.points_balance || 0), 0) || 0;
    const pointsLiabilityRupees = Math.round(activePointsBalance * settings.point_rupee_value * 100) / 100;

    // Tier distribution
    const tierDistribution: Record<string, number> = { silver: 0, gold: 0, platinum: 0 };
    accounts?.forEach((a: any) => {
      const tier = a.tier_id || 'silver';
      tierDistribution[tier] = (tierDistribution[tier] || 0) + 1;
    });

    // 2. Fetch completed stamp cards
    const { count: completedStampCards } = await supabase
      .from('loyalty_stamp_cards')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    // 3. Fetch referrals conversions
    const { count: totalReferrals } = await supabase
      .from('loyalty_referrals')
      .select('*', { count: 'exact', head: true });

    const { count: rewardedReferrals } = await supabase
      .from('loyalty_referrals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'rewarded');

    // 4. Repeat purchase rate from loyalty accounts
    const repeatCustomers = accounts?.filter((a: any) => (a.total_orders_completed || 0) > 1).length || 0;
    const repeatPurchaseRate = totalEnrolled > 0 ? Math.round((repeatCustomers / totalEnrolled) * 100) : 0;

    const tierBreakdown = {
      silver: tierDistribution.silver || 0,
      gold: tierDistribution.gold || 0,
      platinum: tierDistribution.platinum || 0,
    };

    const overviewStats = {
      totalEnrolled,
      activeMembers: totalEnrolled,
      activePointsBalance,
      totalPointsEarned,
      totalPointsIssued: totalPointsEarned,
      totalPointsRedeemed,
      pointsLiabilityRupees,
      activeLiabilityRupees: pointsLiabilityRupees,
      tierDistribution,
      tierBreakdown,
      completedStampCards: completedStampCards || 0,
      totalReferrals: totalReferrals || 0,
      rewardedReferrals: rewardedReferrals || 0,
      referralRevenue: 0,
      repeatPurchaseRate,
      isEnabled: settings.is_enabled,
    };

    return NextResponse.json({
      success: true,
      stats: overviewStats,
      ...overviewStats,
    });
  } catch (err: any) {
    console.error('[API Admin Loyalty Overview] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch overview' }, { status: 500 });
  }
}
