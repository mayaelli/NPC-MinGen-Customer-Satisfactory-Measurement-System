/**
 * arta-services.jsx — ARTA Service Manifest Module
 *
 * Manages the list of services offered by each NPC office. These services
 * appear as the selectable options on the public CSM survey form.
 *
 * Key concepts:
 *
 * service_type (INTERNAL / EXTERNAL)
 *   Controls which column a service falls into in the CSM Tabulation and
 *   Score Per Service compliance reports. Set at creation time.
 *   Changing it after submissions exist will retroactively affect report output.
 *
 * Archive pattern (non-destructive "delete")
 *   Clicking the ArchiveX button calls DELETE on manage_services.php which
 *   sets is_active = 0 — it does NOT remove the database row.
 *   This preserves the service_name reference on all past survey submissions
 *   so compliance reports remain accurate for historical periods.
 *   Archived services appear in the collapsible "Archived Services" panel
 *   at the bottom and can be restored via PUT { id, restore: true }.
 *
 * Role visibility (visibleServices useMemo):
 *   The backend already scopes the API response by role. The frontend applies
 *   a second filter as a safety net for edge cases. Both must agree on the rules.
 *   To change who sees what, update BOTH the PHP WHERE clause AND the useMemo here.
 *
 * Data sources:
 *   Active services:   GET manage_services.php?user_id=
 *   Archived services: GET manage_services.php?user_id=&archived=1
 *   Offices list:      GET manage_offices.php?user_id=   (for dropdowns)
 */
import React, { useState, useEffect, useMemo } from 'react';
import { canCRUDServices } from '../../utils/permissions';
import {
  Edit3, X, Building2,
  Search, ChevronRight, Save, CheckCircle2, AlertCircle,
  ArchiveX, ArchiveRestore, Archive
} from 'lucide-react';

