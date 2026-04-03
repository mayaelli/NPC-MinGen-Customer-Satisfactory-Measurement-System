import React, { useState, useEffect, useMemo } from 'react';

const OfficeManagement = () => {
  const [offices, setOffices] = useState([]);
  const [newOffice, setNewOffice] = useState({ name: '', abbreviation: '', plant_name: '', description: '', parent_id: '' });
  const [searchTerm, setSearchTerm] = useState('');
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
        // 1. Show Success Alert (using the message from PHP)
        alert(result.message || "Office and User Account successfully created!");
        
        // 2. Clear the form
        setNewOffice({ name: '', abbreviation: '', plant_name: '', description: '', parent_id: '' });
        
        // 3. Refresh the list
        fetchOffices();
      } else {
        // 4. Show Error Alert (e.g., if username already exists)
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
    const response = await fetch(API_URL, { // Use your constant API_URL
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
      // 1. Update the local modal state so the toggle moves immediately
      setSelectedOffice(prev => ({ ...prev, is_auditor_enabled: newStatus }));
      
      // 2. Refresh the background list
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
          // We send the ID and a flag telling PHP to trigger the password reset
          body: JSON.stringify({ 
              id: officeId, 
              reset_password: true,
              // We pass existing data to keep the UPDATE query happy
              plant_name: selectedOffice.plant_name,
              name: selectedOffice.name,
              abbreviation: selectedOffice.abbreviation
          }),
        });

        const result = await response.json();
        if (result.status === 'success') {
          alert(result.message);
          fetchOffices(); // Refresh to show the new raw_password in the modal
          setSelectedOffice(null); // Close modal
        }
      } catch (err) {
        alert("Failed to reset password.");
      }
    }
  };

  const handleDelete = async (id) => {
  // 1. Initial Confirmation
    if (window.confirm("This will also remove all associated users and services. Proceed?")) {
      try {
        const response = await fetch(`${API_URL}?id=${id}`, { method: 'DELETE' });
        const result = await response.json();

        if (result.status === 'success') {
          // 2. Show Success Alert
          alert("Office and associated records successfully deleted.");
          
          // 3. Clean up the UI
          setSelectedOffice(null); // Closes the modal
          fetchOffices();          // Refreshes the list
        } else {
          // 4. Show Error Alert if PHP returns an error
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

  // Fixed Search & Filter Logic (Prevents .toLowerCase() null error)
  const filteredOffices = useMemo(() => {
    return offices.filter(off => {
      const name = (off.name || "").toLowerCase();
      const abbr = (off.abbreviation || "").toLowerCase();
      const search = searchTerm.toLowerCase();
      return name.includes(search) || abbr.includes(search);
    });

    sort((a, b) => parseInt(a.id) - parseInt(b.id));

  }, [offices, searchTerm]);

  const grouped = filteredOffices.reduce((acc, off) => {
    const pName = off.plant_name || "UNASSIGNED";
    if (!acc[pName]) acc[pName] = [];
    acc[pName].push(off);
    return acc;
  }, {});

  // Auto-expand on search
  useEffect(() => {
    if (searchTerm) {
      const results = {};
      Object.keys(grouped).forEach(plant => { results[plant] = true; });
      setExpandedPlants(results);
    }
  }, [searchTerm]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 antialiased text-slate-800 bg-slate-50 min-h-screen">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase font-sans">Office Management</h1>
          <p className="text-sm text-slate-500 font-medium font-sans">Control hierarchy and system access credentials.</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <input 
            type="text"
            placeholder="Search Name or Abbr..."
            className="w-full pl-5 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
         
        </div>
      </header>

      {/* REGISTRATION FORM */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <form onSubmit={handleAddOffice} className="p-5 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Plant Location</label>
            <input type="text" list="plant-list" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold" value={newOffice.plant_name} onChange={(e)=>setNewOffice({...newOffice, plant_name: e.target.value.toUpperCase()})} required />
            <datalist id="plant-list">
               {[...new Set(offices.map(o => o.plant_name))].map(d => <option key={d} value={d} />)}
            </datalist>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Office Name</label>
            <input type="text" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold" value={newOffice.name} onChange={(e)=>setNewOffice({...newOffice, name: e.target.value})} required />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Abbr.</label>
            <input type="text" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold uppercase" value={newOffice.abbreviation} onChange={(e)=>setNewOffice({...newOffice, abbreviation: e.target.value.toUpperCase()})} required />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Reports To</label>
            <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold" value={newOffice.parent_id} onChange={(e)=>setNewOffice({...newOffice, parent_id: e.target.value})}>
              <option value="">No Parent</option>
              {offices.filter(o => o.plant_name === newOffice.plant_name && !o.parent_id).map(off => (
                <option key={off.id} value={off.id}>{off.name}</option>
              ))}
            </select>
          </div>
          <button disabled={loading} className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md active:scale-95">
            {loading ? '...' : 'Create'}
          </button>
        </form>
      </section>

      {/* DATA DISPLAY */}
      <div className="space-y-3 min-h-[400px]">
        <div className="flex gap-4 px-1">
          <button onClick={() => setExpandedPlants(Object.fromEntries(Object.keys(grouped).map(k => [k, true])))} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Expand All</button>
          <button onClick={() => setExpandedPlants({})} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:underline">Collapse All</button>
        </div>

        {Object.keys(grouped).length > 0 ? (
          Object.entries(grouped).map(([plantName, plantOffices]) => (
            <div key={plantName} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <button 
                onClick={() => togglePlant(plantName)}
                className="w-full flex justify-between items-center px-6 py-4 bg-white hover:bg-slate-50 transition-colors border-b border-slate-100"
              >
                <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider">{plantName}</h2>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{plantOffices.length} Offices</span>
                  <span className={`text-xs transition-transform duration-300 ${expandedPlants[plantName] ? 'rotate-180' : ''}`}>▼</span>
                </div>
              </button>

              {expandedPlants[plantName] && (
                <div className="divide-y divide-slate-100">
                  {plantOffices.map((office) => (
                    <div key={office.id} className="flex items-center justify-between px-6 py-3 hover:bg-indigo-50/30 group transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${office.role === 'manager' ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                        <span className="text-sm font-bold text-slate-700 uppercase">
                          {office.name} <span className="text-indigo-500 font-black ml-1">({office.abbreviation})</span>
                        
                          {office.is_auditor_enabled == 1 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-indigo-100 text-indigo-600 text-[8px] font-black rounded uppercase tracking-tighter border border-indigo-200">
                              Auditor
                            </span>
                          )}
                          
                        </span>
                      </div>
                      <button onClick={() => setSelectedOffice(office)} className="text-[9px] font-black text-slate-400 hover:text-indigo-600 border border-slate-200 px-3 py-1.5 rounded-lg bg-white transition-all shadow-sm active:scale-95 uppercase tracking-tighter">
                        Manage Account
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest italic">No Data Found</h3>
          </div>
        )}
      </div>

      {/* CREDENTIAL MODAL - PROFESSIONAL MINIMALIST */}
      {selectedOffice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{selectedOffice.abbreviation || "OFFICE"}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-sans">Account Credentials</p>
              </div>
              <button onClick={() => setSelectedOffice(null)} className="text-slate-400 hover:text-slate-900 text-xl transition-colors">×</button>
            </div>
            
            <div className="p-6 space-y-6">

              <div className="flex items-center justify-between p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Auditor Access</span>
                    <p className="text-[9px] text-slate-500 font-medium leading-tight">Can view all plant ARTA data</p>
                  </div>
                  <button
                    onClick={() => handleToggleAuditor(selectedOffice.id, selectedOffice.is_auditor_enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none shadow-inner ${
                      selectedOffice.is_auditor_enabled == 1 ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${
                        selectedOffice.is_auditor_enabled == 1 ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black text-indigo-500 uppercase tracking-widest ml-1">Username</label>
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="font-mono text-sm text-slate-700">{selectedOffice.username || "---"}</span>
                    <button onClick={() => { navigator.clipboard.writeText(selectedOffice.username); setCopyStatus('u'); setTimeout(()=>setCopyStatus(null), 800); }} className="text-[9px] font-bold text-slate-400 hover:text-indigo-600 uppercase tracking-widest">
                      {copyStatus === 'u' ? '✓' : 'COPY'}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black text-indigo-500 uppercase tracking-widest ml-1">Password</label>
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="font-mono text-sm text-slate-700 tracking-wider font-bold">{selectedOffice.raw_password || "---"}</span>
                    <button onClick={() => { navigator.clipboard.writeText(selectedOffice.raw_password); setCopyStatus('p'); setTimeout(()=>setCopyStatus(null), 800); }} className="text-[9px] font-bold text-slate-400 hover:text-indigo-600 uppercase tracking-widest">
                      {copyStatus === 'p' ? '✓' : 'COPY'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                <button onClick={() => handleCopy(selectedOffice)} className="w-full py-2.5 bg-slate-900 text-white rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95">
                  {copyStatus === 'all' ? 'Copied' : 'Copy Full Summary'}
                </button>

                <button 
                  onClick={() => handleResetPassword(selectedOffice.id)} 
                  className="w-full py-2.5 bg-indigo-50 text-indigo-600 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-100 transition-all active:scale-95 border border-indigo-100"
                >
                  🔄 Generate New Password
                </button>
                <button 
                  onClick={() => handleDelete(selectedOffice.id)} 
                  className="w-full py-2 text-red-500 font-bold text-[9px] uppercase tracking-widest hover:text-red-700 transition-colors active:scale-95"
                >
                  Remove Office Record
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