export interface LoyaltySettings {
  id: number;
  is_enabled: boolean;
  points_per_rupee: number;
  point_rupee_value: number;
  min_order_amount_for_earn: number;
  min_points_for_redemption: number;
  max_redemption_percent_per_order: number;
  max_points_redemption_per_order: number;
  points_expiry_days: number;
  can_combine_with_coupons: boolean;
  discounted_products_earn_points: boolean;
  eligible_customer_types: string[];
  stamp_card_enabled: boolean;
  stamps_required_per_card: number;
  min_order_for_stamp: number;
  stamp_reward_type: 'flat_discount' | 'percentage_discount' | 'free_delivery' | 'free_product';
  stamp_reward_value: number;
  max_stamps_per_day: number;
  referral_enabled: boolean;
  referrer_reward_points: number;
  referee_reward_discount: number;
  min_order_for_referral: number;
  birthday_reward_enabled: boolean;
  birthday_reward_points: number;
  updated_at?: string;
  updated_by?: string;
}

export interface LoyaltyTier {
  id: string; // 'silver' | 'gold' | 'platinum'
  name: string;
  min_spend: number;
  min_orders: number;
  points_multiplier: number;
  benefits_description: string;
  delivery_benefit: 'standard' | 'priority' | 'free_above_threshold';
  badge_color: string;
  icon: string;
  priority_order: number;
}

export interface LoyaltyAccount {
  id: string;
  user_id: string;
  tier_id: string;
  points_balance: number;
  lifetime_points_earned: number;
  lifetime_points_redeemed: number;
  lifetime_spend: number;
  total_orders_completed: number;
  referral_code: string;
  referred_by?: string;
  birthday?: string;
  birthday_reward_last_claimed_year?: number;
  is_suspended: boolean;
  suspension_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyPointsLedgerEntry {
  id: string;
  user_id: string;
  order_id?: string;
  transaction_type: 'earned' | 'redeemed' | 'reversed' | 'expired' | 'bonus' | 'referral_bonus' | 'stamp_bonus' | 'manual_adjustment' | 'birthday_bonus';
  points: number;
  balance_after: number;
  rupee_equivalent: number;
  description: string;
  expires_at?: string;
  is_expired?: boolean;
  created_at: string;
}

export interface LoyaltyStampCard {
  id: string;
  user_id: string;
  card_number: number;
  stamps_collected: number;
  stamps_required: number;
  status: 'active' | 'completed' | 'reward_redeemed' | 'expired';
  reward_code?: string;
  reward_type?: string;
  reward_value?: number;
  reward_redeemed_at?: string;
  reward_redeemed_order_id?: string;
  completed_at?: string;
  created_at: string;
}

export interface LoyaltyReward {
  id: string;
  title: string;
  description: string;
  reward_type: 'discount_flat' | 'discount_percent' | 'free_product' | 'free_delivery';
  reward_value: number;
  points_cost: number;
  min_order_amount: number;
  applicable_category?: string;
  is_active: boolean;
  usage_limit_per_user?: number;
  total_inventory?: number;
  valid_from?: string;
  valid_until?: string;
  created_at: string;
}

export interface LoyaltyRewardClaim {
  id: string;
  reward_id: string;
  user_id: string;
  points_spent: number;
  claim_code: string;
  status: 'active' | 'redeemed' | 'expired';
  redeemed_order_id?: string;
  redeemed_at?: string;
  expires_at?: string;
  created_at: string;
  reward?: LoyaltyReward;
}

export interface LoyaltyReferral {
  id: string;
  referrer_id: string;
  referee_id: string;
  referral_code: string;
  status: 'pending' | 'qualifying_order_placed' | 'rewarded' | 'flagged_suspicious' | 'rejected';
  qualifying_order_id?: string;
  referrer_points_awarded: number;
  suspicion_reason?: string;
  created_at: string;
  referee_name?: string;
  referee_phone?: string;
}

export interface LoyaltyAuditLog {
  id: string;
  action: string;
  performed_by: string;
  target_user_id?: string;
  details: any;
  reason: string;
  ip_address?: string;
  created_at: string;
}