const ArtaServices = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.role;
  const userPerms = user.permissions || [];
  const isProvisioned = role === 'provisioned';

  // Provisioned users get CRUD if they have any services_* permission
  const canCRUD = canCRUDServices(role) ||
    (isProvisioned && userPerms.some(p => p.startsWith('services_')));

  const [services, setServices] = useState([]);
  const [archivedServices, setArchivedServices] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [offices, setOffices] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState('');
  const [newService, setNewService] = useState({ office_id: '', service_name: '', service_type: 'INTERNAL', service_description: '' });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ service_name: '', service_type: 'INTERNAL', service_description: '' });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ show: false, service: null });
  const [archiveModal, setArchiveModal] = useState({ show: false, service: null });
  const [editModal, setEditModal] = useState({ show: false, service: null });
  const [addNotif, setAddNotif] = useState(null); // inline form validation message
  const [resultModal, setResultModal] = useState(null); // { type: 'success'|'error', title, message, meta? }

  const API_SERVICES = 'http://localhost/MinGen%20CSM/minGen-api/survey/manage_services.php';
  const API_OFFICES = 'http://localhost/MinGen%20CSM/minGen-api/survey/manage_offices.php';

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const uid = user?.id || '';
      const [resOffices, resServices, resArchived] = await Promise.all([
        fetch(`${API_OFFICES}?user_id=${uid}`, { credentials: 'include' }),
        fetch(`${API_SERVICES}?user_id=${uid}`, { credentials: 'include' }),
        fetch(`${API_SERVICES}?user_id=${uid}&archived=1`, { credentials: 'include' })
      ]);
      const oData = await resOffices.json();
      const sData = await resServices.json();
      const aData = await resArchived.json();
      if (oData.status === 'success') setOffices(oData.data);
      if (sData.status === 'success') setServices(sData.data);
      if (aData.status === 'success') setArchivedServices(aData.data);
    } catch (e) { console.error(e); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();

    if (!newService.service_name.trim() || !newService.service_description.trim()) {
      setAddNotif('Both Service Name and Description are required.');
      return;
    }

    const payload = {
      office_id: role === 'office' ? user.office_id : newService.office_id,
      service_name: newService.service_name,
      service_type: newService.service_type,
      service_description: newService.service_description
    };

    setLoading(true);
    setAddNotif(null);

    try {
      const response = await fetch(API_SERVICES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.status === 'success') {
        setResultModal({
          type: 'success',
          title: 'Service Added',
          message: `"${payload.service_name}" has been registered as an ${payload.service_type} service.`,
          meta: { name: payload.service_name, type: payload.service_type }
        });
        setNewService({
          office_id: role === 'office' ? '' : newService.office_id,
          service_name: '',
          service_type: 'INTERNAL',
          service_description: ''
        });
        fetchData();
      } else {
        setResultModal({
          type: 'error',
          title: 'Registration Failed',
          message: result.message || 'Failed to add service. Please try again.'
        });
      }

    } catch (error) {
      console.error("Add failed:", error);
      setResultModal({
        type: 'error',
        title: 'Server Error',
        message: 'Could not reach the server. Please check your connection.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = (service) => {
    setArchiveModal({ show: true, service });
  };

  const confirmArchive = async () => {
    const { service } = archiveModal;
    setArchiveModal({ show: false, service: null });
    const res = await fetch(`${API_SERVICES}?id=${service.id}`, { method: 'DELETE', credentials: 'include' });
    const result = await res.json();
    if (result.status === 'success') fetchData();
  };

  const handleRestore = async (service) => {
    const res = await fetch(API_SERVICES, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: service.id, restore: true })
    });
    const result = await res.json();
    if (result.status === 'success') fetchData();
  };

  const handleUpdate = async (id) => {
    if (!editData.service_name.trim() || !editData.service_description.trim()) return;
    await fetch(API_SERVICES, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, ...editData })
    });
    setEditModal({ show: false, service: null });
    setEditingId(null);
    fetchData();
  };

  const visibleServices = useMemo(() => {
    let filtered = services || [];

    // 1. Apply Search Filter (Common to all roles)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      // Build a lookup of office_id → abbreviation for abbreviation-based search
      const abbrByOfficeId = Object.fromEntries(
        offices.map(o => [String(o.id), (o.abbreviation || '').toLowerCase()])
      );
      filtered = filtered.filter(s =>
        s.service_name.toLowerCase().includes(term) ||
        (s.office_name && s.office_name.toLowerCase().includes(term)) ||
        (s.service_description && s.service_description.toLowerCase().includes(term)) ||
        (abbrByOfficeId[String(s.office_id)] || '').includes(term)
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

    // PROVISIONED: Backend already applies WHERE office_id IN (assigned offices) so
    // whatever came back is already correctly scoped. Just return filtered as-is.
    // Double-filtering here against localStorage assigned_office_ids breaks when that
    // field is stale or missing (logged in before login.php returned it).
    if (isProvisioned) {
      return filtered;
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
                {offices.filter(o => o.name.toLowerCase().includes(searchTerm.toLowerCase()) || (o.abbreviation || '').toLowerCase().includes(searchTerm.toLowerCase())).length > 0 ? (
                  offices.filter(o => o.name.toLowerCase().includes(searchTerm.toLowerCase()) || (o.abbreviation || '').toLowerCase().includes(searchTerm.toLowerCase())).map((off) => (
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
                ) : isProvisioned ? (
                  // Provisioned users pick from their assigned offices
                  <select
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold outline-none focus:border-blue-500 uppercase transition-all"
                    value={newService.office_id}
                    onChange={(e) => setNewService({ ...newService, office_id: e.target.value })}
                    required
                  >
                    <option value="">-- SELECT OFFICE --</option>
                    {(user.assigned_offices || []).map(o => (
                      <option key={o.office_id} value={o.office_id}>{o.office_name}</option>
                    ))}
                  </select>
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

            {addNotif && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[10px] font-bold text-red-700 animate-in fade-in duration-150">
                <AlertCircle size={11} className="shrink-0" />
                <span className="flex-1">{addNotif}</span>
                <button type="button" onClick={() => setAddNotif(null)} className="p-0.5 hover:opacity-60"><X size={10} /></button>
              </div>
            )}

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
                      // For provisioned users: if the row is visible it was already scoped
                      // by the backend, so it's in-scope by definition. This avoids breaking
                      // when assigned_office_ids in localStorage is stale or missing.
                      const inScope =
                        role === 'super_admin' ||
                        (role === 'manager' && String(s.plant_name).toLowerCase() === String(user.plant_name).toLowerCase()) ||
                        (role === 'office' && String(s.office_id) === String(user.office_id)) ||
                        isProvisioned;

                      const canEdit = inScope && (role !== 'provisioned' || userPerms.includes('services_edit'));
                      const canDelete = inScope && (role !== 'provisioned' || userPerms.includes('services_delete'));

                      return (
                        <div key={s.id} className="bg-white border border-slate-100 rounded-md p-2 hover:shadow-sm transition-all">
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

                            {(canEdit || canDelete) && (
                              <div className="flex gap-1 shrink-0">
                                {canEdit && (
                                  <button
                                    onClick={() => { setEditModal({ show: true, service: s }); setEditData({ service_name: s.service_name, service_type: s.service_type || 'INTERNAL', service_description: s.service_description || '' }); }}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  >
                                    <Edit3 size={12} />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={() => handleArchive(s)}
                                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                    title="Archive Service"
                                  >
                                    <ArchiveX size={12} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
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
      {/* ARCHIVED SERVICES SECTION */}
      {archivedServices.length > 0 && canCRUD && (
        <div className="border border-amber-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowArchived(p => !p)}
            className="w-full flex items-center justify-between px-5 py-3 bg-amber-50 hover:bg-amber-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Archive size={13} className="text-amber-600" />
              <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">
                Archived Services
              </span>
              <span className="text-[8px] bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded-full font-black">
                {archivedServices.length}
              </span>
            </div>
            <ChevronRight
              size={13}
              className={`text-amber-500 transition-transform duration-200 ${showArchived ? 'rotate-90' : ''}`}
            />
          </button>

          {showArchived && (
            <div className="p-4 space-y-3 bg-amber-50/30 animate-in slide-in-from-top-2 duration-200">
              <p className="text-[8px] text-amber-600 font-bold uppercase tracking-widest px-1">
                These services are retired from the manifest and survey form. Restore to reactivate.
              </p>
              {Object.entries(archivedServices.reduce((acc, s) => {
                const key = `${s.plant_name || 'UNASSIGNED'} — ${s.office_name || 'UNASSIGNED'}`;
                if (!acc[key]) acc[key] = [];
                acc[key].push(s);
                return acc;
              }, {})).map(([groupKey, srvs]) => (
                <div key={groupKey} className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1">{groupKey}</p>
                  {srvs.map(s => (
                    <div key={s.id} className="bg-white border border-amber-100 rounded-md p-2.5 flex items-center justify-between gap-4 opacity-70 hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className={`shrink-0 px-1.5 py-0.5 rounded text-[7px] font-black border ${s.service_type === 'EXTERNAL'
                          ? 'bg-amber-50 text-amber-600 border-amber-200'
                          : 'bg-indigo-50 text-indigo-600 border-indigo-200'}`}>
                          {s.service_type || 'INTERNAL'}
                        </span>
                        <div className="truncate">
                          <p className="text-[11px] font-bold text-slate-600 uppercase truncate line-through decoration-slate-300">
                            {s.service_name}
                          </p>
                          <p className="text-[9px] text-slate-400 italic truncate max-w-md">{s.service_description || 'No description'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRestore(s)}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all active:scale-95"
                        title="Restore Service"
                      >
                        <ArchiveRestore size={11} /> Restore
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ADD SERVICE RESULT MODAL */}
      {resultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className={`flex items-center gap-3 px-6 py-4 ${resultModal.type === 'success' ? 'bg-emerald-50 border-b border-emerald-100' : 'bg-red-50 border-b border-red-100'}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${resultModal.type === 'success' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                {resultModal.type === 'success'
                  ? <CheckCircle2 size={18} className="text-emerald-600" />
                  : <AlertCircle size={18} className="text-red-600" />}
              </div>
              <div className="flex-1">
                <h2 className={`text-[13px] font-black uppercase tracking-tight ${resultModal.type === 'success' ? 'text-emerald-800' : 'text-red-800'}`}>{resultModal.title}</h2>
              </div>
              <button onClick={() => setResultModal(null)} className="p-1 hover:bg-black/5 rounded-lg transition-colors">
                <X size={14} className="text-slate-400" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-3">
              {resultModal.meta && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 flex items-center gap-3">
                  <span className={`shrink-0 px-2 py-0.5 rounded text-[8px] font-black border ${resultModal.meta.type === 'EXTERNAL' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-indigo-50 text-indigo-600 border-indigo-200'}`}>
                    {resultModal.meta.type}
                  </span>
                  <p className="text-[12px] font-black text-slate-800 uppercase truncate">{resultModal.meta.name}</p>
                </div>
              )}
              <p className="text-[12px] text-slate-500 leading-relaxed">{resultModal.message}</p>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setResultModal(null)}
                className={`px-5 py-2 text-[10px] font-black uppercase tracking-wider text-white rounded-lg transition-all active:scale-95 ${resultModal.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {resultModal.type === 'success' ? 'Done' : 'Dismiss'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ARCHIVE CONFIRMATION MODAL */}
      {archiveModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <ArchiveX size={14} className="text-amber-600" />
                </div>
                <div>
                  <h2 className="text-[13px] font-black text-slate-800 uppercase tracking-tight">Archive Service</h2>
                  <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest">Non-destructive action</p>
                </div>
              </div>
              <button onClick={() => setArchiveModal({ show: false, service: null })} className="p-1 hover:bg-slate-100 rounded transition-colors">
                <X size={14} className="text-slate-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-[12px] text-slate-500">This service will be retired from the manifest and the survey form. Past submissions using this service are preserved.</p>
              <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
                <p className="text-[12px] font-black text-amber-800 uppercase">{archiveModal.service?.service_name}</p>
                <p className="text-[10px] text-amber-500 italic mt-0.5">{archiveModal.service?.service_description || 'No description'}</p>
              </div>
              <p className="text-[10px] text-slate-400 italic">You can restore this service at any time from the Archived Services section.</p>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setArchiveModal({ show: false, service: null })} className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all">Cancel</button>
              <button onClick={confirmArchive} className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-all active:scale-95 flex items-center gap-1.5">
                <ArchiveX size={11} /> Archive Service
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SERVICE MODAL */}
      {editModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Edit3 size={14} className="text-blue-600" />
                </div>
                <h2 className="text-[13px] font-black text-slate-800 uppercase tracking-tight">Edit Service</h2>
              </div>
              <button onClick={() => setEditModal({ show: false, service: null })} className="p-1 hover:bg-slate-100 rounded transition-colors">
                <X size={14} className="text-slate-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Service Name *</label>
                <input
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold uppercase outline-none focus:bg-white focus:border-blue-500 transition-all"
                  value={editData.service_name}
                  onChange={e => setEditData({ ...editData, service_name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Description / Scope *</label>
                <textarea
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium outline-none focus:bg-white focus:border-blue-500 transition-all resize-none min-h-[90px]"
                  value={editData.service_description}
                  onChange={e => setEditData({ ...editData, service_description: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Classification</label>
                <div className="flex gap-2 pt-1">
                  {['INTERNAL', 'EXTERNAL'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEditData({ ...editData, service_type: type })}
                      className={`flex-1 py-2 text-[9px] font-black rounded-lg border transition-all ${editData.service_type === type
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
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setEditModal({ show: false, service: null })} className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all">Cancel</button>
              <button onClick={() => handleUpdate(editModal.service?.id)} className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all active:scale-95 flex items-center gap-1.5">
                <Save size={11} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArtaServices;