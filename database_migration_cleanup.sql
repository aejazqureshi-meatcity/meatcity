-- =========================================================================
-- MEAT CITY - PRODUCTION DATABASE CLEANUP & SCHEMA FIX (CORRECTED)
-- =========================================================================
-- Run this script in your Supabase SQL Editor (https://supabase.com)
-- to create proper tables/columns and migrate serialized data.
-- =========================================================================

-- -------------------------------------------------------------------------
-- PART 1: Alter PRODUCTS Table to Add Missing Columns
-- -------------------------------------------------------------------------
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_status text DEFAULT 'Available';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS variants jsonb DEFAULT '[]'::jsonb;

-- -------------------------------------------------------------------------
-- PART 2: Create COUPONS Table if Missing
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupons (
    code text PRIMARY KEY,
    discount_percent numeric DEFAULT 0,
    flat_discount numeric DEFAULT 0,
    min_order_amount numeric DEFAULT 0,
    expiry_date text,
    usage_limit integer DEFAULT 100,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for coupons table
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies for coupons table
-- 1. Anyone (public) can view active coupons
DROP POLICY IF EXISTS "coupons_select_public" ON public.coupons;
DROP POLICY IF EXISTS "Allow public read coupons" ON public.coupons;
CREATE POLICY "coupons_select_public" ON public.coupons FOR SELECT USING (true);

-- 2. Only admins can perform write/all CRUD operations on coupons table
DROP POLICY IF EXISTS "coupons_admin_all" ON public.coupons;
DROP POLICY IF EXISTS "Allow admin all coupons" ON public.coupons;
CREATE POLICY "coupons_admin_all" ON public.coupons FOR ALL 
  USING (public.is_admin(auth.uid()));

-- -------------------------------------------------------------------------
-- PART 3: Data Migration
-- -------------------------------------------------------------------------

-- 1. Migrate products description metadata to stock_status and variants columns
DO $$
DECLARE
    prod_row RECORD;
    meta_part text;
    meta_json jsonb;
    clean_desc text;
BEGIN
    FOR prod_row IN SELECT id, description FROM public.products WHERE description LIKE '%__METADATA__:%' LOOP
        -- Extract description before __METADATA__:
        clean_desc := split_part(prod_row.description, '__METADATA__:', 1);
        -- Extract JSON string after __METADATA__:
        meta_part := split_part(prod_row.description, '__METADATA__:', 2);
        
        BEGIN
            meta_json := meta_part::jsonb;
            
            -- Update product columns and trim description
            UPDATE public.products
            SET 
                description = rtrim(clean_desc),
                stock_status = COALESCE(meta_json->>'stock_status', 'Available'),
                variants = COALESCE((meta_json->'variants'), '[]'::jsonb)
            WHERE id = prod_row.id;
            
            RAISE NOTICE 'Migrated product % metadata from description.', prod_row.id;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to parse metadata JSON for product %: %', prod_row.id, SQLERRM;
        END;
    END LOOP;
END $$;

-- 2. Migrate virtual category coupons to the proper coupons table
DO $$
DECLARE
    cat_row RECORD;
    coupon_code text;
    meta_json jsonb;
BEGIN
    -- Fetch fallback coupon categories (where id starts with COUPON_ and name is JSON)
    FOR cat_row IN 
        SELECT id, name FROM public.categories 
        WHERE id LIKE 'COUPON_%' 
    LOOP
        coupon_code := replace(cat_row.id, 'COUPON_', '');
        
        BEGIN
            meta_json := cat_row.name::jsonb;
            
            -- Insert into coupons table (handling duplicates gracefully)
            INSERT INTO public.coupons (
                code, discount_percent, flat_discount, min_order_amount, expiry_date, usage_limit, is_active
            ) VALUES (
                coupon_code,
                COALESCE((meta_json->>'discount_percent')::numeric, 0),
                COALESCE((meta_json->>'flat_discount')::numeric, 0),
                COALESCE((meta_json->>'min_order_amount')::numeric, 0),
                meta_json->>'expiry_date',
                COALESCE((meta_json->>'usage_limit')::integer, 100),
                COALESCE((meta_json->>'is_active')::boolean, true)
            )
            ON CONFLICT (code) DO UPDATE SET
                discount_percent = EXCLUDED.discount_percent,
                flat_discount = EXCLUDED.flat_discount,
                min_order_amount = EXCLUDED.min_order_amount,
                expiry_date = EXCLUDED.expiry_date,
                usage_limit = EXCLUDED.usage_limit,
                is_active = EXCLUDED.is_active;
                
            -- Delete from categories table now that it has been migrated
            DELETE FROM public.categories WHERE id = cat_row.id;
            
            RAISE NOTICE 'Migrated virtual coupon % to coupons table.', coupon_code;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to parse/migrate virtual coupon category %: %', cat_row.id, SQLERRM;
        END;
    END LOOP;
END $$;
