import { NextResponse } from 'next/server';
import { verifyUserSession } from '@/lib/auth-server';
import { 
  getOrCreateLoyaltyAccount, 
  getLoyaltySettings, 
  getLoyaltyTiers, 
  getPointsLedger, 
  getCustomerStampCards, 
  getCustomerReferrals 
} from '@/lib/loyalty/loyalty-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    let userId: string | null = null;
    const auth = await verifyUserSession(request);
    if (auth.authorized && auth.user) {
      userId = auth.user.id;
    } else {
      const url = new URL(request.url);
      userId = url.searchParams.get('userId');
    }

    if (!userId) {
      return NextResponse.json({ error: auth.error || 'Authentication required' }, { status: auth.status || 401 });
    }

    // Fetch loyalty data in parallel
    const [account, settings, tiers, stampCards, ledger, referrals] = await Promise.all([
      getOrCreateLoyaltyAccount(userId),
      getLoyaltySettings(),
      getLoyaltyTiers(),
      getCustomerStampCards(userId),
      getPointsLedger(userId, 25),
      getCustomerReferrals(userId),
    ]);

    const rupeeValue = Math.round(account.points_balance * settings.point_rupee_value * 100) / 100;
    const currentTier = tiers.find((t) => t.id === account.tier_id) || tiers[0];

    // Calculate progress to next tier
    let nextTier = null;
    let progressPercent = 100;
    let spendNeeded = 0;
    let ordersNeeded = 0;

    const currentPriority = currentTier.priority_order;
    const higherTiers = tiers.filter((t) => t.priority_order > currentPriority).sort((a, b) => a.priority_order - b.priority_order);

    if (higherTiers.length > 0) {
      nextTier = higherTiers[0];
      const spendProgress = nextTier.min_spend > 0 ? (account.lifetime_spend / nextTier.min_spend) * 100 : 100;
      const orderProgress = nextTier.min_orders > 0 ? (account.total_orders_completed / nextTier.min_orders) * 100 : 100;
      progressPercent = Math.min(100, Math.max(spendProgress, orderProgress));
      spendNeeded = Math.max(0, nextTier.min_spend - account.lifetime_spend);
      ordersNeeded = Math.max(0, nextTier.min_orders - account.total_orders_completed);
    }

    // Active stamp card
    const activeStampCard = stampCards.find((c) => c.status === 'active') || stampCards[0];

    return NextResponse.json({
      success: true,
      account,
      settings: {
        isEnabled: settings.is_enabled,
        pointRupeeValue: settings.point_rupee_value,
        pointsPerRupee: settings.points_per_rupee,
        minOrderForEarn: settings.min_order_amount_for_earn,
        minPointsForRedemption: settings.min_points_for_redemption,
        maxRedemptionPercent: settings.max_redemption_percent_per_order,
        pointsExpiryDays: settings.points_expiry_days,
        stampCardEnabled: settings.stamp_card_enabled,
        stampsRequired: settings.stamps_required_per_card,
        referralEnabled: settings.referral_enabled,
        referrerRewardPoints: settings.referrer_reward_points,
        refereeRewardDiscount: settings.referee_reward_discount,
      },
      rupeeValue,
      currentTier,
      nextTier,
      tierProgress: {
        percent: Math.round(progressPercent),
        spendNeeded,
        ordersNeeded,
      },
      activeStampCard,
      stampCards,
      ledger,
      referrals,
    });
  } catch (err: any) {
    console.error('[API Loyalty Account] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to load loyalty account' }, { status: 500 });
  }
}
