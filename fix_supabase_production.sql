-- =========================================================================
-- MEAT CITY - PRODUCTION DATABASE FIX AND REPAIR SCRIPT
-- =========================================================================
-- Run this in your Supabase SQL Editor to resolve authentication issues
-- and sync B2C/B2B users to the public.users profile table.
-- =========================================================================

-- -------------------------------------------------------------------------
-- PART 1: Fix NULL values in auth.users that crash GoTrue (Auth service)
-- -------------------------------------------------------------------------
UPDATE auth.users
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, ''),
  phone = COALESCE(phone, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb),
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb),
  is_super_admin = COALESCE(is_super_admin, false);


-- -------------------------------------------------------------------------
-- PART 2: Recreate handle_new_user() trigger function defensively
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
    id, email, full_name, phone, user_type, status, business_name, gst_number, fssai_license, shop_address, referral_code,
    credit_limit, credit_used, credit_available, outstanding_balance
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    COALESCE(new.raw_user_meta_data->>'user_type', 'b2c'),
    CASE 
      WHEN COALESCE(new.raw_user_meta_data->>'user_type', 'b2c') = 'b2b' THEN 'pending'
      ELSE 'active'
    END,
    COALESCE(new.raw_user_meta_data->>'business_name', ''),
    COALESCE(new.raw_user_meta_data->>'gst_number', ''),
    COALESCE(new.raw_user_meta_data->>'fssai_license', ''),
    COALESCE(new.raw_user_meta_data->>'address', ''),
    COALESCE(new.raw_user_meta_data->>'referral_code', ''),
    CASE WHEN COALESCE(new.raw_user_meta_data->>'user_type', 'b2c') = 'b2b' THEN 50000 ELSE 0 END,
    0,
    CASE WHEN COALESCE(new.raw_user_meta_data->>'user_type', 'b2c') = 'b2b' THEN 50000 ELSE 0 END,
    0
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE public.users.full_name END,
    phone = CASE WHEN EXCLUDED.phone <> '' THEN EXCLUDED.phone ELSE public.users.phone END;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- -------------------------------------------------------------------------
-- PART 3: Recreate Trigger on auth.users
-- -------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- -------------------------------------------------------------------------
-- PART 4: Sync/backport existing auth.users who are missing in public.users
-- -------------------------------------------------------------------------
INSERT INTO public.users (
  id, email, full_name, phone, user_type, status, business_name, gst_number, fssai_license, shop_address, referral_code,
  credit_limit, credit_used, credit_available, outstanding_balance
)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', ''),
  COALESCE(raw_user_meta_data->>'phone', ''),
  COALESCE(raw_user_meta_data->>'user_type', 'b2c'),
  CASE 
    WHEN COALESCE(raw_user_meta_data->>'user_type', 'b2c') = 'b2b' THEN 'pending'
    ELSE 'active'
  END,
  COALESCE(raw_user_meta_data->>'business_name', ''),
  COALESCE(raw_user_meta_data->>'gst_number', ''),
  COALESCE(raw_user_meta_data->>'fssai_license', ''),
  COALESCE(raw_user_meta_data->>'address', ''),
  COALESCE(raw_user_meta_data->>'referral_code', ''),
  CASE WHEN COALESCE(raw_user_meta_data->>'user_type', 'b2c') = 'b2b' THEN 50000 ELSE 0 END,
  0,
  CASE WHEN COALESCE(raw_user_meta_data->>'user_type', 'b2c') = 'b2b' THEN 50000 ELSE 0 END,
  0
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;


-- -------------------------------------------------------------------------
-- PART 5: Ensure RLS policies are enabled and public select is allowed
-- -------------------------------------------------------------------------
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all read categories" ON public.categories;
DROP POLICY IF EXISTS "categories_select_public" ON public.categories;
CREATE POLICY "categories_select_public" ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all read products" ON public.products;
DROP POLICY IF EXISTS "products_select_public" ON public.products;
CREATE POLICY "products_select_public" ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all actions public.users" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_insert_trigger" ON public.users;
CREATE POLICY "users_insert_trigger" ON public.users FOR INSERT WITH CHECK (true);
