"use client";

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: React.ReactNode;
}

export function PrimaryButton({ loading, children, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`w-full py-3 px-4 bg-primary text-white font-semibold text-base rounded-[12px] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 ${className}`}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`w-full py-3 px-4 border border-gold text-gold bg-transparent font-semibold text-base rounded-[12px] transition-all duration-200 hover:bg-gold/10 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string | React.ReactNode;
}

export function IconButton({ icon, className = '', ...props }: IconButtonProps) {
  return (
    <button
      className={`p-2 bg-neutral-900/80 border border-white/10 rounded-[12px] text-white transition-all duration-200 active:scale-95 flex items-center justify-center ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
}
