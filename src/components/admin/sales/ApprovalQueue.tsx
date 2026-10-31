"use client";

import React, { useState } from 'react';
import { SalesMessage, SalesLead } from './types';

interface ApprovalQueueProps {
  messages: SalesMessage[];
  leads?: SalesLead[];
  onUpdateMessage: (id: string, updates: Partial<SalesMessage>) => Promise<void>;
  onDeleteMessage: (id: string) => Promise<void>;
  onConfirmManualSend: (message: SalesMessage) => Promise<void>;
  onNavigateTab: (tab: string) => void;
}

const STATUS_TABS = [
  { id: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { id: 'APPROVED', label: 'Approved (Ready to Send)' },
  { id: 'SENT_MANUALLY', label: 'Confirmed Sent' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'ALL', label: 'All Messages' },
];

export default function ApprovalQueue({
  messages,
  leads = [],
  onUpdateMessage,
  onDeleteMessage,
  onConfirmManualSend,
  onNavigateTab,
}: ApprovalQueueProps) {
  const [activeStatusTab, setActiveStatusTab] = useState<string>('PENDING_APPROVAL');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<string>('');
  const [rejectionModalId, setRejectionModalId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Filter messages
  const filtered = messages.filter((m) => {
    if (activeStatusTab === 'ALL') return true;
    return m.status === activeStatusTab;
  });

  const handleStartEdit = (msg: SalesMessage) => {
    setEditingMessageId(msg.id);
    setEditedContent(msg.content);
  };

  const handleSaveEdit = async (msgId: string) => {
    await onUpdateMessage(msgId, { content: editedContent });
    setEditingMessageId(null);
  };

  const handleApprove = async (msgId: string) => {
    await onUpdateMessage(msgId, {
      status: 'APPROVED',
      approved_at: new Date().toISOString(),
    });
  };

  const handleRejectSubmit = async () => {
    if (!rejectionModalId) return;
    await onUpdateMessage(rejectionModalId, {
      status: 'REJECTED',
      rejection_reason: rejectionReason || 'Rejected by admin review',
    });
    setRejectionModalId(null);
    setRejectionReason('');
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(id);
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  // Build direct WhatsApp URL
  const getWhatsAppUrl = (phone?: string, text?: string) => {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text || '')}`;
  };

  const normalizePhone = (p?: string) => (p || '').replace(/\D/g, '');

  return (
    <div className="space-y-6">
      {/* Header & Warning */}
      <div className="bg-[#111111] border border-white/5 p-5 rounded-xl space-y-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-white font-black text-lg flex items-center gap-2">
              <span>🛡️</span> Outbound Message Approval Queue
            </h2>
            <p className="text-gray-400 text-xs mt-1">
              Strict Human-In-The-Loop wall: No automatic messaging is permitted. Review, edit, approve, copy, and send via WhatsApp manually.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('generator')}
            className="px-4 py-2 bg-[#D4AF37] hover:bg-[#b5952f] text-black font-extrabold text-xs rounded-lg transition-colors whitespace-nowrap"
          >
            + Draft New Message
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/5 pb-3">
        {STATUS_TABS.map((tab) => {
          const count =
            tab.id === 'ALL'
              ? messages.length
              : messages.filter((m) => m.status === tab.id).length;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveStatusTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
                activeStatusTab === tab.id
                  ? 'bg-[#D4AF37] text-black font-extrabold shadow-md'
                  : 'bg-[#111111] border border-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] ${
                  activeStatusTab === tab.id ? 'bg-black/20 text-black' : 'bg-white/10 text-gray-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Message Cards List */}
      {filtered.length === 0 ? (
        <div className="bg-[#111111] border border-white/5 rounded-xl p-12 text-center text-gray-500 text-xs">
          No messages found in this category.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((msg) => {
            const isEditing = editingMessageId === msg.id;
            
            // Check opt out against leads list
            const relatedLead = leads.find(
              (l) => l.id === msg.lead_id || (msg.recipient_phone && l.phone && normalizePhone(l.phone) === normalizePhone(msg.recipient_phone))
            );
            const isOptedOut = Boolean(relatedLead && (relatedLead.opt_out === true || relatedLead.status === 'Opted Out'));

            return (
              <div
                key={msg.id}
                className={`bg-[#111111] border rounded-xl p-5 space-y-4 shadow-xl transition-colors ${
                  isOptedOut ? 'border-rose-500/40 bg-rose-950/10' : 'border-white/5 hover:border-white/10'
                }`}
              >
                {/* Message Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-white/5 text-[#D4AF37] flex items-center justify-center font-bold text-sm">
                      {msg.recipient_type === 'b2b' ? '🏢' : '🍗'}
                    </span>
                    <div>
                      <div className="text-white font-extrabold text-sm flex items-center gap-2">
                        <span>{msg.recipient_name}</span>
                        {msg.recipient_phone && (
                          <span className="text-emerald-400 font-mono text-xs font-semibold">
                            {msg.recipient_phone}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-[10px] bg-white/10 text-gray-300 uppercase font-semibold">
                          {msg.recipient_type}
                        </span>
                        {isOptedOut && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-400 font-extrabold border border-rose-500/30">
                            OPTED OUT
                          </span>
                        )}
                      </div>
                      <div className="text-gray-400 text-xs mt-0.5">
                        Purpose: <span className="text-gray-200 font-semibold">{msg.purpose}</span> • Tone: {msg.language} • Channel: {msg.channel}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {msg.status === 'PENDING_APPROVAL' && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        ⏳ Pending Approval
                      </span>
                    )}
                    {msg.status === 'APPROVED' && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        ✓ Approved (Ready to Send)
                      </span>
                    )}
                    {msg.status === 'SENT_MANUALLY' && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        🚀 Sent Manually Confirmed
                      </span>
                    )}
                    {msg.status === 'REJECTED' && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        ✕ Rejected
                      </span>
                    )}
                  </div>
                </div>

                {/* Opt-out Warning Card */}
                {isOptedOut && (
                  <div className="p-3 bg-rose-950/40 border border-rose-500/50 rounded-xl text-xs text-rose-200 flex items-start gap-2.5">
                    <span className="text-base text-rose-400">⛔</span>
                    <div>
                      <div className="font-bold text-rose-300">Recipient Opted Out / Do Not Contact</div>
                      <p className="text-[11px] text-rose-400/90 mt-0.5">
                        This contact has requested not to receive sales outreach. Outbound WhatsApp dispatch and manual send confirmation are blocked.
                      </p>
                    </div>
                  </div>
                )}

                {/* Message Content / Inline Editor */}
                <div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        rows={7}
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="w-full bg-black/80 border border-[#D4AF37] text-gray-100 text-xs rounded-xl p-3 outline-none leading-relaxed"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingMessageId(null)}
                          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-bold"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(msg.id)}
                          className="px-4 py-1.5 bg-[#D4AF37] hover:bg-[#b5952f] text-black rounded text-xs font-black"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-black/50 border border-white/5 rounded-xl text-gray-200 text-xs whitespace-pre-wrap leading-relaxed font-sans">
                      {msg.content}
                    </div>
                  )}

                  {msg.status === 'REJECTED' && msg.rejection_reason && (
                    <div className="mt-2 p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-300 text-[11px]">
                      Reason for Rejection: {msg.rejection_reason}
                    </div>
                  )}
                </div>

                {/* Actions Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(msg.content, msg.id)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <span>📋</span>
                      <span>{copyFeedback === msg.id ? 'Copied!' : 'Copy Text'}</span>
                    </button>

                    {!isEditing && msg.status !== 'SENT_MANUALLY' && (
                      <button
                        onClick={() => handleStartEdit(msg)}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded text-xs font-bold transition-colors"
                      >
                        ✏️ Edit Message
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (confirm('Delete this message draft?')) {
                          onDeleteMessage(msg.id);
                        }
                      }}
                      className="p-1.5 hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 rounded text-xs transition-colors"
                      title="Delete Draft"
                    >
                      🗑️
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {msg.status === 'PENDING_APPROVAL' && (
                      <>
                        <button
                          onClick={() => setRejectionModalId(msg.id)}
                          className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white rounded text-xs font-bold transition-colors"
                        >
                          ✕ Reject
                        </button>

                        {isOptedOut ? (
                          <button
                            disabled
                            className="px-4 py-1.5 bg-gray-800 text-gray-500 cursor-not-allowed rounded text-xs font-bold"
                            title="Cannot approve message for opted-out recipient."
                          >
                            Cannot Approve (Opted Out)
                          </button>
                        ) : (
                          <button
                            onClick={() => handleApprove(msg.id)}
                            className="px-4 py-1.5 bg-[#D4AF37] hover:bg-[#b5952f] text-black rounded text-xs font-black transition-colors"
                          >
                            ✓ Approve Message
                          </button>
                        )}
                      </>
                    )}

                    {(msg.status === 'APPROVED' || msg.status === 'PENDING_APPROVAL') && (
                      <>
                        {isOptedOut ? (
                          <button
                            disabled
                            className="px-3 py-1.5 bg-gray-800 text-gray-500 cursor-not-allowed rounded text-xs font-bold flex items-center gap-1.5"
                            title="Outbound messaging is blocked because recipient has opted out."
                          >
                            <span>🚫</span>
                            <span>WhatsApp Blocked</span>
                          </button>
                        ) : (
                          msg.recipient_phone && (
                            <a
                              href={getWhatsAppUrl(msg.recipient_phone, msg.content)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-extrabold transition-colors flex items-center gap-1.5"
                            >
                              <span>💬</span>
                              <span>Open in WhatsApp</span>
                            </a>
                          )
                        )}

                        {isOptedOut ? (
                          <button
                            disabled
                            className="px-4 py-1.5 bg-gray-800 text-gray-500 cursor-not-allowed rounded text-xs font-bold"
                            title="Cannot confirm send for opted-out recipient."
                          >
                            Blocked (Opted Out)
                          </button>
                        ) : (
                          <button
                            onClick={() => onConfirmManualSend(msg)}
                            className="px-4 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-black rounded text-xs font-black transition-colors"
                            title="Confirm that you have manually sent this message"
                          >
                            ✓ Confirm Manually Sent
                          </button>
                        )}
                      </>
                    )}

                    {msg.status === 'SENT_MANUALLY' && (
                      <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                        ✓ Sent on {msg.sent_at ? new Date(msg.sent_at).toLocaleDateString() : 'Today'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rejection Modal */}
      {rejectionModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-white font-extrabold text-base">Reject Sales Message</h3>
            <p className="text-gray-400 text-xs">
              State the reason for rejecting this outbound draft (e.g. Price too low, customer on leave, incorrect contact person).
            </p>

            <textarea
              rows={3}
              placeholder="e.g. Quoted price needs adjustment for bulk mutton slab."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-rose-500"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setRejectionModalId(null)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-black"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
