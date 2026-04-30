import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    ShieldCheck, UserPlus, Table as TableIcon, History, UserX,
    UserCheck, Copy, CheckCircle2, Lock, Key, Terminal, Eye, EyeOff
} from 'lucide-react';

const AdminManagement = () => {
    const [accounts, setAccounts] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({ username: '', admin_note: '' });

    // Logic states
    const [justCreated, setJustCreated] = useState(null);
    const [copiedId, setCopiedId] = useState(null);
    const [visiblePassId, setVisiblePassId] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const API = 'http://localhost/MinGen%20CSM/minGen-api/survey/manage_admins.php';
    const getUid = () => JSON.parse(localStorage.getItem('user') || '{}')?.id || '';

    const fetchData = async () => {
        try {
            const res = await axios.get(`${API}?user_id=${getUid()}`, { withCredentials: true });
            if (res.data.status === 'success') {
                setAccounts(res.data.accounts);
                setLogs(res.data.logs);
            }
        } catch (err) {
            console.error("Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API}?user_id=${getUid()}`, formData, { withCredentials: true });
            if (res.data.status === 'success') {
                setJustCreated({
                    username: formData.username,
                    password: res.data.generated_password
                });
                setFormData({ username: '', admin_note: '' });
                fetchData();
            }
        } catch (err) {
            alert("Provisioning failed.");
        }
    };

    const copyToClipboard = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const toggleStatus = async (id, currentStatus) => {
        try {
            const res = await axios.patch(`${API}?user_id=${getUid()}`,
                { id, status: currentStatus === 1 ? 0 : 1 }, { withCredentials: true });
            if (res.data.status === 'success') fetchData();
        } catch (err) {
            alert("Access modification failed.");
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 font-sans">
            <div className="flex flex-col items-center gap-3">
                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Initializing Security Protocol</p>
            </div>
        </div>
    );

    return (
        <div className="bg-[#f8fafc] min-h-screen font-sans text-slate-900 flex flex-col">
            {/* PAGE HEADER */}
            <header className="flex items-center gap-6 pb-3 border-b border-[#E2E8F0] px-8 pt-0">
                <div className="shrink-0">
                    <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-[0.4em] leading-none mb-1">Page</p>
                    <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Admin Accounts</h1>
                </div>
                <div className="ml-auto flex items-center gap-4 shrink-0">
                    <div className="text-right">
                        <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-[0.3em] leading-none mb-0.5">System Integrity</p>
                        <p className="text-[11px] font-black text-emerald-600 uppercase tracking-tight leading-none flex items-center gap-1 justify-end"><CheckCircle2 size={10} /> Verified</p>
                    </div>
                    <div className="h-9 w-9 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-black italic">06</div>
                </div>
            </header>

            <div className="grid grid-cols-12 flex-grow overflow-hidden">
                {/* LEFT SIDEBAR: PROVISIONING */}
                <div className="col-span-12 lg:col-span-3 border-r border-slate-200 p-6 bg-white/50 backdrop-blur-sm overflow-y-auto">
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-1">
                            <UserPlus size={14} className="text-indigo-500" />
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Provisioning</h2>
                        </div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Create Admin</h3>
                    </div>

                    <form onSubmit={handleCreateAdmin} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-tight ml-1">Username</label>
                            <input
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                placeholder="Full name or ID..."
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-tight ml-1">Assignment Note</label>
                            <textarea
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium h-24 resize-none outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                placeholder="Reason for access..."
                                value={formData.admin_note}
                                onChange={(e) => setFormData({ ...formData, admin_note: e.target.value })}
                                required
                            />
                        </div>
                        <button className="w-full bg-slate-900 hover:bg-indigo-600 text-white py-3.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-slate-200">
                            Generate Access
                        </button>
                    </form>

                    {justCreated && (
                        <div className="mt-8 border border-amber-200 bg-amber-50/50 p-5 rounded-xl animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-2 mb-3">
                                <Key size={14} className="text-amber-600" />
                                <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Action Required</span>
                            </div>
                            <div className="text-[10px] font-bold text-slate-500 mb-1">User: {justCreated.username}</div>
                            <div className="bg-white border border-amber-200 px-3 py-2 rounded-lg font-mono text-xs font-bold text-slate-800 mb-3 flex justify-between items-center group">
                                {justCreated.password}
                                <button
                                    onClick={() => copyToClipboard(justCreated.password, 'just')}
                                    className={`p-1.5 rounded transition-all ${copiedId === 'just' ? 'bg-emerald-500 text-white' : 'hover:bg-slate-100 text-slate-400'}`}
                                >
                                    {copiedId === 'just' ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                                </button>
                            </div>
                            <p className="text-[8px] text-amber-800/60 leading-relaxed font-bold uppercase italic">* Password is hidden in table for security. Record this now.</p>
                        </div>
                    )}
                </div>

                {/* RIGHT AREA: TABLE & LOGS */}
                <div className="col-span-12 lg:col-span-9 flex flex-col bg-white overflow-hidden">
                    <div className="p-8 flex-grow overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <TableIcon size={16} className="text-slate-400" />
                                <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Administrative Directory</h2>
                            </div>
                        </div>

                        <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 text-[10px] uppercase font-black text-slate-400 border-b border-slate-100">
                                        <th className="px-6 py-4 text-left">Identity</th>
                                        <th className="px-6 py-4 text-left">Internal Assignment</th>
                                        <th className="px-6 py-4 text-left">Credentials</th>
                                        <th className="px-6 py-4 text-left">Status</th>
                                        <th className="px-6 py-4 text-right">Operations</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {accounts.map(acc => (
                                        <tr key={acc.id} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-black text-slate-800 text-xs uppercase tracking-tight">{acc.username}</div>
                                                <div className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter">{acc.role}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-[11px] text-slate-500 italic max-w-[200px] truncate leading-tight">
                                                    {acc.admin_note || "N/A"}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="bg-slate-100 px-2 py-1 rounded border border-slate-200 flex items-center justify-between min-w-[100px]">
                                                        <span className="font-mono text-[10px] font-bold text-slate-600">
                                                            {visiblePassId === acc.id ? (acc.raw_password || "********") : "••••••••"}
                                                        </span>
                                                        <button
                                                            onClick={() => setVisiblePassId(visiblePassId === acc.id ? null : acc.id)}
                                                            className="ml-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                                        >
                                                            {visiblePassId === acc.id ? <EyeOff size={11} /> : <Eye size={11} />}
                                                        </button>
                                                    </div>
                                                    <button
                                                        onClick={() => copyToClipboard(acc.raw_password, acc.id)}
                                                        className={`p-1.5 rounded transition-all ${copiedId === acc.id ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:bg-white hover:shadow-sm'}`}
                                                    >
                                                        {copiedId === acc.id ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border ${acc.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-rose-200 bg-rose-50 text-rose-600'}`}>
                                                    {acc.is_active ? 'Authorized' : 'Suspended'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {acc.role !== 'super_admin' && (
                                                    <button
                                                        onClick={() => toggleStatus(acc.id, acc.is_active)}
                                                        className={`text-[9px] font-black px-3 py-1.5 rounded border transition-all ${acc.is_active
                                                            ? 'border-slate-200 text-slate-400 hover:border-rose-500 hover:text-rose-600 hover:bg-rose-50'
                                                            : 'border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white shadow-sm'
                                                            }`}
                                                    >
                                                        {acc.is_active ? 'REVOKE' : 'RESTORE'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* TERMINAL FOOTER: AUDIT LOGS */}
                    <div className="bg-[#0f172a] text-slate-400 border-t border-slate-800">
                        <div className="px-8 py-3 flex items-center justify-between border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <Terminal size={14} className="text-indigo-400" />
                                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-200">System Activity Stream</h2>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Secure Log-link Active</span>
                            </div>
                        </div>
                        <div className="h-56 overflow-y-auto font-mono scrollbar-hide">
                            <table className="w-full text-[10px] border-collapse">
                                <thead className="sticky top-0 bg-[#0f172a] z-10">
                                    <tr className="text-slate-500 border-b border-white/5 text-left">
                                        <th className="px-8 py-3 font-medium">TIMESTAMP</th>
                                        <th className="px-8 py-3 font-medium">IDENTITY</th>
                                        <th className="px-8 py-3 font-medium">EVENT_CLASS</th>
                                        <th className="px-8 py-3 font-medium">RESOURCES</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.02]">
                                    {logs.map(log => (
                                        <tr key={log.id} className="hover:bg-white/[0.03] transition-colors group">
                                            <td className="px-8 py-2.5 opacity-40 font-light tracking-tighter">
                                                {new Date(log.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-8 py-2.5 font-bold text-slate-300 group-hover:text-indigo-400 transition-colors">
                                                {log.username}
                                            </td>
                                            <td className="px-8 py-2.5">
                                                <span className={`px-2 py-0.5 rounded-sm text-[9px] font-black ${log.action_type === 'LOGIN' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                                                    {log.action_type}
                                                </span>
                                            </td>
                                            <td className="px-8 py-2.5 italic text-slate-500 truncate max-w-sm">
                                                {log.action_details}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminManagement;