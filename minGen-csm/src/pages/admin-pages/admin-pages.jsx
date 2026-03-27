import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminDashboard from './admin-dashboard'; 
import OfficeManagement from './office-management';
import ArtaServices from './arta-services';
import SurveyResults from './survey-results';
import { ReportsPage } from './reports-page';

const AdminPage = () => {
  console.log("1. AdminPage Component Initialized"); // LOG 1
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState(null);
  
  // --- DATA STATES ---
  const [surveys, setSurveys] = useState([]); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("2. useEffect Triggered"); // LOG 2
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      console.log("3. No user found in localStorage, redirecting..."); // LOG 3
      navigate('/login'); 
    } else {
      console.log("4. User found:", savedUser); // LOG 4
      setUser(JSON.parse(savedUser));
      fetchSurveyData();
    }
  }, [navigate]);

  // --- FETCH LOGIC FOR PHP API ---
  const fetchSurveyData = async () => {
    console.log("5. fetchSurveyData Started"); // LOG 5
    try {
      setLoading(true);
      // CORRECTED URL TO MATCH YOUR FILENAME AND FOLDER
      // Replace line 36 in your AdminPage.jsx with this:
      // update line 39 in AdminPage.jsx
      const response = await fetch('http://localhost/MinGen%20CSM/minGen-api/survey/get_survey_results.php');
      console.log("6. Fetch Response Status:", response.status); // LOG 6
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();
      console.log("7. Data Received from PHP:", result); // LOG 7

      if (result.status === "success") {
        console.table(result.data); // <--- ADD THIS to see the 9 records in the console
        setSurveys(result.data); 
      } else {
        console.error("PHP Error:", result.message);
      }
    } catch (error) {
      console.log("FETCH ERROR:", error); // LOG ERROR
      console.error("Connection Error:", error);
    } finally {
      setLoading(false);
      console.log("8. Loading Finished"); // LOG 8
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  // --- TAB ROUTING ---
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-xs font-bold uppercase tracking-widest">Synchronizing Database...</p>
        </div>
      );
    }

    switch(activeTab) {
      case 'overview': return <AdminDashboard data={surveys} />;
      case 'office_management': return <OfficeManagement />;
      case 'services': return <ArtaServices />;
      case 'results': return <SurveyResults data={surveys} />;
      case 'reports': return <ReportsPage data={surveys} />; 
      default: return <AdminDashboard data={surveys} />;
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex font-sans text-slate-900">
      <aside className="w-64 bg-[#001d3d] text-white flex flex-col h-screen sticky top-0 z-20">
        <div className="p-6 border-b border-white/10 bg-[#00152e]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 flex items-center justify-center rounded-sm shadow-inner text-white font-black">N</div>
            <div>
              <h1 className="font-bold text-sm tracking-tight leading-none text-white">NAPOCOR</h1>
              <p className="text-[9px] text-blue-400 font-bold tracking-widest uppercase mt-1">MinGen Division</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <p className="px-4 py-2 text-[10px] font-bold text-blue-400/50 uppercase tracking-[0.2em]">Main Menu</p>
          {[
            { id: 'overview', label: 'Dashboard' },
            { id: 'office_management', label: 'Office Management' },
            { id: 'services', label: 'Services (ARTA)' },
            { id: 'results', label: 'Feedbacks' },
            { id: 'reports', label: 'Compliance Reports'},
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center px-4 py-3 rounded-sm text-xs font-bold transition-all duration-150 ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 bg-[#00152e]">
          <button onClick={handleLogout} className="w-full px-4 py-2 border border-red-500/30 text-red-400 text-[10px] font-bold rounded-sm hover:bg-red-500 hover:text-white transition-all uppercase tracking-widest">
            Log Out Session
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">
              {activeTab.replace('_', ' ')}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right border-r border-slate-200 pr-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase leading-none tracking-tighter">Server Status</p>
              <p className="text-[9px] font-bold text-emerald-600 uppercase mt-1 tracking-widest">● Operational</p>
            </div>
            <p className="text-[10px] font-bold text-slate-800 uppercase tracking-tighter">Terminal 01</p>
          </div>
        </header>

        <div className="p-8 max-w-7xl">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default AdminPage;