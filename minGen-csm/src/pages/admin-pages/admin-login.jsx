import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      const response = await fetch('http://localhost/MinGen%20CSM/mingen-api/auth/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include', 
      });

      const data = await response.json();

      if (data.status === 'success') {
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/admin-pages'); 
      } else {
        setError(data.message || "Access Denied: Invalid Credentials");
      }
    } catch (error) {
      setError("Network Error: Ensure XAMPP/Server is active.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#001d3d] font-sans text-slate-900 overflow-hidden">
      
      {/* 1. Official Global Header */}
      <header className="flex-none bg-[#001d3d] border-b border-white/10 px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/npc-logo.png" alt="NPC" className="h-10 w-10 object-contain brightness-0 invert" />
            <div className="border-l border-white/20 pl-4">
              <h1 className="text-white text-sm font-black tracking-tighter uppercase leading-none">
                National Power Corporation
              </h1>
              <p className="text-[9px] font-bold text-white/40 tracking-[0.2em] uppercase mt-1">
                Mindanao Generation Group
              </p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/')} 
            className="text-[10px] font-bold text-white/60 hover:text-white transition-colors uppercase tracking-widest"
          >
            ← Return to Public Portal
          </button>
        </div>
      </header>

      {/* 2. Login Central Area */}
      <main className="flex-1 flex items-center justify-center relative px-6">
        {/* Subtle Watermark Backdrop */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none flex items-center justify-center">
          <h1 className="text-[20rem] font-black text-white select-none">MGG</h1>
        </div>

        <div className="w-full max-w-sm z-10 animate-in fade-in zoom-in-95 duration-700">
          <div className="bg-white rounded-none shadow-2xl overflow-hidden">
            
            {/* Top Bar for the Card */}
            <div className="h-1 bg-[#002855] w-full"></div>
            
            <div className="p-10 space-y-8">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight uppercase">Admin Login</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">CSM Management System</p>
              </div>

              {/* DYNAMIC SECURITY FEEDBACK BLOCK */}
              {error && (
                <div className={`p-4 border-l-4 animate-in slide-in-from-top-1 duration-300 ${
                  error.includes("Security Lockout") 
                    ? "bg-amber-50 border-amber-500" 
                    : "bg-red-50 border-red-500"
                }`}>
                  <div className="flex items-center gap-3">
                    {/* Optional: Add a small Shield icon for lockouts */}
                    {error.includes("Security Lockout") && (
                      <span className="text-amber-600">⚠️</span>
                    )}
                    <p className={`text-[10px] font-bold uppercase tracking-tight ${
                      error.includes("Security Lockout") ? "text-amber-700" : "text-red-700"
                    }`}>
                      {error}
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Account Username</label>
                  <input 
                    type="text" 
                    className="w-full p-4 bg-slate-50 border border-slate-200 focus:border-[#002855] focus:bg-white outline-none transition-all text-sm font-bold placeholder:text-slate-300 rounded-none"
                    placeholder="ENTER ID"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Security Password</label>
                  <input 
                    type="password" 
                    className="w-full p-4 bg-slate-50 border border-slate-200 focus:border-[#002855] focus:bg-white outline-none transition-all text-sm font-bold placeholder:text-slate-300 rounded-none"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting || error.includes("Too many")}
                  className="w-full py-4 bg-[#002855] text-white text-[10px] font-black uppercase tracking-[0.4em] hover:bg-[#003a7a] transition-all shadow-xl shadow-blue-900/10 disabled:opacity-50 disabled:cursor-wait"
                >
                  {isSubmitting ? 'Verifying Identity...' : 'Authorize Access'}
                </button>
              </form>
            </div>

            {/* Bottom System Status */}
            <div className="bg-slate-50 border-t border-slate-100 py-4 px-10 flex justify-between items-center">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Secure Admin Node 01</span>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full"></div>
                <span className="text-[8px] font-bold text-slate-500 uppercase">System Ready</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. Footer */}
      <footer className="flex-none px-10 py-6 border-t border-white/5 opacity-30">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-[8px] font-bold text-white uppercase tracking-[0.4em]">
          <span>© 2026 National Power Corporation</span>
          <span>Security Clearance Required</span>
        </div>
      </footer>
    </div>
  );
};

export default AdminLogin;