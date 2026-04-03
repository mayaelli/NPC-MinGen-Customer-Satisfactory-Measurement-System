import React, { useState, useEffect, useMemo } from 'react';
import { canCRUDServices } from '../../utils/permissions';

const ArtaServices = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.role;
  console.log("DEBUG: Current Role from LocalStorage is:", role); // Check this in F12 console
  const canCRUD = canCRUDServices(role);

  const [services, setServices] = useState([]);
  const [offices, setOffices] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState('');
  const [newService, setNewService] = useState({ office_id: '', service_name: '' });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ service_name: '' });
  const [loading, setLoading] = useState(false);

  const API_SERVICES = 'http://localhost/MinGen%20CSM/minGen-api/survey/manage_services.php';
  const API_OFFICES = 'http://localhost/MinGen%20CSM/minGen-api/survey/manage_offices.php';

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [resOffices, resServices] = await Promise.all([
      fetch(API_OFFICES, { credentials: 'include' }),
      fetch(API_SERVICES, { credentials: 'include' })
    ]);
    const oData = await resOffices.json();
    const sData = await resServices.json();

    console.log("Logged in User Role: ", role);
    console.log("Services from PHP: ", sData);

    if (oData.status === 'success') setOffices(oData.data);
    if (sData.status === 'success') setServices(sData.data);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    // office role always posts to their own office
    const payload = role === 'office'
      ? { office_id: user.office_id, service_name: newService.service_name }
      : newService;
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
      const response = await fetch(`${API_SERVICES}?id=${id}`, { 
        method: 'DELETE', 
        credentials: 'include' // <--- CRITICAL for Session access
      });
      
      const result = await response.json();
      if (result.status === 'success') {
        fetchData();
      } else {
        alert("Error: " + result.message);
      }
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

  // Scope the visible services based on role
  const visibleServices = useMemo(() => {
    if (!services || services.length === 0) return [];

    // 1. SUPER_ADMIN & AUDITOR: Absolute access to the whole array
    if (role === 'super_admin' || role === 'auditor') {
      return services;
    }

    // 2. MANAGER: Filter by Plant (Case-Insensitive check)
    if (role === 'manager') {
      return services.filter(s => 
        String(s.plant_name).toLowerCase() === String(user.plant_name).toLowerCase()
      );
    }

    // 3. OFFICE: Filter by office_id (Using == to allow String/Int comparison)
    if (role === 'office') {
      return services.filter(s => String(s.office_id) === String(user.office_id));
    }

    return [];
  }, [services, role, user.plant_name, user.office_id]);


  // Plants available to this user for the add-form filter
  const plants = [...new Set(offices.map(o => o.plant_name))];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 antialiased text-slate-800">

      {/* HEADER */}
      <header className="border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">ARTA Service Configuration</h1>
        <p className="text-sm text-slate-500 font-medium">Map specific frontline services to their respective plants and divisions.</p>
      </header>

      {/* REGISTRATION FORM — only super_admin and office roles */}
      {canCRUD && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Register New Service</span>
          </div>

          <form onSubmit={handleAdd} className="p-6 space-y-5">
            {/* super_admin picks plant + office; office role sees their office pre-locked */}
            {role === 'super_admin' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">1. Filter Plant</label>
                  <select
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    value={selectedPlant}
                    onChange={(e) => {
                      setSelectedPlant(e.target.value);
                      setNewService({ ...newService, office_id: '' });
                    }}
                    required
                  >
                    <option value="">-- SELECT PLANT --</option>
                    {plants.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">2. Assign to Office</label>
                  <select
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
                    value={newService.office_id}
                    onChange={(e) => setNewService({ ...newService, office_id: e.target.value })}
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
            ) : (
              // office role: show their office as read-only context
              <div className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-lg">
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Office: </span>
                <span className="text-xs font-bold text-indigo-700 uppercase">{user.office_name}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
                {role === 'super_admin' ? '3.' : '1.'} Name of Service (Full Title)
              </label>
              <textarea
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 uppercase placeholder:font-normal placeholder:normal-case resize-none min-h-[80px]"
                placeholder="Enter the full service name as it appears in the Citizen's Charter..."
                rows="3"
                value={newService.service_name}
                onChange={(e) => setNewService({ ...newService, service_name: e.target.value })}
                required
              />
            </div>

            <div className="flex justify-end">
              <button className="w-full md:w-48 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase tracking-widest rounded-lg transition-all shadow-md shadow-indigo-100 active:scale-95">
                {loading ? 'PROCESSING...' : 'ADD SERVICE'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SERVICES TABLE — grouped by plant > office */}
      <div className="space-y-8">
        {Object.entries(
          visibleServices.reduce((acc, s) => {
            const pName = s.plant_name || "UNASSIGNED PLANT";
            const oName = s.office_name || "UNASSIGNED OFFICE";

            if (!acc[pName]) acc[pName] = {};
            if (!acc[pName][oName]) acc[pName][oName] = [];
            acc[pName][oName].push(s);
            return acc;
          }, {})
        ).map(([plantName, officesInPlant]) => (
          <div key={plantName} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-800 px-6 py-3">
              <h2 className="text-xs font-black text-white uppercase tracking-[0.2em]">{plantName}</h2>
            </div>

            <table className="w-full text-left border-collapse">
              <tbody className="divide-y divide-slate-100">
                {Object.entries(officesInPlant).map(([officeName, officeServices]) => (
                  <React.Fragment key={officeName}>
                    <tr className="bg-slate-50/80">
                      <td colSpan="2" className="px-6 py-2 border-y border-slate-200">
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">
                          DIVISION: {officeName}
                        </span>
                      </td>
                    </tr>

                    {officeServices.map((service) => {
                        // Logic: Only super_admin or the specific office can edit
                        const isSuperAdmin = role === 'super_admin';
                        const isManager = role === 'manager' && 
                                          String(service.plant_name).toLowerCase() === String(user.plant_name).toLowerCase();
                        const isOwnerOffice = role === 'office' && 
                                              String(service.office_id) === String(user.office_id);
                        
                        const canEdit = isSuperAdmin || isManager || isOwnerOffice;

                        // DEBUG: Run this once to see why buttons are hidden
                        // console.log(`Service: ${service.service_name} | Role: ${role} | canEdit: ${canEdit}`);

                        return (
                          <tr key={service.id} className="group hover:bg-indigo-50/30 transition-colors">
                            <td className="px-10 py-3 w-full">
                              {editingId === service.id ? (
                                <textarea
                                  className="w-full border-b-2 border-indigo-500 p-1 text-xs font-bold uppercase outline-none bg-transparent resize-none"
                                  value={editData.service_name}
                                  onChange={e => setEditData({ ...editData, service_name: e.target.value })}
                                  rows="2"
                                />
                              ) : (
                                <p className="text-xs font-semibold text-slate-700 uppercase leading-relaxed">
                                  {service.service_name}
                                </p>
                              )}
                            </td>

                            <td className="px-6 py-3 text-right whitespace-nowrap">
                              {/* If this condition is false, the buttons won't exist in the HTML */}
                              {canEdit && (
                                editingId === service.id ? (
                                  <div className="flex justify-end gap-3">
                                    <button onClick={() => handleUpdate(service.id)} className="text-[10px] font-bold text-emerald-600 uppercase hover:underline">Save</button>
                                    <button onClick={() => setEditingId(null)} className="text-[10px] font-bold text-slate-400 uppercase">Cancel</button>
                                  </div>
                                ) : (
                                  /* Note: group-hover:opacity-100 means buttons only appear when you mouse OVER the row */
                                  <div className="flex justify-end gap-4">
                                  <button
                                      onClick={() => { 
                                        setEditingId(service.id); 
                                        setEditData({ service_name: service.service_name }); 
                                      }}
                                      className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 uppercase"
                                    >
                                      Edit
                                    </button>
                                    <button 
                                      onClick={() => handleDelete(service.id)} 
                                      className="text-[10px] font-bold text-red-400 hover:text-red-600 uppercase"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                )
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {visibleServices.length === 0 && (
          <div className="text-center py-16 text-slate-400 text-xs font-bold uppercase tracking-widest">
            No services found.
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtaServices;
