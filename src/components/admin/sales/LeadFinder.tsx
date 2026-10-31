"use client";

import React, { useState } from 'react';
import { SalesLead } from './types';

interface LeadFinderProps {
  onAddLead: (lead: Omit<SalesLead, 'id' | 'created_at'>) => Promise<void>;
  onBulkAddLeads: (leads: Array<Omit<SalesLead, 'id' | 'created_at'>>) => Promise<void>;
  existingLeads: SalesLead[];
  onNavigateTab: (tab: string) => void;
}

const CATEGORIES = [
  'All',
  'Restaurant',
  'Biryani Shop',
  'Hotel',
  'Caterer',
  'Cloud Kitchen',
  'Food Business',
  'Dhaba'
];

const AREAS = [
  'All',
  'Vashi',
  'Nerul',
  'Belapur',
  'Turbhe',
  'Kopar Khairane',
  'Kharghar',
  'Panvel',
  'Sanpada',
  'Airoli',
  'Ghansoli'
];

export default function LeadFinder({
  onAddLead,
  onBulkAddLeads,
  existingLeads,
  onNavigateTab,
}: LeadFinderProps) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedArea, setSelectedArea] = useState('All');
  const [keyword, setKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchMessage, setSearchMessage] = useState('');

  // Modals
  const [showManualModal, setShowManualModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);

  // Manual Form
  const [manualForm, setManualForm] = useState({
    business_name: '',
    contact_person: '',
    phone: '',
    email: '',
    category: 'Restaurant',
    area: 'Vashi',
    address: '',
    source_url: 'Field Research / Market Observation',
    estimated_daily_kg: 25,
    preferred_items: 'Chicken Curry Cut, Boneless Breast',
    notes: '',
  });

  // CSV Import State
  const [csvContent, setCsvContent] = useState('');
  const [csvError, setCsvError] = useState('');

  // Search Navi Mumbai Market
  const handleSearch = async () => {
    setIsSearching(true);
    setSearchMessage('');
    try {
      const res = await fetch('/api/sales/lead-finder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory,
          area: selectedArea,
          keyword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSearchResults(data.leads || []);
        if ((data.leads || []).length === 0) {
          setSearchMessage('No new leads found matching your criteria. Try widening your area or category.');
        }
      } else {
        setSearchMessage(data.error || 'Failed to search leads');
      }
    } catch (err: any) {
      setSearchMessage('Search network error: ' + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  // Add a single discovered lead to CRM
  const handleSaveDiscoveredLead = async (lead: any) => {
    await onAddLead({
      business_name: lead.business_name,
      contact_person: lead.contact_person || '',
      phone: lead.phone || '',
      email: lead.email || '',
      category: lead.category || 'Restaurant',
      area: lead.area || 'Vashi',
      address: lead.address || '',
      source_url: lead.source_url || 'Navi Mumbai Directory Research',
      status: 'New',
      estimated_daily_kg: lead.estimated_daily_kg || 25,
      preferred_items: lead.preferred_items || 'Chicken Curry Cut',
      notes: lead.notes || '',
      opt_out: false,
    });
    // Remove from discovered list
    setSearchResults((prev) => prev.filter((item) => item.business_name !== lead.business_name));
  };

  // Submit Manual Form
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.business_name) {
      alert('Business Name is required');
      return;
    }
    await onAddLead({
      ...manualForm,
      status: 'New',
      opt_out: false,
    });
    setShowManualModal(false);
    setManualForm({
      business_name: '',
      contact_person: '',
      phone: '',
      email: '',
      category: 'Restaurant',
      area: 'Vashi',
      address: '',
      source_url: 'Field Research / Market Observation',
      estimated_daily_kg: 25,
      preferred_items: 'Chicken Curry Cut, Boneless Breast',
      notes: '',
    });
  };

  // Parse and Submit CSV
  const handleCsvImport = async () => {
    setCsvError('');
    if (!csvContent.trim()) {
      setCsvError('Please paste CSV data or choose a file.');
      return;
    }

    try {
      const lines = csvContent.trim().split('\n');
      if (lines.length < 2) {
        setCsvError('CSV must have a header row and at least one data row.');
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const nameIdx = headers.findIndex((h) => h.includes('business') || h.includes('name'));
      const areaIdx = headers.findIndex((h) => h.includes('area') || h.includes('location'));
      const catIdx = headers.findIndex((h) => h.includes('category') || h.includes('type'));
      const phoneIdx = headers.findIndex((h) => h.includes('phone') || h.includes('mobile'));
      const contactIdx = headers.findIndex((h) => h.includes('contact') || h.includes('owner') || h.includes('person'));
      const kgIdx = headers.findIndex((h) => h.includes('kg') || h.includes('volume') || h.includes('daily'));
      const notesIdx = headers.findIndex((h) => h.includes('note'));

      if (nameIdx === -1) {
        setCsvError('Header must contain "business_name" or "name" column.');
        return;
      }

      const parsedLeads: Array<Omit<SalesLead, 'id' | 'created_at'>> = [];
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map((col) => col.trim());
        if (!row[nameIdx]) continue;

        parsedLeads.push({
          business_name: row[nameIdx],
          area: areaIdx !== -1 && row[areaIdx] ? row[areaIdx] : 'Navi Mumbai',
          category: catIdx !== -1 && row[catIdx] ? row[catIdx] : 'Restaurant',
          phone: phoneIdx !== -1 && row[phoneIdx] ? row[phoneIdx] : '',
          contact_person: contactIdx !== -1 && row[contactIdx] ? row[contactIdx] : '',
          estimated_daily_kg: kgIdx !== -1 && !isNaN(Number(row[kgIdx])) ? Number(row[kgIdx]) : 25,
          notes: notesIdx !== -1 && row[notesIdx] ? row[notesIdx] : 'Imported via CSV',
          source_url: 'CSV Bulk Import',
          status: 'New',
          opt_out: false,
        });
      }

      if (parsedLeads.length === 0) {
        setCsvError('No valid lead rows could be extracted.');
        return;
      }

      await onBulkAddLeads(parsedLeads);
      setShowCsvModal(false);
      setCsvContent('');
      alert(`Successfully imported ${parsedLeads.length} leads!`);
    } catch (err: any) {
      setCsvError('CSV parse error: ' + err.message);
    }
  };

  // Export existing leads to CSV
  const handleExportCsv = () => {
    if (existingLeads.length === 0) {
      alert('No leads to export.');
      return;
    }
    const headers = ['Business Name', 'Category', 'Area', 'Contact Person', 'Phone', 'Email', 'Estimated Daily Kg', 'Status', 'Notes'];
    const rows = existingLeads.map((l) => [
      `"${l.business_name.replace(/"/g, '""')}"`,
      `"${l.category}"`,
      `"${l.area}"`,
      `"${l.contact_person || ''}"`,
      `"${l.phone || ''}"`,
      `"${l.email || ''}"`,
      l.estimated_daily_kg || 0,
      `"${l.status}"`,
      `"${(l.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvStr = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `meatcity_b2b_leads_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#111111] border border-white/5 p-5 rounded-xl">
        <div>
          <h2 className="text-white font-black text-lg">AI Lead Finder & Navi Mumbai Market Research</h2>
          <p className="text-gray-400 text-xs mt-1">
            Discover restaurants, biryani outlets, cloud kitchens, and caterers across Navi Mumbai. Never fabricates phone numbers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowManualModal(true)}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors"
          >
            + Add Lead Manually
          </button>
          <button
            onClick={() => setShowCsvModal(true)}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors"
          >
            📥 Import CSV
          </button>
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-bold transition-colors"
          >
            📤 Export CSV
          </button>
        </div>
      </div>

      {/* Search Filters */}
      <div className="bg-[#111111] border border-white/5 p-5 rounded-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-gray-400 text-xs font-semibold block mb-1">Business Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-gray-400 text-xs font-semibold block mb-1">Target Area (Navi Mumbai)</label>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
            >
              {AREAS.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-gray-400 text-xs font-semibold block mb-1">Keyword / Landmark Search</label>
            <input
              type="text"
              placeholder="e.g. Sector 17, Darbar, Mughlai, Catering..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-gray-400 text-xs">
            Hub: <span className="text-[#D4AF37] font-semibold">MeatCity Sector 20 Turbhe</span> (Express 6 AM - 8 AM dispatch radius)
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-6 py-2.5 bg-[#D4AF37] hover:bg-[#b5952f] disabled:opacity-50 text-black font-black text-xs rounded-lg transition-colors flex items-center gap-2"
          >
            {isSearching ? 'Researching Market...' : '🔍 Search Navi Mumbai Leads'}
          </button>
        </div>
      </div>

      {/* Search Results Display */}
      {searchMessage && (
        <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-center text-xs text-gray-400">
          {searchMessage}
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="bg-[#111111] border border-white/5 p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <h3 className="text-white font-bold text-sm">
              Discovered Establishments ({searchResults.length})
            </h3>
            <span className="text-gray-400 text-xs">Click "Save to CRM" to track and engage</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {searchResults.map((item, idx) => {
              const alreadyExists = existingLeads.some(
                (l) => l.business_name.toLowerCase() === item.business_name.toLowerCase()
              );

              return (
                <div
                  key={idx}
                  className="p-4 bg-white/5 border border-white/5 rounded-xl flex flex-col justify-between gap-3 hover:border-[#D4AF37]/40 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-white font-extrabold text-sm">{item.business_name}</h4>
                        <div className="mt-1 flex items-center gap-1.5">
                          {item.is_verified ? (
                            <span className="px-2 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-400 font-extrabold border border-emerald-500/30">
                              ✓ Verified Lead
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                              ⚠️ Unverified Suggestion
                            </span>
                          )}
                          {item.verification_date && (
                            <span className="text-[9px] text-gray-500">
                              Verified: {new Date(item.verification_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[#D4AF37]/20 text-[#D4AF37] font-bold">
                        {item.area}
                      </span>
                    </div>

                    <div className="text-gray-400 text-xs font-medium">
                      Category: <span className="text-gray-200">{item.category}</span>
                    </div>

                    <div className="text-gray-400 text-xs">
                      Address: <span className="text-gray-300">{item.address}</span>
                    </div>

                    <div className="text-gray-400 text-xs">
                      Contact: {item.contact_person ? (
                        <span className="text-gray-200 font-semibold">{item.contact_person}</span>
                      ) : (
                        <span className="text-gray-500 italic">No contact person recorded</span>
                      )}
                      {' • Phone: '}
                      {item.phone ? (
                        <span className="text-emerald-400 font-mono">{item.phone}</span>
                      ) : (
                        <span className="text-gray-500 italic">No phone on file (verification required)</span>
                      )}
                    </div>

                    <div className="text-gray-400 text-xs">
                      Est. Volume: <span className="text-emerald-400 font-bold">{item.estimated_daily_kg || 25} kg/day</span>
                    </div>

                    <div className="text-gray-400 text-xs">
                      Preferred Cuts: <span className="text-gray-300">{item.preferred_items || 'Chicken, Mutton'}</span>
                    </div>

                    {item.notes && (
                      <div className="p-2 bg-black/40 rounded text-[11px] text-gray-400 border border-white/5">
                        💡 {item.notes}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 truncate max-w-[200px]">
                      Source: {item.source_url}
                    </span>
                    {alreadyExists ? (
                      <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                        ✓ In CRM
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSaveDiscoveredLead(item)}
                        className="px-3 py-1.5 bg-[#D4AF37] hover:bg-[#b5952f] text-black font-extrabold text-xs rounded-lg transition-colors"
                      >
                        + Save to CRM
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Manual Lead Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="text-white font-extrabold text-base">Add Verified B2B Lead Manually</h3>
              <button
                onClick={() => setShowManualModal(false)}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="text-gray-300 text-xs font-semibold block mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Al-Raza Biryani House"
                  value={manualForm.business_name}
                  onChange={(e) => setManualForm({ ...manualForm, business_name: e.target.value })}
                  className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 text-xs font-semibold block mb-1">Category</label>
                  <select
                    value={manualForm.category}
                    onChange={(e) => setManualForm({ ...manualForm, category: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
                  >
                    {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-gray-300 text-xs font-semibold block mb-1">Area</label>
                  <select
                    value={manualForm.area}
                    onChange={(e) => setManualForm({ ...manualForm, area: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
                  >
                    {AREAS.filter((a) => a !== 'All').map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 text-xs font-semibold block mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Rizwan Bhai"
                    value={manualForm.contact_person}
                    onChange={(e) => setManualForm({ ...manualForm, contact_person: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-gray-300 text-xs font-semibold block mb-1">Phone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="e.g. 9820123456"
                    value={manualForm.phone}
                    onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-300 text-xs font-semibold block mb-1">Full Address / Landmark</label>
                <input
                  type="text"
                  placeholder="e.g. Sector 17, Opp. Bus Depot, Vashi"
                  value={manualForm.address}
                  onChange={(e) => setManualForm({ ...manualForm, address: e.target.value })}
                  className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 text-xs font-semibold block mb-1">Est. Daily Volume (Kg)</label>
                  <input
                    type="number"
                    value={manualForm.estimated_daily_kg}
                    onChange={(e) => setManualForm({ ...manualForm, estimated_daily_kg: Number(e.target.value) })}
                    className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-gray-300 text-xs font-semibold block mb-1">Public Source / Note</label>
                  <input
                    type="text"
                    value={manualForm.source_url}
                    onChange={(e) => setManualForm({ ...manualForm, source_url: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-300 text-xs font-semibold block mb-1">Preferred Cuts</label>
                <input
                  type="text"
                  placeholder="e.g. Chicken Curry Cut, Boneless Breast, Mutton"
                  value={manualForm.preferred_items}
                  onChange={(e) => setManualForm({ ...manualForm, preferred_items: e.target.value })}
                  className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="text-gray-300 text-xs font-semibold block mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Needs delivery by 7 AM daily, prefers COD on first order."
                  value={manualForm.notes}
                  onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                  className="w-full bg-black/60 border border-white/10 text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#D4AF37] hover:bg-[#b5952f] text-black text-xs font-black rounded-lg transition-colors"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="text-white font-extrabold text-base">Bulk CSV Lead Import</h3>
              <button
                onClick={() => setShowCsvModal(false)}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-gray-400 text-xs mb-3">
              Paste CSV text below with columns: <code className="text-[#D4AF37]">business_name, category, area, contact_person, phone, daily_kg, notes</code>
            </p>

            <textarea
              rows={8}
              placeholder={`business_name,category,area,contact_person,phone,daily_kg,notes\nAl-Kareem Biryani,Biryani Shop,Vashi,Arshad Khan,9820112244,35,Prefers morning 7 AM delivery\nNavi Mumbai Grand Caterers,Caterer,Nerul,Irfan Qureshi,9833441122,50,Weekend catering orders`}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              className="w-full bg-black/60 border border-white/10 text-white font-mono text-xs rounded-lg p-3 outline-none focus:border-[#D4AF37]"
            />

            {csvError && <div className="text-rose-400 text-xs mt-2 font-semibold">{csvError}</div>}

            <div className="pt-4 border-t border-white/10 flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowCsvModal(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCsvImport}
                className="px-5 py-2 bg-[#D4AF37] hover:bg-[#b5952f] text-black text-xs font-black rounded-lg transition-colors"
              >
                Import Leads
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
