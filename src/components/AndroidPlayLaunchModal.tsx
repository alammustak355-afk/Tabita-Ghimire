import React, { useEffect, useState } from 'react';
import {
  Smartphone,
  Download,
  Copy,
  CheckCircle2,
  ShieldCheck,
  Code2,
  FileText,
  ExternalLink,
  X,
  RefreshCw,
  Menu,
  Plus,
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
  Send,
} from 'lucide-react';
import { BootstrapPayload } from '../types.ts';

interface AndroidPlayLaunchModalProps {
  onClose: () => void;
  data: BootstrapPayload;
  apiFetch: (url: string, options?: RequestInit) => Promise<any>;
  onRefresh: () => Promise<void>;
  notify: (msg: string, type?: 'success' | 'error') => void;
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  onInstallPwa: () => void;
}

type ComposeScreenId =
  | 'overview'
  | 'leads'
  | 'inbox'
  | 'copilot'
  | 'channels'
  | 'campaigns'
  | 'pipeline'
  | 'tasks'
  | 'team'
  | 'analytics'
  | 'integrations'
  | 'settings';

const COMPOSE_NAV_ITEMS: { id: ComposeScreenId; label: string; icon: any }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'leads', label: 'Lead Center', icon: Users },
  { id: 'inbox', label: 'Unified Inbox', icon: MessagesSquare },
  { id: 'copilot', label: 'AI Copilot', icon: Sparkles },
  { id: 'channels', label: 'WhatsApp & Channels', icon: MessageCircle },
  { id: 'campaigns', label: 'Campaign Studio', icon: Megaphone },
  { id: 'pipeline', label: 'Recruitment Pipeline', icon: BriefcaseBusiness },
  { id: 'tasks', label: 'Follow-up Tasks', icon: CalendarClock },
  { id: 'team', label: 'Team & Performance', icon: UsersRound },
  { id: 'analytics', label: 'Analytics & Reports', icon: ChartNoAxesCombined },
  { id: 'integrations', label: 'Integrations', icon: PlugZap },
  { id: 'settings', label: 'Settings & Security', icon: Settings },
];

const RECRUITMENT_STAGES = [
  'New Lead',
  'Contacted',
  'Interested',
  'Documents Pending',
  'Qualified',
  'Employer Review',
  'Offer',
  'Visa Process',
  'Deployed',
  'Rejected',
  'On Hold',
];

