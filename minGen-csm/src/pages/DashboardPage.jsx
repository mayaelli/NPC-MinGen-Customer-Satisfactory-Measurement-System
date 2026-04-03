import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SurveyForm from './SurveyForm';

function DashboardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOffice, setSelectedOffice] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedServiceId, setSelectedServiceId] = useState(null);

  const [offices, setOffices] = useState([]);
  const [servicesByOffice, setServicesByOffice] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const API_OFFICES = 'http://localhost/MinGen%20CSM/mingen-api/survey/manage_offices.php';
  const API_SERVICES = 'http://localhost/MinGen%20CSM/mingen-api/survey/manage_services.php';

  useEffect(() => {
    const loadPortalData = async () => {
      try {
        const [resO, resS] = await Promise.all([fetch(API_OFFICES), fetch(API_SERVICES)]);
        const oData = await resO.json();
        const sData = await resS.json();

        if (oData.status === 'success') {
          setOffices(oData.data.filter(off => off.username !== 'admin'));
        }
        
        if (sData.status === 'success') {
          const grouped = sData.data.reduce((acc, service) => {
            const oid = service.office_id.toString();
            if (!acc[oid]) acc[oid] = [];
            acc[oid].push(service);
            return acc;
          }, {});
          setServicesByOffice(grouped);
        }
      } catch (error) {
        console.error("Portal Data Load Error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPortalData();
  }, []);

  const groupedOffices = useMemo(() => {
    const filtered = offices.filter(off => 
      off.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      off.plant_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return filtered.reduce((acc, off) => {
      if (!acc[off.plant_name]) acc[off.plant_name] = [];
      acc[off.plant_name].push(off);
      return acc;
    }, {});
  }, [searchTerm, offices]);

  const handleSurveySubmit = async (formData) => {
    const payload = { ...formData, office_id: selectedOffice.id, service_id: selectedServiceId };
    try {
      const response = await fetch('http://localhost/MinGen%20CSM/mingen-api/survey/submit_survey.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if ((await response.json()).status === 'success') navigate('/');
    } catch (error) {
      alert("Submission Error.");
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-white text-[10px] font-bold tracking-widest text-slate-400 animate-pulse uppercase">Syncing with NPC Servers...</div>;

  return (
    <div className="h-screen flex flex-col bg-[#f8fafc] font-sans text-slate-900 overflow-hidden">
      {/* 1. Refined Minimal Header */}
      <header className="flex-none bg-white/70 backdrop-blur-md px-10 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-5">
            <img src="/npc-logo.png" alt="NPC" className="h-9 w-9 object-contain opacity-90" />
            <div className="space-y-0.5">
              <h1 className="text-[#002855] text-xs font-black tracking-widest uppercase">National Power Corporation</h1>
              <p className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">Mindanao Generation Portal</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/')} 
            className="text-[10px] font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest"
          >
            Exit Portal
          </button>
        </div>
      </header>

      {/* 2. Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 md:px-10">
        <div className={`w-full transition-all duration-500 ${step === 3 ? 'max-w-4xl' : 'max-w-2xl'}`}>
          
          {/* Progress (Visual, not uptight) */}
          <div className="flex justify-center gap-2 mb-10">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-1 rounded-full transition-all duration-500 ${step === i ? 'w-8 bg-[#002855]' : 'w-2 bg-slate-200'}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-light text-slate-800 tracking-tight">Select <span className="font-bold text-[#002855]">Location</span></h2>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Step 01 / Primary Office Identification</p>
              </div>

              <div className="space-y-3">
                <div className="relative group">
                  <select
                    className="w-full appearance-none bg-white border border-slate-200 px-6 py-5 text-sm font-medium text-slate-700 focus:border-[#002855] focus:ring-0 outline-none transition-all cursor-pointer shadow-sm"
                    value={selectedOffice?.id || ""}
                    onChange={(e) => setSelectedOffice(offices.find(o => o.id.toString() === e.target.value))}
                  >
                    <option value="" disabled>— Select Filing Location —</option>
                    {Object.entries(groupedOffices).map(([plant, plantOffices]) => (
                      <optgroup key={plant} label={plant.toUpperCase()}>
                        {plantOffices.map((office) => (
                          <option key={office.id} value={office.id}>{office.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
                <button 
                  disabled={!selectedOffice}
                  onClick={() => setStep(2)}
                  className="w-full py-5 bg-[#002855] text-white text-[10px] font-bold uppercase tracking-[0.3em] disabled:bg-slate-100 disabled:text-slate-300 transition-all hover:bg-[#001d3d] shadow-lg shadow-blue-900/5"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-700">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-light text-slate-800 tracking-tight">Specify <span className="font-bold text-[#002855]">Service</span></h2>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">{selectedOffice?.name}</p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <select
                    className="w-full appearance-none bg-white border border-slate-200 px-6 py-5 text-sm font-medium text-slate-700 focus:border-[#002855] outline-none transition-all cursor-pointer shadow-sm"
                    value={selectedServiceId || ""}
                    onChange={(e) => {
                      const svc = servicesByOffice[selectedOffice.id.toString()]?.find(s => s.id.toString() === e.target.value);
                      if (svc) { setSelectedService(svc.service_name); setSelectedServiceId(svc.id); }
                    }}
                  >
                    <option value="" disabled>— Select Service Type —</option>
                    {servicesByOffice[selectedOffice?.id.toString()]?.map((svc) => (
                      <option key={svc.id} value={svc.id}>{svc.service_name}</option>
                    ))}
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setStep(1)} className="py-4 border border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-all">Back</button>
                  <button 
                    disabled={!selectedServiceId}
                    onClick={() => setStep(3)}
                    className="py-4 bg-[#002855] text-white text-[10px] font-bold uppercase tracking-[0.3em] disabled:bg-slate-100 disabled:text-slate-300 transition-all shadow-lg shadow-blue-900/5"
                  >
                    Proceed
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in zoom-in-95 duration-700 flex flex-col" style={{ maxHeight: 'calc(100vh - 130px)' }}>
              <div className="overflow-y-auto custom-scrollbar">
                <SurveyForm
                  selectedService={selectedService}
                  selectedOfficeName={selectedOffice?.name}
                  artaServicesForOffice={servicesByOffice[selectedOffice.id.toString()]}
                  onBack={() => setStep(2)}
                  onSubmit={handleSurveySubmit}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 3. Footer */}
      <footer className="flex-none px-10 py-6 border-t border-slate-100">
        <div className="max-w-7xl mx-auto flex justify-between items-center opacity-40">
          <span className="text-[9px] font-bold tracking-widest uppercase">RA 11032 Compliant Portal</span>
          <span className="text-[9px] font-bold tracking-widest uppercase">© 2026 NPC MINGEN</span>
        </div>
      </footer>
    </div>
  );
}

export default DashboardPage;