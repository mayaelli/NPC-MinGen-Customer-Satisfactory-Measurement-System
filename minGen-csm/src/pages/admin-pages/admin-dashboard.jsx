import React, { useState, useEffect } from 'react';
// Import Recharts components (Install via: npm install recharts)
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ total_submissions: 0, overall_satisfaction: 0, office_count: 0 });
  const [submissions, setSubmissions] = useState([]);
  const [chartData, setChartData] = useState([]); // For satisfaction trends
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({ username: 'Admin', role: 'office' });

  // NPC Professional Color Palette
  const NPC_BLUE = "#001d3d";
  const NPC_ACCENT = "#003566";
  const SUCCESS_GREEN = "#10b981";

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        fetchData(parsed);
    }
  }, []);

  const fetchData = async (currentUser) => {
    setLoading(true);
    try {
      // Note: Passing role and office_id to API ensures filtered data
      const response = await fetch(`http://localhost/MinGen%20CSM/mingen-api/survey/get_dashboard_stats.php?role=${currentUser.role}&office_id=${currentUser.office_id}`, {
          credentials: 'include'
      });
      const data = await response.json();
      if (data.status === 'success') {
        setStats(data.stats);
        setSubmissions(data.recent_submissions || []);
        setChartData(data.chart_data || []); // API should return date-based averages
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 1. PROFESSIONAL HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 border border-slate-200 rounded-xl shadow-sm gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
            SYSTEM OVERVIEW
          </h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
            {user.plant_name || "Mindanao Generation"} • {user.office_name || "All Units"}
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-lg border border-slate-100">
          <div className="text-right">
            <p className="text-xs font-black text-slate-700 uppercase">{user.username}</p>
            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tighter">{user.role?.replace('_', ' ')}</p>
          </div>
          <div className="w-10 h-10 bg-[#001d3d] text-white rounded-lg flex items-center justify-center font-black shadow-lg">
            {user.username.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* 2. STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Surveys', val: stats.total_submissions, icon: '📊', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Overall Rating', val: `${Number(stats.overall_satisfaction).toFixed(1)} / 5.0`, icon: '⭐', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Active Offices', val: stats.office_count, icon: '🏢', color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm flex items-center justify-between group hover:border-blue-300 transition-all">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-3xl font-black text-slate-800">{loading ? '...' : stat.val}</h3>
            </div>
            <div className={`w-12 h-12 ${stat.bg} rounded-full flex items-center justify-center text-xl`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* 3. DATA VISUALS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Line Chart */}
        <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Satisfaction Trend (Monthly)</h4>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} dy={10} />
                <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={4} dot={{ r: 4, fill: '#2563eb' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Office Performance Bar Chart */}
        <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Top Performing Units</h4>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={submissions.slice(0, 5)}> {/* Logic: Show top 5 offices */}
                <XAxis dataKey="office_name" hide />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="avg_score" radius={[4, 4, 0, 0]}>
                  {submissions.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? NPC_BLUE : NPC_ACCENT} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. RECENT SUBMISSIONS TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest">Live Feedback Feed</h4>
          <button className="px-4 py-2 bg-[#001d3d] text-white text-[10px] font-black rounded-lg uppercase tracking-widest hover:bg-blue-950 transition shadow-md shadow-blue-900/20">
            Export Analytics
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Customer</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Unit/Office</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Rating</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {submissions.map((sub, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-xs font-black text-slate-700">{sub.full_name}</p>
                    <p className="text-[9px] text-blue-600 font-bold uppercase">{sub.client_type}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black text-slate-600 px-2 py-1 bg-white border border-slate-200 rounded-md shadow-sm uppercase">
                      {sub.office_name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-black ${sub.avg_score >= 4 ? 'text-emerald-600' : 'text-orange-600'}`}>{sub.avg_score}</span>
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full">
                            <div className="h-full bg-blue-600 rounded-full" style={{width: `${(sub.avg_score/5)*100}%`}}></div>
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">
                    {new Date().toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;