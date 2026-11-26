import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { 
  LoyaltySettings, 
  LoyaltyTier, 
  LoyaltyAccount, 
  LoyaltyPointsLedgerEntry, 
  LoyaltyStampCard, 
  LoyaltyReward, 
  LoyaltyRewardClaim, 
  LoyaltyReferral 
} from './types';

// Default loyalty settings matching approved local testing parameters
export const DEFAULT_LOYALTY_SETTINGS: LoyaltySettings = {
  id: 1,
  is_enabled: true, // Enabled for local testing (disabled in production until approved)
  points_per_rupee: 0.02, // 2 points per ₹100 of eligible net merchandise spend
  point_rupee_value: 1.0, // ₹1 per point
  min_order_amount_for_earn: 100,
  min_points_for_redemption: 50, // Minimum 50 points required to redeem
  max_redemption_percent_per_order: 10, // Maximum 10% of eligible merchandise subtotal
  max_points_redemption_per_order: 1000,
  points_expiry_days: 180, // Points valid for 180 days
  can_combine_with_coupons: false, // Coupon & loyalty stacking disabled until owner approval
  discounted_products_earn_points: true,
  eligible_customer_types: ['b2c'], // B2C only; B2B wholesale loyalty disabled
  stamp_card_enabled: true,
  stamps_required_per_card: 10, // 10 qualifying completed orders
  min_order_for_stamp: 400, // Minimum qualifying merchandise order value of ₹400
  stamp_reward_type: 'free_product', // Free 250g Chicken Curry Cut
  stamp_reward_value: 0,
  max_stamps_per_day: 1,
  referral_enabled: false,
  referrer_reward_points: 0,
  referee_reward_discount: 0,
  min_order_for_referral: 0,
  birthday_reward_enabled: false,
  birthday_reward_points: 0,
};

export const DEFAULT_LOYALTY_TIERS: LoyaltyTier[] = [
  {
    id: 'silver',
    name: 'Silver Member',
    min_spend: 0,
    min_orders: 0,
    points_multiplier: 1.0,
    benefits_description: 'Standard 1x points on fresh cuts. Standard delivery.',
    delivery_benefit: 'standard',
    badge_color: '#C0C0C0',
    icon: '🥈',
    priority_order: 1,
  },
  {
    id: 'gold',
    name: 'Gold Member',
    min_spend: 2500,
    min_orders: 5,
    points_multiplier: 1.25,
    benefits_description: '1.25x points multiplier. Priority order packing & seasonal perks.',
    delivery_benefit: 'priority',
    badge_color: '#D4AF37',
    icon: '🥇',
    priority_order: 2,
  },
  {
    id: 'platinum',
    name: 'Platinum VIP',
    min_spend: 7500,
    min_orders: 15,
    points_multiplier: 1.5,
    benefits_description: '1.5x points multiplier. Free delivery on orders above ₹499 & exclusive early festival cuts.',
    delivery_benefit: 'free_above_threshold',
    badge_color: '#E5E4E2',
    icon: '💎',
    priority_order: 3,
  },
];

// Helper to get service role client for privileged database operations
export function getServiceClient() {
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DB === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (useMock) {
    const { MockSupabaseClient } = require('../supabase-mock');
    return new MockSupabaseClient() as any;
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (serviceRoleKey && supabaseUrl) {
    return createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return createServerSupabase();
}

/**
 * Fetch active loyalty settings with fallback to defaults
 */
export async function getLoyaltySettings(): Promise<LoyaltySettings> {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('loyalty_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (!error && data) {
      return data as LoyaltySettings;
    }
  } catch (err) {
    console.warn('[Loyalty Service] Failed to load settings from DB, using defaults:', err);
  }
  return DEFAULT_LOYALTY_SETTINGS;
}

/**
 * Update loyalty settings (Admin only)
 */
export async function updateLoyaltySettings(settings: Partial<LoyaltySettings>, adminId: string) {
  const supabase = getServiceClient();
  const payload = {
    ...settings,
    id: 1,
    updated_at: new Date().toISOString(),
    updated_by: adminId,
  };

  const { data, error } = await supabase
    .from('loyalty_settings')
    .upsert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Audit log
  await supabase.from('loyalty_audit_logs').insert({
    action: 'settings_update',
    performed_by: adminId,
    details: settings,
    reason: 'Admin updated loyalty settings',
  });

  return data;
}

/**
 * Get all loyalty tiers
 */
export async function getLoyaltyTiers(): Promise<LoyaltyTier[]> {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('loyalty_tiers')
      .select('*')
      .order('priority_order', { ascending: true });

    if (!error && data && data.length > 0) {
      return data as LoyaltyTier[];
    }
  } catch (err) {
    console.warn('[Loyalty Service] Failed to load tiers, using defaults:', err);
  }
  return DEFAULT_LOYALTY_TIERS;
}