export const AndroidPlayLaunchModal: React.FC<AndroidPlayLaunchModalProps> = ({
  onClose,
  data,
  apiFetch,
  onRefresh,
  notify,
  isInstallable,
  isInstalled,
  isIOS,
  onInstallPwa,
}) => {
  const [activeTab, setActiveTab] = useState<
    'preview' | 'kotlin' | 'install' | 'build' | 'playstore'
  >('preview');

  // Interactive Compose Material 3 Preview State
  const [composeScreen, setComposeScreen] = useState<ComposeScreenId>('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stageFilter, setStageFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConvId, setSelectedConvId] = useState<number>(
    data.conversations[0]?.id || 0
  );
  const [replyInput, setReplyInput] = useState('');
  const [copilotPrompt, setCopilotPrompt] = useState(
    'Evaluate top candidates for UK/EU placement and draft WhatsApp follow-up.'
  );
  const [copilotOutput, setCopilotOutput] = useState<any>(null);
  const [runningCopilot, setRunningCopilot] = useState(false);
  const [showAddCandidateSheet, setShowAddCandidateSheet] = useState(false);
  const [candName, setCandName] = useState('');
  const [candPhone, setCandPhone] = useState('');
  const [candJob, setCandJob] = useState('');
  const [candCountry, setCandCountry] = useState('United Kingdom');
  const [candValue, setCandValue] = useState('5500');

  // Android Configuration State
  const [packageName, setPackageName] = useState('com.connectai.crm.mobile');
  const [versionName, setVersionName] = useState('1.0.0');
  const [versionCode, setVersionCode] = useState(1);
  const [minSdk, setMinSdk] = useState(26);
  const [targetSdk, setTargetSdk] = useState(35);
  const [sha256Fingerprint, setSha256Fingerprint] = useState(
    'FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C'
  );
  const [supportEmail, setSupportEmail] = useState('alammustak355@gmail.com');
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const [projectFiles, setProjectFiles] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<string>(
    'android-app/app/src/main/java/com/connectai/crm/MainActivity.kt'
  );
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Mobile Browser GitHub Sync State (Token never persisted)
  const [githubRepo, setGithubRepo] = useState('');
  const [githubBranch, setGithubBranch] = useState('main');
  const [githubToken, setGithubToken] = useState('');
  const [isPushingGithub, setIsPushingGithub] = useState(false);
  const [pushedActionsUrl, setPushedActionsUrl] = useState('');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    let mounted = true;
    apiFetch('/api/android/config')
      .then((cfg) => {
        if (!mounted || !cfg) return;
        if (cfg.packageName) setPackageName(cfg.packageName);
        if (cfg.versionName) setVersionName(cfg.versionName);
        if (cfg.versionCode) setVersionCode(Number(cfg.versionCode));
        if (cfg.minSdk) setMinSdk(Number(cfg.minSdk));
        if (cfg.targetSdk) setTargetSdk(Number(cfg.targetSdk));
        if (Array.isArray(cfg.sha256Fingerprints) && cfg.sha256Fingerprints.length > 0) {
          setSha256Fingerprint(cfg.sha256Fingerprints.join(', '));
        }
        if (cfg.supportEmail) setSupportEmail(cfg.supportEmail);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [apiFetch]);

  const loadKotlinProjectFiles = async () => {
    if (Object.keys(projectFiles).length > 0) return;
    setLoadingFiles(true);
    try {
      const res = await apiFetch('/api/android/project-files');
      if (res?.files) {
        setProjectFiles(res.files);
      }
    } catch (err: any) {
      notify(err.message || 'Could not load Kotlin project files', 'error');
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleSaveAndroidConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      await apiFetch('/api/android/config', {
        method: 'POST',
        body: JSON.stringify({
          packageName,
          versionName,
          versionCode,
          minSdk,
          targetSdk,
          sha256Fingerprint,
          supportEmail,
        }),
      });
      notify(
        'Saved Android config & updated live /.well-known/assetlinks.json in PostgreSQL.'
      );
    } catch (err: any) {
      notify(err.message || 'Failed to save Android config', 'error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handlePushToGithubFromMobile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubRepo.trim() || !githubToken.trim()) {
      notify('Enter your GitHub repository (username/repo) and token.', 'error');
      return;
    }
    setIsPushingGithub(true);
    try {
      const res = await apiFetch('/api/android/github-push', {
        method: 'POST',
        body: JSON.stringify({
          repoFullName: githubRepo,
          githubToken,
          branch: githubBranch,
        }),
      });
      setGithubToken('');
      if (res?.actionsUrl) {
        setPushedActionsUrl(res.actionsUrl);
      }
      await onRefresh();
      notify(
        `Synced ${res?.pushedCount || 23} Gradle & Workflow files to ${res?.repo}! Open GitHub Actions to download your APK & AAB.`
      );
    } catch (err: any) {
      notify(err.message || 'GitHub sync failed', 'error');
    } finally {
      setIsPushingGithub(false);
    }
  };

  const handleDownloadKotlinBundle = () => {
    const bundle = {
      appName: 'ConnectAI CRM',
      packageName,
      versionName,
      versionCode,
      minSdk,
      targetSdk,
      productionBackendUrl: origin,
      files: projectFiles,
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'connectai-crm-android-kotlin-project.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify('Downloaded ConnectAI CRM Native Kotlin Android Studio bundle.');
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    notify(`Copied ${label} to clipboard.`);
  };

  // Live Actions inside the Interactive Compose Material 3 Preview
  const handleComposeAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candName.trim()) return;
    try {
      await apiFetch('/api/leads', {
        method: 'POST',
        body: JSON.stringify({
          title: `${candName} — ${candJob || 'International Placement'}`,
          contactName: candName,
          phone: candPhone,
          preferredJob: candJob,
          destinationCountry: candCountry,
          sourceChannel: 'whatsapp',
          stage: 'New Lead',
          estimatedValueUsd: candValue || '4500',
          notes: 'Created from ConnectAI CRM Android Compose client',
        }),
      });
      setCandName('');
      setCandPhone('');
      setCandJob('');
      setShowAddCandidateSheet(false);
      await onRefresh();
      notify('Candidate saved to Cloud SQL PostgreSQL from Android Compose client.');
    } catch (err: any) {
      notify(err.message || 'Failed to create candidate', 'error');
    }
  };

  const handleComposeSendReply = async (convId: number) => {
    if (!replyInput.trim()) return;
    try {
      await apiFetch(`/api/conversations/${convId}/send`, {
        method: 'POST',
        body: JSON.stringify({
          content: replyInput,
          direction: 'outbound',
          contentType: 'text',
        }),
      });
      setReplyInput('');
      await onRefresh();
      notify('Message sent and recorded in PostgreSQL.');
    } catch (err: any) {
      notify(err.message || 'Failed to send message', 'error');
    }
  };

  const handleComposeUpdateStage = async (leadId: number, stage: string) => {
    try {
      await apiFetch(`/api/leads/${leadId}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({ stage }),
      });
      await onRefresh();
      notify(`Updated candidate stage to ${stage}`);
    } catch (err: any) {
      notify(err.message || 'Stage update failed', 'error');
    }
  };

  const handleComposeToggleTask = async (taskId: number) => {
    try {
      await apiFetch(`/api/tasks/${taskId}/toggle`, { method: 'PATCH' });
      await onRefresh();
    } catch (err: any) {
      notify(err.message || 'Task update failed', 'error');
    }
  };

  const handleComposeRunCopilot = async () => {
    setRunningCopilot(true);
    try {
      const res = await apiFetch('/api/ai/copilot', {
        method: 'POST',
        body: JSON.stringify({
          actionType: 'candidate_qualification',
          customInput: copilotPrompt,
        }),
      });
      setCopilotOutput(res?.result || null);
      await onRefresh();
    } catch (err: any) {
      notify(err.message || 'Copilot call failed', 'error');
    } finally {
      setRunningCopilot(false);
    }
  };

  const activeLeads = data.leads.filter((l) => !l.isArchived);
  const qualifiedLeads = activeLeads.filter((l) =>
    ['Qualified', 'Employer Review', 'Offer', 'Visa Process', 'Deployed', 'Won'].includes(
      l.stage
    )
  );
  const pipelineValue = qualifiedLeads.reduce(
    (acc, l) => acc + Number(l.estimatedValueUsd || 0),
    0
  );
  const convertedCount = activeLeads.filter((l) =>
    ['Offer', 'Visa Process', 'Deployed', 'Won'].includes(l.stage)
  ).length;
  const conversionRate =
    activeLeads.length > 0 ? Math.round((convertedCount * 100) / activeLeads.length) : 0;

  const activeConv =
    data.conversations.find((c) => c.id === selectedConvId) || data.conversations[0];
  const activeMessages = data.messages.filter((m) => m.conversationId === activeConv?.id);

  const playStoreShortDesc =
    'AI-powered B2B CRM, Recruitment Pipeline & Unified WhatsApp/Social Inbox.';
  const playStoreFullDesc = `ConnectAI CRM is an enterprise AI-powered CRM and International Recruitment Platform designed for recruitment agencies, sales teams, and omnichannel businesses.

KEY CAPABILITIES:
• Executive Control Center: Real-time KPI tracking for leads, active conversations, qualified opportunities, recruitment pipeline value, and conversion rates.
• International Recruitment Pipeline & Lead Center: Manage candidates across stages (New Lead, Contacted, Interested, Documents Pending, Qualified, Employer Review, Offer, Visa Process, Deployed) with duplicate detection and audit-logged CSV import/export.
• Unified Omnichannel Inbox: Manage customer and candidate conversations across WhatsApp Business Cloud API, Instagram, Facebook, and TikTok with human-in-the-loop approval workflows.
• Gemini AI Recruitment & Sales Copilot: Draft replies, score candidate-job fit, and extract passport/resume details with server-side AI grounding.
• Team & RBAC Governance: Granular role-based access control, staff performance scorecards, and immutable security audit logs.`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-5xl w-full p-4 sm:p-6 space-y-4 shadow-xl max-h-[94vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-indigo-600 font-semibold">
              NATIVE KOTLIN 2.0 + JETPACK COMPOSE (MATERIAL 3) · {packageName}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 mt-0.5">
              <Smartphone className="w-5 h-5 text-indigo-600 shrink-0" />
              ConnectAI CRM — Native Android App Preview &amp; Kotlin Studio
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Interact with the native Android Material 3 UI connected to your live Cloud SQL backend, inspect the 7 Kotlin + Jetpack Compose files, or package for Google Play.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="/api/android/download-zip"
              download="connectai-crm-android.zip"
              className="min-h-[40px] px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" /> Download Android ZIP
            </a>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1"
            >
              <X className="w-4 h-4" /> Close
            </button>
          </div>
        </div>

        {/* Top Mode Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 text-xs">
          {[
            { id: 'preview', label: '1. Live Android Material 3 Preview', icon: Smartphone },
            { id: 'kotlin', label: '2. Kotlin + Jetpack Compose Code', icon: Code2 },
            { id: 'install', label: '3. Install on Phone Now', icon: CheckCircle2 },
            { id: 'build', label: '4. Build APK / AAB (Play Console)', icon: Download },
            { id: 'playstore', label: '5. Play Store Listing & Privacy', icon: FileText },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setActiveTab(t.id as any);
                  if (t.id === 'kotlin') loadKotlinProjectFiles();
                }}
                className={`min-h-[40px] px-3.5 py-2 rounded-lg font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                  activeTab === t.id
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: INTERACTIVE NATIVE ANDROID JETPACK COMPOSE (MATERIAL 3) PREVIEW */}
        {activeTab === 'preview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Android 15 Material 3 Device Frame */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-[380px] bg-slate-950 rounded-[36px] p-2.5 border-4 border-slate-800 shadow-xl relative overflow-hidden">
                {/* Android System Status Bar */}
                <div className="bg-slate-900 text-slate-300 px-4 py-1.5 rounded-t-[26px] flex items-center justify-between text-[10px] font-mono">
                  <span>09:41 · 5G</span>
                  <span className="text-emerald-400 font-semibold">HTTPS · CLOUD SQL</span>
                  <span>100% 🔋</span>
                </div>

                {/* Material 3 TopAppBar */}
                <div className="bg-slate-900 text-white px-3.5 py-2.5 flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setDrawerOpen(!drawerOpen)}
                      className="p-1.5 rounded-lg hover:bg-slate-800"
                      title="Open Compose ModalNavigationDrawer"
                    >
                      <Menu className="w-4 h-4 text-white" />
                    </button>
                    <div>
                      <div className="text-xs font-bold leading-tight">
                        {COMPOSE_NAV_ITEMS.find((n) => n.id === composeScreen)?.label}
                      </div>
                      <div className="text-[10px] font-mono text-emerald-400">
                        {data.activeTenant.name}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={onRefresh}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300"
                      title="Sync with Backend"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddCandidateSheet(!showAddCandidateSheet)}
                      className="p-1.5 rounded-lg bg-indigo-600 text-white"
                      title="Add Lead / Candidate"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Slide-Out Compose ModalNavigationDrawer */}
                {drawerOpen && (
                  <div className="absolute inset-x-2.5 top-20 bottom-16 z-30 bg-slate-950/95 text-white p-4 overflow-y-auto space-y-1.5 border-r border-slate-800">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div>
                        <div className="text-xs font-bold">CONNECTAI CRM</div>
                        <div className="text-[10px] font-mono text-indigo-400">
                          Material 3 NavigationDrawer
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDrawerOpen(false)}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {COMPOSE_NAV_ITEMS.map((item) => {
                      const Icon = item.icon;
                      const selected = composeScreen === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setComposeScreen(item.id);
                            setDrawerOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                            selected
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Quick Add Candidate Sheet inside Android Preview */}
                {showAddCandidateSheet && (
                  <form
                    onSubmit={handleComposeAddCandidate}
                    className="bg-indigo-950 text-white p-3.5 space-y-2 border-b border-indigo-800 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>+ Add Candidate (Compose Dialog)</span>
                      <button
                        type="button"
                        onClick={() => setShowAddCandidateSheet(false)}
                        className="text-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={candName}
                      onChange={(e) => setCandName(e.target.value)}
                      placeholder="Candidate Full Name *"
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={candPhone}
                        onChange={(e) => setCandPhone(e.target.value)}
                        placeholder="+44 7700..."
                        className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                      />
                      <input
                        type="text"
                        value={candJob}
                        onChange={(e) => setCandJob(e.target.value)}
                        placeholder="Job Role (e.g. ICU Nurse)"
                        className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={candCountry}
                        onChange={(e) => setCandCountry(e.target.value)}
                        placeholder="Destination Country"
                        className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                      />
                      <input
                        type="number"
                        value={candValue}
                        onChange={(e) => setCandValue(e.target.value)}
                        placeholder="Value ($)"
                        className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg"
                    >
                      Save Candidate to Cloud SQL
                    </button>
                  </form>
                )}

                {/* Compose Viewport Body */}
                <div className="bg-slate-50 h-[440px] overflow-y-auto p-3 space-y-3 text-xs text-slate-900">
                  {/* 1. OVERVIEW SCREEN */}
                  {composeScreen === 'overview' && (
                    <>
                      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-3.5 space-y-1.5 shadow-xs">
                        <div className="text-[9px] font-mono uppercase tracking-wider text-indigo-300 font-semibold">
                          YOUR BUSINESS AT A GLANCE
                        </div>
                        <div className="text-sm font-bold">
                          Welcome, {data.user.name}
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Native Jetpack Compose Material 3 workspace synced with Cloud SQL.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white border border-slate-200 rounded-xl p-2.5">
                          <div className="text-[10px] text-slate-500 font-semibold">Total Leads</div>
                          <div className="text-lg font-bold font-mono">{activeLeads.length}</div>
                          <div className="text-[10px] text-slate-400">{data.contacts.length} contacts</div>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-xl p-2.5">
                          <div className="text-[10px] text-slate-500 font-semibold">Active Threads</div>
                          <div className="text-lg font-bold font-mono text-blue-600">
                            {data.conversations.length}
                          </div>
                          <div className="text-[10px] text-slate-400">Unified Inbox</div>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-xl p-2.5">
                          <div className="text-[10px] text-slate-500 font-semibold">Qualified</div>
                          <div className="text-lg font-bold font-mono text-violet-600">
                            {qualifiedLeads.length}
                          </div>
                          <div className="text-[10px] text-slate-400">Ready for placement</div>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-xl p-2.5">
                          <div className="text-[10px] text-slate-500 font-semibold">Pipeline Value</div>
                          <div className="text-lg font-bold font-mono text-emerald-600">
                            ${pipelineValue.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-400">{conversionRate}% conv. rate</div>
                        </div>
                      </div>

                      <div className="font-bold text-xs text-slate-800 pt-1">
                        Active Candidates &amp; Opportunities
                      </div>
                      {activeLeads.slice(0, 5).map((lead) => (
                        <div
                          key={lead.id}
                          onClick={() => setComposeScreen('pipeline')}
                          className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-1 cursor-pointer hover:border-indigo-300"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{lead.contactName}</span>
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-mono font-semibold">
                              {lead.stage}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600">
                            {lead.preferredJob || lead.title} · {lead.destinationCountry || 'Global'}
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                            <span>{lead.sourceChannel.toUpperCase()} · Score {lead.leadScore}</span>
                            <span className="text-emerald-700 font-bold">
                              ${Number(lead.estimatedValueUsd || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* 2. LEAD CENTER SCREEN */}
                  {composeScreen === 'leads' && (
                    <>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search contacts, phone, or company..."
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs"
                      />
                      {data.contacts
                        .filter(
                          (c) =>
                            !searchQuery ||
                            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.phone.includes(searchQuery)
                        )
                        .map((contact) => (
                          <div
                            key={contact.id}
                            className="bg-white border border-slate-200 rounded-xl p-3 space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{contact.name}</span>
                              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded">
                                {contact.sourceChannel}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-600">
                              {contact.phone} · {contact.email || 'No email'}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {contact.requirementsSummary || contact.company}
                            </div>
                          </div>
                        ))}
                    </>
                  )}

                  {/* 3. UNIFIED INBOX SCREEN */}
                  {composeScreen === 'inbox' && (
                    <>
                      <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {data.conversations.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedConvId(c.id)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap ${
                              activeConv?.id === c.id
                                ? 'bg-slate-900 text-white'
                                : 'bg-white border border-slate-200 text-slate-700'
                            }`}
                          >
                            {c.customerName} ({c.channelType})
                          </button>
                        ))}
                      </div>
                      {activeConv && (
                        <div className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-2">
                          <div className="text-[11px] font-semibold text-slate-800 border-b border-slate-100 pb-1.5">
                            {activeConv.customerName} · {activeConv.customerHandleOrPhone}
                          </div>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {activeMessages.map((m) => (
                              <div
                                key={m.id}
                                className={`p-2 rounded-xl text-[11px] ${
                                  m.direction === 'inbound'
                                    ? 'bg-slate-100 text-slate-900 mr-6'
                                    : 'bg-indigo-600 text-white ml-6'
                                }`}
                              >
                                <div className="text-[9px] opacity-75">{m.senderName}</div>
                                <div>{m.content}</div>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-1.5 pt-1">
                            <input
                              type="text"
                              value={replyInput}
                              onChange={(e) => setReplyInput(e.target.value)}
                              placeholder="Write reply..."
                              className="flex-1 p-1.5 border border-slate-200 rounded-lg text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => handleComposeSendReply(activeConv.id)}
                              className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg flex items-center"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* 4. AI COPILOT SCREEN */}
                  {composeScreen === 'copilot' && (
                    <div className="space-y-2.5">
                      <div className="bg-slate-900 text-white p-3 rounded-xl space-y-1">
                        <div className="text-[10px] font-mono text-indigo-400">
                          SERVER-SIDE GEMINI COPILOT
                        </div>
                        <div className="font-bold text-xs">
                          Recruitment &amp; Sales Qualification
                        </div>
                      </div>
                      <textarea
                        rows={2}
                        value={copilotPrompt}
                        onChange={(e) => setCopilotPrompt(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs"
                      />
                      <button
                        type="button"
                        disabled={runningCopilot}
                        onClick={handleComposeRunCopilot}
                        className="w-full py-2 bg-indigo-600 text-white font-semibold rounded-xl"
                      >
                        {runningCopilot ? 'Analyzing PostgreSQL Records...' : '✨ Run AI Copilot'}
                      </button>
                      {copilotOutput && (
                        <div className="bg-white border border-indigo-200 rounded-xl p-3 space-y-1.5">
                          <div className="font-bold text-slate-900">{copilotOutput.headline}</div>
                          <p className="text-[11px] text-slate-600">{copilotOutput.summary}</p>
                          {copilotOutput.draftText && (
                            <div className="p-2 bg-slate-50 rounded font-mono text-[10px]">
                              {copilotOutput.draftText}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 5. WHATSAPP & CHANNELS SCREEN */}
                  {composeScreen === 'channels' && (
                    <div className="space-y-2">
                      {data.phoneNumbers.map((ch) => (
                        <div
                          key={ch.id}
                          className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold">{ch.displayName}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-50 text-amber-800 rounded">
                              {ch.connectionStatus}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-600">
                            {ch.channelType.toUpperCase()} · {ch.phoneNumber}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 6. CAMPAIGN STUDIO SCREEN */}
                  {composeScreen === 'campaigns' && (
                    <div className="space-y-2">
                      {data.socialBoosts.map((b) => (
                        <div
                          key={b.id}
                          className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-1"
                        >
                          <div className="font-bold">{b.campaignName}</div>
                          <div className="text-[11px] text-slate-600">{b.adCopy}</div>
                          <div className="text-[10px] font-mono text-emerald-700">
                            {b.channelType.toUpperCase()} · ${b.dailyBudgetUsd}/day ·{' '}
                            {b.qualifiedLeadsCount} qualified leads
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 7. RECRUITMENT PIPELINE SCREEN */}
                  {composeScreen === 'pipeline' && (
                    <>
                      <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {['All', ...RECRUITMENT_STAGES].map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setStageFilter(st)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap ${
                              stageFilter === st
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white border border-slate-200 text-slate-700'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                      {activeLeads
                        .filter((l) => stageFilter === 'All' || l.stage === stageFilter)
                        .map((lead) => (
                          <div
                            key={lead.id}
                            className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold">{lead.contactName}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded">
                                {lead.stage}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600">
                              {lead.preferredJob || lead.title} · {lead.nationality || 'Global'} →{' '}
                              {lead.destinationCountry || 'Global'}
                            </div>
                            <div className="flex gap-1 overflow-x-auto pt-1">
                              {['Contacted', 'Documents Pending', 'Qualified', 'Offer', 'Visa Process', 'Deployed'].map(
                                (nextSt) => (
                                  <button
                                    key={nextSt}
                                    type="button"
                                    onClick={() => handleComposeUpdateStage(lead.id, nextSt)}
                                    className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 text-[10px] rounded border border-slate-200 whitespace-nowrap"
                                  >
                                    → {nextSt}
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        ))}
                    </>
                  )}

                  {/* 8. FOLLOW-UP TASKS SCREEN */}
                  {composeScreen === 'tasks' && (
                    <div className="space-y-2">
                      {data.tasks.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => handleComposeToggleTask(t.id)}
                          className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between cursor-pointer"
                        >
                          <div>
                            <div
                              className={`font-semibold ${
                                t.status === 'completed' ? 'line-through text-slate-400' : ''
                              }`}
                            >
                              {t.title}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500">
                              {t.contactName} · Due {t.dueDate}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 rounded">
                            {t.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 9-12: TEAM, ANALYTICS, INTEGRATIONS, SETTINGS */}
                  {['team', 'analytics', 'integrations', 'settings'].includes(composeScreen) && (
                    <div className="space-y-2">
                      <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1">
                        <div className="font-bold text-slate-900">
                          {COMPOSE_NAV_ITEMS.find((n) => n.id === composeScreen)?.label}
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Workspace: {data.activeTenant.name} · Role: {data.membership?.role} ·{' '}
                          {data.integrations.length} configured integrations ·{' '}
                          {data.auditLogs.length} audit events.
                        </p>
                      </div>
                      {data.integrations.map((ig) => (
                        <div
                          key={ig.id}
                          className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-semibold text-[11px]">{ig.displayName}</div>
                            <div className="text-[10px] font-mono text-slate-500">
                              {ig.maskedCredentialHint}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-50 text-amber-800 rounded">
                            {ig.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Material 3 Bottom NavigationBar */}
                <div className="bg-slate-950 text-slate-400 px-2 py-2 rounded-b-[26px] grid grid-cols-5 border-t border-slate-800 text-[9px]">
                  {[
                    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                    { id: 'inbox', label: 'Inbox', icon: MessagesSquare },
                    { id: 'pipeline', label: 'Pipeline', icon: BriefcaseBusiness },
                    { id: 'copilot', label: 'Copilot', icon: Sparkles },
                    { id: 'leads', label: 'Leads', icon: Users },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const active = composeScreen === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setComposeScreen(tab.id as ComposeScreenId)}
                        className={`flex flex-col items-center gap-0.5 py-1 rounded-lg ${
                          active ? 'text-indigo-400 font-bold' : 'text-slate-400'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Architecture Summary & All 12 Screen Switcher */}
            <div className="lg:col-span-7 space-y-4 text-xs">
              <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 font-semibold">
                  NATIVE KOTLIN + JETPACK COMPOSE ARCHITECTURE
                </div>
                <h3 className="text-sm font-bold">
                  Tap Any of the 12 Core Modules Below to Test in the Android Compose Preview
                </h3>
                <p className="text-slate-300 text-xs">
                  Every button, stage update, lead creation, inbox message, and AI Copilot call in this preview executes against your real Cloud SQL PostgreSQL database (<span className="font-mono">europe-west1</span>), matching the native Kotlin code in <span className="font-mono">/android-app</span>.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COMPOSE_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = composeScreen === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setComposeScreen(item.id)}
                      className={`min-h-[42px] px-3 py-2 rounded-xl border text-left flex items-center gap-2 font-medium transition-colors ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
                <div className="font-bold text-slate-900 text-sm">
                  Native Kotlin + Jetpack Compose Project Structure (`/android-app`)
                </div>
                <ul className="space-y-1 text-slate-700 font-mono text-[11px]">
                  <li>• MainActivity.kt — Material 3 Scaffold, ModalNavigationDrawer, NavigationBar &amp; SignInScreen</li>
                  <li>• model/CrmModels.kt — All 12 module data models + labeled DemoFallbackDataset</li>
                  <li>• data/SessionVault.kt — Hardware Android Keystore EncryptedSharedPreferences (AES256-GCM)</li>
                  <li>• network/ConnectAiApiClient.kt — Authenticated HTTPS Coroutines client (Zero hardcoded keys)</li>
                  <li>• ui/theme/Theme.kt — Dark Navy (#0F172A) &amp; Electric Indigo (#4F46E5) Material 3 theme</li>
                  <li>• ui/screens/CoreCrmScreens.kt — Overview, Lead Center, Inbox, AI Copilot, Channels, Campaigns</li>
                  <li>• ui/screens/OperationsAndAdminScreens.kt — Pipeline, Tasks, Team RBAC, Analytics, Integrations, Settings</li>
                </ul>
                <div className="pt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('kotlin');
                      loadKotlinProjectFiles();
                    }}
                    className="min-h-[38px] px-3.5 py-1.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 flex items-center gap-1.5"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    Inspect &amp; Download Kotlin Source Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('build')}
                    className="min-h-[38px] px-3.5 py-1.5 bg-white border border-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-100 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Build APK / Play Store AAB
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: NATIVE KOTLIN + JETPACK COMPOSE SOURCE */}
        {activeTab === 'kotlin' && (
          <div className="space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <div>
                <div className="font-bold text-slate-900 text-sm">
                  Native Kotlin 2.0 + Jetpack Compose (Material 3) Android Studio Project
                </div>
                <p className="text-slate-600">
                  Complete multi-file Android source tree inside <span className="font-mono">/android-app</span> with <span className="font-mono">EncryptedSharedPreferences</span>, Coroutines REST client, and all 12 Compose screens.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadKotlinProjectFiles}
                  className="min-h-[38px] px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingFiles ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={handleDownloadKotlinBundle}
                  className="min-h-[38px] px-3.5 py-1.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Project Bundle (.json)
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {Object.keys(projectFiles).map((fileKey) => (
                <button
                  key={fileKey}
                  type="button"
                  onClick={() => setSelectedFile(fileKey)}
                  className={`px-2.5 py-1.5 rounded-md font-mono text-[11px] border ${
                    selectedFile === fileKey
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {fileKey.replace('android-app/app/src/main/java/com/connectai/crm/', '')}
                </button>
              ))}
            </div>

            {projectFiles[selectedFile] ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-slate-800">{selectedFile}</span>
                  <button
                    type="button"
                    onClick={() => copyText(projectFiles[selectedFile], selectedFile)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-800 flex items-center gap-1 font-medium"
                  >
                    <Copy className="w-3 h-3" /> Copy File Contents
                  </button>
                </div>
                <pre className="p-3.5 bg-slate-950 text-slate-100 rounded-xl font-mono text-[11px] overflow-x-auto max-h-80 leading-relaxed">
                  {projectFiles[selectedFile]}
                </pre>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 border border-slate-200 rounded-xl">
                {loadingFiles ? 'Loading Kotlin project files...' : 'Select a file above to inspect.'}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DIRECT PHONE INSTALL */}
        {activeTab === 'install' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 font-semibold">
                  INSTANT INSTALLATION ON YOUR ANDROID PHONE
                </div>
                <div className="text-sm font-bold">
                  {isInstalled
                    ? 'ConnectAI CRM is Installed on This Device (Standalone Mode Active)'
                    : 'Install ConnectAI CRM Directly to Your Android App Drawer'}
                </div>
                <p className="text-slate-300 text-xs">
                  Preserves your published web application while letting you install ConnectAI CRM immediately onto your Android phone via Chrome WebAPK or compile the native Kotlin APK/AAB.
                </p>
              </div>
              {isInstallable && !isInstalled && (
                <button
                  type="button"
                  onClick={onInstallPwa}
                  className="min-h-[44px] px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shrink-0"
                >
                  <Download className="w-4 h-4" />
                  Install App Now
                </button>
              )}
            </div>
            {isIOS && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                <strong>iOS Safari:</strong> Tap <strong>Share</strong> and select{' '}
                <strong>Add to Home Screen</strong>.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: BUILD APK & PLAY STORE AAB */}
        {activeTab === 'build' && (
          <div className="space-y-4 text-xs">
            <form
              onSubmit={handleSaveAndroidConfig}
              className="p-4 border border-slate-200 rounded-xl space-y-3 bg-white"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Unique Android Application ID &amp; Play Store Signing Configuration
                  </h3>
                  <p className="text-slate-500">
                    Default set to <span className="font-mono">com.connectai.crm.mobile</span> to avoid Play Console package conflicts. Saved in PostgreSQL and served at <span className="font-mono">/.well-known/assetlinks.json</span>.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="min-h-[40px] px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSavingConfig ? 'Saving...' : 'Save Android Config'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Unique Application ID
                  </label>
                  <input
                    type="text"
                    value={packageName}
                    onChange={(e) => setPackageName(e.target.value)}
                    className="w-full min-h-[40px] p-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Version Name &amp; Code
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={versionName}
                      onChange={(e) => setVersionName(e.target.value)}
                      className="w-full min-h-[40px] p-2 border border-slate-200 rounded-lg font-mono"
                    />
                    <input
                      type="number"
                      value={versionCode}
                      onChange={(e) => setVersionCode(Number(e.target.value))}
                      className="w-full min-h-[40px] p-2 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Min SDK / Target SDK
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={minSdk}
                      onChange={(e) => setMinSdk(Number(e.target.value))}
                      className="w-full min-h-[40px] p-2 border border-slate-200 rounded-lg font-mono"
                    />
                    <input
                      type="number"
                      value={targetSdk}
                      onChange={(e) => setTargetSdk(Number(e.target.value))}
                      className="w-full min-h-[40px] p-2 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Google Play App Signing SHA-256 Certificate Fingerprint
                </label>
                <input
                  type="text"
                  value={sha256Fingerprint}
                  onChange={(e) => setSha256Fingerprint(e.target.value)}
                  className="w-full min-h-[40px] p-2 border border-slate-200 rounded-lg font-mono text-[11px]"
                />
              </div>
            </form>

            <form
              onSubmit={handlePushToGithubFromMobile}
              className="p-4 border border-indigo-200 rounded-xl space-y-3 bg-indigo-50/50"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    1-Tap Mobile Browser Sync: Push `/android-app` + GitHub Actions Workflow to Private Repo
                  </h3>
                  <p className="text-slate-600">
                    Uploads all 23 files under <span className="font-mono">/android-app</span> and <span className="font-mono">.github/workflows/android-release.yml</span> directly to your private GitHub repository over HTTPS. Your GitHub token is used once in memory and is never saved.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isPushingGithub}
                  className="min-h-[40px] px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50"
                >
                  {isPushingGithub ? 'Uploading 23 Files to GitHub...' : 'Push Android Project to GitHub'}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    GitHub Repository (username/repo)
                  </label>
                  <input
                    type="text"
                    placeholder="yourname/connectai-crm-android"
                    value={githubRepo}
                    onChange={(e) => setGithubRepo(e.target.value)}
                    className="w-full min-h-[40px] p-2 bg-white border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    placeholder="main"
                    value={githubBranch}
                    onChange={(e) => setGithubBranch(e.target.value)}
                    className="w-full min-h-[40px] p-2 bg-white border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    GitHub Personal Access Token (Contents + Workflows)
                  </label>
                  <input
                    type="password"
                    placeholder="github_pat_... or ghp_..."
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    className="w-full min-h-[40px] p-2 bg-white border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>
              {pushedActionsUrl && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                  <span className="text-emerald-900 font-medium">
                    Repository synced! Open GitHub Actions to watch your APK &amp; AAB build:
                  </span>
                  <a
                    href={pushedActionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-emerald-600 text-white font-semibold rounded-lg flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open GitHub Actions
                  </a>
                </div>
              )}
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
                <div className="font-bold text-slate-900 text-sm">
                  Compile Native Kotlin APK &amp; AAB via GitHub Actions (Free Cloud Build)
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-700">
                  <li>
                    Use Google AI Studio’s <strong>Save to GitHub</strong> icon in the top toolbar (or the 1-Tap Sync form above) to push <span className="font-mono">/android-app</span> and <span className="font-mono">.github/workflows/android-release.yml</span> to a private GitHub repository.
                  </li>
                  <li>
                    In your mobile browser, open your GitHub repo → <strong>Actions</strong> → <strong>Build ConnectAI CRM Android APK &amp; Play Store AAB</strong> → <strong>Run workflow</strong>.
                  </li>
                  <li>
                    Download <span className="font-mono">connectai-crm-debug-apk</span> (for phone testing) and <span className="font-mono">connectai-crm-release-aab</span> (for Google Play Internal Testing).
                  </li>
                </ol>
              </div>

              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
                <div className="font-bold text-slate-900 text-sm">
                  Or Package via PWABuilder on Mobile (2 Minutes)
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-700">
                  <li>
                    Open <strong>https://www.pwabuilder.com</strong> and paste <span className="font-mono">{origin}</span>.
                  </li>
                  <li>
                    Tap <strong>Package for stores → Android</strong> and set Package ID to <span className="font-mono">{packageName}</span>.
                  </li>
                  <li>
                    Download the signed <span className="font-mono">.apk</span> and <span className="font-mono">.aab</span> for Google Play Internal Testing.
                  </li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: GOOGLE PLAY STORE LISTING & PRIVACY */}
        {activeTab === 'playstore' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 border border-slate-200 rounded-xl space-y-3 bg-white">
              <h3 className="font-bold text-slate-900 text-sm">
                Google Play Console Store Listing Copy
              </h3>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="font-semibold">App Name:</span>
                  <button
                    type="button"
                    onClick={() => copyText('ConnectAI CRM', 'App Name')}
                    className="text-indigo-600 font-semibold"
                  >
                    Copy
                  </button>
                </div>
                <div className="p-2 bg-slate-50 border border-slate-200 rounded font-mono">
                  ConnectAI CRM
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="font-semibold">
                    Short Description ({playStoreShortDesc.length}/80):
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(playStoreShortDesc, 'Short Description')}
                    className="text-indigo-600 font-semibold"
                  >
                    Copy
                  </button>
                </div>
                <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                  {playStoreShortDesc}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="font-semibold">Full Description:</span>
                  <button
                    type="button"
                    onClick={() => copyText(playStoreFullDesc, 'Full Description')}
                    className="text-indigo-600 font-semibold"
                  >
                    Copy
                  </button>
                </div>
                <pre className="p-2 bg-slate-50 border border-slate-200 rounded whitespace-pre-wrap font-sans text-[11px] max-h-40 overflow-y-auto">
                  {playStoreFullDesc}
                </pre>
              </div>
            </div>

            <div className="p-4 border border-slate-200 rounded-xl space-y-3 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Play Store Graphics &amp; Live Privacy Policy URL
              </h3>
              <div className="flex flex-wrap gap-2">
                <a
                  href="/play-store-icon-512x512.png"
                  download="connectai-play-icon-512x512.png"
                  className="min-h-[38px] px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  512x512 App Icon
                </a>
                <a
                  href="/feature-graphic-1024x500.png"
                  download="connectai-feature-graphic-1024x500.png"
                  className="min-h-[38px] px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  1024x500 Feature Graphic
                </a>
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noreferrer"
                  className="min-h-[38px] px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open /privacy Policy Page
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
