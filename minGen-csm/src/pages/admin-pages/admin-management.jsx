import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    UserPlus, Search, X, Eye, EyeOff, CheckCircle2,
    Terminal, UserX, UserCheck, Pencil, Trash2, Building2,
    AlertCircle, RefreshCw, AtSign, Copy
} from 'lucide-react';

const CheckMark = () => (
    <svg width="8" height="8" viewBox="0 0 14 14" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1.5,7 5.5,11 12.5,3" />
    </svg>
);

const PERMISSIONS = [
    {
        group: 'Survey Results',
        items: [
            { key: 'view_results', label: 'View Results' },
            { key: 'export_data',  label: 'Export Data'  },
        ],
    },
    {
        group: 'Analytics',
        items: [
            { key: 'view_analytics', label: 'View Analytics Dashboard' },
        ],
    },
    {
        group: 'ARTA Services',
        items: [
            { key: 'services_create', label: 'Add Service'    },
            { key: 'services_edit',   label: 'Edit Service'   },
            { key: 'services_delete', label: 'Delete Service' },
        ],
    },
    {
        group: 'Offices',
        items: [
            { key: 'offices_create', label: 'Add Office'    },
            { key: 'offices_edit',   label: 'Edit Office'   },
            { key: 'offices_delete', label: 'Delete Office' },
        ],
    },
    {
        group: 'Admin Management',
        items: [
            { key: 'admin_provision', label: 'Provision Users'     },
            { key: 'admin_edit',      label: 'Edit User Access'    },
            { key: 'admin_revoke',    label: 'Revoke / Restore'    },
        ],
    },
];

const BASE = 'http://localhost/MinGen%20CSM/minGen-api';
const API_DIR   = `${BASE}/survey/manage_employee_directory.php`;
const API_PROV  = `${BASE}/survey/manage_provisioned_users.php`;
const API_OFF   = `${BASE}/survey/manage_offices.php`;
const OPTS      = { withCredentials: true };

const getUid = () => JSON.parse(localStorage.getItem('user') || '{}')?.id || '';

// Sentinel that represents "all offices" — resolved to real IDs before the API call
const ALL_SENTINEL = { office_id: '__all__', office_name: 'All Offices / Departments', abbreviation: 'ALL' };

const OfficeChipSelector = ({ allOffices, selected, onChange }) => {
    const [query, setQuery] = useState('');
    const [open, setOpen]   = useState(false);
    const wrapRef           = useRef(null);

    const hasAll   = selected.some(s => s.office_id === '__all__');
    const filtered = hasAll ? [] : allOffices.filter(
        o => !selected.find(s => s.office_id === o.id) &&
             (o.name.toLowerCase().includes(query.toLowerCase()) ||
              (o.abbreviation || '').toLowerCase().includes(query.toLowerCase()))
    );

    const add    = (o)  => { onChange([...selected, { office_id: o.id, office_name: o.name, abbreviation: o.abbreviation }]); setQuery(''); setOpen(false); };
    const addAll = ()   => { onChange([ALL_SENTINEL]); setQuery(''); setOpen(false); };
    const remove = (id) => onChange(selected.filter(s => s.office_id !== id));

    useEffect(() => {
        const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={wrapRef} className="relative">
            <div
                className="min-h-[40px] flex flex-wrap gap-1.5 items-center px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-950/5 focus-within:border-slate-400 transition-all cursor-text"
                onClick={() => { if (!hasAll) setOpen(true); }}
            >
                {hasAll ? (
                    /* Single full-row ALL chip */
                    <span className="inline-flex items-center justify-between gap-2 w-full bg-indigo-600 text-white text-[9px] font-black uppercase tracking-tight px-3 py-1.5 rounded-md">
                        <span className="flex items-center gap-1.5">
                            <span className="text-indigo-200 text-[10px]">★</span>
                            All Offices / Departments
                        </span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); remove('__all__'); }} className="hover:text-indigo-200 transition-colors shrink-0">
                            <X size={10} strokeWidth={3} />
                        </button>
                    </span>
                ) : (
                    <>
                        {selected.map(s => (
                            <span key={s.office_id} className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-800 text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded">
                                {s.abbreviation || s.office_name}
                                <button type="button" onClick={(e) => { e.stopPropagation(); remove(s.office_id); }} className="hover:text-rose-500 transition-colors ml-0.5">
                                    <X size={9} strokeWidth={3} />
                                </button>
                            </span>
                        ))}
                        <input
                            className="flex-1 min-w-[120px] text-xs outline-none bg-transparent placeholder-slate-400 font-medium"
                            placeholder={selected.length === 0 ? "Search target routing office..." : "Add office scope..."}
                            value={query}
                            onChange={e => { setQuery(e.target.value); setOpen(true); }}
                            onFocus={() => setOpen(true)}
                        />
                    </>
                )}
            </div>

            {open && !hasAll && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    {/* ALL option — always first */}
                    <button
                        type="button"
                        onMouseDown={addAll}
                        className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors flex items-center gap-3 group border-b border-slate-100"
                    >
                        <span className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 text-white text-[8px] font-black">★</span>
                        <div>
                            <div className="text-xs font-black text-indigo-700 group-hover:text-indigo-900">All Offices / Departments</div>
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Grant access to every office</div>
                        </div>
                    </button>
                    {/* Individual offices */}
                    {filtered.slice(0, 8).map(o => (
                        <button key={o.id} type="button" onMouseDown={() => add(o)} className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex items-center gap-3 group">
                            <Building2 size={12} className="text-slate-400 group-hover:text-slate-900 transition-colors shrink-0" />
                            <div>
                                <div className="text-xs font-bold text-slate-800">{o.name}</div>
                                {o.abbreviation && <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{o.abbreviation}</div>}
                            </div>
                        </button>
                    ))}
                    {filtered.length === 0 && query.length > 0 && (
                        <p className="px-4 py-3 text-[9px] text-slate-400 font-bold text-center uppercase tracking-widest">No offices found</p>
                    )}
                </div>
            )}
        </div>
    );
};

