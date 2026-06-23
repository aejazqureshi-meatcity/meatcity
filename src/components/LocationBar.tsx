"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LocationBar() {
  const [deliveryText, setDeliveryText] = useState<string>('Loading delivery location...');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const router = useRouter();
  const supabase = createClient();

  const loadActiveLocation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoggedIn(false);
        setDeliveryText('Select Delivery Address');
        return;
      }

      setIsLoggedIn(true);

      // Fetch addresses from database
      const { data: addrData, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id);

      if (error || !addrData || addrData.length === 0) {
        setDeliveryText('Select Delivery Address');
        return;
      }

      // Check for active address in localStorage
      const activeIdKey = `meatcity_active_address_id_${user.id}`;
      const storedId = localStorage.getItem(activeIdKey);

      let activeAddr = addrData.find((a: any) => a.id === storedId);
      if (!activeAddr) {
        // Fallback to first address and store it as active
        activeAddr = addrData[0];
        localStorage.setItem(activeIdKey, activeAddr.id);
      }

      // Format location text
      const addressLine = activeAddr.address_line || 
        `${activeAddr.room_number || ''}, ${activeAddr.sector_area || ''}, Pincode: ${activeAddr.pincode || ''}`;
      
      setDeliveryText(addressLine);
    } catch (err) {
      console.error('Failed to load active delivery location:', err);
      setDeliveryText('Select Delivery Address');
    }
  };

  useEffect(() => {
    loadActiveLocation();

    const handleAddressChange = () => {
      loadActiveLocation();
    };

    window.addEventListener('address-changed', handleAddressChange);

    // Listen to Supabase auth state change (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadActiveLocation();
    });

    return () => {
      window.removeEventListener('address-changed', handleAddressChange);
      subscription.unsubscribe();
    };
  }, []);

  const handleClick = () => {
    if (isLoggedIn) {
      router.push('/profile?tab=addresses');
    } else {
      router.push('/login');
    }
  };

  return (
    <div 
      onClick={handleClick}
      className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 border-b border-white/5 cursor-pointer hover:bg-neutral-850 transition-all select-none"
    >
      <span className="text-sm select-none">📍</span>
      <div className="flex flex-col">
        <span className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold leading-none">Delivering to</span>
        <span className="text-white text-xs font-bold leading-normal mt-0.5 line-clamp-1">{deliveryText}</span>
      </div>
    </div>
  );
}
