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

// Default fallback settings (disabled by default until owner approval)
export const DEFAULT_LOYALTY_SETTINGS: LoyaltySettings = {
  id: 1,
  is_enabled: false,
  points_per_rupee: 1.0,
  point_rupee_value: 0.05,
  min_order_amount_for_earn: 200,
  min_points_for_redemption: 100,
  max_redemption_percent_per_order: 50,
  max_points_redemption_per_order: 1000,
  points_expiry_days: 90,
  can_combine_with_coupons: true,
  discounted_products_earn_points: true,
  eligible_customer_types: ['b2c'],
  stamp_card_enabled: true,
  stamps_required_per_card: 10,
  min_order_for_stamp: 350,
  stamp_reward_type: 'flat_discount',
  stamp_reward_value: 100,
  max_stamps_per_day: 1,
  referral_enabled: true,
  referrer_reward_points: 200,
  referee_reward_discount: 50,
  min_order_for_referral: 300,
  birthday_reward_enabled: true,
  birthday_reward_points: 300,
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
 * Estimate order points to be earned and max redeemable
 */
export async function estimateOrderPoints(subtotal: number, userId?: string, userRole = 'b2c') {
  const settings = await getLoyaltySettings();

  if (!settings.is_enabled) {
    return {
      isEnabled: false,
      estimatedPointsEarned: 0,
      maxPointsRedeemable: 0,
      maxRupeeDiscount: 0,
      pointRupeeValue: settings.point_rupee_value,
      availablePoints: 0,
    };
  }

  const isEligibleRole = settings.eligible_customer_types.includes(userRole);
  if (!isEligibleRole) {
    return {
      isEnabled: false,
      estimatedPointsEarned: 0,
      maxPointsRedeemable: 0,
      maxRupeeDiscount: 0,
      pointRupeeValue: settings.point_rupee_value,
      availablePoints: 0,
    };
  }

  let multiplier = 1.0;
  let availablePoints = 0;

  if (userId) {
    const account = await getOrCreateLoyaltyAccount(userId);
    availablePoints = account.points_balance;
    const tiers = await getLoyaltyTiers();
    const currentTier = tiers.find((t) => t.id === account.tier_id) || tiers[0];
    multiplier = currentTier ? currentTier.points_multiplier : 1.0;
  }

  // Points earned calculation
  const eligibleAmount = Math.max(0, subtotal);
  const estimatedPointsEarned = eligibleAmount >= settings.min_order_amount_for_earn
    ? Math.round(eligibleAmount * settings.points_per_rupee * multiplier)
    : 0;

  // Max redemption calculation
  // Limit 1: Max percentage of subtotal (e.g. 50%)
  const maxRupeeByPercent = Math.round((subtotal * settings.max_redemption_percent_per_order) / 100);
  const maxPointsByPercent = Math.floor(maxRupeeByPercent / settings.point_rupee_value);

  // Limit 2: Max points cap per order
  const maxPointsByCap = settings.max_points_redemption_per_order;

  // Limit 3: Customer's available balance
  const maxPointsAllowed = Math.min(maxPointsByPercent, maxPointsByCap, availablePoints);

  const maxPointsRedeemable = availablePoints >= settings.min_points_for_redemption
    ? Math.max(0, maxPointsAllowed)
    : 0;

  const maxRupeeDiscount = Math.round(maxPointsRedeemable * settings.point_rupee_value * 100) / 100;

  return {
    isEnabled: true,
    estimatedPointsEarned,
    maxPointsRedeemable,
    maxRupeeDiscount,
    pointRupeeValue: settings.point_rupee_value,
    availablePoints,
    minPointsForRedemption: settings.min_points_for_redemption,
  };
}

/**
 * Reserve points atomically for checkout
 */
export async function reservePoints(userId: string, points: number, cartSessionId: string) {
  const supabase = getServiceClient();

  const { data, error } = await supabase.rpc('reserve_loyalty_points', {
    p_user_id: userId,
    p_points: points,
    p_cart_session_id: cartSessionId,
  });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

/**
 * Release points reservation if checkout cancelled
 */
export async function releasePointsReservation(reservationId: string) {
  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc('release_loyalty_points_reservation', {
    p_reservation_id: reservationId,
  });
  if (error) {
    console.error('Failed to release reservation:', error);
  }
  return data;
}

/**
 * Commit points redemption upon confirmed order
 */
export async function commitPointsRedemption(reservationId: string, orderId: string) {
  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc('commit_loyalty_redemption', {
    p_reservation_id: reservationId,
    p_order_id: orderId,
  });
  if (error) {
    console.error('Failed to commit points redemption:', error);
    throw new Error(error.message);
  }
  return data;
}

/**
 * Award order loyalty upon delivery/payment confirmation
 */
export async function awardOrderLoyalty(orderId: string) {
  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc('award_order_loyalty', {
    p_order_id: orderId,
  });
  if (error) {
    console.error('Failed to award loyalty:', error);
    return { success: false, error: error.message };
  }
  return data;
}

/**
 * Reverse order loyalty if order is cancelled/refunded
 */
export async function reverseOrderLoyalty(orderId: string, reason = 'Order cancelled') {
  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc('reverse_order_loyalty', {
    p_order_id: orderId,
    p_reason: reason,
  });
  if (error) {
    console.error('Failed to reverse loyalty:', error);
    return { success: false, error: error.message };
  }
  return data;
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
