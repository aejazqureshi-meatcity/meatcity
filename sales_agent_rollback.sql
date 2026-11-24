-- =========================================================================
-- MEAT CITY - AI SALES AGENT DATABASE ROLLBACK SCRIPT
-- =========================================================================
-- Use this script to completely and safely remove the AI Sales Agent tables,
-- indexes, and policies if a rollback is ever needed.
--
-- SAFETY GUARANTEE:
-- This script ONLY removes the 5 AI Sales Agent tables.
-- It NEVER modifies or drops any existing core MeatCity tables:
--   - public.users (PRESERVED)
--   - public.products (PRESERVED)
--   - public.categories (PRESERVED)
--   - public.orders (PRESERVED)
--   - public.order_items (PRESERVED)
--   - public.coupons (PRESERVED)
--   - public.delivery_slots (PRESERVED)
-- =========================================================================

-- Drop Sales Agent tables in reverse dependency order
DROP TABLE IF EXISTS public.sales_follow_ups CASCADE;
DROP TABLE IF EXISTS public.sales_quotations CASCADE;
DROP TABLE IF EXISTS public.sales_messages CASCADE;
DROP TABLE IF EXISTS public.sales_leads CASCADE;
DROP TABLE IF EXISTS public.sales_settings CASCADE;

-- Note: public.is_admin(uuid) is retained because core admin panel routes depend on it.
