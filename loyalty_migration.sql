-- =========================================================================
-- MEAT CITY - CUSTOMER LOYALTY, REWARDS & RETENTION DATABASE SCHEMA
-- =========================================================================
-- Complete, production-ready database schema for MeatCity Customer Loyalty,
-- Digital Stamp Cards, Membership Tiers, Referral Program, and Rewards.
-- =========================================================================

-- Enable pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -------------------------------------------------------------------------
-- 1. LOYALTY SETTINGS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_settings (
    id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    is_enabled boolean NOT NULL DEFAULT false, -- Disabled by default until owner approves financial values
    points_per_rupee numeric NOT NULL DEFAULT 1.0,
    point_rupee_value numeric NOT NULL DEFAULT 0.05, -- 1 point = ₹0.05 (100 points = ₹5.00)
    min_order_amount_for_earn numeric NOT NULL DEFAULT 200,
    min_points_for_redemption integer NOT NULL DEFAULT 100,
    max_redemption_percent_per_order numeric NOT NULL DEFAULT 50, -- Max 50% of subtotal
    max_points_redemption_per_order integer NOT NULL DEFAULT 1000,
    points_expiry_days integer NOT NULL DEFAULT 90,
    can_combine_with_coupons boolean NOT NULL DEFAULT true,
    discounted_products_earn_points boolean NOT NULL DEFAULT true,
    eligible_customer_types text[] NOT NULL DEFAULT ARRAY['b2c'], -- 'b2c', 'b2b'
    stamp_card_enabled boolean NOT NULL DEFAULT true,
    stamps_required_per_card integer NOT NULL DEFAULT 10,
    min_order_for_stamp numeric NOT NULL DEFAULT 350,
    stamp_reward_type text NOT NULL DEFAULT 'flat_discount', -- 'flat_discount', 'percentage_discount', 'free_delivery'
    stamp_reward_value numeric NOT NULL DEFAULT 100, -- ₹100 flat discount
    max_stamps_per_day integer NOT NULL DEFAULT 1,
    referral_enabled boolean NOT NULL DEFAULT true,
    referrer_reward_points integer NOT NULL DEFAULT 200, -- 200 points (₹10) for referrer
    referee_reward_discount numeric NOT NULL DEFAULT 50, -- ₹50 discount for referee
    min_order_for_referral numeric NOT NULL DEFAULT 300,
    birthday_reward_enabled boolean NOT NULL DEFAULT true,
    birthday_reward_points integer NOT NULL DEFAULT 300, -- 300 points (₹15) birthday gift
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL
);

-- Seed default settings row if not present
INSERT INTO public.loyalty_settings (
    id, is_enabled, points_per_rupee, point_rupee_value, min_order_amount_for_earn,
    min_points_for_redemption, max_redemption_percent_per_order, max_points_redemption_per_order,
    points_expiry_days, can_combine_with_coupons, discounted_products_earn_points,
    eligible_customer_types, stamp_card_enabled, stamps_required_per_card, min_order_for_stamp,
    stamp_reward_type, stamp_reward_value, max_stamps_per_day, referral_enabled,
    referrer_reward_points, referee_reward_discount, min_order_for_referral,
    birthday_reward_enabled, birthday_reward_points
) VALUES (
    1, false, 1.0, 0.05, 200, 100, 50, 1000, 90, true, true,
    ARRAY['b2c'], true, 10, 350, 'flat_discount', 100, 1, true,
    200, 50, 300, true, 300
) ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------------------------
-- 2. LOYALTY TIERS TABLE
-- -------------------------------------------------------------------------
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

-- Seed default Silver, Gold, Platinum tiers
INSERT INTO public.loyalty_tiers (id, name, min_spend, min_orders, points_multiplier, benefits_description, delivery_benefit, badge_color, icon, priority_order)
VALUES
('silver', 'Silver Member', 0, 0, 1.0, 'Standard 1x points on fresh cuts. Standard delivery.', 'standard', '#C0C0C0', '🥈', 1),
('gold', 'Gold Member', 2500, 5, 1.25, '1.25x points multiplier. Priority order packing & seasonal perks.', 'priority', '#D4AF37', '🥇', 2),
('platinum', 'Platinum VIP', 7500, 15, 1.5, '1.5x points multiplier. Free delivery on orders above ₹499 & exclusive early festival cuts.', 'free_above_threshold', '#E5E4E2', '💎', 3)
ON CONFLICT (id) DO UPDATE SET
    min_spend = EXCLUDED.min_spend,
    min_orders = EXCLUDED.min_orders,
    points_multiplier = EXCLUDED.points_multiplier,
    benefits_description = EXCLUDED.benefits_description;

