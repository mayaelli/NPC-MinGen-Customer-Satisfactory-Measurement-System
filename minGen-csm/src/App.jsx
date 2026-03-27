import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import AdminLogin from './pages/admin-pages/admin-login';
import AdminPage from './pages/admin-pages/admin-pages';

function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 selection:bg-blue-100">
      {/* 1. Official Gov PH Bar (Refined) */}
      <div className="bg-[#001d3d] text-slate-300 py-1.5 px-8 text-[10px] flex justify-between items-center tracking-[0.2em] font-medium border-b border-white/5">
        <span>GOVPH | REPUBLIC OF THE PHILIPPINES</span>
        <div className="flex gap-6">
          <button onClick={() => navigate('/DashboardPage')} className="hover:text-white transition-colors cursor-pointer uppercase">Staff Portal</button>
          <span className="cursor-default">TRANSPARENCY SEAL</span>
        </div>
      </div>

      {/* 2. Professional Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <img 
              src="/npc-logo.png" 
              alt="NPC Logo" 
              className="h-20 w-20 object-contain drop-shadow-sm" 
            />
            <div className="h-10 w-[1px] bg-slate-200 hidden md:block"></div>
            <div>
              <h1 className="text-[#002855] text-lg md:text-xl font-extrabold leading-none tracking-tight">
                NATIONAL POWER CORPORATION
              </h1>
              <p className="text-slate-500 text-[11px] md:text-xs font-bold tracking-[0.15em] uppercase mt-1">
                Mindanao Generation Group
              </p>
            </div>
          </div>
          
          <div className="hidden lg:block text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Status</p>
            <div className="flex items-center justify-end gap-2">
              <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-bold text-slate-700 uppercase">Operational</span>
            </div>
          </div>
        </div>
      </header>

      {/* 3. Hero Section (The Aesthetic Part) */}
      <main className="relative overflow-hidden">
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 overflow-hidden">
          <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-blue-100 rounded-full blur-[120px] opacity-50"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-50 rounded-full blur-[150px] opacity-60"></div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 flex flex-col items-center">
          <div className="text-center space-y-6 max-w-3xl">
            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-50 text-[#002855] text-[11px] font-bold tracking-widest uppercase border border-blue-100 shadow-sm">
              Citizen's Charter Compliant
            </span>
            
            <h2 className="text-4xl md:text-6xl font-black text-[#002855] leading-[1.1] tracking-tight">
              Empowering Mindanao through <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#002855] to-blue-600">
                Quality Service.
              </span>
            </h2>

            <p className="text-lg text-slate-600 leading-relaxed font-medium">
              We are committed to continuous improvement. Please participate in our 
              <span className="text-[#002855] font-bold"> Customer Satisfaction Measurement (CSM)</span> survey 
              to help us optimize our grid operations and service delivery.
            </p>

            <div className="pt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => navigate('/DashboardPage')}
                className="w-full sm:w-auto px-10 py-5 bg-[#002855] text-white font-bold rounded-xl shadow-2xl shadow-blue-900/20 hover:bg-[#003a7a] hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                Start Survey
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                </svg>
              </button>
              
              <button className="w-full sm:w-auto px-10 py-5 bg-white text-slate-600 border border-slate-200 font-bold rounded-xl hover:bg-slate-50 transition-all">
                Learn More
              </button>
            </div>
          </div>

          {/* 4. KPI Preview Cards (Formal/Professional) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-24">
            {[
              { label: 'Reliability', desc: 'Sustained Power Grid Operations', icon: '⚡' },
              { label: 'Integrity', desc: 'Transparency in Public Service', icon: '⚖️' },
              { label: 'Excellence', desc: 'Continuous System Optimization', icon: '🏆' }
            ].map((item, i) => (
              <div key={i} className="p-8 bg-white/60 backdrop-blur-sm border border-white rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                <span className="text-3xl mb-4 block">{item.icon}</span>
                <h4 className="font-bold text-[#002855] uppercase tracking-wide">{item.label}</h4>
                <p className="text-sm text-slate-500 mt-2 font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* 5. Minimal Formal Footer */}
      <footer className="bg-white border-t border-slate-200 py-12 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-4 grayscale opacity-70">
            <img src="/npc-logo.jpg" alt="NPC" className="h-10 w-10" />
            <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
              National Power Corporation <br /> Mindanao Generation
            </div>
          </div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">
            © 2026 NPC MinGen. All Rights Reserved.
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