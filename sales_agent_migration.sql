-- =========================================================================
-- MEAT CITY - AI SALES AGENT DATABASE SCHEMA MIGRATION
-- =========================================================================
-- Run this script in the Supabase SQL Editor (https://supabase.com)
-- to create all required tables, constraints, indexes, and RLS policies
-- for the MeatCity AI Sales Agent.
-- =========================================================================

-- 0. Ensure hardened is_admin security function exists
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id 
      AND user_type = 'admin' 
      AND (status = 'active' OR status = 'approved' OR status IS NULL)
  );
END;
$$;

-- Restrict unnecessary execution privileges
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

-- 1. Create B2B Leads Table
CREATE TABLE IF NOT EXISTS public.sales_leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name text NOT NULL,
    contact_person text,
    phone text,
    email text,
    category text NOT NULL, -- Restaurant, Biryani Shop, Hotel, Caterer, Cloud Kitchen, Dhaba, Canteen, etc.
    area text NOT NULL,     -- Vashi, Nerul, Belapur, Turbhe, Kopar Khairane, Kharghar, Panvel, etc.
    address text,
    source_url text,        -- Accessible source URL / directory / referral / verified record
    status text DEFAULT 'New', -- New, Contacted, Interested, Quoted, Trial Order, Active Customer, Not Interested, Opted Out
    estimated_daily_kg numeric DEFAULT 0,
    preferred_items text,
    notes text,
    opt_out boolean DEFAULT false,
    last_contacted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sales_leads_area ON public.sales_leads(area);
CREATE INDEX IF NOT EXISTS idx_sales_leads_status ON public.sales_leads(status);
CREATE INDEX IF NOT EXISTS idx_sales_leads_category ON public.sales_leads(category);
CREATE INDEX IF NOT EXISTS idx_sales_leads_created_at ON public.sales_leads(created_at DESC);

-- Enable RLS
ALTER TABLE public.sales_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_leads_admin_all" ON public.sales_leads;
CREATE POLICY "sales_leads_admin_all" ON public.sales_leads FOR ALL 
  USING (public.is_admin(auth.uid()));


-- 2. Create Outbound Sales Messages (Approval Queue) Table
CREATE TABLE IF NOT EXISTS public.sales_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id uuid REFERENCES public.sales_leads(id) ON DELETE SET NULL,
    customer_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    recipient_type text DEFAULT 'b2b', -- 'b2b' | 'b2c'
    recipient_name text NOT NULL,
    recipient_phone text,
    channel text DEFAULT 'whatsapp',   -- whatsapp, call, email
    purpose text NOT NULL,             -- Introduction, Wholesale Enquiry, Trial Order Proposal, Quotation Follow-up, Repeat Order Reminder, Cart Recovery, Promotion
    language text DEFAULT 'hinglish',  -- 'hinglish' | 'english'
    content text NOT NULL,
    status text DEFAULT 'PENDING_APPROVAL', -- PENDING_APPROVAL, APPROVED, REJECTED, SENT_MANUALLY
    rejection_reason text,
    approved_at timestamp with time zone,
    sent_at timestamp with time zone,
    sent_by_user_id uuid,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sales_messages_status ON public.sales_messages(status);
CREATE INDEX IF NOT EXISTS idx_sales_messages_lead ON public.sales_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_sales_messages_created_at ON public.sales_messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.sales_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_messages_admin_all" ON public.sales_messages;
CREATE POLICY "sales_messages_admin_all" ON public.sales_messages FOR ALL 
  USING (public.is_admin(auth.uid()));


-- 3. Create Quotations Table
CREATE TABLE IF NOT EXISTS public.sales_quotations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_number text UNIQUE NOT NULL,
    lead_id uuid REFERENCES public.sales_leads(id) ON DELETE SET NULL,
    customer_name text NOT NULL,
    customer_phone text,
    customer_area text,
    items jsonb NOT NULL DEFAULT '[]'::jsonb,
    subtotal numeric DEFAULT 0,
    discount numeric DEFAULT 0,
    delivery_fee numeric DEFAULT 0,
    total numeric DEFAULT 0,
    payment_terms text DEFAULT 'Cash / UPI on Delivery',
    delivery_slot text DEFAULT 'Morning 6:00 AM - 8:00 AM (Turbhe Sector 20 Hub)',
    valid_until text,
    status text DEFAULT 'Draft', -- Draft, Sent, Accepted, Rejected, Expired
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sales_quotations_lead ON public.sales_quotations(lead_id);
CREATE INDEX IF NOT EXISTS idx_sales_quotations_status ON public.sales_quotations(status);
CREATE INDEX IF NOT EXISTS idx_sales_quotations_number ON public.sales_quotations(quotation_number);

-- Enable RLS
ALTER TABLE public.sales_quotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_quotations_admin_all" ON public.sales_quotations;
CREATE POLICY "sales_quotations_admin_all" ON public.sales_quotations FOR ALL 
  USING (public.is_admin(auth.uid()));


-- 4. Create Follow-ups Table
CREATE TABLE IF NOT EXISTS public.sales_follow_ups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id uuid REFERENCES public.sales_leads(id) ON DELETE CASCADE,
    due_date text NOT NULL,
    title text NOT NULL,
    notes text,
    priority text DEFAULT 'Medium', -- Low, Medium, High
    status text DEFAULT 'Pending',   -- Pending, Completed, Cancelled, Rescheduled
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sales_followups_lead ON public.sales_follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_sales_followups_status ON public.sales_follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_sales_followups_due ON public.sales_follow_ups(due_date);

-- Enable RLS
ALTER TABLE public.sales_follow_ups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_followups_admin_all" ON public.sales_follow_ups;
CREATE POLICY "sales_followups_admin_all" ON public.sales_follow_ups FOR ALL 
  USING (public.is_admin(auth.uid()));


-- 5. Create Sales Settings Table (Excludes API keys for credential security)
CREATE TABLE IF NOT EXISTS public.sales_settings (
    key text PRIMARY KEY,
    value text,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.sales_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_settings_admin_all" ON public.sales_settings;
CREATE POLICY "sales_settings_admin_all" ON public.sales_settings FOR ALL 
  USING (public.is_admin(auth.uid()));

-- Insert initial sales configuration defaults (NO Gemini API key is stored)
INSERT INTO public.sales_settings (key, value) VALUES
    ('business_name', 'MeatCity'),
    ('business_hub', 'Shop No.2, Sector 20, Turbhe, Navi Mumbai - 400705'),
    ('official_whatsapp', '917977630912'),
    ('min_b2b_order_kg', '10'),
    ('wholesale_payment_terms', 'Cash on Delivery / UPI / 7-Day Verified Credit'),
    ('preferred_tone', 'respectful_roman_hinglish'),
    ('delivery_slots', 'Morning 6:00 AM - 8:00 AM, Evening 4:00 PM - 6:00 PM')
ON CONFLICT (key) DO NOTHING;
