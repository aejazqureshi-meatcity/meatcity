# Complete Production Deployment Guide

This guide provides step-by-step instructions for deploying the Meat City application to production.

---

## 1. Supabase Production Database Setup

### Step 1: Create Your Supabase Project
1. Visit [Supabase](https://supabase.com) and log in.
2. Click **New Project** and select your organization.
3. Configure the Project Name, Database Password, and Region. Click **Create new project**.

### Step 2: Create Tables & Database Schema
1. Wait for database provisioning to complete.
2. In the sidebar, navigate to the **SQL Editor**.
3. Click **New Query**, copy the entire contents of the schema definition file [supabase_schema.sql](file:///c:/Users/ADMIN/Downloads/meatcity/supabase_schema.sql), paste it into the editor, and click **Run**.

### Step 3: Secure Your Database (Enable Row Level Security)
1. Click **New Query** again.
2. Copy the entire contents of the security script file [supabase_rls_production.sql](file:///c:/Users/ADMIN/Downloads/meatcity/supabase_rls_production.sql), paste it into the editor, and click **Run**.
3. Row Level Security policies are now fully configured to protect user profiles, ledgers, and order records.

---

## 2. Vercel Hosting Deployment

### Step 1: Connect Project Repository
1. Push your local repository to a private repository on **GitHub**, **GitLab**, or **Bitbucket**.
2. Log in to [Vercel](https://vercel.com).
3. Click **Add New > Project**, import your repository, and select **Next.js** as the Framework Preset.

### Step 2: Configure Production Environment Variables
Under the **Environment Variables** accordion, add the following fields:

| Key | Value |
| :--- | :--- |
| `NEXT_PUBLIC_USE_MOCK_DB` | `false` |
| `NEXT_PUBLIC_SUPABASE_URL` | *Your Live Supabase Project URL* |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *Your Live Supabase Anon Key* |
| `SUPABASE_SERVICE_ROLE_KEY` | *Your Live Supabase Service Role Key* |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | *Your Live Razorpay Key ID (`rzp_live_...`)* |
| `RAZORPAY_KEY_SECRET` | *Your Live Razorpay Key Secret* |
| `NEXT_PUBLIC_APP_URL` | *Your Custom URL (`https://yourdomain.com`)* |

### Step 3: Trigger Build
1. Click **Deploy**. Vercel will build, optimize, and deploy the application.
2. Confirm the build logs complete successfully with zero compile warnings.

---

## 3. Custom Domain Setup

1. In your Vercel Dashboard, go to **Project Settings > Domains**.
2. Add your custom domain (e.g., `meatcity.yourdomain.com` or `yourdomain.com`).
3. Vercel will display the required DNS configuration records:
   - For subdomains: Add a `CNAME` record in your DNS registrar pointing to `cname.vercel-dns.com`.
   - For root domains: Add an `A` record pointing to `76.76.21.21`.
4. Vercel will automatically verify the records, provision an SSL certificate, and redirect HTTP requests to HTTPS.

---

## 4. Razorpay Live Payments Activation

1. Log in to the [Razorpay Dashboard](https://dashboard.razorpay.com).
2. Switch from Test Mode to **Live Mode** using the top-right toggle.
3. Click **Settings > API Keys > Generate Live Key**.
4. Save the generated `Key ID` and `Key Secret` securely, and add them to your Vercel environment variables as shown in Step 2.
