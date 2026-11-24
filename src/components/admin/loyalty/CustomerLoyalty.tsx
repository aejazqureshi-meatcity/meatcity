"use client";

import React, { useEffect, useState } from 'react';

interface LoyaltyCustomer {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string;
  user_type: string;
  tier_id: string;
  points_balance: number;
  lifetime_points_earned: number;
  lifetime_spend: number;
  total_orders_completed: number;
  referral_code: string;
  stamps_collected?: number;
  is_suspended: boolean;
}

export default function CustomerLoyalty() {
  const [customers, setCustomers] = useState<LoyaltyCustomer[]>([]);
  const [search, setSearch] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Adjustment Modal State
  const [adjustingCustomer, setAdjustingCustomer] = useState<LoyaltyCustomer | null>(null);
  const [pointsChange, setPointsChange] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchCustomers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/loyalty/admin/customers?search=${encodeURIComponent(search)}&tier=${selectedTier}`);
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to fetch loyalty customers');
      }
      setCustomers(json.customers || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [selectedTier]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers();
  };

  const handleAdjustPointsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingCustomer) return;
    if (pointsChange === 0) {
      setModalFeedback({ message: 'Points change cannot be 0.', type: 'error' });
      return;
    }
    if (!adjustmentReason.trim()) {
      setModalFeedback({ message: 'A mandatory audit reason is required for manual point adjustment.', type: 'error' });
      return;
    }

    setIsSubmittingAdjustment(true);
    setModalFeedback(null);

    try {
      const res = await fetch('/api/loyalty/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: adjustingCustomer.user_id,
          pointsAdjustment: pointsChange,
          reason: adjustmentReason.trim()
        })
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to adjust points');
      }

      setModalFeedback({ message: 'Points adjusted successfully!', type: 'success' });
      setTimeout(() => {
        setAdjustingCustomer(null);
        setPointsChange(0);
        setAdjustmentReason('');
        setModalFeedback(null);
        fetchCustomers();
      }, 1000);
    } catch (err: any) {
      setModalFeedback({ message: err.message, type: 'error' });
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-neutral-900 border border-white/5 rounded-2xl p-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by name, phone or referral code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-text-secondary outline-none focus:border-gold/50"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-white font-bold text-xs rounded-xl active:scale-95"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary font-bold">Filter Tier:</span>
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
          >
            <option value="all">All Tiers</option>
            <option value="silver">🥈 Silver</option>
            <option value="gold">🥇 Gold</option>
            <option value="platinum">💎 Platinum</option>
          </select>
          <button
            onClick={fetchCustomers}
            className="p-2 bg-neutral-800 hover:bg-neutral-750 text-white rounded-xl text-xs"
            title="Refresh list"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Customer Loyalty Table */}
      <div className="bg-neutral-900 border border-white/5 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-text-secondary text-xs">
            Loading loyalty members...
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-400 text-xs">
            {error}
          </div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-text-secondary text-xs">
            No loyalty accounts found matching your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-text-secondary">
              <thead className="bg-white/5 text-[10px] uppercase font-black text-text-secondary tracking-wider border-b border-white/5">
                <tr>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Tier</th>
                  <th className="py-3 px-4">Balance</th>
                  <th className="py-3 px-4">Stamps</th>
                  <th className="py-3 px-4">Lifetime Spend</th>
                  <th className="py-3 px-4">Referral Code</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {customers.map((c) => {
                  const tierBadge =
                    c.tier_id === 'platinum'
                      ? 'bg-purple-950/40 text-purple-300 border-purple-500/30'
                      : c.tier_id === 'gold'
                      ? 'bg-amber-950/40 text-amber-300 border-amber-500/30'
                      : 'bg-gray-800 text-gray-300 border-gray-600/30';

                  const rupeeValue = Math.round(c.points_balance * 0.25);

                  return (
                    <tr key={c.id || c.user_id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{c.name || 'Anonymous Customer'}</div>
                        <div className="text-[10px] text-text-secondary font-mono mt-0.5">{c.phone || c.email || 'No phone'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${tierBadge}`}>
                          {c.tier_id === 'platinum' ? '💎 Platinum' : c.tier_id === 'gold' ? '🥇 Gold' : '🥈 Silver'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-black text-white">{c.points_balance} pts</span>
                        <span className="block text-[10px] text-gold font-bold">≈ ₹{rupeeValue}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-white">{c.stamps_collected || 0}/10</span>
                        <span className="block text-[10px] text-text-secondary">active card</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-black text-white">₹{c.lifetime_spend.toLocaleString()}</span>
                        <span className="block text-[10px] text-text-secondary">{c.total_orders_completed} orders</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400 text-[11px]">
                        {c.referral_code}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setAdjustingCustomer(c);
                            setPointsChange(0);
                            setAdjustmentReason('');
                            setModalFeedback(null);
                          }}
                          className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-white font-bold text-[11px] rounded-lg border border-white/5 active:scale-95"
                        >
                          Adjust Points
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Points Adjustment Modal */}
      {adjustingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-white/5">
              <div>
                <h3 className="text-white text-sm font-black uppercase tracking-wide">
                  ⚖️ Adjust Customer Points
                </h3>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  Audited manual point adjustment for {adjustingCustomer.name}
                </p>
              </div>
              <button
                onClick={() => setAdjustingCustomer(null)}
                className="text-text-secondary hover:text-white text-base"
              >
                ✕
              </button>
            </div>

            <div className="bg-black/30 border border-white/5 rounded-xl p-3 flex justify-between items-center text-xs">
              <span className="text-text-secondary">Current Balance:</span>
              <strong className="text-gold font-black text-sm">{adjustingCustomer.points_balance} pts</strong>
            </div>

            <form onSubmit={handleAdjustPointsSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Points Adjustment (+ to grant, - to deduct)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 100 or -50"
                  value={pointsChange === 0 ? '' : pointsChange}
                  onChange={(e) => setPointsChange(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-gold/50"
                  required
                />
                <span className="text-[10px] text-text-secondary mt-1 block">
                  New Balance will be:{' '}
                  <strong className="text-white">{adjustingCustomer.points_balance + pointsChange} pts</strong>
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Mandatory Audit Reason
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Goodwill gesture for delayed delivery #ORD-12345"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-gold/50 resize-none"
                  required
                />
              </div>

              {modalFeedback && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-bold ${
                    modalFeedback.type === 'success'
                      ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30'
                      : 'bg-red-950/40 text-red-400 border border-red-500/30'
                  }`}
                >
                  {modalFeedback.message}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingCustomer(null)}
                  disabled={isSubmittingAdjustment}
                  className="px-4 py-2 bg-neutral-800 text-white font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjustment}
                  className="px-5 py-2 bg-gold hover:bg-yellow-400 text-black font-black text-xs uppercase tracking-wider rounded-xl active:scale-95 disabled:opacity-50"
                >
                  {isSubmittingAdjustment ? 'Saving...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
