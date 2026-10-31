"use client";

import React, { useState } from 'react';
import { SalesLead } from './types';

interface B2BLeadsProps {
  leads: SalesLead[];
  onUpdateLead: (id: string, updates: Partial<SalesLead>) => Promise<void>;
  onDeleteLead: (id: string) => Promise<void>;
  onSelectLeadForMessage: (lead: SalesLead) => void;
  onSelectLeadForQuotation: (lead: SalesLead) => void;
  onSelectLeadForFollowUp: (lead: SalesLead) => void;
  onNavigateTab: (tab: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Contacted: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Interested: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Quoted: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'Trial Order': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Active Customer': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Not Interested': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  'Opted Out': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
};

export default function B2BLeads({
  leads,
  onUpdateLead,
  onDeleteLead,
  onSelectLeadForMessage,
  onSelectLeadForQuotation,
  onSelectLeadForFollowUp,
  onNavigateTab,
}: B2BLeadsProps) {
  const [search, setSearch] = useState('');
  const [filterArea, setFilterArea] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Selected lead for detail drawer
  const [activeLead, setActiveLead] = useState<SalesLead | null>(null);

  // Edit lead modal
  const [editingLead, setEditingLead] = useState<SalesLead | null>(null);

  // Extract unique areas and categories
  const areas = ['All', ...Array.from(new Set(leads.map((l) => l.area).filter(Boolean)))];
  const categories = ['All', ...Array.from(new Set(leads.map((l) => l.category).filter(Boolean)))];
  const statuses = [
    'All',
    'New',
    'Contacted',
    'Interested',
    'Quoted',
    'Trial Order',
    'Active Customer',
    'Not Interested',
    'Opted Out',
  ];

  // Filtered Leads
  const filtered = leads.filter((lead) => {
    const matchSearch =
      !search ||
      lead.business_name.toLowerCase().includes(search.toLowerCase()) ||
      (lead.contact_person && lead.contact_person.toLowerCase().includes(search.toLowerCase())) ||
      (lead.phone && lead.phone.includes(search));
    const matchArea = filterArea === 'All' || lead.area === filterArea;
    const matchCategory = filterCategory === 'All' || lead.category === filterCategory;
    const matchStatus = filterStatus === 'All' || lead.status === filterStatus;

    return matchSearch && matchArea && matchCategory && matchStatus;
  });

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;
    await onUpdateLead(editingLead.id, {
      business_name: editingLead.business_name,
      contact_person: editingLead.contact_person,
      phone: editingLead.phone,
      email: editingLead.email,
      category: editingLead.category,
      area: editingLead.area,
      address: editingLead.address,
      estimated_daily_kg: editingLead.estimated_daily_kg,
      preferred_items: editingLead.preferred_items,
      notes: editingLead.notes,
      status: editingLead.status,
      opt_out: editingLead.opt_out,
    });
    setEditingLead(null);
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <div className="bg-[#111111] border border-white/5 p-5 rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-white font-black text-lg">B2B Leads CRM ({filtered.length} of {leads.length})</h2>
            <p className="text-gray-400 text-xs mt-0.5">
              Manage prospective commercial accounts across Navi Mumbai.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('lead-finder')}
            className="px-4 py-2 bg-[#D4AF37] hover:bg-[#b5952f] text-black font-extrabold text-xs rounded-lg transition-colors whitespace-nowrap"
          >
            + Research New Leads
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
          <div>
            <label className="text-gray-400 text-xs font-semibold block mb-1">Search Lead / Phone</label>
            <input
              type="text"
              placeholder="Search by name, owner, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div>
            <label className="text-gray-400 text-xs font-semibold block mb-1">Area</label>
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
            >
              {areas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-gray-400 text-xs font-semibold block mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-gray-400 text-xs font-semibold block mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-[#111111] border border-white/5 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/5 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                <th className="p-4">Business & Category</th>
                <th className="p-4">Area & Location</th>
                <th className="p-4">Contact Person</th>
                <th className="p-4">Est. Daily</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-gray-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No leads found matching your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((lead) => (
                  <tr key={lead.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white text-sm flex items-center gap-2">
                        <span>{lead.business_name}</span>
                        {lead.opt_out && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-rose-500/20 text-rose-400 font-bold">
                            OPTED OUT
                          </span>
                        )}
                      </div>
                      <div className="text-gray-400 text-[11px] mt-0.5">{lead.category}</div>
                    </td>

                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[#D4AF37]/20 text-[#D4AF37] font-semibold">
                        {lead.area}
                      </span>
                      {lead.address && (
                        <div className="text-gray-400 text-[11px] mt-1 line-clamp-1 max-w-[200px]">
                          {lead.address}
                        </div>
                      )}
                    </td>

                    <td className="p-4">
                      <div className="text-gray-200 font-medium">{lead.contact_person || 'Not specified'}</div>
                      {lead.phone ? (
                        <div className="text-emerald-400 font-mono text-[11px] mt-0.5">{lead.phone}</div>
                      ) : (
                        <div className="text-gray-500 text-[11px] mt-0.5 italic">Needs verification</div>
                      )}
                    </td>

                    <td className="p-4">
                      <div className="font-bold text-white">{lead.estimated_daily_kg || 25} kg</div>
                      <div className="text-gray-400 text-[10px]">daily req.</div>
                    </td>

                    <td className="p-4">
                      <select
                        value={lead.status}
                        onChange={(e) => {
                          const newStatus = e.target.value as any;
                          onUpdateLead(lead.id, {
                            status: newStatus,
                            opt_out: newStatus === 'Opted Out' ? true : (lead.opt_out && newStatus !== 'Opted Out' ? false : lead.opt_out),
                          });
                        }}
                        className={`px-2 py-1 rounded text-[11px] font-bold border outline-none bg-black/60 cursor-pointer ${
                          STATUS_COLORS[lead.status] || 'bg-white/10 text-white'
                        }`}
                      >
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Interested">Interested</option>
                        <option value="Quoted">Quoted</option>
                        <option value="Trial Order">Trial Order</option>
                        <option value="Active Customer">Active Customer</option>
                        <option value="Not Interested">Not Interested</option>
                        <option value="Opted Out">Opted Out</option>
                      </select>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {lead.opt_out || lead.status === 'Opted Out' ? (
                          <button
                            disabled
                            title="Recipient has opted out of communications"
                            className="px-2.5 py-1.5 bg-gray-800 text-gray-500 cursor-not-allowed font-bold rounded text-[11px]"
                          >
                            ⛔ Opted Out
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              onSelectLeadForMessage(lead);
                              onNavigateTab('generator');
                            }}
                            title="Generate AI Message"
                            className="px-2.5 py-1.5 bg-[#D4AF37]/20 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-black font-bold rounded text-[11px] transition-colors"
                          >
                            💬 AI Draft
                          </button>
                        )}

                        <button
                          onClick={() => {
                            onSelectLeadForQuotation(lead);
                            onNavigateTab('quotations');
                          }}
                          title="Create Wholesale Quotation"
                          className="px-2 py-1.5 bg-blue-500/20 hover:bg-blue-500 text-blue-400 hover:text-white font-bold rounded text-[11px] transition-colors"
                        >
                          📄 Quote
                        </button>

                        <button
                          onClick={() => onSelectLeadForFollowUp(lead)}
                          title="Schedule Follow-up"
                          className="px-2 py-1.5 bg-purple-500/20 hover:bg-purple-500 text-purple-400 hover:text-white font-bold rounded text-[11px] transition-colors"
                        >
                          ⏰ Remind
                        </button>

                        <button
                          onClick={() => setActiveLead(lead)}
                          title="View Details"
                          className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white"
                        >
                          👁️
                        </button>

                        <button
                          onClick={() => setEditingLead(lead)}
                          title="Edit Lead"
                          className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white"
                        >
                          ✏️
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

      {/* Lead Detail Drawer / Modal */}
      {activeLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-white font-extrabold text-lg">{activeLead.business_name}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] bg-[#D4AF37]/20 text-[#D4AF37] font-bold">
                  {activeLead.area} • {activeLead.category}
                </span>
              </div>
              <button
                onClick={() => setActiveLead(null)}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-black/40 rounded-xl border border-white/5">
                <div>
                  <span className="text-gray-500 block">Contact Person</span>
                  <span className="text-white font-semibold">{activeLead.contact_person || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Phone Number</span>
                  <span className="text-emerald-400 font-mono font-semibold">{activeLead.phone || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Daily Requirement</span>
                  <span className="text-white font-semibold">{activeLead.estimated_daily_kg || 25} kg/day</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Lead Status</span>
                  <span className="text-amber-400 font-semibold">{activeLead.status}</span>
                </div>
              </div>

              <div>
                <span className="text-gray-500 block mb-1">Full Address</span>
                <p className="text-gray-300 p-2.5 bg-black/40 rounded-lg border border-white/5">
                  {activeLead.address || 'No specific address recorded.'}
                </p>
              </div>

              <div>
                <span className="text-gray-500 block mb-1">Preferred Cuts & Items</span>
                <p className="text-gray-300 p-2.5 bg-black/40 rounded-lg border border-white/5">
                  {activeLead.preferred_items || 'Chicken Curry Cut, Boneless'}
                </p>
              </div>

              <div>
                <span className="text-gray-500 block mb-1">Notes & History</span>
                <p className="text-gray-300 p-2.5 bg-black/40 rounded-lg border border-white/5">
                  {activeLead.notes || 'No notes added yet.'}
                </p>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-white font-semibold">Consent & Opt-Out Status</div>
                  <div className="text-gray-400 text-[11px]">
                    {activeLead.opt_out ? 'Recipient has requested NOT to be contacted.' : 'Recipient is eligible for sales contact.'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    const newOptOut = !activeLead.opt_out;
                    const updates: Partial<SalesLead> = {
                      opt_out: newOptOut,
                      status: newOptOut ? 'Opted Out' : (activeLead.status === 'Opted Out' ? 'New' : activeLead.status),
                    };
                    onUpdateLead(activeLead.id, updates);
                    setActiveLead({ ...activeLead, ...updates });
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                    activeLead.opt_out ? 'bg-rose-500 text-white' : 'bg-white/10 hover:bg-white/20 text-gray-300'
                  }`}
                >
                  {activeLead.opt_out ? 'Opted Out' : 'Active (Opt Out)'}
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-between gap-2">
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to delete ${activeLead.business_name}?`)) {
                    onDeleteLead(activeLead.id);
                    setActiveLead(null);
                  }
                }}
                className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg font-bold text-xs transition-colors"
              >
                Delete Lead
              </button>

              <div className="flex gap-2">
                {activeLead.opt_out || activeLead.status === 'Opted Out' ? (
                  <button
                    disabled
                    className="px-4 py-2 bg-gray-800 text-gray-500 cursor-not-allowed rounded-lg font-extrabold text-xs"
                  >
                    ⛔ Message Blocked (Opted Out)
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onSelectLeadForMessage(activeLead);
                      setActiveLead(null);
                      onNavigateTab('generator');
                    }}
                    className="px-4 py-2 bg-[#D4AF37] hover:bg-[#b5952f] text-black rounded-lg font-extrabold text-xs transition-colors"
                  >
                    Draft AI Message
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {editingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="text-white font-extrabold text-base">Edit B2B Lead</h3>
              <button
                onClick={() => setEditingLead(null)}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="text-gray-300 text-xs font-semibold block mb-1">Business Name</label>
                <input
                  type="text"
                  required
                  value={editingLead.business_name}
                  onChange={(e) => setEditingLead({ ...editingLead, business_name: e.target.value })}
                  className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 text-xs font-semibold block mb-1">Category</label>
                  <input
                    type="text"
                    value={editingLead.category}
                    onChange={(e) => setEditingLead({ ...editingLead, category: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-gray-300 text-xs font-semibold block mb-1">Area</label>
                  <input
                    type="text"
                    value={editingLead.area}
                    onChange={(e) => setEditingLead({ ...editingLead, area: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 text-xs font-semibold block mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={editingLead.contact_person || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, contact_person: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-gray-300 text-xs font-semibold block mb-1">Phone</label>
                  <input
                    type="text"
                    value={editingLead.phone || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-300 text-xs font-semibold block mb-1">Address</label>
                <input
                  type="text"
                  value={editingLead.address || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, address: e.target.value })}
                  className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 text-xs font-semibold block mb-1">Est. Daily (Kg)</label>
                  <input
                    type="number"
                    value={editingLead.estimated_daily_kg || 0}
                    onChange={(e) => setEditingLead({ ...editingLead, estimated_daily_kg: Number(e.target.value) })}
                    className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-gray-300 text-xs font-semibold block mb-1">Status</label>
                  <select
                    value={editingLead.status}
                    onChange={(e) => setEditingLead({ ...editingLead, status: e.target.value as any })}
                    className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
                  >
                    {statuses.filter((s) => s !== 'All').map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-gray-300 text-xs font-semibold block mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={editingLead.notes || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })}
                  className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="flex items-center gap-2.5 p-3 bg-black/50 border border-white/10 rounded-lg">
                <input
                  type="checkbox"
                  id="modal-optout-chk"
                  checked={Boolean(editingLead.opt_out)}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setEditingLead({
                      ...editingLead,
                      opt_out: isChecked,
                      status: isChecked ? 'Opted Out' : (editingLead.status === 'Opted Out' ? 'New' : editingLead.status),
                    });
                  }}
                  className="w-4 h-4 rounded text-rose-500 bg-black border-white/20 focus:ring-rose-500"
                />
                <label htmlFor="modal-optout-chk" className="text-gray-200 text-xs font-semibold cursor-pointer">
                  Opted Out / Do Not Contact (Block all outbound AI messages & sales dispatch)
                </label>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingLead(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#D4AF37] hover:bg-[#b5952f] text-black text-xs font-black rounded-lg transition-colors"
                >
                  Update Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
