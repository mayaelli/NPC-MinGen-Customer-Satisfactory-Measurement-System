import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, ClipboardList, MessageSquare, ShieldCheck, UserCog } from 'lucide-react';
import AdminDashboard from './admin-dashboard'; 
import OfficeManagement from './office-management';
import ArtaServices from './arta-services';
import SurveyResults from './survey-results';
import { ReportsPage } from './reports-page';
import AdminManagement from './admin-management';

const AdminPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState(null);
  const [surveys, setSurveys] = useState([]); 
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOfficeData = async () => {
    try {
      const response = await fetch('http://localhost/MinGen%20CSM/minGen-api/survey/manage_offices.php'); 
      const result = await response.json();
      if (result.status === "success") {
        setOffices(result.data); 
      }
    } catch (error) {
      console.error("Office Fetch Error:", error);
    }
  };

  // Logic remains untouched as requested
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      navigate('/login'); 
    } else {
      setUser(JSON.parse(savedUser));
      fetchSurveyData();
      fetchOfficeData();
    }
  }, [navigate]);

  const fetchSurveyData = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost/MinGen%20CSM/minGen-api/survey/get_survey_results.php', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (result.status === "success") {
        setSurveys(result.data); 
      }
    } catch (error) {
      console.error("Connection Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const IconMap = {
    overview: LayoutDashboard,
    office_management: Building2,
    services: ClipboardList,
    results: MessageSquare,
    reports: ShieldCheck,
    admin_management: UserCog,
  };

  const handleLogout = () => {
    // Use a confirmation to prevent accidental clicks
    const confirmLogout = window.confirm(
      "SECURITY PROTOCOL: Are you sure you want to terminate this active session? \n\nAny unsaved changes will be lost."
    );

    if (confirmLogout) {
      // 1. Clear session data
      localStorage.removeItem('user');
      
      // 2. Optional: Add a small delay for "Processing" effect
      console.log("Session Terminated. Redirecting to Secure Login...");
      
      // 3. Navigate back
      navigate('/login');
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] animate-in fade-in duration-700">
          <div className="relative w-12 h-12">
             <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full"></div>
             <div className="absolute inset-0 border-4 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mt-6">Decrypting Records...</p>
        </div>
      );
    }

      
        switch(activeTab) {
        case 'overview': 
          // Everyone sees this
          return <AdminDashboard data={surveys} user={user} />;

        case 'office_management': 
          // STRICT: ADMIN & SUPER_ADMIN ONLY
          if (user.role === 'admin' || user.role === 'super_admin') {
            return <OfficeManagement user={user} />;
          }
          return <AdminDashboard data={surveys} user={user} />;

        case 'services': 
          // STRICT: ADMIN, SUPER_ADMIN, OFFICE, MANAGER
          const allowedServiceRoles = ['admin', 'super_admin', 'office', 'manager'];
          if (allowedServiceRoles.includes(user.role)) {
            return <ArtaServices />;
          }
          return <AdminDashboard data={surveys} user={user} />;

        case 'admin_management': 
          // STRICT: SUPER_ADMIN ONLY
          if (user.role === 'super_admin') {
            return <AdminManagement />;
          }
          return <AdminDashboard data={surveys} user={user} />;

        case 'results': return <SurveyResults data={surveys} />;
        case 'reports': return <ReportsPage data={surveys} allOffices={offices} user={user} />;

        default: 
          return <AdminDashboard data={surveys} user={user} />;
      }
    };

  if (!user) return null;

  return (
    <div className="h-screen flex bg-[#f8fafc] font-sans text-slate-900 overflow-hidden">
      
      {/* SIDEBAR: Command Panel Style */}
      <aside className="w-72 bg-[#001d3d] text-white flex flex-col relative z-20 shadow-[4px_0_24px_rgba(0,0,0,0.1)]">
        {/* Sidebar Header */}
        <div className="p-8 pb-10">
          <div className="flex flex-col gap-4">
            <img src="/npc-new-logo.png" alt="NPC" className="h-14 w-14 object-contain opacity-90" />
            <div className="space-y-1">
              <h1 className="font-black text-lg tracking-tighter leading-none uppercase italic">Mindanao Gen</h1>
              <p className="text-[9px] text-blue-400 font-black tracking-[0.3em] uppercase">Control Center v2.0</p>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="px-4 py-3 text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">System Nodes</p>
          {[
            { id: 'overview', label: 'Dashboard Overview'},
            ...(['admin', 'super_admin'].includes(user.role) ? [{ id: 'office_management', label: 'Office Directory' }] : []),
            ...(['admin', 'super_admin', 'office', 'manager'].includes(user.role) ? [{ id: 'services', label: 'ARTA Services' }] : []),
            { id: 'results', label: 'Feedback Stream' },
            { id: 'reports', label: 'Compliance Audit'},
            ...(user.role === 'super_admin' ? [{ id: 'admin_management', label: 'Admin Accounts' }] : []),
          ].map((item) => {
            const DynamicIcon = IconMap[item.id];
            return (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full group flex items-center justify-between px-4 py-4 transition-all duration-300 relative ${
                  activeTab === item.id 
                    ? 'bg-blue-600/10 text-white' 
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                {DynamicIcon && (
              <DynamicIcon 
                size={18} 
                strokeWidth={activeTab === item.id ? 2.5 : 2}
                className={`transition-all duration-300 ${activeTab === item.id ? 'text-blue-400 opacity-100' : 'opacity-40 group-hover:opacity-100'}`}
              />
            )}

                <span className="text-[11px] font-bold uppercase tracking-widest">{item.label}</span>
              </div>
              {activeTab === item.id && (
                <div className="absolute left-0 w-1 h-full bg-blue-500 shadow-[0_0_12px_#3b82f6]"></div>
              )}
            </button>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div className="p-6 bg-[#00152e] border-t border-white/5 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30 text-[10px] font-black text-blue-400">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              {/* 1. Added Department/Office Name here */}
              <p className="text-[10px] font-black text-white truncate uppercase tracking-tight">
                {user.office_name || "Mingen Division"} 
              </p>
              
              {/* 2. Added User/Role Info */}
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-[8px] font-bold text-blue-400/60 uppercase tracking-tighter italic">
                  @{user.username}
                </p>
                <span className="text-[8px] text-white/20">•</span>
                <p className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter">
                  {user.role}
                </p>
              </div>
            </div>
          </div>

          <button 
            onClick={handleLogout} 
            className="w-full py-3 bg-white/5 hover:bg-red-600/20 text-white/40 hover:text-red-400 text-[9px] font-black rounded-none transition-all uppercase tracking-[0.2em] border border-white/5 hover:border-red-500/30"
          >
            Terminate Session
          </button>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 flex flex-col relative h-screen overflow-hidden">
        
        {/* Minimal Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-10 flex justify-between items-center z-10 shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] leading-none mb-1">Current Node</h2>
              <p className="text-xl font-black text-slate-800 uppercase tracking-tighter italic">
                {activeTab.replace('_', ' ')}
              </p>
            </div>
            {/* Real-time Indicator */}
            <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
            <div className="hidden md:flex flex-col">
               <span className="text-[9px] font-bold text-emerald-500 uppercase flex items-center gap-2 tracking-widest">
                 <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                 Live Data Stream
               </span>
               <span className="text-[10px] font-medium text-slate-400">Response Latency: 24ms</span>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
             <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Office Context</p>
                <p className="text-[11px] font-bold text-slate-800 uppercase">{user.plant_name || 'General HQ'}</p>
             </div>
             <div className="h-10 w-10 border border-slate-200 flex items-center justify-center text-xs text-slate-400 font-bold italic shadow-sm">
                01
             </div>
          </div>
        </header>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto px-10 py-10 custom-scrollbar scroll-smooth">
          <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {renderContent()}
          </div>
        </div>

        {/* Status Bar Footer */}
        <footer className="h-10 bg-white border-t border-slate-200 px-10 flex items-center justify-between shrink-0">
           <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em]">Authorized Access Only // RA 10173 Security Protocol Active</p>
           <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em]">NPC MinGen Division © 2026</p>
        </footer>
      </main>
    </div>
  );
};

export default AdminPage;