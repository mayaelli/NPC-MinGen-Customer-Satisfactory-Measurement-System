/**
 * office-management.jsx — Office Directory Module
 *
 * Manages NPC office records grouped by plant/department.
 * Each office has exactly one linked user account in the users table.
 *
 * Key features:
 *
 * Registration form
 *   Creates the office record in the offices table. The backend does NOT
 *   automatically create a user account here — that is handled separately.
 *   Duplicate name detection is done both client-side (isDuplicateName useMemo)
 *   and server-side (DUPLICATE_NAME response code from manage_offices.php).
 *
 * Credential Terminal (selectedOffice modal)
 *   Shows the office's assigned username and raw_password (the system-generated
 *   plain-text password stored for admin reference). Once the office user changes
 *   their password via change-password.jsx, raw_password is cleared server-side
 *   and will show as "---" here. The Copy Credential Packet button copies both
 *   username and password to clipboard as a formatted block.
 *
 * Auditor Toggle
 *   Sets is_auditor_enabled = 1 on the offices table via POST { action: 'toggle_auditor' }.
 *   When enabled, that office's user account gains read access to ALL plant data
 *   instead of just their own office. This is checked in get_survey_results.php
 *   before applying the RBAC WHERE clause.
 *
 * Reset Password
 *   Calls PUT with { reset_password: true } — generates a new random password
 *   in the format New{4digits}!{abbr} and stores both the hash and plain text.
 *   The new password appears in the Credential Terminal after refreshing.
 *
 * Edit Office
 *   Calls PUT with updated name, plant_name, abbreviation.
 *   Does NOT affect the linked user account credentials.
 *
 * Delete Office
 *   HARD DELETE — permanently removes the office row. This also cascades to
 *   user_offices entries. The linked user account is NOT automatically deleted;
 *   that requires a separate action in admin-management.jsx.
 *   Use with caution — prefer not deleting offices that have existing submissions.
 *
 * API: manage_offices.php (GET, POST, PUT, DELETE)
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Building2, Search, ChevronRight, Copy, RefreshCw, Trash2, ShieldCheck, UserCircle2, X, CheckCircle2, Lock, Globe, AlertCircle, Pencil } from 'lucide-react';

const OfficeManagement = () => {
  const [offices, setOffices] = useState([]);
  const [newOffice, setNewOffice] = useState({ name: '', abbreviation: '', plant_name: '', description: '', parent_id: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [expandedPlants, setExpandedPlants] = useState({});
  const [selectedOffice, setSelectedOffice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copyStatus, setCopyStatus] = useState(null);
  const [formNotif, setFormNotif] = useState(null); // { type: 'success'|'error', message: '' }
  const [deleteModal, setDeleteModal] = useState(false);
  const [officeToDelete, setOfficeToDelete] = useState(null);
  const [resetModal, setResetModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Edit modal state ────────────────────────────────────────────────────────
  const [editModal, setEditModal] = useState(false);
  const [officeToEdit, setOfficeToEdit] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', abbreviation: '', plant_name: '' });
  const [editNotif, setEditNotif] = useState(null);

  const isDuplicateName = useMemo(() => {
    if (!newOffice.name.trim() || !newOffice.plant_name.trim()) return false;
    return offices.some(o =>
      o.name.toLowerCase().trim() === newOffice.name.toLowerCase().trim() &&
      o.plant_name.toLowerCase().trim() === newOffice.plant_name.toLowerCase().trim()
    );
  }, [newOffice.name, newOffice.plant_name, offices]);


  const API_URL = 'http://localhost/MinGen%20CSM/mingen-api/survey/manage_offices.php';

  useEffect(() => { fetchOffices(); }, []);

  const fetchOffices = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      if (data.status === 'success') {
        setOffices(data.data);
        const firstPlant = data.data[0]?.plant_name;
        if (firstPlant) {
          const allPlants = [...new Set(data.data.map(o => o.plant_name))];
          setExpandedPlants(Object.fromEntries(allPlants.map(p => [p, true])));
        }
      }
    } catch (err) { console.error("Fetch error:", err); }
  };

  const handleAddOffice = async (e) => {
    e.preventDefault();
    if (isDuplicateName) return;
    setLoading(true);
    setFormNotif(null);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOffice),
      });
      const result = await response.json();
      if (result.status === 'success') {
        setFormNotif({ type: 'success', message: result.message || "Office and user account successfully created." });
        setNewOffice({ name: '', abbreviation: '', plant_name: '', description: '', parent_id: '' });
        fetchOffices();
      } else {
        setFormNotif({ type: 'error', message: result.message || "Registration failed." });
      }
    } catch (err) {
      console.error("Add Office error:", err);
      setFormNotif({ type: 'error', message: "System error: could not reach the server." });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAuditor = async (officeId, currentStatus) => {
    const newStatus = currentStatus == 1 ? 0 : 1;
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_auditor',
          id: officeId,
          status: newStatus
        })
      });
      const result = await response.json();
      if (result.status === 'success') {
        setSelectedOffice(prev => ({ ...prev, is_auditor_enabled: newStatus }));
        fetchOffices();
      }
    } catch (error) {
      console.error("Error toggling auditor:", error);
    }
  };

  const handleCopy = (office) => {
    const textToCopy = `Plant: ${office.plant_name}\nOffice: ${office.name}\nAbbreviation: ${office.abbreviation}\nUser: ${office.username}\nPass: ${office.raw_password}`;
    navigator.clipboard.writeText(textToCopy);
    setCopyStatus('all');
    setTimeout(() => setCopyStatus(null), 2000);
  };

  const confirmResetPassword = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedOffice.id,
          reset_password: true,
          plant_name: selectedOffice.plant_name,
          name: selectedOffice.name,
          abbreviation: selectedOffice.abbreviation
        }),
      });
      const result = await response.json();
      if (result.status === 'success') {
        setResetModal(false);
        fetchOffices();
        // Refresh selectedOffice credentials from updated list
        setSelectedOffice(prev => ({ ...prev, _resetMsg: result.message }));
      }
    } catch (err) {
      console.error("Reset password error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDelete = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`${API_URL}?id=${officeToDelete.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.status === 'success') {
        setDeleteModal(false);
        setOfficeToDelete(null);
        setSelectedOffice(null);
        fetchOffices();
      } else {
        console.error("Delete failed:", result.message);
      }
    } catch (error) {
      console.error("Error deleting office:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (office, e) => {
    e.stopPropagation(); // prevent the card click from opening the credential modal
    setOfficeToEdit(office);
    setEditForm({ name: office.name, abbreviation: office.abbreviation, plant_name: office.plant_name });
    setEditNotif(null);
    setEditModal(true);
  };

  const confirmEdit = async () => {
    if (!editForm.name.trim() || !editForm.plant_name.trim() || !editForm.abbreviation.trim()) {
      setEditNotif({ type: 'error', message: 'All fields are required.' });
      return;
    }
    setActionLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: officeToEdit.id,
          name: editForm.name,
          abbreviation: editForm.abbreviation,
          plant_name: editForm.plant_name,
          description: officeToEdit.description ?? '',
        }),
      });
      const result = await response.json();
      if (result.status === 'success') {
        setEditModal(false);
        setOfficeToEdit(null);
        fetchOffices();
      } else {
        setEditNotif({ type: 'error', message: result.message || 'Update failed.' });
      }
    } catch (err) {
      setEditNotif({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setActionLoading(false);
    }
  };

  const togglePlant = (plant) => {
    setExpandedPlants(prev => ({ ...prev, [plant]: !prev[plant] }));
  };

  const filteredOffices = useMemo(() => {
    const filtered = offices.filter(off => {
      const name = (off.name || "").toLowerCase();
      const abbr = (off.abbreviation || "").toLowerCase();
      const search = searchTerm.toLowerCase();
      return name.includes(search) || abbr.includes(search);
    });
    return [...filtered].sort((a, b) => parseInt(a.id) - parseInt(b.id));
  }, [offices, searchTerm]);

  const grouped = filteredOffices.reduce((acc, off) => {
    const pName = off.plant_name || "UNASSIGNED";
    if (!acc[pName]) acc[pName] = [];
    acc[pName].push(off);
    return acc;
  }, {});

  useEffect(() => {
    if (searchTerm) {
      const results = {};
      Object.keys(grouped).forEach(plant => { results[plant] = true; });
      setExpandedPlants(results);
    }
  }, [searchTerm]);

  const handleSelectOffice = (office) => {
    setSearchTerm(office.name);
    setIsSearching(false);

    setExpandedPlants(prev => ({
      ...prev,
      [office.plant_name]: true
    }));

    setSelectedOffice(office);
  };

  return (
    <div className="max-w-7xl mx-auto p-2 md:px-8 md:py-1 space-y-5 antialiased text-slate-800 animate-in fade-in duration-700">

      {/* HEADER SECTION */}
      <header className="flex items-center gap-6 pb-3 border-b border-[#E2E8F0]">

        {/* Title */}
        <div className="shrink-0">
          <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-[0.4em] leading-none mb-1">Page</p>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Office Management</h1>
        </div>

        {/* Right: Search + Office Context + Badge */}
        <div className="ml-auto flex items-center gap-4 shrink-0">

          {/* Expandable Search */}
          <div className="relative flex items-center group/search">
            <div className="flex items-center overflow-hidden transition-all duration-300 ease-in-out w-8 group-hover/search:w-56 focus-within:w-56 bg-transparent group-hover/search:bg-slate-100 focus-within:bg-white rounded-lg border border-transparent group-hover/search:border-slate-200 focus-within:border-blue-600">
              <Search
                size={14}
                className="shrink-0 ml-2 text-slate-400 group-hover/search:text-blue-600 focus-within:text-blue-600 transition-colors cursor-pointer"
              />
              <input
                type="text"
                placeholder="Search By Office..."
                className="w-full bg-transparent outline-none pl-2 pr-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 placeholder:text-slate-400 placeholder:normal-case placeholder:tracking-normal placeholder:font-normal"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setIsSearching(true); }}
                onFocus={() => setIsSearching(true)}
              />
            </div>

            {/* Floating Suggestions */}
            {isSearching && searchTerm.length > 0 && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-2 border-b border-slate-100">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Query Results</span>
                </div>
                {filteredOffices.length > 0 ? (
                  filteredOffices.map((off) => (
                    <button
                      key={off.id}
                      onClick={() => handleSelectOffice(off)}
                      className="w-full text-left p-3 hover:bg-blue-50 border-b border-slate-50 last:border-0 transition-all flex justify-between items-center group/item"
                    >
                      <div>
                        <p className="text-[10px] font-black text-slate-800 uppercase group-hover/item:text-blue-600 transition-colors">{off.name}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{off.plant_name} — {off.abbreviation}</p>
                      </div>
                      <ChevronRight size={12} className="text-slate-300 group-hover/item:text-blue-600 group-hover/item:translate-x-1 transition-all" />
                    </button>
                  ))
                ) : (
                  <div className="p-6 text-center">
                    <p className="text-[9px] font-black text-slate-300 uppercase italic tracking-[0.2em]">Node not found</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="text-right">
            <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-[0.3em] leading-none mb-0.5">Office Context</p>
            <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight leading-none">General HQ</p>
          </div>
          <div className="h-9 w-9 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-black italic">
            02
          </div>
        </div>

      </header>

      {/* REGISTRATION TERMINAL */}
      <section className="border border-slate-200 rounded-xl bg-[#f8fafc] overflow-hidden">
        <div className="px-5 pt-4 pb-1 flex items-center gap-3">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">New Entity Provisioning</span>
          <div className="flex-1 h-px bg-slate-200"></div>
        </div>

        <form onSubmit={handleAddOffice} className="px-5 py-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3">

          {/* Inline notification banner */}
          {formNotif && (
            <div className={`col-span-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold border animate-in fade-in duration-200 ${formNotif.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200'
              }`}>
              {formNotif.type === 'success' ? <CheckCircle2 size={12} className="shrink-0" /> : <AlertCircle size={12} className="shrink-0" />}
              <span className="flex-1">{formNotif.message}</span>
              <button type="button" onClick={() => setFormNotif(null)} className="p-0.5 hover:opacity-60 transition-opacity"><X size={11} /></button>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-1"><Globe size={9} /> Plant Loc/Dept</label>
            <input type="text" list="plant-list" className="w-full pb-1.5 bg-transparent border-0 border-b border-slate-300 focus:border-blue-500 text-[11px] font-black outline-none transition-colors placeholder:text-slate-300" value={newOffice.plant_name} onChange={(e) => { setNewOffice({ ...newOffice, plant_name: e.target.value.toUpperCase() }); setFormNotif(null); }} required />
            <datalist id="plant-list">
              {[...new Set(offices.map(o => o.plant_name))].map(d => <option key={d} value={d} />)}
            </datalist>
          </div>

          <div className="lg:col-span-1 space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-1"><Building2 size={9} /> Office Designation</label>
            <input
              type="text"
              className={`w-full pb-1.5 bg-transparent border-0 border-b text-[11px] font-black outline-none transition-colors placeholder:text-slate-300 ${isDuplicateName ? 'border-amber-400 focus:border-amber-500' : 'border-slate-300 focus:border-blue-500'
                }`}
              value={newOffice.name}
              onChange={(e) => { setNewOffice({ ...newOffice, name: e.target.value }); setFormNotif(null); }}
              required
            />
            {isDuplicateName && (
              <p className="flex items-center gap-1 text-[9px] font-bold text-amber-600 animate-in fade-in duration-150">
                <AlertCircle size={9} className="shrink-0" />
                Already exists under {newOffice.plant_name}.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-1"><Lock size={9} /> Abbreviation</label>
            <input type="text" className="w-full pb-1.5 bg-transparent border-0 border-b border-slate-300 focus:border-blue-500 text-[11px] font-black uppercase outline-none transition-colors placeholder:text-slate-300" value={newOffice.abbreviation} onChange={(e) => setNewOffice({ ...newOffice, abbreviation: e.target.value.toUpperCase() })} required />
          </div>
          {/* Parent office selector - hidden input, parent_id defaults to empty (top-level) */}
          <input type="hidden" value={newOffice.parent_id} />
          <div className="flex items-end pb-1">
            <button
              disabled={loading || isDuplicateName}
              title={isDuplicateName ? 'Resolve the duplicate name before registering' : ''}
              className="w-full py-2 bg-[#001d3d] hover:bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Syncing...' : 'Register'}
            </button>
          </div>
        </form>
      </section>

      {/* DATA DISPLAY GRID */}
      <div className="space-y-6">
        <div className="flex gap-6 px-1">
          <button onClick={() => setExpandedPlants(Object.fromEntries(Object.keys(grouped).map(k => [k, true])))} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline decoration-2 underline-offset-4">Expand Registry</button>
          <button onClick={() => setExpandedPlants({})} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:underline decoration-2 underline-offset-4">Collapse Registry</button>
        </div>

        {Object.keys(grouped).length > 0 ? (
          Object.entries(grouped).map(([plantName, plantOffices]) => (
            <div key={plantName} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl ring-1 ring-slate-100">
              <button
                onClick={() => togglePlant(plantName)}
                className="w-full flex justify-between items-center px-4 py-2 hover:bg-slate-50 transition-all border-b border-slate-100 group"
              >
                <div className="flex items-center gap-3">
                  {/* Minimalist Icon: No heavy blue box, just a clean chevron */}
                  <ChevronRight
                    size={14}
                    className={`text-slate-400 transition-transform duration-200 ${expandedPlants[plantName] ? 'rotate-90 text-blue-600' : ''}`}
                  />

                  <h2 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                    {plantName}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  {/* Subtler Badge: Text-only or very light tint */}
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                    {plantOffices.length} Offices
                  </span>

                  {/* Decorative line to fill the space if you want that "System" look */}
                  <div className={`h-1 w-1 rounded-full ${expandedPlants[plantName] ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                </div>
              </button>

              {expandedPlants[plantName] && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 bg-white animate-in slide-in-from-top-2 duration-300">
                  {plantOffices.map((office) => (
                    <div key={office.id} className="group flex items-center justify-between px-4 py-3 bg-white hover:bg-[#F1F5F9] rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`shrink-0 w-2 h-2 rounded-full ${office.role === 'manager' ? 'bg-blue-500' : 'bg-slate-300'}`} />
                        <div className="min-w-0 leading-snug">
                          <h3 className="text-[13px] font-semibold text-slate-800 uppercase tracking-wide truncate">{office.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-normal text-slate-400 tracking-widest uppercase">{office.abbreviation}</span>
                            {office.is_auditor_enabled == 1 && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-px bg-blue-50 text-blue-500 text-[8px] font-semibold rounded-md border border-blue-100 uppercase tracking-[0.12em]">
                                <ShieldCheck size={8} /> Auditor
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className="text-[9px] font-medium text-slate-300 tracking-[0.15em] tabular-nums">#{office.id}</span>
                        <button
                          onClick={(e) => openEditModal(office, e)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-blue-500 bg-transparent hover:bg-blue-50 transition-all"
                          title="Edit Office"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => { setOfficeToDelete(office); setDeleteModal(true); }}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 bg-transparent hover:bg-red-50 transition-all"
                          title="Delete Office"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200 opacity-50">
            <Search size={40} className="text-slate-300 mb-4" />
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] italic">No Nodes Detected in Query</h3>
          </div>
        )}
      </div>

      {/* CREDENTIAL TERMINAL (MODAL) */}
      {selectedOffice && !deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#001d3d]/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#001d3d] rounded-xl flex items-center justify-center text-white">
                  <UserCircle2 size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter">{selectedOffice.name}</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Configuration Terminal</p>
                </div>
              </div>
              <button onClick={() => setSelectedOffice(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-900"><X size={20} /></button>
            </div>

            <div className="p-8 space-y-8">
              {/* Auditor Toggle */}
              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5"><ShieldCheck size={12} /> Global Auditor Permission</span>
                  <p className="text-[9px] text-blue-400 font-medium leading-tight mt-0.5">Allows read access to all plant data</p>
                </div>
                <button
                  onClick={() => handleToggleAuditor(selectedOffice.id, selectedOffice.is_auditor_enabled)}
                  className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none ${selectedOffice.is_auditor_enabled == 1 ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${selectedOffice.is_auditor_enabled == 1 ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Credential Fields */}
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Username</label>
                  <div className="flex justify-between items-center bg-slate-100 p-4 rounded-xl border border-slate-200 group">
                    <span className="font-mono text-xs font-bold text-slate-700 tracking-tight">{selectedOffice.username || "---"}</span>
                    <button onClick={() => { navigator.clipboard.writeText(selectedOffice.username); setCopyStatus('u'); setTimeout(() => setCopyStatus(null), 800); }} className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-blue-600 transition-all">
                      {copyStatus === 'u' ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Live Raw Password</label>
                  <div className="flex justify-between items-center bg-slate-100 p-4 rounded-xl border border-slate-200">
                    <span className="font-mono text-xs font-black text-blue-600 tracking-widest italic uppercase">{selectedOffice.raw_password || "---"}</span>
                    <button onClick={() => { navigator.clipboard.writeText(selectedOffice.raw_password); setCopyStatus('p'); setTimeout(() => setCopyStatus(null), 800); }} className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-blue-600 transition-all">
                      {copyStatus === 'p' ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Grid */}
              <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-3">
                <button onClick={() => handleCopy(selectedOffice)} className="col-span-2 flex items-center justify-center gap-2 py-3 bg-[#001d3d] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-900 transition-all active:scale-95">
                  <Copy size={14} /> {copyStatus === 'all' ? 'Packet Copied' : 'Copy Credential Packet'}
                </button>

                <button
                  onClick={() => setResetModal(true)}
                  className="flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                >
                  <RefreshCw size={14} /> Reset Pass
                </button>

                <button
                  onClick={() => setDeleteModal(true)}
                  className="flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-100 transition-all active:scale-95 border border-red-100"
                >
                  <Trash2 size={14} /> Wipe Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* DELETE CONFIRMATION MODAL */}
      {deleteModal && officeToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 size={16} className="text-red-600" />
                </div>
                <div>
                  <h2 className="text-[13px] font-black text-slate-800 uppercase tracking-tight">Wipe Record</h2>
                  <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest">Destructive action</p>
                </div>
              </div>
              <button onClick={() => { setDeleteModal(false); setOfficeToDelete(null); }} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={15} className="text-slate-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-[12px] text-slate-500 leading-relaxed">You are about to permanently delete this office and all associated records:</p>
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 space-y-0.5">
                <p className="text-[12px] font-black text-red-800 uppercase">{officeToDelete.name}</p>
                <p className="text-[10px] text-red-400 font-medium uppercase tracking-widest">{officeToDelete.plant_name} — {officeToDelete.abbreviation}</p>
              </div>
              <p className="text-[10px] text-slate-400 italic">This includes all linked user accounts and survey services. This cannot be undone.</p>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => { setDeleteModal(false); setOfficeToDelete(null); }} disabled={actionLoading} className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all disabled:opacity-50">Cancel</button>
              <button onClick={confirmDelete} disabled={actionLoading} className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5">
                <Trash2 size={11} /> {actionLoading ? 'Deleting...' : 'Wipe Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD CONFIRMATION MODAL */}
      {resetModal && selectedOffice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
                  <RefreshCw size={15} className="text-amber-600" />
                </div>
                <div>
                  <h2 className="text-[13px] font-black text-slate-800 uppercase tracking-tight">Reset Password</h2>
                  <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest">Generate new credentials</p>
                </div>
              </div>
              <button onClick={() => setResetModal(false)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={15} className="text-slate-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-[12px] text-slate-500 leading-relaxed">A new random password will be generated for:</p>
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 space-y-0.5">
                <p className="text-[12px] font-black text-amber-800 uppercase">{selectedOffice.name}</p>
                <p className="text-[10px] text-amber-500 font-mono tracking-widest">{selectedOffice.username || '—'}</p>
              </div>
              <p className="text-[10px] text-slate-400 italic">The current password will be invalidated immediately. Copy the new credentials from the terminal after resetting.</p>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setResetModal(false)} disabled={actionLoading} className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all disabled:opacity-50">Cancel</button>
              <button onClick={confirmResetPassword} disabled={actionLoading} className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5">
                <RefreshCw size={11} /> {actionLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* EDIT OFFICE MODAL */}
      {editModal && officeToEdit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in zoom-in-95 duration-200">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                  <Pencil size={15} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-[13px] font-black text-slate-800 uppercase tracking-tight">Edit Office</h2>
                  <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest">Update details</p>
                </div>
              </div>
              <button onClick={() => setEditModal(false)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={15} className="text-slate-400" />
              </button>
            </div>

            {/* Form */}
            <div className="px-6 py-5 space-y-4">
              {editNotif && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold border bg-red-50 text-red-700 border-red-200 animate-in fade-in duration-150">
                  <AlertCircle size={11} className="shrink-0" />
                  <span>{editNotif.message}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Globe size={9} /> Plant / Department
                </label>
                <input
                  type="text"
                  list="edit-plant-list"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-black uppercase outline-none focus:border-blue-500 focus:bg-white transition-all"
                  value={editForm.plant_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, plant_name: e.target.value.toUpperCase() }))}
                />
                <datalist id="edit-plant-list">
                  {[...new Set(offices.map(o => o.plant_name))].map(d => <option key={d} value={d} />)}
                </datalist>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Building2 size={9} /> Office Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-black uppercase outline-none focus:border-blue-500 focus:bg-white transition-all"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Lock size={9} /> Abbreviation
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-black uppercase outline-none focus:border-blue-500 focus:bg-white transition-all"
                  value={editForm.abbreviation}
                  onChange={(e) => setEditForm(prev => ({ ...prev, abbreviation: e.target.value.toUpperCase() }))}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setEditModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmEdit}
                disabled={actionLoading}
                className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle2 size={11} /> {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default OfficeManagement;