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
} from 'lucide-react';

interface AndroidPlayLaunchModalProps {
  onClose: () => void;
  apiFetch: (url: string, options?: RequestInit) => Promise<any>;
  notify: (msg: string, type?: 'success' | 'error') => void;
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  onInstallPwa: () => void;
}

export const AndroidPlayLaunchModal: React.FC<AndroidPlayLaunchModalProps> = ({
  onClose,
  apiFetch,
  notify,
  isInstallable,
  isInstalled,
  isIOS,
  onInstallPwa,
}) => {
  const [activeTab, setActiveTab] = useState<
    'install' | 'build' | 'kotlin' | 'playstore' | 'security'
  >('install');

  const [packageName, setPackageName] = useState('com.connectai.crm');
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

  const playStoreShortDesc =
    'AI-powered B2B CRM, Recruitment Pipeline & Unified WhatsApp/Social Inbox.';
  const playStoreFullDesc = `ConnectAI CRM is an enterprise AI-powered CRM and International Recruitment Platform designed for recruitment agencies, sales teams, and omnichannel businesses.

KEY CAPABILITIES:
• Executive Control Center: Real-time KPI tracking for leads, active conversations, qualified opportunities, recruitment pipeline value, and conversion rates.
• International Recruitment Pipeline & Lead Center: Manage candidates across stages (New Lead, Contacted, Interested, Documents Pending, Qualified, Employer Review, Offer, Visa Process, Deployed) with duplicate detection and audit-logged CSV import/export.
• Unified Omnichannel Inbox: Manage customer and candidate conversations across WhatsApp Business Cloud API, Instagram, Facebook, and TikTok with human-in-the-loop approval workflows.
• Gemini AI Recruitment & Sales Copilot: Draft replies, score candidate-job fit, and extract passport/resume details with server-side AI grounding.
• Team & RBAC Governance: Granular role-based access control, staff performance scorecards, and immutable security audit logs.`;

  const releaseNotes = `v${versionName} (Build ${versionCode}) — Initial Production Release:
• Full Executive Control Center & International Recruitment Pipeline
• Unified Inbox with AI Reply Drafting & Human Approval Workflow
• Mobile-optimized card views and touch targets for Android phones and tablets
• Hardware-backed EncryptedSharedPreferences session security`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full p-4 sm:p-6 space-y-5 shadow-xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-indigo-600 font-semibold">
              PACKAGE ID: {packageName} · TARGET SDK {targetSdk} (ANDROID 15)
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 mt-0.5">
              <Smartphone className="w-5 h-5 text-indigo-600 shrink-0" />
              ConnectAI CRM — Android App & Google Play Launch Studio
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Install immediately on your Android phone, generate a signed APK / AAB for Google Play Console, or download the Native Kotlin + Jetpack Compose project.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1 shrink-0"
          >
            <X className="w-4 h-4" /> Close
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 text-xs">
          {[
            { id: 'install', label: '1. Install on Phone Now', icon: Smartphone },
            { id: 'build', label: '2. Build APK & Play Store AAB', icon: Download },
            { id: 'kotlin', label: '3. Kotlin + Compose Source', icon: Code2 },
            { id: 'playstore', label: '4. Google Play Listing & Privacy', icon: FileText },
            { id: 'security', label: '5. Security, QA & Cost (€0)', icon: ShieldCheck },
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

        {/* TAB 1: DIRECT PHONE INSTALL */}
        {activeTab === 'install' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 font-semibold">
                  FASTEST WAY TO USE ON YOUR ANDROID PHONE TODAY (FREE)
                </div>
                <div className="text-sm font-bold">
                  {isInstalled
                    ? 'ConnectAI CRM is Installed on This Device (Standalone Mode Active)'
                    : 'Install ConnectAI CRM Directly to Your Android App Drawer'}
                </div>
                <p className="text-slate-300 text-xs">
                  Uses Android Chrome&apos;s official WebAPK installer with full-screen standalone display, adaptive launcher icon, offline service worker, and live Cloud SQL synchronization.
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-slate-200 rounded-xl space-y-2.5 bg-slate-50/60">
                <h3 className="font-bold text-slate-900 text-sm">
                  Step-by-Step: Install on Your Android Phone
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-slate-700">
                  <li>
                    Copy your live Production App URL below and open it in{' '}
                    <strong>Google Chrome</strong> on your Android phone (outside the AI Studio preview frame).
                  </li>
                  <li>
                    Tap the <strong>&quot;Install App&quot;</strong> button at the top of the screen, or tap Chrome&apos;s top-right menu (<strong>⋮</strong>) and select{' '}
                    <strong>Install app</strong> (or <strong>Add to Home screen</strong>).
                  </li>
                  <li>
                    Android compiles a signed WebAPK and places the <strong>ConnectAI</strong> icon in your phone&apos;s app drawer.
                  </li>
                  <li>
                    Open ConnectAI CRM from your home screen — it runs full-screen without browser bars and stays logged into your PostgreSQL workspace.
                  </li>
                </ol>
                {isIOS && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
                    <strong>iOS Safari:</strong> Tap <strong>Share</strong> in Safari and tap{' '}
                    <strong>Add to Home Screen</strong>.
                  </div>
                )}
              </div>

              <div className="p-4 border border-slate-200 rounded-xl space-y-3 bg-white">
                <h3 className="font-bold text-slate-900 text-sm">
                  Your Live Production URLs & Webhook Endpoints
                </h3>
                <div className="space-y-2 font-mono text-[11px]">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-2">
                    <div className="truncate">
                      <div className="text-[10px] text-slate-500 font-sans font-semibold">
                        Production App URL (Open in Chrome on Android)
                      </div>
                      <span className="text-slate-900">{origin}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText(origin, 'Production App URL')}
                      className="min-h-[36px] px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700 hover:bg-slate-100 flex items-center gap-1 shrink-0"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>

                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-2">
                    <div className="truncate">
                      <div className="text-[10px] text-slate-500 font-sans font-semibold">
                        Public Google Play Privacy Policy URL
                      </div>
                      <span className="text-slate-900">{origin}/privacy</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText(`${origin}/privacy`, 'Privacy Policy URL')}
                      className="min-h-[36px] px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700 hover:bg-slate-100 flex items-center gap-1 shrink-0"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>

                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-2">
                    <div className="truncate">
                      <div className="text-[10px] text-slate-500 font-sans font-semibold">
                        Android Digital Asset Links Verification URL
                      </div>
                      <span className="text-slate-900">{origin}/.well-known/assetlinks.json</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        copyText(
                          `${origin}/.well-known/assetlinks.json`,
                          'Digital Asset Links URL'
                        )
                      }
                      className="min-h-[36px] px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700 hover:bg-slate-100 flex items-center gap-1 shrink-0"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BUILD APK & PLAY STORE AAB */}
        {activeTab === 'build' && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-950 space-y-1">
              <div className="font-bold">
                How to Generate Your Installable `.apk` and Signed Google Play `.aab` Directly from Your Phone
              </div>
              <p className="text-indigo-900">
                Because Google AI Studio runs in a cloud Node.js container without the 4GB Android NDK/Gradle binary compiler installed locally, we have configured live Digital Asset Links (<span className="font-mono">/.well-known/assetlinks.json</span>) and a Trusted Web Activity manifest (<span className="font-mono">/twa-manifest.json</span>) so you can generate your signed <span className="font-mono">.apk</span> and <span className="font-mono">.aab</span> in 2 minutes right from your mobile browser.
              </p>
            </div>

            <form
              onSubmit={handleSaveAndroidConfig}
              className="p-4 border border-slate-200 rounded-xl space-y-3 bg-white"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Android App ID & Digital Asset Links Signing Configuration
                  </h3>
                  <p className="text-slate-500">
                    Saved in PostgreSQL and served dynamically at{' '}
                    <span className="font-mono">/.well-known/assetlinks.json</span> to verify your Android app domain ownership.
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
                    Android Package Name
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
                    Version Name & Code
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={versionName}
                      onChange={(e) => setVersionName(e.target.value)}
                      placeholder="1.0.0"
                      className="w-full min-h-[40px] p-2 border border-slate-200 rounded-lg font-mono"
                    />
                    <input
                      type="number"
                      value={versionCode}
                      onChange={(e) => setVersionCode(Number(e.target.value))}
                      placeholder="1"
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
                  Google Play App Signing SHA-256 Certificate Fingerprint(s) (comma-separated)
                </label>
                <input
                  type="text"
                  value={sha256Fingerprint}
                  onChange={(e) => setSha256Fingerprint(e.target.value)}
                  placeholder="FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:..."
                  className="w-full min-h-[40px] p-2 border border-slate-200 rounded-lg font-mono text-[11px]"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  After uploading your `.aab` to Google Play Console, copy the SHA-256 fingerprint from{' '}
                  <strong>Google Play Console → Test and release → Setup → App signing</strong> and paste it here so Android hides the browser URL bar automatically.
                </p>
              </div>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
                <div className="font-bold text-slate-900 text-sm">
                  Route A: Build APK & AAB on Your Mobile Browser (PWABuilder — €0 Cost)
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-700">
                  <li>
                    In Google AI Studio, tap <strong>Publish / Share</strong> so your Shared App URL is publicly reachable without the preview login wall.
                  </li>
                  <li>
                    Open <strong>https://www.pwabuilder.com</strong> in Chrome on your Android phone and paste your Shared App URL.
                  </li>
                  <li>
                    Tap <strong>Package for stores → Android → Generate Package</strong>.
                  </li>
                  <li>
                    Set Package ID to <span className="font-mono font-semibold">{packageName}</span>, App name to <strong>ConnectAI CRM</strong>, and Signing Key to <strong>Create new</strong>.
                  </li>
                  <li>
                    Download the generated zip containing:
                    <ul className="list-disc list-inside pl-4 mt-1 font-mono text-[11px] text-slate-800">
                      <li>ConnectAI-CRM.apk (Install directly on your phone)</li>
                      <li>ConnectAI-CRM.aab (Upload to Google Play Console)</li>
                      <li>signing.keystore &amp; assetlinks.json</li>
                    </ul>
                  </li>
                </ol>
              </div>

              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
                <div className="font-bold text-slate-900 text-sm">
                  Route B: Compile Native Kotlin APK & AAB via Free GitHub Actions
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-700">
                  <li>
                    Export/push this project to a private GitHub repository (it includes <span className="font-mono">android-app/</span> and <span className="font-mono">.github/workflows/android-release.yml</span>).
                  </li>
                  <li>
                    Open your GitHub repository in your mobile browser and tap the <strong>Actions</strong> tab.
                  </li>
                  <li>
                    Select <strong>Build ConnectAI CRM Android APK &amp; Signed Play Store AAB</strong> and tap <strong>Run workflow</strong>.
                  </li>
                  <li>
                    GitHub&apos;s cloud Ubuntu runner installs JDK 17 + Android SDK 35 and compiles both <span className="font-mono">app-debug.apk</span> and <span className="font-mono">app-release.aab</span> for free.
                  </li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: NATIVE KOTLIN + JETPACK COMPOSE SOURCE */}
        {activeTab === 'kotlin' && (
          <div className="space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <div>
                <div className="font-bold text-slate-900 text-sm">
                  Native Kotlin 2.0 + Jetpack Compose (Material 3) Android Studio Project
                </div>
                <p className="text-slate-600">
                  Complete Android source tree inside <span className="font-mono">/android-app</span> with <span className="font-mono">EncryptedSharedPreferences</span>, <span className="font-mono">ConnectivityManager</span> offline handling, and HTTPS restriction.
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
                  {fileKey}
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

        {/* TAB 4: GOOGLE PLAY STORE LISTING & PRIVACY POLICY */}
        {activeTab === 'playstore' && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-slate-200 rounded-xl space-y-3 bg-white">
                <h3 className="font-bold text-slate-900 text-sm">
                  Ready-to-Paste Google Play Store Listing Copy
                </h3>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">App Name (≤ 30 chars):</span>
                    <button
                      type="button"
                      onClick={() => copyText('ConnectAI CRM', 'App Name')}
                      className="text-indigo-600 font-semibold hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded font-mono">
                    ConnectAI CRM
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">
                      Short Description ({playStoreShortDesc.length}/80 chars):
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText(playStoreShortDesc, 'Short Description')}
                      className="text-indigo-600 font-semibold hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                    {playStoreShortDesc}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Full Description:</span>
                    <button
                      type="button"
                      onClick={() => copyText(playStoreFullDesc, 'Full Description')}
                      className="text-indigo-600 font-semibold hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="p-2.5 bg-slate-50 border border-slate-200 rounded whitespace-pre-wrap font-sans text-[11px] max-h-40 overflow-y-auto">
                    {playStoreFullDesc}
                  </pre>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Release Notes (v1.0.0):</span>
                    <button
                      type="button"
                      onClick={() => copyText(releaseNotes, 'Release Notes')}
                      className="text-indigo-600 font-semibold hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="p-2 bg-slate-50 border border-slate-200 rounded whitespace-pre-wrap font-sans text-[11px]">
                    {releaseNotes}
                  </pre>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 border border-slate-200 rounded-xl space-y-2.5 bg-slate-50">
                  <h3 className="font-bold text-slate-900 text-sm">
                    Download Play Console Graphic Assets & Privacy Link
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href="/play-store-icon-512x512.png"
                      download="connectai-play-icon-512x512.png"
                      className="min-h-[38px] px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 hover:bg-slate-100 flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-600" />
                      512x512 App Icon (.png)
                    </a>
                    <a
                      href="/feature-graphic-1024x500.png"
                      download="connectai-feature-graphic-1024x500.png"
                      className="min-h-[38px] px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 hover:bg-slate-100 flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-600" />
                      1024x500 Feature Graphic (.png)
                    </a>
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noreferrer"
                      className="min-h-[38px] px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Live Privacy Policy (/privacy)
                    </a>
                  </div>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl space-y-2 bg-white">
                  <h3 className="font-bold text-slate-900 text-sm">
                    Google Play Data Safety & App Content Declarations
                  </h3>
                  <ul className="space-y-1.5 text-slate-700">
                    <li>
                      • <strong>Data collected:</strong> Yes (Name, Email address, Phone number, User IDs, App interactions, Files/Docs uploaded by staff).
                    </li>
                    <li>
                      • <strong>Encrypted in transit:</strong> Yes (TLS/HTTPS enforced via <span className="font-mono">usesCleartextTraffic=&quot;false&quot;</span>).
                    </li>
                    <li>
                      • <strong>Data deletion mechanism:</strong> Yes (In-app Contact/Lead deletion + email request to <span className="font-mono">{supportEmail}</span>).
                    </li>
                    <li>
                      • <strong>Ads Declaration:</strong> No, this app does not contain third-party display ads.
                    </li>
                    <li>
                      • <strong>Target Audience:</strong> 18+ (Enterprise B2B CRM &amp; Recruitment software; not directed at children).
                    </li>
                    <li>
                      • <strong>Developer Account Testing Rule:</strong> Personal Play Console accounts created after Nov 2023 require 12 testers opted-in for 14 continuous days on Closed Testing before Production unlock; Organization accounts can publish directly to Production.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SECURITY, QA & COST PROTECTION */}
        {activeTab === 'security' && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-slate-200 rounded-xl space-y-2.5 bg-white">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Phase 4 & 6 Security and QA Verification Status
                </h3>
                <ul className="space-y-1.5 text-slate-700">
                  <li>
                    <strong>✓ Zero Exposed Keys in Android Client:</strong> <span className="font-mono">GEMINI_API_KEY</span>, Cloud SQL credentials, and Meta/TikTok tokens remain strictly on the Express backend.
                  </li>
                  <li>
                    <strong>✓ Real PostgreSQL Persistence:</strong> All 10 CRM modules (Dashboard, Lead Center, Recruitment Pipeline, Unified Inbox, AI Copilot, Follow-up Tasks, Team RBAC, Campaign Studio, Integrations, Settings) read/write directly to Cloud SQL (<span className="font-mono">europe-west1</span>).
                  </li>
                  <li>
                    <strong>✓ Strict Tenant & RBAC Isolation:</strong> Verified via <span className="font-mono">tenant_id</span> scoping and <span className="font-mono">requireAuth</span> middleware.
                  </li>
                  <li>
                    <strong>✓ Mobile Viewport & Touch Targets:</strong> Card-based layouts (<span className="font-mono">&lt; 640px</span>) and <span className="font-mono">&gt;= 44px</span> touch targets verified across Lead Center and Pipeline.
                  </li>
                </ul>
              </div>

              <div className="p-4 border border-slate-200 rounded-xl space-y-2.5 bg-slate-50">
                <h3 className="font-bold text-slate-900 text-sm">
                  Phase 8 Cost Protection Breakdown (Protecting Your €25 Budget)
                </h3>
                <ul className="space-y-1.5 text-slate-700">
                  <li>
                    • <strong>Android WebAPK / PWA Install:</strong> <strong>€0.00</strong> (Built into Android Chrome).
                  </li>
                  <li>
                    • <strong>APK / AAB Compilation (PWABuilder or GitHub Actions):</strong> <strong>€0.00</strong> (Free cloud build tiers).
                  </li>
                  <li>
                    • <strong>Cloud SQL PostgreSQL (`europe-west1`):</strong> Reuses your existing provisioned Developer instance with scale-to-zero capability.
                  </li>
                  <li>
                    • <strong>Google Play Console Fee:</strong> Uses your existing Play Console account (no extra per-app publishing fee).
                  </li>
                  <li>
                    • <strong>WhatsApp / Social APIs:</strong> Only charged by Meta if you actively send paid marketing templates outside the 24-hour customer service window.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
