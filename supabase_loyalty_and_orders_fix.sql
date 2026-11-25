-- =========================================================================
-- MEAT CITY - COMPLETE DATABASE COMPATIBILITY & LOYALTY SCHEMA MIGRATION
-- =========================================================================
-- Safe, additive migration to fix order placement failure, add missing
-- orders columns (claimed_reward_code, points, stamps, etc.), and create
-- all loyalty & rewards tables, constraints, indexes, and RLS policies.
-- =========================================================================

-- Enable pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -------------------------------------------------------------------------
-- PART 1: EXTEND ORDERS TABLE WITH MISSING PRODUCTION COLUMNS
-- -------------------------------------------------------------------------
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS claimed_reward_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS points_earned integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS points_redeemed integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS points_discount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stamp_awarded boolean NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_charge numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_instructions text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'b2c';

-- Indexes for performance on orders loyalty lookups
CREATE INDEX IF NOT EXISTS idx_orders_claimed_reward_code ON public.orders(claimed_reward_code);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);

-- -------------------------------------------------------------------------
-- PART 2: CREATE COMPLETE LOYALTY TABLES
-- -------------------------------------------------------------------------

-- 1. LOYALTY SETTINGS
CREATE TABLE IF NOT EXISTS public.loyalty_settings (
    id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    is_enabled boolean NOT NULL DEFAULT true,
    points_per_rupee numeric NOT NULL DEFAULT 1.0,
    point_rupee_value numeric NOT NULL DEFAULT 0.05,
    min_order_amount_for_earn numeric NOT NULL DEFAULT 200,
    min_points_for_redemption integer NOT NULL DEFAULT 100,
    max_redemption_percent_per_order numeric NOT NULL DEFAULT 50,
    max_points_redemption_per_order integer NOT NULL DEFAULT 1000,
    points_expiry_days integer NOT NULL DEFAULT 90,
    can_combine_with_coupons boolean NOT NULL DEFAULT false,
    discounted_products_earn_points boolean NOT NULL DEFAULT true,
    eligible_customer_types text[] NOT NULL DEFAULT ARRAY['b2c'],
    stamp_card_enabled boolean NOT NULL DEFAULT true,
    stamps_required_per_card integer NOT NULL DEFAULT 10,
    min_order_for_stamp numeric NOT NULL DEFAULT 350,
    stamp_reward_type text NOT NULL DEFAULT 'flat_discount',
    stamp_reward_value numeric NOT NULL DEFAULT 100,
    max_stamps_per_day integer NOT NULL DEFAULT 1,
    referral_enabled boolean NOT NULL DEFAULT true,
    referrer_reward_points integer NOT NULL DEFAULT 200,
    referee_reward_discount numeric NOT NULL DEFAULT 50,
    min_order_for_referral numeric NOT NULL DEFAULT 300,
    birthday_reward_enabled boolean NOT NULL DEFAULT true,
    birthday_reward_points integer NOT NULL DEFAULT 300,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL
);

INSERT INTO public.loyalty_settings (
    id, is_enabled, points_per_rupee, point_rupee_value, min_order_amount_for_earn,
    min_points_for_redemption, max_redemption_percent_per_order, max_points_redemption_per_order,
    points_expiry_days, can_combine_with_coupons, discounted_products_earn_points,
    eligible_customer_types, stamp_card_enabled, stamps_required_per_card, min_order_for_stamp,
    stamp_reward_type, stamp_reward_value, max_stamps_per_day, referral_enabled,
    referrer_reward_points, referee_reward_discount, min_order_for_referral,
    birthday_reward_enabled, birthday_reward_points
) VALUES (
    1, true, 1.0, 0.05, 200, 100, 50, 1000, 90, false, true,
    ARRAY['b2c'], true, 10, 350, 'flat_discount', 100, 1, true,
    200, 50, 300, true, 300
) ON CONFLICT (id) DO NOTHING;

