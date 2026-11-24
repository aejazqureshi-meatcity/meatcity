"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LocationBar() {
  const [deliveryText, setDeliveryText] = useState<string>('Select your delivery location');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const router = useRouter();
  const supabase = createClient();

  const loadActiveLocation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoggedIn(false);
        setDeliveryText('Select your delivery location');
        return;
      }

      setIsLoggedIn(true);

      // Fetch addresses from database
      const { data: addrData, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id);

      if (error || !addrData || addrData.length === 0) {
        setDeliveryText('Select your delivery location');
        return;
      }

      // Check for active address in localStorage
      const activeIdKey = `meatcity_active_address_id_${user.id}`;
      const storedId = localStorage.getItem(activeIdKey);

      let activeAddr = addrData.find((a: any) => a.id === storedId);
      if (!activeAddr) {
        activeAddr = addrData[0];
        localStorage.setItem(activeIdKey, activeAddr.id);
      }

      const addressLine = activeAddr.address_line || 
        `${activeAddr.room_number || ''}, ${activeAddr.sector_area || ''}, Pincode: ${activeAddr.pincode || ''}`;
      
      setDeliveryText(addressLine);
    } catch (err) {
      console.error('Failed to load active delivery location:', err);
      setDeliveryText('Select your delivery location');
    }
  };

  useEffect(() => {
    loadActiveLocation();

    const handleAddressChange = () => {
      loadActiveLocation();
    };

    window.addEventListener('address-changed', handleAddressChange);

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
      className="flex items-center justify-between px-1 py-1 cursor-pointer select-none transition-opacity hover:opacity-85"
      role="button"
      tabIndex={0}
      aria-label="Select delivery location"
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary">
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/>
          </svg>
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-extrabold text-text-primary leading-none">Delivering to</span>
            <svg className="w-3.5 h-3.5 text-text-secondary" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-xs text-text-secondary font-medium leading-normal mt-0.5 truncate">
            {deliveryText}
          </span>
        </div>
      </div>
    </div>
  );
}
