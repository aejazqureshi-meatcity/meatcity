"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { TextInput } from '@/components/ui/TextInput';
import { PrimaryButton } from '@/components/ui/Button';

export default function RegisterB2B() {
  const [formData, setFormData] = useState({
    businessName: '',
    contactPerson: '',
    phone: '',
    email: '',
    password: '',
    businessType: 'Restaurant',
    address: '',
    gstNumber: '',
    fssaiLicense: '',
    expectedMonthlyVolume: '',
    notes: '',
    referralCode: ''
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
          full_name: formData.contactPerson,
          phone: formData.phone,
          business_name: formData.businessName,
          business_type: formData.businessType,
          contact_person: formData.contactPerson,
          address: formData.address,
          gst_number: formData.gstNumber,
          fssai_license: formData.fssaiLicense,
          expected_monthly_volume: formData.expectedMonthlyVolume,
          notes: formData.notes,
          referral_code: formData.referralCode
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
      <form onSubmit={handleRegister} className="flex-1 flex flex-col gap-4 max-w-sm mx-auto w-full my-6 overflow-y-auto max-h-[60vh] pr-1">
        {error && (
          <div className="bg-primary/10 border border-primary/20 text-primary p-3 rounded-[12px] text-xs font-bold text-center">
            {error}
          </div>
        )}
        
        <TextInput 
          label="Business Name *"
          type="text"
          name="businessName"
          required
          value={formData.businessName}
          onChange={handleChange}
          placeholder="e.g. Taste of Mumbai cloud kitchen"
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-text-secondary font-bold uppercase tracking-wider">Business Type *</label>
          <select 
            name="businessType" 
            required 
            value={formData.businessType} 
            onChange={handleChange}
            className="w-full bg-[#1E2020] border border-white/5 rounded-[12px] px-4 py-3.5 text-white text-sm outline-none focus:border-gold/50"
          >
            <option value="Restaurant">Restaurant</option>
            <option value="Hotel">Hotel</option>
            <option value="Caterer">Caterer</option>
            <option value="Cloud Kitchen">Cloud Kitchen</option>
            <option value="Meat Shop">Meat Shop</option>
            <option value="Retailer">Retailer</option>
          </select>
        </div>

        <TextInput 
          label="Contact Person Name *"
          type="text"
          name="contactPerson"
          required
          value={formData.contactPerson}
          onChange={handleChange}
          placeholder="Your full name"
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

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-text-secondary font-bold uppercase tracking-wider">Full Business Address *</label>
          <textarea 
            name="address" 
            required 
            value={formData.address} 
            onChange={handleChange}
            placeholder="Shop No., Block, Sector 20, Turbhe"
            className="w-full bg-[#1E2020] border border-white/5 rounded-[12px] px-4 py-3.5 text-white text-sm outline-none focus:border-gold/50 min-h-[70px]"
          />
        </div>

        <TextInput 
          label="GST Number (Optional)"
          type="text"
          name="gstNumber"
          value={formData.gstNumber}
          onChange={handleChange}
          placeholder="27AAAAA1111A1Z1"
        />

        <TextInput 
          label="FSSAI License (Optional)"
          type="text"
          name="fssaiLicense"
          value={formData.fssaiLicense}
          onChange={handleChange}
          placeholder="14-digit number"
        />

        <TextInput 
          label="Expected Monthly Volume (kg)"
          type="text"
          name="expectedMonthlyVolume"
          value={formData.expectedMonthlyVolume}
          onChange={handleChange}
          placeholder="e.g. 500 kg"
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-text-secondary font-bold uppercase tracking-wider">Notes (Optional)</label>
          <textarea 
            name="notes" 
            value={formData.notes} 
            onChange={handleChange}
            placeholder="Specific cuts or delivery times required?"
            className="w-full bg-[#1E2020] border border-white/5 rounded-[12px] px-4 py-3.5 text-white text-sm outline-none focus:border-gold/50 min-h-[70px]"
          />
        </div>

        <TextInput 
          label="Referral Code (Optional)"
          type="text"
          name="referralCode"
          value={formData.referralCode}
          onChange={handleChange}
          placeholder="e.g. MEAT2026"
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