/**
 * Fetch or initialize a customer's loyalty account
 */
export async function getOrCreateLoyaltyAccount(userId: string): Promise<LoyaltyAccount> {
  const supabase = getServiceClient();

  try {
    // 1. Try fetching existing
    const { data: existing, error } = await supabase
      .from('loyalty_accounts')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!error && existing) {
      return existing as LoyaltyAccount;
    }

    // 2. Call RPC function if available
    const { data: rpcAccount, error: rpcErr } = await supabase.rpc('get_or_create_loyalty_account', {
      p_user_id: userId,
    });

    if (!rpcErr && rpcAccount) {
      return rpcAccount as LoyaltyAccount;
    }

    // 3. Fallback manual insert if RPC is missing
    const referralCode = 'MC' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const newAccount = {
      user_id: userId,
      tier_id: 'silver',
      points_balance: 0,
      lifetime_points_earned: 0,
      lifetime_points_redeemed: 0,
      lifetime_spend: 0,
      total_orders_completed: 0,
      referral_code: referralCode,
    };

    const { data: created, error: insertErr } = await supabase
      .from('loyalty_accounts')
      .insert(newAccount)
      .select()
      .single();

    if (!insertErr && created) {
      // Also insert initial active stamp card
      await supabase.from('loyalty_stamp_cards').insert({
        user_id: userId,
        card_number: 1,
        stamps_collected: 0,
        stamps_required: 10,
        status: 'active',
      });
      return created as LoyaltyAccount;
    }
  } catch (err) {
    console.error('[Loyalty Service] Error in getOrCreateLoyaltyAccount:', err);
  }

  // Graceful fallback dummy object if DB table is initializing
  return {
    id: 'temp-' + userId,
    user_id: userId,
    tier_id: 'silver',
    points_balance: 0,
    lifetime_points_earned: 0,
    lifetime_points_redeemed: 0,
    lifetime_spend: 0,
    total_orders_completed: 0,
    referral_code: 'MC' + userId.substring(0, 6).toUpperCase(),
    is_suspended: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Fetch customer points ledger
 */
export async function getPointsLedger(userId: string, limit = 20): Promise<LoyaltyPointsLedgerEntry[]> {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('loyalty_points_ledger')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && data) {
      return data as LoyaltyPointsLedgerEntry[];
    }
  } catch (err) {
    console.warn('[Loyalty Service] Error fetching ledger:', err);
  }
  return [];
}

/**
 * Fetch customer stamp cards
 */
export async function getCustomerStampCards(userId: string): Promise<LoyaltyStampCard[]> {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('loyalty_stamp_cards')
      .select('*')
      .eq('user_id', userId)
      .order('card_number', { ascending: false });

    if (!error && data && data.length > 0) {
      return data as LoyaltyStampCard[];
    }
  } catch (err) {
    console.warn('[Loyalty Service] Error fetching stamp cards:', err);
  }

  // Default active stamp card if none in DB
  return [
    {
      id: 'default-card',
      user_id: userId,
      card_number: 1,
      stamps_collected: 0,
      stamps_required: 10,
      status: 'active',
      created_at: new Date().toISOString(),
    },
  ];
}

/**
 * Fetch customer referrals
 */
export async function getCustomerReferrals(userId: string): Promise<LoyaltyReferral[]> {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('loyalty_referrals')
      .select(`
        *,
        referee:users!loyalty_referrals_referee_id_fkey(full_name, phone)
      `)
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data.map((r: any) => ({
        ...r,
        referee_name: r.referee?.full_name || 'Invited Friend',
        referee_phone: r.referee?.phone ? r.referee.phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2') : '',
      })) as LoyaltyReferral[];
    }
  } catch (err) {
    console.warn('[Loyalty Service] Error fetching referrals:', err);
  }
  return [];
}

/**
 * Fetch active claimed rewards for customer (e.g. Free Chicken Curry Cut)
 */
