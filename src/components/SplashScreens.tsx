"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTheme } from '@/context/ThemeContext';

interface SplashScreensProps {
  onComplete: () => void;
  forceShow?: boolean;
}

export default function SplashScreens({ onComplete, forceShow = false }: SplashScreensProps) {
  const { resolvedTheme } = useTheme();
  const [phase, setPhase] = useState<number>(0); // 0: walking in, 1: logo reveal, 2: tagline, 3: transition out
  const [isDismissing, setIsDismissing] = useState(false);

  useEffect(() => {
    // Check if splash was already shown this session
    if (!forceShow) {
      const shown = typeof window !== 'undefined' ? sessionStorage.getItem('meatcity_splash_shown') : null;
      if (shown) {
        onComplete();
        return;
      }
    }

    // Check reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      sessionStorage.setItem('meatcity_splash_shown', 'true');
      onComplete();
      return;
    }

    // Animation timeline (max 2300ms total)
    // 0ms -> Phase 0: stepping in from left
    const t1 = setTimeout(() => setPhase(1), 600);   // 600ms -> Phase 1: Logo reveal & center
    const t2 = setTimeout(() => setPhase(2), 1300);  // 1300ms -> Phase 2: Tagline fade in
    const t3 = setTimeout(() => {
      setPhase(3);
      setIsDismissing(true);
    }, 1900); // 1900ms -> Phase 3: Smooth exit transition
    const t4 = setTimeout(() => {
      sessionStorage.setItem('meatcity_splash_shown', 'true');
      onComplete();
    }, 2300); // 2300ms -> Complete

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete, forceShow]);

  const handleSkip = () => {
    sessionStorage.setItem('meatcity_splash_shown', 'true');
    setIsDismissing(true);
    setTimeout(onComplete, 150);
  };

  const isDark = resolvedTheme === 'dark';

  return (
    <div
      role="dialog"
      aria-label="Welcome to MeatCity"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-between p-6 select-none transition-opacity duration-300 ${
        isDismissing ? 'opacity-0 pointer-events-none' : 'opacity-100'
      } ${
        isDark 
          ? 'bg-[#0B0B0B] text-white' 
          : 'bg-[#FDFDFD] text-[#111111]'
      }`}
    >
      {/* Ambient background glow */}
      <div 
        className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${
          isDark 
            ? 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#D60000]/15 via-transparent to-transparent' 
            : 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#D60000]/5 via-transparent to-transparent'
        }`} 
      />

      {/* Top Bar with Skip */}
      <div className="w-full flex justify-end items-center relative z-10 pt-2">
        <button
          onClick={handleSkip}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 border ${
            isDark
              ? 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border-white/10'
              : 'bg-black/5 hover:bg-black/10 text-gray-500 hover:text-black border-black/5'
          }`}
        >
          Skip ✕
        </button>
      </div>

      {/* Center Animation Stage */}
      <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10 w-full max-w-sm">
        {/* Chicken Character / Primary Logo */}
        <div className="relative flex items-center justify-center">
          {/* Subtle Golden halo / contrast backing in dark mode so black chicken body pops */}
          {isDark && (
            <div className="absolute w-44 h-44 rounded-full bg-gradient-to-tr from-[#D4AF37]/20 via-[#D60000]/15 to-transparent blur-2xl animate-pulse pointer-events-none" />
          )}

          <div
            className={`transition-all duration-700 ease-out transform ${
              phase === 0
                ? '-translate-x-12 opacity-80 scale-95 rotate-[-3deg]'
                : phase === 1
                ? 'translate-x-0 opacity-100 scale-100 rotate-0'
                : 'translate-x-0 opacity-100 scale-105'
            }`}
          >
            {/* Logo container with dark-mode contrast border/badge if in dark mode */}
            <div className={`p-4 rounded-3xl transition-colors ${
              isDark 
                ? 'bg-[#141414] border border-white/10 shadow-2xl shadow-black/80' 
                : 'bg-white shadow-xl shadow-red-500/5 border border-black/5'
            }`}>
              <Image
                src="/images/brand/meatcity-primary.png"
                alt="MeatCity Primary Logo"
                width={150}
                height={200}
                priority
                className="w-auto h-36 object-contain"
              />
            </div>
          </div>
        </div>

        {/* Brand Name Typography Reveal (600ms+) */}
        <div className={`mt-6 transition-all duration-500 ${
          phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
        }`}>
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-2xl font-black tracking-tight text-[#111111] dark:text-white">
              MEAT
            </span>
            <span className="text-2xl font-black tracking-tight text-[#D60000]">
              CITY
            </span>
          </div>
        </div>

        {/* Tagline Reveal (1300ms+) */}
        <div className={`mt-2 transition-all duration-500 ${
          phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}>
          <div className="flex items-center justify-center gap-2">
            <span className="h-[1px] w-6 bg-[#D4AF37]/40" />
            <p className="text-[#D4AF37] text-xs font-black tracking-[0.2em] uppercase">
              Meat that matters
            </p>
            <span className="h-[1px] w-6 bg-[#D4AF37]/40" />
          </div>

          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              ✓ 100% Halal Assured
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20">
              Navi Mumbai
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Progress Bar Indicator */}
      <div className="w-full max-w-[180px] h-1 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden relative z-10 mb-2">
        <div 
          className="h-full bg-gradient-to-r from-[#D60000] to-[#D4AF37] transition-all duration-500 ease-out"
          style={{ width: `${((phase + 1) / 4) * 100}%` }}
        />
      </div>
    </div>
  );
}
