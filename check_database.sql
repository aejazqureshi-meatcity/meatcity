-- =========================================================================
-- MEAT CITY - DATABASE STATUS DIAGNOSTICS
-- =========================================================================
-- Copy and run this script in your Supabase SQL Editor.
-- It will check if your tables, triggers, and sync processes are working.
-- =========================================================================

SELECT '--- 1. TABLE CHECKS ---' AS diagnostic_step;
SELECT 
  table_name, 
  (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns_count
FROM information_schema.tables t 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'products', 'categories', 'orders');

SELECT '--- 2. TRIGGER CHECKS ---' AS diagnostic_step;
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table, 
  action_statement
FROM information_schema.triggers 
WHERE event_object_table IN ('users', 'products');

-- Check if trigger exists on auth.users
SELECT 
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  tgfoid::regproc AS function_name
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

SELECT '--- 3. USER COUNTS IN PUBLIC SCHEMA ---' AS diagnostic_step;
SELECT 
  user_type, 
  status, 
  count(*) as user_count 
FROM public.users 
GROUP BY user_type, status;

SELECT '--- 4. DETAILED USER LIST (public.users) ---' AS diagnostic_step;
SELECT id, email, full_name, user_type, status, created_at FROM public.users;

SELECT '--- 5. AUTH USER LIST (auth.users) ---' AS diagnostic_step;
SELECT id, email, raw_user_meta_data->>'user_type' as user_type, email_confirmed_at, created_at 
FROM auth.users;
