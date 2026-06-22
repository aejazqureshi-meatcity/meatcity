"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

export default function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = sessionStorage.getItem('pwa_install_dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA Installation outcome: ${outcome}`);
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    sessionStorage.setItem('pwa_install_dismissed', 'true');
    setShowPrompt(false);
  };
  
  const isAdminRoute = pathname?.startsWith('/admin') || pathname?.startsWith('/admin-dev');
  const isAuthOrDeliveryRoute = 
    pathname?.startsWith('/login') || 
    pathname?.startsWith('/register') || 
    pathname?.startsWith('/pending') || 
    pathname?.startsWith('/delivery') ||
    pathname?.startsWith('/cart');

  if (isAdminRoute) {
    return (
      <div className="bg-[#050505] min-h-screen w-full text-white">
        {children}
      </div>
    );
  }

  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-black text-white pb-[80px] relative flex flex-col">
      {showPrompt && (
        <div className="fixed top-4 left-4 right-4 max-w-[448px] mx-auto z-[200] bg-neutral-900 border border-gold/30 p-3.5 rounded-[16px] shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center text-lg select-none">
              🍖
            </div>
            <div className="flex flex-col">
              <h4 className="text-white text-xs font-black uppercase tracking-tight">Install MeatCity</h4>
              <p className="text-[10px] text-text-secondary mt-0.5">Add to Home Screen for instant access!</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleDismiss}
              className="px-2.5 py-1.5 text-text-secondary text-[10px] font-bold uppercase hover:text-white"
            >
              Later
            </button>
            <button 
              onClick={handleInstallClick}
              className="px-3.5 py-1.5 bg-gold text-black text-[10px] font-black uppercase rounded-[8px] active:scale-95 transition-all shadow-md"
            >
              Install
            </button>
          </div>
        </div>
      )}
      {!isAuthOrDeliveryRoute && <Header />}
      <main className="flex-1 w-full">
        {children}
      </main>
      {!isAuthOrDeliveryRoute && <BottomNav />}
    </div>
  );
}
