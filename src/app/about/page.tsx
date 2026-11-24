"use client";

import Link from 'next/link';

export default function AboutUsPage() {
  return (
    <div className="flex flex-col bg-background min-h-screen text-text-primary font-primary pb-16">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-border px-4 py-3.5 flex items-center gap-3">
        <Link 
          href="/" 
          className="w-10 h-10 rounded-full flex items-center justify-center bg-surface border border-border text-lg text-text-primary active:scale-95 transition-all shadow-xs"
        >
          ←
        </Link>
        <div className="flex flex-col">
          <span className="text-text-primary text-sm font-black tracking-tight leading-none uppercase">About Us</span>
          <span className="text-[10px] text-text-secondary uppercase font-bold tracking-widest mt-1">
            MeatCity Navi Mumbai
          </span>
        </div>
      </div>

      <div className="px-4 py-6 flex flex-col gap-6 max-w-[480px] mx-auto w-full">
        {/* Brand Banner */}
        <div className="bg-surface border border-border rounded-[24px] p-6 text-center flex flex-col items-center gap-3 relative overflow-hidden shadow-xs">
          <div className="w-16 h-16 flex items-center justify-center">
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

          <div className="h-8 flex items-center justify-center">
            <img
              src="/images/brand/meatcity-wordmark.png"
              alt="MeatCity"
              className="h-full object-contain dark:hidden"
            />
            <img
              src="/images/brand/meatcity-wordmark-dark.png"
              alt="MeatCity"
              className="h-full object-contain hidden dark:block"
            />
          </div>

          <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em]">
            MEAT THAT MATTERS.
          </p>

          <div className="w-16 h-[2px] bg-primary/40 rounded-full my-0.5" />

          <p className="text-text-secondary text-xs leading-relaxed max-w-[320px]">
            “MeatCity is committed to delivering farm-fresh, 100% Halal, and hygienically cut meat products directly to homes and restaurants. Freshness you can trust, cuts that matter.”
          </p>
        </div>

        {/* FSSAI Certified Section */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[20px] p-4 flex gap-4 items-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-2xl flex-shrink-0">
            🛡️
          </div>
          <div className="flex flex-col">
            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-xs uppercase tracking-wide">
              FSSAI Certified Outlet
            </span>
            <span className="text-text-primary text-sm font-black mt-0.5">Reg No. 21525016001365</span>
            <span className="text-[10px] text-text-secondary font-bold mt-0.5">License Valid Till: 12-11-2026</span>
          </div>
        </div>

        {/* Quality Assured Section */}
        <div className="bg-surface border border-border rounded-[20px] p-5 flex flex-col gap-4 shadow-xs">
          <h3 className="text-text-primary text-xs font-black uppercase tracking-wide border-b border-border pb-2">
            🤝 Our Trust Commitments
          </h3>
          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-neutral-50 dark:bg-neutral-900/50 p-3.5 rounded-[14px] flex flex-col gap-1 border border-border">
              <span className="text-lg">⭐</span>
              <strong className="text-text-primary text-xs font-black">Quality Assured</strong>
              <span className="text-[10px] text-text-secondary leading-snug">Strict grading for tenderness</span>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-900/50 p-3.5 rounded-[14px] flex flex-col gap-1 border border-border">
              <span className="text-lg">🧼</span>
              <strong className="text-text-primary text-xs font-black">Hygienic Processing</strong>
              <span className="text-[10px] text-text-secondary leading-snug">Clean tools & sanitized station</span>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-900/50 p-3.5 rounded-[14px] flex flex-col gap-1 border border-border">
              <span className="text-lg">❄️</span>
              <strong className="text-text-primary text-xs font-black">Fresh Daily</strong>
              <span className="text-[10px] text-text-secondary leading-snug">Cut fresh every single morning</span>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-900/50 p-3.5 rounded-[14px] flex flex-col gap-1 border border-border">
              <span className="text-lg">📦</span>
              <strong className="text-text-primary text-xs font-black">Safe Packaging</strong>
              <span className="text-[10px] text-text-secondary leading-snug">Sealed & temperature stable</span>
            </div>
          </div>
        </div>

        {/* Outlet Details */}
        <div className="bg-surface border border-border rounded-[20px] p-5 flex flex-col gap-4 shadow-xs">
          <h3 className="text-text-primary text-xs font-black uppercase tracking-wide border-b border-border pb-2">
            📍 Shop Information
          </h3>

          <div className="flex flex-col gap-3.5 text-xs">
            <div>
              <span className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold block">Owner</span>
              <strong className="text-text-primary text-sm font-black block mt-0.5">Aejaz Qureshi</strong>
            </div>
            <div>
              <span className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold block">Shop Address</span>
              <span className="text-text-primary leading-relaxed font-semibold block mt-0.5">
                A/2 Room No.126, Shop No.2,<br />
                Sector 20, Turbhe,<br />
                Navi Mumbai - 400705
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Action Buttons */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <a 
              href="tel:7977630912"
              className="py-3.5 bg-primary hover:bg-[#B80000] text-white font-black text-xs uppercase tracking-wider rounded-[14px] shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all text-center"
            >
              📞 Call Owner
            </a>
            <a 
              href="https://wa.me/917977630912?text=Hi%20MeatCity,%20I%20have%20an%20inquiry%20about%20your%20products."
              target="_blank"
              rel="noopener noreferrer"
              className="py-3.5 bg-[#25D366] hover:bg-green-600 text-white font-black text-xs uppercase tracking-wider rounded-[14px] shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all text-center"
            >
              💬 WhatsApp Us
            </a>
          </div>

          <a 
            href="https://maps.google.com/?q=Sector+20,+Turbhe,+Navi+Mumbai+-+400705"
            target="_blank"
            rel="noopener noreferrer"
            className="py-3.5 bg-surface border border-border hover:border-primary/40 text-text-primary font-black text-xs uppercase tracking-wider rounded-[14px] shadow-xs flex items-center justify-center gap-2 active:scale-95 transition-all text-center"
          >
            🗺️ Open in Google Maps
          </a>
        </div>
      </div>
    </div>
  );
}
