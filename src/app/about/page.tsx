"use client";

import Link from 'next/link';

export default function AboutUsPage() {
  return (
    <div className="flex flex-col bg-black min-h-screen text-white font-primary pb-8">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#050505]/90 backdrop-blur-md border-b border-white/5 px-4 py-3.5 flex items-center gap-3">
        <Link 
          href="/" 
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/5 text-lg text-white active:scale-95 transition-all"
        >
          ←
        </Link>
        <div className="flex flex-col">
          <span className="text-white text-sm font-extrabold tracking-tight leading-none uppercase">About Us</span>
          <span className="text-[9px] text-text-secondary uppercase font-bold tracking-widest mt-1">
            MeatCity Navi Mumbai
          </span>
        </div>
      </div>

      <div className="px-4 py-6 flex flex-col gap-6 max-w-[480px] mx-auto">
        {/* Brand Banner */}
        <div className="bg-neutral-900 border border-white/5 rounded-[24px] p-6 text-center flex flex-col items-center gap-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>

          <h1 className="text-3xl font-black tracking-tighter text-white uppercase">
            MEAT<span className="text-gold">CITY</span>
          </h1>
          <p className="text-gold text-[10px] font-black uppercase tracking-[0.2em]">
            MEAT THAT MATTERS
          </p>

          <div className="w-16 h-[2px] bg-primary/40 rounded-full my-1"></div>

          <p className="text-text-secondary text-xs leading-relaxed max-w-[320px] mt-1.5">
            “MeatCity is committed to delivering fresh, hygienic and premium quality meat products directly to homes and businesses. We focus on quality, freshness and customer satisfaction.”
          </p>
        </div>

        {/* FSSAI Certified Section */}
        <div className="bg-gradient-to-r from-emerald-950/20 to-emerald-900/10 border border-emerald-500/20 rounded-[20px] p-4 flex gap-4 items-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl">
            🛡️
          </div>
          <div className="flex flex-col">
            <span className="text-emerald-400 font-extrabold text-xs uppercase tracking-wide">FSSAI Certified Outlet</span>
            <span className="text-white text-sm font-black mt-0.5">Reg No. 21525016001365</span>
            <span className="text-[9.5px] text-emerald-400/80 font-bold mt-0.5">License Valid Till: 12-11-2026</span>
          </div>
        </div>

        {/* Quality Assured Section */}
        <div className="bg-neutral-900 border border-white/5 rounded-[20px] p-5 flex flex-col gap-4">
          <h3 className="text-white text-xs font-extrabold uppercase tracking-wide border-b border-white/5 pb-2">
            🤝 Our Trust Commitments
          </h3>
          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-white/5 p-3 rounded-[12px] flex flex-col gap-1 border border-white/5">
              <span className="text-lg">⭐</span>
              <strong className="text-white text-xs font-black">Quality Assured</strong>
              <span className="text-[10px] text-text-secondary">Strict grading for optimal tenderness</span>
            </div>
            <div className="bg-white/5 p-3 rounded-[12px] flex flex-col gap-1 border border-white/5">
              <span className="text-lg">🧼</span>
              <strong className="text-white text-xs font-black">Hygienic Processing</strong>
              <span className="text-[10px] text-text-secondary">Clean environment & sanitized tools</span>
            </div>
            <div className="bg-white/5 p-3 rounded-[12px] flex flex-col gap-1 border border-white/5">
              <span className="text-lg">❄️</span>
              <strong className="text-white text-xs font-black">Fresh Daily</strong>
              <span className="text-[10px] text-text-secondary">Procured and cut fresh every morning</span>
            </div>
            <div className="bg-white/5 p-3 rounded-[12px] flex flex-col gap-1 border border-white/5">
              <span className="text-lg">📦</span>
              <strong className="text-white text-xs font-black">Safe Packaging</strong>
              <span className="text-[10px] text-text-secondary">Sealed, leak-proof & temperature stable</span>
            </div>
          </div>
        </div>

        {/* Outlet Details */}
        <div className="bg-neutral-900 border border-white/5 rounded-[20px] p-5 flex flex-col gap-4">
          <h3 className="text-white text-xs font-extrabold uppercase tracking-wide border-b border-white/5 pb-2">
            📍 Shop Information
          </h3>

          <div className="flex flex-col gap-3.5 text-xs">
            <div>
              <span className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold block">Owner</span>
              <strong className="text-white text-sm font-bold block mt-0.5">Aejaz Qureshi</strong>
            </div>
            <div>
              <span className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold block">Shop Address</span>
              <span className="text-white leading-relaxed font-semibold block mt-0.5">
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
              className="py-4 bg-gold hover:bg-yellow-600 text-black font-extrabold text-xs uppercase tracking-wider rounded-[14px] shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all text-center"
            >
              📞 Call Owner
            </a>
            <a 
              href="https://wa.me/917977630912?text=Hi%20MeatCity,%2520I%20have%20an%20inquiry%20about%20your%20products."
              target="_blank"
              rel="noopener noreferrer"
              className="py-4 bg-[#25D366] hover:bg-green-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-[14px] shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all text-center"
            >
              💬 WhatsApp Us
            </a>
          </div>

          <a 
            href="https://maps.google.com/?q=Sector+20,+Turbhe,+Navi+Mumbai+-+400705"
            target="_blank"
            rel="noopener noreferrer"
            className="py-4 bg-neutral-900 border border-white/5 hover:border-white/10 text-white font-extrabold text-xs uppercase tracking-wider rounded-[14px] shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all text-center"
          >
            🗺️ Open in Google Maps
          </a>
        </div>
      </div>
    </div>
  );
}
