"use client";

import React from 'react';

export default function LocationBar() {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 border-b border-white/5">
      <span className="text-sm select-none">📍</span>
      <div className="flex flex-col">
        <span className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold leading-none">Delivering to</span>
        <span className="text-white text-xs font-bold leading-normal mt-0.5">Turbhe, Sector 20, Navi Mumbai</span>
      </div>
    </div>
  );
}
