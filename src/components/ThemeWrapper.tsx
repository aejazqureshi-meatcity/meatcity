"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { ThemeProvider } from "@/context/ThemeContext";

function ThemeWrapperInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).pwaDeferredPrompt = e;
      window.dispatchEvent(new Event('pwa-prompt-available'));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);
  
  const isAdminRoute = pathname?.startsWith('/admin') || pathname?.startsWith('/admin-dev');
  const isAuthOrDeliveryRoute = 
    pathname?.startsWith('/login') || 
    pathname?.startsWith('/register') || 
    pathname?.startsWith('/pending') || 
    pathname?.startsWith('/delivery') ||
    pathname?.startsWith('/cart') ||
    pathname?.startsWith('/invoice');

  if (isAdminRoute) {
    return (
      <div className="bg-[#050505] min-h-screen w-full text-white">
        {children}
      </div>
    );
  }

  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] pb-[80px] relative flex flex-col transition-colors duration-200">
      {!isAuthOrDeliveryRoute && <Header />}
      <main className="flex-1 w-full">
        {children}
      </main>
      {!isAuthOrDeliveryRoute && <BottomNav />}
    </div>
  );
}

export default function ThemeWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ThemeWrapperInner>{children}</ThemeWrapperInner>
    </ThemeProvider>
  );
}