-- 2. LOYALTY TIERS
CREATE TABLE IF NOT EXISTS public.loyalty_tiers (
    id text PRIMARY KEY,
    name text NOT NULL,
    min_spend numeric NOT NULL DEFAULT 0,
    min_orders integer NOT NULL DEFAULT 0,
    points_multiplier numeric NOT NULL DEFAULT 1.0,
    benefits_description text,
    delivery_benefit text NOT NULL DEFAULT 'standard',
    badge_color text NOT NULL DEFAULT '#C0C0C0',
    icon text NOT NULL DEFAULT '🥈',
    priority_order integer NOT NULL DEFAULT 1,
    created_at timestamp with time zone DEFAULT now()
);

INSERT INTO public.loyalty_tiers (id, name, min_spend, min_orders, points_multiplier, benefits_description, delivery_benefit, badge_color, icon, priority_order)
VALUES
('silver', 'Silver Member', 0, 0, 1.0, 'Standard 1x points on fresh cuts. Standard delivery.', 'standard', '#C0C0C0', '🥈', 1),
('gold', 'Gold Member', 2500, 5, 1.25, '1.25x points multiplier. Priority order packing & seasonal perks.', 'priority', '#D4AF37', '🥇', 2),
('platinum', 'Platinum VIP', 7500, 15, 1.5, '1.5x points multiplier. Free delivery on orders above ₹499 & exclusive early festival cuts.', 'free_above_threshold', '#E5E4E2', '💎', 3)
ON CONFLICT (id) DO NOTHING;

-- 3. LOYALTY ACCOUNTS
CREATE TABLE IF NOT EXISTS public.loyalty_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid UNIQUE REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    tier_id text REFERENCES public.loyalty_tiers(id) DEFAULT 'silver',
    points_balance integer NOT NULL DEFAULT 0,
    lifetime_points_earned integer NOT NULL DEFAULT 0,
    lifetime_points_redeemed integer NOT NULL DEFAULT 0,
    lifetime_spend numeric NOT NULL DEFAULT 0,
    total_orders_completed integer NOT NULL DEFAULT 0,
    referral_code text UNIQUE NOT NULL,
    referred_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    birthday date,
    birthday_reward_last_claimed_year integer,
    is_suspended boolean NOT NULL DEFAULT false,
    suspension_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_user_id ON public.loyalty_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_referral_code ON public.loyalty_accounts(referral_code);

