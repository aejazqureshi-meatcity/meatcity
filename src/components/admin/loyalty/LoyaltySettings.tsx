"use client";

import React, { useEffect, useState } from 'react';

interface LoyaltySettingsState {
  is_enabled: boolean;
  points_per_rupee: number;
  point_rupee_value: number;
  min_order_amount_for_earn: number;
  min_points_for_redemption: number;
  max_points_redemption_per_order: number;
  max_redemption_percent_per_order: number;
  points_expiry_days: number;
  stamp_card_threshold: number;
  stamps_required: number;
  stamp_reward_voucher_value: number;
  referral_referrer_points: number;
  referral_referee_discount: number;
  referral_min_spend: number;
  eligible_customer_types: string[];
}

export default function LoyaltySettings() {
  const [settings, setSettings] = useState<LoyaltySettingsState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/loyalty/admin/settings');
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to fetch loyalty settings');
      }
      setSettings(json.settings);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/loyalty/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to update settings');
      }

      setFeedback({ message: 'Loyalty system settings updated and saved successfully!', type: 'success' });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ message: err.message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-text-secondary text-xs">Loading loyalty settings...</div>;
  }

  if (error || !settings) {
    return <div className="p-6 text-center text-red-400 text-xs">{error || 'Failed to load settings.'}</div>;
  }

  const toggleCustomerType = (type: string) => {
    const current = settings.eligible_customer_types || [];
    if (current.includes(type)) {
      setSettings({ ...settings, eligible_customer_types: current.filter((t) => t !== type) });
    } else {
      setSettings({ ...settings, eligible_customer_types: [...current, type] });
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      {/* Master Activation Banner */}
      <div
        className={`rounded-2xl p-5 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
          settings.is_enabled
            ? 'bg-emerald-950/20 border-emerald-500/30'
            : 'bg-amber-950/20 border-amber-500/30'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl">{settings.is_enabled ? '🟢' : '⏸️'}</div>
          <div>
            <h3 className="text-white font-black text-sm uppercase tracking-wide">
              Loyalty Program Status: {settings.is_enabled ? 'Active & Live' : 'Inactive / Disabled'}
            </h3>
            <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
              {settings.is_enabled
                ? 'Customers earn and redeem points in real-time on qualifying checkout orders.'
                : 'Program is paused. No points can be claimed or redeemed by customers until activated.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSettings({ ...settings, is_enabled: !settings.is_enabled })}
          className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 whitespace-nowrap shadow-md ${
            settings.is_enabled
              ? 'bg-red-600/30 hover:bg-red-600/50 text-red-300 border border-red-500/30'
              : 'bg-gold hover:bg-yellow-400 text-black shadow-gold/20'
          }`}
        >
          {settings.is_enabled ? 'Pause Program' : 'Enable Program Now'}
        </button>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Points Valuation & Earn Rules */}
        <div className="bg-neutral-900 border border-white/5 rounded-2xl p-5 space-y-4">
          <h4 className="text-white text-xs font-black uppercase tracking-wide border-b border-white/5 pb-2 flex items-center gap-2">
            <span>🪙</span> Points Valuation & Earn Rates
          </h4>

          <div>
            <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
              Points Per Rupee Spent (0.05 = 1 pt per ₹20)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={settings.points_per_rupee}
              onChange={(e) => setSettings({ ...settings, points_per_rupee: parseFloat(e.target.value) || 0 })}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-gold/50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
              Point Cash Value in Rupees (e.g. ₹0.25 per point)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={settings.point_rupee_value}
              onChange={(e) => setSettings({ ...settings, point_rupee_value: parseFloat(e.target.value) || 0.25 })}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-gold/50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
              Minimum Order Subtotal to Earn Points (₹)
            </label>
            <input
              type="number"
              min="0"
              value={settings.min_order_amount_for_earn}
              onChange={(e) => setSettings({ ...settings, min_order_amount_for_earn: parseInt(e.target.value, 10) || 0 })}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-gold/50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
              Points Expiry Window (Days, e.g. 365)
            </label>
            <input
              type="number"
              min="30"
              value={settings.points_expiry_days}
              onChange={(e) => setSettings({ ...settings, points_expiry_days: parseInt(e.target.value, 10) || 365 })}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-gold/50"
            />
          </div>
        </div>

        {/* Card 2: Redemption Limits & Controls */}
        <div className="bg-neutral-900 border border-white/5 rounded-2xl p-5 space-y-4">
          <h4 className="text-white text-xs font-black uppercase tracking-wide border-b border-white/5 pb-2 flex items-center gap-2">
            <span>🛡️</span> Checkout Redemption Limits
          </h4>

          <div>
            <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
              Minimum Points Required for Checkout Redemption
            </label>
            <input
              type="number"
              min="10"
              value={settings.min_points_for_redemption}
              onChange={(e) => setSettings({ ...settings, min_points_for_redemption: parseInt(e.target.value, 10) || 100 })}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-gold/50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
              Maximum Points Redumed Per Single Order Cap
            </label>
            <input
              type="number"
              min="50"
              value={settings.max_points_redemption_per_order}
              onChange={(e) => setSettings({ ...settings, max_points_redemption_per_order: parseInt(e.target.value, 10) || 1000 })}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-gold/50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
              Max Redemption % of Order Subtotal (e.g. 50%)
            </label>
            <input
              type="number"
              min="5"
              max="100"
              value={settings.max_redemption_percent_per_order}
              onChange={(e) => setSettings({ ...settings, max_redemption_percent_per_order: parseInt(e.target.value, 10) || 50 })}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-gold/50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
              Eligible Customer Account Types
            </label>
            <div className="flex gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-white">
                <input
                  type="checkbox"
                  checked={settings.eligible_customer_types?.includes('b2c')}
                  onChange={() => toggleCustomerType('b2c')}
                  className="w-4 h-4 accent-gold"
                />
                B2C Retail Customers
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-white">
                <input
                  type="checkbox"
                  checked={settings.eligible_customer_types?.includes('b2b')}
                  onChange={() => toggleCustomerType('b2b')}
                  className="w-4 h-4 accent-gold"
                />
                B2B Wholesale Partners
              </label>
            </div>
          </div>
        </div>

        {/* Card 3: Digital Stamp Card Configuration */}
        <div className="bg-neutral-900 border border-white/5 rounded-2xl p-5 space-y-4">
          <h4 className="text-white text-xs font-black uppercase tracking-wide border-b border-white/5 pb-2 flex items-center gap-2">
            <span>🎫</span> 10-Stamp Loyalty Card Rules
          </h4>

          <div>
            <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
              Minimum Order Spend for 1 Stamp (₹)
            </label>
            <input
              type="number"
              min="100"
              value={settings.stamp_card_threshold}
              onChange={(e) => setSettings({ ...settings, stamp_card_threshold: parseInt(e.target.value, 10) || 300 })}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-gold/50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
              Stamps Required to Complete Card
            </label>
            <input
              type="number"
              min="5"
              max="20"
              value={settings.stamps_required}
              onChange={(e) => setSettings({ ...settings, stamps_required: parseInt(e.target.value, 10) || 10 })}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-gold/50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
              Reward Voucher Value Upon 10 Stamps (₹)
            </label>
            <input
              type="number"
              min="20"
              value={settings.stamp_reward_voucher_value}
              onChange={(e) => setSettings({ ...settings, stamp_reward_voucher_value: parseInt(e.target.value, 10) || 100 })}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-gold/50"
            />
          </div>
        </div>

        {/* Card 4: Refer & Earn Configuration */}
        <div className="bg-neutral-900 border border-white/5 rounded-2xl p-5 space-y-4">
          <h4 className="text-white text-xs font-black uppercase tracking-wide border-b border-white/5 pb-2 flex items-center gap-2">
            <span>🤝</span> Refer & Earn Program Rules
          </h4>

          <div>
            <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
              Referrer Bonus Points (Granted to inviter)
            </label>
            <input
              type="number"
              min="0"
              value={settings.referral_referrer_points}
              onChange={(e) => setSettings({ ...settings, referral_referrer_points: parseInt(e.target.value, 10) || 100 })}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-gold/50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
              Referee Welcome Voucher Value (₹)
            </label>
            <input
              type="number"
              min="0"
              value={settings.referral_referee_discount}
              onChange={(e) => setSettings({ ...settings, referral_referee_discount: parseInt(e.target.value, 10) || 50 })}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-gold/50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
              Referee Minimum Qualifying Spend (₹)
            </label>
            <input
              type="number"
              min="100"
              value={settings.referral_min_spend}
              onChange={(e) => setSettings({ ...settings, referral_min_spend: parseInt(e.target.value, 10) || 500 })}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-gold/50"
            />
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-bold ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30'
              : 'bg-red-950/40 text-red-400 border border-red-500/30'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="px-8 py-3 bg-gold hover:bg-yellow-400 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-gold/20 active:scale-95 disabled:opacity-50 transition-all"
        >
          {isSaving ? 'Saving Configuration...' : 'Save Settings Changes'}
        </button>
      </div>
    </form>
  );
}
