/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth, googleAuthProvider } from './lib/firebase.ts';
import {
  LayoutDashboard,
  Users,
  MessagesSquare,
  Sparkles,
  MessageCircle,
  Megaphone,
  BriefcaseBusiness,
  CalendarClock,
  UsersRound,
  ChartNoAxesCombined,
  PlugZap,
  Settings,
  Volume2,
  BookOpen,
  Workflow,
  CreditCard,
  FileText,
  PauseCircle,
  PlayCircle,
  Smartphone,
  Copy,
  Download,
  Menu,
  X,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { BootstrapPayload, NavSection } from './types.ts';
import { usePWAInstall, useOnlineStatus } from './usePWAInstall.ts';
import {
  InboxModule,
  ChannelsAndBoostModule,
  AiAgentsModule,
  KnowledgeModule,
  VoiceAiModule,
} from './components/ChannelModules.tsx';
import {
  ContactsModule,
  PipelineModule,
  TasksAndCalendarModule,
  WorkflowsModule,
  AnalyticsModule,
  TeamAndSecurityModule,
  IntegrationsModule,
  BillingModule,
  SettingsModule,
  AuditLogsModule,
} from './components/CrmAndAdminModules.tsx';
import { AndroidPlayLaunchModal } from './components/AndroidPlayLaunchModal.tsx';

export default function App() {
  const [activeNav, setActiveNav] = useState<NavSection>('dashboard');
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string>('demo-session-token');
  const [activeTenantSlug, setActiveTenantSlug] = useState<string>('');
  const [data, setData] = useState<BootstrapPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showAndroidGuide, setShowAndroidGuide] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Executive Dashboard Filter & Quick Add Lead Modal State
  const [dashTimeFilter, setDashTimeFilter] = useState<'all' | 'today' | '7d' | 'month'>('all');
  const [dashStatusFilter, setDashStatusFilter] = useState<string>('all');
  const [dashSearch, setDashSearch] = useState<string>('');
  const [showQuickLeadModal, setShowQuickLeadModal] = useState<boolean>(false);
  const [quickName, setQuickName] = useState<string>('');
  const [quickPhone, setQuickPhone] = useState<string>('');
  const [quickNationality, setQuickNationality] = useState<string>('');
  const [quickJob, setQuickJob] = useState<string>('');
  const [quickDestination, setQuickDestination] = useState<string>('');
  const [quickChannel, setQuickChannel] = useState<string>('whatsapp');
  const [quickStage, setQuickStage] = useState<string>('New Lead');
  const [quickValue, setQuickValue] = useState<string>('4800');
  const [quickNotes, setQuickNotes] = useState<string>('');

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();

  const notify = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => {
      setToast((prev) => (prev?.msg === msg ? null : prev));
    }, 4500);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (usr) => {
      if (usr) {
        setFirebaseUser(usr);
        const token = await usr.getIdToken();
        setActiveTenantSlug('');
        setIdToken(token);
      } else {
        setFirebaseUser(null);
        setActiveTenantSlug('');
        setIdToken('demo-session-token');
      }
    });
    return () => unsub();
  }, []);

  const apiFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
        'x-demo-workspace': 'true',
        ...(options.headers as Record<string, string>),
      };
      if (activeTenantSlug) {
        headers['x-tenant-slug'] = activeTenantSlug;
      }
      if (firebaseUser) {
        headers['x-actor-uid'] = firebaseUser.uid;
        headers['x-actor-email'] = firebaseUser.email || '';
        headers['x-actor-name'] = firebaseUser.displayName || '';
      }

      const res = await fetch(url, {
        ...options,
        headers,
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || `Request failed with status ${res.status}`);
      }
      return json;
    },
    [idToken, activeTenantSlug, firebaseUser]
  );

  const loadBootstrap = useCallback(async () => {
    try {
      setErrorMsg(null);
      const payload: BootstrapPayload = await apiFetch('/api/bootstrap');
      setData(payload);
      if (payload.activeTenant?.slug && payload.activeTenant.slug !== activeTenantSlug) {
        setActiveTenantSlug(payload.activeTenant.slug);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load ConnectAI CRM workspace');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, activeTenantSlug]);

  useEffect(() => {
    loadBootstrap();
  }, [loadBootstrap]);

  const handleGoogleSignIn = async () => {
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const token = await cred.user.getIdToken();
      setFirebaseUser(cred.user);
      setIdToken(token);
      notify(`Signed in with Google as ${cred.user.email}`);
    } catch (err: any) {
      notify(err.message || 'Google Sign-In cancelled or failed', 'error');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setFirebaseUser(null);
    setIdToken('demo-session-token');
    notify('Switched to Sandbox Workspace Owner session.');
  };

  const handleToggleEmergencyPause = async () => {
    if (!data) return;
    try {
      const nextPause = !data.activeTenant.emergencyPause;
      await apiFetch('/api/tenants/settings', {
        method: 'POST',
        body: JSON.stringify({ emergencyPause: nextPause }),
      });
      await loadBootstrap();
      notify(
        nextPause
          ? 'EMERGENCY AI PAUSE ACTIVATED — All automatic AI outbound messages halted.'
          : 'Emergency AI Pause lifted — Automatic AI responses resumed.'
      );
    } catch (err: any) {
      notify(err.message || 'Failed to toggle emergency pause', 'error');
    }
  };

  const handleQuickCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;
    try {
      await apiFetch('/api/leads', {
        method: 'POST',
        body: JSON.stringify({
          title: `${quickName} — ${quickJob || 'Candidate / Opportunity'} (${quickDestination || 'Global'})`,
          contactName: quickName,
          phone: quickPhone,
          nationality: quickNationality,
          preferredJob: quickJob,
          destinationCountry: quickDestination,
          sourceChannel: quickChannel,
          stage: quickStage,
          estimatedValueUsd: quickValue,
          leadScore: 85,
          extractedRequirements:
            quickNotes ||
            `${quickJob || 'Candidate'} · Destination: ${quickDestination || 'Global'} · Nationality: ${quickNationality || 'International'}`,
          notes: quickNotes,
        }),
      });
      setQuickName('');
      setQuickPhone('');
      setQuickNationality('');
      setQuickJob('');
      setQuickDestination('');
      setQuickNotes('');
      setShowQuickLeadModal(false);
      await loadBootstrap();
      notify(`Added new candidate/lead "${quickName}" to Recruitment Pipeline (${quickStage}).`);
    } catch (err: any) {
      notify(err.message || 'Failed to create lead', 'error');
    }
  };

  // Redesigned Executive Navigation (Preserving all 17 functional modules)
  const primaryNavItems: {
    id: NavSection;
    label: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'contacts', label: 'Lead Center', icon: Users },
    { id: 'inbox', label: 'Unified Inbox', icon: MessagesSquare },
    { id: 'ai_agents', label: 'AI Copilot', icon: Sparkles },
    { id: 'channels', label: 'WhatsApp & Channels', icon: MessageCircle },
    { id: 'campaigns', label: 'Campaign Studio', icon: Megaphone },
    { id: 'pipeline', label: 'Recruitment Pipeline', icon: BriefcaseBusiness },
    { id: 'tasks', label: 'Follow-up Tasks', icon: CalendarClock },
    { id: 'team', label: 'Team & Performance', icon: UsersRound },
    { id: 'analytics', label: 'Analytics & Reports', icon: ChartNoAxesCombined },
    { id: 'integrations', label: 'Integrations', icon: PlugZap },
    { id: 'settings', label: 'Settings & Security', icon: Settings },
  ];

  const extendedNavItems: {
    id: NavSection;
    label: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    { id: 'voice_ai', label: 'Voice AI & Calling', icon: Volume2 },
    { id: 'knowledge', label: 'Vision & Knowledge', icon: BookOpen },
    { id: 'workflows', label: 'Workflow Automation', icon: Workflow },
    { id: 'billing', label: 'Billing & Usage', icon: CreditCard },
    { id: 'audit_logs', label: 'Security Audit Trail', icon: FileText },
  ];

  const allNavItems = [...primaryNavItems, ...extendedNavItems];

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-md w-full space-y-3 text-center shadow-2xl">
          <div className="text-base font-bold text-white tracking-tight">
            Initializing ConnectAI Executive Workspace...
          </div>
          <p className="text-xs text-slate-400">
            Connecting to Multi-Tenant PostgreSQL & Gemini AI Services
          </p>
        </div>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-lg w-full space-y-4 shadow-sm">
          <h1 className="text-base font-semibold text-rose-700">Workspace Initialization Error</h1>
          <p className="text-xs text-slate-700">{errorMsg}</p>
          <button
            onClick={loadBootstrap}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Real calculated KPIs from PostgreSQL
  const activeLeads = data.leads.filter((l) => !l.isArchived);
  const filteredDashLeads = activeLeads.filter((l) => {
    if (dashStatusFilter !== 'all' && l.stage !== dashStatusFilter) return false;
    if (dashSearch.trim()) {
      const q = dashSearch.toLowerCase();
      return (
        l.contactName.toLowerCase().includes(q) ||
        l.title.toLowerCase().includes(q) ||
        (l.preferredJob || '').toLowerCase().includes(q) ||
        (l.destinationCountry || '').toLowerCase().includes(q) ||
        l.ownerName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalNumbers = data.phoneNumbers.length;
  const whatsappNumbersCount = data.phoneNumbers.filter((n) => n.channelType === 'whatsapp').length;
  const socialChannelsCount = data.phoneNumbers.filter((n) => n.channelType !== 'whatsapp').length;
  const liveConnectedChannels = data.phoneNumbers.filter(
    (n) => n.connectionStatus === 'connected_live'
  ).length;

  const totalConversations = data.conversations.length;
  const aiAutoCount = data.conversations.filter((c) => c.handlingMode === 'ai_auto').length;
  const humanManagedCount = totalConversations - aiAutoCount;

  const totalPipelineUsd = filteredDashLeads.reduce(
    (sum, l) => sum + (Number(l.estimatedValueUsd) || 0),
    0
  );
  const qualifiedLeadsCount = filteredDashLeads.filter((l) =>
    ['Qualified', 'Employer Review', 'Offer', 'Visa Process', 'Deployed', 'Meeting Booked', 'Proposal Sent', 'Negotiation', 'Won'].includes(
      l.stage
    )
  ).length;
  const closedWonCount = filteredDashLeads.filter((l) =>
    ['Deployed', 'Won'].includes(l.stage)
  ).length;
  const pendingTasksCount = data.tasks.filter((t) => t.status !== 'completed').length;
  const pendingApprovalsCount = data.approvals.filter((a) => a.status === 'pending').length;
  const campaignLeadsCount = data.socialBoosts.reduce((s, b) => s + b.qualifiedLeadsCount, 0);
  const conversionRate =
    data.contacts.length > 0
      ? Math.min(100, Math.round((qualifiedLeadsCount / data.contacts.length) * 100))
      : 0;

  // Stage distribution for Funnel Visualization
  const funnelStages = [
    { label: 'New & Contacted', stages: ['New Lead', 'Contacted', 'Interested'] },
    { label: 'Qualified & Docs', stages: ['Documents Pending', 'Qualified'] },
    { label: 'Employer & Offer', stages: ['Employer Review', 'Meeting Booked', 'Proposal Sent', 'Offer', 'Negotiation'] },
    { label: 'Visa & Deployed / Won', stages: ['Visa Process', 'Deployed', 'Won'] },
  ];

  // Staff performance summary for Dashboard
  const staffSummaryNames = Array.from(
    new Set([
      'Marcus Chen',
      'Layla Al-Mansoor',
      'Sofia Rossi',
      ...activeLeads.map((l) => l.ownerName).filter(Boolean),
    ])
  ).slice(0, 4);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Executive Navigation Bar: 3 Zones */}
      <header className="flex items-center justify-between gap-6 px-4 sm:px-6 py-3.5 bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-30">
        {/* Zone 1: Mobile Menu Trigger + Single Executive Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <a
            href="#dashboard"
            onClick={(e) => {
              e.preventDefault();
              setActiveNav('dashboard');
            }}
            className="text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            ConnectAI CRM
          </a>
        </div>

        {/* Zone 2: 5 Concise Single-Line Text Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
          <button
            onClick={() => setActiveNav('dashboard')}
            className={`hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              activeNav === 'dashboard' ? 'text-white underline' : ''
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveNav('inbox')}
            className={`hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              activeNav === 'inbox' ? 'text-white underline' : ''
            }`}
          >
            Unified Inbox
          </button>
          <button
            onClick={() => setActiveNav('pipeline')}
            className={`hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              activeNav === 'pipeline' ? 'text-white underline' : ''
            }`}
          >
            Recruitment Pipeline
          </button>
          <button
            onClick={() => setActiveNav('ai_agents')}
            className={`hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              activeNav === 'ai_agents' ? 'text-white underline' : ''
            }`}
          >
            AI Copilot
          </button>
          <button
            onClick={() => setActiveNav('campaigns')}
            className={`hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              activeNav === 'campaigns' ? 'text-white underline' : ''
            }`}
          >
            Campaign Studio
          </button>
        </nav>

        {/* Zone 3: Primary Action & Auth */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowAndroidGuide(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
            Web Link & Android App
          </button>

          {firebaseUser ? (
            <button
              onClick={handleSignOut}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors whitespace-nowrap shrink-0"
            >
              Sign Out ({firebaseUser.email?.split('@')[0]})
            </button>
          ) : (
            <button
              onClick={handleGoogleSignIn}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors whitespace-nowrap shrink-0"
            >
              Sign In with Google
            </button>
          )}
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-50 w-72 max-w-[85vw] bg-slate-900 text-slate-100 h-full overflow-y-auto p-4 flex flex-col justify-between border-r border-slate-800">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="font-bold text-sm text-white">ConnectAI Navigation</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile Tenant Selector */}
              <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-lg space-y-1.5">
                <div className="text-[11px] text-slate-400">Active Tenant Workspace</div>
                <select
                  value={activeTenantSlug}
                  onChange={(e) => setActiveTenantSlug(e.target.value)}
                  className="w-full text-xs font-semibold text-white bg-slate-900 border border-slate-700 rounded p-1.5"
                >
                  {data.authorizedTenants.map((t) => (
                    <option key={t.id} value={t.slug}>
                      {t.name} (#{t.id})
                    </option>
                  ))}
                </select>
                <div className="text-[11px] font-mono text-slate-400">
                  Role: {data.membership?.role || 'company_owner'}
                </div>
              </div>

              <div className="space-y-1">
                <div className="px-2 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Core Workspace
                </div>
                {primaryNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeNav === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveNav(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        active
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1 pt-2 border-t border-slate-800">
                <div className="px-2 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  AI Studio & Governance
                </div>
                {extendedNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeNav === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveNav(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        active
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowAndroidGuide(true);
                }}
                className="w-full py-2 px-3 rounded-lg text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5"
              >
                <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                Web Link & Android Guide
              </button>
              <button
                type="button"
                onClick={handleToggleEmergencyPause}
                className={`w-full py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border ${
                  data.activeTenant.emergencyPause
                    ? 'bg-rose-600 text-white border-rose-500'
                    : 'bg-slate-800 text-slate-200 border-slate-700'
                }`}
              >
                {data.activeTenant.emergencyPause ? (
                  <>
                    <PlayCircle className="w-3.5 h-3.5" />
                    Resume AI Automation
                  </>
                ) : (
                  <>
                    <PauseCircle className="w-3.5 h-3.5" />
                    Emergency AI Pause
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Layout: Dark Navy Executive Sidebar + Crisp Light Content Canvas */}
      <div className="flex-1 flex">
        {/* Left Sidebar Navigation (264px Dark Navy Executive Rail) */}
        <aside className="w-66 bg-slate-900 text-slate-200 border-r border-slate-800 shrink-0 hidden lg:flex flex-col justify-between p-4">
          <div className="space-y-5">
            {/* Multi-Tenant Workspace Selector */}
            <div className="p-3.5 bg-slate-800/70 border border-slate-700/80 rounded-xl space-y-2">
              <div className="text-[11px] font-medium text-slate-400">
                Active Tenant Workspace
              </div>
              <select
                value={activeTenantSlug}
                onChange={(e) => setActiveTenantSlug(e.target.value)}
                className="w-full text-xs font-semibold text-white bg-slate-950 border border-slate-700 rounded-lg p-2"
              >
                {data.authorizedTenants.map((t) => (
                  <option key={t.id} value={t.slug}>
                    {t.name} (#{t.id})
                  </option>
                ))}
              </select>
              <div className="text-[11px] font-mono tabular-nums text-slate-400">
                Role: {data.membership?.role || 'company_owner'} · {data.activeTenant.plan}
              </div>
            </div>

            {/* Primary 12 Navigation Links */}
            <div className="space-y-1">
              <div className="px-2.5 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Recruitment & CRM Suite
              </div>
              <nav className="space-y-0.5">
                {primaryNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeNav === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveNav(item.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Extended AI Studio & Governance Links */}
            <div className="space-y-1 pt-3 border-t border-slate-800">
              <div className="px-2.5 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Voice, Vision & Governance
              </div>
              <nav className="space-y-0.5">
                {extendedNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeNav === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveNav(item.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Sidebar Footer: PWA Install, Android Guide & Emergency AI Pause */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            {isInstallable && !isInstalled && (
              <button
                type="button"
                onClick={install}
                className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Install App on Device
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowAndroidGuide(true)}
              className="w-full py-2 px-3 rounded-lg text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 flex items-center justify-center gap-1.5"
            >
              <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
              Web Link & Android Guide
            </button>

            <button
              onClick={handleToggleEmergencyPause}
              className={`w-full py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-colors ${
                data.activeTenant.emergencyPause
                  ? 'bg-rose-600 text-white border-rose-500'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {data.activeTenant.emergencyPause ? (
                <>
                  <PlayCircle className="w-3.5 h-3.5" />
                  Resume AI Automation
                </>
              ) : (
                <>
                  <PauseCircle className="w-3.5 h-3.5" />
                  Emergency AI Pause
                </>
              )}
            </button>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-[1440px] mx-auto w-full space-y-6 pb-20 lg:pb-8">
          {/* Compact Mobile Quick Bar (Tenant Switcher + Horizontal Tab Strip) */}
          <div className="lg:hidden space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl p-3 text-xs shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Workspace:</span>
                <select
                  value={activeTenantSlug}
                  onChange={(e) => setActiveTenantSlug(e.target.value)}
                  className="font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-md px-2 py-1"
                >
                  {data.authorizedTenants.map((t) => (
                    <option key={t.id} value={t.slug}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                {isInstallable && !isInstalled && (
                  <button
                    type="button"
                    onClick={install}
                    className="px-2.5 py-1 bg-indigo-600 text-white rounded-md font-medium flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" /> Install
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowAndroidGuide(true)}
                  className="px-2.5 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md font-semibold flex items-center gap-1"
                >
                  <Smartphone className="w-3.5 h-3.5" /> Android App Preview
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200">
              {allNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveNav(item.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                      activeNav === item.id
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toast Feedback Banner */}
          {toast && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between shadow-xs ${
                toast.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-950'
              }`}
            >
              <span>{toast.msg}</span>
              <button onClick={() => setToast(null)} className="underline ml-4 font-semibold">
                Dismiss
              </button>
            </div>
          )}

          {/* Contextual Header for Non-Dashboard Modules */}
          {activeNav !== 'dashboard' && (
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
              <div>
                <div className="text-[11px] text-indigo-600 font-mono uppercase tracking-wider font-semibold">
                  {data.activeTenant.name} · {activeNav.replace(/_/g, ' ')}
                </div>
                <h1 className="text-xl font-bold text-slate-900 mt-0.5">
                  {allNavItems.find((n) => n.id === activeNav)?.label}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => setShowQuickLeadModal(true)}
                  className="px-3.5 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add New Lead
                </button>
                <button
                  onClick={() => setActiveNav('inbox')}
                  className="px-3.5 py-2 text-xs font-medium border border-slate-200 bg-white text-slate-800 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  Open Unified Inbox ({totalConversations})
                </button>
              </div>
            </div>
          )}

          {/* 1. EXECUTIVE CONTROL CENTER DASHBOARD VIEW */}
          {activeNav === 'dashboard' && (
            <div className="space-y-6">
              {/* Executive Hero Header */}
              <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="text-xs font-mono uppercase tracking-widest text-indigo-400 font-semibold">
                    YOUR BUSINESS AT A GLANCE
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    Welcome to ConnectAI
                  </h1>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Your intelligent workspace for leads, conversations, recruitment, and growth.
                  </p>
                  <div className="pt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono">
                    <span>Workspace: {data.activeTenant.name}</span>
                    <span aria-hidden="true">·</span>
                    <span>Plan: {data.activeTenant.plan}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      AI Status:{' '}
                      {data.activeTenant.emergencyPause
                        ? 'Paused (Human Only)'
                        : 'Active & Grounded'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowQuickLeadModal(true)}
                    className="min-h-[44px] px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    + Add New Lead
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveNav('inbox')}
                    className="min-h-[44px] px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <MessagesSquare className="w-4 h-4 text-indigo-400" />
                    Open Unified Inbox
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAndroidGuide(true)}
                    className="min-h-[44px] px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    Android App &amp; Play Store
                  </button>
                </div>
              </div>

              {/* Executive Search, Date & Stage Filter Bar */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  {[
                    { id: 'all', label: 'All Activity' },
                    { id: 'today', label: 'Today' },
                    { id: '7d', label: 'Last 7 Days' },
                    { id: 'month', label: 'This Month' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setDashTimeFilter(tab.id as any)}
                      className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                        dashTimeFilter === tab.id
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={dashSearch}
                      onChange={(e) => setDashSearch(e.target.value)}
                      placeholder="Filter leads, candidates, countries..."
                      className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 w-56"
                    />
                  </div>
                  <select
                    value={dashStatusFilter}
                    onChange={(e) => setDashStatusFilter(e.target.value)}
                    className="py-1.5 px-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-medium"
                  >
                    <option value="all">All Recruitment & CRM Stages</option>
                    <option value="New Lead">New Lead</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Interested">Interested</option>
                    <option value="Documents Pending">Documents Pending</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Employer Review">Employer Review</option>
                    <option value="Offer">Offer</option>
                    <option value="Visa Process">Visa Process</option>
                    <option value="Deployed">Deployed</option>
                    <option value="Won">Won</option>
                  </select>
                </div>
              </div>

              {/* 4 Redesigned Executive KPI Cards Calculated from Real PostgreSQL Records */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Connected Channels */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-2xs flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900">
                        Connected Channels
                      </span>
                      <MessageCircle className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Active WhatsApp & Social Lines
                    </div>
                  </div>
                  <div className="text-3xl font-bold font-mono tabular-nums text-slate-900">
                    {totalNumbers}
                  </div>
                  <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    <div className="text-xs text-slate-600 font-mono tabular-nums">
                      {whatsappNumbersCount} WhatsApp · {socialChannelsCount} FB/IG/TikTok
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {liveConnectedChannels > 0
                        ? `${liveConnectedChannels} Live API · ${totalNumbers - liveConnectedChannels} Webhook Sandbox`
                        : 'Webhook Simulator Ready · Add API Token for Live Dispatch'}
                    </div>
                  </div>
                </div>

                {/* Card 2: Live Conversations */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-2xs flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900">
                        Live Conversations
                      </span>
                      <MessagesSquare className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Customer & Candidate Threads
                    </div>
                  </div>
                  <div className="text-3xl font-bold font-mono tabular-nums text-slate-900">
                    {totalConversations}
                  </div>
                  <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    <div className="text-xs text-slate-600 font-mono tabular-nums">
                      {aiAutoCount} AI-Assisted · {humanManagedCount} Human-Managed
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full"
                        style={{
                          width: `${
                            totalConversations > 0
                              ? Math.round((aiAutoCount / totalConversations) * 100)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card 3: Qualified Pipeline */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-2xs flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900">
                        Qualified Pipeline
                      </span>
                      <BriefcaseBusiness className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Verified Opportunity Value
                    </div>
                  </div>
                  <div className="text-3xl font-bold font-mono tabular-nums text-emerald-700">
                    ${totalPipelineUsd.toLocaleString()}
                  </div>
                  <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    <div className="text-xs text-slate-600 font-mono tabular-nums">
                      {filteredDashLeads.length} Active Leads · {data.contacts.length} Contacts
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Conversion: {conversionRate}% · {closedWonCount} Deployed/Won
                    </div>
                  </div>
                </div>

                {/* Card 4: Campaign Leads */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-2xs flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900">
                        Campaign Leads
                      </span>
                      <Megaphone className="w-4 h-4 text-violet-600" />
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Social & WhatsApp Lead Capture
                    </div>
                  </div>
                  <div className="text-3xl font-bold font-mono tabular-nums text-slate-900">
                    {campaignLeadsCount}
                  </div>
                  <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    <div className="text-xs text-slate-600 font-mono tabular-nums">
                      {pendingApprovalsCount} Pending Approvals · {pendingTasksCount} Follow-ups
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Across {data.socialBoosts.length} Instagram, FB & TikTok Campaigns
                    </div>
                  </div>
                </div>
              </div>

              {/* Recruitment & Sales Funnel + Staff Performance Row */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Recruitment & Opportunity Stage Funnel */}
                <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-2xs flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-semibold text-slate-900">
                          Recruitment & Opportunity Pipeline Funnel
                        </h2>
                        <p className="text-xs text-slate-500">
                          Live distribution across candidate & client progression stages
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveNav('pipeline')}
                        className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        Open Pipeline <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-3 pt-1">
                      {funnelStages.map((group) => {
                        const groupLeads = filteredDashLeads.filter((l) =>
                          group.stages.includes(l.stage)
                        );
                        const groupVal = groupLeads.reduce(
                          (s, l) => s + (Number(l.estimatedValueUsd) || 0),
                          0
                        );
                        const pct =
                          filteredDashLeads.length > 0
                            ? Math.max(
                                8,
                                Math.round((groupLeads.length / filteredDashLeads.length) * 100)
                              )
                            : 8;
                        return (
                          <div key={group.label} className="space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-800">{group.label}</span>
                              <span className="font-mono tabular-nums text-slate-600">
                                {groupLeads.length} leads · ${groupVal.toLocaleString()}
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-indigo-600 h-full rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Lead Qualification Rate: <strong className="text-slate-900">{conversionRate}%</strong>
                    </span>
                    <span>
                      Closed / Deployed: <strong className="text-emerald-700">{closedWonCount}</strong>
                    </span>
                  </div>
                </div>

                {/* Staff Performance & Recent Follow-Ups */}
                <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-2xs flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-semibold text-slate-900">
                          Team Performance & Upcoming Follow-Ups
                        </h2>
                        <p className="text-xs text-slate-500">
                          Recruiter & sales ownership metrics plus scheduled tasks
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveNav('team')}
                        className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        Team Scorecard <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500">
                            <th className="py-2 pr-3 font-medium">Staff Member</th>
                            <th className="py-2 px-3 font-medium text-right">Leads</th>
                            <th className="py-2 px-3 font-medium text-right">Live Threads</th>
                            <th className="py-2 pl-3 font-medium text-right">Pipeline Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {staffSummaryNames.map((name) => {
                            const sLeads = filteredDashLeads.filter((l) => l.ownerName === name);
                            const sConvs = data.conversations.filter(
                              (c) => c.assignedEmployee === name
                            );
                            const sVal = sLeads.reduce(
                              (acc, l) => acc + (Number(l.estimatedValueUsd) || 0),
                              0
                            );
                            return (
                              <tr key={name} className="hover:bg-slate-50">
                                <td className="py-2 pr-3 font-semibold text-slate-900">{name}</td>
                                <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                                  {sLeads.length}
                                </td>
                                <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                                  {sConvs.length}
                                </td>
                                <td className="py-2 pl-3 text-right font-mono tabular-nums font-semibold text-emerald-700">
                                  ${sVal.toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Upcoming Follow-Ups Strip */}
                    <div className="pt-2 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">
                          Next Follow-Up Tasks ({pendingTasksCount} pending)
                        </span>
                        <button
                          onClick={() => setActiveNav('tasks')}
                          className="text-indigo-600 hover:underline"
                        >
                          Manage Tasks
                        </button>
                      </div>
                      {data.tasks.slice(0, 2).map((task) => (
                        <div
                          key={task.id}
                          className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            {task.status === 'completed' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            )}
                            <span className="truncate font-medium text-slate-800">
                              {task.title}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] text-slate-500 shrink-0">
                            {task.dueDate}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Omnichannel Fleet + Active AI Capabilities Split */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Connected WhatsApp & Social Channels Summary */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">
                        Connected WhatsApp Business Fleet & Social Channels
                      </h2>
                      <p className="text-xs text-slate-500">
                        Transparent status across official WhatsApp Cloud API, Instagram, Facebook & TikTok lines
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveNav('channels')}
                      className="text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      Manage Fleet ({data.phoneNumbers.length})
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="py-2 pr-3 font-medium">Endpoint</th>
                          <th className="py-2 px-3 font-medium">Channel</th>
                          <th className="py-2 px-3 font-medium">Department / Staff</th>
                          <th className="py-2 px-3 font-medium">Provider Status</th>
                          <th className="py-2 pl-3 font-medium text-right">AI Mode</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {data.phoneNumbers.map((num) => (
                          <tr key={num.id} className="hover:bg-slate-50">
                            <td className="py-2.5 pr-3">
                              <div className="font-mono tabular-nums font-semibold text-slate-900">
                                {num.phoneNumber}
                              </div>
                              <div className="text-slate-500">{num.displayName}</div>
                            </td>
                            <td className="py-2.5 px-3 uppercase font-mono text-[11px] text-slate-700">
                              {num.channelType}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">
                              {num.department} · {num.assignedStaffName}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                              {num.connectionStatus === 'connected_live'
                                ? 'Live Graph API'
                                : 'Webhook Sandbox Ready'}
                            </td>
                            <td className="py-2.5 pl-3 text-right font-mono text-indigo-600 font-medium">
                              {num.aiStatus.replace(/_/g, ' ')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Active AI Agents & Gemini Capabilities */}
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-4 shadow-2xs">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-semibold text-slate-900">
                        AI Copilot & Gemini Intelligence Suite
                      </h2>
                      <button
                        onClick={() => setActiveNav('ai_agents')}
                        className="text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        Open AI Copilot
                      </button>
                    </div>
                    <div className="space-y-2.5 text-xs">
                      <div className="p-3 border border-slate-200 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">
                            AI Recruitment & Candidate Copilot
                          </div>
                          <div className="text-slate-500">
                            Screen candidates, generate interview questions & score fit
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveNav('ai_agents')}
                          className="font-mono text-indigo-600 underline shrink-0"
                        >
                          Launch Copilot
                        </button>
                      </div>

                      <div className="p-3 border border-slate-200 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">
                            Grounded RAG & Knowledge Replies
                          </div>
                          <div className="text-slate-500">
                            Answers strictly from {data.knowledgeDocuments.length} approved documents
                          </div>
                        </div>
                        <span className="font-mono text-emerald-700 shrink-0">gemini-3.8-flash</span>
                      </div>

                      <div className="p-3 border border-slate-200 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">
                            Live Google Search Market Grounding
                          </div>
                          <div className="text-slate-500">
                            Real-time ad research & recruitment market benchmarks
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveNav('campaigns')}
                          className="font-mono text-indigo-600 underline shrink-0"
                        >
                          Open Search
                        </button>
                      </div>

                      <div className="p-3 border border-slate-200 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">
                            Voice AI & CV/Document Vision Scanner
                          </div>
                          <div className="text-slate-500">
                            24kHz WAV TTS studio & Gemini 4 Argon document OCR
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveNav('knowledge')}
                          className="font-mono text-indigo-600 underline shrink-0"
                        >
                          Open Scanner
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                    <span>Tenant Isolation: Verified (Tenant #{data.activeTenant.id})</span>
                    <button
                      onClick={() => setActiveNav('audit_logs')}
                      className="text-slate-900 font-semibold underline"
                    >
                      Audit Trail ({data.auditLogs.length})
                    </button>
                  </div>
                </div>
              </div>

              {/* Campaign Studio Performance Strip */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      Campaign Studio — Social & WhatsApp Lead Capture (Instagram · Facebook CTWA · TikTok)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Boosted social campaigns routed to AI agents in the Unified Inbox for automatic candidate & client qualification.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveNav('campaigns')}
                    className="px-3.5 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Open Campaign Studio
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {data.socialBoosts.map((boost) => (
                    <div
                      key={boost.id}
                      className="p-4 border border-slate-200 rounded-xl space-y-2 text-xs hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center justify-between text-slate-500 font-mono">
                        <span className="uppercase font-semibold text-indigo-600">
                          {boost.channelType}
                        </span>
                        <span>${boost.dailyBudgetUsd}/day</span>
                      </div>
                      <div className="font-semibold text-sm text-slate-900">
                        {boost.campaignName}
                      </div>
                      <p className="text-slate-600 line-clamp-2">{boost.adCopy}</p>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between font-mono tabular-nums text-slate-800">
                        <span>{boost.impressions.toLocaleString()} impr</span>
                        <span>{boost.conversationsStarted} AI chats</span>
                        <span className="text-emerald-700 font-semibold">
                          {boost.qualifiedLeadsCount} leads
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. UNIFIED INBOX */}
          {activeNav === 'inbox' && (
            <InboxModule
              data={data}
              apiFetch={apiFetch}
              onRefresh={loadBootstrap}
              notify={notify}
            />
          )}

          {/* 3. WHATSAPP & CHANNELS */}
          {activeNav === 'channels' && (
            <ChannelsAndBoostModule
              key="channels-view"
              initialSection="channels"
              data={data}
              apiFetch={apiFetch}
              onRefresh={loadBootstrap}
              notify={notify}
            />
          )}

          {/* 4. CAMPAIGN STUDIO */}
          {activeNav === 'campaigns' && (
            <ChannelsAndBoostModule
              key="campaigns-view"
              initialSection="campaigns"
              data={data}
              apiFetch={apiFetch}
              onRefresh={loadBootstrap}
              notify={notify}
            />
          )}

          {/* 5. LEAD CENTER (CONTACTS & DUPLICATE CONSOLIDATION) */}
          {activeNav === 'contacts' && (
            <ContactsModule
              data={data}
              apiFetch={apiFetch}
              onRefresh={loadBootstrap}
              notify={notify}
            />
          )}

          {/* 6. RECRUITMENT PIPELINE */}
          {activeNav === 'pipeline' && (
            <PipelineModule
              data={data}
              apiFetch={apiFetch}
              onRefresh={loadBootstrap}
              notify={notify}
            />
          )}

          {/* 7. FOLLOW-UP TASKS & INTERVIEWS */}
          {activeNav === 'tasks' && (
            <TasksAndCalendarModule
              data={data}
              apiFetch={apiFetch}
              onRefresh={loadBootstrap}
              notify={notify}
            />
          )}

          {/* 8. AI COPILOT & AI AGENTS */}
          {activeNav === 'ai_agents' && (
            <AiAgentsModule
              data={data}
              apiFetch={apiFetch}
              onRefresh={loadBootstrap}
              notify={notify}
            />
          )}

          {/* 9. KNOWLEDGE BASE & GEMINI 4 ARGON VISION SCANNER */}
          {activeNav === 'knowledge' && (
            <KnowledgeModule
              data={data}
              apiFetch={apiFetch}
              onRefresh={loadBootstrap}
              notify={notify}
            />
          )}

          {/* 10. WORKFLOW AUTOMATION & APPROVALS */}
          {activeNav === 'workflows' && (
            <WorkflowsModule
              data={data}
              apiFetch={apiFetch}
              onRefresh={loadBootstrap}
              notify={notify}
            />
          )}

          {/* 11. VOICE AI & WHATSAPP CALLING */}
          {activeNav === 'voice_ai' && (
            <VoiceAiModule
              data={data}
              apiFetch={apiFetch}
              onRefresh={loadBootstrap}
              notify={notify}
            />
          )}

          {/* 12. ANALYTICS & REPORTS */}
          {activeNav === 'analytics' && (
            <AnalyticsModule
              data={data}
              apiFetch={apiFetch}
              onRefresh={loadBootstrap}
              notify={notify}
            />
          )}

          {/* 13. TEAM & PERFORMANCE */}
          {activeNav === 'team' && (
            <TeamAndSecurityModule
              data={data}
              apiFetch={apiFetch}
              onRefresh={loadBootstrap}
              notify={notify}
            />
          )}

          {/* 14. INTEGRATIONS */}
          {activeNav === 'integrations' && (
            <IntegrationsModule
              data={data}
              apiFetch={apiFetch}
              onRefresh={loadBootstrap}
              notify={notify}
            />
          )}

          {/* 15. BILLING & USAGE */}
          {activeNav === 'billing' && (
            <BillingModule
              data={data}
              apiFetch={apiFetch}
              onRefresh={loadBootstrap}
              notify={notify}
            />
          )}

          {/* 16. SETTINGS & SECURITY */}
          {activeNav === 'settings' && (
            <SettingsModule
              data={data}
              apiFetch={apiFetch}
              onRefresh={loadBootstrap}
              notify={notify}
            />
          )}

          {/* 17. AUDIT LOGS */}
          {activeNav === 'audit_logs' && <AuditLogsModule data={data} />}
        </main>
      </div>

      {/* Mobile Sticky Bottom Navigation Bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-slate-950 text-slate-300 border-t border-slate-800 grid grid-cols-5 lg:hidden py-1.5 px-2 text-[10px]">
        {[
          { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
          { id: 'inbox', label: 'Inbox', icon: MessagesSquare },
          { id: 'pipeline', label: 'Pipeline', icon: BriefcaseBusiness },
          { id: 'ai_agents', label: 'AI Copilot', icon: Sparkles },
          { id: 'contacts', label: 'Leads', icon: Users },
        ].map((item) => {
          const Icon = item.icon;
          const active = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id as NavSection)}
              className={`flex flex-col items-center justify-center gap-1 py-1 rounded-lg ${
                active ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Quick Add New Lead / Candidate Modal */}
      {showQuickLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 overflow-y-auto">
          <form
            onSubmit={handleQuickCreateLead}
            className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  + Add New Candidate or Business Lead
                </h2>
                <p className="text-xs text-slate-500">
                  Creates a synchronized Contact and Recruitment Pipeline record in PostgreSQL.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickLeadModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Candidate / Contact Name *
                </label>
                <input
                  type="text"
                  required
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  placeholder="Elena Rostova"
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Phone / WhatsApp Number
                </label>
                <input
                  type="text"
                  value={quickPhone}
                  onChange={(e) => setQuickPhone(e.target.value)}
                  placeholder="+44 7700 900511"
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nationality</label>
                <input
                  type="text"
                  value={quickNationality}
                  onChange={(e) => setQuickNationality(e.target.value)}
                  placeholder="e.g. Poland, Philippines, India"
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Preferred Job / Role</label>
                <input
                  type="text"
                  value={quickJob}
                  onChange={(e) => setQuickJob(e.target.value)}
                  placeholder="e.g. Registered Nurse / Fleet Manager"
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Destination Country
                </label>
                <input
                  type="text"
                  value={quickDestination}
                  onChange={(e) => setQuickDestination(e.target.value)}
                  placeholder="e.g. United Kingdom, UAE, Germany"
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Source Channel</label>
                <select
                  value={quickChannel}
                  onChange={(e) => setQuickChannel(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="whatsapp">WhatsApp Business</option>
                  <option value="instagram">Instagram Boost</option>
                  <option value="facebook">Facebook CTWA</option>
                  <option value="tiktok">TikTok Business</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Initial Stage</label>
                <select
                  value={quickStage}
                  onChange={(e) => setQuickStage(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="New Lead">New Lead</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Interested">Interested</option>
                  <option value="Documents Pending">Documents Pending</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Employer Review">Employer Review</option>
                  <option value="Offer">Offer</option>
                  <option value="Visa Process">Visa Process</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Estimated Placement / Deal Value ($)
                </label>
                <input
                  type="number"
                  value={quickValue}
                  onChange={(e) => setQuickValue(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-medium text-slate-700 mb-1">
                Candidate Qualifications & Notes
              </label>
              <textarea
                rows={2}
                value={quickNotes}
                onChange={(e) => setQuickNotes(e.target.value)}
                placeholder="Valid passport, English B2+, available for interview this week..."
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowQuickLeadModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700"
              >
                Save Lead to Workspace
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Offline Connectivity Banner */}
      {!isOnline && (
        <div className="fixed bottom-14 lg:bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-medium text-white shadow-lg">
          Offline Mode — Cached PWA assets active; live API requests will sync when online.
        </div>
      )}

      {/* Android App & Google Play Launch Studio Modal */}
      {showAndroidGuide && (
        <AndroidPlayLaunchModal
          onClose={() => setShowAndroidGuide(false)}
          data={data}
          apiFetch={apiFetch}
          onRefresh={loadBootstrap}
          notify={notify}
          isInstallable={isInstallable}
          isInstalled={isInstalled}
          isIOS={isIOS}
          onInstallPwa={install}
        />
      )}
    </div>
  );
}
