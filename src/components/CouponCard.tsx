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
    <div className="bg-surface border border-border rounded-[18px] p-4 flex items-center justify-between shadow-xs relative overflow-hidden my-1">
      {/* Decorative coupon punches */}
      <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-background border-r border-border" />
      <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-background border-l border-border" />

      <div className="flex gap-3.5 pl-2">
        {/* Left Side: Discount badge */}
        <div className="bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-[12px] flex flex-col items-center justify-center min-w-[65px] select-none">
          <span className="text-sm font-black tracking-tight leading-none">{discount}</span>
          <span className="text-[9px] font-black uppercase tracking-wider mt-1 text-primary">OFF</span>
        </div>

        {/* Middle: Info */}
        <div className="flex flex-col justify-center">
          <h4 className="text-text-primary font-black text-xs tracking-wide uppercase">{code}</h4>
          <p className="text-text-secondary text-[11px] font-medium leading-tight mt-1 max-w-[180px]">
            {description}
          </p>
        </div>
      </div>

      {/* Right Side: Copy/CTA button */}
      <button
        onClick={handleCopy}
        className={`px-3.5 py-2 text-xs font-black uppercase rounded-[10px] transition-all duration-200 min-w-[65px] ${
          copied 
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
            : 'bg-primary hover:bg-[#B80000] text-white active:scale-95 shadow-xs'
        }`}
      >
        {copied ? 'Copied' : 'Apply'}
      </button>
    </div>
  );
}
