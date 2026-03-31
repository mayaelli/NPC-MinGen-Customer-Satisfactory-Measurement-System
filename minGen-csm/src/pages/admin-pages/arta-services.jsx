import React, { useState, useEffect } from 'react';

const ArtaServices = () => {
  const [services, setServices] = useState([]);
  const [offices, setOffices] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState('');
  const [newService, setNewService] = useState({ office_id: '', service_name: '' });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ service_name: '' });
  const [loading, setLoading] = useState(false);

  const API_SERVICES = 'http://localhost/MinGen%20CSM/mingen-api/survey/manage_services.php';
  const API_OFFICES = 'http://localhost/MinGen%20CSM/mingen-api/survey/manage_offices.php';

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [resOffices, resServices] = await Promise.all([
      fetch(API_OFFICES),
      fetch(API_SERVICES)
    ]);
    const oData = await resOffices.json();
    const sData = await resServices.json();
    if (oData.status === 'success') setOffices(oData.data);
    if (sData.status === 'success') setServices(sData.data);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    await fetch(API_SERVICES, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newService)
    });
    setNewService({ ...newService, service_name: '' }); // Keep office selected for bulk add
    fetchData();
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this service permanently?")) {
      await fetch(`${API_SERVICES}?id=${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  const handleUpdate = async (id) => {
    await fetch(API_SERVICES, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...editData })
    });
    setEditingId(null);
    fetchData();
  };

  // Unique plants for the filter
  const plants = [...new Set(offices.map(o => o.plant_name))];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 antialiased text-slate-800">
      
      {/* HEADER */}
      <header className="border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">ARTA Service Configuration</h1>
        <p className="text-sm text-slate-500 font-medium">Map specific frontline services to their respective plants and divisions.</p>
      </header>

      {/* REGISTRATION FORM CARD */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Register New Service</span>
          </div>

          <form onSubmit={handleAdd} className="p-6 space-y-5">
            {/* ROW 1: SELECTION FILTERS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* STEP 1: SELECT PLANT */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">1. Filter Plant</label>
                <select 
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  value={selectedPlant}
                  onChange={(e) => {
                    setSelectedPlant(e.target.value);
                    setNewService({...newService, office_id: ''}); 
                  }}
                  required
                >
                  <option value="">-- SELECT PLANT --</option>
                  {plants.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* STEP 2: SELECT OFFICE */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">2. Assign to Office</label>
                <select 
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
                  value={newService.office_id}
                  onChange={(e) => setNewService({...newService, office_id: e.target.value})}
                  disabled={!selectedPlant}
                  required
                >
                  <option value="">-- SELECT OFFICE --</option>
                  {offices.filter(o => o.plant_name === selectedPlant).map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ROW 2: SERVICE NAME (WIDE TEXTAREA) */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">3. Name of Service (Full Title)</label>
              <textarea 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 uppercase placeholder:font-normal placeholder:normal-case resize-none min-h-[80px]"
                placeholder="Enter the full service name as it appears in the Citizen's Charter..."
                rows="3"
                value={newService.service_name}
                onChange={(e) => setNewService({...newService, service_name: e.target.value})}
                required
              />
            </div>

            {/* ROW 3: SUBMIT BUTTON */}
            <div className="flex justify-end">
              <button className="w-full md:w-48 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase tracking-widest rounded-lg transition-all shadow-md shadow-indigo-100 active:scale-95">
                {loading ? 'PROCESSING...' : 'ADD SERVICE'}
              </button>
            </div>
          </form>
        </div>

      {/* SERVICES TABLE */}
      
      {/* SERVICES TABLE - GROUPED DISPLAY */}
        <div className="space-y-8">
          {Object.entries(
            // Grouping Logic: Plant -> Office -> Services
            services.reduce((acc, s) => {
              if (!acc[s.plant_name]) acc[s.plant_name] = {};
              if (!acc[s.plant_name][s.office_name]) acc[s.plant_name][s.office_name] = [];
              acc[s.plant_name][s.office_name].push(s);
              return acc;
            }, {})
          ).map(([plantName, officesInPlant]) => (
            <div key={plantName} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Plant Section Header */}
              <div className="bg-slate-800 px-6 py-3">
                <h2 className="text-xs font-black text-white uppercase tracking-[0.2em]">{plantName}</h2>
              </div>

              <table className="w-full text-left border-collapse">
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(officesInPlant).map(([officeName, officeServices]) => (
                    <React.Fragment key={officeName}>
                      {/* Office Sub-Header Row */}
                      <tr className="bg-slate-50/80">
                        <td colSpan="2" className="px-6 py-2 border-y border-slate-200">
                          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">
                            DIVISION: {officeName}
                          </span>
                        </td>
                      </tr>

                      {/* Individual Services under this Office */}
                      {officeServices.map((service) => (
                        <tr key={service.id} className="group hover:bg-indigo-50/30 transition-colors">
                          <td className="px-10 py-3 w-full">
                            {editingId === service.id ? (
                              <textarea 
                                className="w-full border-b-2 border-indigo-500 p-1 text-xs font-bold uppercase outline-none bg-transparent resize-none"
                                value={editData.service_name}
                                onChange={e => setEditData({...editData, service_name: e.target.value})}
                                rows="2"
                              />
                            ) : (
                              <p className="text-xs font-semibold text-slate-700 uppercase leading-relaxed">
                                {service.service_name}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-3 text-right whitespace-nowrap">
                            {editingId === service.id ? (
                              <div className="flex justify-end gap-3">
                                <button onClick={() => handleUpdate(service.id)} className="text-[10px] font-bold text-emerald-600 uppercase hover:underline">Save</button>
                                <button onClick={() => setEditingId(null)} className="text-[10px] font-bold text-slate-400 uppercase">Cancel</button>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => { setEditingId(service.id); setEditData({service_name: service.service_name}); }}
                                  className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 uppercase"
                                >
                                  Edit
                                </button>
                                <button onClick={() => handleDelete(service.id)} className="text-[10px] font-bold text-red-400 hover:text-red-600 uppercase">
                                  Remove
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
    </div>
  );
};

export default ArtaServices;