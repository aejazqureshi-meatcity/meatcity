-- Create serviceable pincodes table
create table if not exists public.serviceable_pincodes (
    id uuid primary key default gen_random_uuid(),
    pincode text unique not null,
    delivery_charge numeric not null default 50,
    created_at timestamp with time zone default now()
);

-- Seed default serviceable pincodes
insert into public.serviceable_pincodes (pincode, delivery_charge) values
('400705', 50),
('400703', 50),
('400701', 60),
('400706', 50),
('400709', 70)
on conflict (pincode) do update set delivery_charge = excluded.delivery_charge;

-- Create coupons table
create table if not exists public.coupons (
    code text primary key,
    discount_percent numeric not null default 0,
    flat_discount numeric not null default 0,
    min_order_amount numeric not null default 0,
    expiry_date text,
    usage_limit integer not null default 0,
    is_active boolean not null default true,
    created_at timestamp with time zone default now()
);

-- Seed default coupons
insert into public.coupons (code, discount_percent, flat_discount, min_order_amount, expiry_date, usage_limit, is_active) values
('WELCOME20', 20, 0, 0, '2026-12-31', 1000, true),
('EID25', 25, 0, 500, '2026-12-31', 1000, true),
('B2B10', 10, 0, 1000, '2026-12-31', 1000, true)
on conflict (code) do nothing;

-- Create reviews table
create table if not exists public.reviews (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.users(id) on delete cascade,
    customer_name text not null,
    rating integer not null check (rating >= 1 and rating <= 5),
    comment text not null,
    status text not null default 'pending', -- 'pending', 'approved', 'rejected'
    created_at timestamp with time zone default now()
);

-- Seed some approved reviews
insert into public.reviews (customer_name, rating, comment, status) values
('Aejaz Qureshi', 5, 'Fresh meat and fast delivery.', 'approved'),
('Altaf Shaikh', 5, 'Best wholesale rates in Navi Mumbai.', 'approved')
on conflict do nothing;

-- Add new columns to products
alter table public.products add column if not exists variants jsonb default '[]'::jsonb;
alter table public.products add column if not exists stock_status text not null default 'Available';

-- Add new columns to orders
alter table public.orders add column if not exists delivery_slot text;
alter table public.orders add column if not exists coupon_code text;
alter table public.orders add column if not exists coupon_discount numeric default 0;

-- Add new columns to addresses
alter table public.addresses add column if not exists room_number text;
alter table public.addresses add column if not exists sector_area text;
alter table public.addresses add column if not exists pincode text;

-- Create admin settings table
create table if not exists public.admin_settings (
    key text primary key,
    value text not null
);

-- Seed default settings
insert into public.admin_settings (key, value) values
('whatsapp_notifications_enabled', 'true'),
('admin_whatsapp_number', '917977630912'),
('is_open', 'true'),
('delivery_fee', '50'),
('free_delivery_above', '999'),
('minimum_b2c_order', '200'),
('minimum_b2b_order', '1000')
on conflict (key) do nothing;
