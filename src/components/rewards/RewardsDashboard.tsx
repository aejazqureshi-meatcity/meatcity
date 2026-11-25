"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface RewardsDashboardProps {
  user: any;
  onNavigateTab?: (tab: string) => void;
}

export default function RewardsDashboard({ user, onNavigateTab }: RewardsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [rewardsCatalog, setRewardsCatalog] = useState<any[]>([]);
  const [claimedRewards, setClaimedRewards] = useState<any[]>([]);
  const [activeLedgerFilter, setActiveLedgerFilter] = useState<'all' | 'earned' | 'redeemed'>('all');
  
  // Birthday input
  const [birthdayInput, setBirthdayInput] = useState('');
  const [isSavingBirthday, setIsSavingBirthday] = useState(false);
  const [birthdaySuccess, setBirthdaySuccess] = useState(false);

  // Copy toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const fetchLoyaltyData = async () => {
    try {
      const [accRes, rwdRes] = await Promise.all([
        fetch('/api/loyalty/account'),
        fetch('/api/loyalty/rewards'),
      ]);

      if (accRes.ok) {
        const accData = await accRes.json();
        if (accData.success) {
          setData(accData);
          if (accData.account?.birthday) {
            setBirthdayInput(accData.account.birthday);
          }
        }
      }

      if (rwdRes.ok) {
        const rwdData = await rwdRes.json();
        if (rwdData.success) {
          setRewardsCatalog(rwdData.rewards || []);
        }
      }
    } catch (err) {
      console.error('Failed to load loyalty dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoyaltyData();
  }, []);

  const handleCopy = (text: string, label = 'Copied to clipboard!') => {
    navigator.clipboard.writeText(text);
    showToast(label);
  };

  const handleSaveBirthday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!birthdayInput) return;
    setIsSavingBirthday(true);
    try {
      const res = await fetch('/api/loyalty/birthday', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ birthday: birthdayInput }),
      });
      if (res.ok) {
        setBirthdaySuccess(true);
        showToast('Birthday saved! Birthday reward will be unlocked on your special day.');
      } else {
        showToast('Failed to save birthday.');
      }
    } catch {
      showToast('Error saving birthday.');
    } finally {
      setIsSavingBirthday(false);
    }
  };

  const handleClaimReward = async (rewardId: string, title: string, cost: number) => {
    if (!data?.account || data.account.points_balance < cost) {
      showToast(`You need ${cost} points to claim this reward.`);
      return;
    }

    try {
      const res = await fetch('/api/loyalty/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId }),
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        showToast(`🎉 Reward Claimed! Voucher Code: ${resData.claimCode}`);
        setClaimedRewards((prev) => [resData.claim, ...prev]);
        fetchLoyaltyData();
      } else {
        showToast(resData.error || 'Failed to claim reward');
      }
    } catch {
      showToast('Error claiming reward.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <p className="text-xs text-text-secondary font-bold uppercase tracking-wider animate-pulse">
          Loading rewards & stamp card...
        </p>
      </div>
    );
  }

  const account = data?.account || { points_balance: 0, referral_code: 'MEATCITY' };
  const currentTier = data?.currentTier || { name: 'Silver Member', icon: '🥈', points_multiplier: 1.0 };
  const nextTier = data?.nextTier;
  const tierProgress = data?.tierProgress || { percent: 0, spendNeeded: 2500, ordersNeeded: 5 };
  const activeStampCard = data?.activeStampCard || { stamps_collected: 0, stamps_required: 10 };
  const ledger = data?.ledger || [];

  const filteredLedger = ledger.filter((entry: any) => {
    if (activeLedgerFilter === 'earned') return entry.points > 0;
    if (activeLedgerFilter === 'redeemed') return entry.points < 0;
    return true;
  });

  const referralUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/register?ref=${account.referral_code}`
    : `https://www.meatcity.in/register?ref=${account.referral_code}`;

  const whatsappShareText = encodeURIComponent(
    `Order fresh, 100% Halal meat from MeatCity! Use my referral code ${account.referral_code} to get ₹50 OFF your first order: ${referralUrl}`
  );

  return (
    <div className="flex flex-col gap-5 w-full animate-in fade-in duration-300">
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-xs font-black px-4 py-2.5 rounded-full shadow-2xl border border-white/10 animate-in fade-in">
          {toastMessage}
        </div>
      )}

      {/* 1. Hero Points Balance Card */}
      <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-neutral-900 via-neutral-900 to-[#2A0505] border border-gold/30 p-5 text-white shadow-xl">
        {/* Glow & Branding Accents */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-gold/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-black tracking-widest text-gold flex items-center gap-1.5">
              <span>👑</span> MeatCity Club Rewards
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black tracking-tight text-white">
                {account.points_balance.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-white/70">Points</span>
            </div>
            <span className="text-xs text-gold font-extrabold mt-0.5">
              ≈ ₹{((account.points_balance || 0) * (data?.settings?.pointRupeeValue || 1.0)).toFixed(2)} Cash Value
            </span>
          </div>

          {/* Current Tier Badge */}
          <div className="flex flex-col items-end">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gold/15 text-gold border border-gold/30 backdrop-blur-md shadow-xs">
              <span>{currentTier.icon}</span>
              <span>{currentTier.name}</span>
            </span>
            <span className="text-[9px] text-white/60 font-semibold mt-1">
              {currentTier.points_multiplier}x Earning Multiplier
            </span>
          </div>
        </div>

        {/* Progress Bar to Next Tier */}
        {nextTier ? (
          <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[10px] font-bold text-white/80">
              <span>Progress to {nextTier.name} ({nextTier.icon})</span>
              <span className="text-gold">{tierProgress.percent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-gold to-primary rounded-full transition-all duration-500"
                style={{ width: `${tierProgress.percent}%` }}
              />
            </div>
            <span className="text-[9px] text-white/60">
              Spend ₹{tierProgress.spendNeeded} more or complete {tierProgress.ordersNeeded} orders to unlock {nextTier.name} perks!
            </span>
          </div>
        ) : (
          <div className="mt-3 pt-3 border-t border-white/10 text-[10px] text-gold font-bold flex items-center gap-1.5">
            <span>💎</span> Highest VIP tier unlocked! Enjoy 1.5x points and free delivery benefits.
          </div>
        )}
      </div>

      {/* 2. Digital Stamp Card */}
      <div className="bg-surface border border-border rounded-[22px] p-5 flex flex-col gap-4 shadow-xs">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <div className="flex flex-col">
            <h3 className="text-text-primary text-sm font-black tracking-tight flex items-center gap-1.5">
              <span>🍗</span> Digital MeatCity Stamp Card
            </h3>
            <span className="text-[11px] text-text-secondary font-medium">
              Collect 10 stamps (orders ≥ ₹400) to unlock Free 250g Chicken Curry Cut!
            </span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
            Card #{activeStampCard.card_number || 1}
          </span>
        </div>

        {/* 10 Stamps Grid */}
        <div className="grid grid-cols-5 gap-2.5 py-1">
          {Array.from({ length: 10 }).map((_, idx) => {
            const stampNumber = idx + 1;
            const isCollected = stampNumber <= (activeStampCard.stamps_collected || 0);
            const isTenth = stampNumber === 10;

            return (
              <div
                key={idx}
                className={`aspect-square rounded-[14px] flex flex-col items-center justify-center p-1 border transition-all relative ${
                  isCollected
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : isTenth
                    ? 'bg-gold/10 border-gold/40 text-gold border-dashed'
                    : 'bg-neutral-50 dark:bg-neutral-900 border-border text-text-secondary'
                }`}
              >
                {isCollected ? (
                  <span className="text-xl">🥩</span>
                ) : isTenth ? (
                  <span className="text-lg animate-pulse">🎁</span>
                ) : (
                  <span className="text-xs font-black">{stampNumber}</span>
                )}
                <span className="text-[8px] font-extrabold uppercase mt-0.5 leading-none">
                  {isCollected ? 'Stamp' : isTenth ? 'Reward' : `#${stampNumber}`}
                </span>
              </div>
            );
          })}
        </div>

        {/* Stamp Card Progress bar & footer */}
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-text-primary">
            {activeStampCard.stamps_collected || 0} of 10 stamps collected
          </span>
          <span className="text-primary font-black text-xs">
            {Math.max(0, 10 - (activeStampCard.stamps_collected || 0))} orders left
          </span>
        </div>

        {activeStampCard.status === 'completed' && activeStampCard.reward_code && (
          <div className="bg-emerald-500/10 border border-emerald-500/25 p-3 rounded-[14px] flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase">
                🎉 Free 250g Chicken Curry Cut Unlocked!
              </span>
              <span className="text-xs font-black text-text-primary tracking-wide">
                Code: {activeStampCard.reward_code}
              </span>
            </div>
            <Link
              href="/cart"
              className="px-3 py-1.5 bg-gold hover:bg-yellow-400 text-black font-black text-xs rounded-[10px] active:scale-95 shadow-xs"
            >
              Claim in Cart 🍗
            </Link>
          </div>
        )}
      </div>

      {/* 3. Refer & Earn Program */}
      <div className="bg-surface border border-border rounded-[22px] p-5 flex flex-col gap-3.5 shadow-xs">
        <div className="flex justify-between items-center border-b border-border pb-2.5">
          <h3 className="text-text-primary text-sm font-black tracking-tight flex items-center gap-1.5">
            <span>🎁</span> Refer Friends, Earn Points
          </h3>
          <span className="text-[9px] font-black uppercase text-gold bg-gold/10 px-2 py-0.5 rounded-full">
            +200 Pts / Friend
          </span>
        </div>

        <p className="text-xs text-text-secondary font-medium leading-relaxed">
          Share your referral code with friends & family. They get <strong>₹50 OFF</strong> their first order, and you earn <strong>200 Points (₹10)</strong> when they complete their first order!
        </p>

        {/* Code & Share Row */}
        <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 border border-border p-2.5 rounded-[14px]">
          <div className="flex flex-col flex-1 pl-1">
            <span className="text-[9px] uppercase font-bold text-text-secondary">Your Referral Code</span>
            <strong className="text-sm font-black text-text-primary tracking-wider">
              {account.referral_code}
            </strong>
          </div>
          <button
            onClick={() => handleCopy(account.referral_code, 'Referral code copied!')}
            className="px-3 py-2 bg-surface border border-border hover:border-primary/40 text-text-primary font-bold text-xs rounded-[10px] active:scale-95 shadow-xs"
          >
            Copy Code
          </button>
          <a
            href={`https://wa.me/?text=${whatsappShareText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-[#25D366] hover:bg-green-600 text-white font-bold text-xs rounded-[10px] active:scale-95 flex items-center gap-1 shadow-xs"
          >
            <span>💬</span> WhatsApp
          </a>
        </div>

        {/* Referral stats */}
        <div className="grid grid-cols-2 gap-2.5 pt-1 text-center">
          <div className="bg-neutral-50 dark:bg-neutral-900/50 p-2.5 rounded-[12px] border border-border">
            <span className="text-text-primary font-black text-sm block">
              {data?.referrals?.length || 0}
            </span>
            <span className="text-[10px] text-text-secondary font-semibold">Friends Invited</span>
          </div>
          <div className="bg-neutral-50 dark:bg-neutral-900/50 p-2.5 rounded-[12px] border border-border">
            <span className="text-primary font-black text-sm block">
              {data?.referrals?.filter((r: any) => r.status === 'rewarded').length || 0}
            </span>
            <span className="text-[10px] text-text-secondary font-semibold">Successful Orders</span>
          </div>
        </div>
      </div>

      {/* 4. Birthday & Special Perks Card */}
      <div className="bg-surface border border-border rounded-[22px] p-5 flex flex-col gap-3 shadow-xs">
        <h3 className="text-text-primary text-sm font-black tracking-tight flex items-center gap-1.5 border-b border-border pb-2">
          <span>🎂</span> Birthday Special Gift
        </h3>
        <p className="text-xs text-text-secondary font-medium">
          Tell us your birthday to receive an exclusive <strong>300 Points bonus</strong> on your special day!
        </p>

        {account.birthday ? (
          <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-900 p-3 rounded-[14px] border border-border">
            <span className="text-xs font-bold text-text-primary">
              Birthday on file: <strong>{new Date(account.birthday).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</strong>
            </span>
            <span className="text-xs text-emerald-500 font-black">✓ Verified</span>
          </div>
        ) : (
          <form onSubmit={handleSaveBirthday} className="flex gap-2">
            <input
              type="date"
              required
              value={birthdayInput}
              onChange={(e) => setBirthdayInput(e.target.value)}
              className="flex-1 bg-surface border border-border rounded-[12px] px-3 py-2 text-xs text-text-primary outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={isSavingBirthday || !birthdayInput}
              className="px-4 py-2 bg-primary hover:bg-[#B80000] text-white font-bold text-xs uppercase tracking-wide rounded-[12px] active:scale-95 transition-all shadow-xs"
            >
              {isSavingBirthday ? 'Saving...' : 'Save'}
            </button>
          </form>
        )}
      </div>

      {/* 5. Claimable Rewards Catalog */}
      {rewardsCatalog.length > 0 && (
        <div className="bg-surface border border-border rounded-[22px] p-5 flex flex-col gap-3.5 shadow-xs">
          <div className="flex justify-between items-center border-b border-border pb-2.5">
            <h3 className="text-text-primary text-sm font-black tracking-tight flex items-center gap-1.5">
              <span>🎟️</span> Redeem Points for Vouchers
            </h3>
            <span className="text-[10px] text-text-secondary font-semibold">
              Instant Vouchers
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rewardsCatalog.map((rwd) => {
              const canAfford = (account.points_balance || 0) >= rwd.points_cost;

              return (
                <div
                  key={rwd.id}
                  className="bg-neutral-50 dark:bg-neutral-900/60 border border-border p-3.5 rounded-[16px] flex flex-col justify-between gap-3 shadow-xs"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-start">
                      <h4 className="text-text-primary text-xs font-black tracking-tight">{rwd.title}</h4>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-primary/10 text-primary">
                        {rwd.points_cost} Pts
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary leading-snug">
                      {rwd.description}
                    </p>
                  </div>

                  <button
                    onClick={() => handleClaimReward(rwd.id, rwd.title, rwd.points_cost)}
                    disabled={!canAfford}
                    className={`w-full py-2 rounded-[10px] text-xs font-bold uppercase transition-all shadow-xs ${
                      canAfford
                        ? 'bg-primary hover:bg-[#B80000] text-white active:scale-95'
                        : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                    }`}
                  >
                    {canAfford ? 'Redeem Voucher' : `Need ${rwd.points_cost - account.points_balance} More Pts`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Points History Ledger */}
      <div className="bg-surface border border-border rounded-[22px] p-5 flex flex-col gap-3.5 shadow-xs">
        <div className="flex justify-between items-center border-b border-border pb-2.5">
          <h3 className="text-text-primary text-sm font-black tracking-tight flex items-center gap-1.5">
            <span>📜</span> Points History
          </h3>

          <div className="flex gap-1">
            {(['all', 'earned', 'redeemed'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveLedgerFilter(filter)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize transition-all ${
                  activeLedgerFilter === filter
                    ? 'bg-primary text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
          {filteredLedger.map((entry: any) => (
            <div
              key={entry.id}
              className="flex justify-between items-center p-2.5 rounded-[12px] bg-neutral-50 dark:bg-neutral-900 border border-border text-xs"
            >
              <div className="flex flex-col">
                <span className="font-bold text-text-primary text-[11px]">{entry.description}</span>
                <span className="text-[9px] text-text-secondary mt-0.5">
                  {new Date(entry.created_at).toLocaleDateString()}
                </span>
              </div>
              <span
                className={`font-black text-xs ${
                  entry.points > 0 ? 'text-emerald-500' : 'text-primary'
                }`}
              >
                {entry.points > 0 ? `+${entry.points}` : entry.points} Pts
              </span>
            </div>
          ))}

          {filteredLedger.length === 0 && (
            <div className="text-center py-6 text-xs text-text-secondary font-medium">
              No transactions logged yet. Complete your first fresh meat order to earn points!
            </div>
          )}
        </div>
      </div>

      {/* 7. Terms & Fair Use Accordion */}
      <div className="bg-surface border border-border rounded-[22px] p-4 text-xs flex flex-col gap-2 shadow-xs">
        <span className="font-black text-text-primary uppercase tracking-wide text-[11px]">
          ℹ️ Loyalty Program Rules & Terms
        </span>
        <ul className="list-disc list-inside text-text-secondary text-[11px] space-y-1">
          <li>Earn 2 Points for every ₹100 spent on eligible delivered fresh cuts (₹500 = 10 pts, ₹800 = 16 pts).</li>
          <li>Each point is worth ₹1.00 cash discount during checkout. Minimum 50 points required to redeem (max 10% of subtotal).</li>
          <li>Points remain valid for 180 days from the earning date.</li>
          <li>Digital stamp cards: 1 stamp per qualifying completed order (min ₹400). 10 stamps unlock 1 claimable 250g Free Chicken Curry Cut!</li>
          <li>Points and promotional coupons cannot be stacked on the same order.</li>
        </ul>
      </div>
    </div>
  );
}
