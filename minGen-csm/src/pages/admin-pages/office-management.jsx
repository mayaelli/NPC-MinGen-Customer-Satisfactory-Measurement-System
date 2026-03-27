import React, { useState, useEffect } from 'react';

const OfficeManagement = () => {
  const [offices, setOffices] = useState([]);
  const [newOffice, setNewOffice] = useState({ name: '', plant_name: '', description: '', parent_id: '' });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: '', plant_name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [copyStatus, setCopyStatus] = useState(null);

  const API_URL = 'http://localhost/MinGen%20CSM/mingen-api/survey/manage_offices.php';

  useEffect(() => { fetchOffices(); }, []);

  const fetchOffices = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      if (data.status === 'success') setOffices(data.data);
    } catch (err) { console.error("Fetch error:", err); }
  };

  const handleAddOffice = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOffice),
      });
      setNewOffice({ name: '', plant_name: '', description: '', parent_id: '' });
      fetchOffices();
    } finally { setLoading(false); }
  };

  const handleCopy = (office) => {
    const textToCopy = `Plant: ${office.plant_name}\nOffice: ${office.name}\nUser: ${office.username}\nPass: ${office.raw_password}`;
    navigator.clipboard.writeText(textToCopy);
    setCopyStatus(office.id);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  const handleDelete = async (id) => {
    if (window.confirm("This will also remove all associated users and services. Proceed?")) {
      await fetch(`${API_URL}?id=${id}`, { method: 'DELETE' });
      fetchOffices();
    }
  };

  // Grouping by Plant Name
  const grouped = offices.reduce((acc, off) => {
    const pName = off.plant_name || "UNASSIGNED";
    if (!acc[pName]) acc[pName] = [];
    acc[pName].push(off);
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-10 antialiased text-slate-800">
      
      {/* HEADER SECTION */}
      <header className="flex justify-between items-end border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Office Management</h1>
          <p className="text-slate-500 font-medium">Define plant hierarchy and access control levels.</p>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider">
            {offices.length} Total Registered
          </span>
        </div>
      </header>

      {/* REGISTRATION CARD */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest">New Office Registration</h3>
        </div>
        <form onSubmit={handleAddOffice} className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Plant Location</label>
            <input 
              type="text" placeholder="e.g. PULANGI 4"
              className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold"
              list="plant-list"
              value={newOffice.plant_name}
              onChange={(e) => setNewOffice({...newOffice, plant_name: e.target.value.toUpperCase()})}
              required
            />
            <datalist id="plant-list">
              {[...new Set(offices.map(o => o.plant_name))].map(d => <option key={d} value={d} />)}
            </datalist>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Office/Division Name</label>
            <input 
              type="text" placeholder="e.g. Finance Division"
              className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold"
              value={newOffice.name}
              onChange={(e) => setNewOffice({...newOffice, name: e.target.value})}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Reports To (RBAC)</label>
            <select 
              className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold appearance-none"
              value={newOffice.parent_id}
              onChange={(e) => setNewOffice({...newOffice, parent_id: e.target.value})}
            >
              <option value="">No Parent (Plant Manager)</option>
              {offices.filter(o => o.plant_name === newOffice.plant_name && !o.parent_id).map(off => (
                <option key={off.id} value={off.id}>{off.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button 
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm transition-all shadow-md shadow-indigo-100 disabled:opacity-50"
            >
              {loading ? 'SAVING...' : 'CREATE OFFICE'}
            </button>
          </div>
        </form>
      </section>

      {/* DATA DISPLAY GRID */}
        <div className="grid grid-cols-1 gap-10">
          {Object.entries(grouped).map(([plantName, plantOffices]) => (
            <div key={plantName} className="space-y-4">
              {/* Plant Header */}
              <div className="flex items-center gap-4">
                <h2 className="text-base font-black text-slate-800 tracking-tight border-l-4 border-indigo-600 pl-3 uppercase">
                  {plantName}
                </h2>
                <div className="h-px flex-1 bg-slate-200"></div>
              </div>

              {/* Responsive Grid: Auto-fills small cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {plantOffices.map((office) => (
                  <div 
                    key={office.id} 
                    className={`relative group bg-white border rounded-lg p-4 transition-all hover:shadow-md flex flex-col justify-between ${
                      office.role === 'manager' 
                        ? 'border-indigo-200 ring-1 ring-indigo-50/50 shadow-sm' 
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Top Section */}
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                          office.role === 'manager' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {office.role}
                        </span>
                        <button 
                          onClick={() => handleDelete(office.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      <h4 className="text-[11px] font-bold text-slate-900 leading-tight break-words mb-1 uppercase">
                        {office.name}
                      </h4>
                      <p className="text-[9px] font-bold text-indigo-500 mb-3">{office.code}</p>
                    </div>

                    {/* Credentials Section - Made more compact */}
                    <div className="space-y-1.5 bg-slate-50/80 rounded-md p-2.5 border border-slate-100">
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="font-bold text-slate-400">USER</span>
                        <span className="font-mono text-slate-700">{office.username}</span>
                      </div>
                      <div className="flex justify-between items-center text-[9px] border-t border-slate-200/50 pt-1.5">
                        <span className="font-bold text-slate-400">PASS</span>
                        <span className="font-mono text-slate-700 tracking-widest">••••••••</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleCopy(office)}
                      className="w-full mt-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-indigo-600 border border-indigo-100 rounded-md hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                    >
                      {copyStatus === office.id ? '✓ Copied' : 'Copy Credentials'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
    </div>
  );
};

export default OfficeManagement;