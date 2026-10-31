"use client";

import React, { useState } from 'react';
import { SalesFollowUp, SalesLead } from './types';

interface FollowUpManagerProps {
  followUps: SalesFollowUp[];
  leads: SalesLead[];
  onAddFollowUp: (followUp: Omit<SalesFollowUp, 'id' | 'created_at'>) => Promise<void>;
  onUpdateFollowUp: (id: string, updates: Partial<SalesFollowUp>) => Promise<void>;
  onDeleteFollowUp: (id: string) => Promise<void>;
  onDraftFollowUpMessage: (lead: SalesLead) => void;
  onNavigateTab: (tab: string) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  High: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  Medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

export default function FollowUpManager({
  followUps,
  leads,
  onAddFollowUp,
  onUpdateFollowUp,
  onDeleteFollowUp,
  onDraftFollowUpMessage,
  onNavigateTab,
}: FollowUpManagerProps) {
  const [filter, setFilter] = useState<'all' | 'today' | 'overdue' | 'upcoming' | 'completed'>('today');
  const [showAddModal, setShowAddModal] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Form State
  const [form, setForm] = useState({
    lead_id: '',
    due_date: todayStr,
    title: '',
    notes: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High',
  });

  // Filter logic
  const filtered = followUps.filter((fu) => {
    if (filter === 'completed') return fu.status === 'Completed';
    if (fu.status === 'Completed') return false;
    if (filter === 'today') return fu.due_date === todayStr;
    if (filter === 'overdue') return fu.due_date < todayStr;
    if (filter === 'upcoming') return fu.due_date > todayStr;
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.lead_id) {
      alert('Please select a lead');
      return;
    }
    if (!form.title) {
      alert('Please enter a follow-up title');
      return;
    }

    const lead = leads.find((l) => l.id === form.lead_id);

    await onAddFollowUp({
      lead_id: form.lead_id,
      lead_name: lead?.business_name,
      lead_phone: lead?.phone,
      due_date: form.due_date,
      title: form.title,
      notes: form.notes,
      priority: form.priority,
      status: 'Pending',
    });

    setShowAddModal(false);
    setForm({
      lead_id: '',
      due_date: todayStr,
      title: '',
      notes: '',
      priority: 'Medium',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#111111] border border-white/5 p-5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-white font-black text-lg">Sales Follow-up Manager</h2>
          <p className="text-gray-400 text-xs mt-1">
            Keep prospective accounts engaged. Schedule quote follow-ups, trial order reminders, and weekly bulk checks.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-[#D4AF37] hover:bg-[#b5952f] text-black font-extrabold text-xs rounded-lg transition-colors whitespace-nowrap"
        >
          + Schedule Follow-up
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/5 pb-3">
        <button
          onClick={() => setFilter('today')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            filter === 'today' ? 'bg-[#D4AF37] text-black font-extrabold' : 'bg-white/5 text-gray-300 hover:bg-white/10'
          }`}
        >
          Due Today ({followUps.filter((f) => f.due_date === todayStr && f.status === 'Pending').length})
        </button>

        <button
          onClick={() => setFilter('overdue')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            filter === 'overdue' ? 'bg-rose-500 text-white font-extrabold' : 'bg-white/5 text-gray-300 hover:bg-white/10'
          }`}
        >
          Overdue ({followUps.filter((f) => f.due_date < todayStr && f.status === 'Pending').length})
        </button>

        <button
          onClick={() => setFilter('upcoming')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            filter === 'upcoming' ? 'bg-blue-500 text-white font-extrabold' : 'bg-white/5 text-gray-300 hover:bg-white/10'
          }`}
        >
          Upcoming ({followUps.filter((f) => f.due_date > todayStr && f.status === 'Pending').length})
        </button>

        <button
          onClick={() => setFilter('completed')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            filter === 'completed' ? 'bg-emerald-500 text-black font-extrabold' : 'bg-white/5 text-gray-300 hover:bg-white/10'
          }`}
        >
          Completed ({followUps.filter((f) => f.status === 'Completed').length})
        </button>

        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            filter === 'all' ? 'bg-white/20 text-white font-extrabold' : 'bg-white/5 text-gray-300 hover:bg-white/10'
          }`}
        >
          All ({followUps.length})
        </button>
      </div>

      {/* Follow-up Cards */}
      {filtered.length === 0 ? (
        <div className="bg-[#111111] border border-white/5 rounded-xl p-12 text-center text-gray-500 text-xs">
          No follow-ups in this view.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((fu) => {
            const lead = leads.find((l) => l.id === fu.lead_id);
            const isOverdue = fu.due_date < todayStr && fu.status === 'Pending';
            const isToday = fu.due_date === todayStr && fu.status === 'Pending';

            return (
              <div
                key={fu.id}
                className="bg-[#111111] border border-white/5 rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-white/10 transition-colors shadow-lg"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-white font-bold text-sm">{fu.title}</h4>
                      <div className="text-gray-400 text-xs mt-0.5">
                        Lead: <span className="text-[#D4AF37] font-semibold">{lead?.business_name || fu.lead_name || 'Prospect'}</span>
                        {lead?.area ? ` (${lead.area})` : ''}
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        PRIORITY_COLORS[fu.priority] || 'bg-white/10 text-white'
                      }`}
                    >
                      {fu.priority}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400">Due Date:</span>
                    <span
                      className={`font-semibold ${
                        isOverdue ? 'text-rose-400 font-bold' : isToday ? 'text-amber-400 font-bold' : 'text-gray-300'
                      }`}
                    >
                      {fu.due_date} {isOverdue ? '(Overdue)' : isToday ? '(Today)' : ''}
                    </span>
                  </div>

                  {fu.notes && (
                    <p className="p-2.5 bg-black/40 rounded-lg text-gray-300 text-xs border border-white/5">
                      {fu.notes}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {lead && (
                      <button
                        onClick={() => {
                          onDraftFollowUpMessage(lead);
                          onNavigateTab('generator');
                        }}
                        className="px-2.5 py-1.5 bg-[#D4AF37]/20 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-black font-bold rounded text-xs transition-colors"
                      >
                        💬 Draft Follow-up
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {fu.status === 'Pending' ? (
                      <button
                        onClick={() =>
                          onUpdateFollowUp(fu.id, {
                            status: 'Completed',
                            completed_at: new Date().toISOString(),
                          })
                        }
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black font-black rounded text-xs transition-colors"
                      >
                        ✓ Done
                      </button>
                    ) : (
                      <span className="text-emerald-400 text-xs font-bold">✓ Completed</span>
                    )}

                    <button
                      onClick={() => {
                        if (confirm('Delete follow-up reminder?')) {
                          onDeleteFollowUp(fu.id);
                        }
                      }}
                      className="p-1.5 hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 rounded text-xs transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Follow-up Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-white font-extrabold text-base">Schedule New Follow-up</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-gray-300 text-xs font-semibold block mb-1">Select B2B Lead *</label>
                <select
                  required
                  value={form.lead_id}
                  onChange={(e) => setForm({ ...form, lead_id: e.target.value })}
                  className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
                >
                  <option value="">-- Choose Lead --</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.business_name} ({l.area})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-gray-300 text-xs font-semibold block mb-1">Follow-up Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Call regarding trial batch feedback"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 text-xs font-semibold block mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-gray-300 text-xs font-semibold block mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                    className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-gray-300 text-xs font-semibold block mb-1">Notes / Reminders</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Mention wholesale price drop on boneless breast."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#D4AF37] hover:bg-[#b5952f] text-black rounded-lg text-xs font-black"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