const PermissionChecklist = ({ selected, onChange }) => {
    const toggle = (key) =>
        onChange(selected.includes(key) ? selected.filter(p => p !== key) : [...selected, key]);

    const toggleFullAccess = (group) => {
        const allKeys = group.items.map(i => i.key);
        const isFull  = allKeys.every(k => selected.includes(k));
        if (isFull) {
            // Deselect all items in this group
            onChange(selected.filter(p => !allKeys.includes(p)));
        } else {
            // Select all missing items in this group
            const toAdd = allKeys.filter(k => !selected.includes(k));
            onChange([...selected, ...toAdd]);
        }
    };

    return (
        <div className="space-y-4">
            {PERMISSIONS.map(group => {
                const allKeys    = group.items.map(i => i.key);
                const isFull     = allKeys.every(k => selected.includes(k));

                return (
                    <div key={group.group}>
                        {/* Group header row — label left, Full Access toggle right */}
                        <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">
                                {group.group}
                            </p>
                            <button
                                type="button"
                                onClick={() => toggleFullAccess(group)}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[7px] font-black uppercase tracking-wider transition-all ${
                                    isFull
                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-500'
                                }`}
                            >
                                {isFull && <CheckMark />}
                                Full Access
                            </button>
                        </div>

                        {/* Individual permission items */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {group.items.map(item => (
                                <label
                                    key={item.key}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                                        isFull
                                            ? 'bg-slate-900 border-slate-900 text-white opacity-60 cursor-not-allowed'
                                            : selected.includes(item.key)
                                                ? 'bg-slate-900 border-slate-900 text-white cursor-pointer'
                                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 cursor-pointer'
                                    }`}
                                >
                                    <div className={`w-3 h-3 rounded border flex items-center justify-center shrink-0 transition-all ${
                                        selected.includes(item.key) ? 'bg-white border-white text-slate-900' : 'border-slate-300'
                                    }`}>
                                        {selected.includes(item.key) && <CheckMark />}
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={selected.includes(item.key)}
                                        disabled={isFull}
                                        onChange={() => { if (!isFull) toggle(item.key); }}
                                    />
                                    <span className="text-[10px] font-black uppercase tracking-tight">{item.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const CredentialRow = ({ label, value, mono, highlight, secret }) => {
    const [copied, setCopied] = useState(false);
    const [show, setShow]     = useState(!secret);
    const copy = () => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); };
    return (
        <div className="space-y-0.5">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
            <div className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border ${highlight ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`text-[11px] truncate ${mono ? 'font-mono' : 'font-bold'} ${highlight ? 'text-white' : 'text-slate-700'}`}>
                    {secret && !show ? '••••••••••' : value}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                    {secret && (
                        <button type="button" onClick={() => setShow(s => !s)} className={`p-1 rounded transition-colors ${highlight ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}>
                            {show ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                    )}
                    <button type="button" onClick={copy} className={`p-1 rounded transition-colors ${highlight ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}>
                        {copied ? <CheckCircle2 size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

const Toast = ({ msg, type }) => {
    if (!msg) return null;
    return (
        <div className={`fixed bottom-6 right-6 z-[100] px-4 py-2.5 rounded-lg border text-[10px] font-black uppercase tracking-widest shadow-xl backdrop-blur-sm ${type === 'error' ? 'bg-rose-950 text-rose-100 border-rose-800' : 'bg-slate-900 text-white border-slate-800'}`}>
            {msg}
        </div>
    );
};

const AdminManagement = () => {
    const [allOffices, setAllOffices] = useState([]);
    const [loading, setLoading]       = useState(true);
    const [toast, setToast]           = useState(null);
    const [activeUsers, setActiveUsers] = useState([]);
    const [revokedUsers, setRevokedUsers] = useState([]);
    const [logs, setLogs]             = useState([]);
    const [dirStats, setDirStats]     = useState({ total: 0, last_import: null });

    const [addEmpName, setAddEmpName]         = useState('');
    const [addEmpLoading, setAddEmpLoading]   = useState(false);
    const [directoryList, setDirectoryList]   = useState([]);
    const [newEmpCredentials, setNewEmpCredentials] = useState(null); // { name, email, password, employee_id }
    const [viewCredsUser, setViewCredsUser]         = useState(null); // provisioned user whose creds to display
    const [copiedPacket, setCopiedPacket]           = useState(false);

    const copyCredPacket = ({ name, employee_id, dir_employee_id, email, password, raw_password }) => {
        const id   = employee_id || dir_employee_id || '—';
        const pass = password    || raw_password    || '—';
        const text =
`NPC Mindanao Generation — CSM System Credentials
==================================================
Name:        ${name || '—'}
Employee ID: ${id}
Email:       ${email || '—'}
Password:    ${pass}
==================================================`;
        navigator.clipboard.writeText(text);
        setCopiedPacket(true);
        setTimeout(() => setCopiedPacket(false), 2000);
    };

    const [provSearch, setProvSearch]         = useState('');
    const [provSearchResults, setProvSearchResults] = useState([]);
    const [provSearching, setProvSearching]         = useState(false);
    const [selectedEmp, setSelectedEmp]       = useState(null);
    const [provOffices, setProvOffices]       = useState([]);
    const [provPerms, setProvPerms]           = useState([]);

    const [activePage, setActivePage]     = useState(1);
    const ACTIVE_PAGE_SIZE                = 5;

    const [editModal, setEditModal]       = useState(null);
    const [editOffices, setEditOffices]   = useState([]);
    const [editPerms, setEditPerms]       = useState([]);
    const [editPassword, setEditPassword] = useState('');
    const [showEditPass, setShowEditPass] = useState(false);

    const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

    // Resolve __all__ sentinel → every real office ID before sending to backend
    const resolveOfficeIds = (selectedOffices) => {
        if (selectedOffices.some(o => o.office_id === '__all__')) {
            return allOffices.map(o => o.id);
        }
        return selectedOffices.map(o => o.office_id);
    };

    const fetchAll = async () => {
        try {
            const [statsRes, offRes, usersRes, logsRes, dirListRes] = await Promise.all([
                axios.get(`${API_DIR}?user_id=${getUid()}`, OPTS),
                axios.get(`${API_OFF}?user_id=${getUid()}`, OPTS),
                axios.get(`${API_PROV}?user_id=${getUid()}`, OPTS),
                axios.get(`${API_PROV}?user_id=${getUid()}&action=logs`, OPTS),
                axios.get(`${API_DIR}?user_id=${getUid()}&action=list`, OPTS)
            ]);
            if (statsRes.data.status === 'success') setDirStats({ total: statsRes.data.total, last_import: statsRes.data.last_import });
            if (offRes.data.status === 'success') {
                // manage_offices.php LEFT JOINs with users — an office with multiple linked users
                // appears more than once. Deduplicate by id before storing, so resolveOfficeIds(ALL)
                // never sends duplicate IDs that violate user_offices PRIMARY KEY (user_id, office_id).
                const seen = new Set();
                const uniqueOffices = offRes.data.data.filter(o => {
                    if (seen.has(o.id)) return false;
                    seen.add(o.id);
                    return true;
                });
                setAllOffices(uniqueOffices);
            }
            if (logsRes.data.status    === 'success') setLogs(logsRes.data.data || []);
            if (usersRes.data.status   === 'success') {
                setActiveUsers(usersRes.data.data.filter(u => u.is_active == 1));
                setRevokedUsers(usersRes.data.data.filter(u => u.is_active == 0));
            }
            if (dirListRes.data.status === 'success') setDirectoryList(dirListRes.data.data || []);
        } catch (err) { showToast('Network sync error fetching data components.', 'error'); } finally { setLoading(false); }
    };

    useEffect(() => { 
        fetchAll();
        const interval = setInterval(() => {
            axios.get(`${API_PROV}?user_id=${getUid()}&action=logs`, OPTS)
                 .then(res => { if (res.data?.status === 'success') setLogs(res.data.data || []); })
                 .catch(() => {}); // silent — don't crash if log poll fails
        }, 6000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => { setActivePage(1); }, [activeUsers]);

    useEffect(() => {
        if (provSearch.length < 2) { setProvSearchResults([]); return; }
        const timer = setTimeout(async () => {
            setProvSearching(true);
            try {
                const res = await axios.get(`${API_DIR}?user_id=${getUid()}&search=${encodeURIComponent(provSearch)}`, OPTS);
                if (res.data.status === 'success') setProvSearchResults(res.data.data);
            } catch { } finally { setProvSearching(false); }
        }, 300);
        return () => clearTimeout(timer);
    }, [provSearch]);

    // Generate NPC email from full name
    // "Norvin Dennis M. Angeles" → ndmangeles@napocor.gov.ph
    // "Norvin M. Angeles"        → nmangeles@napocor.gov.ph
    const generateEmail = (fullName) => {
        const parts = fullName.trim().split(/\s+/).filter(Boolean);
        if (parts.length < 2) return '';
        const firstInitial  = parts[0][0].toLowerCase();
        const lastName      = parts[parts.length - 1].replace(/[^a-zA-Z]/g, '').toLowerCase();
        if (!lastName) return '';
        const middleParts   = parts.slice(1, -1);
        const middleInitials = middleParts.map(p => p[0].toLowerCase()).join('');
        return `${firstInitial}${middleInitials}${lastName}@napocor.gov.ph`;
    };

    const handleAddEmployee = async (e) => {
        e.preventDefault();
        if (!addEmpName.trim()) return;
        setAddEmpLoading(true);
        try {
            const res = await axios.post(`${API_DIR}?user_id=${getUid()}`, { name: addEmpName.trim() }, OPTS);
            if (res.data.status === 'success') {
                setNewEmpCredentials(res.data.data);
                setAddEmpName('');
                fetchAll();
            } else {
                showToast(res.data.message, 'error');
            }
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to add employee.', 'error');
        } finally {
            setAddEmpLoading(false);
        }
    };

    const handleProvision = async (e) => {
        e.preventDefault();
        if (!selectedEmp) return;
        if (provOffices.length === 0) { showToast('Please select at least one tracking office scope.', 'error'); return; }
        try {
            const res = await axios.post(`${API_PROV}?user_id=${getUid()}`, { employee_dir_id: selectedEmp.id, office_ids: resolveOfficeIds(provOffices), permissions: provPerms }, OPTS);
            if (res.data.status === 'success') {
                showToast(`Token access active for ${selectedEmp.name}`);
                setSelectedEmp(null); setProvOffices([]); setProvPerms([]); setProvSearch('');
                fetchAll();
            } else { showToast(res.data.message, 'error'); }
        } catch (err) { showToast(err.response?.data?.message || 'Token generation failure.', 'error'); }
    };

    const handleToggleAccess = async (user, newStatus) => {
        try {
            await axios.patch(`${API_PROV}?user_id=${getUid()}`, { user_id: user.id, is_active: newStatus }, OPTS);
            showToast('Account tracking status shifted.');
            fetchAll();
        } catch { showToast('Operation processing failed.', 'error'); }
    };

    const handleDeleteUser = async (user) => {
        if (!confirm(`Permanently terminate and delete encryption keys for ${user.name}?`)) return;
        try {
            await axios.delete(`${API_PROV}?user_id=${getUid()}&id=${user.id}`, OPTS);
            showToast('Account tracking nodes cleared.');
            fetchAll();
        } catch { showToast('De-provision handling error.', 'error'); }
    };

    const openEditModal = (user) => {
        setEditModal(user);
        setEditOffices(user.offices.map(o => ({ office_id: o.office_id, office_name: o.office_name, abbreviation: o.abbreviation })));
        setEditPerms(user.permissions || []); setEditPassword(''); setShowEditPass(false);
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        const resolvedIds = resolveOfficeIds(editOffices);
        if (resolvedIds.length === 0) {
            showToast('At least one office must be assigned.', 'error');
            return;
        }
        try {
            const res = await axios.put(
                `${API_PROV}?user_id=${getUid()}`,
                { user_id: editModal.id, office_ids: resolvedIds, permissions: editPerms, password: editPassword || undefined },
                OPTS
            );
            if (res.data.status === 'success') {
                showToast('Security parameters adjusted.');
                setEditModal(null);
                await fetchAll(); // await so table reflects changes before user sees it
            } else {
                showToast(res.data.message || 'Update failed.', 'error');
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Network error';
            showToast(`Save failed: ${msg}`, 'error');
            console.error('[handleSaveEdit]', err.response?.data || err);
        }
    };

    return (
        <div className="bg-[#f8fafc] min-h-screen font-sans text-slate-900 flex flex-col selection:bg-slate-900 selection:text-white">
            {toast && <Toast msg={toast.msg} type={toast.type} />}

            <header className="flex items-center justify-between pb-4 border-b border-slate-200 px-8 pt-5 bg-white shadow-xs">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[7px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded tracking-widest uppercase">RBAC ENGINE 2.0</span>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.25em]">Directory Token Mapping Console</p>
                    </div>
                    <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Identity Provisioning Dashboard</h1>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-5 text-left">
                        <div>
                            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Active System Nodes</p>
                            <p className="text-xs font-black text-slate-800 mt-0.5">{activeUsers.length} Operational</p>
                        </div>
                        <div className="h-6 w-px bg-slate-200" />
                        <div>
                            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Simulated Directory Pool</p>
                            <p className="text-xs font-black text-indigo-600 mt-0.5">{dirStats.total} Records</p>
                        </div>
                    </div>

                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 px-8 py-6 items-start flex-grow">
                
                {/* LEFT SYSTEM RUNTIME UTILITIES COLUMN */}
                <div className="xl:col-span-4 space-y-6">

                    {/* ADD EMPLOYEE FORM */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                        <div>
                            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Employee Directory</h4>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Add Personnel Record</h3>
                        </div>
                        <form onSubmit={handleAddEmployee} className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Full Name</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 bg-slate-50 focus:bg-white transition-all placeholder-slate-300"
                                    placeholder="e.g. Norvin Dennis M. Angeles"
                                    value={addEmpName}
                                    onChange={e => setAddEmpName(e.target.value)}
                                    required
                                />
                            </div>
                            {generateEmail(addEmpName) && (
                                <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 animate-in fade-in duration-150">
                                    <AtSign size={11} className="text-indigo-400 shrink-0" />
                                    <p className="text-[11px] font-mono font-bold text-indigo-600 truncate">{generateEmail(addEmpName)}</p>
                                </div>
                            )}
                            <button
                                type="submit"
                                disabled={addEmpLoading || !generateEmail(addEmpName)}
                                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                            >
                                <UserPlus size={12} />
                                {addEmpLoading ? 'Adding...' : 'Add to Directory'}
                            </button>
                        </form>
                    </div>

                    {/* SEARCH DIRECTORY CONTEXT */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                        <div className="px-5 pt-4 pb-3 space-y-1 border-b border-slate-100">
                            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vector Gateway Selection</h4>
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Search Directory Context</h3>
                                <span className="text-[8px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{directoryList.length} records</span>
                            </div>
                        </div>

                        {/* Selected employee chip */}
                        {selectedEmp && (
                            <div className="px-4 pt-3">
                                <div className="flex items-center justify-between bg-slate-900 text-white rounded-xl px-4 py-3 border border-slate-950 shadow-inner">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-xs font-black uppercase tracking-tight text-white">{selectedEmp.name}</p>
                                            {selectedEmp.is_provisioned == 1 && (
                                                <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30 shrink-0">Active</span>
                                            )}
                                        </div>
                                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">{selectedEmp.email}</p>
                                    </div>
                                    <button onClick={() => setSelectedEmp(null)} className="text-slate-400 hover:text-white transition-colors p-1.5 bg-slate-800 rounded-lg shrink-0"><X size={12} /></button>
                                </div>
                            </div>
                        )}

                        {/* Search input */}
                        <div className="px-4 pt-3 pb-2 relative">
                            <Search size={13} className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-medium w-full focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 bg-slate-50 focus:bg-white transition-all"
                                placeholder="Filter by name or email..."
                                value={provSearch}
                                onChange={e => setProvSearch(e.target.value)}
                            />
                            {provSearching && <div className="absolute right-7 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />}
                        </div>

                        {/* Full directory list — filtered by search if active */}
                        {(() => {
                            const term = provSearch.toLowerCase();
                            const visible = term.length > 0
                                ? directoryList.filter(e => e.name.toLowerCase().includes(term) || e.email.toLowerCase().includes(term))
                                : directoryList;
                            return (
                                <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                                    {visible.length === 0 && (
                                        <p className="px-5 py-6 text-center text-[9px] text-slate-300 font-black uppercase tracking-widest">No employees found</p>
                                    )}
                                    {visible.map(emp => {
                                        const alreadyActive = emp.is_provisioned == 1;
                                        const isSelected    = selectedEmp?.id === emp.id;
                                        return (
                                            <button
                                                key={emp.id}
                                                type="button"
                                                disabled={alreadyActive}
                                                onClick={() => { if (!alreadyActive) { setSelectedEmp(emp); setProvSearch(''); } }}
                                                className={`w-full text-left px-5 py-2.5 flex items-center justify-between group transition-colors ${
                                                    isSelected    ? 'bg-indigo-50' :
                                                    alreadyActive ? 'cursor-not-allowed bg-slate-50/60 opacity-70' :
                                                    'hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className="min-w-0">
                                                    <p className={`text-[11px] font-bold truncate transition-colors ${isSelected ? 'text-indigo-700' : alreadyActive ? 'text-slate-400' : 'text-slate-800 group-hover:text-indigo-600'}`}>{emp.name}</p>
                                                    <p className="text-[9px] text-slate-400 font-mono truncate">{emp.email}</p>
                                                </div>
                                                {alreadyActive
                                                    ? <span className="shrink-0 text-[7px] font-black uppercase px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200">Active</span>
                                                    : isSelected
                                                        ? <span className="shrink-0 text-[7px] font-black uppercase px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded-full border border-indigo-200">Selected</span>
                                                        : <span className="shrink-0 text-[8px] font-black uppercase text-slate-200 group-hover:text-indigo-400 tracking-wider">Select //</span>
                                                }
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>

                    {/* LIVE AUDIT NETWORK TERMINAL STREAM */}
                    <div className="bg-slate-900 border border-slate-950 rounded-2xl shadow-md overflow-hidden flex flex-col h-80">
                        <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Terminal size={12} className="text-indigo-400" />
                                <h4 className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-200">System Capability Stream</h4>
                            </div>
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                        <div className="p-4 font-mono text-[9px] space-y-2.5 overflow-y-auto flex-grow text-slate-400">
                            {logs.length === 0 && <p className="text-slate-600 italic text-center pt-4">No security logs recorded in the streaming context window.</p>}
                            {logs.map(log => (
                                <div key={log.id} className="pb-2 border-b border-white/[0.02] last:border-0 leading-relaxed">
                                    <div className="flex items-center justify-between text-[8px] text-slate-500 mb-0.5">
                                        <span className="font-bold text-slate-400">{log.username}</span>
                                        <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                                    </div>
                                    <p className="text-slate-200 font-medium"><span className="text-indigo-400 font-black mr-1 uppercase">[{log.action_type}]</span> {log.action_details}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: ASSIGNMENT INTERFACE & OPERATIONAL REGISTRIES */}
                <div className="xl:col-span-8 space-y-6">
                    
                    {selectedEmp && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div>
                                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Vector Parameters Assignment Stage</h4>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Configure Active Credentials</h3>
                            </div>

                            {selectedEmp.is_provisioned == 1 ? (
                                <div className="flex items-start gap-3 px-4 py-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[11px] font-black text-emerald-800 uppercase tracking-tight">{selectedEmp.name} already has system access.</p>
                                        <p className="text-[10px] text-emerald-600 mt-0.5">This account is active in the provisioned users list. To modify access, use the edit button in the Active Access Channels table below.</p>
                                    </div>
                                </div>
                            ) : (
                            <form onSubmit={handleProvision} className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Functional Scope Channels (Offices)</label>
                                    <OfficeChipSelector allOffices={allOffices} selected={provOffices} onChange={setProvOffices} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Feature Capability Authorization Vectors (Permissions)</label>
                                    <PermissionChecklist selected={provPerms} onChange={setProvPerms} />
                                </div>
                                <div className="flex gap-2 pt-2 border-t border-slate-100">
                                    <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">
                                        Generate Active Verification Token
                                    </button>
                                    <button type="button" onClick={() => setSelectedEmp(null)} className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all">
                                        Cancel
                                    </button>
                                </div>
                            </form>
                            )}
                        </div>
                    )}

                    {/* DATA REPOSITORIES (ACTIVE / REVOKED ACCOUNTS WINDOWS) */}
                    {['Active Access Channels', 'Revoked Context Nodes'].map((title, idx) => {
                        const targetActive = idx === 0;
                        const fullList     = targetActive ? activeUsers : revokedUsers;
                        const totalPages   = targetActive ? Math.max(1, Math.ceil(fullList.length / ACTIVE_PAGE_SIZE)) : 1;
                        const userList     = targetActive
                            ? fullList.slice((activePage - 1) * ACTIVE_PAGE_SIZE, activePage * ACTIVE_PAGE_SIZE)
                            : fullList;
                        return (
                            <div key={title} className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                                <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">{title}</h3>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{targetActive ? 'Active permission matrices inside system' : 'Terminated structural keys'}</p>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold ${targetActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                        {fullList.length} Nodes
                                    </span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-left">
                                        <thead>
                                            <tr className="bg-slate-50/20 text-[8px] uppercase font-black text-slate-400 border-b border-slate-100 select-none">
                                                <th className="px-6 py-3">Security Target</th>
                                                <th className="px-6 py-3">Office Boundary Scope</th>
                                                <th className="px-6 py-3">Assigned Capability Matrix</th>
                                                <th className="px-6 py-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-[11px]">
                                            {userList.length === 0 && (
                                                <tr><td colSpan={4} className="px-6 py-10 text-center text-[9px] text-slate-300 font-black uppercase tracking-widest">No active system user links match this parameter state.</td></tr>
                                            )}
                                            {userList.map(user => (
                                                <tr key={user.id} className="hover:bg-slate-50/30 transition-colors group">
                                                    <td className="px-6 py-3.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="min-w-0">
                                                                <p className="font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{user.name}</p>
                                                                <p className="text-[8px] text-slate-400 font-mono mt-0.5">{user.email}</p>
                                                                <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">{user.position} &middot; <span className="text-slate-500">{user.department}</span></p>
                                                            </div>
                                                            <button
                                                                onClick={() => setViewCredsUser(user)}
                                                                className="shrink-0 p-1.5 rounded-md border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all"
                                                                title="View credentials"
                                                            >
                                                                <Eye size={11} strokeWidth={2.5} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3.5 max-w-[180px]">
                                                        <div className="flex flex-wrap gap-1">
                                                            {user.offices?.length > 0 ? user.offices.map(o => (
                                                                <span key={o.office_id} className="bg-white border border-slate-200 text-slate-700 text-[8px] font-black uppercase tracking-tight px-1.5 py-0.5 rounded">
                                                                    {o.abbreviation || o.office_name}
                                                                </span>
                                                            )) : <span className="text-slate-300 font-mono text-[10px]">—</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3.5 max-w-[200px]">
                                                        <div className="flex flex-wrap gap-1">
                                                            {user.permissions?.length > 0 ? user.permissions.map(p => (
                                                                <span key={p} className="bg-slate-900 text-white text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded">
                                                                    {p.replace(/_/g, ' ')}
                                                                </span>
                                                            )) : <span className="text-[8px] font-black uppercase text-slate-300">Global Trainee</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3.5 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button onClick={() => openEditModal(user)} className="p-1.5 rounded-md border border-slate-200 hover:border-slate-900 hover:bg-slate-50 text-slate-400 hover:text-slate-900 transition-all" title="Override Configuration Overlays">
                                                                <Pencil size={11} strokeWidth={2.5} />
                                                            </button>
                                                            <button onClick={() => handleToggleAccess(user, targetActive ? 0 : 1)}
                                                                className={`text-[8px] font-black px-2 py-1 rounded-md border transition-all ${targetActive ? 'border-slate-200 text-slate-500 hover:border-rose-500 hover:text-rose-600 hover:bg-rose-50' : 'border-emerald-500 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}>
                                                                {targetActive ? 'REVOKE' : 'RESTORE'}
                                                            </button>
                                                            {!targetActive && (
                                                                <button onClick={() => handleDeleteUser(user)} className="p-1.5 rounded-md border border-transparent hover:border-rose-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all" title="Wipe Record Context">
                                                                    <Trash2 size={11} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination — active panel only */}
                                {targetActive && totalPages > 1 && (
                                    <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/40">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                            Page {activePage} of {totalPages} · {fullList.length} total
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setActivePage(p => Math.max(1, p - 1))}
                                                disabled={activePage === 1}
                                                className="px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:border-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                            >
                                                ← Prev
                                            </button>
                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                                <button
                                                    key={p}
                                                    onClick={() => setActivePage(p)}
                                                    className={`w-7 h-7 text-[9px] font-black rounded-lg border transition-all ${
                                                        p === activePage
                                                            ? 'bg-slate-900 text-white border-slate-900'
                                                            : 'border-slate-200 text-slate-500 hover:bg-white hover:border-slate-400'
                                                    }`}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => setActivePage(p => Math.min(totalPages, p + 1))}
                                                disabled={activePage === totalPages}
                                                className="px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:border-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                            >
                                                Next →
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* VIEW EXISTING CREDENTIALS MODAL */}
            {viewCredsUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 px-6 py-4 bg-slate-50 border-b border-slate-200">
                            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                                <Eye size={16} className="text-slate-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-tight">Credentials</h3>
                                <p className="text-[9px] text-slate-500 font-medium mt-0.5 truncate">{viewCredsUser.name}</p>
                            </div>
                            <button onClick={() => setViewCredsUser(null)} className="p-1 hover:bg-slate-200 rounded-lg transition-colors shrink-0">
                                <X size={14} className="text-slate-500" />
                            </button>
                        </div>
                        <div className="px-6 py-5 space-y-3">
                            {viewCredsUser.dir_employee_id && (
                                <CredentialRow label="Employee ID" value={viewCredsUser.dir_employee_id} mono />
                            )}
                            <CredentialRow label="Email / Username" value={viewCredsUser.email} mono highlight />
                            <CredentialRow label="Password" value={viewCredsUser.raw_password || '—'} mono highlight secret />
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-2">
                            <button
                                onClick={() => copyCredPacket(viewCredsUser)}
                                className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all active:scale-95"
                            >
                                {copiedPacket ? <CheckCircle2 size={11} className="text-emerald-500" /> : <Copy size={11} />}
                                {copiedPacket ? 'Copied!' : 'Copy Packet'}
                            </button>
                            <button onClick={() => setViewCredsUser(null)} className="px-5 py-2 text-[10px] font-black uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all active:scale-95">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* NEW EMPLOYEE CREDENTIALS MODAL */}
            {newEmpCredentials && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 px-6 py-4 bg-emerald-50 border-b border-emerald-100">
                            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                <CheckCircle2 size={18} className="text-emerald-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-[13px] font-black text-emerald-800 uppercase tracking-tight">Employee Added</h3>
                                <p className="text-[9px] text-emerald-600 font-medium mt-0.5 truncate">{newEmpCredentials.name}</p>
                            </div>
                            <button onClick={() => setNewEmpCredentials(null)} className="p-1 hover:bg-emerald-100 rounded-lg transition-colors shrink-0">
                                <X size={14} className="text-emerald-500" />
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-3">
                            <CredentialRow label="Employee ID" value={newEmpCredentials.employee_id} mono />
                            <CredentialRow label="Email / Username" value={newEmpCredentials.email} mono highlight />
                            <CredentialRow label="Password" value={newEmpCredentials.password} mono highlight secret />
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-2">
                            <button
                                onClick={() => copyCredPacket(newEmpCredentials)}
                                className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all active:scale-95"
                            >
                                {copiedPacket ? <CheckCircle2 size={11} className="text-emerald-500" /> : <Copy size={11} />}
                                {copiedPacket ? 'Copied!' : 'Copy Packet'}
                            </button>
                            <button
                                onClick={() => setNewEmpCredentials(null)}
                                className="px-5 py-2 text-[10px] font-black uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all active:scale-95"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PARAMETER CONFIGURATION RE-MAP OVERLAY MODAL */}
            {editModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-in fade-in duration-100">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                            <div>
                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Parameter Override Workspace</p>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{editModal.name}</h3>
                                <p className="text-[9px] text-slate-400 font-mono mt-0.5">{editModal.email}</p>
                            </div>
                            <button onClick={() => setEditModal(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors"><X size={14} /></button>
                        </div>
                        <form onSubmit={handleSaveEdit} className="p-5 space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Scope Office Overrides</label>
                                <OfficeChipSelector allOffices={allOffices} selected={editOffices} onChange={setEditOffices} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Capability Vectors Mapping</label>
                                <PermissionChecklist selected={editPerms} onChange={setEditPerms} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Override Security Key <span className="font-bold text-slate-400 lowercase">(leave blank to keep current)</span></label>
                                <div className="relative max-w-xs">
                                    <input type={showEditPass ? 'text' : 'password'} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-slate-400 bg-slate-50 focus:bg-white transition-all pr-8" placeholder="Type password override string..." value={editPassword} onChange={e => setEditPassword(e.target.value)} />
                                    <button type="button" onClick={() => setShowEditPass(!showEditPass)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        {showEditPass ? <EyeOff size={12} /> : <Eye size={12} />}
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2 border-t border-slate-100">
                                <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">
                                    Commit Customizations
                                </button>
                                <button type="button" onClick={() => setEditModal(null)} className="px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all">
                                    Abort
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminManagement;