import { apiFetch } from '../lib/api.js';
import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Mail,
  X as CloseIcon,
} from 'lucide-react';
import { AdminAuthContext } from '../context/AdminAuthContext.js';
import type { SupabaseAuthUser } from '../types/index.js';

interface AdminProtectiveWrapperProps {
  children: React.ReactNode;
}

const defaultUser: SupabaseAuthUser = {
  id: 'usr-sb-7782194',
  email: 'admin@operava.com',
  name: 'Alex Rivera',
  role: 'Developer / Operator',
  sessionValid: true,
  lastSignInAt: new Date().toISOString(),
};

export const AdminProtectiveWrapper: React.FC<AdminProtectiveWrapperProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [currentUser, setCurrentUser] = useState<SupabaseAuthUser>(defaultUser);
  const [token, setToken] = useState<string | null>(null);

  // Login form state (100% strictly aligned with Loginpage_mandatory_design.html)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reset password modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');

  useEffect(() => {
    localStorage.removeItem('admin_token');
    const expire = () => { setIsAuthenticated(false); setToken(null); };
    window.addEventListener('devai:session-expired', expire);
    apiFetch('/api/auth/verify-session')
      .then(r => r.json()).then(data => { setCurrentUser(data.user); setIsAuthenticated(true); })
      .catch(() => setIsAuthenticated(false)).finally(() => setIsCheckingSession(false));
    return () => window.removeEventListener('devai:session-expired', expire);
  }, []);

  const validateForm = () => {
    const nextErrors: { email?: string; password?: string } = {};
    if (!email) {
      nextErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Enter a valid email address';
    }
    if (!password) {
      nextErrors.password = 'Password is required';
    } else if (password.length < 6) {
      nextErrors.password = 'Minimum 6 characters';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      });
      const data = await res.json();
      setCurrentUser(data.user);
      setIsAuthenticated(true);
      setPassword('');
    } catch (err) {
      setErrors({ password: err instanceof Error ? err.message : 'Unable to sign in. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
      setResetError('Enter a valid email'); return;
    }
    setResetError(''); setIsResetting(true);
    try {
      await apiFetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: resetEmail }) });
      setResetSent(true);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Unable to request a password reset.');
    } finally { setIsResetting(false); }
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      // ignore
    }
    localStorage.removeItem('admin_token');
    setToken(null);
    setIsAuthenticated(false);
  };

  if (isCheckingSession) return <div className="min-h-screen grid place-items-center bg-[#f8f5e9]" role="status">Checking your session…</div>;

  // If authenticated, render protected dashboard within context
  if (isAuthenticated) {
    return (
      <AdminAuthContext.Provider
        value={{
          isAuthenticated,
          currentUser,
          token,
          logout: handleLogout,
          setAuthenticatedUser: (user, newToken) => {
            setCurrentUser(user);
            setToken(newToken);
            setIsAuthenticated(true);
          },
        }}
      >
        {children}
      </AdminAuthContext.Provider>
    );
  }

  // 100% strictly aligned with /public/Loginpage_mandatory_design.html
  return (
    <div className="min-h-screen w-full max-w-[100vw] bg-[#f8f5e9] flex flex-col overflow-x-hidden overflow-y-auto selection:bg-[#e7e5d8] relative text-[#1a1a1a]">
      {/* SVG Definitions for gradient stroke */}
      <svg width="0" height="0" className="absolute pointer-events-none">
        <defs>
          <linearGradient id="purpleOrange" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="25%" stopColor="#A855F7" />
            <stop offset="75%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#FB923C" />
          </linearGradient>
        </defs>
      </svg>

      {/* Floating Ambient Background Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden max-w-[100vw]">
        <div
          className="absolute top-0 left-0 w-[420px] h-[420px] rounded-full blur-[90px] opacity-80"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, rgba(139,92,246,0.16) 0%, rgba(168,85,247,0.10) 35%, rgba(251,146,60,0.08) 70%, transparent 85%)',
            animation: 'float 8s ease-in-out infinite',
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-[460px] h-[460px] rounded-full blur-[100px] opacity-80"
          style={{
            background:
              'radial-gradient(circle at 70% 40%, rgba(251,146,60,0.12) 0%, rgba(249,115,22,0.08) 30%, rgba(139,92,246,0.10) 65%, transparent 85%)',
            animation: 'float2 10s ease-in-out infinite',
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 w-[320px] h-[320px] rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2 opacity-70"
          style={{
            background:
              'radial-gradient(circle, rgba(139,92,246,0.06) 0%, rgba(251,146,60,0.05) 60%, transparent 80%)',
            animation: 'orbDrift 12s ease-in-out infinite',
          }}
        />
        <div
          className="hidden lg:block absolute top-[22%] left-[18%] w-1.5 h-1.5 rounded-full bg-[#e7e5d8]"
          style={{ animation: 'dotFloat 4.2s ease-in-out infinite' }}
        />
        <div
          className="hidden lg:block absolute top-[28%] left-[26%] w-1 h-1 rounded-full bg-[#8B5CF6]/40"
          style={{ animation: 'dotFloat 3.6s ease-in-out infinite 0.8s' }}
        />
        <div
          className="hidden lg:block absolute bottom-[30%] right-[20%] w-1.5 h-1.5 rounded-full bg-[#FB923C]/40"
          style={{ animation: 'dotFloat 4.8s ease-in-out infinite 1.2s' }}
        />
      </div>

      {/* Main Container */}
      <div className="flex-1 w-full max-w-[100vw] flex flex-col items-center justify-center px-4 py-10 lg:py-8 relative z-10 min-w-0 box-border">
        <div className="w-full max-w-[980px] min-w-0 bg-white/80 backdrop-blur-[14px] border border-[#e7e5d8] rounded-[28px] shadow-[0_8px_32px_rgba(0,0,0,0.06),0_1px_0_rgba(255,255,255,0.8)_inset] overflow-hidden flex flex-col lg:flex-row box-border">
          {/* Left Column (Brand & Value Proposition) */}
          <div className="relative lg:w-[46%] min-w-0 px-8 lg:px-10 py-10 lg:py-12 flex flex-col justify-between bg-[#fcfaf4] lg:bg-[#fbf8ef] border-b lg:border-b-0 lg:border-r border-[#e7e5d8]/70 overflow-hidden">
            <div
              className="pointer-events-none absolute -top-20 -left-16 w-64 h-64 rounded-full blur-[50px] opacity-60"
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(251,146,60,0.12))',
                animation: 'orbDrift 9s ease-in-out infinite',
              }}
            />

            <div className="relative z-10 min-w-0">
              {/* Brand Logo & Title with Static SVG */}
              <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 rounded-[12px] flex items-center justify-center bg-transparent shadow-[0_4px_12px_rgba(139,92,246,0.18)] shrink-0 overflow-hidden">
                  <img src="/logo.svg" alt="Operava logo" className="w-10 h-10 object-contain" width={40} height={40} />
                </div>
                <span className="text-[18px] font-bold tracking-[0.14em] text-[#1a1a1a]">OPERAVA</span>
              </div>

              {/* Serif Headline */}
              <div className="space-y-5 min-w-0">
                <h1 className="serif text-[32px] lg:text-[36px] leading-[0.95] tracking-[-0.02em] text-[#1a1a1a]">
                  Work,{' '}
                  <span
                    className="italic font-light"
                    style={{
                      background: 'linear-gradient(135deg, #8B5CF6 0%, #F97316 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    automated.
                  </span>
                  <br />
                  Business,
                  <br />
                  elevated.
                </h1>
                <p className="text-[13px] leading-[1.6] text-[#6b6a63] max-w-[280px]">
                  A minimal workspace for teams that move fast. Secure, light, and built for clarity.
                </p>
              </div>

              {/* Animated Metric Lines */}
              <div className="mt-10 space-y-4">
                {[
                  { label: 'Automation', w: '92px', delay: '0s' },
                  { label: 'Technology', w: '118px', delay: '0.35s' },
                  { label: 'Global Business Outsourcing', w: '148px', delay: '0.7s' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-px bg-[#e7e5d8] shrink-0" />
                    <div
                      className="relative h-1.5 rounded-full bg-[#f0ede1] overflow-hidden shrink-0"
                      style={{ width: item.w }}
                    >
                      <div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                          background: 'linear-gradient(90deg, #8B5CF6, #FB923C)',
                          animation: `lineGrow 1.2s cubic-bezier(0.16,1,0.3,1) forwards ${item.delay}`,
                          width: '100%',
                        }}
                      />
                    </div>
                    <span className="text-[10px] tracking-[0.12em] uppercase font-medium text-[#9a9993] truncate">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trusted Teams Social Proof */}
            <div className="relative z-10 mt-12 lg:mt-0 hidden lg:flex items-center gap-2.5 min-w-0">
              <div className="flex -space-x-1.5">
                {[0, 1, 2].map((x) => (
                  <div
                    key={x}
                    className="w-6 h-6 rounded-full border-[2px] border-[#fbf8ef] flex items-center justify-center text-[9px] font-semibold text-white shrink-0"
                    style={{
                      background: `linear-gradient(135deg, #8B5CF6 ${x * 30}%, #FB923C)`,
                      zIndex: 3 - x,
                    }}
                  >
                    {String.fromCharCode(65 + x)}
                  </div>
                ))}
              </div>
              <span className="text-[11px] text-[#9a9993]">Trusted by 2,400+ teams worldwide</span>
            </div>
          </div>

          {/* Right Column (Sign-in Form) */}
          <div className="lg:w-[54%] min-w-0 px-7 lg:px-10 py-9 lg:py-10 bg-white flex flex-col justify-center">
            <div className="max-w-[360px] mx-auto w-full min-w-0">
              <div className="mb-8">
                <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-[#111827]">Welcome back</h2>
                <p className="mt-1 text-[13px] text-[#6b7280]">Sign in to OPERAVA</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4 min-w-0" noValidate>
                {/* Email Input */}
                <div className="space-y-1.5 min-w-0">
                  <label className="text-[11px] font-medium tracking-[0.04em] uppercase text-[#6b7280]">Email</label>
                  <div className="relative group min-w-0">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M3 7.5L12 13L21 7.5"
                          stroke="url(#purpleOrange)"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <rect x="3" y="5" width="18" height="14" rx="3" stroke="url(#purpleOrange)" strokeWidth="1.5" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) setErrors({ ...errors, email: undefined });
                      }}
                      placeholder="you@company.com"
                      className={`w-full h-[44px] pl-[42px] pr-4 rounded-xl border bg-[#fcfcfb] text-[14px] text-[#111827] placeholder:text-[#9ca3af] outline-none transition-all min-w-0 ${
                        errors.email
                          ? 'border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-4 focus:ring-red-100'
                          : 'border-[#e7e5d8] focus:border-[#d6d3c8] focus:bg-white focus:ring-4 focus:ring-[#f0ede1]'
                      }`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 min-w-0">
                      <span className="w-3 h-3 rounded-full bg-red-500 text-white flex items-center justify-center text-[8px] shrink-0">
                        !
                      </span>
                      <span className="truncate">{errors.email}</span>
                    </p>
                  )}
                </div>

                {/* Password Input */}
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center justify-between min-w-0">
                    <label className="text-[11px] font-medium tracking-[0.04em] uppercase text-[#6b7280]">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowResetModal(true)}
                      className="text-[11px] font-medium bg-gradient-to-r from-[#8B5CF6] to-[#FB923C] bg-clip-text text-transparent hover:opacity-80 transition-opacity shrink-0"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative group min-w-0">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="10" width="18" height="10" rx="3" stroke="url(#purpleOrange)" strokeWidth="1.5" />
                        <path
                          d="M8 10V7a4 4 0 0 1 8 0v3"
                          stroke="url(#purpleOrange)"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) setErrors({ ...errors, password: undefined });
                      }}
                      placeholder="••••••••"
                      className={`w-full h-[44px] pl-[42px] pr-11 rounded-xl border bg-[#fcfcfb] text-[14px] text-[#111827] placeholder:text-[#9ca3af] outline-none transition-all min-w-0 ${
                        errors.password
                          ? 'border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-4 focus:ring-red-100'
                          : 'border-[#e7e5d8] focus:border-[#d6d3c8] focus:bg-white focus:ring-4 focus:ring-[#f0ede1]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 grid place-items-center rounded-lg transition-colors ${
                        showPassword ? 'bg-[#f0ede1] text-[#6b7280]' : 'text-[#9ca3af] hover:text-[#6b7280] hover:bg-[#f3f4f6]'
                      }`}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 min-w-0">
                      <span className="w-3 h-3 rounded-full bg-red-500 text-white flex items-center justify-center text-[8px] shrink-0">
                        !
                      </span>
                      <span className="truncate">{errors.password}</span>
                    </p>
                  )}
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center gap-2.5 pt-1">
                  <label className="relative flex items-center gap-2.5 cursor-pointer group min-w-0 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="w-[18px] h-[18px] rounded-[6px] border border-[#e7e5d8] bg-white peer-checked:bg-[#111827] peer-checked:border-[#111827] flex items-center justify-center transition-all shrink-0">
                      <Check size={12} className="text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-[12.5px] text-[#4b5563]">
                      Remember me{rememberMe ? ' • on' : ''}
                    </span>
                  </label>
                </div>

                {/* Sign-in Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-[44px] rounded-xl bg-[#E5E7EB] hover:bg-[#D1D5DB] active:bg-[#CBD5E1] text-[#111827] text-[14px] font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)] box-border"
                >
                  {isSubmitting ? (
                    <>
                      <span
                        className="w-4 h-4 rounded-full border-2 border-transparent animate-spin shrink-0"
                        style={{
                          borderTopColor: '#8B5CF6',
                          borderRightColor: '#F97316',
                          borderBottomColor: '#A855F7',
                          borderLeftColor: '#E5E7EB',
                        }}
                      />
                      <span className="bg-gradient-to-r from-[#8B5CF6] to-[#FB923C] bg-clip-text text-transparent font-semibold">
                        Signing in...
                      </span>
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight size={16} className="opacity-60" />
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 py-1.5">
                  <div className="h-px flex-1 bg-[#e7e5d8]" />
                  <span className="text-[11px] text-[#9ca3af] tracking-wide shrink-0">or continue with</span>
                  <div className="h-px flex-1 bg-[#e7e5d8]" />
                </div>

                {/* SSO Buttons */}
                <div className="grid grid-cols-2 gap-3 min-w-0">
                  <button
                    type="button"
                    className="h-[42px] rounded-xl border border-[#e7e5d8] bg-white hover:bg-[#F3F4F6] active:bg-[#e7e5d8] flex items-center justify-center gap-2 text-[13px] font-medium text-[#374151] transition-colors min-w-0 box-border"
                    onClick={() => {
                      setToastMessage('Google SSO — coming soon');
                      setTimeout(() => setToastMessage(null), 2500);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" className="shrink-0">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09A6.99 6.99 0 0 1 5.47 12c0-.74.13-1.45.36-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span className="truncate">Google</span>
                  </button>

                  <button
                    type="button"
                    className="h-[42px] rounded-xl border border-[#e7e5d8] bg-white hover:bg-[#F3F4F6] active:bg-[#e7e5d8] flex items-center justify-center gap-2 text-[13px] font-medium text-[#374151] transition-colors min-w-0 box-border"
                    onClick={() => {
                      setToastMessage('Microsoft SSO — coming soon');
                      setTimeout(() => setToastMessage(null), 2500);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" className="shrink-0">
                      <path fill="#F25022" d="M1 1h10v10H1z" />
                      <path fill="#7FBA00" d="M13 1h10v10H13z" />
                      <path fill="#00A4EF" d="M1 13h10v10H1z" />
                      <path fill="#FFB900" d="M13 13h10v10H13z" />
                    </svg>
                    <span className="truncate">Microsoft</span>
                  </button>
                </div>

                <p className="text-center text-[12.5px] text-[#6b7280] pt-1">
                  No account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setToastMessage('Registration is restricted to authorized operators.');
                      setTimeout(() => setToastMessage(null), 2500);
                    }}
                    className="font-medium bg-gradient-to-r from-[#8B5CF6] to-[#FB923C] bg-clip-text text-transparent hover:opacity-80"
                  >
                    Sign up
                  </button>
                </p>
              </form>
            </div>
          </div>
        </div>

        {/* Mobile social proof */}
        <div className="lg:hidden mt-6 flex items-center justify-center gap-2.5 min-w-0">
          <div className="flex -space-x-1.5">
            {[0, 1, 2].map((x) => (
              <div
                key={x}
                className="w-5 h-5 rounded-full border-[2px] border-[#f8f5e9] flex items-center justify-center text-[8px] font-semibold text-white shrink-0"
                style={{
                  background: `linear-gradient(135deg, #8B5CF6 ${x * 30}%, #FB923C)`,
                  zIndex: 3 - x,
                }}
              >
                {String.fromCharCode(65 + x)}
              </div>
            ))}
          </div>
          <span className="text-[11px] text-[#9a9993]">Trusted by 2,400+ teams</span>
        </div>
      </div>

      {/* Footer (100% matching design) */}
      <footer className="w-full border-t border-[#e7e5d8]/60 bg-[#f8f5e9]/80 backdrop-blur-[6px] py-3.5 px-4 relative z-10 mt-auto shrink-0">
        <div className="max-w-[980px] mx-auto flex flex-col items-center gap-1 min-w-0 w-full box-border">
          <div className="flex items-center gap-2 flex-wrap justify-center text-[10.5px] leading-[1.4] text-[#8a8983] text-center max-w-full w-full box-border px-1">
            <span>Automation, Technology and Global Business Outsourcing Solutions</span>
            <span
              className="w-1 h-1 rounded-full shrink-0 hidden sm:inline-block"
              style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #FB923C 100%)' }}
            />
            <span className="break-words">
              © All rights reserved, a system owned and developed internally by OPERAVA GLOBAL SOLUTIONS.
            </span>
          </div>
        </div>
      </footer>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-[float_0.4s_ease] max-w-[calc(100vw-3rem)]">
          <div className="flex items-center gap-3 bg-[#111827] text-white text-[13px] font-medium px-4 py-3 rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.18)] border border-white/10 min-w-0">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #8B5CF6, #FB923C)' }}
            >
              <Check size={12} className="text-white" />
            </div>
            <span className="truncate">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Reset Password Modal (100% matching design) */}
      {showResetModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#1a1a1a]/20 backdrop-blur-[6px]"
            onClick={() => !resetSent && setShowResetModal(false)}
          />
          <div className="relative w-full max-w-[380px] bg-white rounded-[20px] border border-[#e7e5d8] shadow-[0_16px_48px_rgba(0,0,0,0.12)] p-6 min-w-0">
            <button
              onClick={() => !resetSent && setShowResetModal(false)}
              className="absolute top-4 right-4 w-8 h-8 grid place-items-center rounded-full bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#6b7280] transition-colors"
            >
              <CloseIcon size={14} />
            </button>

            {!resetSent ? (
              <>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #FB923C 100%)' }}
                >
                  <Mail size={18} className="text-white" />
                </div>
                <h3 className="text-[17px] font-semibold text-[#111827] tracking-[-0.01em]">Reset password</h3>
                <p className="text-[13px] text-[#6b7280] mt-1 leading-[1.5]">
                  Enter your email and we'll send you a secure reset link.
                </p>

                <form onSubmit={handleResetSubmit} className="mt-5 space-y-3">
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M3 7.5L12 13L21 7.5"
                          stroke="url(#purpleOrange)"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <rect x="3" y="5" width="18" height="14" rx="3" stroke="url(#purpleOrange)" strokeWidth="1.5" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => {
                        setResetEmail(e.target.value);
                        setResetError('');
                      }}
                      placeholder="you@company.com"
                      className="w-full h-[44px] pl-[42px] pr-4 rounded-xl border border-[#e7e5d8] bg-[#fcfcfb] focus:bg-white focus:border-[#d6d3c8] focus:ring-4 focus:ring-[#f0ede1] outline-none text-[14px] placeholder:text-[#9ca3af] min-w-0"
                    />
                  </div>
                  {resetError && <p className="text-[11px] text-red-500">{resetError}</p>}
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="w-full h-[44px] rounded-xl bg-[#111827] hover:bg-black text-white text-[14px] font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
                  >
                    {isResetting ? 'Sending...' : 'Send reset link'}
                    <ArrowRight size={14} />
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#f0fdf4] border border-[#dcfce7] flex items-center justify-center mb-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #8B5CF6, #22c55e)' }}
                  >
                    <Check size={16} className="text-white" />
                  </div>
                </div>
                <h3 className="text-[16px] font-semibold text-[#111827]">Check your email</h3>
                <p className="text-[12.5px] text-[#6b7280] mt-1">
                  We sent a reset link to <span className="font-medium text-[#111827] break-all">{resetEmail}</span>
                </p>
                <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-[#9ca3af]">
                  <span className="w-3 h-3 rounded-full border-2 border-[#e7e5d8] border-t-[#8B5CF6] animate-spin" />
                  Redirecting...
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
