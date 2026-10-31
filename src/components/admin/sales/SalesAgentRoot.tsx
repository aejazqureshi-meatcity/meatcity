"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  SalesLead,
  SalesMessage,
  SalesQuotation,
  SalesFollowUp,
  SalesSettingsMap,
} from './types';

import SalesOverview from './SalesOverview';
import LeadFinder from './LeadFinder';
import B2BLeads from './B2BLeads';
import B2CCustomers from './B2CCustomers';
import MessageGenerator from './MessageGenerator';
import ApprovalQueue from './ApprovalQueue';
import FollowUpManager from './FollowUpManager';
import QuotationsManager from './QuotationsManager';
import SalesReports from './SalesReports';
import SalesSettings from './SalesSettings';

interface SalesAgentRootProps {
  users: any[];
  orders: any[];
  products: any[];
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'lead-finder', label: 'AI Lead Finder', icon: '🎯' },
  { id: 'leads', label: 'B2B Leads CRM', icon: '🏢' },
  { id: 'b2c-customers', label: 'B2C Customers', icon: '🍗' },
  { id: 'generator', label: 'AI Message Generator', icon: '⚡' },
  { id: 'approvals', label: 'Approval Queue', icon: '🛡️' },
  { id: 'follow-ups', label: 'Follow-ups', icon: '⏰' },
  { id: 'quotations', label: 'Quotations', icon: '📄' },
  { id: 'reports', label: 'Reports & Analytics', icon: '📈' },
  { id: 'settings', label: 'Sales Settings', icon: '⚙️' },
];

