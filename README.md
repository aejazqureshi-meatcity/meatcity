# Meat City - Application Source Code

Welcome to the Meat City source code! This is a premium, high-performance Progressive Web App (PWA) built with **Next.js**, **React**, and **Supabase**, featuring both a Mobile Customer App and a Desktop Admin Dashboard.

## 1. Local Setup Instructions

Since you are running Windows, follow these steps to get the project running locally.

### Step 1: Install Node.js
1. Go to the official Node.js website: [nodejs.org](https://nodejs.org/)
2. Download the **LTS (Long Term Support)** version for Windows.
3. Run the installer and keep all default settings (ensure the box to "Automatically install the necessary tools" is checked if prompted).
4. Once installed, open your Command Prompt or PowerShell and type `node -v` to verify it's working.

### Step 2: Install Project Dependencies
1. Open PowerShell or Command Prompt.
2. Navigate to this project folder:
   ```cmd
   cd C:\Users\ADMIN\Downloads\meatcity
   ```
3. Run the install command to get all Next.js and Supabase Auth packages:
   ```cmd
   npm install
   ```

### Step 3: Start the Local Server
1. In the same terminal, run:
   ```cmd
   npm run dev
   ```
2. Open your web browser and navigate to:
   - **Customer App:** [http://localhost:3000](http://localhost:3000)
   - **Admin Dashboard:** [http://localhost:3000/admin](http://localhost:3000/admin) (Requires Admin Role)

---

## 2. Connecting to Supabase & Setting Up Authentication

Supabase handles your Database and Role-Based Authentication.

1. Go to [Supabase.com](https://supabase.com) and create an account/project.
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Copy the entire contents of `supabase_schema.sql` (found in this folder) and run it. This creates the `users` table with B2B fields, the auth sync triggers, and your product inventory.
4. Go to **Authentication -> Providers** and ensure **Email** is enabled.
5. Go to **Project Settings -> API** in Supabase.
6. Copy your `Project URL` and `anon public key`.
7. Rename `.env.example` to `.env.local` in this folder.
8. Paste your URL and Key into `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...
   ```
9. Restart your local server (`npm run dev`).

### Creating the First Admin
To access the Admin Dashboard:
1. Go to `http://localhost:3000/register` and sign up.
2. Open your Supabase Dashboard -> **Table Editor** -> `users` table.
3. Find your user row and change `user_type` from `b2c` to `admin`.
4. Log out and log back in on the app. You now have Admin access!

---

## 3. Deployment Instructions (Vercel)

Vercel is the creator of Next.js and the absolute best place to host this app for free.

1. **Push to GitHub**:
   - Create a GitHub account if you don't have one.
   - Initialize Git in this folder (`git init`, `git add .`, `git commit -m "Init"`).
   - Create a new repository on GitHub and push this code to it.
2. **Deploy on Vercel**:
   - Go to [Vercel.com](https://vercel.com) and sign in with GitHub.
   - Click **Add New -> Project** and select your `meatcity` repository.
   - In the "Environment Variables" section before deploying, add the variables from your `.env.local` (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
   - Click **Deploy**. Vercel will build and host your app on a live URL!

---

## 4. Converting to a Play Store Android App

Since this app is built as a highly responsive PWA (Progressive Web App) with mobile-first constraints, converting it into a downloadable Android App for the Google Play Store is incredibly easy using a tool like **Capacitor** or **PWABuilder**.

### Option A: Trusted Web Activity (TWA) via PWABuilder (Easiest)
1. Deploy your Next.js app to Vercel so you have a live URL (e.g., `meatcity.vercel.app`).
2. Go to [PWABuilder.com](https://www.pwabuilder.com/).
3. Enter your live URL. PWABuilder will automatically generate an Android `.apk` and `.aab` file that wraps your web app in a native Android shell.
4. You can take this `.aab` file and directly upload it to the Google Play Console.

### Option B: Capacitor.js (More Control)
1. In your project, run:
   ```cmd
   npm install @capacitor/core @capacitor/cli
   npx cap init "Meat City" "com.meatcity.app"
   npm install @capacitor/android
   npx cap add android
   ```
2. Build your Next.js app (`npm run build`).
3. Sync it to Android (`npx cap sync`).
4. Open the Android project in **Android Studio** and click "Build APK".

Both options ensure you only have to maintain **one codebase** for the web, mobile browser, and native Android app!
