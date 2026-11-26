"use client";

import React, { useState } from 'react';
import LoyaltyOverview from './LoyaltyOverview';
import CustomerLoyalty from './CustomerLoyalty';
import RewardManager from './RewardManager';
import LoyaltySettings from './LoyaltySettings';
import LoyaltyReports from './LoyaltyReports';

const SUB_TABS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'customers', label: 'Customers', icon: '👥' },
  { id: 'rewards', label: 'Reward Catalog', icon: '🎁' },
  { id: 'settings', label: 'Program Settings', icon: '⚙️' },
  { id: 'reports', label: 'Retention & Reports', icon: '📈' },
];

export default function LoyaltyRoot() {
  const [activeSubTab, setActiveSubTab] = useState<string>('overview');

  return (
    <div className="space-y-6 w-full max-w-full min-w-0 overflow-x-hidden">
      {/* Sub-navigation tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-white/5 w-full max-w-full">
        {SUB_TABS.map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap active:scale-95 ${
                isActive
                  ? 'bg-gold text-black shadow-md shadow-gold/20'
                  : 'bg-neutral-900 text-text-secondary hover:text-white hover:bg-neutral-800 border border-white/5'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {activeSubTab === 'overview' && <LoyaltyOverview onNavigateTab={setActiveSubTab} />}
      {activeSubTab === 'customers' && <CustomerLoyalty />}
      {activeSubTab === 'rewards' && <RewardManager />}
      {activeSubTab === 'settings' && <LoyaltySettings />}
      {activeSubTab === 'reports' && <LoyaltyReports />}
    </div>
  );
}
