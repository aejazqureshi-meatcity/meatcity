"use client";

import React from 'react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  accentColor?: 'red' | 'gold' | 'green';
  onClick?: () => void;
  className?: string;
}

export function DashboardCard({ title, value, subtitle, accentColor = 'gold', onClick, className = '' }: DashboardCardProps) {
  const accentClasses = {
    red: 'border-l-primary',
    gold: 'border-l-gold',
    green: 'border-l-emerald-500'
  };

  return (
    <div
      onClick={onClick}
      className={`p-5 bg-neutral-900 border border-white/5 border-l-4 ${accentClasses[accentColor]} rounded-[16px] shadow-lg flex flex-col justify-between transition-all duration-200 ${onClick ? 'cursor-pointer active:scale-[0.99] hover:border-white/10' : ''} ${className}`}
    >
      <div>
        <h4 className="text-text-secondary text-xs font-semibold uppercase tracking-wider">{title}</h4>
        <div className="text-white text-2xl font-extrabold mt-1 tracking-tight">{value}</div>
      </div>
      {subtitle && <p className="text-text-secondary text-xs mt-2 font-medium">{subtitle}</p>}
    </div>
  );
}

interface OrderCardProps {
  orderId: string;
  date: string;
  status: string;
  total: number;
  items?: string;
  deliveryOtp?: string;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

export function OrderCard({ orderId, date, status, total, items, deliveryOtp, onAction, actionLabel, className = '' }: OrderCardProps) {
  const getStatusStyle = (s: string) => {
    const norm = s.toLowerCase();
    if (norm === 'delivered') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (norm === 'cancelled' || norm === 'rejected') return 'bg-primary/10 text-primary border-primary/20';
    return 'bg-gold/10 text-gold border-gold/20'; // pending, shipping, assigned, active
  };

  return (
    <div className={`p-4 bg-neutral-900 border border-white/5 rounded-[16px] shadow-md flex flex-col gap-3 transition-all duration-200 ${className}`}>
      <div className="flex justify-between items-start">
        <div>
          <span className="text-xs text-text-secondary font-medium">{new Date(date).toLocaleDateString()}</span>
          <h4 className="text-white font-extrabold text-sm mt-0.5">Order #{orderId}</h4>
        </div>
        <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${getStatusStyle(status)}`}>
          {status}
        </span>
      </div>

      {items && <p className="text-text-secondary text-xs line-clamp-2 leading-relaxed">{items}</p>}

      <div className="border-t border-white/5 pt-3 flex justify-between items-center">
        <div>
          <span className="text-[10px] text-text-secondary uppercase tracking-wider block font-bold">Total Amount</span>
          <span className="text-white text-base font-extrabold">₹{total}</span>
        </div>
        
        {deliveryOtp && status.toLowerCase() !== 'delivered' && status.toLowerCase() !== 'cancelled' && (
          <div className="bg-gold/15 border border-gold/30 px-3 py-1.5 rounded-[8px] flex flex-col items-center">
            <span className="text-[9px] text-gold uppercase tracking-wider font-extrabold">Delivery OTP</span>
            <span className="text-white text-xs font-black tracking-widest mt-0.5">{deliveryOtp}</span>
          </div>
        )}
      </div>

      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className="w-full mt-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-[8px] transition-all duration-200 active:scale-[0.98]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
