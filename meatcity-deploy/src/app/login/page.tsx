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

      const role = data.user?.user_metadata?.user_type;
      const status = data.user?.user_metadata?.status;
      
      console.log(`[AUTH LOG] Client-side: Sign in success. User Type: ${role}, Status: ${status}`);

      if (role === 'admin') {
        console.log(`[AUTH LOG] Client-side: Executing redirect to /admin`);
        router.push('/admin');
      } else if (role === 'b2b' && status === 'pending') {
        console.log(`[AUTH LOG] Client-side: Executing redirect to /pending`);
        router.push('/pending');
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
    <div className="flex flex-col min-h-screen bg-black text-white px-6 py-10 font-primary justify-between">
      {/* Top logo */}
      <div className="flex flex-col items-center mt-6 select-none">
        <svg className="w-16 h-16 mb-3" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" stroke="#D4AF37" strokeWidth="3" fill="#111" />
          <path d="M30 65V35L50 50L70 35V65" stroke="#D60000" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h2 className="text-white text-2xl font-black uppercase tracking-tight leading-none">
          Meat <span className="text-gold">City</span>
        </h2>
        <p className="text-text-secondary text-xs mt-1.5 uppercase font-bold tracking-wider">Login to your account</p>
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
        <span className="text-text-secondary text-[11px] font-bold uppercase tracking-wider block">Or Register Account</span>
        
        <div className="grid grid-cols-2 gap-3">
          <Link 
            href="/register" 
            className="py-3 bg-neutral-900 border border-white/5 text-white text-[11px] font-extrabold uppercase rounded-[12px] active:scale-95 transition-all text-center"
          >
            Retail (B2C)
          </Link>
          <Link 
            href="/register/b2b" 
            className="py-3 bg-gold/10 border border-gold/20 text-gold text-[11px] font-extrabold uppercase rounded-[12px] active:scale-95 transition-all text-center"
          >
            Business (B2B)
          </Link>
        </div>
      </div>
    </div>
  );
}