export async function getCustomerRewardClaims(userId: string): Promise<LoyaltyRewardClaim[]> {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('loyalty_reward_claims')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (!error && data) {
      return data as LoyaltyRewardClaim[];
    }
  } catch (err) {
    console.warn('[Loyalty Service] Error fetching reward claims:', err);
  }
  return [];
}

/**
 * Estimate order points to be earned and max redeemable
 */
export async function estimateOrderPoints(
  subtotal: number, 
  userId?: string, 
  userRole = 'b2c',
  couponApplied = false
) {
  const settings = await getLoyaltySettings();

  // B2B wholesale is strictly excluded; guest and b2c retail are eligible
  const effectiveRole = userRole === 'b2b' ? 'b2b' : 'b2c';
  if (!settings.is_enabled || !settings.eligible_customer_types.includes(effectiveRole)) {
    return {
      isEnabled: false,
      estimatedPointsEarned: 0,
      maxPointsRedeemable: 0,
      maxRupeeDiscount: 0,
      pointRupeeValue: settings.point_rupee_value,
      availablePoints: 0,
      stampsCollected: 0,
      stampsRequired: 10,
      activeRewards: [],
      canCombineWithCoupons: settings.can_combine_with_coupons,
    };
  }

  let availablePoints = 0;
  let stampsCollected = 0;
  let activeRewards: LoyaltyRewardClaim[] = [];

  if (userId) {
    const account = await getOrCreateLoyaltyAccount(userId);
    availablePoints = account.points_balance || 0;

    const stampCards = await getCustomerStampCards(userId);
    const activeCard = stampCards.find((c) => c.status === 'active') || stampCards[0];
    stampsCollected = activeCard ? activeCard.stamps_collected : 0;

    activeRewards = await getCustomerRewardClaims(userId);
  }

  // 1. Points Earned: 2 points per ₹100 of eligible net merchandise spend (0.02)
  const eligibleAmount = Math.max(0, subtotal);
  const estimatedPointsEarned = eligibleAmount >= settings.min_order_amount_for_earn
    ? Math.floor(eligibleAmount * settings.points_per_rupee)
    : 0;

  // 2. Max Redemption:
  // - Stacking rule: If coupon applied and stacking disabled, no points can be redeemed
  // - Minimum redemption threshold: 50 points
  // - Maximum redemption limit: 10% of eligible merchandise subtotal
  // - Point rupee value: ₹1 per point
  let maxPointsRedeemable = 0;
  let maxRupeeDiscount = 0;

  const isStackingAllowed = !couponApplied || settings.can_combine_with_coupons;
  if (isStackingAllowed && eligibleAmount > 0) {
    const maxRupeeByPercent = Math.floor((eligibleAmount * settings.max_redemption_percent_per_order) / 100);
    const maxPointsByPercent = Math.floor(maxRupeeByPercent / settings.point_rupee_value);
    const maxPointsAllowed = Math.min(maxPointsByPercent, availablePoints);

    if (availablePoints >= settings.min_points_for_redemption && maxPointsAllowed >= settings.min_points_for_redemption) {
      maxPointsRedeemable = maxPointsAllowed;
      maxRupeeDiscount = Math.round(maxPointsRedeemable * settings.point_rupee_value);
    }
  }

  return {
    isEnabled: true,
    estimatedPointsEarned,
    maxPointsRedeemable,
    maxRupeeDiscount,
    pointRupeeValue: settings.point_rupee_value,
    availablePoints,
    minPointsForRedemption: settings.min_points_for_redemption,
    maxRedemptionPercent: settings.max_redemption_percent_per_order,
    stampsCollected,
    stampsRequired: settings.stamps_required_per_card || 10,
    minOrderForStamp: settings.min_order_for_stamp || 400,
    activeRewards,
    canCombineWithCoupons: settings.can_combine_with_coupons,
    isStackingBlocked: couponApplied && !settings.can_combine_with_coupons,
  };
}

/**
 * Reserve points atomically for checkout
 */
