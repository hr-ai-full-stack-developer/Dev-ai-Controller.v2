import { apiFetch } from '../lib/api.js';
import React, { useState } from 'react';
import {
  PanelLeft,
  ShieldCheck,
  Zap,
  Sparkles,
  Sun,
  Moon,
  LogOut,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import type { SupabaseAuthUser } from '../types/index.js';
import { useAdminAuth } from '../context/AdminAuthContext.js';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  currentUser: SupabaseAuthUser;
  onUserUpdate?: (user: SupabaseAuthUser) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onToggleSidebar,
  isSidebarOpen,
  isDarkMode,
  onToggleDarkMode,
  currentUser,
  onUserUpdate,
}) => {
  const { logout } = useAdminAuth();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [refreshNotification, setRefreshNotification] = useState<string | null>(null);

  const handleRefreshSession = async () => {
    try {
      const res = await apiFetch('/api/auth/me');
      const data = await res.json();
      if (data.success && data.user && onUserUpdate) {
        onUserUpdate(data.user);
      }
      setRefreshNotification('Session verified active.');
      setTimeout(() => setRefreshNotification(null), 2000);
    } catch (e) {
      setRefreshNotification('Unable to verify the session. Please sign in again.');
      setTimeout(() => setRefreshNotification(null), 2000);
    }
  };

  return (
    <header className="h-[56px] md:h-[62px] shrink-0 flex items-center justify-between px-[12px] md:px-[18px] bg-[#fcfaf4]/80 backdrop-blur border-b border-[#e7e5d8] sticky top-0 z-30">
      {/* Left side: Hamburger toggle + App Brand */}
      <div className="flex items-center gap-[10px]">
        <button
          onClick={onToggleSidebar}
          className="w-9 h-9 rounded-[12px] bg-white border border-[#e7e5d8] grid place-items-center text-[#5c5a54] hover:bg-[#fffefb] transition cursor-pointer"
          title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <PanelLeft className="w-[16px] h-[16px]" />
        </button>

        <div
          onClick={() => setActiveTab('agents')}
          className="flex items-center gap-[10px] cursor-pointer"
        >
          {/* Static SVG Logo in matching frame */}
          <div className="shrink-0 rounded-[12px] p-[1.5px] bg-gradient-to-br from-[#FB923C] to-[#8B5CF6] shadow-[0_1px_6px_rgba(139,92,246,0.25)]">
            <div className="w-8 h-8 rounded-[10px] bg-white flex items-center justify-center overflow-hidden">
              <img src="/logo.svg" alt="Operava logo" className="w-6 h-6 object-contain" width={24} height={24} />
            </div>
          </div>
          <div className="leading-[1.1]">
            <div className="text-[13px] font-semibold tracking-[-0.01em] text-[#1a1a1a]">
              OPERAVA
            </div>
            <div className="text-[11px] font-medium text-[#7a776f] -mt-[1px]">
              Dev’ai Controller
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Actions & User Profile */}
      <div className="flex items-center gap-[10px]">
        {/* Active edge indicator */}
        <div className="hidden sm:flex items-center gap-[6px] px-[9px] h-[30px] rounded-full bg-white border border-[#e7e5d8] text-[11px] font-medium text-[#2d6a2a]">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Signed in</span>
        </div>

        {/* User Profile Pill */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-[8px] px-[8px] py-[6px] rounded-[12px] bg-white border border-[#e7e5d8] hover:bg-[#fffefb] transition cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#FB923C] text-white grid place-items-center text-[11px] font-semibold">
              {currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : 'OP'}
            </div>
            <span className="text-[12px] font-medium text-[#1a1a1a] hidden sm:inline">
              {currentUser.name || 'Operator'}
            </span>
          </button>

          {/* User Details Dropdown */}
          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-72 rounded-[18px] bg-[#fcfaf4] border border-[#e7e5d8] shadow-[0_16px_48px_rgba(0,0,0,0.12)] p-4 z-50 text-xs">
              <div className="flex items-center gap-3 pb-3 border-b border-[#e7e5d8]/70">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#FB923C] text-white grid place-items-center font-bold text-sm">
                  {currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : 'OP'}
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm text-[#111827] truncate">
                    {currentUser.name || 'Operator'}
                  </h4>
                  <p className="text-[11px] text-[#6b7280] truncate">
                    {currentUser.email}
                  </p>
                  <span className="inline-block mt-1 text-[10px] font-medium text-[#2d6a2a] bg-[#eef7ec] px-2 py-0.5 rounded-full border border-[#cfe9cc]">
                    {currentUser.role || 'Operator'}
                  </span>
                </div>
              </div>

              <div className="pt-3 space-y-2 text-[11px] text-[#5c5a54]">
                <div className="flex items-center justify-between">
                  <span>Primary AI:</span>
                  <span className="font-semibold text-[#111827]">Workers AI (Llama 3.3)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Fallback AI:</span>
                  <span className="font-semibold text-[#111827]">OpenAI (gpt-4o-mini)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Token Vault:</span>
                  <span className="font-mono text-orange-600 font-semibold text-[10px]">
                    AES-256-GCM Server Isolated
                  </span>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-[#e7e5d8]/70 space-y-2">
                {refreshNotification && (
                  <div className="p-2 rounded-xl bg-[#eef7ec] border border-[#cfe9cc] text-[11px] text-[#2d6a2a] flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>{refreshNotification}</span>
                  </div>
                )}
                <button
                  onClick={handleRefreshSession}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-[#f0ede1] text-[#111827] font-semibold text-xs border border-[#e7e5d8] transition cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Refresh Session</span>
                </button>
                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#fdecea] hover:bg-red-100 text-[#8a3a32] font-semibold text-xs border border-[#f5c2bd] transition cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Lock Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
