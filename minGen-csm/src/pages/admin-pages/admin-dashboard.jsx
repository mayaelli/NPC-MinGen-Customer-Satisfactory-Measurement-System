import React, { useState, useEffect } from 'react';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ total_submissions: 0, overall_satisfaction: 0, office_count: 0 });
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({ username: 'Admin' });

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
    
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost/MinGen%20CSM/mingen-api/survey/get_dashboard_stats.php');
      const data = await response.json();
      if (data.status === 'success') {
        setStats(data.stats);
        setSubmissions(data.recent_submissions || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Professional Header - Username Display */}
      <div className="flex justify-between items-center bg-white p-4 border border-slate-200 rounded-sm shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">System Overview</h2>
          <p className="text-xs text-slate-500 font-medium">Real-time Customer Satisfaction Monitoring</p>
        </div>
        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
          <div className="text-right">
            <p className="text-xs font-bold text-slate-700 leading-none">{user.username}</p>
            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tighter mt-1">Authorized Personnel</p>
          </div>
          <div className="w-8 h-8 bg-slate-800 text-white rounded-sm flex items-center justify-center text-xs font-bold">
            {user.username.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Scaled Down Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Surveys', val: stats.total_submissions, icon: '📊', color: 'text-blue-600' },
          { label: 'Avg. Rating', val: `${stats.overall_satisfaction} / 5.0`, icon: '⭐', color: 'text-emerald-600' },
          { label: 'Active Offices', val: stats.office_count, icon: '🏢', color: 'text-slate-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 border border-slate-200 rounded-sm shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className={`text-2xl font-bold text-slate-800`}>{loading ? '...' : stat.val}</h3>
            </div>
            <span className="text-2xl opacity-20">{stat.icon}</span>
          </div>
        ))}
      </div>

      {/* Formal Data Table */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Recent Submissions</h4>
          <button className="text-[10px] font-bold bg-slate-800 text-white px-4 py-2 rounded-sm hover:bg-slate-700 transition uppercase tracking-widest">
            Generate Report
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Client Name</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Department</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Service</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rating</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {submissions.length > 0 ? submissions.map((sub, index) => (
                <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-slate-700">{sub.full_name}</p>
                    <p className="text-[9px] text-slate-400 font-medium uppercase">{sub.client_type}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold text-slate-600 px-2 py-1 bg-slate-100 rounded-sm border border-slate-200 uppercase">
                      {sub.office_name}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[11px] text-slate-500 font-medium">
                    {sub.service_name}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">{sub.avg_score}</span>
                      <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${sub.avg_score >= 4 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                          style={{ width: `${(sub.avg_score / 5) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-[9px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-tighter">
                      View Logs
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                    {loading ? 'Accessing Database...' : 'No entries found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;