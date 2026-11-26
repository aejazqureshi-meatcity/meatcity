-- =========================================================================
-- MeatCity Production Database Fixes
-- 1. Reviews Table & RLS Policies
-- 2. Loyalty RPC Functions (award_order_loyalty, reserve, commit, release, adjust, reverse)
-- 3. Deactivate 0-cost Chicken Reward from catalog & void unauthorized claims
-- 4. PostgREST Schema Cache Reload
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. REVIEWS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    order_id text REFERENCES public.orders(id) ON DELETE SET NULL,
    product_id text,
    customer_name text NOT NULL,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment text NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON public.reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to prevent duplication
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can view own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins full access to reviews" ON public.reviews;
DROP POLICY IF EXISTS "Service role full access to reviews" ON public.reviews;

-- Anyone can read approved reviews
CREATE POLICY "Anyone can view approved reviews" ON public.reviews
    FOR SELECT USING (status = 'approved');

-- Users can view their own reviews (even pending or rejected)
CREATE POLICY "Users can view own reviews" ON public.reviews
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Authenticated users can insert reviews
CREATE POLICY "Users can create reviews" ON public.reviews
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Admins have full access
CREATE POLICY "Admins full access to reviews" ON public.reviews
    FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Service role full access
CREATE POLICY "Service role full access to reviews" ON public.reviews
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------------
-- 2. LOYALTY REWARDS CLEANUP (PREVENT 0-POINT ABUSE)
-- -------------------------------------------------------------------------
-- Deactivate any 0-cost rewards from catalog so they cannot be claimed with points
UPDATE public.loyalty_rewards
SET is_active = false
WHERE points_cost <= 0 OR reward_type = 'free_product';

-- Invalidate the 2 unauthorized claims created with 0 stamps
UPDATE public.loyalty_reward_claims
SET status = 'cancelled'
WHERE claim_code IN ('MC-RWD-LGIEIF', 'MC-RWD-4I7NKU') AND status = 'active';

-- Ensure loyalty_settings has correct rates
UPDATE public.loyalty_settings
SET points_per_rupee = 0.02,
    point_rupee_value = 1.0,
    min_order_amount_for_earn = 100,
    min_points_for_redemption = 50,
    max_redemption_percent_per_order = 10,
    points_expiry_days = 180,
    min_order_for_stamp = 400,
    stamps_required_per_card = 10,
    stamp_reward_type = 'free_product',
    can_combine_with_coupons = false,
    eligible_customer_types = ARRAY['b2c']
WHERE id = 1;

-- -------------------------------------------------------------------------
-- 3. LOYALTY RPC FUNCTIONS
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
        LOOP
            v_referral_code := 'MC' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6));
            SELECT EXISTS(SELECT 1 FROM public.loyalty_accounts WHERE referral_code = v_referral_code) INTO v_exists;
            EXIT WHEN NOT v_exists;
        END LOOP;
    END IF;

    INSERT INTO public.loyalty_accounts (
        user_id, tier_id, points_balance, lifetime_points_earned,
        lifetime_points_redeemed, lifetime_spend, total_orders_completed,
        referral_code
    ) VALUES (
        p_user_id, 'silver', 0, 0, 0, 0, 0, v_referral_code
    ) RETURNING * INTO v_account;

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
    v_order_user_role text;
