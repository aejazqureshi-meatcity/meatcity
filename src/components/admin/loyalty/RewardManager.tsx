"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface LoyaltyReward {
  id: string;
  title: string;
  description: string;
  points_cost: number;
  reward_type: string;
  voucher_discount_amount: number;
  min_order_spend: number;
  expiry_days: number;
  is_active: boolean;
}

export default function RewardManager() {
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit / Add modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Partial<LoyaltyReward> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchRewards = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      const res = await fetch('/api/loyalty/admin/rewards', { headers });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to fetch rewards catalog');
      }
      setRewards(json.rewards || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRewards();
  }, []);

  const handleOpenAddModal = () => {
    setEditingReward({
      title: '',
      description: '',
      points_cost: 200,
      reward_type: 'discount_voucher',
      voucher_discount_amount: 50,
      min_order_spend: 300,
      expiry_days: 30,
      is_active: true,
    });
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (r: LoyaltyReward) => {
    setEditingReward({ ...r });
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleSubmitReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReward) return;
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      const res = await fetch('/api/loyalty/admin/rewards', {
        method: 'POST',
        headers,
        body: JSON.stringify(editingReward),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to save reward');
      }

      setFeedback({ message: 'Reward saved successfully!', type: 'success' });
      setTimeout(() => {
        setIsModalOpen(false);
        setEditingReward(null);
        setFeedback(null);
        fetchRewards();
      }, 800);
    } catch (err: any) {
      setFeedback({ message: err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (reward: LoyaltyReward) => {
    try {
      const res = await fetch('/api/loyalty/admin/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...reward,
          is_active: !reward.is_active,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error);
      fetchRewards();
    } catch (err: any) {
      alert('Failed to toggle status: ' + err.message);
    }
  };

  const handleDeleteReward = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reward voucher?')) return;
    try {
      const res = await fetch(`/api/loyalty/admin/rewards?id=${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error);
      fetchRewards();
    } catch (err: any) {
      alert('Failed to delete reward: ' + err.message);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center bg-neutral-900 border border-white/5 rounded-2xl p-4">
        <div>
          <h3 className="text-white text-sm font-black uppercase tracking-wide">🎁 Rewards & Vouchers Catalog</h3>
          <p className="text-[11px] text-text-secondary mt-0.5">
            Configure coupons and vouchers that customers can unlock using their earned points
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 bg-gold hover:bg-yellow-400 text-black font-black text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-all flex items-center gap-1.5 shadow-md shadow-gold/20"
        >
          <span>+</span> Create New Reward
        </button>
      </div>

      {/* Rewards Grid */}
      {isLoading ? (
        <div className="p-8 text-center text-text-secondary text-xs">
          Loading rewards catalog...
        </div>
      ) : error ? (
        <div className="p-6 text-center text-red-400 text-xs">
          {error}
        </div>
      ) : rewards.length === 0 ? (
        <div className="bg-neutral-900 border border-white/5 rounded-2xl p-10 text-center flex flex-col items-center gap-3">
          <span className="text-3xl">🎫</span>
          <span className="text-white font-bold text-sm">No Rewards Configured Yet</span>
          <p className="text-text-secondary text-xs max-w-sm">
            Create reward vouchers (like ₹50 off or ₹100 off) that customers can claim with points.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="mt-2 px-4 py-2 bg-gold text-black font-bold text-xs rounded-xl"
          >
            Create Your First Reward
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map((r) => (
            <div
              key={r.id}
              className={`bg-neutral-900 border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                r.is_active ? 'border-white/10 hover:border-gold/30' : 'border-white/5 opacity-60'
              }`}
            >
              <div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-xs font-black uppercase text-gold bg-gold/10 border border-gold/20 px-2.5 py-0.5 rounded-full">
                    {r.points_cost} Points
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      r.is_active ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30' : 'bg-red-950/40 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {r.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <h4 className="text-white font-extrabold text-sm mt-3">{r.title}</h4>
                <p className="text-text-secondary text-xs mt-1 leading-relaxed">{r.description || 'Exclusive discount voucher'}</p>

                <div className="bg-black/30 border border-white/5 rounded-xl p-3 mt-4 space-y-1 text-[11px]">
                  <div className="flex justify-between text-text-secondary">
                    <span>Discount Value:</span>
                    <strong className="text-white">₹{r.voucher_discount_amount} Flat Off</strong>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Min Order Spend:</span>
                    <span className="text-white font-bold">{r.min_order_spend > 0 ? `₹${r.min_order_spend}` : 'No minimum'}</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Voucher Validity:</span>
                    <span className="text-white font-bold">{r.expiry_days} days</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-5 pt-3 border-t border-white/5">
                <button
                  onClick={() => handleToggleActive(r)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg border active:scale-95 transition-all ${
                    r.is_active
                      ? 'border-yellow-600/30 text-yellow-500 hover:bg-yellow-500/10'
                      : 'border-emerald-600/30 text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                >
                  {r.is_active ? 'Pause' : 'Activate'}
                </button>
                <button
                  onClick={() => handleOpenEditModal(r)}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-white font-bold text-xs rounded-lg active:scale-95"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteReward(r.id)}
                  className="px-3 py-1.5 bg-red-950/30 hover:bg-red-950/60 text-red-400 font-bold text-xs rounded-lg border border-red-500/20 active:scale-95"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reward Form Modal */}
      {isModalOpen && editingReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-white/5">
              <h3 className="text-white text-sm font-black uppercase tracking-wide">
                {editingReward.id ? '✏️ Edit Reward Voucher' : '🎁 Create New Reward Voucher'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-white text-base">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReward} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Reward Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. ₹50 Off Voucher"
                  value={editingReward.title || ''}
                  onChange={(e) => setEditingReward({ ...editingReward, title: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-gold/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Valid on all fresh chicken & mutton orders above ₹300"
                  value={editingReward.description || ''}
                  onChange={(e) => setEditingReward({ ...editingReward, description: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-gold/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                    Points Cost
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingReward.points_cost || ''}
                    onChange={(e) => setEditingReward({ ...editingReward, points_cost: Number(e.target.value) })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-gold/50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                    Discount Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingReward.voucher_discount_amount || ''}
                    onChange={(e) => setEditingReward({ ...editingReward, voucher_discount_amount: Number(e.target.value) })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-gold/50"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                    Min Order Spend (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingReward.min_order_spend || 0}
                    onChange={(e) => setEditingReward({ ...editingReward, min_order_spend: Number(e.target.value) })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-gold/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                    Validity (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingReward.expiry_days || 30}
                    onChange={(e) => setEditingReward({ ...editingReward, expiry_days: Number(e.target.value) })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-gold/50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="reward_is_active"
                  checked={editingReward.is_active !== false}
                  onChange={(e) => setEditingReward({ ...editingReward, is_active: e.target.checked })}
                  className="w-4 h-4 accent-gold"
                />
                <label htmlFor="reward_is_active" className="text-xs text-white font-bold cursor-pointer">
                  Active (Immediately visible to customers in rewards catalog)
                </label>
              </div>

              {feedback && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-bold ${
                    feedback.type === 'success'
                      ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30'
                      : 'bg-red-950/40 text-red-400 border border-red-500/30'
                  }`}
                >
                  {feedback.message}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-neutral-800 text-white font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gold hover:bg-yellow-400 text-black font-black text-xs uppercase tracking-wider rounded-xl active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Reward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