export async function reservePoints(userId: string, points: number, cartSessionId: string) {
  const supabase = getServiceClient();

  try {
    const { data, error } = await supabase.rpc('reserve_loyalty_points', {
      p_user_id: userId,
      p_points: points,
      p_cart_session_id: cartSessionId,
    });

    if (!error && data && data.success) {
      return data;
    }
  } catch (e) {
    console.warn('[Loyalty Service] RPC reserve_loyalty_points failed, running TS fallback:', e);
  }

  // TypeScript fallback
  const settings = await getLoyaltySettings();
  if (!settings.is_enabled) {
    throw new Error('Loyalty redemption is currently disabled');
  }
  if (points < settings.min_points_for_redemption) {
    throw new Error(`Minimum ${settings.min_points_for_redemption} points required for redemption`);
  }

  const account = await getOrCreateLoyaltyAccount(userId);
  if (account.is_suspended) {
    throw new Error('Loyalty account is suspended');
  }

  // Release any prior reservation for this session
  await supabase
    .from('loyalty_points_reservations')
    .update({ status: 'released' })
    .eq('user_id', userId)
    .eq('cart_session_id', cartSessionId)
    .eq('status', 'reserved');

  const rupeeValue = Math.round(points * settings.point_rupee_value);
  const { data: res, error: rErr } = await supabase
    .from('loyalty_points_reservations')
    .insert({
      user_id: userId,
      points,
      rupee_value: rupeeValue,
      cart_session_id: cartSessionId,
      status: 'reserved',
    })
    .select()
    .single();

  if (rErr) throw new Error(rErr.message);

  return {
    success: true,
    reservation_id: res.id,
    points,
    rupee_value: rupeeValue,
  };
}

/**
 * Release points reservation if checkout cancelled
 */
export async function releasePointsReservation(reservationId: string) {
  const supabase = getServiceClient();
  try {
    const { data, error } = await supabase.rpc('release_loyalty_points_reservation', {
      p_reservation_id: reservationId,
    });
    if (!error) return data;
  } catch (e) {
    // fallback
  }

  await supabase
    .from('loyalty_points_reservations')
    .update({ status: 'released' })
    .eq('id', reservationId)
    .eq('status', 'reserved');

  return { success: true };
}

/**
 * Commit points redemption upon confirmed order
 */
