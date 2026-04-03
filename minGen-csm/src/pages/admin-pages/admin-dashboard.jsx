import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, AreaChart, Area } from 'recharts';
import { Trophy, Target, Zap, Users, ArrowUpRight, Clock, ShieldCheck, LayoutDashboard, Globe, Download } from 'lucide-react';

const AdminDashboard = () => {

  const [stats, setStats] = useState({ total_submissions: 0, overall_satisfaction: 0, office_count: 0 });
  const [submissions, setSubmissions] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [viewScope, setViewScope] = useState('local');

  const NPC_BLUE = "#001d3d";
  const NPC_ACCENT = "#003566";

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      fetchData(parsed, 'local');
    }
  }, []);

  const fetchData = async (currentUser, scope) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const response = await fetch(`http://localhost/MinGen%20CSM/minGen-api/survey/get_dashboard_stats.php?scope=${scope}`, {
        method: 'GET',
        credentials: 'include'
      });
      const data = await response.json();
      if (data.status === 'success') {
        setStats({
          total_submissions: parseInt(data.stats?.total_submissions || 0),
          overall_satisfaction: parseFloat(data.stats?.overall_satisfaction || 0),
          office_count: parseInt(data.stats?.office_count || 0)
        });
        setSubmissions(data.recent_submissions || []);
        setChartData(data.chart_data || []);
      }
    } catch (error) {
      console.error("Dashboard Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleScopeChange = (newScope) => {
    setViewScope(newScope);
    fetchData(user, newScope);
  };

  const getRatingStatus = (score) => {
    if (score >= 4.5) return { label: 'EXCELLENT', color: 'text-emerald-600', bg: 'bg-emerald-50' };
    if (score >= 3.5) return { label: 'GOOD', color: 'text-blue-600', bg: 'bg-blue-50' };
    return { label: 'NEEDS FOCUS', color: 'text-amber-600', bg: 'bg-amber-50' };
  };

  if (!user) return <div className="p-20 text-center font-black animate-pulse">SYNCING WITH DATABASE...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-10">
      {/* HEADER */}
      {/* ENHANCED HEADER */}
    <div className="relative overflow-hidden bg-[#001d3d] rounded-3xl p-8 text-white shadow-2xl border border-white/5">
      
      {/* Abstract Background Decoration */}
      <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
        <svg width="100%" height="100%" viewBox="0 0 400 400">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      
      {/* Animated Glow Orbs */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-600/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute -bottom-24 right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px]" />

      <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
        <div className="space-y-4">
          {/* System Status Tags */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" /> 
              Live Stream
            </span>
            <span className="bg-white/5 text-slate-300 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10 flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-blue-400" /> Secure Node
            </span>
          </div>

          <div>
            <h1 className="text-4xl font-black tracking-tighter mb-2 uppercase italic bg-gradient-to-r from-white via-white to-blue-300 bg-clip-text text-transparent">
              {viewScope === 'global' ? 'Mindanao Generation' : user.plant_name}
            </h1>
            <div className="flex items-center gap-4 text-slate-400">
              <div className="flex items-center gap-2">
                <LayoutDashboard size={14} className="text-blue-500" />
                <p className="font-bold text-[10px] uppercase tracking-[0.15em]">
                  Unit: <span className="text-white">{user.office_name || 'System_Root'}</span>
                </p>
              </div>
              <div className="h-4 w-px bg-white/10 hidden sm:block" />
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-blue-500" />
                <p className="font-bold text-[10px] uppercase tracking-[0.15em]">
                  Cycle: <span className="text-white">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Switcher Controls */}
        <div className="bg-black/20 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 flex shadow-inner">
          {[
            { id: 'local', label: 'My Unit', icon: LayoutDashboard },
            { id: 'global', label: 'Global View', icon: Globe }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleScopeChange(tab.id)}
              className={`
                relative px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2
                ${viewScope === tab.id 
                  ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'}
              `}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>

      {/* STATS TILES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Clock size={12} className="text-blue-500" /> Pulse Rate</h5>
            <div className="flex justify-between items-end">
                <div><p className="text-2xl font-black text-slate-800 tracking-tighter">99.9%</p><p className="text-[9px] text-emerald-500 font-bold uppercase">Uptime Nominal</p></div>
                <div className="flex gap-0.5 items-end h-8">
                    {[4,7,5,8,6,9,4].map((h, i) => <div key={i} className="w-1 bg-blue-100 rounded-full" style={{height: `${h*10}%`}}></div>)}
                </div>
            </div>
         </div>

         {[
           { label: 'Submissions', val: stats.total_submissions, IconComp: Zap, color: 'text-blue-600', bg: 'bg-blue-50' },
           { label: 'Rating Index', val: Number(stats.overall_satisfaction || 0).toFixed(1), IconComp: Trophy, color: 'text-emerald-600', bg: 'bg-emerald-50' },
           { label: 'Active Nodes', val: stats.office_count, IconComp: Target, color: 'text-orange-600', bg: 'bg-orange-50' },
         ].map((stat, i) => {
           const Icon = stat.IconComp;
           return (
             <div key={i} className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between group">
               <div>
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                 <h3 className="text-2xl font-black text-slate-800 tracking-tighter">{loading ? '...' : stat.val}</h3>
                 {stat.label === 'Rating Index' && !loading && (
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${getRatingStatus(stats.overall_satisfaction).bg} ${getRatingStatus(stats.overall_satisfaction).color}`}>
                      {getRatingStatus(stats.overall_satisfaction).label}
                    </span>
                 )}
               </div>
               <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center transition-transform group-hover:scale-110`}>
                 <Icon size={20} strokeWidth={2.5} />
               </div>
             </div>
           );
         })}
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
          <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2"><ArrowUpRight size={14} className="text-blue-600" /> Quality Trendline</h4>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs><linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800, fill: '#94a3b8'}} dy={10} />
                <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800, fill: '#94a3b8'}} />
                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', fontSize: '10px'}} />
                <Area type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
          <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2"><Users size={14} className="text-blue-600" /> Unit Comparison</h4>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={submissions.slice(0, 5)}>
                <XAxis dataKey="office_name" hide />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', fontSize: '10px'}} />
                <Bar dataKey="avg_score" radius={[4, 4, 4, 4]} barSize={30}>
                  {submissions.map((_, index) => <Cell key={`cell-${index}`} fill={index % 2 === 0 ? NPC_BLUE : NPC_ACCENT} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* FEED TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
          <div><h4 className="font-black text-slate-800 text-[10px] uppercase tracking-widest">Master Audit Log</h4><p className="text-[8px] text-slate-400 font-bold uppercase mt-1 italic">Real-time ARTA Data Sync</p></div>
          <button className="flex items-center gap-2 border border-slate-200 text-[9px] font-black px-4 py-2 rounded-lg uppercase tracking-widest hover:bg-slate-50 transition-all"><Download size={12} /> Export CSV</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Reference Node</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Respondent</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Score Index</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {submissions.length > 0 ? submissions.map((sub, i) => (
                <tr key={i} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4"><p className="text-[11px] font-black text-slate-800 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{sub.office_name}</p><p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">{sub.service_name}</p></td>
                  <td className="px-6 py-4"><p className="text-[11px] font-bold text-slate-700">{sub.full_name || 'Anonymous'}</p><p className="text-[8px] text-blue-600 font-black uppercase tracking-tighter">{sub.client_type}</p></td>
                  <td className="px-6 py-4"><div className="flex flex-col items-center gap-1"><span className={`text-[11px] font-black ${parseFloat(sub.avg_score) >= 4 ? 'text-emerald-600' : 'text-amber-600'}`}>{parseFloat(sub.avg_score || 0).toFixed(1)}</span><div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${parseFloat(sub.avg_score) >= 4 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${(sub.avg_score / 5) * 100}%` }}></div></div></div></td>
                  <td className="px-6 py-4 text-right"><span className="text-[9px] font-black text-slate-400 uppercase">{sub.created_at ? new Date(sub.created_at).toLocaleDateString() : 'SYNCED'}</span></td>
                </tr>
              )) : (<tr><td colSpan="4" className="text-center py-12 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">No Data Packets Found</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;