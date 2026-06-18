"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { TextInput } from '@/components/ui/TextInput';
import { PrimaryButton } from '@/components/ui/Button';

export default function RegisterB2C() {
  const [formData, setFormData] = useState({ fullName: '', phone: '', email: '', password: '', referralCode: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullName,
          phone: formData.phone,
          user_type: 'b2c',
          referral_code: formData.referralCode
        }
      }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-black text-white px-6 py-8 font-primary justify-between">
      {/* Header */}
      <div className="flex flex-col items-center mt-4 select-none">
        <svg className="w-14 h-14 mb-3" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" stroke="#D4AF37" strokeWidth="3" fill="#111" />
          <path d="M30 65V35L50 50L70 35V65" stroke="#D60000" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h2 className="text-white text-xl font-black uppercase tracking-tight leading-none">
          Create Account
        </h2>
        <p className="text-text-secondary text-[11px] mt-1.5 uppercase font-bold tracking-wider">Order fresh cuts to your door</p>
      </div>

      {/* Form scroll container */}
      <form onSubmit={handleRegister} className="flex-1 flex flex-col justify-center gap-4 max-w-sm mx-auto w-full my-6 overflow-y-auto max-h-[60vh] pr-1">
        {error && (
          <div className="bg-primary/10 border border-primary/20 text-primary p-3 rounded-[12px] text-xs font-bold text-center">
            {error}
          </div>
        )}
        
        <TextInput 
          label="Full Name"
          type="text"
          required
          value={formData.fullName}
          onChange={(e) => setFormData({...formData, fullName: e.target.value})}
          placeholder="John Doe"
        />

        <TextInput 
          label="Mobile Number"
          type="tel"
          required
          value={formData.phone}
          onChange={(e) => setFormData({...formData, phone: e.target.value})}
          placeholder="10-digit number"
        />

        <TextInput 
          label="Email Address"
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          placeholder="you@example.com"
        />

        <TextInput 
          label="Password"
          type="password"
          required
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          placeholder="Min. 6 characters"
        />

        <TextInput 
          label="Referral Code (Optional)"
          type="text"
          value={formData.referralCode}
          onChange={(e) => setFormData({...formData, referralCode: e.target.value})}
          placeholder="e.g. MEAT2026"
        />

        <PrimaryButton type="submit" loading={loading} className="mt-2">
          {loading ? 'Creating Account...' : 'Sign Up'}
        </PrimaryButton>
      </form>

      {/* Alternative links */}
      <div className="w-full max-w-sm mx-auto text-center mb-2">
        <p className="text-text-secondary text-[11px] font-bold">
          Already have an account?{' '}
          <Link href="/login" className="text-gold font-extrabold uppercase hover:underline">
            Login Here
          </Link>
        </p>
      </div>
    </div>
  );
}
