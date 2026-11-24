"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Drawer } from './ui/Drawer';
import { useTheme } from '@/context/ThemeContext';

export default function Header() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState<'guest' | 'b2c' | 'b2b'>('guest');
  const [userStatus, setUserStatus] = useState<string>('');

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };
  
  const supabase = createClient();
  const router = useRouter();

  // Load cart count from localStorage
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
    } catch {
      setCartCount(0);
    }
  };

  // Load user details
  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: dbProfile } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (dbProfile) {
        if (dbProfile.user_type === 'b2b') {
          setUserRole('b2b');
        } else {
          setUserRole('b2c');
        }
        setUserStatus(dbProfile.status || '');
        setUserName(dbProfile.full_name || 'Customer');
      } else {
        setUserRole(user.user_metadata?.user_type || 'b2c');
        setUserStatus(user.user_metadata?.status || '');
        setUserName(user.user_metadata?.full_name || 'Customer');
      }
    } else {
      setUserRole('guest');
      setUserStatus('');
      setUserName('');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('meatcity_cart');
    localStorage.removeItem('meatcity_wishlist');
    window.dispatchEvent(new Event('cart-updated'));
    setUserRole('guest');
    setUserName('');
    router.push('/login');
    router.refresh();
  };

  const handleInstallClick = async () => {
    if (isInstalled) return;

    const promptEvent = (window as any).pwaDeferredPrompt || deferredPrompt;
    if (promptEvent) {
      setIsDrawerOpen(false);
      try {
        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          localStorage.setItem('pwa_installed', 'true');
          showToast('Thank you for installing MeatCity App! 🎉', 'success');
        }
      } catch (err) {
        console.error('Install prompt error:', err);
      }
      (window as any).pwaDeferredPrompt = null;
      setDeferredPrompt(null);
    } else {
      setIsDrawerOpen(false);
      const isiOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isiOS) {
        showToast("To Install: Tap the Share button 📤 and select 'Add to Home Screen' ➕", 'success');
      } else {
        showToast("To Install: Tap your browser menu (⋮) and select 'Install' or 'Add to Home Screen'.", 'success');
      }
    }
  };

  useEffect(() => {
    updateCartCount();
    loadUser();

    window.addEventListener('cart-updated', updateCartCount);
    window.addEventListener('storage', updateCartCount);

    const handlePromptAvailable = () => {
      setDeferredPrompt((window as any).pwaDeferredPrompt);
    };

    const handleNativePrompt = (e: Event) => {
      e.preventDefault();
      (window as any).pwaDeferredPrompt = e;
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      localStorage.setItem('pwa_installed', 'true');
      showToast('MeatCity App installed successfully! 🎉', 'success');
    };

    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isLocalInstalledFlag = localStorage.getItem('pwa_installed') === 'true';
      if (isStandalone || isLocalInstalledFlag) {
        setIsInstalled(true);
      }

      if ((window as any).pwaDeferredPrompt) {
        setDeferredPrompt((window as any).pwaDeferredPrompt);
      }

      window.addEventListener('pwa-prompt-available', handlePromptAvailable);
      window.addEventListener('beforeinstallprompt', handleNativePrompt);
      window.addEventListener('appinstalled', handleAppInstalled);
    }

    return () => {
      window.removeEventListener('cart-updated', updateCartCount);
      window.removeEventListener('storage', updateCartCount);
      if (typeof window !== 'undefined') {
        window.removeEventListener('pwa-prompt-available', handlePromptAvailable);
        window.removeEventListener('beforeinstallprompt', handleNativePrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      }
    };
  }, []);

  const isDark = resolvedTheme === 'dark';

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0B0B0B]/95 text-gray-900 dark:text-white backdrop-blur-md border-b border-gray-100 dark:border-white/10 py-2.5 px-4 flex items-center justify-between transition-colors duration-200 select-none print:hidden">
        {/* Left Side: Hamburger Drawer Icon */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 text-lg active:scale-95 transition-transform"
          aria-label="Open navigation menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Center: Official Brand Logo & Tagline */}
        <Link href="/" className="flex flex-col items-center justify-center select-none text-center group">
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
              MEAT
            </span>
            <span className="text-xl font-black tracking-tight text-[#D60000]">
              CITY
            </span>
            {userRole === 'b2b' && (
              <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                B2B
              </span>
            )}
          </div>
          <span className="text-[9px] text-gray-500 dark:text-gray-400 font-bold tracking-widest uppercase mt-0.5">
            Meat that matters.
          </span>
        </Link>

        {/* Right Side: Quick Theme Toggle & Cart Icon */}
        <div className="flex items-center gap-2">
          {/* Quick Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle theme"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 text-sm active:scale-90 transition-transform"
          >
            {isDark ? '☀️' : '🌙'}
          </button>

          {/* Cart Icon / Bag */}
          <Link 
            href="/cart"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white relative text-base active:scale-95 transition-transform"
            aria-label="View shopping cart"
          >
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#D60000] text-white text-[9px] font-black h-4.5 w-4.5 rounded-full flex items-center justify-center border-2 border-white dark:border-black animate-pulse shadow-sm">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* Slide-out Navigation Drawer */}
      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="MeatCity Menu">
        <div className="flex flex-col justify-between h-full pt-1 pb-4">
          {/* User Welcome segment */}
          <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 border border-gray-200 dark:border-white/10 flex flex-col gap-1.5 mb-5 shadow-sm">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-extrabold uppercase tracking-wider">Account Profile</span>
            <div className="text-gray-900 dark:text-white font-extrabold text-base tracking-tight truncate">
              {userName ? `Hi, ${userName.split(' ')[0]}` : 'Welcome, Guest'}
            </div>
            {userRole !== 'guest' ? (
              <span className="text-[10px] text-[#D4AF37] font-extrabold uppercase bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-2.5 py-0.5 rounded-full w-max mt-0.5">
                {userRole === 'b2b' ? '🏢 Wholesale B2B Partner' : '🍗 Retail B2C Customer'}
              </span>
            ) : (
              <Link 
                href="/login"
                onClick={() => setIsDrawerOpen(false)}
                className="text-xs text-[#D60000] font-bold hover:underline mt-1"
              >
                Sign in to your account →
              </Link>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 flex flex-col gap-2">
            <Link 
              href="/"
              onClick={() => setIsDrawerOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-900 dark:text-white text-xs font-bold rounded-xl transition-colors border border-gray-100 dark:border-white/5"
            >
              <span>🍗</span>
              <span>Shop Fresh Cuts</span>
            </Link>

            <Link 
              href="/profile"
              onClick={() => setIsDrawerOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-900 dark:text-white text-xs font-bold rounded-xl transition-colors border border-gray-100 dark:border-white/5"
            >
              <span>👤</span>
              <span>My Account & Orders</span>
            </Link>

            {userRole === 'b2b' && (
              <Link 
                href="/?view=portal"
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/15 text-[#D4AF37] text-xs font-extrabold rounded-xl transition-colors border border-[#D4AF37]/20"
              >
                <span>💼</span>
                <span>Wholesale Credit Portal</span>
              </Link>
            )}

            <button
              onClick={handleInstallClick}
              disabled={isInstalled}
              className={`flex items-center justify-between w-full px-3.5 py-2.5 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-100 dark:border-white/5 rounded-xl transition-all text-left ${
                isInstalled ? 'opacity-60 cursor-default' : 'active:scale-[0.98]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-sm">📲</span>
                <div className="flex flex-col">
                  <span className="text-gray-900 dark:text-white text-xs font-extrabold">
                    {isInstalled ? 'App Installed ✓' : 'Install MeatCity App'}
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    {isInstalled ? 'Ready on home screen' : 'Instant access & offline support'}
                  </span>
                </div>
              </div>
              {!isInstalled && <span className="text-[#D4AF37] text-xs">📥</span>}
            </button>

            <Link 
              href="/about"
              onClick={() => setIsDrawerOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-900 dark:text-white text-xs font-bold rounded-xl transition-colors border border-gray-100 dark:border-white/5"
            >
              <span>ℹ️</span>
              <span>About MeatCity</span>
            </Link>

            {/* Theme Appearance Selector in Drawer */}
            <div className="mt-3 p-3 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10">
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-extrabold uppercase tracking-wider block mb-2">
                Appearance
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-extrabold transition-all border ${
                    theme === 'light'
                      ? 'bg-white text-black border-gray-300 shadow-sm'
                      : 'bg-transparent text-gray-500 hover:text-black dark:text-gray-400 border-transparent'
                  }`}
                >
                  ☀️ Light
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-extrabold transition-all border ${
                    theme === 'dark'
                      ? 'bg-[#1F1F1F] text-white border-white/20 shadow-sm'
                      : 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-white border-transparent'
                  }`}
                >
                  🌙 Dark
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('system')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-extrabold transition-all border ${
                    theme === 'system'
                      ? 'bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/30 shadow-sm'
                      : 'bg-transparent text-gray-500 dark:text-gray-400 border-transparent'
                  }`}
                >
                  ⚙️ System
                </button>
              </div>
            </div>

            {userRole === 'guest' ? (
              <Link 
                href="/login"
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-[#D60000] hover:bg-[#B80000] text-white text-xs font-black rounded-xl transition-all shadow-md mt-2"
              >
                <span>🔑</span>
                <span>Login / Register</span>
              </Link>
            ) : (
              <button 
                onClick={() => {
                  setIsDrawerOpen(false);
                  handleLogout();
                }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl transition-colors border border-rose-500/20 w-full mt-2"
              >
                <span>🚪</span>
                <span>Sign Out Account</span>
              </button>
            )}
          </nav>

          {/* Bottom App Info */}
          <div className="text-center text-[10px] text-gray-400 dark:text-gray-500 font-bold mt-4 pt-3 border-t border-gray-100 dark:border-white/5">
            MeatCity • Meat that matters • Navi Mumbai
          </div>
        </div>
      </Drawer>

      {toast && (
        <div 
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm z-[9999] px-4 py-3 rounded-xl shadow-xl flex items-center justify-center gap-2 font-bold text-xs text-white"
          style={{ backgroundColor: toast.type === 'success' ? '#10B981' : '#EF4444' }}
        >
          <span>{toast.type === 'success' ? '✅' : '❌'}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </>
  );
}
