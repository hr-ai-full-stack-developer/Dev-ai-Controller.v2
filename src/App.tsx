import { apiFetch } from './lib/api.js';
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.js';
import { Sidebar } from './components/Sidebar.js';
import { StatusDashboard } from './components/StatusDashboard.js';
import { CodingAgent } from './components/CodingAgent.js';
import { DeploymentsMonitor } from './components/DeploymentsMonitor.js';
import { NotificationsFeed } from './components/NotificationsFeed.js';
import { AuditLogs } from './components/AuditLogs.js';
import { DocsViewer } from './components/DocsViewer.js';
import { ExportKit } from './components/ExportKit.js';
import { DevaiChat } from './components/DevaiChat.js';
import { ChatHistory } from './components/ChatHistory.js';
import { KnowledgeCenter } from './components/KnowledgeCenter.js';
import { WorkerAgent } from './components/WorkerAgent.js';
import { AgentsPlatform } from './components/AgentsPlatform.js';
import { BreadcrumbNav } from './components/BreadcrumbNav.js';
import type {
  ServiceStatusInfo,
  ServiceType,
  DeployedApp,
  NotificationItem,
  CodingTask,
  AuditLog,
  SupabaseAuthUser,
} from './types/index.js';

export default function App() {
  const [actionError, setActionError] = useState<string | null>(null);
  useEffect(() => {
    const onError = (event: Event) => setActionError((event as CustomEvent<string>).detail);
    window.addEventListener('devai:api-error', onError);
    return () => window.removeEventListener('devai:api-error', onError);
  }, []);
  const [activeTab, setActiveTab] = useState<string>('agents');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedChatSessionId, setSelectedChatSessionId] = useState<string | null>(null);

  // Authenticated Supabase User (read-only session display)
  const [currentUser, setCurrentUser] = useState<SupabaseAuthUser>({
    id: '',
    email: '',
    name: 'Operator',
    role: 'Developer / Operator',
    sessionValid: false,
    lastSignInAt: '',
  });

  // Services Status Data
  const [services, setServices] = useState<Record<ServiceType, ServiceStatusInfo>>({
    cloudflare: {
      id: 'cloudflare',
      name: 'Cloudflare',
      role: 'Primary Runtime, Edge APIs & Cloudflare AI',
      status: 'offline',
      latencyMs: 22,
      lastChecked: new Date().toISOString(),
      version: 'Workers v2026.3',
      details: 'Status has not been checked yet.',
      features: ['Serverless Runtime', 'Cloudflare Workers AI', 'Request Routing', 'Zero-Trust Secrets'],
    },
    supabase: {
      id: 'supabase',
      name: 'Supabase',
      role: 'Authentication & Central Database',
      status: 'offline',
      latencyMs: 27,
      lastChecked: new Date().toISOString(),
      version: 'PostgreSQL 15.6',
      details: 'Optional Supabase persistence status has not been checked yet.',
      features: ['Supabase Auth', 'PostgreSQL Database', 'Row Level Security', 'Audit Trail Storage'],
    },
    github: {
      id: 'github',
      name: 'GitHub',
      role: 'Source Code, Commits & PR Automation',
      status: 'offline',
      latencyMs: 38,
      lastChecked: new Date().toISOString(),
      version: 'REST API v3',
      details: 'GitHub integration status has not been checked yet.',
      features: ['Repository Inspection', 'Source Code Analysis', 'Pull Request Automation', 'Commit Verification'],
    },
    resend: {
      id: 'resend',
      name: 'Resend',
      role: 'Transactional Email & Notifications',
      status: 'offline',
      latencyMs: 34,
      lastChecked: new Date().toISOString(),
      version: 'Resend API v1',
      details: 'Resend integration status has not been checked yet.',
      features: ['Transactional Email', 'Deployment Notifications', 'System Alerts', 'Batch Email Delivery'],
    },
    openai: {
      id: 'openai',
      name: 'OpenAI (Fallback)',
      role: 'Secondary / Fallback AI Provider',
      status: 'offline',
      latencyMs: 44,
      lastChecked: new Date().toISOString(),
      version: 'gpt-4o-mini',
      details: 'Optional fallback provider status has not been checked yet.',
      isFallback: true,
      features: ['Secondary Fallback AI', 'Automatic Failover', 'Zero-Downtime Reasoning', 'Model Redundancy'],
    },
  });

  const [systemSummary, setSystemSummary] = useState({
    overallStatus: 'action_required' as 'all_operational' | 'degraded_performance' | 'action_required',
    primaryAiProvider: 'Cloudflare Workers AI',
    fallbackAiProvider: 'Not configured',
    totalActiveDeployments: 0,
    securedSecretsCount: 0,
    timestamp: new Date().toISOString(),
  });

  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);

  // Deployments Data
  const [deployments, setDeployments] = useState<DeployedApp[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);

  // Notifications Data
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Coding Tasks Data
  const [codingTasks, setCodingTasks] = useState<CodingTask[]>([]);
  const [isExecutingCodeTask, setIsExecutingCodeTask] = useState(false);

  // Audit Logs
  const [logs, setLogs] = useState<AuditLog[]>([]);

  // Dark Mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hub_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('hub_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('hub_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  // Fetch Services Status
  const fetchStatus = async () => {
    setIsRefreshingStatus(true);
    try {
      const res = await apiFetch('/api/status');
      const data = await res.json();
      if (data.success && data.services) {
        setServices(data.services);
        if (data.systemSummary) {
          setSystemSummary(data.systemSummary);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch status:', err);
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  // Fetch Deployments
  const fetchDeployments = async () => {
    try {
      const res = await apiFetch('/api/deployments');
      const data = await res.json();
      if (data.success && data.deployments) {
        setDeployments(data.deployments);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to load deployments.');
    }
  };

  // Fetch Notifications
  const fetchNotifications = async () => {
    try {
      const res = await apiFetch('/api/notifications');
      const data = await res.json();
      if (data.success && data.notifications) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    }
  };

  // Fetch Coding Tasks
  const fetchCodingTasks = async () => {
    try {
      const res = await apiFetch('/api/coding/tasks');
      const data = await res.json();
      if (data.success && data.tasks) {
        setCodingTasks(data.tasks);
      }
    } catch (err) {
      console.warn('Failed to fetch coding tasks:', err);
    }
  };

  // Fetch Logs
  const fetchLogs = async () => {
    try {
      const res = await apiFetch('/api/logs');
      const data = await res.json();
      if (data.success && data.logs) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.warn('Failed to fetch logs:', err);
    }
  };

  // Fetch Auth User
  const fetchAuthUser = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await apiFetch('/api/auth/me', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success && data.user) {
        setCurrentUser(data.user);
      }
    } catch (err) {
      console.warn('Failed to fetch auth user:', err);
    }
  };

  // Initial Data Load
  useEffect(() => {
    fetchAuthUser();
    fetchStatus();
    fetchDeployments();
    fetchNotifications();
    fetchCodingTasks();
    fetchLogs();
  }, []);

  // Trigger Deployment
  const handleTriggerDeploy = async (appId: string) => {
    setActionError(null);
    setIsDeploying(true);
    try {
      const res = await apiFetch('/api/deployments/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId, user: currentUser.email }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchDeployments();
        await fetchLogs();
        await fetchNotifications();
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Deployment failed.');
    } finally {
      setIsDeploying(false);
    }
  };

  // Rollback Deployment
  const handleRollbackDeploy = async (appId: string) => {
    setActionError(null);
    setIsDeploying(true);
    try {
      const res = await apiFetch('/api/deployments/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId, user: currentUser.email }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchDeployments();
        await fetchLogs();
        await fetchNotifications();
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Rollback failed.');
    } finally {
      setIsDeploying(false);
    }
  };

  // Execute Coding Agent Task
  const handleExecuteCodingTask = async (prompt: string, repo: string, branch: string) => {
    setActionError(null);
    setIsExecutingCodeTask(true);
    try {
      const res = await apiFetch('/api/coding/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, repo, branch, user: currentUser.email }),
      });
      const data = await res.json();
      if (data.success && data.task) {
        setCodingTasks((prev) => [data.task, ...prev]);
        await fetchNotifications();
        await fetchLogs();
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Coding request failed.');
    } finally {
      setIsExecutingCodeTask(false);
    }
  };

  return (

      <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#0f1117] text-[#1a1d24] dark:text-[#f0f3f6] flex flex-col antialiased">
        {actionError && <div role="alert" className="fixed bottom-4 left-4 right-4 z-[10000] rounded-xl border border-red-200 shadow-lg bg-red-50 text-red-800 px-4 py-3 flex justify-between"><span>{actionError}</span><button onClick={() => setActionError(null)} aria-label="Dismiss error">×</button></div>}
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          isSidebarOpen={isSidebarOpen}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          currentUser={currentUser}
          onUserUpdate={setCurrentUser}
        />

        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar Navigation */}
          <Sidebar
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen((prev) => !prev)}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isDarkMode={isDarkMode}
            onToggleDarkMode={toggleDarkMode}
            currentUser={currentUser}
          />

          {/* Main Content View */}
          <main
            className={`flex-1 chat-dot-bg ${
              activeTab === 'chat'
                ? 'flex flex-col h-[calc(100vh-65px)] overflow-hidden p-2 sm:p-4'
                : 'overflow-y-auto p-4 sm:p-6 lg:p-8'
            }`}
          >
            <div
              className={`w-full max-w-6xl mx-auto ${
                activeTab === 'chat' ? 'flex-1 flex flex-col h-full min-h-0' : ''
              }`}
            >
              {/* Breadcrumb Navigation Trail */}
              <BreadcrumbNav
                activeTab={activeTab}
                onNavigate={setActiveTab}
                selectedChatSessionId={selectedChatSessionId}
                onClearChatSession={() => setSelectedChatSessionId(null)}
              />

              {activeTab === 'agents' && <AgentsPlatform />}

              {activeTab === 'status' && (
                <StatusDashboard
                  services={services}
                  systemSummary={systemSummary}
                  onRefresh={fetchStatus}
                  isRefreshing={isRefreshingStatus}
                  onNavigateToCoding={() => setActiveTab('coding')}
                  onNavigateToDeployments={() => setActiveTab('deployments')}
                  onNavigateToNotifications={() => setActiveTab('notifications')}
                />
              )}

              {activeTab === 'worker' && <WorkerAgent />}

              {activeTab === 'chat' && (
                <DevaiChat
                  activeSessionId={selectedChatSessionId}
                  onSelectSession={setSelectedChatSessionId}
                  onNavigateToHistory={() => setActiveTab('chathistory')}
                  onNavigateToKnowledge={() => setActiveTab('knowledge')}
                />
              )}

              {activeTab === 'chathistory' && (
                <ChatHistory
                  onOpenSession={(id) => {
                    setSelectedChatSessionId(id);
                    setActiveTab('chat');
                  }}
                  onCreateNewChat={async () => {
                    try {
                      const res = await apiFetch('/api/chat/sessions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title: 'Fresh Chat' }),
                      });
                      const data = await res.json();
                      if (data.success && data.session) {
                        setSelectedChatSessionId(data.session.id);
                      }
                    } catch (e) {
                      console.error('Failed to create fresh chat:', e);
                    }
                    setActiveTab('chat');
                  }}
                />
              )}

              {activeTab === 'coding' && (
                <CodingAgent
                  tasks={codingTasks}
                  onExecuteTask={handleExecuteCodingTask}
                  isLoading={isExecutingCodeTask}
                />
              )}

              {activeTab === 'deployments' && (
                <DeploymentsMonitor
                  deployments={deployments}
                  onTriggerDeploy={handleTriggerDeploy}
                  onRollbackDeploy={handleRollbackDeploy}
                  isLoading={isDeploying}
                />
              )}

              {activeTab === 'notifications' && (
                <NotificationsFeed notifications={notifications} />
              )}

              {activeTab === 'logs' && (
                <AuditLogs logs={logs} onRefresh={fetchLogs} />
              )}

              {activeTab === 'knowledge' && <KnowledgeCenter />}

              {activeTab === 'docs' && <DocsViewer />}

              {activeTab === 'export' && <ExportKit />}
            </div>
          </main>
        </div>
      </div>

  );
}
