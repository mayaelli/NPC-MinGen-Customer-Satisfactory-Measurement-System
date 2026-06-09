/**
 * admin-pages.jsx — Admin Portal Shell
 *
 * This is the single most important file in the admin side of the app.
 * It acts as the layout host and navigation controller for ALL admin modules.
 *
 * Key responsibilities:
 *   1. Session validation — calls refresh_session.php on every mount to verify
 *      the PHP session is still alive and re-sync permissions for provisioned users
 *   2. Tab routing — manages `activeTab` state and renders the correct module
 *      via renderContent(). To add a new admin module: add a case here and a
 *      nav item in the sidebar array below.
 *   3. Data preloading — fetches surveys and offices once on mount and passes
 *      them as props to child modules that need them (Dashboard, Reports)
 *   4. Permission guards — derives canAccess* booleans from the user object
 *      to show/hide nav items and block unauthorized tab access
 *
 * IMPORTANT: The sidebar nav array and renderContent() switch must always be
 * kept in sync. If you add a tab to one, add it to the other.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, ClipboardList, MessageSquare, ShieldCheck, UserCog, Menu, X, KeyRound } from 'lucide-react';
import AdminDashboard from './admin-dashboard';
import OfficeManagement from './office-management';
import ArtaServices from './arta-services';
import SurveyResults from './survey-results';
import { ReportsPage } from './reports-page';
import AdminManagement from './admin-management';
import ChangePassword from './change-password';

const AdminPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchOfficeData = async () => {
    try {
      const savedUser = localStorage.getItem('user');
      const uid = savedUser ? JSON.parse(savedUser)?.id : '';
      const response = await fetch(`http://localhost/MinGen%20CSM/minGen-api/survey/manage_offices.php?user_id=${uid}`);
      const result = await response.json();
      if (result.status === "success") {
        setOffices(result.data);
      }
    } catch (error) {
      console.error("Office Fetch Error:", error);
    }
  };

  const REFRESH_URL = 'http://localhost/MinGen%20CSM/minGen-api/auth/refresh_session.php';

  const forceLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) { navigate('/login'); return; }

    const parsed = JSON.parse(savedUser);

    // ── Client-side pre-check ───────────────────────────────────────────────
    // If we stored an expiry timestamp and it has already passed, log out
    // immediately without waiting for a network round-trip.
    if (parsed.expires_at && Date.now() > parsed.expires_at) {
      forceLogout();
      return;
    }

    setUser(parsed);

    // ── Server-side session validation ─────────────────────────────────────
    // Called for every user on every mount:
    //   • Enforces the 8-hour idle timeout (server destroys session if stale)
    //   • Renews the idle timer on the server
    //   • Refreshes permissions/offices for provisioned users without re-login
    //   • Returns a fresh expires_at so the client-side pre-check stays accurate
    fetch(`${REFRESH_URL}?user_id=${parsed.id || ''}`, { credentials: 'include' })
      .then(r => r.json())
      .then(res => {
        if (res.status === 'expired' || res.status === 'error') {
          // Server says the session is gone — force logout
          forceLogout();
          return;
        }
        if (res.status === 'success') {
          // Merge updated user data + fresh expiry back into localStorage
          const updated = { ...res.user, expires_at: res.expires_at };
          localStorage.setItem('user', JSON.stringify(updated));
          setUser(updated);
        }
      })
      .catch(() => {
        // Network error — keep the cached user but don't extend expiry
      });

    fetchSurveyData();
    fetchOfficeData();
  }, [navigate]);

  const fetchSurveyData = async () => {
    try {
      setLoading(true);
      const savedUser = localStorage.getItem('user');
      const uid = savedUser ? JSON.parse(savedUser)?.id : '';
      const response = await fetch(`http://localhost/MinGen%20CSM/minGen-api/survey/get_survey_results.php?user_id=${uid}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (result.status === "success") {
        setSurveys(result.data);
      }
    } catch (error) {
      console.error("Connection Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const IconMap = {
    overview: LayoutDashboard,
    office_management: Building2,
    services: ClipboardList,
    results: MessageSquare,
    reports: ShieldCheck,
    admin_management: UserCog,
    change_password: KeyRound,
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  // ── Permission guards ────────────────────────────────────────────────────
  // Derived from the user object stored in localStorage (populated at login
  // and refreshed by refresh_session.php on every mount).
  // These control both sidebar visibility and renderContent() access.
  // To grant a new role access to a module, add it to the array below AND
  // update the corresponding PHP endpoint's RBAC logic.
  const userPerms = user?.permissions || [];
  const canAccessOfficeManagement =
    ['admin', 'super_admin'].includes(user?.role) ||
    userPerms.some(p => p.startsWith('offices_'));
  const canAccessServices =
    ['admin', 'super_admin', 'office', 'manager'].includes(user?.role) ||
    userPerms.some(p => p.startsWith('services_'));
  const canAccessAdminManagement =
    user?.role === 'super_admin' ||
    userPerms.some(p => p.startsWith('admin_'));

  // ── Tab content renderer ─────────────────────────────────────────────────
  // Central dispatcher — maps activeTab string to the correct module component.
  // Unauthorized tab access falls back to AdminDashboard rather than an error.
  // Add new modules here as: case 'your_tab_id': return <YourComponent />;
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] animate-in fade-in duration-700">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mt-6">Decrypting Records...</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return <AdminDashboard data={surveys} user={user} />;

      case 'office_management':
        if (canAccessOfficeManagement) return <OfficeManagement user={user} />;
        return <AdminDashboard data={surveys} user={user} />;

      case 'services': {
        if (canAccessServices) return <ArtaServices />;
        return <AdminDashboard data={surveys} user={user} />;
      }

      case 'admin_management':
        if (canAccessAdminManagement) return <AdminManagement />;
        return <AdminDashboard data={surveys} user={user} />;

      case 'change_password':
        return <ChangePassword user={user} />;

      case 'results': return <SurveyResults data={surveys} />;
      case 'reports': return <ReportsPage data={surveys} allOffices={offices} user={user} />;

      default:
        return <AdminDashboard data={surveys} user={user} />;
    }
  };

  if (!user) return null;

  return (
    <div className="h-screen flex bg-[#f8fafc] font-sans text-slate-900 overflow-hidden">

      {/* Backdrop — mobile only, closes sidebar on tap */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR: Command Panel Style */}
      <aside className={`
        fixed inset-y-0 left-0 z-40
        lg:relative lg:inset-auto lg:z-20 lg:translate-x-0
        w-72 bg-[#001d3d] text-white flex flex-col
        shadow-[4px_0_24px_rgba(0,0,0,0.1)]
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="p-8 pb-10 relative">
          {/* Close button — mobile only */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden absolute top-4 right-4 p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
          <div className="flex flex-col gap-4">
            <img src="/npc-new-logo.png" alt="NPC" className="h-14 w-14 object-contain opacity-90" />
            <div className="space-y-1">
              <h1 className="font-black text-lg tracking-tighter leading-none uppercase italic">MinGen NAPOCOR</h1>
              <p className="text-[9px] text-blue-400 font-black tracking-[0.3em] uppercase">Control Center v2.0</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="px-4 py-3 text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">System Nodes</p>
          {[
            { id: 'overview', label: 'Dashboard Overview' },
            ...(canAccessOfficeManagement ? [{ id: 'office_management', label: 'Office Directory' }] : []),
            ...(canAccessServices ? [{ id: 'services', label: 'ARTA Services' }] : []),
            { id: 'results', label: 'Feedback Stream' },
            { id: 'reports', label: 'Compliance Audit' },
            ...(canAccessAdminManagement ? [{ id: 'admin_management', label: 'Admin Accounts' }] : []),
            { id: 'change_password', label: 'Change Password' },
          ].map((item) => {
            const DynamicIcon = IconMap[item.id];
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`w-full group flex items-center justify-between px-4 py-4 transition-all duration-300 relative ${activeTab === item.id
                  ? 'bg-blue-600/10 text-white'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                  }`}
              >
                <div className="flex items-center gap-3">
                  {DynamicIcon && (
                    <DynamicIcon
                      size={18}
                      strokeWidth={activeTab === item.id ? 2.5 : 2}
                      className={`transition-all duration-300 ${activeTab === item.id ? 'text-blue-400 opacity-100' : 'opacity-40 group-hover:opacity-100'}`}
                    />
                  )}

                  <span className="text-[11px] font-bold uppercase tracking-widest">{item.label}</span>
                </div>
                {activeTab === item.id && (
                  <div className="absolute left-0 w-1 h-full bg-blue-500 shadow-[0_0_12px_#3b82f6]"></div>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div className="p-6 bg-[#00152e] border-t border-white/5 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30 text-[10px] font-black text-blue-400">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="text-[10px] font-black text-white truncate uppercase tracking-tight">
                {user.full_name || user.username}
              </p>
              <p className="text-[8px] font-bold text-blue-400/60 uppercase tracking-tighter italic truncate mt-0.5">
                @{user.username}
              </p>
              <p className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter mt-0.5">
                {user.role}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full py-3 bg-white/5 hover:bg-red-600/20 text-white/40 hover:text-red-400 text-[9px] font-black rounded-none transition-all uppercase tracking-[0.2em] border border-white/5 hover:border-red-500/30"
          >
            Terminate Session
          </button>
        </div>
      </aside>

      {/* Terminate Session Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#00152e] border border-red-500/30 w-[360px] p-8 flex flex-col gap-6 shadow-2xl">
            <div className="flex flex-col gap-2">
              <p className="text-[9px] font-black text-red-400 uppercase tracking-[0.3em]">Security Protocol</p>
              <h2 className="text-sm font-black text-white uppercase tracking-tight">Terminate Session?</h2>
              <p className="text-[10px] text-white/40 leading-relaxed mt-1">
                You are about to end your active session. Any unsaved changes will be lost and you will be redirected to the secure login page.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 text-[9px] font-black uppercase tracking-[0.2em] border border-white/10 hover:border-white/20 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3 bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-300 text-[9px] font-black uppercase tracking-[0.2em] border border-red-500/30 hover:border-red-500/60 transition-all"
              >
                Terminate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN VIEWPORT */}
      <main className="flex-1 flex flex-col relative h-screen overflow-hidden">

        {/* Mobile top bar — hidden on lg+ */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-[#001d3d] border-b border-white/10 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2.5">
            <img src="/npc-new-logo.png" alt="NPC" className="h-6 w-6 object-contain opacity-80" />
            <div>
              <p className="text-[10px] font-black text-white uppercase tracking-tight leading-none">Mindanao Gen</p>
              <p className="text-[8px] text-blue-400 font-bold tracking-widest uppercase">Control Center v2.0</p>
            </div>
          </div>
          <div className="ml-auto">
            <div className="h-7 w-7 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30 text-[10px] font-black text-blue-400">
              {user.username.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto px-4 md:px-10 py-4 custom-scrollbar scroll-smooth">
          <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {renderContent()}
          </div>
        </div>

        {/* Status Bar Footer */}
        <footer className="h-10 bg-white border-t border-slate-200 px-10 flex items-center justify-between shrink-0">
          <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em]">Authorized Access Only // RA 10173 Security Protocol Active</p>
          <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em]">NPC MinGen Division © 2026</p>
        </footer>
      </main>
    </div>
  );
};

export default AdminPage;