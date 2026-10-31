"use client";

import React, { useState } from 'react';
import { SalesSettingsMap } from './types';

interface SalesSettingsProps {
  settings: SalesSettingsMap;
  onSaveSetting: (key: string, value: string) => Promise<void>;
}

export default function SalesSettings({
  settings,
  onSaveSetting,
}: SalesSettingsProps) {
  const [businessName, setBusinessName] = useState(settings.business_name || 'MeatCity');
  const [businessHub, setBusinessHub] = useState(settings.business_hub || 'Shop No.2, Sector 20, Turbhe, Navi Mumbai - 400705');
  const [officialWhatsapp, setOfficialWhatsapp] = useState(settings.official_whatsapp || '917977630912');
  const [minB2bKg, setMinB2bKg] = useState(settings.min_b2b_order_kg || '10');
  const [wholesalePaymentTerms, setWholesalePaymentTerms] = useState(
    settings.wholesale_payment_terms || 'Cash on Delivery / UPI / 7-Day Verified Credit'
  );
  const [deliverySlots, setDeliverySlots] = useState(
    settings.delivery_slots || 'Morning 6:00 AM - 8:00 AM (Turbhe Sector 20 Hub)'
  );
  const [geminiApiKey, setGeminiApiKey] = useState(settings.gemini_api_key || '');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      await onSaveSetting('business_name', businessName);
      await onSaveSetting('business_hub', businessHub);
      await onSaveSetting('official_whatsapp', officialWhatsapp);
      await onSaveSetting('min_b2b_order_kg', minB2bKg);
      await onSaveSetting('wholesale_payment_terms', wholesalePaymentTerms);
      await onSaveSetting('delivery_slots', deliverySlots);
      if (geminiApiKey) {
        await onSaveSetting('gemini_api_key', geminiApiKey);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert('Error saving settings: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const hasApiKey = Boolean(geminiApiKey || process.env.NEXT_PUBLIC_HAS_GEMINI_KEY);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#111111] border border-white/5 p-5 rounded-xl">
        <h2 className="text-white font-black text-lg">Sales Agent Configuration & Settings</h2>
        <p className="text-gray-400 text-xs mt-1">
          Configure business operating parameters, wholesale terms, and Google Gemini API keys.
        </p>
      </div>

      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* Gemini API Key Box */}
        <div className="bg-[#141414] border border-[#D4AF37]/30 p-5 rounded-xl space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-extrabold text-sm flex items-center gap-2">
              <span>🤖</span> Google Gemini API Configuration
            </h3>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                hasApiKey ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {hasApiKey ? 'AI Connected' : 'Template Fallback Active'}
            </span>
          </div>

          <p className="text-gray-400 text-xs">
            Enter your Google Gemini API key to enable dynamic AI message generation and market research. The free tier of Gemini 1.5 Flash provides fast, high-quality generation at zero monthly cost.
          </p>

          <div>
            <label className="text-gray-300 text-xs font-semibold block mb-1">
              Gemini API Key (Server-Side Storage Only)
            </label>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              className="w-full bg-black/60 border border-white/10 text-white font-mono text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
            />
            <span className="text-gray-500 text-[11px] mt-1 block">
              Leave blank to preserve current environment key if already configured in .env.local.
            </span>
          </div>
        </div>

        {/* Commercial Wholesale Parameters */}
        <div className="bg-[#111111] border border-white/5 p-5 rounded-xl space-y-4">
          <h3 className="text-white font-extrabold text-sm flex items-center gap-2">
            <span>🏢</span> Wholesale Business Profile & Supply Parameters
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-300 text-xs font-semibold block mb-1">Business Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="text-gray-300 text-xs font-semibold block mb-1">Official WhatsApp Dispatch Number</label>
              <input
                type="text"
                value={officialWhatsapp}
                onChange={(e) => setOfficialWhatsapp(e.target.value)}
                className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="text-gray-300 text-xs font-semibold block mb-1">Turbhe Processing Hub Address</label>
              <input
                type="text"
                value={businessHub}
                onChange={(e) => setBusinessHub(e.target.value)}
                className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="text-gray-300 text-xs font-semibold block mb-1">Minimum B2B Order (Kg)</label>
              <input
                type="number"
                value={minB2bKg}
                onChange={(e) => setMinB2bKg(e.target.value)}
                className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="text-gray-300 text-xs font-semibold block mb-1">Default Wholesale Payment Terms</label>
              <input
                type="text"
                value={wholesalePaymentTerms}
                onChange={(e) => setWholesalePaymentTerms(e.target.value)}
                className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="text-gray-300 text-xs font-semibold block mb-1">Early Morning Dispatch Slots</label>
              <input
                type="text"
                value={deliverySlots}
                onChange={(e) => setDeliverySlots(e.target.value)}
                className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>
        </div>

        {/* Tone & Prompt Guidelines */}
        <div className="bg-[#111111] border border-white/5 p-5 rounded-xl space-y-2">
          <h3 className="text-white font-extrabold text-sm flex items-center gap-2">
            <span>🇮🇳</span> Roman Hinglish Tone Guidelines
          </h3>
          <p className="text-gray-400 text-xs leading-relaxed">
            MeatCity's AI Sales Agent is tuned for natural, respectful Indian retail and wholesale conversation. It uses respectful address (Namaste, Bhai, Ji), mentions fresh halal daily dressing from Turbhe Sector 20, highlights early morning dispatch before 8:00 AM, and ends with contact details.
          </p>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          {savedSuccess && (
            <span className="text-emerald-400 font-bold text-xs">
              ✓ Settings saved successfully!
            </span>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="ml-auto px-6 py-2.5 bg-[#D4AF37] hover:bg-[#b5952f] disabled:opacity-50 text-black font-black text-xs rounded-lg transition-colors shadow-lg"
          >
            {isSaving ? 'Saving Changes...' : 'Save Sales Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
