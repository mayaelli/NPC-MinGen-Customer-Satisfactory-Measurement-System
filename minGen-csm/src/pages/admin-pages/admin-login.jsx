import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminLogin = () => {
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://localhost/MinGen%20CSM/mingen-api/auth/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        // Save the user "badge" in the browser's memory
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/admin-pages'); // Send them to the dashboard
      } else {
        alert(data.message || "Invalid credentials");
      }
    } catch (error) {
      alert("Could not connect to the server. Is XAMPP running?");
    }
  };

  return (
    <div className="min-h-screen bg-[#001d3d] flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-[2rem] shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Admin Login</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">MinGen CSM System</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Username</label>
            <input 
              type="text" 
              className="w-full p-4 bg-slate-100 rounded-2xl border-none focus:ring-2 focus:ring-blue-600 outline-none transition-all"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Password</label>
            <input 
              type="password" 
              className="w-full p-4 bg-slate-100 rounded-2xl border-none focus:ring-2 focus:ring-blue-600 outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button 
            type="submit" 
            className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-900/20 transition-all uppercase tracking-widest text-sm"
          >
            Authorize Access
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;