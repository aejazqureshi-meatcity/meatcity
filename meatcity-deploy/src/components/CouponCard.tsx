"use client";

import React, { useState } from 'react';

interface CouponCardProps {
  code: string;
  discount: string;
  description: string;
}

export default function CouponCard({ code, discount, description }: CouponCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#111111] border border-white/5 rounded-[16px] p-4 flex items-center justify-between shadow-md relative overflow-hidden">
      {/* Decorative side dashes/indentations typical of coupons */}
      <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-black border-r border-white/5" />
      <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-black border-l border-white/5" />

      <div className="flex gap-3.5 pl-2">
        {/* Left Side: Discount badge */}
        <div className="bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-[12px] flex flex-col items-center justify-center min-w-[70px] select-none">
          <span className="text-sm font-black tracking-tight leading-none">{discount}</span>
          <span className="text-[9px] font-bold uppercase tracking-wider mt-1 text-red-400">OFF</span>
        </div>

        {/* Middle: Info */}
        <div className="flex flex-col justify-center">
          <h4 className="text-white font-extrabold text-xs tracking-wide uppercase">{code}</h4>
          <p className="text-text-secondary text-[11px] font-medium leading-tight mt-1 max-w-[180px]">
            {description}
          </p>
        </div>
      </div>

      {/* Right Side: Copy/CTA button */}
      <button
        onClick={handleCopy}
        className={`px-3 py-2 text-xs font-black rounded-[10px] transition-all duration-200 min-w-[65px] ${
          copied 
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
            : 'bg-gold hover:bg-yellow-600 text-black active:scale-95'
        }`}
      >
        {copied ? 'Copied' : 'Apply'}
      </button>
    </div>
  );
}
