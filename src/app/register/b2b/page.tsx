"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { TextInput } from '@/components/ui/TextInput';
import { PrimaryButton } from '@/components/ui/Button';

export default function RegisterB2B() {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: ''
  });
  
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
          user_type: 'b2b',
          status: 'pending',
          full_name: formData.fullName,
          phone: formData.phone
        }
      }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/pending');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="flex flex-col min-h-screen bg-black text-white px-6 py-8 font-primary justify-between">
      {/* Header */}
      <div className="flex flex-col items-center mt-4 select-none">
        <svg className="w-14 h-14 mb-3" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" stroke="#D4AF37" strokeWidth="3" fill="#111" />
          <path d="M30 65V35L50 50L70 35V65" stroke="#D60000" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h2 className="text-white text-xl font-black uppercase tracking-tight leading-none text-center">
          Partner with Us
        </h2>
        <p className="text-gold text-[10px] mt-1.5 uppercase font-bold tracking-wider">Wholesale Registration</p>
      </div>

      {/* Form scroll container */}
      <form onSubmit={handleRegister} className="flex-1 flex flex-col justify-center gap-4 max-w-sm mx-auto w-full my-6 overflow-y-auto max-h-[60vh] pr-1">
        {error && (
          <div className="bg-primary/10 border border-primary/20 text-primary p-3 rounded-[12px] text-xs font-bold text-center">
            {error}
          </div>
        )}
        
        <TextInput 
          label="Full Name *"
          type="text"
          name="fullName"
          required
          value={formData.fullName}
          onChange={handleChange}
          placeholder="Contact person full name"
        />

        <TextInput 
          label="Mobile Number *"
          type="tel"
          name="phone"
          required
          value={formData.phone}
          onChange={handleChange}
          placeholder="10-digit mobile"
        />

        <TextInput 
          label="Email Address *"
          type="email"
          name="email"
          required
          value={formData.email}
          onChange={handleChange}
          placeholder="business@example.com"
        />

        <TextInput 
          label="Password *"
          type="password"
          name="password"
          required
          value={formData.password}
          onChange={handleChange}
          placeholder="Min. 6 characters"
        />

        <PrimaryButton type="submit" loading={loading} className="mt-2">
          {loading ? 'Submitting Application...' : 'Submit Application'}
        </PrimaryButton>
      </form>

      {/* Alternative links */}
      <div className="w-full max-w-sm mx-auto text-center mb-2">
        <p className="text-text-secondary text-[11px] font-bold">
          Already a partner?{' '}
          <Link href="/login" className="text-gold font-extrabold uppercase hover:underline">
            Login Here
          </Link>
        </p>
      </div>
    </div>
  );
}
