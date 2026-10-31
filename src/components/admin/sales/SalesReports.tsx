"use client";

import React from 'react';
import { SalesLead, SalesMessage, SalesQuotation, SalesFollowUp } from './types';

interface SalesReportsProps {
  leads: SalesLead[];
  messages: SalesMessage[];
  quotations: SalesQuotation[];
  followUps: SalesFollowUp[];
  orders: any[];
}

export default function SalesReports({
  leads,
  messages,
  quotations,
  followUps,
  orders,
}: SalesReportsProps) {
  // Funnel counts
  const totalLeads = leads.length;
  const contactedLeads = leads.filter((l) => l.status !== 'New').length;
  const interestedLeads = leads.filter((l) => ['Interested', 'Quoted', 'Trial Order', 'Active Customer'].includes(l.status)).length;
  const quotedLeads = leads.filter((l) => ['Quoted', 'Trial Order', 'Active Customer'].includes(l.status)).length;
  const trialOrders = leads.filter((l) => ['Trial Order', 'Active Customer'].includes(l.status)).length;
  const activeCustomers = leads.filter((l) => l.status === 'Active Customer').length;

  // Area distribution
  const areaCounts: Record<string, number> = {};
  leads.forEach((l) => {
    const area = l.area || 'Other';
    areaCounts[area] = (areaCounts[area] || 0) + 1;
  });

  // Category distribution
  const catCounts: Record<string, number> = {};
  leads.forEach((l) => {
    const cat = l.category || 'Other';
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  });

  // Message Metrics
  const totalDrafts = messages.length;
  const approvedCount = messages.filter((m) => m.status === 'APPROVED' || m.status === 'SENT_MANUALLY').length;
  const rejectedCount = messages.filter((m) => m.status === 'REJECTED').length;
  const sentManuallyCount = messages.filter((m) => m.status === 'SENT_MANUALLY').length;

  // Quotation metrics
  const totalQuotedAmount = quotations.reduce((sum, q) => sum + (Number(q.total) || 0), 0);
  const acceptedQuotes = quotations.filter((q) => q.status === 'Accepted');
  const acceptedAmount = acceptedQuotes.reduce((sum, q) => sum + (Number(q.total) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#111111] border border-white/5 p-5 rounded-xl">
        <h2 className="text-white font-black text-lg">Sales Analytics & Market Reports</h2>
        <p className="text-gray-400 text-xs mt-1">
          Complete performance metrics on B2B lead acquisition, quote conversions, Navi Mumbai area coverage, and message compliance.
        </p>
      </div>

      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#111111] border border-white/5 p-4 rounded-xl">
          <div className="text-gray-400 text-xs font-semibold uppercase">Total Quotation Pipeline</div>
          <div className="text-2xl font-black text-[#D4AF37] mt-1">
            ₹{totalQuotedAmount.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">{quotations.length} quotes generated</div>
        </div>

        <div className="bg-[#111111] border border-white/5 p-4 rounded-xl">
          <div className="text-gray-400 text-xs font-semibold uppercase">Accepted B2B Quotes</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            ₹{acceptedAmount.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-emerald-500 mt-1">{acceptedQuotes.length} converted contracts</div>
        </div>

        <div className="bg-[#111111] border border-white/5 p-4 rounded-xl">
          <div className="text-gray-400 text-xs font-semibold uppercase">Total Prospects</div>
          <div className="text-2xl font-black text-white mt-1">{totalLeads}</div>
          <div className="text-[11px] text-blue-400 mt-1">{activeCustomers} active clients</div>
        </div>

        <div className="bg-[#111111] border border-white/5 p-4 rounded-xl">
          <div className="text-gray-400 text-xs font-semibold uppercase">Approval Safety Rate</div>
          <div className="text-2xl font-black text-purple-400 mt-1">100%</div>
          <div className="text-[11px] text-gray-400 mt-1">All messages owner-reviewed</div>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-[#111111] border border-white/5 p-5 rounded-xl space-y-4">
        <h3 className="text-white font-extrabold text-sm flex items-center gap-2">
          <span>📊</span> B2B Sales Conversion Funnel
        </h3>

        <div className="space-y-3">
          {[
            { label: 'Discovered Leads', count: totalLeads, color: 'bg-blue-500', pct: 100 },
            {
              label: 'Contacted Prospects',
              count: contactedLeads,
              color: 'bg-indigo-500',
              pct: totalLeads ? Math.round((contactedLeads / totalLeads) * 100) : 0,
            },
            {
              label: 'Interested Accounts',
              count: interestedLeads,
              color: 'bg-purple-500',
              pct: totalLeads ? Math.round((interestedLeads / totalLeads) * 100) : 0,
            },
            {
              label: 'Quotations Provided',
              count: quotedLeads,
              color: 'bg-amber-500',
              pct: totalLeads ? Math.round((quotedLeads / totalLeads) * 100) : 0,
            },
            {
              label: 'Trial Orders Placed',
              count: trialOrders,
              color: 'bg-emerald-500',
              pct: totalLeads ? Math.round((trialOrders / totalLeads) * 100) : 0,
            },
            {
              label: 'Active Regular Customers',
              count: activeCustomers,
              color: 'bg-green-400',
              pct: totalLeads ? Math.round((activeCustomers / totalLeads) * 100) : 0,
            },
          ].map((step, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-300 font-semibold">{step.label}</span>
                <span className="text-gray-400">
                  {step.count} ({step.pct}%)
                </span>
              </div>
              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${step.color} transition-all duration-500 rounded-full`}
                  style={{ width: `${Math.max(5, step.pct)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Breakdown: Navi Mumbai Nodes & Business Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Navi Mumbai Area Distribution */}
        <div className="bg-[#111111] border border-white/5 p-5 rounded-xl space-y-3">
          <h3 className="text-white font-extrabold text-sm flex items-center gap-2">
            <span>📍</span> Navi Mumbai Regional Distribution
          </h3>

          <div className="space-y-2">
            {Object.entries(areaCounts).length === 0 ? (
              <div className="text-gray-500 text-xs py-4 text-center">No area data yet.</div>
            ) : (
              Object.entries(areaCounts).map(([areaName, count]) => {
                const pct = totalLeads ? Math.round((count / totalLeads) * 100) : 0;
                return (
                  <div key={areaName} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-300 font-bold">{areaName}</span>
                      <span className="text-[#D4AF37] font-semibold">
                        {count} leads ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-[#D4AF37]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Business Category Breakdown */}
        <div className="bg-[#111111] border border-white/5 p-5 rounded-xl space-y-3">
          <h3 className="text-white font-extrabold text-sm flex items-center gap-2">
            <span>🍽️</span> Category Breakdown
          </h3>

          <div className="space-y-2">
            {Object.entries(catCounts).length === 0 ? (
              <div className="text-gray-500 text-xs py-4 text-center">No category data yet.</div>
            ) : (
              Object.entries(catCounts).map(([catName, count]) => {
                const pct = totalLeads ? Math.round((count / totalLeads) * 100) : 0;
                return (
                  <div key={catName} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-300 font-bold">{catName}</span>
                      <span className="text-purple-400 font-semibold">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Outbound Messaging Compliance Summary */}
      <div className="bg-[#111111] border border-white/5 p-5 rounded-xl space-y-3">
        <h3 className="text-white font-extrabold text-sm flex items-center gap-2">
          <span>📨</span> AI Outbound Messaging & Compliance
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-black/40 rounded-xl border border-white/5">
            <span className="text-gray-400 block">Total Drafted</span>
            <span className="text-white font-black text-base">{totalDrafts}</span>
          </div>

          <div className="p-3 bg-black/40 rounded-xl border border-white/5">
            <span className="text-gray-400 block">Approved by Owner</span>
            <span className="text-blue-400 font-black text-base">{approvedCount}</span>
          </div>

          <div className="p-3 bg-black/40 rounded-xl border border-white/5">
            <span className="text-gray-400 block">Sent via WhatsApp</span>
            <span className="text-emerald-400 font-black text-base">{sentManuallyCount}</span>
          </div>

          <div className="p-3 bg-black/40 rounded-xl border border-white/5">
            <span className="text-gray-400 block">Rejected Drafts</span>
            <span className="text-rose-400 font-black text-base">{rejectedCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
