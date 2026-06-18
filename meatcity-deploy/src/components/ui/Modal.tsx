"use client";

import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal Content Card */}
      <div className="relative w-full max-w-[420px] bg-[#111111] border border-white/10 rounded-[16px] p-6 shadow-2xl z-10 transform transition-all duration-300 animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-4">
          <h3 className="text-white text-base font-extrabold tracking-tight">{title}</h3>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/5 text-text-secondary hover:text-white transition-colors duration-200"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        
        <div className="text-white">
          {children}
        </div>
      </div>
    </div>
  );
}
