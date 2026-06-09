import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';

const BASE = 'http://localhost/MinGen%20CSM/minGen-api';

// Defined OUTSIDE to prevent focus loss on every keystroke
const PasswordField = ({ label, value, onChange, show, onToggle, placeholder }) => (
  <div className="space-y-1.5">
    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full px-4 py-3 pr-10 bg-slate-50 border border-slate-200 focus:border-[#001d3d] focus:bg-white rounded-xl text-sm font-medium outline-none transition-all placeholder:text-slate-300"
        required
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  </div>
);

const passwordStrength = (pw) => {
  if (!pw) return null;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: 'Weak', color: 'bg-red-500', text: 'text-red-500', width: 'w-1/4' };
  if (score === 2) return { label: 'Fair', color: 'bg-amber-500', text: 'text-amber-500', width: 'w-2/4' };
  if (score === 3) return { label: 'Good', color: 'bg-blue-500', text: 'text-blue-500', width: 'w-3/4' };
  return { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-500', width: 'w-full' };
};

const ChangePassword = ({ user }) => {
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' });
  const [show, setShow] = useState({ current: false, newPass: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));
  const toggle = (field) => () => setShow(prev => ({ ...prev, [field]: !prev[field] }));

  const strength = passwordStrength(form.newPass);
  const mismatch = form.confirm && form.newPass !== form.confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);
    if (form.newPass !== form.confirm) { setResult({ type: 'error', message: 'Passwords do not match.' }); return; }
    if (form.newPass.length < 6) { setResult({ type: 'error', message: 'New password must be at least 6 characters.' }); return; }

    setLoading(true);
    try {
      const res = await fetch(`${BASE}/auth/change_password.php?user_id=${user?.id || ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ current_password: form.current, new_password: form.newPass })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setResult({ type: 'success', message: 'Password changed successfully!' });
        setForm({ current: '', newPass: '', confirm: '' });
      } else {
        setResult({ type: 'error', message: data.message });
      }
    } catch {
      setResult({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-in fade-in duration-700 px-2 md:px-8 py-1">

      {/* Header */}
      <header className="flex items-center gap-6 pb-3 border-b border-[#E2E8F0]">
        <div>
          <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-[0.4em] leading-none mb-1">Account</p>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Change Password</h1>
        </div>
      </header>

      {/* User Info */}
      <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="w-10 h-10 rounded-full bg-[#001d3d] flex items-center justify-center text-white font-black text-sm">
          {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-[12px] font-black text-slate-800 uppercase">{user?.full_name || user?.username}</p>
          <p className="text-[9px] text-slate-400 font-bold">@{user?.username}</p>
        </div>
        <div className="ml-auto"><KeyRound size={18} className="text-slate-300" /></div>
      </div>

      {/* Result */}
      {result && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border animate-in slide-in-from-top-1 duration-200
          ${result.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {result.type === 'success' ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
          <p className="text-[11px] font-black uppercase tracking-wide">{result.message}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">

        <PasswordField
          label="Current Password"
          value={form.current}
          onChange={set('current')}
          show={show.current}
          onToggle={toggle('current')}
          placeholder="Enter your current password"
        />

        <div className="h-px bg-slate-100" />

        <PasswordField
          label="New Password"
          value={form.newPass}
          onChange={set('newPass')}
          show={show.newPass}
          onToggle={toggle('newPass')}
          placeholder="Enter new password"
        />

        {/* Strength meter */}
        {form.newPass && strength && (
          <div className="space-y-1.5 animate-in fade-in duration-150">
            <div className="flex justify-between items-center">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Password Strength</p>
              <p className={`text-[8px] font-black uppercase tracking-widest ${strength.text}`}>{strength.label}</p>
            </div>
            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
            </div>
            <ul className="text-[8px] space-y-0.5 mt-1">
              {[
                { check: form.newPass.length >= 8, label: 'At least 8 characters' },
                { check: /[A-Z]/.test(form.newPass), label: 'One uppercase letter' },
                { check: /[0-9]/.test(form.newPass), label: 'One number' },
                { check: /[^A-Za-z0-9]/.test(form.newPass), label: 'One special character' },
              ].map(({ check, label }) => (
                <li key={label} className={`flex items-center gap-1.5 font-bold uppercase transition-colors ${check ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <CheckCircle2 size={9} />{label}
                </li>
              ))}
            </ul>
          </div>
        )}

        <PasswordField
          label="Confirm New Password"
          value={form.confirm}
          onChange={set('confirm')}
          show={show.confirm}
          onToggle={toggle('confirm')}
          placeholder="Confirm your new password"
        />

        {mismatch && (
          <p className="text-[9px] font-black text-red-500 uppercase tracking-wide flex items-center gap-1.5 animate-in fade-in duration-150">
            <AlertCircle size={11} /> Passwords do not match
          </p>
        )}

        <button
          type="submit"
          disabled={loading || mismatch || !form.current || !form.newPass || !form.confirm}
          className="w-full py-3 bg-[#001d3d] hover:bg-blue-900 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Lock size={13} />
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
};

export default ChangePassword;
