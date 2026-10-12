import React, { useState } from 'react';
import type { AppUser } from '../types/inventory';
import { ShieldCheck, UserCheck, AlertCircle, ArrowRight } from './HugeIcons';

interface LoginScreenProps {
  users: AppUser[];
  onLogin: (user: AppUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ users, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setError('Please enter both username and password.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Look up user (case-insensitive)
    const matched = users.find(
      (u) => u.username.toLowerCase() === cleanUser
    );

    if (!matched) {
      setIsSubmitting(false);
      setError('User not found. Check username or contact administrator.');
      return;
    }

    const expectedPassword = matched.password || 'password123';
    if (cleanPass !== expectedPassword) {
      setIsSubmitting(false);
      setError('Incorrect password.');
      return;
    }

    // Success!
    setTimeout(() => {
      onLogin(matched);
    }, 200);
  };

  const handleQuickFill = (presetUser: 'admin' | 'itofficer') => {
    const target = users.find((u) => u.username.toLowerCase() === presetUser);
    if (target) {
      setUsername(target.username);
      setPassword(target.password || 'password123');
      setError(null);
    } else {
      setUsername(presetUser);
      setPassword('password123');
      setError(null);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 px-4 py-8 text-neutral-100 relative overflow-hidden selection:bg-emerald-500 selection:text-neutral-950">
      
      {/* Subtle Background Glow Accent */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-500/10 blur-[120px]" />

      <div className="w-full max-w-sm space-y-6 relative z-10 animate-in fade-in duration-300">
        
        {/* Government Identity Header & Dual Logos */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-2.5 backdrop-blur-md shadow-2xl">
            <img
              src="/himu-logo-transparent.webp"
              alt="HIMU Parañaque"
              width={54}
              height={54}
              className="h-12 w-12 rounded-xl object-contain bg-white p-1 shadow-xs"
            />
            <div className="h-8 w-px bg-white/20" />
            <img
              src="/logo-uhc.webp"
              alt="UHC Alagang Parañaque"
              width={110}
              height={40}
              className="h-10 object-contain drop-shadow-sm"
            />
          </div>

          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white">
              HIMU IT Equipment Tracker
            </h1>
            <p className="text-xs text-neutral-400 font-medium mt-0.5">
              City of Parañaque • Health Information Management Unit
            </p>
          </div>
        </div>

        {/* Clean Login Card */}
        <div className="rounded-3xl border border-white/10 bg-white/95 text-neutral-900 p-6 sm:p-7 shadow-2xl backdrop-blur-md space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
            <div>
              <h2 className="text-sm font-bold text-neutral-900">
                Authorized Officer Sign In
              </h2>
              <p className="text-[11px] text-neutral-500">
                Enter your credentials to access inventory
              </p>
            </div>
            <div className="h-8 w-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="h-4.5 w-4.5 text-emerald-400" />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Username
              </label>
              <input
                type="text"
                required
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. admin or itofficer"
                className="w-full rounded-xl border border-neutral-300 bg-neutral-50/80 px-3.5 py-2.5 text-xs font-mono font-medium text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="••••••••"
                className="w-full rounded-xl border border-neutral-300 bg-neutral-50/80 px-3.5 py-2.5 text-xs font-mono font-medium text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 transition"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:scale-98 text-white py-2.5 text-xs font-bold transition shadow-md disabled:opacity-50 mt-1"
            >
              <span>{isSubmitting ? 'Authenticating...' : 'Sign In to HIMU IT'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick Demo Fill Buttons for Fast Login */}
          <div className="pt-2 border-t border-neutral-200">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-2 text-center">
              Quick Sign In Presets
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin')}
                className="flex items-center gap-2 p-2 rounded-xl border border-purple-200/90 bg-purple-50/70 hover:bg-purple-100 text-left transition"
              >
                <div className="h-6 w-6 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-purple-950 truncate">ADMIN</div>
                  <div className="text-[9px] font-mono text-purple-700 truncate">@admin</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('itofficer')}
                className="flex items-center gap-2 p-2 rounded-xl border border-blue-200/90 bg-blue-50/70 hover:bg-blue-100 text-left transition"
              >
                <div className="h-6 w-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <UserCheck className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-blue-950 truncate">IT OFFICER</div>
                  <div className="text-[9px] font-mono text-blue-700 truncate">@itofficer</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <p className="text-center text-[11px] text-neutral-500 font-medium">
          City of Parañaque • UHC Asset Custody Protocol
        </p>
      </div>
    </div>
  );
};
