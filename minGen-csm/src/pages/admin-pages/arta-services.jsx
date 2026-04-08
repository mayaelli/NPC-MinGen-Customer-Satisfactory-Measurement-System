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
  const [editData, setEditData] = useState({ service_name: '', service_type: 'INTERNAL',  service_description: '' });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const API_SERVICES = 'http://localhost/MinGen%20CSM/minGen-api/survey/manage_services.php';
  const API_OFFICES = 'http://localhost/MinGen%20CSM/minGen-api/survey/manage_offices.php';

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [resOffices, resServices] = await Promise.all([
        fetch(API_OFFICES, { credentials: 'include' }),
        fetch(API_SERVICES, { credentials: 'include' })
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
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-10 animate-in fade-in duration-500 antialiased">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase italic flex items-center gap-3">
            <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
            Service Manifest
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Authorized Configuration Access Only</p>
        </div>

        <div className="relative w-full md:w-80 group" onMouseLeave={() => setIsSearching(false)}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="SEARCH BY OFFICE..." 
            className="w-full pl-10 pr-4 py-3 bg-slate-100 border-none rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-600 outline-none transition-all shadow-inner"
            value={searchTerm} 
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsSearching(true);
            }}
            onFocus={() => setIsSearching(true)}
          />

          {isSearching && searchTerm.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200 ring-1 ring-black/5">
              <div className="p-2 bg-slate-50/50 border-b border-slate-100">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Department Nodes</span>
              </div>
              {offices.filter(o => o.name.toLowerCase().includes(searchTerm.toLowerCase())).length > 0 ? (
                offices
                  .filter(o => o.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((off) => (
                    <button
                      key={off.id}
                      onClick={() => handleSelectOffice(off.name)}
                      className="w-full text-left p-4 hover:bg-blue-50 border-b border-slate-50 last:border-0 transition-all group/item flex justify-between items-center"
                    >
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black text-slate-800 uppercase group-hover/item:text-blue-600 transition-colors">{off.name}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{off.plant_name} — {off.abbreviation}</p>
                      </div>
                      <ChevronRight size={12} className="text-slate-300 group-hover/item:text-blue-600 transition-all" />
                    </button>
                  ))
              ) : (
                <div className="p-8 text-center">
                  <p className="text-[9px] font-black text-slate-300 uppercase italic tracking-[0.3em]">No Office Detected</p>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* REGISTRATION FORM */}
      {canCRUD && (
  <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-6">
    {/* Compact Header */}
    <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-blue-600 rounded-md">
          <Plus size={12} className="text-white" />
        </div>
        <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Add New ARTA Service</span>
      </div>
      <div className="flex items-center gap-4">
         <span className="text-[9px] font-bold text-slate-400 uppercase italic">Compliance Mode Active</span>
         <ShieldCheck size={14} className="text-slate-300" />
      </div>
    </div>
    
    <form onSubmit={handleAdd} className="p-5">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Meta Info */}
        <div className="lg:col-span-3 space-y-3 pr-2 border-r border-slate-100">
          {role === 'super_admin' ? (
            <div className="space-y-2">
              <select 
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold outline-none focus:border-blue-500 uppercase transition-all"
                value={selectedPlant} 
                onChange={(e) => { setSelectedPlant(e.target.value); setNewService({...newService, office_id: ''}); }} 
                required
              >
                <option value="">-- SELECT PLANT --</option>
                {plants.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              
              <select 
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold outline-none focus:border-blue-500 uppercase transition-all"
                value={newService.office_id} 
                onChange={(e) => setNewService({...newService, office_id: e.target.value})} 
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

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase text-slate-400">Classification</label>
            <div className="flex gap-1">
              {['INTERNAL', 'EXTERNAL'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setNewService({ ...newService, service_type: type })}
                  className={`flex-1 py-2 text-[9px] font-black rounded border transition-all ${
                    newService.service_type === type 
                      ? 'bg-slate-800 text-white border-slate-800' 
                      : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Main Content */}
        <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Service Nomenclature *</label>
            <textarea 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded text-[11px] font-medium outline-none focus:bg-white focus:border-blue-600 uppercase transition-all resize-none h-[100px]"
              placeholder="Enter service name..." 
              value={newService.service_name} 
              onChange={(e) => setNewService({...newService, service_name: e.target.value})} 
              required 
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Description / Scope *</label>
            <textarea 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded text-[11px] font-medium outline-none focus:bg-white focus:border-blue-600 uppercase transition-all resize-none h-[100px]"
              placeholder="Brief scope of service..." 
              value={newService.service_description} 
              onChange={(e) => setNewService({...newService, service_description: e.target.value})} 
              required 
            />
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
        <p className="text-[9px] text-slate-400 italic">Fields marked with asterisk (*) are mandatory for ARTA compliance.</p>
        <button 
          disabled={loading} 
          className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-[10px] font-black uppercase tracking-widest rounded transition-all flex items-center gap-2 shadow-sm"
        >
          {loading ? 'PROCESSING...' : <><Save size={12} /> SAVE TO MANIFEST</>}
        </button>
      </div>
    </form>
  </div>
)}

      {/* MANIFEST LISTING */}
      <div className="space-y-12">
        {Object.entries(visibleServices.reduce((acc, s) => {
          const p = s.plant_name || "UNASSIGNED";
          const o = s.office_name || "UNASSIGNED";
          if (!acc[p]) acc[p] = {};
          if (!acc[p][o]) acc[p][o] = [];
          acc[p][o].push(s);
          return acc;
        }, {})).map(([plant, officesInPlant]) => (
          <div key={plant}>
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-[#001d3d] text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg">{plant}</div>
              <div className="h-[1px] flex-grow bg-slate-200"></div>
            </div>
            <div className="grid grid-cols-1 gap-6 px-4">
              {Object.entries(officesInPlant).map(([office, srvs]) => (
                <div key={office} className="space-y-4">
                  <div className="flex items-center gap-2"><ChevronRight size={14} className="text-blue-600" /><span className="text-[11px] font-black text-blue-900 uppercase">{office}</span></div>
                  <div className="grid grid-cols-1 gap-3">
                    {srvs.map((s) => {
                      const canEdit = role === 'super_admin' || (role === 'manager' && String(s.plant_name).toLowerCase() === String(user.plant_name).toLowerCase()) || (role === 'office' && String(s.office_id) === String(user.office_id));
                      return (
                        <div key={s.id} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:border-blue-200 transition-all group">
                          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                            <div className="w-full space-y-4">
                              {editingId === s.id ? (
                                <div className="space-y-3 animate-in slide-in-from-left-2 duration-300">
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-black text-blue-600 uppercase ml-1">Edit Service Name</label>
                                    <textarea className="w-full bg-slate-50 border-2 border-blue-600 rounded-xl p-3 text-[11px] font-black uppercase outline-none" value={editData.service_name} onChange={e => setEditData({...editData, service_name: e.target.value})} />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-black text-blue-600 uppercase ml-1">Edit Description</label>
                                    <textarea className="w-full bg-slate-50 border-2 border-blue-600 rounded-xl p-3 text-[11px] font-black uppercase outline-none min-h-[100px]" value={editData.service_description} onChange={e => setEditData({...editData, service_description: e.target.value})} />
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div>
                                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{s.service_name}</p>
                                    <div className="mt-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                      
                                      <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed italic">{s.service_description || 'No description recorded.'}</p>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                            <div className="flex gap-2 shrink-0 self-start md:self-center">
                              {canEdit && (
                                editingId === s.id ? (
                                  <div className="flex flex-col gap-2">
                                    <button onClick={() => handleUpdate(s.id)} className="p-3 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"><Check size={18} /></button>
                                    <button onClick={() => setEditingId(null)} className="p-3 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 transition-all"><X size={18} /></button>
                                  </div>
                                ) : (
                                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                    <button onClick={() => { setEditingId(s.id); setEditData({service_name: s.service_name, service_description: s.servdescription || ''}); }} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg transition-colors"><Edit3 size={14} /></button>
                                    <button onClick={() => handleDelete(s.id)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ArtaServices;