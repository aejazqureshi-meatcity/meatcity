"use client";

import React from 'react';

export default function TrustCard() {
  const points = [
    { icon: '🟢', title: '100% Halal', desc: 'Sourced under strict guidelines' },
    { icon: '❄️', title: 'Cold Chain', desc: 'Temperature-controlled transit' },
    { icon: '🛵', title: 'Express Delivery', desc: 'Delivered super fresh in 45m' }
  ];

  return (
    <div className="grid grid-cols-3 gap-3 bg-[#111111] border border-white/5 rounded-[16px] p-4 shadow-md mt-6">
      {points.map((pt, idx) => (
        <div key={idx} className="flex flex-col items-center text-center gap-1">
          <span className="text-xl select-none">{pt.icon}</span>
          <h5 className="text-white text-[11px] font-black tracking-tight leading-none mt-1">{pt.title}</h5>
          <p className="text-[9px] text-text-secondary font-medium leading-tight max-w-[90px] mt-0.5">{pt.desc}</p>
        </div>
      ))}
    </div>
  );
}
