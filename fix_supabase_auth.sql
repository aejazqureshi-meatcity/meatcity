-- =========================================================================
-- MEAT CITY - SUPABASE AUTH & B2B FLOW FIX
-- =========================================================================
-- Copy and run this script in your Supabase SQL Editor.
-- It will:
-- 1. Create a trigger to auto-confirm emails for all new signups.
-- 2. Confirm emails for all existing users in auth.users.
-- 3. Reset the test B2B user aejazq36@gmail.com back to 'pending' status.
-- 4. Create missing 'business_name' and 'items' columns in the 'orders' table.
-- =========================================================================

-- PART 1: Auto-confirm email trigger for new signups
CREATE OR REPLACE FUNCTION public.auto_confirm_email()
RETURNS trigger AS $$
BEGIN
  NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.auto_confirm_email();

-- PART 2: Confirm emails for existing users
UPDATE auth.users 
SET email_confirmed_at = now() 
WHERE email_confirmed_at IS NULL;

-- PART 3: Reset the test B2B user back to 'pending' to test approval flow
UPDATE public.users 
SET 
  status = 'pending',
  credit_limit = 50000,
  credit_used = 0,
  credit_available = 50000,
  outstanding_balance = 0,
  payment_due_date = NULL,
  ledger = '[]'::jsonb
WHERE email = 'aejazq36@gmail.com';

-- PART 4: Add business_name and items columns to public.orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS business_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb;
