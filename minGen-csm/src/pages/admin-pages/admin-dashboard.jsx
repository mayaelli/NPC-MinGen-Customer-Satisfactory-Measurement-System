import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, BarChart, Bar, Cell, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Trophy, Target, Zap, Users, ArrowUpRight, Clock, Download, AlertCircle, ShieldAlert, Activity } from 'lucide-react';

const NPC_BLUE = "#001d3d";
const NPC_ACCENT = "#003566";
const PULSE_BARS = [4, 7, 5, 8, 6, 9, 4, 5, 7, 6, 8];

const formatDate = (dateString) => {
  if (!dateString) return 'SYNCED';
  return new Date(dateString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const AdminDashboard = () => {
  const [user] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [stats, setStats] = useState({ total_submissions: 0, overall_satisfaction: 0, office_count: 0 });
  const [submissions, setSubmissions] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [viewScope, setViewScope] = useState(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      return ['super_admin', 'manager'].includes(parsed.role) ? 'global' : 'local';
    }
    return 'local';
  });

  const userPermissions = useMemo(() => user?.permissions || [], [user]);
  const isProvisioned = useMemo(() => user?.role === 'provisioned' || user?.is_provisioned === 1, [user]);
  const canViewAnalytics = useMemo(() => !isProvisioned || userPermissions.includes('view_analytics'), [isProvisioned, userPermissions]);

  const limitedSubmissions = useMemo(() => submissions.slice(0, 5), [submissions]);
  
  const ratingStatus = useMemo(() => {
    const score = stats.overall_satisfaction || 0;
    if (score >= 4.5) return { label: 'EXCELLENT', color: 'text-emerald-600', bg: 'bg-emerald-50/50', border: 'border-emerald-200' };
    if (score >= 3.5) return { label: 'GOOD', color: 'text-blue-600', bg: 'bg-blue-50/50', border: 'border-blue-200' };
    return { label: 'NEEDS FOCUS', color: 'text-amber-600', bg: 'bg-amber-50/50', border: 'border-amber-200' };
  }, [stats.overall_satisfaction]);

  const officeContextLabel = useMemo(() => {
    if (user?.role === 'super_admin') return 'Global System Master';
    if (isProvisioned) {
      if (user?.offices && user.offices.length > 0) {
        return user.offices.map(o => o.office_name || o.office_id).join(', ');
      }
      return 'Provisioned Multi-Access';
    }
    return user?.plant_name || 'Assigned Unit';
  }, [user, isProvisioned]);

  useEffect(() => {
    if (!user || !canViewAnalytics) return;
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://localhost/MinGen%20CSM/minGen-api/survey/get_dashboard_stats.php?scope=${viewScope}&user_id=${user.id}`, {
          method: 'GET',
          credentials: 'include'
        });
        const data = await response.json();
        
        if (data.status === 'success' && isMounted) {
          setStats({
            total_submissions: parseInt(data.stats?.total_submissions || 0, 10),
            overall_satisfaction: parseFloat(data.stats?.overall_satisfaction || 0),
            office_count: parseInt(data.stats?.office_count || 0, 10)
          });
          setSubmissions(data.recent_submissions || []);
          setChartData(data.chart_data || []);
        }
      } catch (error) {
        console.error("Dashboard Fetch Error:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [viewScope, user, canViewAnalytics]);

  if (!user) return <div className="p-20 text-center text-xs font-black tracking-[0.3em] text-slate-400 animate-pulse">SYSTEM//SYNCING_WITH_DB...</div>;

  if (!canViewAnalytics) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-white border border-slate-200 rounded-xl space-y-4 max-w-xl mx-auto my-20 shadow-sm">
        <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100">
          <ShieldAlert size={20} />
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Security Guard Halt</h3>
          <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
            Your provisioned security key profile does not possess active permissions to review data analytics metrics.
          </p>
        </div>
        <div className="text-[10px] bg-slate-50 px-2 py-1 rounded text-slate-400 font-mono border border-slate-100">
          ERR_AUTH_KEY_MISSING: view_analytics
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 mix-blend-normal">
      {/* 1. CONTROL OVERLAY ROW */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[8px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded uppercase tracking-widest">SYS Node 01</span>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.3em]">Operational Overview</p>
          </div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">System Metrics Console</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Scope Matrix Selector */}
          <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex">
            {['local', 'global'].map((scopeOption) => {
              const isGlobalDisabled = scopeOption === 'global' && isProvisioned && !userPermissions.includes('view_global_analytics');
              const isActive = viewScope === scopeOption;
              return (
                <button
                  key={scopeOption}
                  disabled={isGlobalDisabled}
                  onClick={() => setViewScope(scopeOption)}
                  className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${
                    isGlobalDisabled ? 'opacity-25 cursor-not-allowed text-slate-400' :
                    isActive ? 'bg-white text-slate-950 shadow-xs border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {scopeOption === 'local' ? 'Target Unit' : 'Global Net'}
                </button>
              );
            })}
          </div>

          {/* Secure Node Meta Context Block */}
          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-right max-w-xs min-w-[140px]">
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Authentication Scope</p>
            <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight truncate" title={officeContextLabel}>
              {officeContextLabel}
            </p>
          </div>
        </div>
      </header>

      {/* 2. THE MASTER SPLIT COMMAND LAYOUT */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        
        {/* LEFT COMPACT PANEL: Vitals & Core Indicators */}
        <div className="xl:col-span-1 space-y-4">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Telemetry Columns</p>
          
          {/* Tile 1: Satisfaction Rating Index Block */}
          <div className={`bg-white border p-5 rounded-xl shadow-xs transition-all ${ratingStatus.border}`}>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Satisfaction Index</span>
              <Trophy size={14} className={ratingStatus.color} />
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
                {loading ? '...' : Number(stats.overall_satisfaction || 0).toFixed(2)}
              </h2>
              <span className="text-[10px] font-mono text-slate-400">/ 5.00</span>
            </div>
            {!loading && (
              <div className={`mt-3 inline-block text-[8px] font-black px-2 py-0.5 rounded border ${ratingStatus.bg} ${ratingStatus.color} ${ratingStatus.border}`}>
                STATUS // {ratingStatus.label}
              </div>
            )}
          </div>

          {/* Tile 2: Submissions Log Volume */}
          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs group hover:border-slate-300 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Data Streams</span>
              <Zap size={14} className="text-blue-600" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
              {loading ? '...' : stats.total_submissions.toLocaleString()}
            </h2>
            <p className="text-[8px] text-slate-400 uppercase tracking-tight font-medium mt-1">Total Verified Submissions Packets</p>
          </div>

          {/* Tile 3: Net Operational Nodes */}
          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active Stations</span>
              <Target size={14} className="text-orange-600" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
              {loading ? '...' : stats.office_count}
            </h2>
            <p className="text-[8px] text-slate-400 uppercase tracking-tight font-medium mt-1">Reporting Departments Managed</p>
          </div>

          {/* Tile 4: Hardware Infrastructure Pulse (System Health Background Card) */}
          <div className="bg-slate-900 text-slate-200 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Core Network Pulse</span>
              </div>
              <Clock size={11} className="text-slate-500" />
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xl font-black tracking-tight leading-none text-white">99.9%</p>
                <p className="text-[7px] text-emerald-400 uppercase font-mono font-bold mt-1">Uptime Nominal</p>
              </div>
              <div className="flex gap-0.5 items-end h-7 select-none">
                {PULSE_BARS.map((h, i) => (
                  <div key={i} className="w-[2px] bg-slate-700 rounded-xs" style={{ height: `${h * 10}%` }}></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT CORE DASHBOARD AREA: Matrix Charts & Activity Streams */}
        <div className="xl:col-span-3 space-y-6">
          
          {/* Dynamic Row Graph Engine Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Area Chart: Holds 2/3 weight for trend linearity */}
            <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[9px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                  <ArrowUpRight size={12} className="text-blue-600" /> Quality Evaluation Trendline
                </h4>
                <span className="text-[8px] font-mono text-slate-400">Interval: Month-To-Month</span>
              </div>
              <div className="h-[210px] w-full transform-gpu">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.08} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} dy={8} />
                    <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '10px', fontFamily: 'monospace' }} />
                    <Area type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorScore)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar Chart: Holds 1/3 layout structure weight */}
            <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs lg:col-span-1">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[9px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                  <Users size={12} className="text-slate-700" /> Station Weight
                </h4>
                <span className="text-[8px] font-mono text-slate-400">Top 5 Nodes</span>
              </div>
              <div className="h-[210px] w-full transform-gpu">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={limitedSubmissions} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                    <XAxis dataKey="office_name" hide />
                    <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '10px' }} />
                    <Bar dataKey="avg_score" radius={[3, 3, 0, 0]} barSize={20}>
                      {limitedSubmissions.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? NPC_BLUE : NPC_ACCENT} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 3. ARTA LOG STREAM FEED */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Activity size={12} className="text-slate-400 animate-pulse" />
                <div>
                  <h4 className="font-black text-slate-900 text-[10px] uppercase tracking-widest">Master Audit Registry</h4>
                  <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Real-time Response Sync Engine</p>
                </div>
              </div>
              <button className="flex items-center gap-1.5 border border-slate-200 text-[8px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95">
                <Download size={11} /> Export Matrix
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 select-none">
                    <th className="px-5 py-3 text-[8px] font-black text-slate-400 uppercase tracking-widest">Target Node Registry</th>
                    <th className="px-5 py-3 text-[8px] font-black text-slate-400 uppercase tracking-widest">Respondent Context</th>
                    <th className="px-5 py-3 text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">Score Vector</th>
                    <th className="px-5 py-3 text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {submissions.length > 0 ? submissions.map((sub, i) => {
                    const calculatedScore = parseFloat(sub.avg_score || 0);
                    const isHighResult = calculatedScore >= 4.0;
                    
                    return (
                      <tr key={sub.id || i} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="px-5 py-3.5">
                          <p className="font-black text-slate-900 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{sub.office_name}</p>
                          <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">{sub.service_name}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-slate-700">{sub.full_name || 'Anonymous Identifier'}</p>
                          <p className="text-[8px] text-blue-600 font-black uppercase tracking-tighter">{sub.client_type}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`font-black ${isHighResult ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {calculatedScore.toFixed(1)}
                            </span>
                            <div className="w-12 h-0.5 bg-slate-150 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full ${isHighResult ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${(calculatedScore / 5) * 100}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-slate-400 text-[10px]">
                          {formatDate(sub.created_at)}
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="4" className="text-center py-12 text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">No Active Transmission Packets Located</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;