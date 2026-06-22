-- =========================================================================
-- MEAT CITY - SYSTEM DATABASE SCHEMA
-- =========================================================================

-- Enable necessary extensions
create extension if not exists pgcrypto;

-- 1. Create categories table
create table if not exists public.categories (
    id text primary key,
    name text not null
);

-- 2. Create products table
create table if not exists public.products (
    id text primary key,
    name text not null,
    description text,
    category text references public.categories(id) on delete set null,
    price_b2c numeric not null default 0,
    price_b2b numeric not null default 0,
    unit text not null default 'kg',
    image_url text,
    stock numeric not null default 0,
    is_available boolean not null default true,
    created_at timestamp with time zone default now()
);

-- 3. Create public.users table
create table if not exists public.users (
    id uuid primary key,
    email text,
    full_name text,
    phone text,
    user_type text not null default 'b2c', -- 'admin', 'b2c', 'b2b', 'delivery_partner'
    status text not null default 'active', -- 'pending', 'active', 'rejected', 'suspended', 'inactive'
    business_name text,
    gst_number text,
    fssai_license text,
    shop_address text,
    referral_code text,
    credit_limit numeric not null default 0,
    credit_used numeric not null default 0,
    credit_available numeric not null default 0,
    outstanding_balance numeric not null default 0,
    payment_due_date text,
    last_payment_date text,
    ledger jsonb not null default '[]'::jsonb,
    created_at timestamp with time zone default now()
);

-- 4. Create addresses table
create table if not exists public.addresses (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.users(id) on delete cascade not null,
    name text not null,
    address_line text not null,
    phone text,
    created_at timestamp with time zone default now()
);

-- 5. Create orders table
create table if not exists public.orders (
    id text primary key,
    user_id uuid references public.users(id) on delete cascade not null,
    customer_name text,
    business_name text,
    customer_phone text,
    delivery_address text,
    subtotal numeric not null default 0,
    discount numeric not null default 0,
    delivery_fee numeric not null default 0,
    total numeric not null default 0,
    payment_method text,
    payment_status text,
    payment_ref text,
    status text not null default 'New',
    delivery_partner_id uuid references public.users(id) on delete set null,
    delivery_partner_name text,
    delivery_status text,
    delivery_otp text,
    items jsonb default '[]'::jsonb,
    created_at timestamp with time zone default now()
);

-- 6. Create order_items table
create table if not exists public.order_items (
    id uuid primary key default gen_random_uuid(),
    order_id text references public.orders(id) on delete cascade not null,
    product_id text references public.products(id) on delete set null,
    name text not null,
    quantity numeric not null default 1,
    price numeric not null default 0
);

-- 7. Create b2b_ledgers table
create table if not exists public.b2b_ledgers (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.users(id) on delete cascade not null,
    date timestamp with time zone default now(),
    description text,
    debit numeric not null default 0,
    credit numeric not null default 0,
    balance numeric not null default 0
);

-- 8. Create cash_collection_requests table
create table if not exists public.cash_collection_requests (
    id text primary key,
    user_id uuid references public.users(id) on delete cascade not null,
    business_name text,
    customer_name text,
    customer_phone text,
    amount numeric not null default 0,
    preferred_date text,
    status text not null default 'pending', -- 'pending', 'processed'
    remarks text,
    created_at timestamp with time zone default now()
);

-- 9. Create delivery_partners table
create table if not exists public.delivery_partners (
    id uuid primary key references public.users(id) on delete cascade,
    status text not null default 'active', -- 'active', 'inactive'
    created_at timestamp with time zone default now()
);

-- 10. Create notifications table
create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.users(id) on delete cascade not null,
    title text not null,
    message text,
    type text,
    read boolean not null default false,
    created_at timestamp with time zone default now()
);

-- 17. Create payments table for B2B repayments
create table if not exists public.payments (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.users(id) on delete cascade not null,
    amount numeric not null default 0,
    status text not null default 'pending', -- 'pending', 'active', 'rejected'
    payment_method text,
    payment_ref text,
    screenshot_url text,
    created_at timestamp with time zone default now()
);

-- Enable RLS and setup simple access policies if needed
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.users enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.b2b_ledgers enable row level security;
alter table public.cash_collection_requests enable row level security;
alter table public.delivery_partners enable row level security;
alter table public.notifications enable row level security;
alter table public.payments enable row level security;