-- -------------------------------------------------------------------------
-- 3. LOYALTY ACCOUNTS TABLE
-- -------------------------------------------------------------------------
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

-- -------------------------------------------------------------------------
-- 4. LOYALTY POINTS LEDGER (Append-Only Authoritative Transaction Log)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_points_ledger (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    order_id text REFERENCES public.orders(id) ON DELETE SET NULL,
    transaction_type text NOT NULL, -- 'earned', 'redeemed', 'reversed', 'expired', 'bonus', 'referral_bonus', 'stamp_bonus', 'manual_adjustment', 'birthday_bonus'
    points integer NOT NULL, -- Positive for credits, negative for debits
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

-- -------------------------------------------------------------------------
-- 5. POINTS RESERVATIONS TABLE (Prevents Concurrent Double-Redemption)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_points_reservations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    points integer NOT NULL,
    rupee_value numeric NOT NULL,
    cart_session_id text NOT NULL,
    status text NOT NULL DEFAULT 'reserved', -- 'reserved', 'committed', 'released', 'expired'
    order_id text REFERENCES public.orders(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + interval '15 minutes')
);

CREATE INDEX IF NOT EXISTS idx_loyalty_reservations_user ON public.loyalty_points_reservations(user_id, status);

-- -------------------------------------------------------------------------
-- 6. DIGITAL STAMP CARDS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_stamp_cards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    card_number integer NOT NULL DEFAULT 1,
    stamps_collected integer NOT NULL DEFAULT 0,
    stamps_required integer NOT NULL DEFAULT 10,
    status text NOT NULL DEFAULT 'active', -- 'active', 'completed', 'reward_redeemed', 'expired'
    reward_code text,
    reward_type text DEFAULT 'flat_discount',
    reward_value numeric DEFAULT 100,
    reward_redeemed_at timestamp with time zone,
    reward_redeemed_order_id text REFERENCES public.orders(id) ON DELETE SET NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stamp_cards_user_status ON public.loyalty_stamp_cards(user_id, status);

-- -------------------------------------------------------------------------
-- 7. LOYALTY STAMPS TABLE (Individual Stamp Record per Order)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_stamps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stamp_card_id uuid REFERENCES public.loyalty_stamp_cards(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    order_id text REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    stamp_index integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT uq_stamp_order UNIQUE (order_id) -- Only 1 stamp per order strictly
);

CREATE INDEX IF NOT EXISTS idx_stamps_card_id ON public.loyalty_stamps(stamp_card_id);

-- -------------------------------------------------------------------------
-- 8. LOYALTY REWARDS CATALOG TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    reward_type text NOT NULL, -- 'discount_flat', 'discount_percent', 'free_product', 'free_delivery'
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

