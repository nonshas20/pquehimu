import React, { useState } from 'react';
import type { AppUser } from '../types/inventory';
import { User, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from './HugeIcons';

interface LoginScreenProps {
  users: AppUser[];
  onLogin: (user: AppUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ users, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    }, 150);
  };

  return (
    <div className="relative min-h-screen w-full bg-white flex flex-col lg:flex-row overflow-x-hidden selection:bg-[#0d62d9] selection:text-white">
      
      {/* ========================================================= */}
      {/* DESKTOP BACKGROUND GRAPHIC: EXACT 1-TO-1 REFERENCE DIAGONAL */}
      {/* ========================================================= */}
      <div className="hidden lg:block absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden z-0">
        
        {/* Layer 1: Right Photo Viewport (Clipped from top 60.45% to bottom 39.95%) */}
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            clipPath: 'polygon(60.45% 0%, 100% 0%, 100% 100%, 39.95% 100%)',
          }}
        >
          <picture>
            <source srcSet="/login-bg.webp" type="image/webp" />
            <img
              src="/login-bg.png"
              alt="HIMU IT Operations"
              className="w-full h-full object-cover object-right"
              loading="eager"
            />
          </picture>
        </div>

        {/* Layer 2: Deep Blue Translucent Ribbon (Slope parallel to photo cut) */}
        <div
          className="absolute inset-0 w-full h-full bg-[#0f4082]/75 mix-blend-multiply"
          style={{
            clipPath: 'polygon(60.45% 0%, 69.4% 0%, 48.9% 100%, 39.95% 100%)',
          }}
        />

        {/* Layer 3: Vibrant Royal Blue Translucent Ribbon */}
        <div
          className="absolute inset-0 w-full h-full bg-[#2563eb]/45 backdrop-blur-[0.5px]"
          style={{
            clipPath: 'polygon(69.4% 0%, 76.5% 0%, 56.0% 100%, 48.9% 100%)',
          }}
        />

        {/* Layer 4: Geometric Square Accent near bottom-left of graphic */}
        <div className="absolute left-[49.5%] bottom-[13%] w-10 h-10 bg-white/25 border border-white/35 backdrop-blur-xs rounded-xs shadow-sm" />
      </div>

      {/* ========================================================= */}
      {/* MOBILE HEADER BANNER: RESPONSIVE HIGH-TECH WORKSTATION    */}
      {/* ========================================================= */}
      <div className="lg:hidden relative w-full h-44 sm:h-52 overflow-hidden bg-neutral-900 shrink-0">
        <picture>
          <source srcSet="/login-bg.webp" type="image/webp" />
          <img
            src="/login-bg.png"
            alt="HIMU IT Operations"
            className="w-full h-full object-cover object-center opacity-85"
            loading="eager"
          />
        </picture>
        {/* Angled Ribbon Overlay on Mobile */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div
          className="absolute inset-x-0 bottom-0 h-6 bg-white"
          style={{
            clipPath: 'polygon(0 100%, 100% 100%, 100% 0, 0 100%)',
          }}
        />
        <div className="absolute bottom-4 left-6 flex items-center gap-2">
          <span className="w-1.5 h-4.5 rounded-full bg-[#0d62d9]" />
          <span className="text-sm font-bold text-white tracking-widest uppercase">
            Parañaque HIMU
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* LEFT CONTENT: 1-TO-1 EXACT TYPOGRAPHY, INPUTS & SPACING   */}
      {/* ========================================================= */}
      <div className="relative z-10 w-full lg:w-[48%] xl:w-[45%] flex flex-col justify-center px-6 sm:px-12 md:px-16 lg:px-14 xl:px-20 py-8 lg:py-16 min-h-[calc(100vh-176px)] lg:min-h-screen">
        <div className="w-full max-w-[360px] mx-auto lg:mx-0">
          
          {/* Institutional Emblems: HIMU Official Seal & Alagang Parañaque UHC */}
          <div className="flex items-center gap-3.5 mb-5">
            <img
              src="/logo-himu-official-transparent.webp"
              alt="Health Information Management Unit Emblem"
              className="h-11 sm:h-12 w-auto object-contain drop-shadow-xs"
            />
            <div className="h-7 w-px bg-neutral-200" />
            <img
              src="/logo-uhc-alagang-paranaque.webp"
              alt="Alagang Parañaque UHC"
              className="h-8 sm:h-9 w-auto object-contain"
            />
          </div>

          {/* Top Brand Pill: | IT */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-1 h-5 sm:h-6 rounded-full bg-[#0d62d9]" />
            <span className="text-xl sm:text-2xl font-black text-[#0d62d9] tracking-tight leading-none">
              IT
            </span>
          </div>

          {/* HIMU Title */}
          <h1 className="text-5xl sm:text-6xl font-black text-[#0c1427] tracking-tight leading-none">
            HIMU
          </h1>

          {/* Subtitle: A S S E T   T R A C K E R */}
          <p className="text-[11px] sm:text-xs font-bold text-[#1e293b] tracking-[0.32em] uppercase mt-2">
            A S S E T &nbsp; T R A C K E R
          </p>

          {/* Tagline */}
          <div className="mt-3.5 mb-7 text-xs sm:text-sm text-neutral-500 font-normal leading-relaxed">
            <p>Manage. Monitor. Track.</p>
            <p>IT Assets for a more efficient workplace.</p>
          </div>

          {/* Inline Error Notice */}
          {error && (
            <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            
            {/* Username Input Field */}
            <div className="relative flex items-center w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 transition-all focus-within:border-[#0d62d9] focus-within:ring-2 focus-within:ring-[#0d62d9]/15 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <User className="h-5 w-5 text-neutral-400 shrink-0" strokeWidth={1.8} />
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
                placeholder="Username"
                className="w-full bg-transparent pl-3 pr-2 text-sm text-[#0c1427] placeholder:text-neutral-400 outline-none font-normal"
              />
            </div>

            {/* Password Input Field with Toggle Visibility */}
            <div className="relative flex items-center w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 transition-all focus-within:border-[#0d62d9] focus-within:ring-2 focus-within:ring-[#0d62d9]/15 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <Lock className="h-5 w-5 text-neutral-400 shrink-0" strokeWidth={1.8} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Password"
                className="w-full bg-transparent pl-3 pr-2 text-sm text-[#0c1427] placeholder:text-neutral-400 outline-none font-normal"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="p-1 text-neutral-400 hover:text-neutral-600 transition shrink-0 cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="h-4.5 w-4.5" strokeWidth={1.8} />
                ) : (
                  <Eye className="h-4.5 w-4.5" strokeWidth={1.8} />
                )}
              </button>
            </div>

            {/* Log In Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0d62d9] hover:bg-[#0b54bb] active:scale-[0.99] text-white py-3 px-6 font-semibold text-sm transition-all shadow-[0_2px_6px_rgba(13,98,217,0.22)] hover:shadow-[0_4px_12px_rgba(13,98,217,0.3)] disabled:opacity-50 mt-4 cursor-pointer"
            >
              <span>{isSubmitting ? 'Signing In...' : 'Log In'}</span>
              <ArrowRight className="h-4.5 w-4.5 text-white" strokeWidth={2} />
            </button>
          </form>

          {/* Discreet Footer Info */}
          <div className="mt-8 text-[11px] text-neutral-400 text-left">
            <span>City of Parañaque • Health Information Management Unit</span>
          </div>

        </div>
      </div>
    </div>
  );
};