-- Setup full read/write permissions for authenticated users and admins (simple policies)
drop policy if exists "Allow all read categories" on public.categories;
create policy "Allow all read categories" on public.categories for select using (true);

drop policy if exists "Allow all read products" on public.products;
create policy "Allow all read products" on public.products for select using (true);

drop policy if exists "Allow all actions public.users" on public.users;
create policy "Allow all actions public.users" on public.users for all using (true);

drop policy if exists "Allow all actions public.addresses" on public.addresses;
create policy "Allow all actions public.addresses" on public.addresses for all using (true);

drop policy if exists "Allow all actions public.orders" on public.orders;
create policy "Allow all actions public.orders" on public.orders for all using (true);

drop policy if exists "Allow all actions public.order_items" on public.order_items;
create policy "Allow all actions public.order_items" on public.order_items for all using (true);

drop policy if exists "Allow all actions public.b2b_ledgers" on public.b2b_ledgers;
create policy "Allow all actions public.b2b_ledgers" on public.b2b_ledgers for all using (true);

drop policy if exists "Allow all actions public.cash_collection_requests" on public.cash_collection_requests;
create policy "Allow all actions public.cash_collection_requests" on public.cash_collection_requests for all using (true);

drop policy if exists "Allow all actions public.delivery_partners" on public.delivery_partners;
create policy "Allow all actions public.delivery_partners" on public.delivery_partners for all using (true);

drop policy if exists "Allow all actions public.notifications" on public.notifications;
create policy "Allow all actions public.notifications" on public.notifications for all using (true);

drop policy if exists "Allow all actions public.payments" on public.payments;
create policy "Allow all actions public.payments" on public.payments for all using (true);

drop policy if exists "Allow admin full access categories" on public.categories;
create policy "Allow admin full access categories" on public.categories for all using (true);

drop policy if exists "Allow admin full access products" on public.products;
create policy "Allow admin full access products" on public.products for all using (true);


-- 11. Create trigger function to copy auth.users into public.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (
    id, email, full_name, phone, user_type, status, business_name, gst_number, fssai_license, shop_address, referral_code,
    credit_limit, credit_used, credit_available, outstanding_balance
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'user_type', 'b2c'),
    case 
      when coalesce(new.raw_user_meta_data->>'user_type', 'b2c') = 'b2b' then 'pending'
      else 'active'
    end,
    coalesce(new.raw_user_meta_data->>'business_name', ''),
    coalesce(new.raw_user_meta_data->>'gst_number', ''),
    coalesce(new.raw_user_meta_data->>'fssai_license', ''),
    coalesce(new.raw_user_meta_data->>'address', ''),
    coalesce(new.raw_user_meta_data->>'referral_code', ''),
    case when coalesce(new.raw_user_meta_data->>'user_type', 'b2c') = 'b2b' then 50000 else 0 end,
    0,
    case when coalesce(new.raw_user_meta_data->>'user_type', 'b2c') = 'b2b' then 50000 else 0 end,
    0
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to sync auth users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 12. Create trigger function to sync B2B ledger JSON array to b2b_ledgers table
create or replace function public.sync_b2b_ledger()
returns trigger as $$
begin
  delete from public.b2b_ledgers where user_id = new.id;
  
  if new.ledger is not null and jsonb_array_length(new.ledger) > 0 then
    insert into public.b2b_ledgers (user_id, date, description, debit, credit, balance)
    select 
      new.id,
      coalesce((elem->>'date')::timestamp with time zone, now()),
      elem->>'description',
      coalesce((elem->>'debit')::numeric, 0),
      coalesce((elem->>'credit')::numeric, 0),
      coalesce((elem->>'balance')::numeric, 0)
    from jsonb_array_elements(new.ledger) as elem;
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to sync ledger array
drop trigger if exists trigger_sync_b2b_ledger on public.users;
create trigger trigger_sync_b2b_ledger
  after insert or update of ledger on public.users
  for each row execute procedure public.sync_b2b_ledger();


-- 13. Create trigger function to sync delivery partners status
create or replace function public.sync_delivery_partners()
returns trigger as $$
begin
  if new.user_type = 'delivery_partner' then
    insert into public.delivery_partners (id, status, created_at)
    values (new.id, new.status, coalesce(new.created_at, now()))
    on conflict (id) do update 
    set status = excluded.status;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to sync delivery partners
