# Environment Variables Configuration

This document outlines the environment variables required for running the Meat City application in local development (mock mode) and production (live mode).

Create a `.env.local` file in the root of the project to define these variables.

---

## 1. Supabase Connection Settings

### `NEXT_PUBLIC_SUPABASE_URL`
* **Description**: The secure endpoint URL for your Supabase project dashboard.
* **Format**: `https://[your-project-id].supabase.co`
* **Production Setting**: Configure with your live Supabase project URL.

### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
* **Description**: The public anonymous key for Supabase client queries. Safe for client-side inclusion.
* **Format**: `eyJhbGciOiJIUzI1NiIsInR5cCI...`
* **Production Setting**: Configure with your live project Anon Key.

### `SUPABASE_SERVICE_ROLE_KEY`
* **Description**: The administrative service role key for backend admin queries (creating delivery partner profiles, etc.). **NEVER expose this key on the client side**.
* **Format**: `eyJhbGciOiJIUzI1NiIsInR5c...`
* **Production Setting**: Configure securely in your Vercel project environment settings.

---

## 2. Payment Integration Settings

### `NEXT_PUBLIC_RAZORPAY_KEY_ID`
* **Description**: Your Razorpay API Key ID.
* **Format**: `rzp_live_[14-character-alphanumeric]` (for live production) or `rzp_test_[14-character-alphanumeric]` (for sandbox testing).
* **Production Setting**: Configure with your live Razorpay Key ID.

### `RAZORPAY_KEY_SECRET`
* **Description**: Your Razorpay API Key Secret. **NEVER expose this on the client side**.
* **Format**: Alphanumeric secret string.
* **Production Setting**: Configure securely in your Vercel project environment settings.

---

## 3. Database Switcher

### `NEXT_PUBLIC_USE_MOCK_DB`
* **Description**: Dictates whether the application routes database and payment operations to the local JSON mock file or the live Supabase instance.
* **Possible Values**:
  - `true`: Bypasses Supabase and Razorpay signature verifications; saves data in `mock_db.json`. Use only for local sandbox testing.
  - `false`: Strictly executes live queries and cryptographically validates all payment signatures.
* **Production Setting**: MUST be set to `false`.

---

## 4. Application Routing Settings

### `NEXT_PUBLIC_APP_URL`
* **Description**: The base canonical URL for the deployed web application. Used for absolute redirections.
* **Format**: `https://your-custom-domain.com` or `https://[your-project].vercel.app`
* **Production Setting**: Configure with your live domain address.
