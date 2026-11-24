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
    try {
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
    } catch (err) {
      setUserRole('guest');
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

  // Do not show bottom nav on admin routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/admin-dev')) {
    return null;
  }

  const getOrdersHref = () => {
    if (userRole === 'guest') return '/login';
    if (userStatus === 'pending') return '/pending';
    return '/profile?tab=orders';
  };

  const getProfileHref = () => {
    if (userRole === 'guest') return '/login';
    if (userStatus === 'pending') return '/pending';
    return '/profile';
  };

  // Nav items based on role (matching sample mockup 5-tab design)
  const navItems = userRole === 'b2b' ? [
    {
      label: 'Home',
      href: '/',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'fill-primary' : 'fill-none stroke-current'}`} viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      label: 'Catalogue',
      href: '/?view=catalog',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'fill-primary stroke-primary' : 'fill-none stroke-current'}`} viewBox="0 0 24 24" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
      )
    },
    {
      label: 'Orders',
      href: getOrdersHref(),
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'fill-primary' : 'fill-none stroke-current'}`} viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    {
      label: 'Cart',
      href: '/cart',
      badge: cartCount,
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'fill-primary' : 'fill-none stroke-current'}`} viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      )
    },
    {
      label: 'Account',
      href: getProfileHref(),
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'fill-primary' : 'fill-none stroke-current'}`} viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }
  ] : [
    {
      label: 'Home',
      href: '/',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-primary' : ''}`} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      label: 'Categories',
      href: '/categories',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-primary' : ''}`} viewBox="0 0 24 24" fill="currentColor">
          <circle cx="6" cy="6" r="2.5" />
          <circle cx="18" cy="6" r="2.5" />
          <circle cx="6" cy="18" r="2.5" />
          <circle cx="18" cy="18" r="2.5" />
        </svg>
      )
    },
    {
      label: 'Rewards',
      href: '/profile?tab=rewards',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-primary' : ''}`} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V4.5a2.5 2.5 0 00-5 0V8m5 0V4.5a2.5 2.5 0 015 0V8m-10 0h10a2 2 0 012 2v2H3v-2a2 2 0 012-2zm-2 4h18v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7z" />
        </svg>
      )
    },
    {
      label: 'Cart',
      href: '/cart',
      badge: cartCount,
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-primary' : ''}`} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      label: 'Profile',
      href: getProfileHref(),
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-primary' : ''}`} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-surface/95 dark:bg-[#111111]/95 backdrop-blur-md border-t border-border py-2 px-3 select-none print:hidden transition-colors"
      aria-label="Bottom Navigation"
    >
      <div className="max-w-[480px] mx-auto flex justify-around items-center">
        {navItems.map((item, idx) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href.split('?')[0]));
          return (
            <Link 
              key={idx} 
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 relative py-1 px-2.5 rounded-xl transition-transform active:scale-90 group"
            >
              <div className="relative flex items-center justify-center">
                <div className={`transition-colors ${isActive ? 'text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>
                  {item.icon(isActive)}
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-primary text-white text-[9px] font-black h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center border-2 border-surface shadow-sm">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span 
                className={`text-[10px] tracking-tight leading-none transition-colors ${
                  isActive 
                    ? 'font-black text-primary' 
                    : 'font-semibold text-text-secondary group-hover:text-text-primary'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