-- Seed initial reward options
INSERT INTO public.loyalty_rewards (title, description, reward_type, reward_value, points_cost, min_order_amount, is_active)
VALUES
('₹50 Discount Voucher', 'Redeem 500 points for ₹50 instant discount on fresh cuts.', 'discount_flat', 50, 500, 300, true),
('₹100 Premium Cut Voucher', 'Redeem 1000 points for ₹100 instant discount on chicken or mutton.', 'discount_flat', 100, 1000, 500, true),
('Free Delivery Pass', 'Redeem 300 points for zero delivery charge on your next order.', 'free_delivery', 50, 300, 250, true),
('10% Off Cart Voucher', 'Redeem 800 points for 10% off entire order up to ₹150 discount.', 'discount_percent', 10, 800, 400, true)
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------------------
-- 9. REWARD CLAIMS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_reward_claims (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reward_id uuid REFERENCES public.loyalty_rewards(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    points_spent integer NOT NULL DEFAULT 0,
    claim_code text UNIQUE NOT NULL,
    status text NOT NULL DEFAULT 'active', -- 'active', 'redeemed', 'expired'
    redeemed_order_id text REFERENCES public.orders(id) ON DELETE SET NULL,
    redeemed_at timestamp with time zone,
    expires_at timestamp with time zone DEFAULT (now() + interval '30 days'),
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reward_claims_user ON public.loyalty_reward_claims(user_id, status);

-- -------------------------------------------------------------------------
-- 10. REFERRALS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_referrals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    referee_id uuid UNIQUE REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    referral_code text NOT NULL,
    status text NOT NULL DEFAULT 'pending', -- 'pending', 'qualifying_order_placed', 'rewarded', 'flagged_suspicious', 'rejected'
    qualifying_order_id text REFERENCES public.orders(id) ON DELETE SET NULL,
    referrer_points_awarded integer DEFAULT 0,
    suspicion_reason text,
    reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.loyalty_referrals(referrer_id);

-- -------------------------------------------------------------------------
-- 11. LOYALTY AUDIT LOGS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action text NOT NULL, -- 'manual_adjustment', 'settings_update', 'tier_update', 'status_change', 'referral_review'
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
-- 12. EXTEND ORDERS TABLE WITH LOYALTY COLUMNS
-- -------------------------------------------------------------------------
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS points_earned integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS points_redeemed integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS points_discount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stamp_awarded boolean NOT NULL DEFAULT false;

-- -------------------------------------------------------------------------
-- 13. ROW LEVEL SECURITY (RLS) POLICIES
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

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public can view active settings" ON public.loyalty_settings;
DROP POLICY IF EXISTS "Admins can manage loyalty settings" ON public.loyalty_settings;
DROP POLICY IF EXISTS "Anyone can view loyalty tiers" ON public.loyalty_tiers;
DROP POLICY IF EXISTS "Admins can manage loyalty tiers" ON public.loyalty_tiers;
DROP POLICY IF EXISTS "Users can view own loyalty account" ON public.loyalty_accounts;
DROP POLICY IF EXISTS "Admins can view and manage all accounts" ON public.loyalty_accounts;
DROP POLICY IF EXISTS "Users can view own points ledger" ON public.loyalty_points_ledger;
DROP POLICY IF EXISTS "Admins can view and manage all ledger" ON public.loyalty_points_ledger;
DROP POLICY IF EXISTS "Users can view own reservations" ON public.loyalty_points_reservations;
DROP POLICY IF EXISTS "Users can view own stamp cards" ON public.loyalty_stamp_cards;
DROP POLICY IF EXISTS "Admins can manage all stamp cards" ON public.loyalty_stamp_cards;
DROP POLICY IF EXISTS "Users can view own stamps" ON public.loyalty_stamps;
DROP POLICY IF EXISTS "Anyone can view active rewards" ON public.loyalty_rewards;
DROP POLICY IF EXISTS "Admins can manage rewards" ON public.loyalty_rewards;
DROP POLICY IF EXISTS "Users can view own reward claims" ON public.loyalty_reward_claims;
DROP POLICY IF EXISTS "Admins can manage all claims" ON public.loyalty_reward_claims;
DROP POLICY IF EXISTS "Users can view own referrals" ON public.loyalty_referrals;
DROP POLICY IF EXISTS "Admins can manage all referrals" ON public.loyalty_referrals;
DROP POLICY IF EXISTS "Admins can view and write audit logs" ON public.loyalty_audit_logs;

-- Policies for loyalty_settings
CREATE POLICY "Public can view active settings"
    ON public.loyalty_settings FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage loyalty settings"
    ON public.loyalty_settings FOR ALL
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- Policies for loyalty_tiers
CREATE POLICY "Anyone can view loyalty tiers"
    ON public.loyalty_tiers FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage loyalty tiers"
    ON public.loyalty_tiers FOR ALL
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- Policies for loyalty_accounts (Customer can ONLY read own record, never direct write)
CREATE POLICY "Users can view own loyalty account"
    ON public.loyalty_accounts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view and manage all accounts"
    ON public.loyalty_accounts FOR ALL
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- Policies for loyalty_points_ledger (Customer can ONLY read own records)
CREATE POLICY "Users can view own points ledger"
    ON public.loyalty_points_ledger FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view and manage all ledger"
    ON public.loyalty_points_ledger FOR ALL
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- Policies for loyalty_points_reservations
CREATE POLICY "Users can view own reservations"
    ON public.loyalty_points_reservations FOR SELECT
    USING (auth.uid() = user_id);

-- Policies for loyalty_stamp_cards
CREATE POLICY "Users can view own stamp cards"
    ON public.loyalty_stamp_cards FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all stamp cards"
    ON public.loyalty_stamp_cards FOR ALL
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- Policies for loyalty_stamps
CREATE POLICY "Users can view own stamps"
    ON public.loyalty_stamps FOR SELECT
    USING (auth.uid() = user_id);

-- Policies for loyalty_rewards
CREATE POLICY "Anyone can view active rewards"
    ON public.loyalty_rewards FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage rewards"
    ON public.loyalty_rewards FOR ALL
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- Policies for loyalty_reward_claims
CREATE POLICY "Users can view own reward claims"
    ON public.loyalty_reward_claims FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all claims"
    ON public.loyalty_reward_claims FOR ALL
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- Policies for loyalty_referrals
CREATE POLICY "Users can view own referrals"
    ON public.loyalty_referrals FOR SELECT
    USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

CREATE POLICY "Admins can manage all referrals"
    ON public.loyalty_referrals FOR ALL
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- Policies for loyalty_audit_logs
CREATE POLICY "Admins can view and write audit logs"
    ON public.loyalty_audit_logs FOR ALL
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- -------------------------------------------------------------------------
-- 14. ATOMIC DATABASE RPC FUNCTIONS (SECURITY DEFINER)
-- -------------------------------------------------------------------------

-- Function: Get or Initialize Loyalty Account
CREATE OR REPLACE FUNCTION public.get_or_create_loyalty_account(p_user_id uuid)
RETURNS public.loyalty_accounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_account public.loyalty_accounts;
    v_referral_code text;
    v_user_ref_code text;
    v_exists boolean;
BEGIN
    SELECT * INTO v_account FROM public.loyalty_accounts WHERE user_id = p_user_id;
    IF FOUND THEN
        RETURN v_account;
    END IF;

    -- Check if user already has a referral code in public.users
    SELECT referral_code INTO v_user_ref_code FROM public.users WHERE id = p_user_id;
    IF v_user_ref_code IS NOT NULL AND v_user_ref_code <> '' THEN
        v_referral_code := v_user_ref_code;
    ELSE
        -- Generate unique referral code format: MC + 6 uppercase random characters
        LOOP
            v_referral_code := 'MC' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6));
            SELECT EXISTS(SELECT 1 FROM public.loyalty_accounts WHERE referral_code = v_referral_code) INTO v_exists;
            EXIT WHEN NOT v_exists;
        END LOOP;
    END IF;

    -- Insert loyalty account initialized at 0 points
    INSERT INTO public.loyalty_accounts (
        user_id, tier_id, points_balance, lifetime_points_earned,
        lifetime_points_redeemed, lifetime_spend, total_orders_completed,
        referral_code
    ) VALUES (
        p_user_id, 'silver', 0, 0, 0, 0, 0, v_referral_code
    ) RETURNING * INTO v_account;

    -- Also create initial active stamp card
    INSERT INTO public.loyalty_stamp_cards (
        user_id, card_number, stamps_collected, stamps_required, status
    ) VALUES (
        p_user_id, 1, 0, 10, 'active'
    ) ON CONFLICT DO NOTHING;

    RETURN v_account;
