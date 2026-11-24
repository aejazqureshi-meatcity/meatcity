-- =========================================================================
-- MEAT CITY - LOYALTY & REWARDS ROLLBACK SCRIPT (SAFEGUARD)
-- =========================================================================
-- This script safely removes the loyalty system additions if a rollback
-- is explicitly requested by the owner.
-- DO NOT execute this automatically.
-- =========================================================================

-- Drop functions
DROP FUNCTION IF EXISTS public.award_order_loyalty(text);
DROP FUNCTION IF EXISTS public.reserve_loyalty_points(uuid, integer, text);
DROP FUNCTION IF EXISTS public.commit_loyalty_redemption(uuid, text);
DROP FUNCTION IF EXISTS public.release_loyalty_points_reservation(uuid);
DROP FUNCTION IF EXISTS public.adjust_loyalty_points_manual(uuid, integer, text, uuid);
DROP FUNCTION IF EXISTS public.reverse_order_loyalty(text, text);
DROP FUNCTION IF EXISTS public.get_or_create_loyalty_account(uuid);

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS public.loyalty_audit_logs CASCADE;
DROP TABLE IF EXISTS public.loyalty_referrals CASCADE;
DROP TABLE IF EXISTS public.loyalty_reward_claims CASCADE;
DROP TABLE IF EXISTS public.loyalty_rewards CASCADE;
DROP TABLE IF EXISTS public.loyalty_stamps CASCADE;
DROP TABLE IF EXISTS public.loyalty_stamp_cards CASCADE;
DROP TABLE IF EXISTS public.loyalty_points_reservations CASCADE;
DROP TABLE IF EXISTS public.loyalty_points_ledger CASCADE;
DROP TABLE IF EXISTS public.loyalty_accounts CASCADE;
DROP TABLE IF EXISTS public.loyalty_tiers CASCADE;
DROP TABLE IF EXISTS public.loyalty_settings CASCADE;

-- Remove columns from orders
ALTER TABLE public.orders DROP COLUMN IF EXISTS points_earned;
ALTER TABLE public.orders DROP COLUMN IF EXISTS points_redeemed;
ALTER TABLE public.orders DROP COLUMN IF EXISTS points_discount;
ALTER TABLE public.orders DROP COLUMN IF EXISTS stamp_awarded;
