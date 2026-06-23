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
    password: '',
    businessName: '',
    hotelName: '',
    gstNumber: '',
    businessAddress: '',
    monthlyEstimate: ''
  });
  
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError('You must agree to the B2B Credit Terms & Conditions to register.');
      return;
    }

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
          phone: formData.phone,
          business_name: formData.businessName,
          hotel_name: formData.hotelName,
          gst_number: formData.gstNumber || null,
          address: formData.businessAddress,
          expected_monthly_volume: formData.monthlyEstimate,
          credit_limit: 50000,
          outstanding_balance: 0,
          credit_available: 50000,
          credit_used: 0,
          ledger: []
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      <form onSubmit={handleRegister} className="flex-1 flex flex-col gap-4 max-w-sm mx-auto w-full my-6 overflow-y-auto max-h-[65vh] pr-1">
        {error && (
          <div className="bg-primary/10 border border-primary/20 text-primary p-3 rounded-[12px] text-xs font-bold text-center">
            {error}
          </div>
        )}
        
        <TextInput 
          label="Owner Name *"
          type="text"
          name="fullName"
          required
          value={formData.fullName}
          onChange={handleChange}
          placeholder="Owner / Proprietor Name"
        />

        <TextInput 
          label="Registered Business Name *"
          type="text"
          name="businessName"
          required
          value={formData.businessName}
          onChange={handleChange}
          placeholder="Legal Entity Name"
        />

        <TextInput 
          label="Hotel / Restaurant Name *"
          type="text"
          name="hotelName"
          required
          value={formData.hotelName}
          onChange={handleChange}
          placeholder="Brand / Outlet Name"
        />

        <TextInput 
          label="GST Number (Optional)"
          type="text"
          name="gstNumber"
          value={formData.gstNumber}
          onChange={handleChange}
          placeholder="22AAAAA0000A1Z5"
        />

        <div className="flex flex-col gap-1.5 w-full">
          <label className="text-xs text-text-secondary font-bold uppercase tracking-wider">Business Address *</label>
          <textarea
            name="businessAddress"
            required
            rows={3}
            value={formData.businessAddress}
            onChange={handleChange}
            placeholder="Complete delivery address"
            className="w-full bg-[#1E2020] border border-white/5 rounded-[12px] px-4 py-3.5 text-white text-sm placeholder:text-text-secondary outline-none transition-all duration-200 focus:border-gold/50 focus:ring-1 focus:ring-gold/50"
          />
        </div>

        <TextInput 
          label="Contact Number *"
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

        <TextInput 
          label="Monthly Purchase Estimate (₹) *"
          type="number"
          name="monthlyEstimate"
          required
          value={formData.monthlyEstimate}
          onChange={handleChange}
          placeholder="Expected monthly volume"
        />

        {/* Terms and Conditions Scrollbox */}
        <div className="bg-[#111] border border-white/5 rounded-[12px] p-3 text-[10px] text-text-secondary overflow-y-auto max-h-[120px] leading-relaxed select-none">
          <p className="font-extrabold text-white mb-1.5 uppercase">B2B Credit Terms & Conditions</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>All purchases made on B2B credit must be paid within the approved credit period.</li>
            <li>Delayed payments may result in suspension of account privileges and future credit facilities.</li>
            <li>MeatCity reserves the right to recover outstanding dues through legal proceedings if required.</li>
            <li>Repeated payment defaults may result in permanent account termination.</li>
            <li>Customer agrees that all invoices, ledger entries, and digital records maintained by MeatCity shall be considered valid proof of transactions.</li>
            <li>MeatCity reserves the right to modify credit limits based on payment history.</li>
            <li>Any dispute must be reported within 7 days of invoice generation.</li>
          </ol>
        </div>

        {/* Checkbox agreement */}
        <label className="flex items-start gap-2.5 cursor-pointer mt-1 select-none">
          <input 
            type="checkbox" 
            required
            checked={agreed} 
            onChange={(e) => setAgreed(e.target.checked)} 
            className="accent-gold mt-0.5 rounded cursor-pointer"
          />
          <span className="text-[11px] text-text-secondary font-bold leading-snug">
            I agree to the B2B Credit Terms & Conditions. *
          </span>
        </label>

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
