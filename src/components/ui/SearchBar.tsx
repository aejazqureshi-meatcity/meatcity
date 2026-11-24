"use client";

import React from 'react';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ 
  value, 
  onChange, 
  placeholder = 'Search chicken, mutton, eggs...', 
  className = '' 
}: SearchBarProps) {
  return (
    <div className={`relative flex items-center bg-surface border border-border rounded-[14px] px-3.5 py-2.5 shadow-sm transition-all duration-200 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10 ${className}`}>
      <svg 
        className="w-4 h-4 text-text-secondary mr-2.5 flex-shrink-0" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent border-none outline-none text-text-primary text-sm font-medium placeholder:text-text-secondary placeholder:font-normal"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="w-5 h-5 flex items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-text-secondary text-[11px] font-bold transition-colors ml-1"
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
}