-- 4. LOYALTY POINTS LEDGER
CREATE TABLE IF NOT EXISTS public.loyalty_points_ledger (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    order_id text REFERENCES public.orders(id) ON DELETE SET NULL,
    transaction_type text NOT NULL,
    points integer NOT NULL,
    balance_after integer NOT NULL,
    rupee_equivalent numeric NOT NULL DEFAULT 0,
    description text NOT NULL,
    expires_at timestamp with time zone,
    is_expired boolean NOT NULL DEFAULT false,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_user_id ON public.loyalty_points_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_order_id ON public.loyalty_points_ledger(order_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_created_at ON public.loyalty_points_ledger(created_at);

-- 5. LOYALTY POINTS RESERVATIONS
CREATE TABLE IF NOT EXISTS public.loyalty_points_reservations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    points integer NOT NULL,
    rupee_value numeric NOT NULL,
    cart_session_id text NOT NULL,
    status text NOT NULL DEFAULT 'reserved',
    order_id text REFERENCES public.orders(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + interval '15 minutes')
);

CREATE INDEX IF NOT EXISTS idx_loyalty_reservations_user ON public.loyalty_points_reservations(user_id, status);

-- 6. LOYALTY STAMP CARDS
CREATE TABLE IF NOT EXISTS public.loyalty_stamp_cards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    card_number integer NOT NULL DEFAULT 1,
    stamps_collected integer NOT NULL DEFAULT 0,
    stamps_required integer NOT NULL DEFAULT 10,
    status text NOT NULL DEFAULT 'active',
    reward_code text,
    reward_type text DEFAULT 'free_product',
    reward_value numeric DEFAULT 280,
    reward_redeemed_at timestamp with time zone,
    reward_redeemed_order_id text REFERENCES public.orders(id) ON DELETE SET NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stamp_cards_user_status ON public.loyalty_stamp_cards(user_id, status);

-- 7. LOYALTY STAMPS
CREATE TABLE IF NOT EXISTS public.loyalty_stamps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stamp_card_id uuid REFERENCES public.loyalty_stamp_cards(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    order_id text REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    stamp_index integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT uq_stamp_order UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_stamps_card_id ON public.loyalty_stamps(stamp_card_id);

-- 8. LOYALTY REWARDS
CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    reward_type text NOT NULL,
    reward_value numeric NOT NULL,
    points_cost integer NOT NULL DEFAULT 0,
    min_order_amount numeric NOT NULL DEFAULT 0,
    applicable_category text,
    is_active boolean NOT NULL DEFAULT true,
    usage_limit_per_user integer DEFAULT 1,
    total_inventory integer,
    valid_from timestamp with time zone DEFAULT now(),
    valid_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

INSERT INTO public.loyalty_rewards (title, description, reward_type, reward_value, points_cost, min_order_amount, is_active)
VALUES
('₹50 Discount Voucher', 'Redeem 500 points for ₹50 instant discount on fresh cuts.', 'discount_flat', 50, 500, 300, true),
('₹100 Premium Cut Voucher', 'Redeem 1000 points for ₹100 instant discount on chicken or mutton.', 'discount_flat', 100, 1000, 500, true),
('Free Delivery Pass', 'Redeem 300 points for zero delivery charge on your next order.', 'free_delivery', 50, 300, 250, true),
('10% Off Cart Voucher', 'Redeem 800 points for 10% off entire order up to ₹150 discount.', 'discount_percent', 10, 800, 400, true),
('Free 250g Chicken Curry Cut', 'Completed stamp card reward for 250g Chicken Curry Cut.', 'free_product', 280, 0, 400, true)
ON CONFLICT DO NOTHING;

-- 9. REWARD CLAIMS
CREATE TABLE IF NOT EXISTS public.loyalty_reward_claims (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reward_id uuid REFERENCES public.loyalty_rewards(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    points_spent integer NOT NULL DEFAULT 0,
    claim_code text UNIQUE NOT NULL,
    status text NOT NULL DEFAULT 'active',
    redeemed_order_id text REFERENCES public.orders(id) ON DELETE SET NULL,
    redeemed_at timestamp with time zone,
    expires_at timestamp with time zone DEFAULT (now() + interval '30 days'),
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reward_claims_user ON public.loyalty_reward_claims(user_id, status);
CREATE INDEX IF NOT EXISTS idx_reward_claims_code ON public.loyalty_reward_claims(claim_code);

-- 10. REFERRALS
CREATE TABLE IF NOT EXISTS public.loyalty_referrals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    referee_id uuid UNIQUE REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    referral_code text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    qualifying_order_id text REFERENCES public.orders(id) ON DELETE SET NULL,
    referrer_points_awarded integer DEFAULT 0,
    suspicion_reason text,
    reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.loyalty_referrals(referrer_id);

-- 11. LOYALTY AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.loyalty_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action text NOT NULL,
    performed_by uuid REFERENCES public.users(id) NOT NULL,
    target_user_id uuid REFERENCES public.users(id),
    details jsonb NOT NULL DEFAULT '{}'::jsonb,
    reason text NOT NULL,
    ip_address text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_audit_target ON public.loyalty_audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_audit_created ON public.loyalty_audit_logs(created_at);

-- -------------------------------------------------------------------------
-- PART 3: ROW LEVEL SECURITY (RLS) POLICIES
-- -------------------------------------------------------------------------
ALTER TABLE public.loyalty_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_stamp_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_stamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_reward_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Settings: Anyone can read settings, Admins can write
DROP POLICY IF EXISTS "Public can view active settings" ON public.loyalty_settings;
CREATE POLICY "Public can view active settings" ON public.loyalty_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage loyalty settings" ON public.loyalty_settings;
CREATE POLICY "Admins can manage loyalty settings" ON public.loyalty_settings FOR ALL USING (public.is_admin(auth.uid()));

-- 2. Tiers: Anyone can read tiers
DROP POLICY IF EXISTS "Anyone can view loyalty tiers" ON public.loyalty_tiers;
CREATE POLICY "Anyone can view loyalty tiers" ON public.loyalty_tiers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage loyalty tiers" ON public.loyalty_tiers;
CREATE POLICY "Admins can manage loyalty tiers" ON public.loyalty_tiers FOR ALL USING (public.is_admin(auth.uid()));

-- 3. Accounts: Users view own account, Admins manage all
DROP POLICY IF EXISTS "Users can view own loyalty account" ON public.loyalty_accounts;
CREATE POLICY "Users can view own loyalty account" ON public.loyalty_accounts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view and manage all accounts" ON public.loyalty_accounts;
CREATE POLICY "Admins can view and manage all accounts" ON public.loyalty_accounts FOR ALL USING (public.is_admin(auth.uid()));

-- 4. Points Ledger: Users view own entries, Admins manage all
DROP POLICY IF EXISTS "Users can view own points ledger" ON public.loyalty_points_ledger;
CREATE POLICY "Users can view own points ledger" ON public.loyalty_points_ledger FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view and manage all points ledger" ON public.loyalty_points_ledger;
CREATE POLICY "Admins can view and manage all points ledger" ON public.loyalty_points_ledger FOR ALL USING (public.is_admin(auth.uid()));

-- 5. Reservations: Users view own reservations, Admins manage all
DROP POLICY IF EXISTS "Users can view own reservations" ON public.loyalty_points_reservations;
CREATE POLICY "Users can view own reservations" ON public.loyalty_points_reservations FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage reservations" ON public.loyalty_points_reservations;
CREATE POLICY "Admins can manage reservations" ON public.loyalty_points_reservations FOR ALL USING (public.is_admin(auth.uid()));

-- 6. Stamp Cards: Users view own cards, Admins manage all
DROP POLICY IF EXISTS "Users can view own stamp cards" ON public.loyalty_stamp_cards;
CREATE POLICY "Users can view own stamp cards" ON public.loyalty_stamp_cards FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage all stamp cards" ON public.loyalty_stamp_cards;
CREATE POLICY "Admins can manage all stamp cards" ON public.loyalty_stamp_cards FOR ALL USING (public.is_admin(auth.uid()));

-- 7. Stamps: Users view own stamps, Admins manage all
DROP POLICY IF EXISTS "Users can view own stamps" ON public.loyalty_stamps;
CREATE POLICY "Users can view own stamps" ON public.loyalty_stamps FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage all stamps" ON public.loyalty_stamps FOR ALL USING (public.is_admin(auth.uid()));

-- 8. Rewards Catalog: Public view active rewards
DROP POLICY IF EXISTS "Public can view active rewards catalog" ON public.loyalty_rewards;
CREATE POLICY "Public can view active rewards catalog" ON public.loyalty_rewards FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage rewards catalog" ON public.loyalty_rewards;
CREATE POLICY "Admins can manage rewards catalog" ON public.loyalty_rewards FOR ALL USING (public.is_admin(auth.uid()));

-- 9. Reward Claims: Users view own claims, Admins manage all
DROP POLICY IF EXISTS "Users can view own reward claims" ON public.loyalty_reward_claims;
CREATE POLICY "Users can view own reward claims" ON public.loyalty_reward_claims FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage reward claims" ON public.loyalty_reward_claims;
CREATE POLICY "Admins can manage reward claims" ON public.loyalty_reward_claims FOR ALL USING (public.is_admin(auth.uid()));

-- 10. Referrals: Users view own referrals, Admins manage all
DROP POLICY IF EXISTS "Users can view own referrals" ON public.loyalty_referrals;
CREATE POLICY "Users can view own referrals" ON public.loyalty_referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referee_id);
DROP POLICY IF EXISTS "Admins can manage referrals" ON public.loyalty_referrals;
CREATE POLICY "Admins can manage referrals" ON public.loyalty_referrals FOR ALL USING (public.is_admin(auth.uid()));

-- 11. Audit Logs: Admins view all audit logs
DROP POLICY IF EXISTS "Admins can view loyalty audit logs" ON public.loyalty_audit_logs;
CREATE POLICY "Admins can view loyalty audit logs" ON public.loyalty_audit_logs FOR SELECT USING (public.is_admin(auth.uid()));

-- -------------------------------------------------------------------------
-- PART 4: REFRESH POSTGREST SCHEMA CACHE
-- -------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
