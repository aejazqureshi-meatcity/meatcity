"use client";

import React, { useState } from 'react';

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
  const [segment, setSegment] = useState<'all' | 'first-time' | 'regular' | 'dormant' | 'vip'>('all');
  const [search, setSearch] = useState('');
  const [activeCustomer, setActiveCustomer] = useState<any | null>(null);

  // Filter only B2C consumers
  const b2cUsers = users.filter((u) => u.user_type === 'b2c' || (!u.user_type && u.role !== 'admin'));

  // Augment with order history metrics
  const now = new Date();
  const customerMetrics = b2cUsers.map((user) => {
    const userOrders = orders.filter((o) => o.user_id === user.id || o.customer_phone === user.phone || o.customer_phone === user.mobile);
    const totalSpend = userOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const orderCount = userOrders.length;
    
    // Last order date
    let lastOrderDate: Date | null = null;
    let daysSinceLastOrder = 999;
    if (userOrders.length > 0) {
      const sorted = [...userOrders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      lastOrderDate = new Date(sorted[0].created_at);
      daysSinceLastOrder = Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      ...user,
      displayName: user.full_name || user.name || 'Valued Customer',
      contactPhone: user.phone || user.mobile || '',
      orderCount,
      totalSpend,
      lastOrderDate,
      daysSinceLastOrder,
      recentOrders: userOrders.slice(0, 5),
    };
  });

  // Apply Segment Filter
  const segmented = customerMetrics.filter((cust) => {
    if (segment === 'first-time') return cust.orderCount === 1;
    if (segment === 'regular') return cust.orderCount >= 3;
    if (segment === 'dormant') return cust.daysSinceLastOrder >= 14 && cust.orderCount > 0;
    if (segment === 'vip') return cust.totalSpend >= 2000;
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
          <span>Customer account data, addresses, and order records are strictly protected. AI can only draft outreach messages into the Approval Queue.</span>
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
            First-Time Buyers ({customerMetrics.filter((c) => c.orderCount === 1).length})
          </button>

          <button
            onClick={() => setSegment('regular')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              segment === 'regular' ? 'bg-[#D4AF37] text-black font-extrabold' : 'bg-white/5 hover:bg-white/10 text-gray-300'
            }`}
          >
            Regular VIPs 3+ ({customerMetrics.filter((c) => c.orderCount >= 3).length})
          </button>

          <button
            onClick={() => setSegment('dormant')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              segment === 'dormant' ? 'bg-[#D4AF37] text-black font-extrabold' : 'bg-white/5 hover:bg-white/10 text-gray-300'
            }`}
          >
            Dormant 14+ Days ({customerMetrics.filter((c) => c.daysSinceLastOrder >= 14 && c.orderCount > 0).length})
          </button>

          <button
            onClick={() => setSegment('vip')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              segment === 'vip' ? 'bg-[#D4AF37] text-black font-extrabold' : 'bg-white/5 hover:bg-white/10 text-gray-300'
            }`}
          >
            High Spend &gt; ₹2k ({customerMetrics.filter((c) => c.totalSpend >= 2000).length})
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
                <th className="p-4">Mobile Number</th>
                <th className="p-4">Total Orders</th>
                <th className="p-4">Total Spend</th>
                <th className="p-4">Last Order</th>
                <th className="p-4 text-right">AI Engagement Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-gray-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
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
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-white/10 text-white">
                        {cust.orderCount} order{cust.orderCount === 1 ? '' : 's'}
                      </span>
                    </td>

                    <td className="p-4 font-black text-white">
                      ₹{cust.totalSpend.toLocaleString('en-IN')}
                    </td>

                    <td className="p-4">
                      {cust.lastOrderDate ? (
                        <div>
                          <div className="text-gray-300 font-medium">
                            {cust.lastOrderDate.toISOString().split('T')[0]}
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
                      <div className="flex items-center justify-end gap-2">
                        {cust.orderCount === 0 ? (
                          <button
                            onClick={() => {
                              onSelectCustomerForMessage(cust, 'New Customer Promotion');
                              onNavigateTab('generator');
                            }}
                            className="px-2.5 py-1.5 bg-[#D4AF37]/20 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-black font-bold rounded text-[11px] transition-colors"
                          >
                            🎁 First-Order Welcome Offer
                          </button>
                        ) : cust.daysSinceLastOrder >= 14 ? (
                          <button
                            onClick={() => {
                              onSelectCustomerForMessage(cust, 'Repeat Order Reminder');
                              onNavigateTab('generator');
                            }}
                            className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-black font-bold rounded text-[11px] transition-colors"
                          >
                            🔄 Winback Reminder
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              onSelectCustomerForMessage(cust, 'Repeat Order Reminder');
                              onNavigateTab('generator');
                            }}
                            className="px-2.5 py-1.5 bg-purple-500/20 hover:bg-purple-500 text-purple-400 hover:text-white font-bold rounded text-[11px] transition-colors"
                          >
                            💬 Weekend Feast Draft
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
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <h4 className="text-white font-bold text-xs uppercase text-gray-400 mb-2">Recent Order History</h4>
              {activeCustomer.recentOrders.length === 0 ? (
                <div className="p-4 bg-black/40 rounded-xl text-center text-xs text-gray-500 border border-white/5">
                  No previous orders placed yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {activeCustomer.recentOrders.map((ord: any) => (
                    <div key={ord.id} className="p-3 bg-black/40 border border-white/5 rounded-lg text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold">Order #{ord.id.slice(-6)}</span>
                        <span className="text-emerald-400 font-bold">₹{ord.total}</span>
                      </div>
                      <div className="text-gray-400 text-[11px]">
                        Status: <span className="text-gray-200">{ord.status}</span> • Date: {new Date(ord.created_at).toLocaleDateString()}
                      </div>
                      {ord.delivery_address && (
                        <div className="text-gray-500 text-[10px] truncate">
                          Address: {ord.delivery_address}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveCustomer(null)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectCustomerForMessage(activeCustomer, 'Repeat Order Reminder');
                  setActiveCustomer(null);
                  onNavigateTab('generator');
                }}
                className="px-4 py-2 bg-[#D4AF37] hover:bg-[#b5952f] text-black text-xs font-extrabold rounded-lg transition-colors"
              >
                Draft AI Engagement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
