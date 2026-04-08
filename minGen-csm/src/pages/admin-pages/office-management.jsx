import React, { useState, useEffect, useMemo } from 'react';
import { Building2, Search, Plus, ChevronDown, ChevronRight, Copy, RefreshCw, Trash2, ShieldCheck, UserCircle2, X, CheckCircle2, Lock, Globe } from 'lucide-react';

const OfficeManagement = () => {
  const [offices, setOffices] = useState([]);
  const [newOffice, setNewOffice] = useState({ name: '', abbreviation: '', plant_name: '', description: '', parent_id: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [expandedPlants, setExpandedPlants] = useState({});
  const [selectedOffice, setSelectedOffice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copyStatus, setCopyStatus] = useState(null);


  const API_URL = 'http://localhost/MinGen%20CSM/mingen-api/survey/manage_offices.php';

  useEffect(() => { fetchOffices(); }, []);

  const fetchOffices = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      if (data.status === 'success') {
        setOffices(data.data);
        const firstPlant = data.data[0]?.plant_name;
        if (firstPlant) setExpandedPlants({ [firstPlant]: true });
      }
    } catch (err) { console.error("Fetch error:", err); }
  };

  const handleAddOffice = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOffice),
      });
      const result = await response.json();
      if (result.status === 'success') {
        alert(result.message || "Office and User Account successfully created!");
        setNewOffice({ name: '', abbreviation: '', plant_name: '', description: '', parent_id: '' });
        fetchOffices();
      } else {
        alert("Registration failed: " + result.message);
      }
    } catch (err) {
      console.error("Add Office error:", err);
      alert("System error: Could not reach the server.");
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

  const handleResetPassword = async (officeId) => {
    if (window.confirm("Generate a new random password for this account?")) {
      try {
        const response = await fetch(API_URL, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
              id: officeId, 
              reset_password: true,
              plant_name: selectedOffice.plant_name,
              name: selectedOffice.name,
              abbreviation: selectedOffice.abbreviation
          }),
        });
        const result = await response.json();
        if (result.status === 'success') {
          alert(result.message);
          fetchOffices(); 
          setSelectedOffice(null);
        }
      } catch (err) { alert("Failed to reset password."); }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("This will also remove all associated users and services. Proceed?")) {
      try {
        const response = await fetch(`${API_URL}?id=${id}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.status === 'success') {
          alert("Office and associated records successfully deleted.");
          setSelectedOffice(null);
          fetchOffices();
        } else {
          alert("Delete failed: " + (result.message || "Unknown error"));
        }
      } catch (error) {
        console.error("Error deleting office:", error);
        alert("System error: Could not connect to the server.");
      }
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
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-10 antialiased text-slate-800 animate-in fade-in duration-700">
      
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
             <span className="bg-[#001d3d] text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Authority Node</span>
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Organizational Hierarchy v3.1</span>
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase italic flex items-center gap-3">
            <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
            Office Management
          </h1>
        </div>
        
        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="FILTER SYSTEM NODES..." 
            className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest focus:bg-white focus:border-blue-600 outline-none transition-all shadow-inner"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsSearching(true);
            }}
            onFocus={() => setIsSearching(true)}
          />

          {/* FLOATING SUGGESTIONS TERMINAL */}
          {isSearching && searchTerm.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 ring-1 ring-slate-200">
              <div className="p-2 border-b border-slate-50 bg-slate-50/50">
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

      </header>

      {/* REGISTRATION TERMINAL */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden ring-1 ring-slate-100">
        <div className="bg-[#001d3d] px-6 py-4 flex justify-between items-center text-white">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
            <Plus size={14} className="text-blue-400" /> Initialize New Department Entity
          </span>
          <ShieldCheck size={16} className="text-blue-400 opacity-50" />
        </div>

        <form onSubmit={handleAddOffice} className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-1.5"><Globe size={10}/> Plant Location</label>
            <input type="text" list="plant-list" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black outline-none focus:ring-2 focus:ring-blue-600 transition-all" value={newOffice.plant_name} onChange={(e)=>setNewOffice({...newOffice, plant_name: e.target.value.toUpperCase()})} required />
            <datalist id="plant-list">
                {[...new Set(offices.map(o => o.plant_name))].map(d => <option key={d} value={d} />)}
            </datalist>
          </div>
          <div className="lg:col-span-1 space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-1.5"><Building2 size={10}/> Office Designation</label>
            <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black outline-none focus:ring-2 focus:ring-blue-600 transition-all" value={newOffice.name} onChange={(e)=>setNewOffice({...newOffice, name: e.target.value})} required />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-1.5"><Lock size={10}/> Abbreviation</label>
            <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-600 transition-all" value={newOffice.abbreviation} onChange={(e)=>setNewOffice({...newOffice, abbreviation: e.target.value.toUpperCase()})} required />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-1.5"><ChevronDown size={10}/> Hierarchy Level</label>
            <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black outline-none focus:ring-2 focus:ring-blue-600 appearance-none transition-all" value={newOffice.parent_id} onChange={(e)=>setNewOffice({...newOffice, parent_id: e.target.value})}>
              <option value="">ROOT ENTITY</option>
              {offices.filter(o => o.plant_name === newOffice.plant_name && !o.parent_id).map(off => (
                <option key={off.id} value={off.id}>{off.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button disabled={loading} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50">
              {loading ? 'SYNCING...' : 'REGISTER'}
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
            <div key={plantName} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm ring-1 ring-slate-100">
              <button 
                onClick={() => togglePlant(plantName)}
                className="w-full flex justify-between items-center px-8 py-5 bg-slate-50/50 hover:bg-slate-100 transition-colors border-b border-slate-100 group"
              >
                <div className="flex items-center gap-4">
                    <div className={`p-1.5 rounded-lg bg-blue-600 text-white transition-transform ${expandedPlants[plantName] ? 'rotate-90' : ''}`}>
                        <ChevronRight size={14} />
                    </div>
                    <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] italic">{plantName}</h2>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[9px] font-black text-slate-400 bg-white border border-slate-200 px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm">{plantOffices.length} Active Nodes</span>
                </div>
              </button>

              {expandedPlants[plantName] && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6 bg-white animate-in slide-in-from-top-2 duration-300">
                  {plantOffices.map((office) => (
                    <div key={office.id} className="group flex flex-col justify-between p-5 bg-slate-50 border border-slate-100 rounded-2xl hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                            <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${office.role === 'manager' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">ID: #{office.id}</span>
                        </div>
                        <div>
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight line-clamp-1">{office.name}</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{office.abbreviation}</p>
                        </div>
                        
                        {office.is_auditor_enabled == 1 && (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-[8px] font-black rounded uppercase tracking-tighter border border-blue-200">
                                <ShieldCheck size={10} /> Authorized Auditor
                            </div>
                        )}
                      </div>
                      
                      <button 
                        onClick={() => setSelectedOffice(office)} 
                        className="mt-6 w-full flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-600 hover:shadow-md rounded-xl text-[9px] font-black uppercase transition-all active:scale-95"
                      >
                        <UserCircle2 size={12} /> Access Configuration
                      </button>
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
      {selectedOffice && (
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
              <button onClick={() => setSelectedOffice(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-900"><X size={20}/></button>
            </div>
            
            <div className="p-8 space-y-8">
              {/* Auditor Toggle */}
              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5"><ShieldCheck size={12}/> Global Auditor Permission</span>
                    <p className="text-[9px] text-blue-400 font-medium leading-tight mt-0.5">Allows read access to all plant data</p>
                  </div>
                  <button
                    onClick={() => handleToggleAuditor(selectedOffice.id, selectedOffice.is_auditor_enabled)}
                    className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                      selectedOffice.is_auditor_enabled == 1 ? 'bg-blue-600' : 'bg-slate-300'
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
                    <button onClick={() => { navigator.clipboard.writeText(selectedOffice.username); setCopyStatus('u'); setTimeout(()=>setCopyStatus(null), 800); }} className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-blue-600 transition-all">
                      {copyStatus === 'u' ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Live Raw Password</label>
                  <div className="flex justify-between items-center bg-slate-100 p-4 rounded-xl border border-slate-200">
                    <span className="font-mono text-xs font-black text-blue-600 tracking-widest italic uppercase">{selectedOffice.raw_password || "---"}</span>
                    <button onClick={() => { navigator.clipboard.writeText(selectedOffice.raw_password); setCopyStatus('p'); setTimeout(()=>setCopyStatus(null), 800); }} className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-blue-600 transition-all">
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
                  onClick={() => handleResetPassword(selectedOffice.id)} 
                  className="flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                >
                  <RefreshCw size={14} /> Reset Pass
                </button>

                <button 
                  onClick={() => handleDelete(selectedOffice.id)} 
                  className="flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-100 transition-all active:scale-95 border border-red-100"
                >
                  <Trash2 size={14} /> Wipe Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficeManagement;