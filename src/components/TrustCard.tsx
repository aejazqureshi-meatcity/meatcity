"use client";

import React from 'react';

export default function TrustCard() {
  const points = [
    { icon: '⭐', title: 'Quality Assured', desc: 'Premium hand-picked cuts' },
    { icon: '🧼', title: 'Hygienic Processed', desc: 'Sanitized facility & tools' },
    { icon: '❄️', title: 'Fresh Daily', desc: 'Procured fresh every morning' },
    { icon: '📦', title: 'Safe Packaging', desc: 'Leak-proof, temperature sealed' }
  ];

  return (
    <div className="flex flex-col gap-4 mt-6">
      {/* FSSAI certified badge banner */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[18px] p-4 flex gap-4 items-center">
        <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-lg flex-shrink-0">
          🛡️
        </div>
        <div className="flex flex-col text-left">
          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider">
            FSSAI Certified Safety
          </span>
          <span className="text-text-primary text-xs font-black mt-0.5">
            Registration: 21525016001365
          </span>
        </div>
      </div>

      {/* Trust Items Grid */}
      <div className="grid grid-cols-2 gap-3">
        {points.map((pt, idx) => (
          <div 
            key={idx} 
            className="bg-surface border border-border rounded-[16px] p-3.5 flex flex-col gap-1 text-left shadow-xs"
          >
            <span className="text-lg select-none">{pt.icon}</span>
            <h5 className="text-text-primary text-xs font-black tracking-tight leading-none mt-1">
              {pt.title}
            </h5>
            <p className="text-[11px] text-text-secondary font-medium leading-relaxed mt-1">
              {pt.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
