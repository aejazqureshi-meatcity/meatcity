"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function DeliveryLogin() {
  const [identifier, setIdentifier] = useState(''); // Email or Mobile number
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const rawId = identifier.trim();
    if (!rawId) {
      setError('Please enter your email or 10-digit mobile number.');
      setLoading(false);
      return;
    }

    try {
      // 1. Resolve identifier to email if phone number was entered
      let loginEmail = rawId.toLowerCase();

      if (!rawId.includes('@')) {
        console.log(`[AUTH] Resolving mobile number to email: ${rawId}`);
        const res = await fetch('/api/auth/resolve-identifier', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: rawId }),
        });

        const resData = await res.json();
        if (!res.ok || resData.error) {
          setError(resData.error || 'No registered delivery partner account found with this mobile number.');
          setLoading(false);
          return;
        }

        loginEmail = resData.email;
        console.log(`[AUTH] Mobile resolved to email: ${loginEmail}`);
      }

      // 2. Perform Supabase Auth password verification
      console.log(`[AUTH] Attempting sign-in for: ${loginEmail}`);
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (authError) {
        console.warn(`[AUTH] Sign-in failed: ${authError.message}`);
        if (authError.message.toLowerCase().includes('invalid login credentials')) {
          setError('Incorrect password or email. Please double-check your credentials.');
        } else {
          setError(authError.message);
        }
        setLoading(false);
        return;
      }

      // 3. Verify user role & status in public.users to prevent stale metadata bypass
      const { data: profile } = await supabase
        .from('users')
        .select('user_type, status, full_name')
        .eq('id', data.user.id)
        .single();

      const role = profile?.user_type || data.user?.user_metadata?.user_type;
      const status = profile?.status || data.user?.user_metadata?.status || 'active';

      if (role !== 'delivery_partner') {
        setError('Access denied. Only registered MeatCity Delivery Partners can access this portal.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      if (status !== 'active') {
        setError('Your delivery partner account is currently deactivated. Please contact MeatCity Admin.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      console.log(`[AUTH] Delivery partner sign-in successful: ${data.user.id} (${profile?.full_name || loginEmail})`);
      router.push('/delivery');
      router.refresh();
    } catch (err: any) {
      console.error('[AUTH ERROR] Exception during delivery login:', err);
      setError(err?.message || 'An unexpected network error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-[420px] bg-[#111111] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
            🛵
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Delivery Portal</h2>
          <p className="text-xs text-gray-400 mt-1">Sign in to manage and fulfill your delivery queue</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 bg-red-950/40 border border-red-500/40 rounded-xl text-red-300 text-xs font-semibold flex items-start gap-2.5">
            <span className="text-base leading-none">⚠️</span>
            <span className="flex-1 leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
              Email or Mobile Number
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. 9876543210 or name@meatcity.com"
              className="w-full px-4 py-3 bg-black/50 border border-white/15 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all min-h-[44px]"
              autoComplete="username"
            />
            <span className="block text-[11px] text-gray-500 mt-1">Enter your registered 10-digit mobile or login email</span>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-[#D4AF37] hover:underline focus:outline-none font-semibold"
              >
                {showPassword ? 'Hide 👁️' : 'Show 👁️'}
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter account password"
                className="w-full px-4 py-3 bg-black/50 border border-white/15 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all min-h-[44px] pr-10"
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-[#D4AF37] hover:bg-[#c49f2f] active:scale-[0.98] text-black font-black text-sm uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#D4AF37]/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2 min-h-[44px]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block animate-spin">⏳</span>
                Verifying Credentials...
              </span>
            ) : (
              'Sign In to Delivery Portal →'
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-white/10 text-center">
          <p className="text-xs text-gray-500">
            Need an account or password reset?{' '}
            <span className="text-gray-400 font-medium">Contact your branch admin.</span>
          </p>
          <div className="mt-3">
            <Link href="/" className="text-xs text-[#D4AF37] hover:underline font-bold">
              ← Return to MeatCity Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
