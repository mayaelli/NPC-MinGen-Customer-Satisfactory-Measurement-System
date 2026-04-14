import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import AdminLogin from './pages/admin-pages/admin-login';
import AdminPage from './pages/admin-pages/admin-pages';


function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col bg-[#fcfcfc] font-sans text-slate-900 overflow-hidden">
      {/* 1. Integrated Official Header */}
      <header className="flex-none border-b border-slate-200">
        <div className="bg-[#001d3d] text-white/80 py-1 px-8 text-[9px] flex justify-between items-center tracking-widest font-semibold">
          <span>REPUBLIC OF THE PHILIPPINES</span>
          <div className="flex gap-4">
            <button onClick={() => navigate('/login')} className="hover:text-white transition-colors">ADMIN LOGIN</button>
            <span className="opacity-50">|</span>
            <span>TRANSPARENCY SEAL</span>
          </div>
        </div>
        
        <div className="bg-white px-8 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <img src="/npc-new-logo.png" alt="NPC Logo" className="h-13 w-13 object-contain" />
            <div>
              <h1 className="text-[#002855] text-base font-black leading-none tracking-tight">
                NATIONAL POWER CORPORATION
              </h1>
              <p className="text-slate-500 text-[10px] font-bold tracking-widest uppercase">
                Mindanao Generation Group
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">System Status</p>
              <div className="flex items-center justify-end gap-1.5">
                <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full"></span>
                <span className="text-[10px] font-bold text-slate-600 uppercase">Operational</span>
              </div>
            </div>
            
          </div>
        </div>
      </header>

      {/* 2. Main Content Area (Compact) */}
      <main className="flex-1 flex flex-col justify-center max-w-6xl mx-auto px-8 py-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border-l-2 border-[#002855] text-[10px] font-bold uppercase tracking-tighter text-slate-600">
              Citizen's Charter Compliant
            </div>
            
            <h2 className="text-4xl font-light text-slate-800 leading-tight">
              Advancing <span className="font-bold text-[#002855]">Grid Excellence</span> <br />
              through Public Feedback.
            </h2>

            <div className="h-[1px] w-20 bg-slate-200"></div>

            <p className="text-sm text-slate-600 leading-relaxed max-w-md">
              The National Power Corporation is committed to the reliable and sustainable 
              power generation for the Mindanao region. Your participation in the 
              Customer Satisfaction Measurement (CSM) helps us align our technical 
              operations with public service standards.
            </p>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => navigate('/DashboardPage')}
                className="px-8 py-3 bg-[#002855] text-white text-xs font-bold uppercase tracking-widest hover:shadow-lg transition-all active:scale-95"
              >
                Begin CSM Survey
              </button>
              <button className="px-8 py-3 border border-slate-300 text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all">
                View Reports
              </button>
            </div>
          </div>

          {/* Service Pillar Cards */}
          <div className="grid grid-cols-1 gap-3">
            {[
              { 
                title: 'Operational Reliability', 
                desc: 'Maintaining consistent power supply and grid stability across Mindanao.',
                icon: <svg className="w-5 h-5 text-[#002855]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              },
              { 
                title: 'Public Integrity', 
                desc: 'Adhering to the highest standards of transparency and government accountability.',
                icon: <svg className="w-5 h-5 text-[#002855]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              },
              { 
                title: 'System Optimization', 
                desc: 'Continuous improvement of generation assets and service delivery protocols.',
                icon: <svg className="w-5 h-5 text-[#002855]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              }
            ].map((pillar, i) => (
              <div key={i} className="group p-5 bg-white border border-slate-200 hover:border-[#002855] transition-colors flex gap-4">
                <div className="mt-1">{pillar.icon}</div>
                <div>
                  <h4 className="text-xs font-bold text-[#002855] uppercase tracking-tighter">{pillar.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{pillar.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* 3. Formal Footer */}
      <footer className="flex-none border-t border-slate-200 bg-slate-50 px-8 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-3 opacity-60">
            <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
              National Power Corporation <br /> 
              <span className="text-[#002855]">Mindanao Generation Head Office</span>
            </div>
          </div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-4 md:mt-0">
            © 2026 NPC MINGEN. All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/DashboardPage" element={<DashboardPage />} />
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/admin-pages" element={<AdminPage />} />
      </Routes>
    </Router>
  );
}