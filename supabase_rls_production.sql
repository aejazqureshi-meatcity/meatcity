-- =========================================================================
-- MEAT CITY - PRODUCTION ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================
-- Run this AFTER running supabase_schema.sql to replace the 
-- development-only "allow all" policies with secure production rules.
-- =========================================================================

-- =========================================================================
-- 1. CATEGORIES (Public read, Admin write)
-- =========================================================================
drop policy if exists "Allow all read categories" on public.categories;
drop policy if exists "Allow admin full access categories" on public.categories;

create policy "categories_select_public" on public.categories
  for select using (true);

create policy "categories_admin_all" on public.categories
  for all using (
    exists (select 1 from public.users where users.id = auth.uid() and users.user_type = 'admin')
  );

-- =========================================================================
-- 2. PRODUCTS (Public read, Admin write)
-- =========================================================================
drop policy if exists "Allow all read products" on public.products;
drop policy if exists "Allow admin full access products" on public.products;

create policy "products_select_public" on public.products
  for select using (true);

create policy "products_admin_all" on public.products
  for all using (
    exists (select 1 from public.users where users.id = auth.uid() and users.user_type = 'admin')
  );

-- =========================================================================
-- 3. USERS (Own profile read/update, Admin full access)
-- =========================================================================
drop policy if exists "Allow all actions public.users" on public.users;

-- Users can read their own profile
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

-- Users can update their own profile
create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- Admins can do everything
create policy "users_admin_all" on public.users
  for all using (
    exists (select 1 from public.users where users.id = auth.uid() and users.user_type = 'admin')
  );

-- Allow new user insert from auth trigger (service role)
create policy "users_insert_trigger" on public.users
  for insert with check (true);

-- =========================================================================
-- 4. ADDRESSES (Own addresses only, Admin full access)
-- =========================================================================
drop policy if exists "Allow all actions public.addresses" on public.addresses;

create policy "addresses_select_own" on public.addresses
  for select using (auth.uid() = user_id);

create policy "addresses_insert_own" on public.addresses
  for insert with check (auth.uid() = user_id);

create policy "addresses_update_own" on public.addresses
  for update using (auth.uid() = user_id);

create policy "addresses_delete_own" on public.addresses
  for delete using (auth.uid() = user_id);

create policy "addresses_admin_all" on public.addresses
  for all using (
    exists (select 1 from public.users where users.id = auth.uid() and users.user_type = 'admin')
  );

-- =========================================================================
-- 5. ORDERS (Own orders read/insert, Admin & delivery full access)
-- =========================================================================
drop policy if exists "Allow all actions public.orders" on public.orders;

-- Users can see their own orders
create policy "orders_select_own" on public.orders
  for select using (auth.uid() = user_id);

-- Users can place their own orders
create policy "orders_insert_own" on public.orders
  for insert with check (auth.uid() = user_id);

-- Admins can do everything with orders
create policy "orders_admin_all" on public.orders
  for all using (
    exists (select 1 from public.users where users.id = auth.uid() and users.user_type = 'admin')
  );

-- Delivery partners can view and update orders assigned to them
create policy "orders_delivery_select" on public.orders
  for select using (
    exists (select 1 from public.users where users.id = auth.uid() and users.user_type = 'delivery_partner')
    and delivery_partner_id = auth.uid()
  );

create policy "orders_delivery_update" on public.orders
  for update using (
    exists (select 1 from public.users where users.id = auth.uid() and users.user_type = 'delivery_partner')
    and delivery_partner_id = auth.uid()
  );

-- =========================================================================
-- 6. ORDER ITEMS (Via order ownership, Admin full access)
-- =========================================================================
drop policy if exists "Allow all actions public.order_items" on public.order_items;

create policy "order_items_select_own" on public.order_items
  for select using (
    exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
  );

create policy "order_items_insert_own" on public.order_items
  for insert with check (
    exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
  );

create policy "order_items_admin_all" on public.order_items
  for all using (
    exists (select 1 from public.users where users.id = auth.uid() and users.user_type = 'admin')
  );

create policy "order_items_delivery_select" on public.order_items
  for select using (
    exists (
      select 1 from public.orders 
      where orders.id = order_items.order_id 
      and orders.delivery_partner_id = auth.uid()
    )
  );

-- =========================================================================
-- 7. B2B LEDGERS (Own ledger read, Admin full access)
-- =========================================================================
drop policy if exists "Allow all actions public.b2b_ledgers" on public.b2b_ledgers;

create policy "b2b_ledgers_select_own" on public.b2b_ledgers
  for select using (auth.uid() = user_id);

create policy "b2b_ledgers_admin_all" on public.b2b_ledgers
  for all using (
    exists (select 1 from public.users where users.id = auth.uid() and users.user_type = 'admin')
  );

-- =========================================================================
-- 8. CASH COLLECTION REQUESTS (Own read/insert, Admin full access)
-- =========================================================================
drop policy if exists "Allow all actions public.cash_collection_requests" on public.cash_collection_requests;

create policy "cash_requests_select_own" on public.cash_collection_requests
  for select using (auth.uid() = user_id);

create policy "cash_requests_insert_own" on public.cash_collection_requests
  for insert with check (auth.uid() = user_id);

create policy "cash_requests_admin_all" on public.cash_collection_requests
  for all using (
    exists (select 1 from public.users where users.id = auth.uid() and users.user_type = 'admin')
  );

-- =========================================================================
-- 9. DELIVERY PARTNERS (Admin full access, self read)
-- =========================================================================
drop policy if exists "Allow all actions public.delivery_partners" on public.delivery_partners;

create policy "delivery_partners_select_own" on public.delivery_partners
  for select using (auth.uid() = id);

create policy "delivery_partners_admin_all" on public.delivery_partners
  for all using (
    exists (select 1 from public.users where users.id = auth.uid() and users.user_type = 'admin')
  );

-- =========================================================================
-- 10. NOTIFICATIONS (Own notifications, Admin full access)
-- =========================================================================
drop policy if exists "Allow all actions public.notifications" on public.notifications;

create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id);

create policy "notifications_insert_any" on public.notifications
  for insert with check (true);

create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id);

create policy "notifications_admin_all" on public.notifications
  for all using (
    exists (select 1 from public.users where users.id = auth.uid() and users.user_type = 'admin')
  );

-- =========================================================================
-- 11. PAYMENTS (Own read/insert, Admin full access)
-- =========================================================================
drop policy if exists "Allow all actions public.payments" on public.payments;

create policy "payments_select_own" on public.payments
  for select using (auth.uid() = user_id);

create policy "payments_insert_own" on public.payments
  for insert with check (auth.uid() = user_id);

create policy "payments_admin_all" on public.payments
  for all using (
    exists (select 1 from public.users where users.id = auth.uid() and users.user_type = 'admin')
  );
