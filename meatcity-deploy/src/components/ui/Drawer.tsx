"use client";

import React, { useEffect } from 'react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Drawer({ isOpen, onClose, title, children }: DrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <div className={`fixed inset-0 z-[9990] transition-visibility duration-300 ${isOpen ? 'visible' : 'invisible'}`}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className={`absolute top-0 left-0 bottom-0 w-4/5 max-w-[320px] bg-[#111111] border-r border-white/5 p-6 flex flex-col gap-6 shadow-2xl transition-transform duration-300 ease-out z-10 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex justify-between items-center pb-3 border-b border-white/5">
          <h3 className="text-white text-base font-extrabold tracking-tight">{title || 'Navigation'}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/5 text-text-secondary hover:text-white transition-colors duration-200"
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto text-white">
          {children}
        </div>
      </div>
    </div>
  );
}
