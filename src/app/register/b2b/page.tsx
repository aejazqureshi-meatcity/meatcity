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
    pincode: '',
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

    const cleanPincode = (formData.pincode || '').trim();
    if (!/^\d{6}$/.test(cleanPincode)) {
      setError('Please enter a valid 6-digit Indian PIN code (e.g. 400705).');
      return;
    }

    setLoading(true);
    setError('');

    // Validate against serviceable PIN codes
    try {
      const { data: pinRecord } = await supabase
        .from('serviceable_pincodes')
        .select('*')
        .eq('pincode', cleanPincode)
        .maybeSingle();

      if (pinRecord && pinRecord.is_serviceable === false) {
        setError(`PIN code ${cleanPincode} is currently outside MeatCity delivery zones.`);
        setLoading(false);
        return;
      }
    } catch {
      // Table check fallback
    }

    const fullAddress = `${formData.businessAddress.trim()}, PIN: ${cleanPincode}`;

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
          pincode: cleanPincode,
          address: fullAddress,
          shop_address: fullAddress,
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
    <div className="flex flex-col min-h-screen bg-background text-text-primary px-6 py-8 font-primary justify-between">
      {/* Header */}
      <div className="flex flex-col items-center mt-4 select-none">
        <div className="w-14 h-14 mb-2 flex items-center justify-center">
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
        <h2 className="text-text-primary text-xl font-black uppercase tracking-tight leading-none text-center">
          Partner with Us
        </h2>
        <p className="text-gold text-[10px] mt-1.5 uppercase font-bold tracking-wider">
          Wholesale Registration
        </p>
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
            className="w-full bg-surface border border-border rounded-[12px] px-4 py-3 text-text-primary text-sm placeholder:text-text-secondary outline-none transition-all duration-200 focus:border-primary/60 focus:ring-2 focus:ring-primary/10"
          />
        </div>

        <TextInput 
          label="Delivery PIN Code *"
          type="text"
          name="pincode"
          required
          maxLength={6}
          value={formData.pincode}
          onChange={handleChange}
          placeholder="6-digit Indian PIN Code (e.g. 400705)"
        />

        <TextInput 
          label="Contact Number *"
          type="tel"
          name="phone"
          required
          value={formData.phone}
          onChange={handleChange}
          placeholder="10-digit number"
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
          label="Create Password *"
          type="password"
          name="password"
          required
          value={formData.password}
          onChange={handleChange}
          placeholder="Min. 6 characters"
        />

        <TextInput 
          label="Expected Monthly Meat Volume (kg)"
          type="text"
          name="monthlyEstimate"
          value={formData.monthlyEstimate}
          onChange={handleChange}
          placeholder="e.g. 500 kg"
        />

        <div className="flex items-start gap-2.5 mt-2">
          <input
            type="checkbox"
            id="terms"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 w-4 h-4 accent-primary rounded cursor-pointer"
          />
          <label htmlFor="terms" className="text-xs text-text-secondary leading-snug cursor-pointer select-none">
            I agree to MeatCity's B2B Credit Terms, weekly/bi-weekly settlement schedules, and payment obligations.
          </label>
        </div>

        <PrimaryButton type="submit" loading={loading} className="mt-2">
          {loading ? 'Submitting Application...' : 'Apply for Wholesale Account'}
        </PrimaryButton>
      </form>

      {/* Alternative links */}
      <div className="w-full max-w-sm mx-auto text-center mb-2">
        <p className="text-text-secondary text-[11px] font-bold">
          Already registered?{' '}
          <Link href="/login" className="text-gold font-black uppercase hover:underline ml-1">
            Login Here
          </Link>
        </p>
      </div>
    </div>
  );
}