drop trigger if exists trigger_sync_delivery_partners on public.users;
create trigger trigger_sync_delivery_partners
  after insert or update of user_type, status on public.users
  for each row execute procedure public.sync_delivery_partners();


-- 14. Seed Categories
insert into public.categories (id, name) values
('Chicken', 'Chicken'),
('Mutton', 'Mutton'),
('Seafood', 'Seafood'),
('Eggs', 'Eggs'),
('Ready To Cook', 'Ready To Cook')
on conflict (id) do update set name = excluded.name;


-- 15. Seed Products
insert into public.products (id, name, description, category, price_b2c, price_b2b, unit, stock, is_available, image_url) values
('prod-1', 'Chicken Curry Cut', 'Fresh, halal, skinless chicken cut into curry-sized pieces. Juicy & tender.', 'Chicken', 260, 220, 'kg', 50, true, 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=500&auto=format&fit=crop&q=60'),
('prod-2', 'Chicken Breast Boneless', 'Tender and juicy boneless chicken breast. Cleaned and trimmed of fat.', 'Chicken', 320, 280, 'kg', 40, true, 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=500&auto=format&fit=crop&q=60'),
('prod-3', 'Fresh Mutton Curry Cut', 'Premium quality tender halal goat meat, cut perfectly for curries and stews.', 'Mutton', 850, 780, 'kg', 30, true, 'https://images.unsplash.com/photo-1514516345957-556ca7d90a29?w=500&auto=format&fit=crop&q=60'),
('prod-4', 'Mutton Minced (Keema)', 'Finely minced fresh halal mutton, perfect for kebab preparations and keema curry.', 'Mutton', 900, 820, 'kg', 25, true, 'https://images.unsplash.com/photo-1588168333986-5078647aa981?w=500&auto=format&fit=crop&q=60'),
('prod-5', 'Premium Pomfret Medium', 'Freshly caught pomfret fish, clean gutted and ready to fry or grill.', 'Seafood', 750, 680, 'kg', 15, true, 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=500&auto=format&fit=crop&q=60'),
('prod-6', 'Fresh Farm Eggs (Pack of 12)', 'High-protein, farm fresh brown eggs. Carefully sorted and safely packed.', 'Eggs', 110, 95, 'pack', 100, true, 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=500&auto=format&fit=crop&q=60'),
('prod-7', 'Chicken Tikka Marinade', 'Halal chicken cubes marinated in premium curd and hot spices. Ready to grill.', 'Ready To Cook', 290, 250, 'pack', 35, true, 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60')
on conflict (id) do update set 
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  price_b2c = excluded.price_b2c,
  price_b2b = excluded.price_b2b,
  unit = excluded.unit,
  stock = excluded.stock,
  is_available = excluded.is_available,
  image_url = excluded.image_url;


-- 16. Seed Admin User in auth.users and public.users
-- Admin credentials: admin@meatcity.com / password123
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  phone, phone_change, phone_change_token, email_change_token_current, is_super_admin
)
values (
  '00000000-0000-0000-0000-000000000000',
  '1c6b0337-3b7b-4ccf-923e-87aca84d0c45', -- Unified Admin UID
  'authenticated',
  'authenticated',
  'admin@meatcity.com',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Aejaz Qureshi","user_type":"admin","status":"active"}',
  now(),
  now(),
  '', '', '', '',
  '', '', '', '', false
) on conflict (id) do nothing;

insert into public.users (
  id, email, full_name, phone, user_type, status, created_at
)
values (
  '1c6b0337-3b7b-4ccf-923e-87aca84d0c45', -- Unified Admin UID
  'admin@meatcity.com',
  'Aejaz Qureshi',
  '7977630912',
  'admin',
  'active',
  now()
) on conflict (id) do nothing;

-- Serviceable Pincodes Table
create table if not exists public.serviceable_pincodes (
    pincode text primary key,
    delivery_charge numeric not null default 0
);

-- Enable RLS for pincodes
alter table public.serviceable_pincodes enable row level security;

-- Allow all reads and writes (admin and authenticated users)
create policy "Allow all read pincodes" on public.serviceable_pincodes for select using (true);
create policy "Allow all write pincodes" on public.serviceable_pincodes for all using (true);