END;
$$;

-- Function: Award Loyalty Points & Stamp on Eligible Order Completion
CREATE OR REPLACE FUNCTION public.award_order_loyalty(p_order_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_order record;
    v_settings public.loyalty_settings;
    v_account public.loyalty_accounts;
    v_tier public.loyalty_tiers;
    v_already_awarded boolean;
    v_eligible_type boolean;
    v_net_amount numeric;
    v_points_to_award integer := 0;
    v_rupee_value numeric := 0;
    v_new_balance integer;
    v_new_lifetime_earned integer;
    v_new_lifetime_spend numeric;
    v_new_order_count integer;
    v_new_tier_id text;
    v_stamp_awarded boolean := false;
    v_active_stamp_card public.loyalty_stamp_cards;
    v_stamps_today integer := 0;
    v_referral record;
    v_referrer_account public.loyalty_accounts;
    v_expires_at timestamp with time zone;
BEGIN
    -- 1. Fetch order
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found');
    END IF;

    -- 2. Verify order is in eligible delivered/paid state
    IF v_order.status <> 'Delivered' AND v_order.payment_status <> 'Paid' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not completed or paid yet');
    END IF;

    -- 3. Idempotency Check: Don't award twice for the same order
    SELECT EXISTS(
        SELECT 1 FROM public.loyalty_points_ledger 
        WHERE order_id = p_order_id AND transaction_type = 'earned'
    ) INTO v_already_awarded;

    IF v_already_awarded THEN
        RETURN jsonb_build_object('success', true, 'message', 'Loyalty already awarded for this order', 'idempotent', true);
    END IF;

    -- 4. Check Settings
    SELECT * INTO v_settings FROM public.loyalty_settings WHERE id = 1;
    IF NOT FOUND OR v_settings.is_enabled = false THEN
        RETURN jsonb_build_object('success', true, 'message', 'Loyalty program currently inactive');
    END IF;

    -- Check eligible customer types (e.g. B2C only, or both)
    v_eligible_type := (v_order.user_role = ANY(v_settings.eligible_customer_types)) OR 
                       (v_order.role = ANY(v_settings.eligible_customer_types));
    IF NOT v_eligible_type THEN
        RETURN jsonb_build_object('success', true, 'message', 'Customer type not eligible for loyalty points');
    END IF;

    -- 5. Calculate net eligible amount for earning (Subtotal minus coupons and points discount)
    v_net_amount := COALESCE(v_order.subtotal, 0) - COALESCE(v_order.discount, 0) - COALESCE(v_order.points_discount, 0);
    IF v_net_amount < v_settings.min_order_amount_for_earn THEN
        v_points_to_award := 0;
    END IF;

    -- 6. Get or create loyalty account
    v_account := public.get_or_create_loyalty_account(v_order.user_id);
    IF v_account.is_suspended THEN
        RETURN jsonb_build_object('success', false, 'error', 'Customer loyalty account is suspended');
    END IF;

    -- Get tier multiplier
    SELECT * INTO v_tier FROM public.loyalty_tiers WHERE id = v_account.tier_id;
    IF NOT FOUND THEN
        SELECT * INTO v_tier FROM public.loyalty_tiers WHERE id = 'silver';
    END IF;

    -- 7. Calculate points
    IF v_net_amount >= v_settings.min_order_amount_for_earn THEN
        v_points_to_award := ROUND(v_net_amount * v_settings.points_per_rupee * COALESCE(v_tier.points_multiplier, 1.0));
        v_rupee_value := ROUND(v_points_to_award * v_settings.point_rupee_value, 2);
    END IF;

    v_new_balance := v_account.points_balance + v_points_to_award;
    v_new_lifetime_earned := v_account.lifetime_points_earned + v_points_to_award;
    v_new_lifetime_spend := v_account.lifetime_spend + COALESCE(v_order.total, 0);
    v_new_order_count := v_account.total_orders_completed + 1;

    -- Calculate points expiry date
    v_expires_at := now() + (v_settings.points_expiry_days || ' days')::interval;

    -- 8. Insert into ledger if points > 0
    IF v_points_to_award > 0 THEN
        INSERT INTO public.loyalty_points_ledger (
            user_id, order_id, transaction_type, points, balance_after,
            rupee_equivalent, description, expires_at
        ) VALUES (
            v_order.user_id, p_order_id, 'earned', v_points_to_award, v_new_balance,
            v_rupee_value, 'Points earned for Order #' || p_order_id || ' (' || COALESCE(v_tier.name, 'Silver') || ')',
            v_expires_at
        );
    END IF;

    -- 9. Check tier qualification (Upgrade check)
    v_new_tier_id := v_account.tier_id;
    IF v_new_lifetime_spend >= 7500 OR v_new_order_count >= 15 THEN
        v_new_tier_id := 'platinum';
    ELSIF v_new_lifetime_spend >= 2500 OR v_new_order_count >= 5 THEN
        v_new_tier_id := 'gold';
    ELSE
        v_new_tier_id := 'silver';
    END IF;

    -- Update customer loyalty account
    UPDATE public.loyalty_accounts
    SET points_balance = v_new_balance,
        lifetime_points_earned = v_new_lifetime_earned,
        lifetime_spend = v_new_lifetime_spend,
        total_orders_completed = v_new_order_count,
        tier_id = v_new_tier_id,
        updated_at = now()
    WHERE user_id = v_order.user_id;

    -- 10. Stamp Card Processing
    IF v_settings.stamp_card_enabled AND COALESCE(v_order.total, 0) >= v_settings.min_order_for_stamp THEN
        -- Check max stamps per day
        SELECT count(*) INTO v_stamps_today
        FROM public.loyalty_stamps
        WHERE user_id = v_order.user_id AND created_at >= date_trunc('day', now());

        IF v_stamps_today < v_settings.max_stamps_per_day THEN
            -- Get active card
            SELECT * INTO v_active_stamp_card
            FROM public.loyalty_stamp_cards
            WHERE user_id = v_order.user_id AND status = 'active'
            ORDER BY card_number DESC LIMIT 1;

            IF NOT FOUND THEN
                INSERT INTO public.loyalty_stamp_cards (user_id, card_number, stamps_collected, stamps_required, status)
                VALUES (v_order.user_id, 1, 0, v_settings.stamps_required_per_card, 'active')
                RETURNING * INTO v_active_stamp_card;
            END IF;

            -- Award stamp
            INSERT INTO public.loyalty_stamps (
                stamp_card_id, user_id, order_id, stamp_index
            ) VALUES (
                v_active_stamp_card.id, v_order.user_id, p_order_id, v_active_stamp_card.stamps_collected + 1
            );

            v_stamp_awarded := true;

            -- Check if card is completed
            IF (v_active_stamp_card.stamps_collected + 1) >= v_active_stamp_card.stamps_required THEN
                UPDATE public.loyalty_stamp_cards
                SET stamps_collected = v_active_stamp_card.stamps_required,
                    status = 'completed',
                    completed_at = now(),
                    reward_code = 'STAMP-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8)),
                    reward_type = v_settings.stamp_reward_type,
                    reward_value = v_settings.stamp_reward_value
                WHERE id = v_active_stamp_card.id;

                -- Create next stamp card automatically
                INSERT INTO public.loyalty_stamp_cards (
                    user_id, card_number, stamps_collected, stamps_required, status
                ) VALUES (
                    v_order.user_id, v_active_stamp_card.card_number + 1, 0, v_settings.stamps_required_per_card, 'active'
                );
            ELSE
                UPDATE public.loyalty_stamp_cards
                SET stamps_collected = stamps_collected + 1
                WHERE id = v_active_stamp_card.id;
            END IF;
        END IF;
    END IF;

    -- 11. Referral Processing (Award reward on referee's first qualifying order)
    IF v_settings.referral_enabled AND v_new_order_count = 1 AND COALESCE(v_order.total, 0) >= v_settings.min_order_for_referral THEN
        SELECT * INTO v_referral
        FROM public.loyalty_referrals
        WHERE referee_id = v_order.user_id AND status = 'pending';

        IF FOUND THEN
            -- Check for self-referral abuse
            IF v_referral.referrer_id <> v_order.user_id THEN
                -- Award bonus points to referrer
                v_referrer_account := public.get_or_create_loyalty_account(v_referral.referrer_id);
                IF NOT v_referrer_account.is_suspended THEN
                    UPDATE public.loyalty_accounts
                    SET points_balance = points_balance + v_settings.referrer_reward_points,
                        lifetime_points_earned = lifetime_points_earned + v_settings.referrer_reward_points,
                        updated_at = now()
                    WHERE user_id = v_referral.referrer_id;

                    INSERT INTO public.loyalty_points_ledger (
                        user_id, order_id, transaction_type, points, balance_after,
                        rupee_equivalent, description
                    ) VALUES (
                        v_referral.referrer_id, p_order_id, 'referral_bonus',
                        v_settings.referrer_reward_points,
                        v_referrer_account.points_balance + v_settings.referrer_reward_points,
                        ROUND(v_settings.referrer_reward_points * v_settings.point_rupee_value, 2),
                        'Referral bonus: Friend completed first qualifying order #' || p_order_id
                    );

                    UPDATE public.loyalty_referrals
                    SET status = 'rewarded',
                        qualifying_order_id = p_order_id,
                        referrer_points_awarded = v_settings.referrer_reward_points
                    WHERE id = v_referral.id;
                END IF;
            ELSE
                UPDATE public.loyalty_referrals
                SET status = 'flagged_suspicious', suspicion_reason = 'Self-referral attempt detected'
                WHERE id = v_referral.id;
            END IF;
        END IF;
    END IF;

    -- 12. Update orders table with awarded points and stamp status
    UPDATE public.orders
    SET points_earned = v_points_to_award,
        stamp_awarded = v_stamp_awarded
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'points_awarded', v_points_to_award,
        'stamp_awarded', v_stamp_awarded,
        'tier', v_new_tier_id,
        'new_balance', v_new_balance
    );
END;
$$;

-- Function: Reserve Loyalty Points for Checkout
CREATE OR REPLACE FUNCTION public.reserve_loyalty_points(
    p_user_id uuid,
    p_points integer,
    p_cart_session_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_settings public.loyalty_settings;
    v_account public.loyalty_accounts;
    v_active_reservations integer;
    v_available_points integer;
    v_rupee_value numeric;
    v_reservation_id uuid;
BEGIN
    SELECT * INTO v_settings FROM public.loyalty_settings WHERE id = 1;
    IF NOT FOUND OR v_settings.is_enabled = false THEN
        RETURN jsonb_build_object('success', false, 'error', 'Loyalty redemption is currently disabled');
    END IF;

    IF p_points < v_settings.min_points_for_redemption THEN
        RETURN jsonb_build_object('success', false, 'error', 'Minimum ' || v_settings.min_points_for_redemption || ' points required for redemption');
    END IF;

    IF p_points > v_settings.max_points_redemption_per_order THEN
        RETURN jsonb_build_object('success', false, 'error', 'Maximum ' || v_settings.max_points_redemption_per_order || ' points can be redeemed per order');
    END IF;

    v_account := public.get_or_create_loyalty_account(p_user_id);
    IF v_account.is_suspended THEN
        RETURN jsonb_build_object('success', false, 'error', 'Loyalty account is suspended');
    END IF;

    -- Calculate active reservations (uncommitted within 15 mins)
    SELECT COALESCE(SUM(points), 0) INTO v_active_reservations
    FROM public.loyalty_points_reservations
    WHERE user_id = p_user_id 
      AND status = 'reserved' 
      AND expires_at > now()
      AND cart_session_id <> p_cart_session_id;

    v_available_points := v_account.points_balance - v_active_reservations;

    IF p_points > v_available_points THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient points balance available', 'available_points', v_available_points);
    END IF;

    -- Release any prior reservation for this session
    UPDATE public.loyalty_points_reservations
    SET status = 'released'
    WHERE user_id = p_user_id AND cart_session_id = p_cart_session_id AND status = 'reserved';

    v_rupee_value := ROUND(p_points * v_settings.point_rupee_value, 2);

    INSERT INTO public.loyalty_points_reservations (
        user_id, points, rupee_value, cart_session_id, status
    ) VALUES (
        p_user_id, p_points, v_rupee_value, p_cart_session_id, 'reserved'
    ) RETURNING id INTO v_reservation_id;

    RETURN jsonb_build_object(
        'success', true,
        'reservation_id', v_reservation_id,
        'points', p_points,
        'rupee_value', v_rupee_value
    );
END;
$$;

-- Function: Commit Loyalty Redemption on Successful Order Placement
CREATE OR REPLACE FUNCTION public.commit_loyalty_redemption(
    p_reservation_id uuid,
    p_order_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_res public.loyalty_points_reservations;
    v_account public.loyalty_accounts;
    v_new_balance integer;
BEGIN
    SELECT * INTO v_res FROM public.loyalty_points_reservations WHERE id = p_reservation_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Reservation not found');
    END IF;

    IF v_res.status = 'committed' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Already committed', 'idempotent', true);
    END IF;

    IF v_res.status <> 'reserved' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Reservation is not active (' || v_res.status || ')');
    END IF;

    v_account := public.get_or_create_loyalty_account(v_res.user_id);
    v_new_balance := GREATEST(0, v_account.points_balance - v_res.points);

    -- Insert debit into ledger
    INSERT INTO public.loyalty_points_ledger (
        user_id, order_id, transaction_type, points, balance_after,
        rupee_equivalent, description
    ) VALUES (
        v_res.user_id, p_order_id, 'redeemed', -v_res.points, v_new_balance,
        -v_res.rupee_value, 'Points redeemed for discount on Order #' || p_order_id
    );

    -- Update account balance
    UPDATE public.loyalty_accounts
    SET points_balance = v_new_balance,
        lifetime_points_redeemed = lifetime_points_redeemed + v_res.points,
        updated_at = now()
    WHERE user_id = v_res.user_id;

    -- Mark reservation committed
    UPDATE public.loyalty_points_reservations
    SET status = 'committed', order_id = p_order_id
    WHERE id = p_reservation_id;

    -- Update order with redeemed points & discount
    UPDATE public.orders
    SET points_redeemed = v_res.points,
        points_discount = v_res.rupee_value
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'points_redeemed', v_res.points,
        'rupee_discount', v_res.rupee_value,
        'new_balance', v_new_balance
    );
END;
$$;

-- Function: Release Points Reservation
CREATE OR REPLACE FUNCTION public.release_loyalty_points_reservation(p_reservation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.loyalty_points_reservations
    SET status = 'released'
    WHERE id = p_reservation_id AND status = 'reserved';

    RETURN jsonb_build_object('success', true);
END;
$$;

-- Function: Admin Manual Points Adjustment
CREATE OR REPLACE FUNCTION public.adjust_loyalty_points_manual(
    p_user_id uuid,
    p_points integer,
    p_reason text,
    p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_account public.loyalty_accounts;
    v_new_balance integer;
    v_settings public.loyalty_settings;
    v_rupee_val numeric;
BEGIN
    -- Verify caller is admin
    IF NOT public.is_admin(p_admin_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin privileges required');
    END IF;

    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'A mandatory reason is required for points adjustment');
    END IF;

    SELECT * INTO v_settings FROM public.loyalty_settings WHERE id = 1;
    v_account := public.get_or_create_loyalty_account(p_user_id);
    v_new_balance := v_account.points_balance + p_points;

    IF v_new_balance < 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot deduct more points than the customer currently has');
    END IF;

    v_rupee_val := ROUND(ABS(p_points) * COALESCE(v_settings.point_rupee_value, 0.05), 2);

    -- Insert ledger record
    INSERT INTO public.loyalty_points_ledger (
        user_id, transaction_type, points, balance_after,
        rupee_equivalent, description, created_by
    ) VALUES (
        p_user_id, 'manual_adjustment', p_points, v_new_balance,
        CASE WHEN p_points >= 0 THEN v_rupee_val ELSE -v_rupee_val END,
        'Admin adjustment: ' || trim(p_reason), p_admin_id
    );

    -- Update account
    UPDATE public.loyalty_accounts
    SET points_balance = v_new_balance,
        lifetime_points_earned = CASE WHEN p_points > 0 THEN lifetime_points_earned + p_points ELSE lifetime_points_earned END,
        updated_at = now()
    WHERE user_id = p_user_id;

    -- Write immutable audit log
    INSERT INTO public.loyalty_audit_logs (
        action, performed_by, target_user_id, details, reason
    ) VALUES (
        'manual_adjustment', p_admin_id, p_user_id,
        jsonb_build_object('points_adjusted', p_points, 'previous_balance', v_account.points_balance, 'new_balance', v_new_balance),
        p_reason
    );

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_new_balance,
        'points_adjusted', p_points
    );
END;
$$;

-- Function: Reversal of Order Loyalty on Refund/Cancellation
CREATE OR REPLACE FUNCTION public.reverse_order_loyalty(
    p_order_id text,
    p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_order record;
    v_earned_entry record;
    v_redeemed_entry record;
    v_account public.loyalty_accounts;
    v_new_balance integer;
BEGIN
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found');
    END IF;

    v_account := public.get_or_create_loyalty_account(v_order.user_id);

    -- 1. If points were earned on this order, reverse them
    SELECT * INTO v_earned_entry 
    FROM public.loyalty_points_ledger 
    WHERE order_id = p_order_id AND transaction_type = 'earned';

    IF FOUND THEN
        v_new_balance := GREATEST(0, v_account.points_balance - v_earned_entry.points);
        INSERT INTO public.loyalty_points_ledger (
            user_id, order_id, transaction_type, points, balance_after,
            rupee_equivalent, description
        ) VALUES (
            v_order.user_id, p_order_id, 'reversed', -v_earned_entry.points, v_new_balance,
            -v_earned_entry.rupee_equivalent, 'Points reversed for order #' || p_order_id || ' (' || COALESCE(p_reason, 'Cancellation/Refund') || ')'
        );

        UPDATE public.loyalty_accounts
        SET points_balance = v_new_balance,
            lifetime_points_earned = GREATEST(0, lifetime_points_earned - v_earned_entry.points),
            updated_at = now()
        WHERE user_id = v_order.user_id;
    END IF;

    -- 2. If points were redeemed on this order, refund them back to the customer
    SELECT * INTO v_redeemed_entry 
    FROM public.loyalty_points_ledger 
    WHERE order_id = p_order_id AND transaction_type = 'redeemed';

    IF FOUND THEN
        v_new_balance := v_account.points_balance + ABS(v_redeemed_entry.points);
        INSERT INTO public.loyalty_points_ledger (
            user_id, order_id, transaction_type, points, balance_after,
            rupee_equivalent, description
        ) VALUES (
            v_order.user_id, p_order_id, 'bonus', ABS(v_redeemed_entry.points), v_new_balance,
            ABS(v_redeemed_entry.rupee_equivalent), 'Points refunded back for cancelled order #' || p_order_id
        );

        UPDATE public.loyalty_accounts
        SET points_balance = v_new_balance,
            lifetime_points_redeemed = GREATEST(0, lifetime_points_redeemed - ABS(v_redeemed_entry.points)),
            updated_at = now()
        WHERE user_id = v_order.user_id;
    END IF;

    -- 3. Delete stamp if awarded for this order
    DELETE FROM public.loyalty_stamps WHERE order_id = p_order_id;

    RETURN jsonb_build_object('success', true, 'message', 'Loyalty reversed cleanly');
END;
$$;

-- Grant execution permissions
REVOKE ALL ON FUNCTION public.get_or_create_loyalty_account(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.award_order_loyalty(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reserve_loyalty_points(uuid, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.commit_loyalty_redemption(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_loyalty_points_reservation(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.adjust_loyalty_points_manual(uuid, integer, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reverse_order_loyalty(text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_or_create_loyalty_account(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.award_order_loyalty(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reserve_loyalty_points(uuid, integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.commit_loyalty_redemption(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_loyalty_points_reservation(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.adjust_loyalty_points_manual(uuid, integer, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reverse_order_loyalty(text, text) TO authenticated, service_role;
