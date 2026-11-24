"use client";

import React, { useEffect, useState } from 'react';

interface LoyaltyOverviewData {
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  activeLiabilityRupees: number;
  activeMembers: number;
  completedStampCards: number;
  referralRevenue: number;
  tierBreakdown: {
    silver: number;
    gold: number;
    platinum: number;
  };
}

export default function LoyaltyOverview({ onNavigateTab }: { onNavigateTab: (tab: string) => void }) {
  const [data, setData] = useState<LoyaltyOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/loyalty/admin/overview');
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to load overview data');
      }
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-text-secondary text-sm">
        <div className="animate-spin text-2xl mb-2">👑</div>
        Loading Loyalty Dashboard Overview...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-4 text-red-400 text-xs flex justify-between items-center">
        <span>Failed to load overview: {error || 'Unknown error'}</span>
        <button onClick={fetchOverview} className="px-3 py-1 bg-red-600/30 hover:bg-red-600/50 rounded text-white font-bold">
          Retry
        </button>
      </div>
    );
  }

  const totalMembers = (data.tierBreakdown.silver || 0) + (data.tierBreakdown.gold || 0) + (data.tierBreakdown.platinum || 0) || 1;
  const silverPct = Math.round(((data.tierBreakdown.silver || 0) / totalMembers) * 100);
  const goldPct = Math.round(((data.tierBreakdown.gold || 0) / totalMembers) * 100);
  const platPct = Math.round(((data.tierBreakdown.platinum || 0) / totalMembers) * 100);

  return (
    <div className="space-y-6">
      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-neutral-900 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Points Issued</span>
            <span>🪙</span>
          </div>
          <div className="text-xl font-black text-white mt-2">
            {data.totalPointsIssued.toLocaleString()}
          </div>
          <span className="text-[10px] text-emerald-400 font-bold mt-1">Lifetime earned</span>
        </div>

        <div className="bg-neutral-900 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Points Redeemed</span>
            <span>🎁</span>
          </div>
          <div className="text-xl font-black text-white mt-2">
            {data.totalPointsRedeemed.toLocaleString()}
          </div>
          <span className="text-[10px] text-text-secondary mt-1">Claimed discounts</span>
        </div>

        <div className="bg-neutral-900 border border-amber-500/20 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Points Liability</span>
            <span>⚖️</span>
          </div>
          <div className="text-xl font-black text-gold mt-2">
            ₹{data.activeLiabilityRupees.toLocaleString()}
          </div>
          <span className="text-[10px] text-gold/80 font-bold mt-1">Outstanding cash value</span>
        </div>

        <div className="bg-neutral-900 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Active Members</span>
            <span>👥</span>
          </div>
          <div className="text-xl font-black text-white mt-2">
            {data.activeMembers}
          </div>
          <span className="text-[10px] text-text-secondary mt-1">Enrolled accounts</span>
        </div>

        <div className="bg-neutral-900 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Stamp Cards Won</span>
            <span>🎫</span>
          </div>
          <div className="text-xl font-black text-white mt-2">
            {data.completedStampCards}
          </div>
          <span className="text-[10px] text-emerald-400 font-bold mt-1">10-stamp unlocks</span>
        </div>

        <div className="bg-neutral-900 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Referral Sales</span>
            <span>🚀</span>
          </div>
          <div className="text-xl font-black text-emerald-400 mt-2">
            ₹{data.referralRevenue.toLocaleString()}
          </div>
          <span className="text-[10px] text-text-secondary mt-1">From invited friends</span>
        </div>
      </div>

      {/* Tier Distribution & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tier Distribution Card */}
        <div className="lg:col-span-2 bg-neutral-900 border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex justify-between items-center pb-3 border-b border-white/5">
            <div>
              <h3 className="text-white text-sm font-black uppercase tracking-wide">🏆 Tier Membership Distribution</h3>
              <p className="text-[11px] text-text-secondary mt-0.5">Active customer progression across Silver, Gold and Platinum tiers</p>
            </div>
            <button
              onClick={() => onNavigateTab('customers')}
              className="text-gold text-xs font-bold hover:underline"
            >
              View Customers →
            </button>
          </div>

          <div className="space-y-4 pt-1">
            {/* Silver Tier */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-300 font-bold flex items-center gap-1.5">
                  <span>🥈</span> Silver Tier (1.0x Points)
                </span>
                <span className="text-white font-black">{data.tierBreakdown.silver} members ({silverPct}%)</span>
              </div>
              <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden">
                <div className="bg-gray-400 h-full rounded-full transition-all" style={{ width: `${silverPct}%` }} />
              </div>
            </div>

            {/* Gold Tier */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-amber-400 font-bold flex items-center gap-1.5">
                  <span>🥇</span> Gold Tier (1.25x Points + ₹5k Spend)
                </span>
                <span className="text-white font-black">{data.tierBreakdown.gold} members ({goldPct}%)</span>
              </div>
              <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden">
                <div className="bg-amber-400 h-full rounded-full transition-all" style={{ width: `${goldPct}%` }} />
              </div>
            </div>

            {/* Platinum Tier */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-purple-400 font-bold flex items-center gap-1.5">
                  <span>💎</span> Platinum VIP (1.5x Points + ₹15k Spend)
                </span>
                <span className="text-white font-black">{data.tierBreakdown.platinum} members ({platPct}%)</span>
              </div>
              <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-indigo-400 h-full rounded-full transition-all" style={{ width: `${platPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Program Status Card */}
        <div className="bg-gradient-to-br from-neutral-900 to-amber-950/20 border border-amber-500/20 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-gold font-black">⚙️ Program Controls</span>
            <h4 className="text-white font-extrabold text-sm mt-1">Loyalty Rules & Rewards</h4>
            <p className="text-text-secondary text-xs mt-2 leading-relaxed">
              Configure points earn rates, point-to-rupee valuation, stamp thresholds, and toggle master program activation.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 mt-5">
            <button
              onClick={() => onNavigateTab('settings')}
              className="w-full py-2.5 bg-gold text-black font-black text-xs uppercase tracking-wider rounded-xl hover:bg-yellow-400 active:scale-95 transition-all text-center"
            >
              Configure Loyalty Settings
            </button>
            <button
              onClick={() => onNavigateTab('rewards')}
              className="w-full py-2.5 bg-neutral-800 border border-white/10 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-neutral-750 active:scale-95 transition-all text-center"
            >
              Manage Reward Catalog
            </button>
            <button
              onClick={() => onNavigateTab('reports')}
              className="w-full py-2.5 bg-neutral-800 border border-white/10 text-text-secondary font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-neutral-750 active:scale-95 transition-all text-center"
            >
              Retention & CLV Analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
