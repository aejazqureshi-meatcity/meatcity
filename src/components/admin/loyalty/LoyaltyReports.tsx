"use client";

import React, { useEffect, useState } from 'react';

interface LoyaltyReportsData {
  repeatOrderRate: number;
  avgOrderFrequencyDays: number;
  totalLiabilityRupees: number;
  clvByTier: {
    silver: number;
    gold: number;
    platinum: number;
  };
  retentionSummary: {
    oneOrder: number;
    twoToThreeOrders: number;
    fourPlusOrders: number;
  };
}

export default function LoyaltyReports() {
  const [data, setData] = useState<LoyaltyReportsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/loyalty/admin/reports');
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to fetch reports');
      }
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleExportCSV = async () => {
    try {
      // Fetch customer list
      const res = await fetch('/api/loyalty/admin/customers');
      const json = await res.json();
      const customers = json.customers || [];

      if (customers.length === 0) {
        alert('No loyalty data to export.');
        return;
      }

      // Convert to CSV
      const headers = ['User ID', 'Customer Name', 'Phone', 'Tier', 'Points Balance', 'Lifetime Points', 'Lifetime Spend (INR)', 'Orders Count', 'Referral Code'];
      const rows = customers.map((c: any) => [
        `"${c.user_id}"`,
        `"${c.name || 'N/A'}"`,
        `"${c.phone || ''}"`,
        `"${c.tier_id}"`,
        c.points_balance,
        c.lifetime_points_earned,
        c.lifetime_spend,
        c.total_orders_completed,
        `"${c.referral_code}"`
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any[]) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `meatcity_loyalty_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert('Failed to generate export: ' + err.message);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-text-secondary text-xs">Loading analytics reports...</div>;
  }

  if (error || !data) {
    return <div className="p-6 text-center text-red-400 text-xs">{error || 'Failed to load reports.'}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Export Button */}
      <div className="flex justify-between items-center bg-neutral-900 border border-white/5 rounded-2xl p-4">
        <div>
          <h3 className="text-white text-sm font-black uppercase tracking-wide">📊 Loyalty Retention & CLV Reports</h3>
          <p className="text-[11px] text-text-secondary mt-0.5">
            Key customer lifetime value metrics and points liability overview
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-white font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-all flex items-center gap-1.5 border border-white/10"
        >
          <span>📥</span> Export Loyalty CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-neutral-900 border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
          <span className="text-xs text-text-secondary font-bold uppercase tracking-wider">🔁 Repeat Purchase Rate</span>
          <div className="text-2xl font-black text-white mt-2">
            {data.repeatOrderRate}%
          </div>
          <span className="text-[10px] text-emerald-400 font-bold mt-1">Customers with 2+ completed orders</span>
        </div>

        <div className="bg-neutral-900 border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
          <span className="text-xs text-text-secondary font-bold uppercase tracking-wider">⏱️ Avg Order Frequency</span>
          <div className="text-2xl font-black text-white mt-2">
            {data.avgOrderFrequencyDays} Days
          </div>
          <span className="text-[10px] text-text-secondary mt-1">Average gap between repeat orders</span>
        </div>

        <div className="bg-neutral-900 border border-amber-500/20 rounded-2xl p-5 flex flex-col justify-between">
          <span className="text-xs text-text-secondary font-bold uppercase tracking-wider">⚖️ Total Unredeemed Liability</span>
          <div className="text-2xl font-black text-gold mt-2">
            ₹{data.totalLiabilityRupees.toLocaleString()}
          </div>
          <span className="text-[10px] text-gold/80 font-bold mt-1">Financial cash obligation of unspent points</span>
        </div>
      </div>

      {/* CLV by Tier Breakdown */}
      <div className="bg-neutral-900 border border-white/5 rounded-2xl p-5 space-y-4">
        <h4 className="text-white text-xs font-black uppercase tracking-wide border-b border-white/5 pb-2">
          💎 Average Customer Lifetime Value (CLV) by Tier
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="bg-black/30 border border-white/5 rounded-xl p-4">
            <span className="text-xs text-gray-400 font-bold">🥈 Silver Members</span>
            <div className="text-lg font-black text-white mt-1">₹{data.clvByTier.silver.toLocaleString()}</div>
            <span className="text-[10px] text-text-secondary">Average spend per account</span>
          </div>

          <div className="bg-black/30 border border-amber-500/20 rounded-xl p-4">
            <span className="text-xs text-amber-400 font-bold">🥇 Gold Members</span>
            <div className="text-lg font-black text-white mt-1">₹{data.clvByTier.gold.toLocaleString()}</div>
            <span className="text-[10px] text-amber-400/80 font-bold">
              {data.clvByTier.silver > 0 ? `${Math.round((data.clvByTier.gold / data.clvByTier.silver) * 100) - 100}% higher than Silver` : 'High value tier'}
            </span>
          </div>

          <div className="bg-black/30 border border-purple-500/20 rounded-xl p-4">
            <span className="text-xs text-purple-400 font-bold">💎 Platinum VIPs</span>
            <div className="text-lg font-black text-white mt-1">₹{data.clvByTier.platinum.toLocaleString()}</div>
            <span className="text-[10px] text-purple-400/80 font-bold">Top tier customer cohort</span>
          </div>
        </div>
      </div>

      {/* Retention Cohort Distribution */}
      <div className="bg-neutral-900 border border-white/5 rounded-2xl p-5 space-y-4">
        <h4 className="text-white text-xs font-black uppercase tracking-wide border-b border-white/5 pb-2">
          👥 Repeat Purchase Cohorts
        </h4>
        <div className="grid grid-cols-3 gap-3 pt-1 text-center">
          <div className="bg-white/5 rounded-xl p-3">
            <div className="text-base font-black text-white">{data.retentionSummary.oneOrder}</div>
            <span className="text-[10px] text-text-secondary">1 Order (New)</span>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <div className="text-base font-black text-gold">{data.retentionSummary.twoToThreeOrders}</div>
            <span className="text-[10px] text-text-secondary">2–3 Orders (Active)</span>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <div className="text-base font-black text-emerald-400">{data.retentionSummary.fourPlusOrders}</div>
            <span className="text-[10px] text-text-secondary">4+ Orders (Loyal)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