export async function commitPointsRedemption(reservationId: string, orderId: string) {
  const supabase = getServiceClient();

  try {
    const { data, error } = await supabase.rpc('commit_loyalty_redemption', {
      p_reservation_id: reservationId,
      p_order_id: orderId,
    });
    if (!error && data && data.success) {
      return data;
    }
  } catch (e) {
    console.warn('[Loyalty Service] RPC commit_loyalty_redemption failed, running TS fallback:', e);
  }

  // TypeScript fallback
  const { data: res, error: rErr } = await supabase
    .from('loyalty_points_reservations')
    .select('*')
    .eq('id', reservationId)
    .single();

  if (rErr || !res) throw new Error('Reservation not found');
  if (res.status === 'committed') return { success: true, message: 'Already committed', idempotent: true };

  const account = await getOrCreateLoyaltyAccount(res.user_id);
  const newBalance = Math.max(0, (account.points_balance || 0) - res.points);

  await supabase.from('loyalty_points_ledger').insert({
    user_id: res.user_id,
    order_id: orderId,
    transaction_type: 'redeemed',
    points: -res.points,
    balance_after: newBalance,
    rupee_equivalent: -res.rupee_value,
    description: `Points redeemed for discount on Order #${orderId}`,
  });

  await supabase
    .from('loyalty_accounts')
    .update({
      points_balance: newBalance,
      lifetime_points_redeemed: (account.lifetime_points_redeemed || 0) + res.points,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', res.user_id);

  await supabase
    .from('loyalty_points_reservations')
    .update({ status: 'committed', order_id: orderId })
    .eq('id', reservationId);

  await supabase
    .from('orders')
    .update({
      points_redeemed: res.points,
      points_discount: res.rupee_value,
    })
    .eq('id', orderId);

  return {
    success: true,
    points_redeemed: res.points,
    rupee_discount: res.rupee_value,
    new_balance: newBalance,
  };
}

/**
 * Award order loyalty upon delivery/payment confirmation
 */
export async function awardOrderLoyalty(orderId: string) {
  const supabase = getServiceClient();

  // Try RPC first
  try {
    const { data, error } = await supabase.rpc('award_order_loyalty', {
      p_order_id: orderId,
    });
    if (!error && data && data.success) {
      return data;
    }
    if (error) {
      console.warn('[Loyalty Service] RPC award_order_loyalty failed, falling back to TypeScript execution:', error.message);
    }
  } catch (rpcErr: any) {
    console.warn('[Loyalty Service] RPC call threw, falling back to TypeScript execution:', rpcErr);
  }

  // TypeScript Server-side Execution Fallback
  try {
    // 1. Fetch order
    const { data: order, error: oErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (oErr || !order) {
      return { success: false, error: 'Order not found' };
    }

    // 2. Eligible state: Delivered, Completed, or Paid
    const isEligibleStatus = ['delivered', 'completed'].includes((order.status || '').toLowerCase()) ||
                             (order.payment_status || '').toLowerCase() === 'paid';
    if (!isEligibleStatus) {
      return { success: false, error: 'Order not completed or paid yet' };
    }

    // 3. Idempotency Check: Don't award twice for same order
    const { data: existingLedger } = await supabase
      .from('loyalty_points_ledger')
      .select('id')
      .eq('order_id', orderId)
      .eq('transaction_type', 'earned')
      .maybeSingle();

    if (existingLedger) {
      return { success: true, message: 'Loyalty already awarded for this order', idempotent: true };
    }

    // 4. Fetch loyalty settings
    const settings = await getLoyaltySettings();
    if (!settings.is_enabled) {
      return { success: true, message: 'Loyalty program currently inactive' };
    }

    // Customer type check (B2C only)
    let effectiveRole = 'b2c';
    if (order.user_id) {
      try {
        const { data: u } = await supabase.from('users').select('role').eq('id', order.user_id).single();
        if (u && u.role) effectiveRole = String(u.role).toLowerCase();
      } catch (uErr) {
        // default to b2c
      }
    }
    if (effectiveRole === 'b2b' || !settings.eligible_customer_types.includes(effectiveRole)) {
      return { success: true, message: 'Customer type not eligible for loyalty points' };
    }

    // 5. Calculate net eligible merchandise subtotal
    const netAmount = Math.max(0, (order.subtotal || 0) - (order.discount || 0) - (order.points_discount || 0));
    let pointsToAward = 0;
    if (netAmount >= settings.min_order_amount_for_earn) {
      // 2 points per ₹100 = 0.02
      pointsToAward = Math.floor(netAmount * (settings.points_per_rupee || 0.02));
    }

    const rupeeEquivalent = Math.round(pointsToAward * (settings.point_rupee_value || 1.0));

    // 6. Get or initialize customer loyalty account
    const account = await getOrCreateLoyaltyAccount(order.user_id);
    if (account.is_suspended) {
      return { success: false, error: 'Customer loyalty account is suspended' };
    }

    const newBalance = (account.points_balance || 0) + pointsToAward;
    const newLifetimeEarned = (account.lifetime_points_earned || 0) + pointsToAward;
    const newLifetimeSpend = (account.lifetime_spend || 0) + (order.total || 0);
    const newOrderCount = (account.total_orders_completed || 0) + 1;

    // Expiry date (180 days default)
    const expiresAt = new Date(Date.now() + (settings.points_expiry_days || 180) * 24 * 60 * 60 * 1000).toISOString();

    // 7. Insert into ledger if points > 0
    if (pointsToAward > 0) {
      await supabase.from('loyalty_points_ledger').insert({
        user_id: order.user_id,
        order_id: orderId,
        transaction_type: 'earned',
        points: pointsToAward,
        balance_after: newBalance,
        rupee_equivalent: rupeeEquivalent,
        description: `Points earned for Order #${orderId}`,
        expires_at: expiresAt,
      });
    }

    // 8. Determine Tier
    let newTierId = account.tier_id || 'silver';
    if (newLifetimeSpend >= 7500 || newOrderCount >= 15) {
      newTierId = 'platinum';
    } else if (newLifetimeSpend >= 2500 || newOrderCount >= 5) {
      newTierId = 'gold';
    } else {
      newTierId = 'silver';
    }

    // Update loyalty account
    await supabase
      .from('loyalty_accounts')
      .update({
        points_balance: newBalance,
        lifetime_points_earned: newLifetimeEarned,
        lifetime_spend: newLifetimeSpend,
        total_orders_completed: newOrderCount,
        tier_id: newTierId,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', order.user_id);

    // 9. Digital Stamp Card (min ₹400 qualifying order)
    let stampAwarded = false;
    const orderTotal = Number(order.total || 0);
    if (settings.stamp_card_enabled && orderTotal >= (settings.min_order_for_stamp || 400)) {
      const stampCards = await getCustomerStampCards(order.user_id);
      let activeCard = stampCards.find(c => c.status === 'active');

      if (!activeCard) {
        const { data: newCard } = await supabase
          .from('loyalty_stamp_cards')
          .insert({
            user_id: order.user_id,
            card_number: (stampCards[0]?.card_number || 0) + 1,
            stamps_collected: 0,
            stamps_required: settings.stamps_required_per_card || 10,
            status: 'active',
          })
          .select()
          .single();
        activeCard = newCard || stampCards[0];
      }

      if (activeCard) {
        const nextIndex = (activeCard.stamps_collected || 0) + 1;
        await supabase.from('loyalty_stamps').insert({
          stamp_card_id: activeCard.id,
          user_id: order.user_id,
          order_id: orderId,
          stamp_index: nextIndex,
        });

        stampAwarded = true;

        if (nextIndex >= (activeCard.stamps_required || 10)) {
          const rewardCode = 'STAMP-' + Math.random().toString(36).substring(2, 10).toUpperCase();
          await supabase
            .from('loyalty_stamp_cards')
            .update({
              stamps_collected: activeCard.stamps_required || 10,
              status: 'completed',
              completed_at: new Date().toISOString(),
              reward_code: rewardCode,
              reward_type: settings.stamp_reward_type || 'free_product',
              reward_value: settings.stamp_reward_value || 280,
            })
            .eq('id', activeCard.id);

          // Create next card
          await supabase.from('loyalty_stamp_cards').insert({
            user_id: order.user_id,
            card_number: (activeCard.card_number || 1) + 1,
            stamps_collected: 0,
            stamps_required: settings.stamps_required_per_card || 10,
            status: 'active',
          });
        } else {
          await supabase
            .from('loyalty_stamp_cards')
            .update({
              stamps_collected: nextIndex,
            })
            .eq('id', activeCard.id);
        }
      }
    }

    // 10. Update order
    await supabase
      .from('orders')
      .update({
        points_earned: pointsToAward,
        stamp_awarded: stampAwarded,
      })
      .eq('id', orderId);

    return {
      success: true,
      points_awarded: pointsToAward,
      stamp_awarded: stampAwarded,
      tier: newTierId,
      new_balance: newBalance,
    };
  } catch (err: any) {
    console.error('[Loyalty Service] TypeScript fallback error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Reverse order loyalty if order is cancelled/refunded
 */
export async function reverseOrderLoyalty(orderId: string, reason = 'Order cancelled') {
  const supabase = getServiceClient();
  try {
    const { data, error } = await supabase.rpc('reverse_order_loyalty', {
      p_order_id: orderId,
      p_reason: reason,
    });
    if (!error && data && data.success) {
      return data;
    }
  } catch (e) {
    console.warn('[Loyalty Service] RPC reverse_order_loyalty failed, running fallback:', e);
  }

  // TypeScript fallback
  try {
    const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
    if (!order) return { success: false, error: 'Order not found' };

    const { data: earnedEntry } = await supabase
      .from('loyalty_points_ledger')
      .select('*')
      .eq('order_id', orderId)
      .eq('transaction_type', 'earned')
      .maybeSingle();

    if (earnedEntry) {
      const account = await getOrCreateLoyaltyAccount(order.user_id);
      const newBalance = Math.max(0, (account.points_balance || 0) - earnedEntry.points);

      await supabase.from('loyalty_points_ledger').insert({
        user_id: order.user_id,
        order_id: orderId,
        transaction_type: 'reversed',
        points: -earnedEntry.points,
        balance_after: newBalance,
        rupee_equivalent: -earnedEntry.rupee_equivalent,
        description: `Reversal: ${reason} for Order #${orderId}`,
      });

      await supabase
        .from('loyalty_accounts')
        .update({
          points_balance: newBalance,
          lifetime_points_earned: Math.max(0, (account.lifetime_points_earned || 0) - earnedEntry.points),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', order.user_id);
    }

    await supabase.from('orders').update({ points_earned: 0, stamp_awarded: false }).eq('id', orderId);
    return { success: true, message: 'Loyalty reversed successfully' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Save customer birthday
 */
export async function updateCustomerBirthday(userId: string, birthday: string) {
  const supabase = getServiceClient();

  // Validate birthday format YYYY-MM-DD
  const dateObj = new Date(birthday);
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid birthday format');
  }

  const { data, error } = await supabase
    .from('loyalty_accounts')
    .update({ birthday })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
}
