"use client";

import React from 'react';
import { SalesLead, SalesMessage, SalesQuotation, SalesFollowUp } from './types';

interface SalesOverviewProps {
  leads: SalesLead[];
  messages: SalesMessage[];
  quotations: SalesQuotation[];
  followUps: SalesFollowUp[];
  onNavigateTab: (tab: string) => void;
  onSelectLeadForMessage?: (lead: SalesLead) => void;
}

export default function SalesOverview({
  leads,
  messages,
  quotations,
  followUps,
  onNavigateTab,
  onSelectLeadForMessage,
}: SalesOverviewProps) {
  const pendingApprovals = messages.filter((m) => m.status === 'PENDING_APPROVAL');
  const todayStr = new Date().toISOString().split('T')[0];
  const todayFollowUps = followUps.filter((f) => f.due_date <= todayStr && f.status === 'Pending');
  const activeCustomers = leads.filter((l) => l.status === 'Active Customer' || l.status === 'Trial Order');
  const quotedLeads = leads.filter((l) => l.status === 'Quoted');

  return (
    <div className="space-y-6">
      {/* Top Banner Alert if pending approvals exist */}
      {pendingApprovals.length > 0 && (
        <div className="bg-[#1A1810] border border-[#D4AF37]/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center text-xl font-bold">
              🔔
            </span>
            <div>
              <h4 className="text-white font-bold text-sm sm:text-base">
                {pendingApprovals.length} Outbound Message{pendingApprovals.length > 1 ? 's' : ''} Awaiting Owner Approval
              </h4>
              <p className="text-gray-400 text-xs">
                Zero messages are sent automatically. Review and approve before sending via WhatsApp.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('approvals')}
            className="px-4 py-2 bg-[#D4AF37] hover:bg-[#b5952f] text-black font-extrabold text-xs rounded-lg transition-colors shadow-md whitespace-nowrap"
          >
            Review Queue ({pendingApprovals.length})
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-[#111111] border border-white/5 p-4 rounded-xl">
          <div className="text-gray-400 text-xs font-semibold uppercase">Total Leads</div>
          <div className="text-2xl font-black text-white mt-1">{leads.length}</div>
          <div className="text-[11px] text-[#D4AF37] mt-1 font-medium">Navi Mumbai B2B</div>
        </div>

        <div className="bg-[#111111] border border-white/5 p-4 rounded-xl">
          <div className="text-gray-400 text-xs font-semibold uppercase">Pending Approvals</div>
          <div className="text-2xl font-black text-amber-400 mt-1">{pendingApprovals.length}</div>
          <div className="text-[11px] text-gray-400 mt-1">Requires manual review</div>
        </div>

        <div className="bg-[#111111] border border-white/5 p-4 rounded-xl">
          <div className="text-gray-400 text-xs font-semibold uppercase">Follow-ups Today</div>
          <div className="text-2xl font-black text-rose-400 mt-1">{todayFollowUps.length}</div>
          <div className="text-[11px] text-gray-400 mt-1">High-priority touchpoints</div>
        </div>

        <div className="bg-[#111111] border border-white/5 p-4 rounded-xl">
          <div className="text-gray-400 text-xs font-semibold uppercase">Quotations Sent</div>
          <div className="text-2xl font-black text-blue-400 mt-1">{quotations.length}</div>
          <div className="text-[11px] text-gray-400 mt-1">{quotedLeads.length} leads in review</div>
        </div>

        <div className="bg-[#111111] border border-white/5 p-4 rounded-xl">
          <div className="text-gray-400 text-xs font-semibold uppercase">Converted Accounts</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{activeCustomers.length}</div>
          <div className="text-[11px] text-emerald-500 mt-1">Wholesale & Trial</div>
        </div>

        <div className="bg-[#111111] border border-white/5 p-4 rounded-xl">
          <div className="text-gray-400 text-xs font-semibold uppercase">AI Messages Sent</div>
          <div className="text-2xl font-black text-purple-400 mt-1">
            {messages.filter((m) => m.status === 'SENT_MANUALLY').length}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">Confirmed by Owner</div>
        </div>
      </div>

      {/* Two Column Layout: Urgent Follow-ups & Recent Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Follow-ups Due Today */}
        <div className="bg-[#111111] border border-white/5 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
              <h3 className="text-white font-extrabold text-sm flex items-center gap-2">
                <span>⏰</span> Follow-ups Due Today & Overdue
              </h3>
              <button
                onClick={() => onNavigateTab('follow-ups')}
                className="text-xs text-[#D4AF37] hover:underline font-bold"
              >
                View All ({followUps.length})
              </button>
            </div>

            {todayFollowUps.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-xs">
                No follow-ups due today. You are fully caught up! 🎉
              </div>
            ) : (
              <div className="space-y-3">
                {todayFollowUps.slice(0, 4).map((fu) => (
                  <div
                    key={fu.id}
                    className="p-3 bg-white/5 border border-white/5 rounded-lg flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-white font-bold text-xs">{fu.title}</div>
                      <div className="text-gray-400 text-[11px] mt-0.5">
                        Due: <span className="text-rose-400 font-semibold">{fu.due_date}</span> • Priority: {fu.priority}
                      </div>
                      {fu.notes && <div className="text-gray-500 text-[11px] mt-0.5 line-clamp-1">{fu.notes}</div>}
                    </div>
                    <button
                      onClick={() => onNavigateTab('follow-ups')}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-bold whitespace-nowrap"
                    >
                      Action
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/5 mt-4">
            <button
              onClick={() => onNavigateTab('follow-ups')}
              className="w-full py-2 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-lg transition-colors"
            >
              Manage All Follow-ups
            </button>
          </div>
        </div>

        {/* Right: Quick Lead Research & Action */}
        <div className="bg-[#111111] border border-white/5 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
              <h3 className="text-white font-extrabold text-sm flex items-center gap-2">
                <span>🎯</span> Priority Prospects in Navi Mumbai
              </h3>
              <button
                onClick={() => onNavigateTab('leads')}
                className="text-xs text-[#D4AF37] hover:underline font-bold"
              >
                Full CRM ({leads.length})
              </button>
            </div>

            <div className="space-y-3">
              {leads.slice(0, 4).map((lead) => (
                <div
                  key={lead.id}
                  className="p-3 bg-white/5 border border-white/5 rounded-lg flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-xs">{lead.business_name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#D4AF37]/20 text-[#D4AF37] font-semibold">
                        {lead.area}
                      </span>
                    </div>
                    <div className="text-gray-400 text-[11px] mt-0.5">
                      {lead.category} • Est. {lead.estimated_daily_kg || 25}kg/day • Status: <span className="text-gray-300 font-semibold">{lead.status}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (onSelectLeadForMessage) onSelectLeadForMessage(lead);
                      onNavigateTab('generator');
                    }}
                    className="px-3 py-1.5 bg-[#D4AF37]/20 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-black rounded text-xs font-bold transition-colors whitespace-nowrap"
                  >
                    Draft AI Message
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 mt-4 flex gap-2">
            <button
              onClick={() => onNavigateTab('lead-finder')}
              className="flex-1 py-2 bg-[#D4AF37] hover:bg-[#b5952f] text-black font-extrabold text-xs rounded-lg transition-colors text-center"
            >
              + Find New Leads
            </button>
            <button
              onClick={() => onNavigateTab('generator')}
              className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-lg transition-colors text-center"
            >
              AI Message Generator
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
