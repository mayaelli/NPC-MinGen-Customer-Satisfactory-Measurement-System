import React, { useState, useEffect, useMemo } from 'react';
import { canCRUDServices } from '../../utils/permissions';
import {
  Plus, Trash2, Edit3, Check, X, Building2,
  Search, ChevronRight, ShieldCheck, Save, Info
} from 'lucide-react';

const ArtaServices = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.role;
  const canCRUD = canCRUDServices(role);

  const [services, setServices] = useState([]);
  const [offices, setOffices] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState('');
  const [newService, setNewService] = useState({ office_id: '', service_name: '', service_type: 'INTERNAL', service_description: '' });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ service_name: '', service_type: 'INTERNAL', service_description: '' });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const API_SERVICES = 'http://localhost/MinGen%20CSM/minGen-api/survey/manage_services.php';
  const API_OFFICES = 'http://localhost/MinGen%20CSM/minGen-api/survey/manage_offices.php';

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const uid = user?.id || '';
      const [resOffices, resServices] = await Promise.all([
        fetch(`${API_OFFICES}?user_id=${uid}`, { credentials: 'include' }),
        fetch(`${API_SERVICES}?user_id=${uid}`, { credentials: 'include' })
      ]);
      const oData = await resOffices.json();
      const sData = await resServices.json();
      if (oData.status === 'success') setOffices(oData.data);
      if (sData.status === 'success') setServices(sData.data);
    } catch (e) { console.error(e); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();

    // 1. Strict Validation
    if (!newService.service_name.trim() || !newService.service_description.trim()) {
      alert("Both Service Name and Description are required.");
      return;
    }

    // 2. Build Payload
    // We determine the office_id based on who is logged in
    const payload = {
      office_id: role === 'office' ? user.office_id : newService.office_id,
      service_name: newService.service_name,
      service_type: newService.service_type, // This captures your 'EXTERNAL' selection
      service_description: newService.service_description
    };

    setLoading(true);

    try {
      const response = await fetch(API_SERVICES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.status === 'success') {
        // --- SUCCESS ALERT ---
        alert(`✅ Success: "${payload.service_name}" has been added as an ${payload.service_type} service.`);

        // 3. Reset Form
        // Note: We keep the office_id if the user is a super_admin/admin to make multi-adding easier
        setNewService({
          office_id: role === 'office' ? '' : newService.office_id,
          service_name: '',
          service_type: 'INTERNAL', // Returns to default after success
          service_description: ''
        });

        // 4. Refresh List
        fetchData();
      } else {
        alert("Error: " + (result.message || "Failed to add service."));
      }

    } catch (error) {
      console.error("Add failed:", error);
      alert("Server error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this service permanently?")) {
      const res = await fetch(`${API_SERVICES}?id=${id}`, { method: 'DELETE', credentials: 'include' });
      const result = await res.json();
      if (result.status === 'success') fetchData();
    }
  };

  const handleUpdate = async (id) => {
    if (!editData.service_name.trim() || !editData.service_description.trim()) {
      alert("Fields cannot be empty.");
      return;
    }

    await fetch(API_SERVICES, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, ...editData })
    });
    setEditingId(null);
    fetchData();
  };

  const visibleServices = useMemo(() => {
    let filtered = services || [];

    // 1. Apply Search Filter (Common to all roles)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.service_name.toLowerCase().includes(term) ||
        (s.office_name && s.office_name.toLowerCase().includes(term))
      );
    }

    // 2. Apply Role-Based Access Control

    // SUPER_ADMIN, ADMIN, and AUDITOR: See everything in the database
    if (role === 'super_admin' || role === 'admin' || role === 'auditor') {
      return filtered;
    }

    // MANAGER: Sees all services within their specific PLANT (e.g., "Agus 1")
    if (role === 'manager') {
      return filtered.filter(s =>
        String(s.plant_name).toLowerCase() === String(user.plant_name).toLowerCase()
      );
    }

    // OFFICE: Sees only the services belonging to their specific OFFICE ID
    if (role === 'office') {
      return filtered.filter(s =>
        String(s.office_id) === String(user.office_id)
      );
    }

    // Fallback: Default to empty for unauthorized or undefined roles
    return [];
  }, [services, role, user, searchTerm]);

  const plants = [...new Set(offices.map(o => o.plant_name))];

  const handleSelectOffice = (officeName) => {
    setSearchTerm(officeName);
    setIsSearching(false);
  }

  return (
    <div className="max-w-7xl mx-auto p-2 md:p-8 md:py-1 space-y-5 animate-in fade-in duration-500 antialiased">

      {/* HEADER */}
      <header className="flex items-center gap-6 pb-3 border-b border-[#E2E8F0]">
        <div className="shrink-0">
          <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-[0.4em] leading-none mb-1">Page </p>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Service Manifest</h1>
        </div>

        <div className="ml-auto flex items-center gap-4 shrink-0">

          {/* Search — grows to fill middle */}
          <div className="relative flex items-center group/search">
            <div className="flex items-center overflow-hidden transition-all duration-300 ease-in-out w-8 group-hover/search:w-56 focus-within:w-56 bg-transparent group-hover/search:bg-slate-100 focus-within:bg-white rounded-lg border border-transparent group-hover/search:border-slate-200 focus-within:border-blue-600">
              <Search
                size={14}
                className="shrink-0 ml-2 text-slate-400 group-hover/search:text-blue-600 focus-within:text-blue-600 transition-colors cursor-pointer"
              />
              <input
                type="text"
                placeholder="SEARCH BY OFFICE..."
                className="w-full bg-transparent outline-none pl-2 pr-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 placeholder:text-slate-400 placeholder:normal-case placeholder:tracking-normal placeholder:font-normal"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setIsSearching(true); }}
                onFocus={() => setIsSearching(true)}
              />
            </div>

            {isSearching && searchTerm.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="p-2 border-b border-slate-100">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Department Nodes</span>
                </div>
                {offices.filter(o => o.name.toLowerCase().includes(searchTerm.toLowerCase())).length > 0 ? (
                  offices.filter(o => o.name.toLowerCase().includes(searchTerm.toLowerCase())).map((off) => (
                    <button key={off.id} onClick={() => handleSelectOffice(off.name)} className="w-full text-left p-3 hover:bg-blue-50 border-b border-slate-50 last:border-0 transition-all group/item flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-black text-slate-800 uppercase group-hover/item:text-blue-600 transition-colors">{off.name}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{off.plant_name} — {off.abbreviation}</p>
                      </div>
                      <ChevronRight size={12} className="text-slate-300 group-hover/item:text-blue-600 transition-all" />
                    </button>
                  ))
                ) : (
                  <div className="p-6 text-center"><p className="text-[9px] font-black text-slate-300 uppercase italic tracking-[0.2em]">No Office Detected</p></div>
                )}
              </div>
            )}
          </div>

          {/* Right: Office Context + Badge */}
          <div className="ml-auto flex items-center gap-4 shrink-0">
            <div className="text-right">
              <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-[0.3em] leading-none mb-0.5">Office Context</p>
              <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight leading-none">{user.plant_name || 'General HQ'}</p>
            </div>
            <div className="h-9 w-9 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-black italic">03</div>
          </div>
        </div>
      </header>

      {/* REGISTRATION FORM */}
      {canCRUD && (
        <section className="border border-slate-200 rounded-xl bg-[#f8fafc] overflow-hidden">
          <div className="px-5 pt-4 pb-1 flex items-center gap-3">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">New Service Provisioning</span>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>

          <form onSubmit={handleAdd} className="px-5 py-3 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-6 gap-y-3">

              {/* Left Column: Meta Info */}
              <div className="lg:col-span-3 space-y-4 pr-2 border-r border-slate-200">
                {role === 'super_admin' ? (
                  <div className="space-y-2">
                    <select
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold outline-none focus:border-blue-500 uppercase transition-all"
                      value={selectedPlant}
                      onChange={(e) => { setSelectedPlant(e.target.value); setNewService({ ...newService, office_id: '' }); }}
                      required
                    >
                      <option value="">-- SELECT PLANT --</option>
                      {plants.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold outline-none focus:border-blue-500 uppercase transition-all"
                      value={newService.office_id}
                      onChange={(e) => setNewService({ ...newService, office_id: e.target.value })}
                      disabled={!selectedPlant}
                      required
                    >
                      <option value="">-- SELECT OFFICE --</option>
                      {offices.filter(o => o.plant_name === selectedPlant).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="p-3 bg-blue-50/50 border border-blue-100 rounded flex items-center gap-2">
                    <Building2 className="text-blue-600" size={14} />
                    <span className="text-[10px] font-black text-blue-900 uppercase truncate">{user.office_name}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em]">Classification</label>
                  <div className="flex gap-1 pt-1">
                    {['INTERNAL', 'EXTERNAL'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewService({ ...newService, service_type: type })}
                        className={`flex-1 py-1.5 text-[9px] font-black rounded-md border transition-all ${newService.service_type === type
                          ? 'bg-[#001d3d] text-white border-[#001d3d]'
                          : 'bg-transparent text-slate-400 border-slate-300 hover:border-slate-400'
                          }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Service Name *</label>
                  <textarea
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded text-[11px] font-medium outline-none focus:bg-white focus:border-blue-600 uppercase transition-all resize-none h-[100px]"
                    placeholder="Enter service name..."
                    value={newService.service_name}
                    onChange={(e) => setNewService({ ...newService, service_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Description / Scope *</label>
                  <textarea
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded text-[11px] font-medium outline-none focus:bg-white focus:border-blue-600 uppercase transition-all resize-none h-[100px]"
                    placeholder="Brief scope of service..."
                    value={newService.service_description}
                    onChange={(e) => setNewService({ ...newService, service_description: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-slate-200">
              <p className="text-[8px] text-slate-400 italic">Fields marked * are mandatory for ARTA compliance.</p>
              <button
                disabled={loading}
                className="px-6 py-2 bg-[#001d3d] hover:bg-slate-800 disabled:opacity-40 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 flex items-center gap-2"
              >
                {loading ? 'Processing...' : <><Save size={11} /> Save to Manifest</>}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* MANIFEST LISTING */}
      <div className="space-y-4">
        {Object.entries(visibleServices.reduce((acc, s) => {
          const p = s.plant_name || "UNASSIGNED";
          const o = s.office_name || "UNASSIGNED";
          if (!acc[p]) acc[p] = {};
          if (!acc[p][o]) acc[p][o] = [];
          acc[p][o].push(s);
          return acc;
        }, {})).map(([plant, officesInPlant]) => (
          <div key={plant} className="space-y-2">
            {/* PLANT HEADER */}
            <div className="flex items-center gap-3 border-l-4 border-slate-800 pl-3 py-1">
              <span className="text-slate-800 text-[12px] font-black uppercase tracking-widest">
                {plant}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {Object.entries(officesInPlant).map(([office, srvs]) => (
                <details key={office} className="group bg-white border border-slate-200 rounded-lg overflow-hidden transition-all" open>
                  <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 list-none">
                    <div className="flex items-center gap-2">
                      <ChevronRight size={14} className="text-slate-400 group-open:rotate-90 transition-transform" />
                      <span className="text-[11px] font-bold text-slate-700 uppercase">{office}</span>
                      <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 rounded-full font-bold">{srvs.length}</span>
                    </div>
                  </summary>

                  <div className="p-2 pt-0 space-y-1 bg-slate-50/30">
                    {srvs.map((s) => {
                      const canEdit = role === 'super_admin' ||
                        (role === 'manager' && String(s.plant_name).toLowerCase() === String(user.plant_name).toLowerCase()) ||
                        (role === 'office' && String(s.office_id) === String(user.office_id));

                      return (
                        <div key={s.id} className="bg-white border border-slate-100 rounded-md p-2 hover:shadow-sm transition-all">
                          {editingId === s.id ? (
                            /* EDIT MODE - Compact */
                            <div className="space-y-2 p-2 bg-blue-50/50 rounded-md border border-blue-100 animate-in fade-in duration-300">
                              <input
                                className="w-full bg-white border border-blue-300 rounded px-2 py-1 text-[11px] font-bold uppercase outline-none"
                                value={editData.service_name}
                                onChange={e => setEditData({ ...editData, service_name: e.target.value })}
                              />
                              <textarea
                                className="w-full bg-white border border-blue-300 rounded px-2 py-1 text-[10px] uppercase outline-none min-h-[60px]"
                                value={editData.service_description}
                                onChange={e => setEditData({ ...editData, service_description: e.target.value })}
                              />
                              <div className="flex justify-end gap-2">
                                <button onClick={() => handleUpdate(s.id)} className="px-3 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold uppercase">Save</button>
                                <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-slate-200 text-slate-600 rounded text-[10px] font-bold uppercase">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            /* VIEW MODE - Slim Row */
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <span className={`shrink-0 px-1.5 py-0.5 rounded text-[7px] font-black border ${s.service_type === 'EXTERNAL'
                                  ? 'bg-amber-50 text-amber-600 border-amber-200'
                                  : 'bg-indigo-50 text-indigo-600 border-indigo-200'
                                  }`}>
                                  {s.service_type || 'INTERNAL'}
                                </span>
                                <div className="truncate">
                                  <p className="text-[11px] font-bold text-slate-800 uppercase truncate">{s.service_name}</p>
                                  <p className="text-[9px] text-slate-400 italic truncate max-w-md">{s.service_description || 'No description'}</p>
                                </div>
                              </div>

                              {canEdit && (
                                <div className="flex gap-1 shrink-0">
                                  <button
                                    onClick={() => { setEditingId(s.id); setEditData({ service_name: s.service_name, service_description: s.service_description || '' }); }}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  >
                                    <Edit3 size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(s.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </details>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ArtaServices;