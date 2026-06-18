"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function BottomNav() {
  const pathname = usePathname() || '';
  const [cartCount, setCartCount] = useState(0);
  const [userRole, setUserRole] = useState<'guest' | 'b2c' | 'b2b'>('guest');
  const [userStatus, setUserStatus] = useState<string>('');
 
  const supabase = createClient();
 
  const updateCartCount = () => {
    try {
      const savedCart = localStorage.getItem('meatcity_cart');
      if (savedCart) {
        const cartObj = JSON.parse(savedCart);
        const count = Object.values(cartObj).reduce((sum: number, q: any) => sum + Number(q), 0);
        setCartCount(count);
      } else {
        setCartCount(0);
      }
    } catch (e) {
      setCartCount(0);
    }
  };
 
  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: dbProfile } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (dbProfile) {
        setUserRole(dbProfile.user_type === 'b2b' ? 'b2b' : 'b2c');
        setUserStatus(dbProfile.status || '');
      } else {
        setUserRole((user.user_metadata?.user_type as any) || 'b2c');
        setUserStatus(user.user_metadata?.status || '');
      }
    } else {
      setUserRole('guest');
      setUserStatus('');
    }
  };

  useEffect(() => {
    updateCartCount();
    loadUser();

    window.addEventListener('cart-updated', updateCartCount);
    window.addEventListener('storage', updateCartCount);

    return () => {
      window.removeEventListener('cart-updated', updateCartCount);
      window.removeEventListener('storage', updateCartCount);
    };
  }, []);

  // Don't show bottom nav on admin routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/admin-dev')) {
    return null;
  }

  const getOrdersHref = () => {
    if (userRole === 'guest') return '/login';
    if (userStatus === 'pending') return '/pending';
    if (userRole === 'b2b') return '/?view=portal';
    return '/'; // B2C homepage
  };

  const getProfileHref = () => {
    if (userRole === 'guest') return '/login';
    if (userStatus === 'pending') return '/pending';
    if (userRole === 'b2b') return '/?view=portal';
    return '/'; // B2C homepage
  };

  const navItems = [
    { label: 'Home', icon: '🏠', href: '/' },
    { label: 'Cart', icon: '🛒', href: '/cart', badge: cartCount },
    { label: 'Orders', icon: '📦', href: getOrdersHref() },
    { label: 'Profile', icon: '👤', href: getProfileHref() }
  ];

  const currentPath = typeof window !== 'undefined' ? (pathname + window.location.search) : pathname;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#111111]/90 backdrop-blur-md border-t border-white/5 py-2 select-none">
      <div className="max-w-[480px] mx-auto px-6 flex justify-between items-center">
        {navItems.map((item, idx) => {
          const isActive = currentPath === item.href;
          return (
            <Link 
              key={idx} 
              href={item.href}
              className="flex flex-col items-center justify-center gap-0.5 relative py-1 px-3 rounded-xl transition-all active:scale-90"
            >
              <span className="text-xl relative">
                {item.icon}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-primary text-white text-[9px] font-black h-4 w-4 rounded-full flex items-center justify-center border border-black animate-pulse">
                    {item.badge}
                  </span>
                )}
              </span>
              <span className={`text-[10px] font-bold tracking-tight ${isActive ? 'text-gold' : 'text-text-secondary'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
