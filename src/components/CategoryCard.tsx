"use client";

import React from 'react';

interface CategoryCardProps {
  name: string;
  isActive: boolean;
  onClick: () => void;
}

export default function CategoryCard({ name, isActive, onClick }: CategoryCardProps) {
  const getEmoji = (cat: string) => {
    const norm = cat.toLowerCase();
    if (norm.includes('chicken')) return '🍗';
    if (norm.includes('mutton')) return '🍖';
    if (norm.includes('seafood') || norm.includes('fish')) return '🐟';
    if (norm.includes('egg')) return '🥚';
    if (norm.includes('ready')) return '🍢';
    return '🥩';
  };

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-[16px] min-w-[76px] transition-all duration-200 active:scale-95 border ${
        isActive 
          ? 'bg-gold/10 border-gold shadow-lg shadow-gold/5' 
          : 'bg-[#111111] border-white/5 hover:border-white/10'
      }`}
    >
      <span className="text-2xl select-none">{getEmoji(name)}</span>
      <span className={`text-[10px] font-extrabold tracking-tight truncate max-w-[68px] ${
        isActive ? 'text-gold' : 'text-text-secondary'
      }`}>
        {name}
      </span>
    </button>
  );
}
