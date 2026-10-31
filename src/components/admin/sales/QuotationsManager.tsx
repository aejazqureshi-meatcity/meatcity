"use client";

import React, { useState, useEffect } from 'react';
import { SalesQuotation, QuotationItem, SalesLead } from './types';

const APPROVED_PAYMENT_TERMS = [
  'Cash / UPI on Delivery',
  'Advance UPI / Bank Transfer',
  '7-Day Approved Credit (Verified B2B Account Only)',
  '15-Day Approved Credit (Verified Enterprise Account Only)',
];

interface QuotationsManagerProps {
  quotations: SalesQuotation[];
  leads: SalesLead[];
  products: any[];
  selectedLead?: SalesLead | null;
  onAddQuotation: (quotation: Omit<SalesQuotation, 'id' | 'created_at'>) => Promise<void>;
  onUpdateQuotation: (id: string, updates: Partial<SalesQuotation>) => Promise<void>;
  onDeleteQuotation: (id: string) => Promise<void>;
}

export default function QuotationsManager({
  quotations,
  leads,
  products,
  selectedLead,
  onAddQuotation,
  onUpdateQuotation,
  onDeleteQuotation,
}: QuotationsManagerProps) {
  const [showBuilder, setShowBuilder] = useState(false);
  const [activeQuotation, setActiveQuotation] = useState<SalesQuotation | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Builder Form State
  const [leadId, setLeadId] = useState(selectedLead?.id || '');
  const [customerName, setCustomerName] = useState(selectedLead?.business_name || '');
  const [customerPhone, setCustomerPhone] = useState(selectedLead?.phone || '');
  const [customerArea, setCustomerArea] = useState(selectedLead?.area || 'Vashi');
  const [paymentTerms, setPaymentTerms] = useState<string>('Cash / UPI on Delivery');
  const [creditApprovedConfirmed, setCreditApprovedConfirmed] = useState<boolean>(false);
  const [deliverySlot, setDeliverySlot] = useState('Morning 6:00 AM - 8:00 AM (Turbhe Sector 20 Hub)');
  const [notes, setNotes] = useState('Prices valid for 7 days. FSSAI certified fresh daily dressing.');

  const initialRate = products[0]?.price_b2b || products[0]?.price_b2c || 0;
  const [items, setItems] = useState<QuotationItem[]>([
    {
      product_id: products[0]?.id || 'prod-1',
      name: products[0]?.name || 'Fresh Chicken Curry Cut',
      quantity: 15,
      unit: products[0]?.unit || 'kg',
      price: initialRate,
      total: initialRate * 15,
    },
  ]);

  const [discount, setDiscount] = useState<number>(0);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);

  // Sync selectedLead prop
  useEffect(() => {
    if (selectedLead) {
      setLeadId(selectedLead.id);
      setCustomerName(selectedLead.business_name);
      setCustomerPhone(selectedLead.phone || '');
      setCustomerArea(selectedLead.area || 'Vashi');
      setShowBuilder(true);
    }
  }, [selectedLead]);

  // Lead selection change
  const handleLeadChange = (id: string) => {
    setLeadId(id);
    const lead = leads.find((l) => l.id === id);
    if (lead) {
      setCustomerName(lead.business_name);
      setCustomerPhone(lead.phone || '');
      setCustomerArea(lead.area || 'Vashi');
    }
  };

  // Add Item
  const handleAddItem = () => {
    const defaultProd = products[0];
    const initialPrice = defaultProd ? (defaultProd.price_b2b || defaultProd.price_b2c || 0) : 0;
    setItems((prev) => [
      ...prev,
      {
        product_id: defaultProd?.id || 'manual-item',
        name: defaultProd?.name || 'Fresh Chicken Curry Cut',
        quantity: 10,
        unit: defaultProd?.unit || 'kg',
        price: initialPrice,
        total: initialPrice * 10,
      },
    ]);
  };

  // Update Item
  const handleUpdateItem = (index: number, updates: Partial<QuotationItem>) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, ...updates };
        updated.total = updated.quantity * updated.price;
        return updated;
      })
    );
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculated totals
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const total = Math.max(0, subtotal - discount + deliveryFee);

  // Save Quotation
  const handleSaveQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName) {
      alert('Customer or Business Name is required');
      return;
    }
    if (items.length === 0) {
      alert('Add at least one product item');
      return;
    }
    if (paymentTerms.includes('Credit') && !creditApprovedConfirmed) {
      alert('Credit terms require owner credit authorization confirmation. Please check the authorization box before submitting.');
      return;
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const quoteNum = `MC-Q-${new Date().getFullYear()}-${randomSuffix}`;

    await onAddQuotation({
      quotation_number: quoteNum,
      lead_id: leadId || undefined,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_area: customerArea,
      items,
      subtotal,
      discount,
      delivery_fee: deliveryFee,
      total,
      payment_terms: paymentTerms,
      delivery_slot: deliverySlot,
      valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Sent',
      notes,
    });

    setShowBuilder(false);
    alert(`Quotation ${quoteNum} created successfully!`);
  };

  // Copy WhatsApp Quotation Format
  const handleCopyWhatsAppQuote = (quote: SalesQuotation) => {
    const text = `*MEATCITY TURBHE – WHOLESALE QUOTATION*
Quotation #: ${quote.quotation_number}
Client: ${quote.customer_name} (${quote.customer_area || 'Navi Mumbai'})
Date: ${new Date(quote.created_at).toLocaleDateString()}
Valid Until: ${quote.valid_until || '7 Days'}

*ORDER SPECIFICATIONS:*
${quote.items.map((it) => `• ${it.name}: ${it.quantity} ${it.unit} @ ₹${it.price}/${it.unit} = ₹${it.total}`).join('\n')}

Subtotal: ₹${quote.subtotal}
Discount: -₹${quote.discount}
Delivery Fee: ${quote.delivery_fee === 0 ? 'FREE (Turbhe Hub)' : `₹${quote.delivery_fee}`}
*NET TOTAL: ₹${quote.total}*

• Supply Slot: ${quote.delivery_slot}
• Payment Terms: ${quote.payment_terms}
• FSSAI Reg: 21525016001365

MeatCity Wholesale Supply Team
📞 WhatsApp / Call: +91 7977630912
🌐 https://meatcity.in`;

    navigator.clipboard.writeText(text);
    setCopyFeedback(quote.id);
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#111111] border border-white/5 p-5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-white font-black text-lg">Wholesale Quotations Builder</h2>
          <p className="text-gray-400 text-xs mt-1">
            Build customized commercial supply proposals with real B2B slab rates, daily morning slots, and payment terms.
          </p>
        </div>
        <button
          onClick={() => setShowBuilder(!showBuilder)}
          className="px-4 py-2 bg-[#D4AF37] hover:bg-[#b5952f] text-black font-extrabold text-xs rounded-lg transition-colors whitespace-nowrap"
        >
          {showBuilder ? '✕ Close Builder' : '+ Create Wholesale Quote'}
        </button>
      </div>

      {/* Builder Form Accordion */}
      {showBuilder && (
        <form onSubmit={handleSaveQuotation} className="bg-[#141414] border border-[#D4AF37]/30 p-6 rounded-2xl space-y-5 shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="text-white font-extrabold text-sm flex items-center gap-2">
              <span>📄</span> New Wholesale Supply Quotation
            </h3>
            <span className="text-[#D4AF37] text-xs font-semibold">MeatCity Turbhe Hub</span>
          </div>

          {products.length === 0 && (
            <div className="p-3 bg-amber-950/40 border border-amber-500/50 rounded-xl text-amber-200 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-300">
                <span>⚠️</span>
                <span>Live Product Catalogue Unavailable</span>
              </div>
              <p className="text-[11px] text-amber-300/90">
                No active products were retrieved from the database. Line item prices must be manually verified against the official MeatCity management rate sheet.
              </p>
            </div>
          )}

          {paymentTerms.includes('Credit') && (
            <div className="p-3.5 bg-amber-950/40 border border-amber-500/60 rounded-xl space-y-2 text-xs">
              <div className="font-extrabold text-amber-300 flex items-center gap-1.5">
                <span>⚠️</span>
                <span>Credit Terms Policy Notice</span>
              </div>
              <p className="text-amber-200/90 text-[11px] leading-relaxed">
                Credit terms are strictly restricted to verified B2B accounts with an approved trade arrangement. Unapproved credit quotations are not authorized.
              </p>
              <div className="flex items-center gap-2 pt-1 border-t border-amber-500/20">
                <input
                  type="checkbox"
                  id="credit-auth-confirmed"
                  checked={creditApprovedConfirmed}
                  onChange={(e) => setCreditApprovedConfirmed(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 bg-black border-white/20 focus:ring-amber-500"
                />
                <label htmlFor="credit-auth-confirmed" className="text-white text-xs font-semibold cursor-pointer">
                  Owner Credit Authorization Confirmed (Verified trade references & KYC on file)
                </label>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-gray-300 text-xs font-semibold block mb-1">Select B2B Lead</label>
              <select
                value={leadId}
                onChange={(e) => handleLeadChange(e.target.value)}
                className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
              >
                <option value="">-- Manual Client Entry --</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.business_name} ({l.area})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-gray-300 text-xs font-semibold block mb-1">Customer / Business Name *</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="text-gray-300 text-xs font-semibold block mb-1">Phone / WhatsApp</label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="text-gray-300 text-xs font-semibold block mb-1">Delivery Area</label>
              <input
                type="text"
                value={customerArea}
                onChange={(e) => setCustomerArea(e.target.value)}
                className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-white font-bold text-xs uppercase text-gray-400">Order Items & Quotation Rates</h4>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-colors"
              >
                + Add Item
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 p-2.5 bg-black/50 border border-white/5 rounded-xl items-center text-xs">
                  <div className="col-span-4">
                    <select
                      value={item.product_id}
                      onChange={(e) => {
                        const prod = products.find((p) => p.id === e.target.value);
                        if (prod) {
                          const itemRate = prod.price_b2b || prod.price_b2c || 0;
                          handleUpdateItem(idx, {
                            product_id: prod.id,
                            name: prod.name,
                            unit: prod.unit || 'kg',
                            price: itemRate,
                          });
                        }
                      }}
                      className="w-full bg-black border border-white/10 text-white text-xs rounded-lg p-2 outline-none"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Wholesale: ₹{p.price_b2b}/{p.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleUpdateItem(idx, { quantity: Number(e.target.value) })}
                      className="w-full bg-black border border-white/10 text-white text-xs rounded-lg p-2 outline-none"
                    />
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Rate ₹"
                      value={item.price}
                      onChange={(e) => handleUpdateItem(idx, { price: Number(e.target.value) })}
                      className="w-full bg-black border border-white/10 text-white text-xs rounded-lg p-2 outline-none"
                    />
                  </div>

                  <div className="col-span-3 text-right font-black text-white">
                    ₹{item.total.toLocaleString('en-IN')}
                  </div>

                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={items.length === 1}
                      className="text-gray-500 hover:text-rose-400 font-bold disabled:opacity-30"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Adjustments */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-white/10">
            <div>
              <label className="text-gray-300 text-xs font-semibold block mb-1">Payment Terms (Approved Options)</label>
              <select
                value={paymentTerms}
                onChange={(e) => {
                  setPaymentTerms(e.target.value);
                  if (!e.target.value.includes('Credit')) {
                    setCreditApprovedConfirmed(false);
                  }
                }}
                className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
              >
                {APPROVED_PAYMENT_TERMS.map((term) => (
                  <option key={term} value={term}>
                    {term}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-gray-300 text-xs font-semibold block mb-1">Delivery Slot</label>
              <input
                type="text"
                value={deliverySlot}
                onChange={(e) => setDeliverySlot(e.target.value)}
                className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="text-gray-300 text-xs font-semibold block mb-1">Volume Discount (₹)</label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          {/* Summary Banner */}
          <div className="p-4 bg-black/70 rounded-xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-gray-400">
              Subtotal: ₹{subtotal} • Discount: -₹{discount} • Total Items: {items.length}
            </div>
            <div className="text-lg font-black text-[#D4AF37]">
              Final Quotation Total: ₹{total.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowBuilder(false)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#D4AF37] hover:bg-[#b5952f] text-black text-xs font-black rounded-lg transition-colors shadow-lg"
            >
              Generate & Save Quotation
            </button>
          </div>
        </form>
      )}

      {/* Quotations List */}
      <div className="bg-[#111111] border border-white/5 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/5 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                <th className="p-4">Quotation #</th>
                <th className="p-4">Client & Area</th>
                <th className="p-4">Items Summary</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-gray-300">
              {quotations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No quotations generated yet. Click "+ Create Wholesale Quote" above.
                  </td>
                </tr>
              ) : (
                quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-mono font-bold text-white">
                      {q.quotation_number}
                      <div className="text-gray-500 text-[10px]">
                        {new Date(q.created_at).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="font-bold text-white">{q.customer_name}</div>
                      <div className="text-gray-400 text-[11px]">{q.customer_area || 'Navi Mumbai'}</div>
                      {q.customer_phone && (
                        <div className="text-emerald-400 font-mono text-[10px]">{q.customer_phone}</div>
                      )}
                    </td>

                    <td className="p-4">
                      <div className="text-gray-300">
                        {q.items.length} item{q.items.length === 1 ? '' : 's'}
                      </div>
                      <div className="text-gray-500 text-[11px] line-clamp-1 max-w-[200px]">
                        {q.items.map((i) => `${i.name} (${i.quantity}${i.unit})`).join(', ')}
                      </div>
                    </td>

                    <td className="p-4 font-black text-white text-sm">
                      ₹{q.total.toLocaleString('en-IN')}
                    </td>

                    <td className="p-4">
                      <select
                        value={q.status}
                        onChange={(e) => onUpdateQuotation(q.id, { status: e.target.value as any })}
                        className="px-2 py-1 bg-black/60 border border-white/10 rounded text-[11px] font-bold text-white outline-none cursor-pointer"
                      >
                        <option value="Draft">Draft</option>
                        <option value="Sent">Sent</option>
                        <option value="Accepted">Accepted</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Expired">Expired</option>
                      </select>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleCopyWhatsAppQuote(q)}
                          className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-black font-bold rounded text-xs transition-colors flex items-center gap-1"
                        >
                          <span>💬</span>
                          <span>{copyFeedback === q.id ? 'Copied!' : 'Copy WA Quote'}</span>
                        </button>

                        <button
                          onClick={() => setActiveQuotation(q)}
                          className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white"
                          title="View Quotation"
                        >
                          👁️
                        </button>

                        <button
                          onClick={() => {
                            if (confirm('Delete this quotation record?')) {
                              onDeleteQuotation(q.id);
                            }
                          }}
                          className="p-1.5 hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 rounded text-xs"
                        >
                          🗑️
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

      {/* Quotation Detail / Printable Modal */}
      {activeQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:p-0">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-white font-extrabold text-lg">MeatCity Wholesale Quotation</h3>
                <span className="text-[#D4AF37] font-mono text-xs">{activeQuotation.quotation_number}</span>
              </div>
              <button
                onClick={() => setActiveQuotation(null)}
                className="text-gray-400 hover:text-white text-lg font-bold print:hidden"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
                <span className="text-gray-500 uppercase text-[10px] font-bold block">Supplier</span>
                <div className="text-white font-bold">MeatCity Turbhe Hub</div>
                <div className="text-gray-400">Shop No.2, Sector 20, Turbhe</div>
                <div className="text-gray-400">Navi Mumbai - 400705</div>
                <div className="text-emerald-400">WhatsApp: +91 7977630912</div>
              </div>

              <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
                <span className="text-gray-500 uppercase text-[10px] font-bold block">Client Proposal</span>
                <div className="text-white font-bold">{activeQuotation.customer_name}</div>
                <div className="text-gray-400">{activeQuotation.customer_area || 'Navi Mumbai'}</div>
                <div className="text-gray-400">{activeQuotation.customer_phone || 'Phone upon request'}</div>
                <div className="text-gray-500">Terms: {activeQuotation.payment_terms}</div>
              </div>
            </div>

            <div className="border border-white/10 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-gray-400 border-b border-white/10">
                  <tr>
                    <th className="p-2.5">Item Description</th>
                    <th className="p-2.5">Quantity</th>
                    <th className="p-2.5">Rate (₹)</th>
                    <th className="p-2.5 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-200">
                  {activeQuotation.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-bold">{it.name}</td>
                      <td className="p-2.5">{it.quantity} {it.unit}</td>
                      <td className="p-2.5">₹{it.price}</td>
                      <td className="p-2.5 text-right font-bold">₹{it.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end text-xs">
              <div className="w-64 space-y-1.5 p-3 bg-black/40 rounded-xl border border-white/5">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal:</span>
                  <span>₹{activeQuotation.subtotal}</span>
                </div>
                {activeQuotation.discount > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>Discount:</span>
                    <span>-₹{activeQuotation.discount}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-400">
                  <span>Delivery:</span>
                  <span>{activeQuotation.delivery_fee === 0 ? 'FREE' : `₹${activeQuotation.delivery_fee}`}</span>
                </div>
                <div className="flex justify-between font-black text-white text-sm pt-2 border-t border-white/10">
                  <span>Grand Total:</span>
                  <span className="text-[#D4AF37]">₹{activeQuotation.total}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-between gap-2 print:hidden">
              <button
                onClick={() => handleCopyWhatsAppQuote(activeQuotation)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs rounded-lg transition-colors"
              >
                Copy for WhatsApp
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-lg transition-colors"
              >
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