BEGIN
    -- 1. Fetch order
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found');
    END IF;

    -- 2. Verify order is in eligible delivered or paid state
    IF v_order.status <> 'Delivered' AND v_order.status <> 'Completed' AND v_order.payment_status <> 'Paid' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not completed, delivered, or paid yet');
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

    -- Fetch user role if missing from order record
    v_order_user_role := COALESCE(v_order.user_role, v_order.role);
    IF v_order_user_role IS NULL THEN
        SELECT role INTO v_order_user_role FROM public.users WHERE id = v_order.user_id;
    END IF;
    IF v_order_user_role IS NULL THEN
        v_order_user_role := 'b2c';
    END IF;

    -- Check eligible customer types (B2C only)
    v_eligible_type := (v_order_user_role = ANY(v_settings.eligible_customer_types));
    IF NOT v_eligible_type THEN
        RETURN jsonb_build_object('success', true, 'message', 'Customer type not eligible for loyalty points');
    END IF;

    -- 5. Calculate net eligible amount for earning (Subtotal minus discounts)
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

    -- 7. Calculate points using FLOOR (2 points per ₹100 = 0.02)
    IF v_net_amount >= v_settings.min_order_amount_for_earn THEN
        v_points_to_award := FLOOR(v_net_amount * v_settings.points_per_rupee * COALESCE(v_tier.points_multiplier, 1.0));
        v_rupee_value := ROUND(v_points_to_award * v_settings.point_rupee_value, 2);
    END IF;

    v_new_balance := v_account.points_balance + v_points_to_award;
    v_new_lifetime_earned := v_account.lifetime_points_earned + v_points_to_award;
    v_new_lifetime_spend := v_account.lifetime_spend + COALESCE(v_order.total, 0);
    v_new_order_count := v_account.total_orders_completed + 1;

    -- Calculate points expiry date (180 days default)
    v_expires_at := now() + (COALESCE(v_settings.points_expiry_days, 180) || ' days')::interval;

    -- 8. Insert into ledger if points > 0
    IF v_points_to_award > 0 THEN
        INSERT INTO public.loyalty_points_ledger (
            user_id, order_id, transaction_type, points, balance_after,
            rupee_equivalent, description, expires_at
        ) VALUES (
            v_order.user_id, p_order_id, 'earned', v_points_to_award, v_new_balance,
            v_rupee_value, 'Points earned for Order #' || p_order_id,
            v_expires_at
        );
    END IF;

    -- 9. Check tier qualification
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

    -- 10. Stamp Card Processing (Qualifying completed order >= ₹400)
    IF v_settings.stamp_card_enabled AND COALESCE(v_order.total, 0) >= v_settings.min_order_for_stamp THEN
        SELECT count(*) INTO v_stamps_today
        FROM public.loyalty_stamps
        WHERE user_id = v_order.user_id AND created_at >= date_trunc('day', now());

        IF v_stamps_today < v_settings.max_stamps_per_day THEN
            SELECT * INTO v_active_stamp_card
            FROM public.loyalty_stamp_cards
            WHERE user_id = v_order.user_id AND status = 'active'
            ORDER BY card_number DESC LIMIT 1;

            IF NOT FOUND THEN
                INSERT INTO public.loyalty_stamp_cards (user_id, card_number, stamps_collected, stamps_required, status)
                VALUES (v_order.user_id, 1, 0, v_settings.stamps_required_per_card, 'active')
                RETURNING * INTO v_active_stamp_card;
            END IF;

            INSERT INTO public.loyalty_stamps (
                stamp_card_id, user_id, order_id, stamp_index
            ) VALUES (
                v_active_stamp_card.id, v_order.user_id, p_order_id, v_active_stamp_card.stamps_collected + 1
            );

            v_stamp_awarded := true;

            -- Check if card is completed (10 stamps reached)
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

    -- 11. Referral Processing
    IF v_settings.referral_enabled AND v_new_order_count = 1 AND COALESCE(v_order.total, 0) >= v_settings.min_order_for_referral THEN
        SELECT * INTO v_referral
        FROM public.loyalty_referrals
        WHERE referee_id = v_order.user_id AND status = 'pending';

        IF FOUND AND v_referral.referrer_id <> v_order.user_id THEN
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

    INSERT INTO public.loyalty_points_ledger (
        user_id, order_id, transaction_type, points, balance_after,
        rupee_equivalent, description
    ) VALUES (
        v_res.user_id, p_order_id, 'redeemed', -v_res.points, v_new_balance,
        -v_res.rupee_value, 'Points redeemed for discount on Order #' || p_order_id
    );

    UPDATE public.loyalty_accounts
    SET points_balance = v_new_balance,
        lifetime_points_redeemed = lifetime_points_redeemed + v_res.points,
        updated_at = now()
    WHERE user_id = v_res.user_id;

    UPDATE public.loyalty_points_reservations
    SET status = 'committed', order_id = p_order_id
    WHERE id = p_reservation_id;

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

-- Function: Reverse Loyalty Points & Stamp on Cancellation
CREATE OR REPLACE FUNCTION public.reverse_order_loyalty(
    p_order_id text,
    p_reason text DEFAULT 'Order cancelled'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_order record;
    v_earned_entry public.loyalty_points_ledger;
    v_redeemed_entry public.loyalty_points_ledger;
    v_account public.loyalty_accounts;
    v_new_balance integer;
    v_stamp public.loyalty_stamps;
    v_card public.loyalty_stamp_cards;
BEGIN
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found');
    END IF;

    v_account := public.get_or_create_loyalty_account(v_order.user_id);

    -- Reverse earned points
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
            -v_earned_entry.rupee_equivalent, 'Reversal: ' || p_reason || ' for Order #' || p_order_id
        );

        UPDATE public.loyalty_accounts
        SET points_balance = v_new_balance,
            lifetime_points_earned = GREATEST(0, lifetime_points_earned - v_earned_entry.points),
            updated_at = now()
        WHERE user_id = v_order.user_id;
    END IF;

    -- Refund redeemed points if any
    SELECT * INTO v_redeemed_entry 
    FROM public.loyalty_points_ledger 
    WHERE order_id = p_order_id AND transaction_type = 'redeemed';

    IF FOUND THEN
        SELECT * INTO v_account FROM public.loyalty_accounts WHERE user_id = v_order.user_id;
        v_new_balance := v_account.points_balance + ABS(v_redeemed_entry.points);

        INSERT INTO public.loyalty_points_ledger (
            user_id, order_id, transaction_type, points, balance_after,
            rupee_equivalent, description
        ) VALUES (
            v_order.user_id, p_order_id, 'refund', ABS(v_redeemed_entry.points), v_new_balance,
            ABS(v_redeemed_entry.rupee_equivalent), 'Points refunded: ' || p_reason || ' for Order #' || p_order_id
        );

        UPDATE public.loyalty_accounts
        SET points_balance = v_new_balance,
            lifetime_points_redeemed = GREATEST(0, lifetime_points_redeemed - ABS(v_redeemed_entry.points)),
            updated_at = now()
        WHERE user_id = v_order.user_id;
    END IF;

    -- Reverse stamp if awarded
    SELECT * INTO v_stamp FROM public.loyalty_stamps WHERE order_id = p_order_id;
    IF FOUND THEN
        DELETE FROM public.loyalty_stamps WHERE id = v_stamp.id;
        SELECT * INTO v_card FROM public.loyalty_stamp_cards WHERE id = v_stamp.stamp_card_id;
        IF FOUND AND v_card.status = 'active' THEN
            UPDATE public.loyalty_stamp_cards 
            SET stamps_collected = GREATEST(0, stamps_collected - 1)
            WHERE id = v_card.id;
        END IF;
    END IF;

    UPDATE public.orders
    SET points_earned = 0,
        stamp_awarded = false
    WHERE id = p_order_id;

    RETURN jsonb_build_object('success', true, 'message', 'Loyalty reversed successfully');
END;
$$;

-- Reload PostgREST schema cache so RPCs and tables appear immediately
NOTIFY pgrst, 'reload schema';
