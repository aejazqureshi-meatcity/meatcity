"use client";

import React, { useState, useEffect } from 'react';

interface B2CCustomersProps {
  users: any[];
  orders: any[];
  onSelectCustomerForMessage: (customer: any, purpose: string) => void;
  onNavigateTab: (tab: string) => void;
}

export default function B2CCustomers({
  users,
  orders,
  onSelectCustomerForMessage,
  onNavigateTab,
}: B2CCustomersProps) {
  const [segment, setSegment] = useState<
    'all' | 'first-time' | 'regular' | 'dormant' | 'vip' | 'expiring-points' | 'close-to-stamp' | 'close-to-tier'
  >('all');
  const [search, setSearch] = useState('');
  const [activeCustomer, setActiveCustomer] = useState<any | null>(null);
  const [loyaltyAccounts, setLoyaltyAccounts] = useState<Record<string, any>>({});

  useEffect(() => {
    fetch('/api/loyalty/admin/customers')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.customers) {
          const map: Record<string, any> = {};
          data.customers.forEach((c: any) => {
            map[c.user_id] = c;
          });
          setLoyaltyAccounts(map);
        }
      })
      .catch((err) => console.warn('Failed to load loyalty accounts for B2C customers:', err));
  }, []);

  // Filter only B2C consumers
  const b2cUsers = users.filter((u) => u.user_type === 'b2c' || (!u.user_type && u.role !== 'admin'));

  // Augment with order history & loyalty metrics
  const now = new Date();
  const customerMetrics = b2cUsers.map((user) => {
    const userOrders = orders.filter((o) => o.user_id === user.id || o.customer_phone === user.phone || o.customer_phone === user.mobile);
    const totalSpend = userOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const orderCount = userOrders.length;
    
    // Last order date
    let lastOrderDate: Date | null = null;
    let daysSinceLastOrder = 999;
    if (userOrders.length > 0) {
      const sorted = [...userOrders].sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });
      if (sorted[0]?.created_at) {
        const parsed = new Date(sorted[0].created_at);
        if (!isNaN(parsed.getTime())) {
          lastOrderDate = parsed;
          daysSinceLastOrder = Math.max(0, Math.floor((now.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24)));
        }
      }
    }

    const loyalty = loyaltyAccounts[user.id] || {};
    const pointsBalance = loyalty.points_balance || 0;
    const tierId = loyalty.tier_id || 'silver';
    const stampsCollected = loyalty.stamps_collected || 0;
    const referralCode = loyalty.referral_code || '';

    const hasExpiringPoints = pointsBalance >= 50 && daysSinceLastOrder >= 14;
    const isCloseToStampReward = stampsCollected >= 7;
    const isCloseToTierUpgrade = (totalSpend >= 3500 && totalSpend < 5000) || (totalSpend >= 12000 && totalSpend < 15000);

    return {
      ...user,
      displayName: user.full_name || user.name || 'Valued Customer',
      contactPhone: user.phone || user.mobile || '',
      orderCount,
      totalSpend,
      lastOrderDate,
      daysSinceLastOrder,
      recentOrders: userOrders.slice(0, 5),
      loyaltyTier: tierId,
      pointsBalance,
      stampsCollected,
      referralCode,
      hasExpiringPoints,
      isCloseToStampReward,
      isCloseToTierUpgrade,
    };
  });

  // Apply Segment Filter
  const segmented = customerMetrics.filter((cust) => {
    if (segment === 'first-time') return cust.orderCount === 1;
    if (segment === 'regular') return cust.orderCount >= 3;
    if (segment === 'dormant') return cust.daysSinceLastOrder >= 14 && cust.orderCount > 0;
    if (segment === 'vip') return cust.totalSpend >= 2000;
    if (segment === 'expiring-points') return cust.hasExpiringPoints;
    if (segment === 'close-to-stamp') return cust.isCloseToStampReward;
    if (segment === 'close-to-tier') return cust.isCloseToTierUpgrade;
    return true;
  });

  // Apply Search
  const filtered = segmented.filter((cust) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      cust.displayName.toLowerCase().includes(term) ||
      (cust.email && cust.email.toLowerCase().includes(term)) ||
      (cust.contactPhone && cust.contactPhone.includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Read-Only Safety Notice */}
      <div className="bg-[#111111] border border-white/5 p-4 rounded-xl flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-gray-300">
          <span className="text-emerald-400 font-bold">🛡️ Read-Only Integration:</span>
          <span>Customer account data, addresses, and order records are strictly protected. AI drafts retention and loyalty messages into the Approval Queue.</span>
        </div>
      </div>

      {/* Segments Bar */}
      <div className="bg-[#111111] border border-white/5 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSegment('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              segment === 'all' ? 'bg-[#D4AF37] text-black font-extrabold' : 'bg-white/5 hover:bg-white/10 text-gray-300'
            }`}
          >
            All Consumers ({b2cUsers.length})
          </button>

          <button
            onClick={() => setSegment('first-time')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              segment === 'first-time' ? 'bg-[#D4AF37] text-black font-extrabold' : 'bg-white/5 hover:bg-white/10 text-gray-300'
            }`}
          >
            First-Time ({customerMetrics.filter((c) => c.orderCount === 1).length})
          </button>

          <button
            onClick={() => setSegment('regular')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              segment === 'regular' ? 'bg-[#D4AF37] text-black font-extrabold' : 'bg-white/5 hover:bg-white/10 text-gray-300'
            }`}
          >
            Regulars ({customerMetrics.filter((c) => c.orderCount >= 3).length})
          </button>

          <button
            onClick={() => setSegment('close-to-stamp')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              segment === 'close-to-stamp' ? 'bg-[#D4AF37] text-black font-extrabold' : 'bg-white/5 hover:bg-white/10 text-amber-300 border border-amber-500/20'
            }`}
          >
            🎫 Close to Stamp Reward ({customerMetrics.filter((c) => c.isCloseToStampReward).length})
          </button>

          <button
            onClick={() => setSegment('expiring-points')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              segment === 'expiring-points' ? 'bg-[#D4AF37] text-black font-extrabold' : 'bg-white/5 hover:bg-white/10 text-yellow-300 border border-yellow-500/20'
            }`}
          >
            🪙 Expiring Points ({customerMetrics.filter((c) => c.hasExpiringPoints).length})
          </button>

          <button
            onClick={() => setSegment('close-to-tier')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              segment === 'close-to-tier' ? 'bg-[#D4AF37] text-black font-extrabold' : 'bg-white/5 hover:bg-white/10 text-purple-300 border border-purple-500/20'
            }`}
          >
            👑 Close to Tier Upgrade ({customerMetrics.filter((c) => c.isCloseToTierUpgrade).length})
          </button>

          <button
            onClick={() => setSegment('dormant')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              segment === 'dormant' ? 'bg-[#D4AF37] text-black font-extrabold' : 'bg-white/5 hover:bg-white/10 text-gray-300'
            }`}
          >
            Dormant 14d+ ({customerMetrics.filter((c) => c.daysSinceLastOrder >= 14 && c.orderCount > 0).length})
          </button>

          <button
            onClick={() => setSegment('vip')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              segment === 'vip' ? 'bg-[#D4AF37] text-black font-extrabold' : 'bg-white/5 hover:bg-white/10 text-gray-300'
            }`}
          >
            VIP &gt; ₹2k ({customerMetrics.filter((c) => c.totalSpend >= 2000).length})
          </button>
        </div>

        <input
          type="text"
          placeholder="Filter customer by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-black/60 border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 outline-none focus:border-[#D4AF37] w-full sm:w-64"
        />
      </div>

      {/* Customers Table */}
      <div className="bg-[#111111] border border-white/5 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/5 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                <th className="p-4">Customer</th>
                <th className="p-4">Mobile</th>
                <th className="p-4">Loyalty Tier & Points</th>
                <th className="p-4">Stamp Progress</th>
                <th className="p-4">Total Spend</th>
                <th className="p-4">Last Order</th>
                <th className="p-4 text-right">AI Retention Outreach</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-gray-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    No customers found in this segment.
                  </td>
                </tr>
              ) : (
                filtered.map((cust) => (
                  <tr key={cust.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white text-sm">{cust.displayName}</div>
                      <div className="text-gray-400 text-[11px]">{cust.email || 'No email registered'}</div>
                    </td>

                    <td className="p-4">
                      <div className="text-emerald-400 font-mono font-medium">{cust.contactPhone || 'N/A'}</div>
                    </td>

                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                        cust.loyaltyTier === 'platinum'
                          ? 'bg-purple-950/40 text-purple-300 border-purple-500/30'
                          : cust.loyaltyTier === 'gold'
                          ? 'bg-amber-950/40 text-amber-300 border-amber-500/30'
                          : 'bg-gray-800 text-gray-300 border-gray-600/30'
                      }`}>
                        {cust.loyaltyTier === 'platinum' ? '💎 Platinum' : cust.loyaltyTier === 'gold' ? '🥇 Gold' : '🥈 Silver'}
                      </span>
                      <div className="text-[11px] text-white font-bold mt-1">
                        {cust.pointsBalance} pts
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="font-bold text-white text-xs">{cust.stampsCollected}/10</span>
                      <span className="block text-[10px] text-text-secondary">active card</span>
                    </td>

                    <td className="p-4 font-black text-white">
                      ₹{cust.totalSpend.toLocaleString('en-IN')}
                      <span className="block text-[10px] text-gray-400 font-normal">{cust.orderCount} orders</span>
                    </td>

                    <td className="p-4">
                      {cust.lastOrderDate ? (
                        <div>
                          <div className="text-gray-300 font-medium">
                            {cust.lastOrderDate && !isNaN(cust.lastOrderDate.getTime()) ? cust.lastOrderDate.toISOString().split('T')[0] : 'Recent'}
                          </div>
                          <div className="text-gray-500 text-[10px]">
                            {cust.daysSinceLastOrder} day{cust.daysSinceLastOrder === 1 ? '' : 's'} ago
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500 italic">No orders yet</span>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {cust.isCloseToStampReward ? (
                          <button
                            onClick={() => {
                              onSelectCustomerForMessage(cust, 'Stamp Card Progress');
                              onNavigateTab('generator');
                            }}
                            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black font-bold rounded text-[11px] border border-amber-500/30 transition-colors"
                          >
                            🎫 Stamp Reward Nudge
                          </button>
                        ) : cust.hasExpiringPoints ? (
                          <button
                            onClick={() => {
                              onSelectCustomerForMessage(cust, 'Points Expiry Reminder');
                              onNavigateTab('generator');
                            }}
                            className="px-2.5 py-1 bg-yellow-500/20 hover:bg-yellow-500 text-yellow-300 hover:text-black font-bold rounded text-[11px] border border-yellow-500/30 transition-colors"
                          >
                            🪙 Points Expiry Reminder
                          </button>
                        ) : cust.isCloseToTierUpgrade ? (
                          <button
                            onClick={() => {
                              onSelectCustomerForMessage(cust, 'Tier Upgrade Congratulations');
                              onNavigateTab('generator');
                            }}
                            className="px-2.5 py-1 bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-white font-bold rounded text-[11px] border border-purple-500/30 transition-colors"
                          >
                            👑 Upgrade Nudge
                          </button>
                        ) : cust.daysSinceLastOrder >= 14 ? (
                          <button
                            onClick={() => {
                              onSelectCustomerForMessage(cust, 'Win-back Inactive Customer');
                              onNavigateTab('generator');
                            }}
                            className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white font-bold rounded text-[11px] border border-red-500/30 transition-colors"
                          >
                            🔄 Win-back Customer
                          </button>
                        ) : cust.orderCount === 0 ? (
                          <button
                            onClick={() => {
                              onSelectCustomerForMessage(cust, 'New Customer Promotion');
                              onNavigateTab('generator');
                            }}
                            className="px-2.5 py-1 bg-[#D4AF37]/20 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-black font-bold rounded text-[11px] transition-colors"
                          >
                            🎁 Welcome Offer
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              onSelectCustomerForMessage(cust, 'Repeat Order Reminder');
                              onNavigateTab('generator');
                            }}
                            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white font-bold rounded text-[11px] transition-colors"
                          >
                            💬 Repeat Draft
                          </button>
                        )}

                        <button
                          onClick={() => setActiveCustomer(cust)}
                          title="View Order Summary"
                          className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white"
                        >
                          👁️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Detail Drawer */}
      {activeCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-white font-extrabold text-lg">{activeCustomer.displayName}</h3>
                <span className="text-gray-400 text-xs">
                  {activeCustomer.contactPhone} • Lifetime Spend: ₹{activeCustomer.totalSpend}
                </span>
              </div>
              <button
                onClick={() => setActiveCustomer(null)}
                className="text-gray-400 hover:text-white text-base"
              >
                ✕
              </button>
            </div>

            <div className="bg-black/40 border border-white/5 rounded-xl p-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-text-secondary block text-[10px]">Tier</span>
                <span className="font-black text-gold capitalize">{activeCustomer.loyaltyTier}</span>
              </div>
              <div>
                <span className="text-text-secondary block text-[10px]">Points Balance</span>
                <span className="font-black text-white">{activeCustomer.pointsBalance} pts</span>
              </div>
              <div>
                <span className="text-text-secondary block text-[10px]">Stamps</span>
                <span className="font-black text-emerald-400">{activeCustomer.stampsCollected}/10</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs uppercase font-bold text-gray-400">Recent Completed Orders</h4>
              {activeCustomer.recentOrders && activeCustomer.recentOrders.length > 0 ? (
                activeCustomer.recentOrders.map((o: any) => (
                  <div key={o.id} className="bg-black/30 border border-white/5 p-3 rounded-lg flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-white">{o.id}</span>
                      <span className="text-gray-400 block text-[10px]">{new Date(o.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-white">₹{o.total}</span>
                      <span className="text-emerald-400 block text-[10px]">{o.status}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500">No past orders found.</p>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveCustomer(null)}
                className="px-4 py-2 bg-neutral-800 text-white font-bold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
