"use client";

import React, { useState, useEffect } from 'react';
import {
  B2BPaperRate,
  B2BPricingRule,
  B2BRateHistoryEntry,
  ProductPricePreview,
  PricingMode,
  RoundingMethod,
  TARGET_CHICKEN_PRODUCTS,
} from '@/lib/pricing/b2b-pricing-service';

interface DailyRateManagerProps {
  onNotify?: (message: string, type: 'success' | 'error') => void;
}

export default function DailyRateManager({ onNotify }: DailyRateManagerProps) {
  const [currentRate, setCurrentRate] = useState<B2BPaperRate | null>(null);
  const [rules, setRules] = useState<B2BPricingRule[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [unmatchedTargets, setUnmatchedTargets] = useState<typeof TARGET_CHICKEN_PRODUCTS>([]);
  const [history, setHistory] = useState<B2BRateHistoryEntry[]>([]);
  const [stats, setStats] = useState<any>({
    totalLinked: 0,
    totalManual: 0,
    totalOverridden: 0,
    isUpdatedToday: false,
    lastUpdatedIST: 'N/A',
  });

  const [inputRate, setInputRate] = useState<number | ''>('');
  const [previews, setPreviews] = useState<ProductPricePreview[]>([]);
  const [customMultipliers, setCustomMultipliers] = useState<Record<string, number>>({});
  const [dirtyMultipliers, setDirtyMultipliers] = useState<Record<string, number>>({});
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [isSavingAll, setIsSavingAll] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [isRollingBack, setIsRollingBack] = useState<boolean>(false);

  // Modals
  const [showPublishModal, setShowPublishModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState<boolean>(false);
  const [whatsAppText, setWhatsAppText] = useState<string>('');
  const [editingRule, setEditingRule] = useState<B2BPricingRule | null>(null);
  const [showLinkProductModal, setShowLinkProductModal] = useState<boolean>(false);
  const [selectedProductIdToLink, setSelectedProductIdToLink] = useState<string>('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedModeFilter, setSelectedModeFilter] = useState<string>('all');

  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    if (onNotify) onNotify(msg, type);
    else alert(msg);
  };

  // Fetch initial data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/b2b-rates');
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Failed to fetch rates');

      setCurrentRate(json.currentRate);
      setRules(json.rules || []);
      setProducts(json.products || []);
      setAvailableProducts(json.availableProducts || []);
      setUnmatchedTargets(json.unmatchedTargets || []);
      setHistory(json.history || []);
      setStats(json.stats || {});

      const curRate = json.currentRate?.current_rate || 140;
      setInputRate(curRate);

      // Fetch initial preview
      fetchPreview(curRate);
    } catch (err: any) {
      notify(err.message || 'Error loading pricing data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch preview when paper rate or multipliers change
  const fetchPreview = async (rate: number, multipliers: Record<string, number> = customMultipliers) => {
    if (!rate || rate <= 0) return;
    try {
      const customRules = Object.entries(multipliers).map(([productId, mult]) => ({
        product_id: productId,
        multiplier: mult,
      }));

      const res = await fetch('/api/admin/b2b-rates/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperRate: rate, customRules }),
      });
      const json = await res.json();
      if (res.ok && json.previews) {
        setPreviews(json.previews);
      }
    } catch (err) {
      console.error('Preview error:', err);
    }
  };

  const handleRateInputChange = (val: string) => {
    const num = parseFloat(val);
    if (val === '') {
      setInputRate('');
      return;
    }
    if (!isNaN(num)) {
      setInputRate(num);
      fetchPreview(num, customMultipliers);
    }
  };

  const handleMultiplierChange = (productId: string, val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const updated = { ...customMultipliers, [productId]: num };
      setCustomMultipliers(updated);

      const existingRule = rules.find((r) => r.product_id === productId);
      const originalMult = existingRule ? Number(existingRule.multiplier) : 1.6;

      if (Math.abs(num - originalMult) > 0.001) {
        setDirtyMultipliers((prev) => ({ ...prev, [productId]: num }));
      } else {
        setDirtyMultipliers((prev) => {
          const next = { ...prev };
          delete next[productId];
          return next;
        });
      }

      if (typeof inputRate === 'number' && inputRate > 0) {
        fetchPreview(inputRate, updated);
      }
    }
  };

  // Save Single Multiplier to Database (without publishing live selling price)
  const handleSaveSingleMultiplier = async (productId: string) => {
    const mult = customMultipliers[productId];
    if (mult === undefined) return;
    setSavingProductId(productId);
    try {
      const existingRule = rules.find((r) => r.product_id === productId);
      const res = await fetch('/api/admin/b2b-rates/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          rule: {
            multiplier: mult,
            product_name: existingRule?.product_name,
            pricing_mode: existingRule?.pricing_mode || 'multiplier',
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Failed to save multiplier');

      // Update rules state so DB value is reflected
      setRules((prev) =>
        prev.map((r) => (r.product_id === productId ? { ...r, multiplier: mult } : r))
      );

      // Clear from dirty
      setDirtyMultipliers((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });

      const prodName = existingRule?.product_name || 'Product';
      notify(`Saved multiplier ${mult}x for ${prodName} to database!`);
    } catch (err: any) {
      notify(err.message || 'Failed to save multiplier', 'error');
    } finally {
      setSavingProductId(null);
    }
  };

  // Save All Unsaved Multipliers in Bulk (without publishing live prices)
  const handleSaveAllMultipliers = async () => {
    const entries = Object.entries(dirtyMultipliers);
    if (entries.length === 0) return;
    setIsSavingAll(true);
    try {
      const bulkRules = entries.map(([pId, mult]) => {
        const existingRule = rules.find((r) => r.product_id === pId);
        return {
          productId: pId,
          multiplier: mult,
          product_name: existingRule?.product_name,
          pricing_mode: existingRule?.pricing_mode || 'multiplier',
        };
      });

      const res = await fetch('/api/admin/b2b-rates/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulkRules }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Failed to save multipliers');

      // Update rules state
      const updatedMap = new Map(entries);
      setRules((prev) =>
        prev.map((r) =>
          updatedMap.has(r.product_id) ? { ...r, multiplier: updatedMap.get(r.product_id)! } : r
        )
      );

      setDirtyMultipliers({});
      notify(`Successfully saved ${entries.length} product multipliers to database!`);
    } catch (err: any) {
      notify(err.message || 'Failed to save multipliers', 'error');
    } finally {
      setIsSavingAll(false);
    }
  };

  // Discard Unsaved Multiplier Changes
  const handleDiscardChanges = () => {
    setCustomMultipliers({});
    setDirtyMultipliers({});
    if (typeof inputRate === 'number' && inputRate > 0) {
      fetchPreview(inputRate, {});
    }
    notify('Discarded unsaved multiplier changes.');
  };

  // Publish Rates
  const handlePublish = async () => {
    if (typeof inputRate !== 'number' || inputRate <= 0) {
      notify('Please enter a valid paper rate.', 'error');
      return;
    }
    setIsPublishing(true);
    try {
      const res = await fetch('/api/admin/b2b-rates/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paperRate: inputRate,
          customMultipliers,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Publish failed');

      notify(`Successfully published daily chicken rate ₹${inputRate}/kg across ${json.updatedProductsCount} products!`);
      setShowPublishModal(false);
      setCustomMultipliers({});
      fetchData();
    } catch (err: any) {
      notify(err.message || 'Failed to publish rates', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  // Rollback Rate
  const handleRollback = async (historyId: string) => {
    if (!confirm('Are you sure you want to restore this previous rate snapshot? This will immediately update B2B product prices.')) return;
    setIsRollingBack(true);
    try {
      const res = await fetch('/api/admin/b2b-rates/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historyId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Rollback failed');

      notify(`Restored paper rate to ₹${json.restoredRate}/kg across ${json.restoredProductsCount} products.`);
      setShowHistoryModal(false);
      fetchData();
    } catch (err: any) {
      notify(err.message || 'Rollback failed', 'error');
    } finally {
      setIsRollingBack(false);
    }
  };

  // Save Rule
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    try {
      const res = await fetch('/api/admin/b2b-rates/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: editingRule.product_id,
          rule: editingRule,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Failed to save rule');

      notify(`Updated pricing rule for ${editingRule.product_name}.`);
      setEditingRule(null);
      fetchData();
    } catch (err: any) {
      notify(err.message || 'Error saving rule', 'error');
    }
  };

  // Link New Product
  const handleLinkProduct = async () => {
    if (!selectedProductIdToLink) return;
    const prod = availableProducts.find((p) => p.id === selectedProductIdToLink);
    if (!prod) return;

    try {
      const newRule: Partial<B2BPricingRule> = {
        product_id: prod.id,
        product_name: prod.name,
        pricing_mode: 'multiplier',
        paper_rate_source: 'chicken',
        multiplier: 1.60,
        fixed_addition: 0,
        rounding_method: 'nearest_1',
        is_dynamic_enabled: true,
        is_confirmed_by_owner: false,
      };

      const res = await fetch('/api/admin/b2b-rates/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: prod.id,
          rule: newRule,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Failed to link product');

      notify(`Linked ${prod.name} to Dynamic Daily Paper Rates!`);
      setShowLinkProductModal(false);
      setSelectedProductIdToLink('');
      fetchData();
    } catch (err: any) {
      notify(err.message || 'Failed to link product', 'error');
    }
  };

  // Generate WhatsApp Rate List
  const handleOpenWhatsAppModal = async () => {
    try {
      const res = await fetch('/api/b2b/rate-list');
      const json = await res.json();
      if (res.ok && json.plainText) {
        setWhatsAppText(json.plainText);
        setShowWhatsAppModal(true);
      }
    } catch (err) {
      notify('Failed to generate rate list', 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    notify('Rate list copied to clipboard! Ready to paste into WhatsApp.');
  };

  // Filtered previews
  const filteredPreviews = previews.filter((p) => {
    const matchesSearch = p.productName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMode = selectedModeFilter === 'all' || p.pricingMode === selectedModeFilter;
    return matchesSearch && matchesMode;
  });

  const dirtyCount = Object.keys(dirtyMultipliers).length;

  return (
    <div className="space-y-6 w-full max-w-full min-w-0 overflow-x-hidden text-white">
      {/* 1. Header Banner & Status Cards */}
      <div className="bg-[#111111] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl min-w-0">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-white/10 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <span className="text-xl sm:text-2xl shrink-0">🍗</span>
              <h2 className="text-base sm:text-xl md:text-2xl font-black tracking-tight text-white truncate">
                B2B Dynamic Daily Paper Rate Manager
              </h2>
            </div>
            <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
              Centralized chicken paper rate pricing engine. Automatically calculates and publishes wholesale prices across all linked cuts.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto shrink-0">
            <button
              onClick={() => setShowHistoryModal(true)}
              className="flex-1 sm:flex-initial px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-xl transition-all border border-white/10 flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <span>📜</span> Rate History
            </button>
            <button
              onClick={handleOpenWhatsAppModal}
              className="flex-1 sm:flex-initial px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 text-white whitespace-nowrap"
            >
              <span>💬</span> WhatsApp Rate List
            </button>
            <button
              onClick={() => setShowLinkProductModal(true)}
              className="flex-1 sm:flex-initial px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-xl transition-all border border-white/10 flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <span>➕</span> Link Product
            </button>
          </div>
        </div>

        {/* 2. Top KPI Indicator Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-4 min-w-0">
          <div className="bg-neutral-900/80 border border-white/5 rounded-xl p-3 min-w-0">
            <div className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider truncate">Status Today</div>
            <div className="flex items-center gap-2 mt-1 min-w-0">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${stats.isUpdatedToday ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              <span className="text-xs sm:text-sm font-black text-white truncate">
                {stats.isUpdatedToday ? "Today's Rate Published" : 'Update Pending'}
              </span>
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5 truncate">{stats.lastUpdatedIST}</div>
          </div>

          <div className="bg-neutral-900/80 border border-white/5 rounded-xl p-3 min-w-0">
            <div className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider truncate">Published Rate</div>
            <div className="text-base sm:text-xl font-black text-[#D4AF37] mt-1 truncate">
              ₹{currentRate?.current_rate || 140}<span className="text-xs text-neutral-400 font-normal">/kg</span>
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5 truncate">
              Prev: ₹{currentRate?.previous_rate || 135}/kg
            </div>
          </div>

          <div className="bg-neutral-900/80 border border-white/5 rounded-xl p-3 min-w-0">
            <div className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider truncate">Linked Products</div>
            <div className="text-base sm:text-xl font-black text-white mt-1 truncate">
              {stats.totalLinked} <span className="text-xs text-emerald-400 font-bold">Dynamic</span>
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5 truncate">
              {stats.totalManual} Manual • {stats.totalOverridden} Overridden
            </div>
          </div>

          <div className="bg-neutral-900/80 border border-white/5 rounded-xl p-3 min-w-0">
            <div className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider truncate">Catalogue Coverage</div>
            <div className="text-base sm:text-xl font-black text-white mt-1 truncate">
              {rules.length} / {rules.length + unmatchedTargets.length}
            </div>
            <div className="text-[10px] text-amber-400 mt-0.5 truncate">
              {unmatchedTargets.length} target cuts pending in catalogue
            </div>
          </div>
        </div>
      </div>

      {/* 3. Paper Rate Input & Quick Actions Box */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-[#1A1810] border border-[#D4AF37]/30 rounded-2xl p-4 sm:p-5 shadow-xl min-w-0">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 sm:gap-5 min-w-0">
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-black uppercase tracking-wider text-[#D4AF37] mb-2 flex items-center gap-2">
              <span>⚡</span> Enter Today's Chicken Paper Rate (₹/kg)
            </label>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="relative flex-1 max-w-xs min-w-0">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-black text-base">₹</span>
                <input
                  type="number"
                  step="0.5"
                  min="50"
                  max="500"
                  value={inputRate}
                  onChange={(e) => handleRateInputChange(e.target.value)}
                  placeholder="e.g. 140"
                  className="w-full pl-8 pr-4 py-2.5 sm:py-3 bg-black border border-white/20 rounded-xl text-lg sm:text-2xl font-black text-white focus:outline-none focus:border-[#D4AF37] transition-all shadow-inner"
                />
              </div>

              <button
                onClick={() => fetchPreview(Number(inputRate) || 140)}
                className="px-3 sm:px-4 py-2.5 sm:py-3 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-xl border border-white/10 transition-colors whitespace-nowrap shrink-0"
              >
                🔄 Refresh
              </button>
            </div>
            <div className="text-[11px] text-neutral-400 mt-2 flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
              <span className="truncate">Formula: <code className="text-[#D4AF37]">B2B Price = Paper Rate × Multiplier</code></span>
              <span className="hidden sm:inline">•</span>
              <span>Effective: <strong className="text-white">{stats.todayDate}</strong></span>
              <span className="hidden sm:inline">•</span>
              <span className="text-emerald-400 font-medium">Exclusively B2B</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 shrink-0 w-full sm:w-auto">
            {dirtyCount > 0 && (
              <button
                onClick={handleDiscardChanges}
                className="w-full sm:w-auto px-3.5 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs rounded-xl border border-white/10 transition-colors flex items-center justify-center gap-1.5 active:scale-95"
                title="Discard unsaved multiplier edits"
              >
                <span>🔄</span> Discard ({dirtyCount})
              </button>
            )}

            <button
              onClick={handleSaveAllMultipliers}
              disabled={isSavingAll || dirtyCount === 0}
              className={`w-full sm:w-auto px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                dirtyCount > 0
                  ? 'bg-neutral-100 hover:bg-white text-black shadow-lg shadow-white/10 cursor-pointer active:scale-95'
                  : 'bg-neutral-800/60 text-neutral-500 cursor-not-allowed border border-white/5'
              }`}
              title="Save all modified multipliers to database without publishing live prices"
            >
              <span>💾</span> {isSavingAll ? 'Saving Multipliers...' : `Save All Multipliers ${dirtyCount > 0 ? `(${dirtyCount})` : ''}`}
            </button>

            <button
              onClick={() => setShowPublishModal(true)}
              disabled={isPublishing || !inputRate || Number(inputRate) <= 0}
              className="w-full sm:w-auto px-5 sm:px-6 py-3 sm:py-3.5 bg-[#D4AF37] hover:bg-[#bfa035] disabled:opacity-50 disabled:cursor-not-allowed text-black font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-gold/20 flex items-center justify-center gap-2 active:scale-95"
            >
              <span>🚀</span> Publish All B2B Rates
            </button>
          </div>
        </div>
      </div>

      {/* 4. Target Catalogue Matching Notice */}
      {unmatchedTargets.length > 0 && (
        <div className="bg-[#18150D] border border-amber-500/30 rounded-2xl p-3.5 sm:p-4 text-xs min-w-0 overflow-hidden">
          <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
            <span className="text-lg sm:text-xl shrink-0">ℹ️</span>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-amber-300 text-xs sm:text-sm mb-1 truncate">
                Target Chicken Catalogue Notice ({unmatchedTargets.length} Unmatched Target Cuts)
              </div>
              <p className="text-neutral-300 leading-relaxed text-[11px] sm:text-xs">
                The 10 chicken cuts defined by the owner include <strong className="text-white">Chicken Curry Cut</strong> (Multiplier: 1.60 confirmed) and <strong className="text-white">Chicken Breast Boneless</strong> (Multiplier: 2.30 confirmed). The remaining cuts below are illustrative and currently not in your live catalogue:
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2.5 min-w-0">
                {unmatchedTargets.map((t) => (
                  <span
                    key={t.name}
                    className="px-2 py-0.5 rounded-md bg-black/40 border border-white/5 text-[10px] sm:text-[11px] text-neutral-300 flex items-center gap-1"
                  >
                    <span>{t.name}</span>
                    <span className="text-[#D4AF37] font-mono">({t.defaultMultiplier}x)</span>
                  </span>
                ))}
              </div>
              <div className="text-[10px] sm:text-[11px] text-neutral-400 mt-2">
                Whenever you add these cuts in <em>Product CRUD Management</em>, they will immediately appear here ready to link.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 bg-[#111111] p-3 rounded-xl border border-white/5 min-w-0">
        <div className="relative w-full sm:w-72 min-w-0">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search linked products..."
            className="w-full pl-8 pr-3 py-1.5 bg-neutral-900 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-gold"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
          <span className="text-xs text-neutral-400 whitespace-nowrap font-medium shrink-0">Pricing Mode:</span>
          <select
            value={selectedModeFilter}
            onChange={(e) => setSelectedModeFilter(e.target.value)}
            className="flex-1 sm:flex-initial px-2.5 py-1.5 bg-neutral-900 border border-white/10 rounded-lg text-xs text-white focus:outline-none min-w-0"
          >
            <option value="all">All Modes ({previews.length})</option>
            <option value="multiplier">Mode A (Multiplier)</option>
            <option value="fixed_addition">Mode B (Fixed Addition)</option>
            <option value="multiplier_fixed_addition">Mode C (Multiplier + Fixed)</option>
            <option value="manual">Mode D (Manual Fixed)</option>
          </select>
        </div>
      </div>

      {/* 6. Dynamic Pricing Preview Table */}
      <div className="bg-[#111111] border border-white/5 rounded-2xl overflow-hidden shadow-2xl min-w-0">
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 min-w-0">
          <h3 className="font-extrabold text-xs sm:text-base text-white flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span>📊</span> <span className="truncate">Rate Preview ({filteredPreviews.length} Products Linked)</span>
          </h3>
          <span className="text-xs text-neutral-400 shrink-0">
            Rate: <strong className="text-gold font-mono">₹{inputRate || 0}/kg</strong>
          </span>
        </div>

        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto min-w-0">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/80 text-neutral-400 text-[10px] uppercase font-bold border-b border-white/5">
              <tr>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-3">Mode</th>
                <th className="py-3 px-3">Multiplier</th>
                <th className="py-3 px-3">Rounding</th>
                <th className="py-3 px-3 text-right">Current B2B</th>
                <th className="py-3 px-3 text-right">Calculated New</th>
                <th className="py-3 px-3 text-right">Difference</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredPreviews.map((p) => {
                const isDecreased = p.difference < 0;
                const isIncreased = p.difference > 0;
                const rule = rules.find((r) => r.product_id === p.productId);

                return (
                  <tr key={p.productId} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.productName} className="w-9 h-9 rounded-lg object-cover border border-white/10" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-neutral-800 flex items-center justify-center text-xs">🍗</div>
                        )}
                        <div>
                          <div className="font-bold text-white text-xs">{p.productName}</div>
                          <div className="text-[10px] text-neutral-400">{p.category} • per {p.unit}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 border border-white/10 text-neutral-300">
                        {p.pricingMode === 'multiplier' && 'Mode A (Multiplier)'}
                        {p.pricingMode === 'fixed_addition' && 'Mode B (+Fixed)'}
                        {p.pricingMode === 'multiplier_fixed_addition' && 'Mode C (Mult+Fixed)'}
                        {p.pricingMode === 'manual' && 'Mode D (Manual)'}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5 max-w-[90px]">
                        <input
                          type="number"
                          step="0.05"
                          min="0.1"
                          max="10"
                          value={customMultipliers[p.productId] !== undefined ? customMultipliers[p.productId] : p.multiplier}
                          onChange={(e) => handleMultiplierChange(p.productId, e.target.value)}
                          className="w-16 px-2 py-1 bg-black border border-white/20 rounded text-xs font-mono font-bold text-center text-gold focus:outline-none focus:border-gold"
                        />
                        <span className="text-[11px] text-neutral-500 font-bold">x</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="text-[11px] text-neutral-400 font-mono">
                        {p.roundingMethod}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-bold text-neutral-300">
                      ₹{p.currentB2BPrice}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-black text-sm text-white">
                      ₹{p.calculatedNewPrice}
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      {p.difference === 0 ? (
                        <span className="text-neutral-500 font-mono text-[11px] font-bold">0</span>
                      ) : isDecreased ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[11px] font-black">
                          ↓ ₹{Math.abs(p.difference)} ({p.percentChange}%)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 font-mono text-[11px] font-black">
                          ↑ ₹{p.difference} (+{p.percentChange}%)
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      {p.isOverrideActive ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Override Active
                        </span>
                      ) : p.isDynamicEnabled ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Dynamic
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-400 border border-white/5">
                          Fixed
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {dirtyMultipliers[p.productId] !== undefined && (
                          <button
                            onClick={() => handleSaveSingleMultiplier(p.productId)}
                            disabled={savingProductId === p.productId}
                            className="px-2.5 py-1 bg-[#D4AF37] hover:bg-[#bfa035] text-black font-black rounded-lg text-xs transition-all flex items-center gap-1 shadow-md shadow-gold/20 active:scale-95"
                            title="Save this product multiplier to database without publishing prices"
                          >
                            <span>{savingProductId === p.productId ? '⏳' : '💾'}</span> Save
                          </button>
                        )}
                        <button
                          onClick={() => rule && setEditingRule(rule)}
                          className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-neutral-200 transition-colors"
                        >
                          ⚙️ Configure
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View Cards (for screens < 768px) */}
        <div className="md:hidden divide-y divide-white/5 min-w-0 overflow-hidden">
          {filteredPreviews.map((p) => {
            const isDecreased = p.difference < 0;
            const isIncreased = p.difference > 0;
            const rule = rules.find((r) => r.product_id === p.productId);

            return (
              <div key={p.productId} className="p-3.5 sm:p-4 space-y-2.5 min-w-0">
                <div className="flex items-center justify-between gap-2.5 min-w-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.productName} className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-cover border border-white/10 shrink-0" />
                    ) : (
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-neutral-800 flex items-center justify-center text-sm shrink-0">🍗</div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-white text-xs truncate">{p.productName}</div>
                      <div className="text-[10px] text-neutral-400 truncate">{p.category} • per {p.unit}</div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[11px] text-neutral-400 line-through">₹{p.currentB2BPrice}</div>
                    <div className="text-sm sm:text-base font-black text-white font-mono">₹{p.calculatedNewPrice}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-1.5 bg-black/40 p-2 sm:p-2.5 rounded-xl border border-white/5 text-xs min-w-0">
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] sm:text-[11px] text-neutral-400 font-bold">Mult:</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0.1"
                      max="10"
                      value={customMultipliers[p.productId] !== undefined ? customMultipliers[p.productId] : p.multiplier}
                      onChange={(e) => handleMultiplierChange(p.productId, e.target.value)}
                      className="w-12 sm:w-14 px-1 py-0.5 bg-neutral-900 border border-white/20 rounded text-center text-xs font-mono font-black text-gold"
                    />
                    <span className="text-[10px] text-neutral-500 font-bold">x</span>
                  </div>

                  <div className="min-w-0">
                    {p.difference === 0 ? (
                      <span className="text-neutral-500 font-mono text-[10px] sm:text-[11px]">No change</span>
                    ) : isDecreased ? (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] sm:text-[11px] font-black">
                        ↓ ₹{Math.abs(p.difference)}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 font-mono text-[10px] sm:text-[11px] font-black">
                        ↑ ₹{p.difference}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {dirtyMultipliers[p.productId] !== undefined && (
                      <button
                        onClick={() => handleSaveSingleMultiplier(p.productId)}
                        disabled={savingProductId === p.productId}
                        className="px-2 py-1 bg-[#D4AF37] hover:bg-[#bfa035] text-black font-black rounded text-[11px] transition-all flex items-center gap-0.5 shadow-sm active:scale-95"
                        title="Save multiplier to database"
                      >
                        <span>{savingProductId === p.productId ? '⏳' : '💾'}</span> Save
                      </button>
                    )}
                    <button
                      onClick={() => rule && setEditingRule(rule)}
                      className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] sm:text-[11px] font-bold text-white shrink-0"
                    >
                      ⚙️ Edit
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 7. Publish Confirmation Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>🚀</span> Confirm B2B Rate Publication
              </h3>
              <button onClick={() => setShowPublishModal(false)} className="text-neutral-400 hover:text-white text-lg">✕</button>
            </div>

            <div className="bg-[#1C1A14] border border-[#D4AF37]/30 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Previous Paper Rate:</span>
                <span className="font-mono font-bold text-neutral-300">₹{currentRate?.current_rate || 140}/kg</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#D4AF37] font-bold">New Proposed Rate:</span>
                <span className="font-mono font-black text-base text-[#D4AF37]">₹{inputRate}/kg</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Products to Update:</span>
                <span className="font-bold text-white">{previews.length} B2B products</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Effective Date:</span>
                <span className="font-bold text-white">{stats.todayDate}</span>
              </div>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-none text-xs">
              <div className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider">Affected Products & Prices</div>
              {previews.map((p) => (
                <div key={p.productId} className="flex justify-between items-center py-1.5 px-2 bg-neutral-900 rounded border border-white/5">
                  <span className="font-bold text-white truncate max-w-[180px]">{p.productName}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-neutral-400 line-through text-[11px]">₹{p.currentB2BPrice}</span>
                    <span className="text-white font-black">₹{p.calculatedNewPrice}</span>
                    <span className={`text-[10px] ${p.difference >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      ({p.difference >= 0 ? `+${p.difference}` : p.difference})
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-[11px] text-red-300 leading-relaxed">
              ⚠️ <strong>Atomic Confirmation:</strong> Publishing will update <code>price_b2b</code> on all linked catalogue products instantly. B2C retail prices and historical orders will remain strictly untouched.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={isPublishing}
                className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#bfa035] text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2"
              >
                {isPublishing ? 'Publishing...' : 'Yes, Publish Rates Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Configure Product Pricing Rule Modal */}
      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <form onSubmit={handleSaveRule} className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>⚙️</span> Configure: {editingRule.product_name}
              </h3>
              <button type="button" onClick={() => setEditingRule(null)} className="text-neutral-400 hover:text-white text-lg">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 font-bold mb-1">Pricing Mode</label>
                <select
                  value={editingRule.pricing_mode}
                  onChange={(e) => setEditingRule({ ...editingRule, pricing_mode: e.target.value as PricingMode })}
                  className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold"
                >
                  <option value="multiplier">Mode A — Daily Paper Rate × Multiplier</option>
                  <option value="fixed_addition">Mode B — Daily Paper Rate + Fixed Amount</option>
                  <option value="multiplier_fixed_addition">Mode C — (Daily Paper Rate × Multiplier) + Fixed Amount</option>
                  <option value="manual">Mode D — Fixed Manual Price (Non-Dynamic)</option>
                </select>
              </div>

              {(editingRule.pricing_mode === 'multiplier' || editingRule.pricing_mode === 'multiplier_fixed_addition') && (
                <div>
                  <label className="block text-neutral-400 font-bold mb-1">Product Multiplier</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="10"
                    required
                    value={editingRule.multiplier}
                    onChange={(e) => setEditingRule({ ...editingRule, multiplier: parseFloat(e.target.value) || 1.0 })}
                    className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-white font-mono font-bold"
                  />
                </div>
              )}

              {(editingRule.pricing_mode === 'fixed_addition' || editingRule.pricing_mode === 'multiplier_fixed_addition') && (
                <div>
                  <label className="block text-neutral-400 font-bold mb-1">Additional Fixed Amount (₹)</label>
                  <input
                    type="number"
                    step="1"
                    value={editingRule.fixed_addition}
                    onChange={(e) => setEditingRule({ ...editingRule, fixed_addition: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-white font-mono"
                  />
                </div>
              )}

              {editingRule.pricing_mode === 'manual' && (
                <div>
                  <label className="block text-neutral-400 font-bold mb-1">Manual Fixed Wholesale Price (₹)</label>
                  <input
                    type="number"
                    step="1"
                    value={editingRule.manual_price || ''}
                    onChange={(e) => setEditingRule({ ...editingRule, manual_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-white font-mono font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block text-neutral-400 font-bold mb-1">Rounding Method</label>
                <select
                  value={editingRule.rounding_method}
                  onChange={(e) => setEditingRule({ ...editingRule, rounding_method: e.target.value as RoundingMethod })}
                  className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-white"
                >
                  <option value="nearest_1">Nearest ₹1 (e.g. ₹228.80 → ₹229)</option>
                  <option value="nearest_5">Nearest ₹5 (e.g. ₹228.80 → ₹230)</option>
                  <option value="nearest_10">Nearest ₹10 (e.g. ₹228.80 → ₹230)</option>
                  <option value="ceil_5">Round Upward to Nearest ₹5</option>
                  <option value="ceil_10">Round Upward to Nearest ₹10</option>
                  <option value="exact">Exact Calculated Decimal</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 font-bold mb-1">Minimum Floor Price (Optional ₹)</label>
                <input
                  type="number"
                  step="1"
                  placeholder="e.g. 150 (protects against negative/extreme paper rate drops)"
                  value={editingRule.min_selling_price || ''}
                  onChange={(e) => setEditingRule({ ...editingRule, min_selling_price: parseFloat(e.target.value) || null })}
                  className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-white font-mono"
                />
              </div>

              <div className="pt-2 border-t border-white/10">
                <div className="font-extrabold text-amber-300 text-xs mb-2">Temporary Manual Override</div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="override_enabled"
                    checked={editingRule.manual_override_enabled}
                    onChange={(e) => setEditingRule({ ...editingRule, manual_override_enabled: e.target.checked })}
                    className="rounded text-gold focus:ring-0"
                  />
                  <label htmlFor="override_enabled" className="text-neutral-300 font-bold">
                    Enable Temporary Manual Override
                  </label>
                </div>

                {editingRule.manual_override_enabled && (
                  <div className="space-y-2 p-3 bg-neutral-950 rounded-xl border border-white/5">
                    <div>
                      <label className="block text-[11px] text-neutral-400 mb-1">Override Price (₹/kg)</label>
                      <input
                        type="number"
                        required
                        value={editingRule.manual_override_price || ''}
                        onChange={(e) => setEditingRule({ ...editingRule, manual_override_price: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2.5 py-1.5 bg-neutral-900 border border-white/10 rounded text-xs font-mono font-bold text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-neutral-400 mb-1">Reason for Override</label>
                      <input
                        type="text"
                        placeholder="e.g. Bulk hotel promotion or spot supply rate"
                        value={editingRule.manual_override_reason || ''}
                        onChange={(e) => setEditingRule({ ...editingRule, manual_override_reason: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-neutral-900 border border-white/10 rounded text-xs text-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#bfa035] text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95"
              >
                Save Pricing Rule
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 9. Link Product Modal */}
      {showLinkProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>➕</span> Link Catalogue Product to Daily Rates
              </h3>
              <button onClick={() => setShowLinkProductModal(false)} className="text-neutral-400 hover:text-white text-lg">✕</button>
            </div>

            <p className="text-neutral-300">
              Select an existing catalogue product to enable automatic Daily Chicken Paper Rate pricing:
            </p>

            {availableProducts.length === 0 ? (
              <div className="p-4 bg-neutral-900 rounded-xl text-center text-neutral-400">
                All existing products in your catalogue are already linked!
              </div>
            ) : (
              <div>
                <label className="block text-neutral-400 font-bold mb-1.5">Select Product</label>
                <select
                  value={selectedProductIdToLink}
                  onChange={(e) => setSelectedProductIdToLink(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-white text-xs"
                >
                  <option value="">-- Choose a product --</option>
                  {availableProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category}) — Current B2B: ₹{p.price_b2b}/{p.unit}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowLinkProductModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedProductIdToLink}
                onClick={handleLinkProduct}
                className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#bfa035] disabled:opacity-50 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95"
              >
                Link Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Publication History & Rollback Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-2xl p-5 max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>📜</span> Daily Rate Publication History
              </h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-neutral-400 hover:text-white text-lg">✕</button>
            </div>

            <p className="text-neutral-400 text-xs">
              Every publication is captured as an immutable audit record. You can restore any past rate list with one click.
            </p>

            <div className="divide-y divide-white/5 border border-white/5 rounded-xl overflow-hidden bg-neutral-900/60">
              {history.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 text-xs">No publication history found.</div>
              ) : (
                history.map((h, idx) => (
                  <div key={h.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-white/[0.02]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-[#D4AF37]">
                          ₹{h.paper_rate}/kg
                        </span>
                        {h.previous_paper_rate && (
                          <span className="text-[11px] text-neutral-400 font-mono">
                            (was ₹{h.previous_paper_rate}/kg)
                          </span>
                        )}
                        {idx === 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-1">
                        Effective: <strong className="text-white">{h.effective_date}</strong> • Published by {h.published_by}
                      </div>
                      <div className="text-[10px] text-neutral-500 mt-0.5">
                        {h.products_updated_count} products updated • {new Date(h.published_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {idx !== 0 && (
                        <button
                          onClick={() => handleRollback(h.id)}
                          disabled={isRollingBack}
                          className="px-3 py-1.5 bg-neutral-800 hover:bg-[#D4AF37] hover:text-black text-neutral-300 text-xs font-bold rounded-lg border border-white/10 transition-colors"
                        >
                          ↩️ Restore Rate
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-neutral-800 rounded-xl text-xs font-bold text-white hover:bg-neutral-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. WhatsApp Rate List Generator Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>💬</span> WhatsApp Daily Rate List
              </h3>
              <button onClick={() => setShowWhatsAppModal(false)} className="text-neutral-400 hover:text-white text-lg">✕</button>
            </div>

            <p className="text-neutral-400 text-xs">
              Customer-ready wholesale price broadcast text. Internal paper rates and multipliers are strictly excluded.
            </p>

            <textarea
              readOnly
              rows={12}
              value={whatsAppText}
              className="w-full p-3 bg-black border border-white/10 rounded-xl font-mono text-xs text-emerald-400 leading-relaxed focus:outline-none"
            />

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="px-4 py-2 bg-neutral-800 rounded-xl text-xs font-bold text-white hover:bg-neutral-700"
              >
                Close
              </button>
              <button
                onClick={() => copyToClipboard(whatsAppText)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 active:scale-95"
              >
                <span>📋</span> Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