export default function SalesAgentRoot({
  users,
  orders,
  products,
}: SalesAgentRootProps) {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dbStatusWarning, setDbStatusWarning] = useState<string | null>(null);

  // Core Data States
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [messages, setMessages] = useState<SalesMessage[]>([]);
  const [quotations, setQuotations] = useState<SalesQuotation[]>([]);
  const [followUps, setFollowUps] = useState<SalesFollowUp[]>([]);
  const [settings, setSettings] = useState<SalesSettingsMap>({
    business_name: 'MeatCity',
    business_hub: 'Shop No.2, Sector 20, Turbhe, Navi Mumbai - 400705',
    official_whatsapp: '917977630912',
    min_b2b_order_kg: '10',
    wholesale_payment_terms: 'Cash on Delivery / UPI / 7-Day Verified Credit',
    preferred_tone: 'respectful_roman_hinglish',
    delivery_slots: 'Morning 6:00 AM - 8:00 AM (Turbhe Sector 20 Hub)',
  });

  // Cross-Tab Context Selections
  const [selectedLeadForContext, setSelectedLeadForContext] = useState<SalesLead | null>(null);
  const [selectedCustomerForContext, setSelectedCustomerForContext] = useState<any | null>(null);
  const [initialGeneratorPurpose, setInitialGeneratorPurpose] = useState<string>('Wholesale Supply Enquiry');

  const supabase = createClient();

  // Load Sales Data
  const loadSalesData = async () => {
    setIsLoading(true);
    setDbStatusWarning(null);

    try {
      // 1. Leads
      const { data: leadsData, error: leadsErr } = await supabase
        .from('sales_leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (leadsErr) {
        console.warn('sales_leads query notice:', leadsErr.message);
        setDbStatusWarning(
          'Supabase sales tables are not yet created. Run sales_agent_migration.sql in your Supabase SQL editor to enable cloud synchronization. Local storage is active.'
        );
        // Fallback to local storage
        loadFromLocalStorage();
        setIsLoading(false);
        return;
      }

      setLeads(leadsData || []);

      // 2. Messages
      const { data: messagesData } = await supabase
        .from('sales_messages')
        .select('*')
        .order('created_at', { ascending: false });
      setMessages(messagesData || []);

      // 3. Quotations
      const { data: quotesData } = await supabase
        .from('sales_quotations')
        .select('*')
        .order('created_at', { ascending: false });
      setQuotations(quotesData || []);

      // 4. Follow-ups
      const { data: followUpsData } = await supabase
        .from('sales_follow_ups')
        .select('*')
        .order('due_date', { ascending: true });
      setFollowUps(followUpsData || []);

      // 5. Settings
      const { data: settingsData } = await supabase
        .from('sales_settings')
        .select('*');
      if (settingsData && settingsData.length > 0) {
        const map: any = {};
        settingsData.forEach((row: any) => {
          if (row.key !== 'gemini_api_key') {
            map[row.key] = row.value;
          }
        });
        setSettings((prev) => ({ ...prev, ...map }));
      }
    } catch (e: any) {
      console.error('Failed loading sales data from Supabase:', e);
      loadFromLocalStorage();
    } finally {
      setIsLoading(false);
    }
  };

  // Local Storage Fallback
  const loadFromLocalStorage = () => {
    try {
      const storedLeads = localStorage.getItem('meatcity_sales_leads');
      if (storedLeads) setLeads(JSON.parse(storedLeads));
      else seedInitialLeads();

      const storedMessages = localStorage.getItem('meatcity_sales_messages');
      if (storedMessages) setMessages(JSON.parse(storedMessages));

      const storedQuotes = localStorage.getItem('meatcity_sales_quotations');
      if (storedQuotes) setQuotations(JSON.parse(storedQuotes));

      const storedFollowUps = localStorage.getItem('meatcity_sales_followups');
      if (storedFollowUps) setFollowUps(JSON.parse(storedFollowUps));

      const storedSettings = localStorage.getItem('meatcity_sales_settings');
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        delete parsed.gemini_api_key;
        setSettings(parsed);
      }
    } catch (err) {
      seedInitialLeads();
    }
  };

  const seedInitialLeads = () => {
    const seeds: SalesLead[] = [
      {
        id: 'seed-1',
        business_name: 'Noorani Biryani House',
        contact_person: 'Mohsin Khan',
        phone: '9820112233',
        email: 'noorani.vashi@gmail.com',
        category: 'Biryani Shop',
        area: 'Vashi',
        address: 'Sector 17, Opp. Vashi Plaza, Vashi, Navi Mumbai',
        source_url: 'Sector 17 Commercial Hub',
        status: 'New',
        estimated_daily_kg: 35,
        preferred_items: 'Chicken Curry Cut, Boneless Breast',
        notes: 'High volume biryani vendor, looking for daily 7 AM delivery from Turbhe.',
        opt_out: false,
        created_at: new Date().toISOString(),
      },
      {
        id: 'seed-2',
        business_name: 'Dawat Caterers & Events',
        contact_person: 'Irfan Qureshi',
        phone: '9833445566',
        email: 'dawat.caterers@gmail.com',
        category: 'Caterer',
        area: 'Nerul',
        address: 'Sector 20, Near Nerul Station East',
        source_url: 'Navi Mumbai Caterers Directory',
        status: 'Interested',
        estimated_daily_kg: 50,
        preferred_items: 'Fresh Mutton Cuts, Whole Cleaned Chicken',
        notes: 'Weekend event catering. Needs bulk mutton rate confirmation.',
        opt_out: false,
        created_at: new Date().toISOString(),
      },
      {
        id: 'seed-3',
        business_name: 'Al-Madina Darbar Restaurant',
        contact_person: 'Rizwan Shaikh',
        phone: '9892001122',
        category: 'Restaurant',
        area: 'Turbhe',
        address: 'Near Turbhe Naka, Sector 20, Turbhe',
        source_url: 'Turbhe Market Merchant Network',
        status: 'Contacted',
        estimated_daily_kg: 30,
        preferred_items: 'Chicken Curry Cut, Farm Eggs (Crates)',
        notes: 'Within walking distance of Turbhe processing hub.',
        opt_out: false,
        created_at: new Date().toISOString(),
      },
    ];
    setLeads(seeds);
    try {
      localStorage.setItem('meatcity_sales_leads', JSON.stringify(seeds));
    } catch (e) {}
  };

  useEffect(() => {
    loadSalesData();
  }, []);

  // CRUD Handler: Leads
  const handleAddLead = async (leadData: Omit<SalesLead, 'id' | 'created_at'>) => {
    const newLead: SalesLead = {
      ...leadData,
      id: 'lead-' + Date.now(),
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase.from('sales_leads').insert([newLead]).select();
      if (!error && data && data.length > 0) {
        setLeads((prev) => [data[0], ...prev]);
        return;
      }
    } catch (e) {}

    // Fallback local update
    const updated = [newLead, ...leads];
    setLeads(updated);
    try {
      localStorage.setItem('meatcity_sales_leads', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleBulkAddLeads = async (newLeadsData: Array<Omit<SalesLead, 'id' | 'created_at'>>) => {
    const stamped = newLeadsData.map((l, idx) => ({
      ...l,
      id: `lead-${Date.now()}-${idx}`,
      created_at: new Date().toISOString(),
    }));

    try {
      const { data, error } = await supabase.from('sales_leads').insert(stamped).select();
      if (!error && data && data.length > 0) {
        setLeads((prev) => [...data, ...prev]);
        return;
      }
    } catch (e) {}

    const updated = [...stamped, ...leads];
    setLeads(updated);
    try {
      localStorage.setItem('meatcity_sales_leads', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleUpdateLead = async (id: string, updates: Partial<SalesLead>) => {
    try {
      await supabase.from('sales_leads').update(updates).eq('id', id);
    } catch (e) {}

    const updated = leads.map((l) => (l.id === id ? { ...l, ...updates } : l));
    setLeads(updated);
    try {
      localStorage.setItem('meatcity_sales_leads', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleDeleteLead = async (id: string) => {
    try {
      await supabase.from('sales_leads').delete().eq('id', id);
    } catch (e) {}

    const updated = leads.filter((l) => l.id !== id);
    setLeads(updated);
    try {
      localStorage.setItem('meatcity_sales_leads', JSON.stringify(updated));
    } catch (e) {}
  };

  // CRUD Handler: Messages
  const handleSaveMessage = async (msgData: Omit<SalesMessage, 'id' | 'created_at'>) => {
    const newMsg: SalesMessage = {
      ...msgData,
      id: 'msg-' + Date.now(),
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase.from('sales_messages').insert([newMsg]).select();
      if (!error && data && data.length > 0) {
        setMessages((prev) => [data[0], ...prev]);
        return;
      }
    } catch (e) {}

    const updated = [newMsg, ...messages];
    setMessages(updated);
    try {
      localStorage.setItem('meatcity_sales_messages', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleUpdateMessage = async (id: string, updates: Partial<SalesMessage>) => {
    try {
      await supabase.from('sales_messages').update(updates).eq('id', id);
    } catch (e) {}

    const updated = messages.map((m) => (m.id === id ? { ...m, ...updates } : m));
    setMessages(updated);
    try {
      localStorage.setItem('meatcity_sales_messages', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      await supabase.from('sales_messages').delete().eq('id', id);
    } catch (e) {}

    const updated = messages.filter((m) => m.id !== id);
    setMessages(updated);
    try {
      localStorage.setItem('meatcity_sales_messages', JSON.stringify(updated));
    } catch (e) {}
  };

  // Manual Sent Confirmation (Updates Lead status to Contacted)
  const handleConfirmManualSend = async (message: SalesMessage) => {
    await handleUpdateMessage(message.id, {
      status: 'SENT_MANUALLY',
      sent_at: new Date().toISOString(),
    });

    if (message.lead_id) {
      await handleUpdateLead(message.lead_id, {
        status: 'Contacted',
        last_contacted_at: new Date().toISOString(),
      });
    }

    alert('Confirmed: Message marked as sent manually and lead status updated to Contacted!');
  };

  // CRUD Handler: Quotations
  const handleAddQuotation = async (qData: Omit<SalesQuotation, 'id' | 'created_at'>) => {
    const newQ: SalesQuotation = {
      ...qData,
      id: 'quote-' + Date.now(),
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase.from('sales_quotations').insert([newQ]).select();
      if (!error && data && data.length > 0) {
        setQuotations((prev) => [data[0], ...prev]);
        if (qData.lead_id) {
          handleUpdateLead(qData.lead_id, { status: 'Quoted' });
        }
        return;
      }
    } catch (e) {}

    const updated = [newQ, ...quotations];
    setQuotations(updated);
    if (qData.lead_id) {
      handleUpdateLead(qData.lead_id, { status: 'Quoted' });
    }
    try {
      localStorage.setItem('meatcity_sales_quotations', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleUpdateQuotation = async (id: string, updates: Partial<SalesQuotation>) => {
    try {
      await supabase.from('sales_quotations').update(updates).eq('id', id);
    } catch (e) {}

    const updated = quotations.map((q) => (q.id === id ? { ...q, ...updates } : q));
    setQuotations(updated);
    try {
      localStorage.setItem('meatcity_sales_quotations', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleDeleteQuotation = async (id: string) => {
    try {
      await supabase.from('sales_quotations').delete().eq('id', id);
    } catch (e) {}

    const updated = quotations.filter((q) => q.id !== id);
    setQuotations(updated);
    try {
      localStorage.setItem('meatcity_sales_quotations', JSON.stringify(updated));
    } catch (e) {}
  };

  // CRUD Handler: Follow-ups
  const handleAddFollowUp = async (fuData: Omit<SalesFollowUp, 'id' | 'created_at'>) => {
    const newFu: SalesFollowUp = {
      ...fuData,
      id: 'fu-' + Date.now(),
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase.from('sales_follow_ups').insert([newFu]).select();
      if (!error && data && data.length > 0) {
        setFollowUps((prev) => [data[0], ...prev]);
        return;
      }
    } catch (e) {}

    const updated = [newFu, ...followUps];
    setFollowUps(updated);
    try {
      localStorage.setItem('meatcity_sales_followups', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleUpdateFollowUp = async (id: string, updates: Partial<SalesFollowUp>) => {
    try {
      await supabase.from('sales_follow_ups').update(updates).eq('id', id);
    } catch (e) {}

    const updated = followUps.map((f) => (f.id === id ? { ...f, ...updates } : f));
    setFollowUps(updated);
    try {
      localStorage.setItem('meatcity_sales_followups', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleDeleteFollowUp = async (id: string) => {
    try {
      await supabase.from('sales_follow_ups').delete().eq('id', id);
    } catch (e) {}

    const updated = followUps.filter((f) => f.id !== id);
    setFollowUps(updated);
    try {
      localStorage.setItem('meatcity_sales_followups', JSON.stringify(updated));
    } catch (e) {}
  };

  // Handler: Settings
  const handleSaveSetting = async (key: string, value: string) => {
    // Security check: Never write API keys to settings or localStorage
    if (key === 'gemini_api_key') {
      console.warn('Blocked attempt to save API key in client settings.');
      return;
    }

    try {
      await supabase
        .from('sales_settings')
        .upsert([{ key, value, updated_at: new Date().toISOString() }], { onConflict: 'key' });
    } catch (e) {}

    const updated = { ...settings, [key]: value };
    delete (updated as any).gemini_api_key;
    setSettings(updated);
    try {
      localStorage.setItem('meatcity_sales_settings', JSON.stringify(updated));
    } catch (e) {}
  };

  // Badge counts
  const pendingApprovalsCount = messages.filter((m) => m.status === 'PENDING_APPROVAL').length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayFollowUpsCount = followUps.filter((f) => f.due_date <= todayStr && f.status === 'Pending').length;

  return (
    <div className="space-y-6">
      {/* Top Banner Warning if Supabase tables are pending migration */}
      {dbStatusWarning && (
        <div className="bg-[#1C1608] border border-[#D4AF37]/50 rounded-xl p-4 text-xs text-amber-200 flex items-start gap-3 shadow-lg">
          <span className="text-xl">⚠️</span>
          <div className="flex-1">
            <span className="font-bold block text-white text-sm mb-0.5">Database Migration Notice:</span>
            {dbStatusWarning}
            <div className="mt-2 text-[#D4AF37] font-mono text-[11px]">
              Script location: <span className="underline">sales_agent_migration.sql</span> (in workspace root)
            </div>
          </div>
        </div>
      )}

      {/* Sub-Navigation Header Bar */}
      <div className="bg-[#111111] border border-white/5 rounded-2xl p-2.5 overflow-x-auto shadow-2xl">
        <div className="flex items-center gap-1.5 min-w-max">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const isApprovals = tab.id === 'approvals' && pendingApprovalsCount > 0;
            const isFollowUps = tab.id === 'follow-ups' && todayFollowUpsCount > 0;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#D4AF37] text-black font-black shadow-lg scale-105'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>

                {isApprovals && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-black text-[#D4AF37]' : 'bg-amber-400 text-black'
                    }`}
                  >
                    {pendingApprovalsCount}
                  </span>
                )}

                {isFollowUps && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-black text-rose-400' : 'bg-rose-500 text-white'
                    }`}
                  >
                    {todayFollowUpsCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-view Content Router */}
      <div className="transition-opacity duration-200">
        {activeTab === 'overview' && (
          <SalesOverview
            leads={leads}
            messages={messages}
            quotations={quotations}
            followUps={followUps}
            onNavigateTab={setActiveTab}
            onSelectLeadForMessage={(lead) => {
              setSelectedLeadForContext(lead);
              setSelectedCustomerForContext(null);
              setInitialGeneratorPurpose('Wholesale Supply Enquiry');
              setActiveTab('generator');
            }}
          />
        )}

        {activeTab === 'lead-finder' && (
          <LeadFinder
            existingLeads={leads}
            onAddLead={handleAddLead}
            onBulkAddLeads={handleBulkAddLeads}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'leads' && (
          <B2BLeads
            leads={leads}
            onUpdateLead={handleUpdateLead}
            onDeleteLead={handleDeleteLead}
            onSelectLeadForMessage={(lead) => {
              setSelectedLeadForContext(lead);
              setSelectedCustomerForContext(null);
              setInitialGeneratorPurpose('Wholesale Supply Enquiry');
              setActiveTab('generator');
            }}
            onSelectLeadForQuotation={(lead) => {
              setSelectedLeadForContext(lead);
              setActiveTab('quotations');
            }}
            onSelectLeadForFollowUp={(lead) => {
              setSelectedLeadForContext(lead);
              setActiveTab('follow-ups');
            }}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'b2c-customers' && (
          <B2CCustomers
            users={users}
            orders={orders}
            onSelectCustomerForMessage={(customer, purpose) => {
              setSelectedCustomerForContext(customer);
              setSelectedLeadForContext(null);
              setInitialGeneratorPurpose(purpose);
              setActiveTab('generator');
            }}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'generator' && (
          <MessageGenerator
            leads={leads}
            customers={users.filter((u) => u.user_type === 'b2c')}
            products={products}
            selectedLead={selectedLeadForContext}
            selectedCustomer={selectedCustomerForContext}
            initialPurpose={initialGeneratorPurpose}
            onSaveMessage={handleSaveMessage}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'approvals' && (
          <ApprovalQueue
            messages={messages}
            leads={leads}
            onUpdateMessage={handleUpdateMessage}
            onDeleteMessage={handleDeleteMessage}
            onConfirmManualSend={handleConfirmManualSend}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'follow-ups' && (
          <FollowUpManager
            followUps={followUps}
            leads={leads}
            onAddFollowUp={handleAddFollowUp}
            onUpdateFollowUp={handleUpdateFollowUp}
            onDeleteFollowUp={handleDeleteFollowUp}
            onDraftFollowUpMessage={(lead) => {
              setSelectedLeadForContext(lead);
              setSelectedCustomerForContext(null);
              setInitialGeneratorPurpose('Quotation Follow-up');
              setActiveTab('generator');
            }}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'quotations' && (
          <QuotationsManager
            quotations={quotations}
            leads={leads}
            products={products}
            selectedLead={selectedLeadForContext}
            onAddQuotation={handleAddQuotation}
            onUpdateQuotation={handleUpdateQuotation}
            onDeleteQuotation={handleDeleteQuotation}
          />
        )}

        {activeTab === 'reports' && (
          <SalesReports
            leads={leads}
            messages={messages}
            quotations={quotations}
            followUps={followUps}
            orders={orders}
          />
        )}

        {activeTab === 'settings' && (
          <SalesSettings
            settings={settings}
            onSaveSetting={handleSaveSetting}
          />
        )}
      </div>
    </div>
  );
}
