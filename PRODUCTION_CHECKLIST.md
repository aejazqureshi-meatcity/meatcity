# Production Go-Live Checklist

Follow this checklist to ensure a safe, secure, and fully verified deployment of the Meat City application.

---

## 1. Database & Security Checklist
- [ ] Create a production-ready Supabase Project.
- [ ] Run `supabase_schema.sql` in the Supabase SQL editor to initialize tables.
- [ ] Run `supabase_rls_production.sql` in the Supabase SQL editor to secure databases.
- [ ] Verify Row Level Security is enabled on all tables:
  - `users`
  - `products`
  - `categories`
  - `orders`
  - `order_items`
  - `b2b_ledgers`
  - `payments`
  - `cash_collection_requests`
  - `delivery_partners`
  - `notifications`
- [ ] Ensure that default database credentials/passwords for Supabase are secure and saved in a vault.

## 2. API & Payment Checklist
- [ ] Verify Razorpay account is activated and switched to **Live Mode**.
- [ ] Generate Live Key ID and Key Secret in Razorpay.
- [ ] Set `NEXT_PUBLIC_USE_MOCK_DB=false` in deployment settings.
- [ ] Verify `NEXT_PUBLIC_RAZORPAY_KEY_ID` matches the `rzp_live_` key format.
- [ ] Verify `RAZORPAY_KEY_SECRET` is set securely.
- [ ] Test order initialization API and signature verification API using a safe test payload to confirm HMAC keys.

## 3. Hosting & Deployment Checklist
- [ ] Deploy the project repository to **Vercel**.
- [ ] Add all production environment variables securely inside Vercel Dashboard Settings.
- [ ] Link your custom domain and configure DNS records.
- [ ] Force HTTPS redirections inside Vercel's Domain panel.
- [ ] Run a production build on Vercel and check that the deployment build logs show zero warnings or failures.

## 4. Mobile & PWA Checklist
- [ ] Sync capacitor configuration for native wrapper generation:
  ```bash
  npm run build
  npx cap sync
  ```
- [ ] Generate a production release Android App Bundle (`.aab`) signed using a secure key store.
- [ ] Upload the `.aab` file to Google Play Console for app distribution.
