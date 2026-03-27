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
        const [resO, resS] = await Promise.all([
          fetch(API_OFFICES),
          fetch(API_SERVICES)
        ]);

        const oData = await resO.json();
        const sData = await resS.json();

        if (oData.status === 'success') {
          // EXCLUDE System Admin from the public portal
          const filtered = oData.data.filter(off => off.username !== 'admin');
          setOffices(filtered);
        }
        
        if (sData.status === 'success') {
          const grouped = sData.data.reduce((acc, service) => {
            const oid = service.office_id;
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

  // GROUP OFFICES BY PLANT
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
    const payload = {
      ...formData,
      office_id: selectedOffice.id,
      service_id: selectedServiceId
    };

    try {
      const response = await fetch('http://localhost/MinGen%20CSM/mingen-api/survey/submit_survey.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.status === 'success') {
        alert("Official Feedback Submitted. Thank you!");
        navigate('/');
      }
    } catch (error) {
      alert("Submission Error. Check connection.");
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-bold text-slate-400">LOADING PORTAL...</div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans flex flex-col text-slate-900">
      <nav className="bg-[#002855] text-white px-8 py-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <img src="/npc-logo.jpg" alt="NPC" className="h-10 w-10 bg-white rounded-full p-1" />
          <div className="text-left">
            <h1 className="text-sm font-bold leading-none uppercase tracking-tighter">National Power Corporation</h1>
            <p className="text-[9px] text-blue-300 uppercase tracking-widest mt-1">CSM FEEDBACK PORTAL</p>
          </div>
        </div>
        <button onClick={() => navigate('/')} className="text-[10px] font-bold border border-blue-400/50 px-4 py-2 rounded-sm hover:bg-white/10 transition uppercase">Exit</button>
      </nav>

      <main className="flex-1 py-10 px-6">
        {step === 1 && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <h2 className="text-3xl font-black text-[#002855] uppercase tracking-tight">Select your Location</h2>
              <p className="text-slate-500 font-medium">Which plant or office did you visit today?</p>
            </div>

            <div className="max-w-xl mx-auto">
              <input
                type="text"
                placeholder="SEARCH PLANT OR OFFICE..."
                className="w-full px-6 py-4 bg-white border-2 border-slate-200 rounded-xl focus:border-indigo-600 outline-none transition-all text-lg font-bold shadow-sm uppercase placeholder:text-slate-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-10">
              {Object.entries(groupedOffices).map(([plant, plantOffices]) => (
                <div key={plant} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 bg-indigo-600 rounded-full"></div>
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">{plant}</h3>
                    <div className="h-px flex-1 bg-slate-200"></div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {plantOffices.map((office) => (
                      <button
                        key={office.id}
                        onClick={() => { setSelectedOffice(office); setStep(2); }}
                        className="bg-white p-5 border border-slate-200 rounded-xl text-left hover:border-indigo-600 hover:shadow-md transition-all group flex flex-col justify-between min-h-[100px]"
                      >
                        <span className="font-bold text-slate-800 uppercase text-sm leading-tight group-hover:text-indigo-600">{office.name}</span>
                        <div className="flex justify-between items-center mt-4">
                          <span className="text-[10px] font-bold text-slate-400">{office.code}</span>
                          <span className="text-[10px] font-black text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity uppercase">Select →</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="bg-white p-6 border-l-8 border-indigo-600 rounded-lg shadow-sm flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TRANSACTING WITH</p>
                <h3 className="text-xl font-black text-[#002855] uppercase leading-none mt-1">{selectedOffice?.name}</h3>
                <p className="text-xs font-bold text-indigo-500 mt-1">{selectedOffice?.plant_name}</p>
              </div>
              <button onClick={() => setStep(1)} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-4 py-2 rounded-full hover:bg-slate-200 uppercase tracking-tighter">Change</button>
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Select ARTA Service</h2>
              <p className="text-slate-500 text-sm">Please pick the specific service you availed.</p>
            </div>

            <div className="grid gap-3">
              {servicesByOffice[selectedOffice?.id]?.map((svc, idx) => (
                <button
                  key={svc.id}
                  onClick={() => { 
                    setSelectedService(svc.service_name); 
                    setSelectedServiceId(svc.id);       
                    setStep(3); 
                  }}
                  className="p-6 bg-white border-2 border-slate-100 rounded-2xl hover:border-indigo-600 hover:bg-indigo-50/50 transition-all text-left flex gap-5 items-center active:scale-[0.98]"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xs">{idx + 1}</div>
                  <span className="flex-1 font-bold text-slate-700 uppercase text-sm leading-snug">{svc.service_name}</span>
                  <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <SurveyForm 
            selectedService={selectedService} 
            artaServicesForOffice={servicesByOffice[selectedOffice.id]}
            onBack={() => setStep(2)} 
            onSubmit={handleSurveySubmit} 
          />
        )}
      </main>
    </div>
  );
}

export default DashboardPage;