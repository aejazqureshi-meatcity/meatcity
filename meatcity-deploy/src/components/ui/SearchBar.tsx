"use client";

import React from 'react';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Search...', className = '' }: SearchBarProps) {
  return (
    <div className={`relative flex items-center bg-[#1E2020] border border-white/5 rounded-[12px] px-3 py-3.5 transition-all duration-200 focus-within:border-gold/50 ${className}`}>
      <span className="text-text-secondary text-base mr-2 flex items-center justify-center">🔍</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent border-none outline-none text-white text-sm placeholder:text-text-secondary"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 w-5 h-5 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold"
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
}
