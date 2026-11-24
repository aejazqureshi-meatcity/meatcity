"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { TextInput } from '@/components/ui/TextInput';
import { PrimaryButton } from '@/components/ui/Button';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log(`[AUTH LOG] Client-side form submit. Email: ${email}`);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.log(`[AUTH LOG] Client-side: sign in failed. Error message: ${error.message}`);
        setError(error.message);
        setLoading(false);
        return;
      }

      // Fetch up-to-date profile from public.users table to avoid stale metadata issues
      const { data: profile } = await supabase
        .from('users')
        .select('user_type, status')
        .eq('id', data.user?.id)
        .single();

      const role = profile?.user_type || data.user?.user_metadata?.user_type;
      const status = profile?.status || data.user?.user_metadata?.status;
      
      console.log(`[AUTH LOG] Client-side: Sign in success. User Type: ${role}, Status: ${status}`);

      if (role === 'b2b' && status !== 'active' && status !== 'approved') {
        await supabase.auth.signOut();
        setError('This account is pending approval.');
        setLoading(false);
        return;
      }

      if (role === 'admin') {
        console.log(`[AUTH LOG] Client-side: Executing redirect to /admin`);
        router.push('/admin');
      } else {
        console.log(`[AUTH LOG] Client-side: Executing redirect to /`);
        router.push('/');
      }
    } catch (err: any) {
      console.error(`[AUTH LOG] Client-side Exception caught:`, err);
      setError(err?.message || 'An unexpected error occurred during login.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-text-primary px-6 py-10 font-primary justify-between">
      {/* Top logo */}
      <div className="flex flex-col items-center mt-6 select-none">
        <div className="w-16 h-16 mb-2 flex items-center justify-center">
          <img
            src="/images/brand/meatcity-icon.png"
            alt="MeatCity Icon"
            className="w-full h-full object-contain dark:hidden"
          />
          <img
            src="/images/brand/meatcity-icon-dark.png"
            alt="MeatCity Icon"
            className="w-full h-full object-contain hidden dark:block"
          />
        </div>
        <div className="h-7 flex items-center justify-center">
          <img
            src="/images/brand/meatcity-wordmark.png"
            alt="MeatCity"
            className="h-full object-contain dark:hidden"
          />
          <img
            src="/images/brand/meatcity-wordmark-dark.png"
            alt="MeatCity"
            className="h-full object-contain hidden dark:block"
          />
        </div>
        <p className="text-text-secondary text-xs mt-1.5 uppercase font-bold tracking-wider">
          Meat that matters.
        </p>
      </div>

      {/* Login form */}
      <form onSubmit={handleLogin} className="flex-1 flex flex-col justify-center gap-4.5 max-w-sm mx-auto w-full my-8">
        {error && (
          <div className="bg-primary/10 border border-primary/20 text-primary p-3 rounded-[12px] text-xs font-bold text-center">
            {error}
          </div>
        )}
        
        <TextInput 
          label="Email Address"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />

        <TextInput 
          label="Password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        <PrimaryButton type="submit" loading={loading} className="mt-2.5">
          {loading ? 'Logging in...' : 'Login'}
        </PrimaryButton>
      </form>

      {/* Alternative links */}
      <div className="w-full max-w-sm mx-auto text-center flex flex-col gap-3.5 mb-2">
        <span className="text-text-secondary text-[11px] font-bold uppercase tracking-wider block">
          Or Register Account
        </span>
        
        <div className="grid grid-cols-2 gap-3">
          <Link 
            href="/register" 
            className="py-3 bg-surface border border-border text-text-primary text-[11px] font-black uppercase rounded-[12px] active:scale-95 transition-all text-center hover:border-primary/40 shadow-xs"
          >
            Retail (B2C)
          </Link>
          <Link 
            href="/register/b2b" 
            className="py-3 bg-gold/10 border border-gold/30 text-gold text-[11px] font-black uppercase rounded-[12px] active:scale-95 transition-all text-center hover:bg-gold/15 shadow-xs"
          >
            Business (B2B)
          </Link>
        </div>
      </div>
    </div>
  );
}
