import React from 'react';
import {
  Users,
  UserCheck,
  UserMinus,
  Coffee,
  Building2,
  FileText,
  Settings as SettingsIcon,
  Zap,
  Sparkles,
  Bot,
  Activity,
  Clock,
  Terminal,
  Globe,
  Bell,
  History,
  HelpCircle,
  Box,
  LogOut,
  X as CloseIcon,
} from 'lucide-react';
import type { SupabaseAuthUser } from '../types/index.js';
import { useAdminAuth } from '../context/AdminAuthContext.js';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  currentUser: SupabaseAuthUser;
  totalActiveDeployments?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  activeTab,
  setActiveTab,
  currentUser,
  totalActiveDeployments = 5,
}) => {
  const { logout } = useAdminAuth();

  // Dev'ai Controller Original Features (styled with mandatory theme & colors)
  const controllerNavItems = [
    { id: 'agents', label: 'AGENTS Platform', icon: Zap, badge: 'Active' },
    { id: 'chat', label: 'Dev’ai AI Assistant', icon: Sparkles },
    { id: 'worker', label: 'Worker Agent (Multi-Channel)', icon: Bot },
    { id: 'coding', label: 'Coding Agent (Drive)', icon: Terminal },
    { id: 'deployments', label: 'Deployments Monitor', icon: Globe, count: totalActiveDeployments },
    { id: 'status', label: 'Services Status', icon: Activity },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'knowledge', label: 'Knowledge Center', icon: HelpCircle },
    { id: 'chathistory', label: 'Chat Sessions', icon: Clock },
    { id: 'logs', label: 'Audit Trail Logs', icon: History },
    { id: 'docs', label: 'LLM Docs Reference', icon: FileText },
    { id: 'export', label: 'Deploy Worker Kit', icon: Box },
  ];

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    if (window.innerWidth < 768 && isOpen) {
      onToggle();
    }
  };

  return (
    <>
      {/* Desktop Sidebar (100% strictly matching theme & palette of Dasboard_mandatory_design.html) */}
      <aside className="hidden md:flex w-[260px] shrink-0 flex-col bg-[#fcfaf4] border-r border-[#e7e5d8] overflow-hidden">
        {/* Brand Header with static SVG Logo */}
        <div className="px-[18px] pt-[18px] pb-[14px] flex items-center gap-[10px] border-b border-[#e7e5d8]/60">
          <div className="shrink-0 rounded-[12px] p-[1.5px] bg-gradient-to-br from-[#FB923C] to-[#8B5CF6] shadow-[0_1px_6px_rgba(139,92,246,0.25)]">
            <div className="w-9 h-9 rounded-[10px] bg-white flex items-center justify-center overflow-hidden">
              <img src="/logo.svg" alt="Operava" className="w-7 h-7 object-contain" width={28} height={28} />
            </div>
          </div>
          <div className="leading-[1.1]">
            <div className="text-[13px] font-semibold tracking-[-0.01em] text-[#1a1a1a]">OPERAVA</div>
            <div className="text-[11px] font-medium text-[#7a776f] -mt-[1px]">Dev’ai Controller</div>
          </div>
        </div>

        {/* Scrollable Navigation Body */}
        <div className="flex-1 overflow-y-auto px-[10px] py-[12px] space-y-[18px]">
          {/* Main Navigation Section */}
          <nav className="space-y-[2px]">
            <div className="text-[10px] font-semibold text-[#9a9892] uppercase px-[10px] py-[4px] tracking-wider">
              Controller Modules
            </div>
            {controllerNavItems.map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center gap-[9px] px-[10px] h-[34px] rounded-[12px] text-[12.5px] font-[500] transition-all text-left cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#8B5CF6] to-[#FB923C] text-white shadow-[0_2px_10px_rgba(139,92,246,0.25)]'
                      : 'text-[#5c5a54] hover:bg-[#f8f5e9] hover:text-[#1a1a1a]'
                  }`}
                >
                  <Icon className={`w-[16px] h-[16px] shrink-0 ${isSelected ? 'text-white/90' : 'text-[#9a9892]'}`} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.count !== undefined && (
                    <span
                      className={`text-[10.5px] px-[6px] h-[18px] grid place-items-center rounded-full font-medium ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-[#f0ece0] text-[#8a8883]'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                  {item.badge && !item.count && (
                    <span
                      className={`text-[9.5px] px-[5px] h-[16px] grid place-items-center rounded-full font-semibold uppercase tracking-wider ${
                        isSelected ? 'bg-white/25 text-white' : 'bg-[#eef7ec] text-[#2d6a2a]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Stats Box (Exact matching Dasboard_mandatory_design.html style) */}
          <div className="rounded-[14px] bg-[#f8f5e9] border border-[#e7e5d8] p-[10px]">
            <div className="text-[11px] font-semibold text-[#5c5a54]">System Stats</div>
            <div className="mt-[8px] grid grid-cols-3 gap-[6px]">
              <div className="bg-[#fcfaf4] rounded-[10px] border border-[#e7e5d8] p-[8px]">
                <div className="text-[16px] font-semibold leading-none text-[#1a1a1a]">{totalActiveDeployments}</div>
                <div className="text-[10px] text-[#9a9892] mt-[3px]">Deploys</div>
              </div>
              <div className="bg-[#fcfaf4] rounded-[10px] border border-[#e7e5d8] p-[8px]">
                <div className="text-[16px] font-semibold leading-none text-[#1a1a1a]">5</div>
                <div className="text-[10px] text-[#9a9892] mt-[3px]">Services</div>
              </div>
              <div className="bg-[#fcfaf4] rounded-[10px] border border-[#e7e5d8] p-[8px]">
                <div className="text-[16px] font-semibold leading-none text-[#1a1a1a]">3</div>
                <div className="text-[10px] text-[#9a9892] mt-[3px]">AI Docs</div>
              </div>
            </div>
          </div>
        </div>

        {/* User Card & Sign out at Bottom */}
        <div className="mt-auto border-t border-[#e7e5d8] p-[10px] space-y-[8px]">
          <div className="flex items-center gap-[8px] px-[8px] py-[8px] rounded-[12px] bg-white border border-[#e7e5d8]">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#FB923C] text-white grid place-items-center text-[11px] font-semibold">
              {currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : 'OP'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium leading-[1.1] truncate text-[#1a1a1a]">
                {currentUser.name || 'Jelvan'}
              </div>
              <div className="text-[10.5px] text-[#8a8883] leading-[1.1] truncate">
                {currentUser.role || 'Operator • Dev'}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full h-[32px] rounded-[10px] flex items-center gap-[8px] px-[10px] text-[11.5px] font-medium text-[#7a776f] hover:bg-[#f8f5e9] cursor-pointer"
          >
            <LogOut className="w-[14px] h-[14px]" /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile Bottom-sheet Navigation (100% strictly matching theme & palette of Dasboard_mandatory_design.html) */}
      <div
        id="bottom-sheet"
        className={`md:hidden fixed left-0 right-0 bottom-0 z-[40] bg-[#fcfaf4] border-t border-[#e7e5d8] rounded-t-[20px] shadow-[0_-12px_40px_rgba(0,0,0,0.12)] transition-transform duration-300 will-change-transform ${
          isOpen ? 'translate-y-0' : 'translate-y-[105%]'
        }`}
        style={{ maxHeight: '78dvh' }}
      >
        <div className="px-[16px] pt-[10px] pb-[16px] overflow-y-auto" style={{ maxHeight: '78dvh' }}>
          <div className="w-[36px] h-[4px] rounded-full bg-[#e7e5d8] mx-auto mb-[14px]" />

          <div className="flex items-center gap-[10px] mb-[14px]">
            <div className="rounded-[12px] p-[1.5px] bg-gradient-to-br from-[#FB923C] to-[#8B5CF6]">
              <div className="w-9 h-9 rounded-[10px] bg-white grid place-items-center overflow-hidden">
                <img src="/logo.svg" alt="Operava" className="w-7 h-7 object-contain" width={28} height={28} />
              </div>
            </div>
            <div>
              <div className="text-[13px] font-semibold leading-[1.1] text-[#1a1a1a]">OPERAVA Workspace</div>
              <div className="text-[11px] text-[#8a8883]">Dev’ai Controller • Premium Light</div>
            </div>
            <button
              onClick={onToggle}
              className="ml-auto w-8 h-8 rounded-full bg-white border border-[#e7e5d8] grid place-items-center cursor-pointer"
            >
              <CloseIcon className="w-[14px] h-[14px]" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-[4px]">
            {controllerNavItems.map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`h-[40px] rounded-[14px] flex items-center gap-[10px] px-[12px] text-[13px] font-medium text-left border cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#8B5CF6] to-[#FB923C] text-white border-transparent shadow'
                      : 'bg-white border-[#e7e5d8] text-[#5c5a54]'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                  <span className="truncate">{item.label}</span>
                  {item.count !== undefined && (
                    <span
                      className={`ml-auto text-[11px] px-[7px] h-[20px] grid place-items-center rounded-full ${
                        isSelected ? 'bg-white/20' : 'bg-[#f8f5e9] border border-[#e7e5d8]'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-[14px] p-[10px] rounded-[14px] bg-[#f8f5e9] border border-[#e7e5d8] flex items-center gap-[10px]">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#FB923C] text-white grid place-items-center text-[12px] font-semibold">
              {currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : 'OP'}
            </div>
            <div className="flex-1">
              <div className="text-[12px] font-medium text-[#1a1a1a]">{currentUser.name || 'Jelvan'}</div>
              <div className="text-[11px] text-[#8a8883]">{currentUser.role || 'Operator • Dev'}</div>
            </div>
            <button
              onClick={logout}
              className="h-[30px] px-[10px] rounded-[10px] bg-white border border-[#e7e5d8] text-[11px] font-medium cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-[30] bg-black/20 backdrop-blur-[2px]" onClick={onToggle} />
      )}
    </>
  );
};
