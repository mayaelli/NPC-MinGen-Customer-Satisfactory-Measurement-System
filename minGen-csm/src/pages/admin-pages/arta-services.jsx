import React, { useState, useEffect, useMemo } from 'react';
import { canCRUDServices } from '../../utils/permissions';
import { Plus, Trash2, Edit3, Check, X, Briefcase, Building2, Layers, Search, ChevronRight, ShieldCheck } from 'lucide-react';

const ArtaServices = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.role;
  const canCRUD = canCRUDServices(role);

  const [services, setServices] = useState([]);
  const [offices, setOffices] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState('');
  const [newService, setNewService] = useState({ office_id: '', service_name: '' });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ service_name: '' });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
    setLoading(true);
    const payload = role === 'office' ? { office_id: user.office_id, service_name: newService.service_name } : newService;
    await fetch(API_SERVICES, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    setNewService({ ...newService, service_name: '' });
    fetchData();
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this service permanently?")) {
      const res = await fetch(`${API_SERVICES}?id=${id}`, { method: 'DELETE', credentials: 'include' });
      const result = await res.json();
      if (result.status === 'success') fetchData();
    }
  };

  const handleUpdate = async (id) => {
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
    if (searchTerm) {
      filtered = filtered.filter(s => s.service_name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (role === 'super_admin' || role === 'auditor') return filtered;
    if (role === 'manager') return filtered.filter(s => String(s.plant_name).toLowerCase() === String(user.plant_name).toLowerCase());
    if (role === 'office') return filtered.filter(s => String(s.office_id) === String(user.office_id));
    return [];
  }, [services, role, user, searchTerm]);

  const plants = [...new Set(offices.map(o => o.plant_name))];

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
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" placeholder="FILTER MANIFEST..." 
            className="w-full pl-10 pr-4 py-3 bg-slate-100 border-none rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-600 outline-none transition-all"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {/* REGISTRATION FORM */}
      {canCRUD && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden ring-1 ring-slate-100">
          <div className="bg-[#001d3d] px-6 py-4 flex justify-between items-center text-white font-black text-[10px] uppercase tracking-widest">
            <span className="flex items-center gap-2"><Plus size={14} className="text-blue-400" /> New Service Entry</span>
            <ShieldCheck size={16} className="text-blue-400 opacity-50" />
          </div>
          <form onSubmit={handleAdd} className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-4">
              {role === 'super_admin' ? (
                <>
                  <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black outline-none focus:ring-2 focus:ring-blue-600 uppercase"
                    value={selectedPlant} onChange={(e) => { setSelectedPlant(e.target.value); setNewService({...newService, office_id: ''}); }} required>
                    <option value="">-- SELECT PLANT --</option>
                    {plants.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black outline-none focus:ring-2 focus:ring-blue-600 uppercase"
                    value={newService.office_id} onChange={(e) => setNewService({...newService, office_id: e.target.value})} disabled={!selectedPlant} required>
                    <option value="">-- SELECT OFFICE --</option>
                    {offices.filter(o => o.plant_name === selectedPlant).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </>
              ) : (
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
                  <Building2 className="text-blue-600" size={18} />
                  <span className="text-[10px] font-black text-blue-900 uppercase tracking-tighter">{user.office_name}</span>
                </div>
              )}
            </div>
            <div className="lg:col-span-8 space-y-4">
              <textarea className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black outline-none focus:ring-2 focus:ring-blue-600 uppercase placeholder:font-normal placeholder:normal-case min-h-[100px]"
                placeholder="Enter service name..." value={newService.service_name} onChange={(e) => setNewService({...newService, service_name: e.target.value})} required />
              <div className="flex justify-end">
                <button disabled={loading} className="px-8 py-3 bg-[#001d3d] hover:bg-blue-700 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95">
                  {loading ? 'PROCESSING...' : 'ADD TO MANIFEST'}
                </button>
              </div>
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
                <div key={office} className="space-y-3">
                  <div className="flex items-center gap-2"><ChevronRight size={14} className="text-blue-600" /><span className="text-[11px] font-black text-blue-900 uppercase">{office}</span></div>
                  <div className="space-y-2">
                    {srvs.map((s) => {
                      const canEdit = role === 'super_admin' || (role === 'manager' && String(s.plant_name).toLowerCase() === String(user.plant_name).toLowerCase()) || (role === 'office' && String(s.office_id) === String(user.office_id));
                      return (
                        <div key={s.id} className="bg-white border border-slate-100 rounded-xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm hover:border-blue-200 transition-all">
                          <div className="w-full">
                            {editingId === s.id ? (
                              <textarea className="w-full bg-slate-50 border-2 border-blue-600 rounded-lg p-3 text-[11px] font-black uppercase outline-none" value={editData.service_name} onChange={e => setEditData({...editData, service_name: e.target.value})} autoFocus />
                            ) : (
                              <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{s.service_name}</p>
                            )}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            {canEdit && (
                              editingId === s.id ? (
                                <>
                                  <button onClick={() => handleUpdate(s.id)} className="px-3 py-1.5 bg-emerald-600 text-white text-[9px] font-black uppercase rounded-lg">Save</button>
                                  <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-slate-200 text-slate-500 text-[9px] font-black uppercase rounded-lg">Cancel</button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => { setEditingId(s.id); setEditData({service_name: s.service_name}); }} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg transition-colors"><Edit3 size={14} /></button>
                                  <button onClick={() => handleDelete(s.id)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                                </>
                              )
                            )}
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