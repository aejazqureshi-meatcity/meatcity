"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Drawer } from './ui/Drawer';

export default function Header() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState<'guest' | 'b2c' | 'b2b'>('guest');
  const [userStatus, setUserStatus] = useState<string>('');

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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
    } catch (e) {
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
        console.log(`User response to install prompt: ${outcome}`);
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
      const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
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

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#050505]/90 backdrop-blur-md border-b border-white/5 py-3.5 px-4 flex items-center justify-between">
        {/* Left Side: Hamburger */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/5 text-xl text-white active:scale-95 transition-transform"
          aria-label="Open menu"
        >
          ☰
        </button>

        {/* Center: Logo and Tagline */}
        <Link href="/" className="flex flex-col items-center justify-center select-none text-center">
          <span className="text-white text-lg font-black tracking-tight leading-none uppercase">
            Meat <span className="text-gold">City</span>
          </span>
          <span className="text-[8px] text-text-secondary uppercase font-bold tracking-widest mt-0.5">
            Meat That Matters
          </span>
        </Link>

        {/* Right Side: Cart Icon */}
        <Link 
          href="/cart"
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/5 relative text-lg active:scale-95 transition-transform"
          aria-label="View Cart"
        >
          🛒
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] font-black h-4.5 w-4.5 rounded-full flex items-center justify-center border border-black animate-pulse">
              {cartCount}
            </span>
          )}
        </Link>
      </header>

      {/* Slide-out Navigation Drawer */}
      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="Meat City Menu">
        <div className="flex flex-col justify-between h-full pt-2">
          {/* User Welcome segment */}
          <div className="bg-white/5 rounded-[12px] p-4 border border-white/5 flex flex-col gap-1.5 mb-6">
            <span className="text-xs text-text-secondary font-bold uppercase tracking-wider">Account Profile</span>
            <div className="text-white font-extrabold text-base tracking-tight truncate">
              {userName ? `Hi, ${userName.split(' ')[0]}` : 'Welcome, Guest'}
            </div>
            {userRole !== 'guest' && (
              <span className="text-[10px] text-gold font-extrabold uppercase bg-gold/10 px-2 py-0.5 rounded-full w-max mt-0.5">
                {userRole === 'b2b' ? 'Wholesale Partner' : 'Retail Customer'}
              </span>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 flex flex-col gap-2">
            <Link 
              href="/"
              onClick={() => setIsDrawerOpen(false)}
              className="flex items-center gap-3 px-4 py-3.5 bg-white/5 hover:bg-white/10 text-white text-sm font-extrabold rounded-[12px] transition-colors border border-white/5"
            >
              🍗 Shop Fresh Cuts
            </Link>

            <Link 
              href="/profile"
              onClick={() => setIsDrawerOpen(false)}
              className="flex items-center gap-3 px-4 py-3.5 bg-white/5 hover:bg-white/10 text-white text-sm font-extrabold rounded-[12px] transition-colors border border-white/5"
            >
              👤 My Account Profile
            </Link>

            <button
              onClick={handleInstallClick}
              disabled={isInstalled}
              className={`flex items-center justify-between w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-[12px] transition-all duration-300 text-left ${
                isInstalled ? 'opacity-60 cursor-default hover:bg-white/5' : 'active:scale-[0.98]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg text-gold">📲</span>
                <div className="flex flex-col">
                  <span className="text-white text-xs font-black uppercase tracking-tight">
                    {isInstalled ? 'App Installed ✓' : 'Install App'}
                  </span>
                  <span className="text-[10px] text-text-secondary font-bold">
                    {isInstalled ? 'MeatCity is ready on your device' : 'Add MeatCity to your Home Screen'}
                  </span>
                </div>
              </div>
              {!isInstalled && <span className="text-gold text-xs">📥</span>}
            </button>

            <Link 
              href="/about"
              onClick={() => setIsDrawerOpen(false)}
              className="flex items-center gap-3 px-4 py-3.5 bg-white/5 hover:bg-white/10 text-white text-sm font-extrabold rounded-[12px] transition-colors border border-white/5"
            >
              ℹ️ About MeatCity
            </Link>

            {userRole === 'guest' ? (
              <Link 
                href="/login"
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center gap-3 px-4 py-3.5 bg-gold/10 hover:bg-gold/15 text-gold text-sm font-extrabold rounded-[12px] transition-colors border border-gold/20"
              >
                🔑 Login / Register
              </Link>
            ) : (
              <>
                {userStatus === 'pending' ? (
                  <Link 
                    href="/pending"
                    onClick={() => setIsDrawerOpen(false)}
                    className="flex items-center gap-3 px-4 py-3.5 bg-white/5 hover:bg-white/10 text-white text-sm font-extrabold rounded-[12px] transition-colors border border-white/5"
                  >
                    📦 My Order Status (Pending)
                  </Link>
                ) : (
                  <>
                    {userRole === 'b2b' && (
                      <Link 
                        href="/?view=portal"
                        onClick={() => setIsDrawerOpen(false)}
                        className="flex items-center gap-3 px-4 py-3.5 bg-white/5 hover:bg-white/10 text-white text-sm font-extrabold rounded-[12px] transition-colors border border-white/5"
                      >
                        💼 Business Credit Portal
                      </Link>
                    )}
                  </>
                )}

                <button 
                  onClick={() => {
                    setIsDrawerOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center gap-3 px-4 py-3.5 bg-primary/10 hover:bg-primary/15 text-primary text-sm font-extrabold rounded-[12px] transition-colors border border-primary/20 w-full text-left"
                >
                  🚪 Sign Out Account
                </button>
              </>
            )}
          </nav>

          {/* Bottom App Info */}
          <div className="text-center text-[10px] text-text-secondary font-bold mt-auto pt-8">
            Meat City App v1.2.0 • Navi Mumbai
          </div>
        </div>
      </Drawer>

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 2rem)',
          maxWidth: '448px',
          zIndex: 9999,
          backgroundColor: toast.type === 'success' ? '#10B981' : '#EF4444',
          color: '#fff',
          padding: '0.85rem 1.25rem',
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontWeight: 800,
          fontSize: '0.85rem',
          textAlign: 'center',
          justifyContent: 'center'
        }}>
          {toast.type === 'success' ? <span>✅</span> : <span>❌</span>}
          <span>{toast.message}</span>
        </div>
      )}
    </>
  );
}
