"use client";

import React from 'react';

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  success?: boolean;
}

export function TextInput({ label, error, success, className = '', ...props }: TextInputProps) {
  const borderClass = error
    ? 'border-primary focus:border-primary focus:ring-1 focus:ring-primary'
    : success
    ? 'border-emerald-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
    : 'border-white/5 focus:border-gold/50 focus:ring-1 focus:ring-gold/50';

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      <label className="text-xs text-text-secondary font-bold uppercase tracking-wider">{label}</label>
      <input
        className={`w-full bg-[#1E2020] border rounded-[12px] px-4 py-3.5 text-white text-sm placeholder:text-text-secondary outline-none transition-all duration-200 disabled:opacity-50 ${borderClass}`}
        {...props}
      />
      {error && <span className="text-[11px] text-primary font-bold mt-0.5">{error}</span>}
      {!error && success && <span className="text-[11px] text-emerald-400 font-bold mt-0.5">Looking good!</span>}
    </div>
  );
}
