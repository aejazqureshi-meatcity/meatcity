-- ==============================================================================
-- MeatCity B2B Dynamic Daily Paper Rate Pricing System Migration
-- Safe additive migration: establishes central daily paper rates, product pricing rules,
-- publication history snapshots, and audit logs.
-- ==============================================================================

-- 1. Daily Paper Rates Table
CREATE TABLE IF NOT EXISTS public.b2b_paper_rates (
    id TEXT PRIMARY KEY,
    rate_type TEXT NOT NULL DEFAULT 'chicken',
    current_rate NUMERIC(10,2) NOT NULL CHECK (current_rate > 0),
    previous_rate NUMERIC(10,2) CHECK (previous_rate IS NULL OR previous_rate > 0),
    effective_date DATE NOT NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_by TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'published',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Product-Wise B2B Pricing Rules Table
CREATE TABLE IF NOT EXISTS public.b2b_product_pricing_rules (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    pricing_mode TEXT NOT NULL DEFAULT 'multiplier' CHECK (pricing_mode IN ('multiplier', 'fixed_addition', 'multiplier_fixed_addition', 'manual')),
    paper_rate_source TEXT NOT NULL DEFAULT 'chicken',
    multiplier NUMERIC(6,4) NOT NULL DEFAULT 1.0000 CHECK (multiplier > 0),
    fixed_addition NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    manual_price NUMERIC(10,2) CHECK (manual_price IS NULL OR manual_price >= 0),
    rounding_method TEXT NOT NULL DEFAULT 'nearest_1' CHECK (rounding_method IN ('exact', 'nearest_1', 'nearest_5', 'nearest_10', 'ceil_5', 'ceil_10')),
    min_selling_price NUMERIC(10,2) CHECK (min_selling_price IS NULL OR min_selling_price >= 0),
    is_dynamic_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    is_confirmed_by_owner BOOLEAN NOT NULL DEFAULT FALSE,
    manual_override_price NUMERIC(10,2) CHECK (manual_override_price IS NULL OR manual_override_price >= 0),
    manual_override_reason TEXT,
    manual_override_expires_at TIMESTAMPTZ,
    manual_override_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT,
    CONSTRAINT uq_product_pricing_rule UNIQUE (product_id)
);

-- 3. B2B Publication History Table
CREATE TABLE IF NOT EXISTS public.b2b_rate_history (
    id TEXT PRIMARY KEY,
    paper_rate NUMERIC(10,2) NOT NULL,
    previous_paper_rate NUMERIC(10,2),
    effective_date DATE NOT NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_by TEXT NOT NULL,
    products_updated_count INTEGER NOT NULL DEFAULT 0,
    snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    restored_from_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. B2B Pricing Audit Logs Table
CREATE TABLE IF NOT EXISTS public.b2b_pricing_audit_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    admin_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Row-Level Security (RLS) Policies
ALTER TABLE public.b2b_paper_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_product_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_rate_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_pricing_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins: Full management access
CREATE POLICY "Admins have full access to b2b_paper_rates" 
    ON public.b2b_paper_rates 
    FOR ALL 
    TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.user_type = 'admin'));

CREATE POLICY "Admins have full access to b2b_product_pricing_rules" 
    ON public.b2b_product_pricing_rules 
    FOR ALL 
    TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.user_type = 'admin'));

CREATE POLICY "Admins have full access to b2b_rate_history" 
    ON public.b2b_rate_history 
    FOR ALL 
    TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.user_type = 'admin'));

CREATE POLICY "Admins have full access to b2b_pricing_audit_logs" 
    ON public.b2b_pricing_audit_logs 
    FOR ALL 
    TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.user_type = 'admin'));

-- B2B Customers: Read-only access to published rate summary (no formulas/multipliers)
CREATE POLICY "B2B customers can view published paper rates" 
    ON public.b2b_paper_rates 
    FOR SELECT 
    TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.user_type = 'b2b'));

-- Service role bypasses RLS for server-side trusted operations
-- 6. Initial Seed Data (Safe upsert based on existing products)
DO $$
BEGIN
    -- Current Paper Rate baseline: ₹140.00
    INSERT INTO public.b2b_paper_rates (id, rate_type, current_rate, previous_rate, effective_date, published_at, published_by, status)
    VALUES ('rate-chicken-current', 'chicken', 140.00, 135.00, CURRENT_DATE, NOW(), 'Super Admin', 'published')
    ON CONFLICT (id) DO NOTHING;

    -- Chicken Curry Cut (prod-1) multiplier 1.60 (Owner confirmed)
    IF EXISTS (SELECT 1 FROM public.products WHERE id = 'prod-1') THEN
        INSERT INTO public.b2b_product_pricing_rules (
            id, product_id, product_name, pricing_mode, paper_rate_source, 
            multiplier, rounding_method, is_dynamic_enabled, is_confirmed_by_owner
        ) VALUES (
            'rule-prod-1', 'prod-1', 'Chicken Curry Cut', 'multiplier', 'chicken', 
            1.6000, 'nearest_1', TRUE, TRUE
        ) ON CONFLICT (product_id) DO NOTHING;
    END IF;

    -- Breast Boneless (prod-2) multiplier 2.30 (Owner confirmed)
    IF EXISTS (SELECT 1 FROM public.products WHERE id = 'prod-2') THEN
        INSERT INTO public.b2b_product_pricing_rules (
            id, product_id, product_name, pricing_mode, paper_rate_source, 
            multiplier, rounding_method, is_dynamic_enabled, is_confirmed_by_owner
        ) VALUES (
            'rule-prod-2', 'prod-2', 'Chicken Breast Boneless', 'multiplier', 'chicken', 
            2.3000, 'nearest_1', TRUE, TRUE
        ) ON CONFLICT (product_id) DO NOTHING;
    END IF;
END $$;
