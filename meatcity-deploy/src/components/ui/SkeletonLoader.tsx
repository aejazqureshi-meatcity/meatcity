"use client";

import React from 'react';

export function SkeletonLoader({ type = 'card' }: { type?: 'card' | 'line' | 'text' }) {
  if (type === 'line') {
    return (
      <div className="h-4 bg-neutral-800 rounded animate-pulse w-full" />
    );
  }

  if (type === 'text') {
    return (
      <div className="flex flex-col gap-2 w-full">
        <div className="h-4 bg-neutral-800 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-neutral-800 rounded animate-pulse w-1/2" />
      </div>
    );
  }

  return (
    <div className="bg-[#111111] border border-white/5 rounded-[16px] overflow-hidden flex flex-col justify-between shadow-lg p-4 gap-3 w-full h-[260px] animate-pulse">
      <div className="w-full aspect-square bg-neutral-800 rounded-[12px]" />
      <div className="flex flex-col gap-2 flex-1 mt-2">
        <div className="h-4 bg-neutral-800 rounded w-2/3" />
        <div className="h-3 bg-neutral-800 rounded w-1/2" />
      </div>
      <div className="flex justify-between items-center mt-auto">
        <div className="h-5 bg-neutral-800 rounded w-1/4" />
        <div className="h-8 bg-neutral-800 rounded w-1/3" />
      </div>
    </div>
  );
}
