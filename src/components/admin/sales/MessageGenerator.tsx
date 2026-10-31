"use client";

import React, { useState, useEffect } from 'react';
import { SalesLead, SalesMessage } from './types';

interface MessageGeneratorProps {
  leads: SalesLead[];
  customers: any[];
  products: any[];
  selectedLead?: SalesLead | null;
  selectedCustomer?: any | null;
  initialPurpose?: string;
  onSaveMessage: (message: Omit<SalesMessage, 'id' | 'created_at'>) => Promise<void>;
  onNavigateTab: (tab: string) => void;
}

const B2B_PURPOSES = [
  'Introduction',
  'Wholesale Supply Enquiry',
  'Trial Order Proposal',
  'Quotation Follow-up',
  'Repeat Order Reminder',
];

const B2C_PURPOSES = [
  'Product Enquiry Reply',
  'New Customer Promotion',
  'Cart Recovery Draft',
  'Repeat Order Reminder',
];

export default function MessageGenerator({
  leads,
  customers,
  products,
  selectedLead,
  selectedCustomer,
  initialPurpose,
  onSaveMessage,
  onNavigateTab,
}: MessageGeneratorProps) {
  const [recipientType, setRecipientType] = useState<'b2b' | 'b2c'>(selectedCustomer ? 'b2c' : 'b2b');

  // Form selections
  const [leadId, setLeadId] = useState<string>(selectedLead?.id || '');
  const [customerId, setCustomerId] = useState<string>(selectedCustomer?.id || '');
  const [recipientName, setRecipientName] = useState<string>(selectedLead?.contact_person || selectedCustomer?.displayName || '');
  const [businessName, setBusinessName] = useState<string>(selectedLead?.business_name || '');
  const [category, setCategory] = useState<string>(selectedLead?.category || 'Restaurant');
  const [area, setArea] = useState<string>(selectedLead?.area || 'Vashi');
  const [recipientPhone, setRecipientPhone] = useState<string>(selectedLead?.phone || selectedCustomer?.contactPhone || '');

  const [purpose, setPurpose] = useState<string>(initialPurpose || 'Wholesale Supply Enquiry');
  const [language, setLanguage] = useState<'hinglish' | 'english'>('hinglish');
  const [customNotes, setCustomNotes] = useState<string>('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState<string>('');
  const [generatorMeta, setGeneratorMeta] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync when selectedLead prop changes
  useEffect(() => {
    if (selectedLead) {
      setRecipientType('b2b');
      setLeadId(selectedLead.id);
      setRecipientName(selectedLead.contact_person || selectedLead.business_name);
      setBusinessName(selectedLead.business_name);
      setCategory(selectedLead.category || 'Restaurant');
      setArea(selectedLead.area || 'Vashi');
      setRecipientPhone(selectedLead.phone || '');
      if (initialPurpose) setPurpose(initialPurpose);
    }
  }, [selectedLead, initialPurpose]);

  // Sync when selectedCustomer prop changes
  useEffect(() => {
    if (selectedCustomer) {
      setRecipientType('b2c');
      setCustomerId(selectedCustomer.id);
      setRecipientName(selectedCustomer.full_name || selectedCustomer.name || 'Customer');
      setBusinessName('');
      setRecipientPhone(selectedCustomer.phone || selectedCustomer.mobile || '');
      setPurpose(initialPurpose || 'New Customer Promotion');
    }
  }, [selectedCustomer, initialPurpose]);

  // Handle lead select dropdown change
  const handleLeadChange = (id: string) => {
    setLeadId(id);
    const found = leads.find((l) => l.id === id);
    if (found) {
      setRecipientName(found.contact_person || found.business_name);
      setBusinessName(found.business_name);
      setCategory(found.category || 'Restaurant');
      setArea(found.area || 'Vashi');
      setRecipientPhone(found.phone || '');
    }
  };

  // Handle customer select dropdown change
  const handleCustomerChange = (id: string) => {
    setCustomerId(id);
    const found = customers.find((c) => c.id === id);
    if (found) {
      setRecipientName(found.full_name || found.name || 'Valued Customer');
      setRecipientPhone(found.phone || found.mobile || '');
    }
  };

  // Trigger Gemini API generation
  const handleGenerate = async () => {
    if (!recipientName) {
      alert('Please specify a recipient name or select a lead/customer.');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/sales/generate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientType,
          recipientName,
          recipientPhone,
          businessName,
          category,
          area,
          purpose,
          language,
          customNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setGeneratedDraft(data.message);
        setGeneratorMeta(data.meta);
      } else {
        alert('Generation failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Network error generating message: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Submit to Approval Queue
  const handleSubmitToQueue = async () => {
    if (!generatedDraft.trim()) {
      alert('Cannot submit empty message.');
      return;
    }

    setIsSaving(true);
    try {
      await onSaveMessage({
        lead_id: recipientType === 'b2b' ? leadId || undefined : undefined,
        customer_id: recipientType === 'b2c' ? customerId || undefined : undefined,
        recipient_type: recipientType,
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
        channel: 'whatsapp',
        purpose,
        language,
        content: generatedDraft,
        status: 'PENDING_APPROVAL',
      });

      alert('Message successfully drafted to Approval Queue! Review it before manual sending.');
      onNavigateTab('approvals');
    } catch (err: any) {
      alert('Failed to save message: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Safety Notice Header */}
      <div className="bg-[#111111] border border-white/5 p-5 rounded-xl">
        <h2 className="text-white font-black text-lg">AI Sales Message Generator</h2>
        <p className="text-gray-400 text-xs mt-1">
          Draft highly personalized outreach grounded in real MeatCity products & prices. Every output is strictly held in <span className="text-[#D4AF37] font-bold">PENDING APPROVAL</span> status.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Parameters (7 Cols) */}
        <div className="lg:col-span-7 bg-[#111111] border border-white/5 p-5 rounded-xl space-y-4">
          {/* Target Audience Switch */}
          <div>
            <label className="text-gray-300 text-xs font-semibold block mb-1">Target Audience</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setRecipientType('b2b');
                  setPurpose('Wholesale Supply Enquiry');
                }}
                className={`py-2 rounded-lg text-xs font-extrabold transition-colors ${
                  recipientType === 'b2b'
                    ? 'bg-[#D4AF37] text-black shadow-md'
                    : 'bg-white/5 hover:bg-white/10 text-gray-400'
                }`}
              >
                🏢 Commercial B2B Prospect
              </button>

              <button
                type="button"
                onClick={() => {
                  setRecipientType('b2c');
                  setPurpose('New Customer Promotion');
                }}
                className={`py-2 rounded-lg text-xs font-extrabold transition-colors ${
                  recipientType === 'b2c'
                    ? 'bg-[#D4AF37] text-black shadow-md'
                    : 'bg-white/5 hover:bg-white/10 text-gray-400'
                }`}
              >
                🍗 Retail B2C Consumer
              </button>
            </div>
          </div>

          {/* Quick Select from CRM */}
          {recipientType === 'b2b' ? (
            <div>
              <label className="text-gray-300 text-xs font-semibold block mb-1">
                Select from B2B Leads ({leads.length} available)
              </label>
              <select
                value={leadId}
                onChange={(e) => handleLeadChange(e.target.value)}
                className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
              >
                <option value="">-- Choose Lead or Fill Manually Below --</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.business_name} ({l.area} • {l.category})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-gray-300 text-xs font-semibold block mb-1">
                Select from B2C Customers ({customers.length} available)
              </label>
              <select
                value={customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
              >
                <option value="">-- Choose Customer or Fill Manually Below --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name || c.name || 'Customer'} ({c.phone || c.mobile || 'No phone'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Recipient Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-gray-300 text-xs font-semibold block mb-1">Contact Name *</label>
              <input
                type="text"
                placeholder="e.g. Mohsin Khan / Rizwan"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="text-gray-300 text-xs font-semibold block mb-1">Phone / WhatsApp</label>
              <input
                type="text"
                placeholder="e.g. 9820112233"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          {recipientType === 'b2b' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-gray-300 text-xs font-semibold block mb-1">Business Name</label>
                <input
                  type="text"
                  placeholder="e.g. Noorani Biryani"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="text-gray-300 text-xs font-semibold block mb-1">Category</label>
                <input
                  type="text"
                  placeholder="e.g. Biryani Shop"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="text-gray-300 text-xs font-semibold block mb-1">Area</label>
                <input
                  type="text"
                  placeholder="e.g. Vashi Sector 17"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>
          )}

          {/* Purpose & Language */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-gray-300 text-xs font-semibold block mb-1">Message Purpose</label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
              >
                {(recipientType === 'b2b' ? B2B_PURPOSES : B2C_PURPOSES).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-gray-300 text-xs font-semibold block mb-1">Language & Tone</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setLanguage('hinglish')}
                  className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                    language === 'hinglish'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-white/5 text-gray-400'
                  }`}
                >
                  🇮🇳 Roman Hinglish
                </button>

                <button
                  type="button"
                  onClick={() => setLanguage('english')}
                  className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                    language === 'english'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      : 'bg-white/5 text-gray-400'
                  }`}
                >
                  🇬🇧 English
                </button>
              </div>
            </div>
          </div>

          {/* Custom Notes */}
          <div>
            <label className="text-gray-300 text-xs font-semibold block mb-1">
              Custom Requirements or Context (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Mention 10% trial discount, morning 7 AM delivery, or specifically offer chicken boneless breast."
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
            />
          </div>

          {/* Grounding Info Indicator */}
          <div className="p-3 bg-black/40 rounded-xl border border-white/5 text-xs space-y-1">
            <span className="text-[#D4AF37] font-bold">🛒 Live Product Grounding:</span>
            <div className="text-gray-400 text-[11px]">
              AI will only quote real MeatCity cuts from the database (e.g. Chicken Curry Cut, Boneless Breast, Mutton, Eggs) with owner-approved prices.
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-3 bg-[#D4AF37] hover:bg-[#b5952f] disabled:opacity-50 text-black font-black text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            {isGenerating ? 'Drafting Message with Gemini...' : '⚡ Generate AI Sales Message'}
          </button>
        </div>

        {/* Right Output: Preview, Inline Edit, and Submit to Queue (5 Cols) */}
        <div className="lg:col-span-5 bg-[#111111] border border-white/5 p-5 rounded-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <span>📱</span> WhatsApp Message Preview
              </h3>
              {generatorMeta?.generatorUsed && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-gray-300 font-mono">
                  Engine: {generatorMeta.generatorUsed}
                </span>
              )}
            </div>

            <p className="text-gray-400 text-[11px] mt-2 mb-3">
              You can edit the generated text below before submitting to the Approval Queue.
            </p>

            <textarea
              rows={14}
              placeholder="Your AI-generated sales message will appear here..."
              value={generatedDraft}
              onChange={(e) => setGeneratedDraft(e.target.value)}
              className="w-full bg-black/80 border border-white/10 text-gray-100 text-xs font-sans rounded-xl p-3.5 outline-none focus:border-[#D4AF37] leading-relaxed resize-y"
            />
          </div>

          <div className="space-y-2 pt-3 border-t border-white/5">
            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <span>Status on Submit:</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                PENDING APPROVAL
              </span>
            </div>

            <button
              onClick={handleSubmitToQueue}
              disabled={isSaving || !generatedDraft.trim()}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-black text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isSaving ? 'Submitting to Queue...' : '📥 Submit to Approval Queue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
