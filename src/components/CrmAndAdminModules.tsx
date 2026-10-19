import React, { useState } from 'react';
import {
  Plus,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Download,
  Sliders,
  Users,
  Calendar,
  Workflow,
  KeyRound,
  CreditCard,
  FileSpreadsheet,
  Sparkles,
  Upload,
  Archive,
  Trash2,
  Edit3,
  BriefcaseBusiness,
  LayoutGrid,
  ListFilter,
} from 'lucide-react';
import { BootstrapPayload, LeadRecord } from '../types.ts';

interface ModuleProps {
  data: BootstrapPayload;
  apiFetch: (url: string, options?: RequestInit) => Promise<any>;
  onRefresh: () => Promise<void>;
  notify: (msg: string, type?: 'success' | 'error') => void;
}

// Helper to detect duplicate contact pairs across normalized phone, email, or name/company
function findDuplicateContactPairs(contactsList: BootstrapPayload['contacts']) {
  const pairs: {
    id: string;
    primary: BootstrapPayload['contacts'][0];
    duplicate: BootstrapPayload['contacts'][0];
    reasons: string[];
    confidenceScore: number;
  }[] = [];

  const normalizePhone = (p: string) => p.replace(/[^0-9]/g, '');
  const normalizeName = (n: string) =>
    n
      .toLowerCase()
      .replace(/\(.*?\)/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim();

  for (let i = 0; i < contactsList.length; i++) {
    for (let j = i + 1; j < contactsList.length; j++) {
      // Order so the older record (smaller ID) is default Primary and newer is Duplicate
      const first = contactsList[i].id < contactsList[j].id ? contactsList[i] : contactsList[j];
      const second = contactsList[i].id < contactsList[j].id ? contactsList[j] : contactsList[i];

      const reasons: string[] = [];
      let score = 0;

      const phoneA = normalizePhone(first.phone);
      const phoneB = normalizePhone(second.phone);
      if (phoneA.length >= 7 && phoneA === phoneB) {
        reasons.push(`Matching Normalized Phone (${first.phone})`);
        score += 55;
      }

      if (
        first.email &&
        second.email &&
        first.email.trim().toLowerCase() === second.email.trim().toLowerCase()
      ) {
        reasons.push(`Exact Email Match (${first.email.toLowerCase()})`);
        score += 45;
      }

      const nameA = normalizeName(first.name);
      const nameB = normalizeName(second.name);
      if (nameA && nameB && (nameA === nameB || nameA.includes(nameB) || nameB.includes(nameA))) {
        reasons.push(`Matching Contact Identity ("${first.name}" / "${second.name}")`);
        score += 30;
      }

      if (score >= 45 && reasons.length > 0) {
        pairs.push({
          id: `${first.id}-${second.id}`,
          primary: first,
          duplicate: second,
          reasons,
          confidenceScore: Math.min(99, score),
        });
      }
    }
  }
  return pairs;
}

// Helper to evaluate whether the current user's RBAC membership permits CSV data exports
export function evaluateExportRbac(membership: any): {
  allowed: boolean;
  role: string;
  reason: string;
} {
  if (!membership || !membership.isActive) {
    return {
      allowed: false,
      role: membership?.role || 'unassigned',
      reason: 'Active tenant membership is required to export data.',
    };
  }
  const role = String(membership.role || 'agent');
  let perms: string[] = [];
  try {
    perms = JSON.parse(membership.permissionsJson || '[]');
  } catch {
    perms = [];
  }

  if (perms.includes('revoke_export_data')) {
    return {
      allowed: false,
      role,
      reason: `RBAC Restriction: 'export_data' permission is revoked for role "${role}".`,
    };
  }

  if (
    perms.includes('export_data') ||
    perms.includes('all') ||
    perms.includes('CRM Export & Deletion') ||
    ['platform_admin', 'company_owner', 'company_admin', 'manager', 'analyst'].includes(role)
  ) {
    return {
      allowed: true,
      role,
      reason: `Export Permitted (RBAC Role: ${role} · export_data verified)`,
    };
  }

  return {
    allowed: false,
    role,
    reason: `RBAC Restriction: Role "${role}" lacks 'export_data' permission.`,
  };
}

// Global 'Export Data' CSV Generator with Server-Side RBAC Enforcement & Audit Trail Logging
export async function exportFilteredDataAsCsv(params: {
  moduleName: 'Contacts' | 'Analytics';
  resourceType: 'contacts' | 'analytics';
  filenamePrefix: string;
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
  filterSummary: string;
  data: BootstrapPayload;
  apiFetch: (url: string, options?: RequestInit) => Promise<any>;
  onRefresh: () => Promise<void>;
  notify: (msg: string, type?: 'success' | 'error') => void;
}) {
  const {
    moduleName,
    resourceType,
    filenamePrefix,
    headers,
    rows,
    filterSummary,
    data,
    apiFetch,
    onRefresh,
    notify,
  } = params;

  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = `${filenamePrefix}_${data.activeTenant.slug}_${dateStamp}.csv`;

  // 1. Verify RBAC permission & record immutable Audit Log entry on the server
  try {
    await apiFetch('/api/export/audit', {
      method: 'POST',
      body: JSON.stringify({
        moduleName,
        resourceType,
        recordCount: rows.length,
        filterSummary,
        filename,
      }),
    });
  } catch (err: any) {
    // Refresh so any RBAC denial audit entry is also visible in Audit Logs
    await onRefresh();
    notify(err.message || 'RBAC Policy Denied: You do not have permission to export CSV data.', 'error');
    return;
  }

  // 2. Escape CSV cells per RFC 4180 and trigger client download of the currently filtered dataset
  const escapeCsvCell = (val: string | number | boolean | null | undefined): string => {
    const str = val === null || val === undefined ? '' : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvLines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ];

  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  // 3. Refresh workspace so the new DATA_EXPORTED_CSV Audit Log entry appears immediately
  await onRefresh();
  notify(
    `Exported ${rows.length} filtered ${moduleName} record(s) to ${filename} and logged event in Audit Trail.`
  );
}

// ---------------------------------------------------------------------------
// 1. CRM CONTACTS MODULE (With Duplicate Detection, Merge & RBAC CSV Export)
// ---------------------------------------------------------------------------
export const ContactsModule: React.FC<ModuleProps> = ({ data, apiFetch, onRefresh, notify }) => {
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [consentFilter, setConsentFilter] = useState('all');
  const [exportingCsv, setExportingCsv] = useState(false);
  const [updatingRbac, setUpdatingRbac] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [sourceChannel, setSourceChannel] = useState('whatsapp');
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [requirementsSummary, setRequirementsSummary] = useState('');
  const [swappedPairs, setSwappedPairs] = useState<Record<string, boolean>>({});
  const [mergingPairId, setMergingPairId] = useState<string | null>(null);
  const [simulatingDup, setSimulatingDup] = useState<boolean>(false);

  const duplicatePairs = findDuplicateContactPairs(data.contacts);
  const mergeAuditLogs = data.auditLogs.filter(
    (log) =>
      log.action === 'CONTACT_RECORDS_MERGED' || log.action === 'DUPLICATE_CONTACT_DETECTED'
  );
  const exportAuditLogs = data.auditLogs.filter(
    (log) =>
      (log.action === 'DATA_EXPORTED_CSV' || log.action === 'DATA_EXPORT_DENIED_RBAC') &&
      log.resourceType === 'contacts'
  );

  const rbacStatus = evaluateExportRbac(data.membership);

  const filtered = data.contacts.filter((c) => {
    if (channelFilter !== 'all' && !c.sourceChannel.toLowerCase().includes(channelFilter)) {
      return false;
    }
    if (consentFilter !== 'all' && c.consentStatus !== consentFilter) {
      return false;
    }
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  const activeFilterSummary = [
    channelFilter !== 'all' ? `Channel=${channelFilter}` : 'Channel=All',
    consentFilter !== 'all' ? `Consent=${consentFilter}` : 'Consent=All',
    search.trim() ? `Query="${search.trim()}"` : null,
  ]
    .filter(Boolean)
    .join(', ');

  const handleExportContactsCsv = async () => {
    setExportingCsv(true);
    try {
      await exportFilteredDataAsCsv({
        moduleName: 'Contacts',
        resourceType: 'contacts',
        filenamePrefix: 'connectai_contacts_filtered',
        headers: [
          'Contact ID',
          'Full Name',
          'Company',
          'Phone / Handle',
          'Email',
          'Source Channel',
          'Preferred Language',
          'Consent Status',
          'Connected Channel Endpoint',
          'Assigned Owner',
          'Extracted Requirements',
          'Notes',
          'Created At',
        ],
        rows: filtered.map((c) => [
          c.id,
          c.name,
          c.company || 'Direct Prospect',
          c.phone,
          c.email || '',
          c.sourceChannel,
          c.preferredLanguage,
          c.consentStatus,
          c.connectedNumberDisplay,
          c.assignedEmployee,
          c.requirementsSummary,
          c.notes || '',
          c.createdAt,
        ]),
        filterSummary: activeFilterSummary,
        data,
        apiFetch,
        onRefresh,
        notify,
      });
    } finally {
      setExportingCsv(false);
    }
  };

  const handleToggleExportRbac = async () => {
    setUpdatingRbac(true);
    try {
      const nextAllow = !rbacStatus.allowed;
      await apiFetch('/api/membership/rbac', {
        method: 'PATCH',
        body: JSON.stringify({
          role: nextAllow ? 'company_owner' : 'agent',
          allowExport: nextAllow,
        }),
      });
      await onRefresh();
      notify(
        nextAllow
          ? 'RBAC Updated: Granted export_data permission (company_owner).'
          : 'RBAC Updated: Restricted export_data permission (agent role) to test RBAC enforcement.'
      );
    } catch (err: any) {
      notify(err.message || 'Failed to update RBAC permission', 'error');
    } finally {
      setUpdatingRbac(false);
    }
  };

  const handleMergePair = async (
    pairId: string,
    primaryContactId: number,
    duplicateContactId: number
  ) => {
    setMergingPairId(pairId);
    try {
      const res = await apiFetch('/api/contacts/merge', {
        method: 'POST',
        body: JSON.stringify({
          primaryContactId,
          duplicateContactId,
        }),
      });
      await onRefresh();
      notify(res.auditSummary || `Merged Contact #${duplicateContactId} into #${primaryContactId}.`);
    } catch (err: any) {
      notify(err.message || 'Failed to merge duplicate contacts', 'error');
    } finally {
      setMergingPairId(null);
    }
  };

  const handleSimulateDuplicate = async () => {
    setSimulatingDup(true);
    try {
      await apiFetch('/api/contacts/simulate-duplicate', {
        method: 'POST',
      });
      await onRefresh();
      notify('Simulated cross-channel duplicate contact for deduplication review.');
    } catch (err: any) {
      notify(err.message || 'Failed to simulate duplicate contact', 'error');
    } finally {
      setSimulatingDup(false);
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    try {
      await apiFetch('/api/contacts', {
        method: 'POST',
        body: JSON.stringify({
          name,
          phone,
          email,
          company,
          sourceChannel,
          preferredLanguage,
          requirementsSummary,
        }),
      });
      setName('');
      setPhone('');
      setEmail('');
      setCompany('');
      setRequirementsSummary('');
      await onRefresh();
      notify(`Saved CRM Contact: ${name}`);
    } catch (err: any) {
      notify(err.message || 'Failed to create contact', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* NEW UI SECTION: Detected Duplicate Contacts & Record Consolidation */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h2 className="text-base font-semibold text-slate-900">
                Detected Duplicate Contacts & Record Consolidation
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Automatically identifies cross-channel duplicate profiles (WhatsApp, Instagram, Facebook, TikTok) by normalized phone, email, and company identity. Merging consolidates requirements, notes, conversations, and leads while recording an immutable audit log.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <span className="text-xs font-mono tabular-nums text-slate-600">
              {duplicatePairs.length} duplicate pair(s) detected
            </span>
            <button
              type="button"
              onClick={handleSimulateDuplicate}
              disabled={simulatingDup}
              className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-3.5 py-2.5 sm:py-1.5 text-xs font-medium border border-slate-200 bg-slate-50 text-slate-800 rounded-lg hover:bg-slate-100"
            >
              {simulatingDup ? 'Simulating...' : '+ Simulate Cross-Channel Duplicate'}
            </button>
          </div>
        </div>

        {duplicatePairs.length > 0 ? (
          <div className="space-y-4">
            {duplicatePairs.map((pair) => {
              const isSwapped = Boolean(swappedPairs[pair.id]);
              const targetPrimary = isSwapped ? pair.duplicate : pair.primary;
              const targetDuplicate = isSwapped ? pair.primary : pair.duplicate;

              const primaryConvCount = data.conversations.filter(
                (c) => c.contactId === targetPrimary.id
              ).length;
              const dupConvCount = data.conversations.filter(
                (c) => c.contactId === targetDuplicate.id
              ).length;

              return (
                <div
                  key={pair.id}
                  className="border border-amber-200 bg-amber-50/30 rounded-xl p-4 space-y-4 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/80 pb-3">
                    <div className="space-y-1 min-w-0">
                      <div className="font-semibold text-slate-900 break-words">
                        Match Reasons: {pair.reasons.join(' · ')}
                      </div>
                      <div className="text-slate-500 font-mono tabular-nums break-words">
                        Deduplication Confidence: {pair.confidenceScore}% · Channels:{' '}
                        {targetPrimary.sourceChannel.toUpperCase()} +{' '}
                        {targetDuplicate.sourceChannel.toUpperCase()}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() =>
                          setSwappedPairs((prev) => ({ ...prev, [pair.id]: !prev[pair.id] }))
                        }
                        className="min-h-[44px] sm:min-h-0 px-3 py-2.5 sm:py-1.5 text-xs font-medium border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-slate-50"
                      >
                        Swap Primary / Duplicate
                      </button>
                      <button
                        type="button"
                        disabled={mergingPairId === pair.id}
                        onClick={() =>
                          handleMergePair(pair.id, targetPrimary.id, targetDuplicate.id)
                        }
                        className="min-h-[44px] sm:min-h-0 px-3.5 py-2.5 sm:py-1.5 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
                      >
                        {mergingPairId === pair.id
                          ? 'Consolidating & Logging Audit...'
                          : `Merge Records (#${targetDuplicate.id} → #${targetPrimary.id})`}
                      </button>
                    </div>
                  </div>

                  {/* Side-by-Side Comparison of Primary vs Duplicate Record */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Primary Record Card */}
                    <div className="bg-white border border-slate-200 rounded-md p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono text-emerald-700 font-semibold">
                        <span>MASTER / PRIMARY RECORD (RETAINED · ID #{targetPrimary.id})</span>
                        <span>{primaryConvCount} thread(s)</span>
                      </div>
                      <div className="font-semibold text-sm text-slate-900">
                        {targetPrimary.name}
                      </div>
                      <div className="font-mono tabular-nums text-slate-700">
                        {targetPrimary.phone} · {targetPrimary.email || 'No email'}
                      </div>
                      <div className="text-slate-600">
                        Company: {targetPrimary.company || '—'} · Source:{' '}
                        {targetPrimary.sourceChannel.toUpperCase()} · Owner:{' '}
                        {targetPrimary.assignedEmployee}
                      </div>
                      <div className="text-slate-700 pt-1 border-t border-slate-100">
                        <span className="font-medium text-slate-900">Requirements:</span>{' '}
                        {targetPrimary.requirementsSummary || 'None'}
                      </div>
                    </div>

                    {/* Duplicate Record Card */}
                    <div className="bg-white border border-slate-200 rounded-md p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono text-amber-700 font-semibold">
                        <span>DUPLICATE RECORD (CONSOLIDATED · ID #{targetDuplicate.id})</span>
                        <span>{dupConvCount} thread(s) will re-link</span>
                      </div>
                      <div className="font-semibold text-sm text-slate-900">
                        {targetDuplicate.name}
                      </div>
                      <div className="font-mono tabular-nums text-slate-700">
                        {targetDuplicate.phone} · {targetDuplicate.email || 'No email'}
                      </div>
                      <div className="text-slate-600">
                        Company: {targetDuplicate.company || '—'} · Source:{' '}
                        {targetDuplicate.sourceChannel.toUpperCase()} · Owner:{' '}
                        {targetDuplicate.assignedEmployee}
                      </div>
                      <div className="text-slate-700 pt-1 border-t border-slate-100">
                        <span className="font-medium text-slate-900">
                          Requirements to Consolidate:
                        </span>{' '}
                        {targetDuplicate.requirementsSummary || 'None'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600 flex items-center justify-between">
            <span>
              All CRM contact records are currently deduplicated. Click "+ Simulate Cross-Channel Duplicate" above to test duplicate detection and record merging.
            </span>
          </div>
        )}

        {/* Preserved Merge Audit Trail */}
        {mergeAuditLogs.length > 0 && (
          <div className="pt-3 border-t border-slate-200 space-y-2">
            <div className="text-xs font-semibold text-slate-900">
              Contact Deduplication & Merge Audit Trail (Preserved History)
            </div>
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-md bg-slate-50 text-xs">
              {mergeAuditLogs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <span className="font-mono font-semibold text-slate-900">{log.action}</span>
                    <span className="text-slate-500"> · Actor: {log.actorName} · </span>
                    <span className="text-slate-700">{log.details}</span>
                  </div>
                  <span className="font-mono tabular-nums text-[11px] text-slate-500 shrink-0">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main CRM Contacts Registry (Card Layout on Mobile < 640px, Table on >= 640px) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-4 shadow-xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">
              Lead Center — CRM Contacts & Consent Registry ({filtered.length} of{' '}
              {data.contacts.length} shown)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Persistent customer & candidate profiles synchronized across WhatsApp, Instagram, Facebook, and TikTok with explicit opt-in tracking and RBAC-governed CSV export.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleToggleExportRbac}
              disabled={updatingRbac}
              title="Click to test RBAC permission enforcement for CSV exports"
              className={`min-h-[44px] sm:min-h-0 px-3 py-2.5 sm:py-1.5 text-xs font-mono rounded-lg border text-center ${
                rbacStatus.allowed
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  : 'border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100'
              }`}
            >
              {rbacStatus.allowed
                ? `RBAC: export_data Allowed (${rbacStatus.role})`
                : `RBAC: export_data Restricted (${rbacStatus.role})`}
            </button>

            <button
              type="button"
              onClick={handleExportContactsCsv}
              disabled={exportingCsv}
              className="min-h-[44px] sm:min-h-0 px-4 py-2.5 sm:py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
              {exportingCsv
                ? 'Exporting & Auditing...'
                : `Export Data (${filtered.length} CSV)`}
            </button>
          </div>
        </div>

        {/* Multi-Dimensional Contact Filter Bar (Touch-Optimized & Zero Overflow) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
          <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <span className="font-medium text-slate-700">Filter Contacts:</span>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-3 py-2 sm:p-1.5 border border-slate-200 rounded-lg bg-white text-slate-800"
            >
              <option value="all">All Channels</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="tiktok">TikTok</option>
            </select>

            <select
              value={consentFilter}
              onChange={(e) => setConsentFilter(e.target.value)}
              className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-3 py-2 sm:p-1.5 border border-slate-200 rounded-lg bg-white text-slate-800"
            >
              <option value="all">All Consent States</option>
              <option value="opted_in">Opted In</option>
              <option value="pending">Pending Consent</option>
            </select>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, email, company..."
              className="w-full sm:w-64 min-h-[44px] sm:min-h-0 px-3 py-2 sm:p-1.5 border border-slate-200 rounded-lg bg-white"
            />
          </div>

          <div className="font-mono text-[11px] text-slate-500 break-words">
            Active Scope: {activeFilterSummary}
          </div>
        </div>

        {/* Recent Contacts Export Audit Log Entries */}
        {exportAuditLogs.length > 0 && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <div className="font-semibold text-slate-900">
              Latest Contacts Export Audit Log Entry:
            </div>
            <div className="font-mono text-[11px] text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 break-words">
              <span>
                [{exportAuditLogs[0].action}] {exportAuditLogs[0].details}
              </span>
              <span className="text-slate-500 shrink-0">
                {new Date(exportAuditLogs[0].createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* MOBILE VIEW (< 640px): Card-Based Layout with Zero Horizontal Overflow */}
        <div className="sm:hidden space-y-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="p-4 border border-slate-200 rounded-xl bg-white space-y-3 text-xs shadow-2xs"
            >
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-slate-900 break-words">
                    {c.name}{' '}
                    <span className="font-mono text-[11px] text-slate-400">#{c.id}</span>
                  </div>
                  <div className="text-slate-500 break-words">
                    {c.company || 'Direct Prospect'}
                  </div>
                </div>
                <div className="text-right shrink-0 text-[11px] text-slate-500">
                  <div>Owner</div>
                  <div className="font-medium text-slate-900">{c.assignedEmployee}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-1.5 font-mono tabular-nums text-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 font-sans">Phone / Handle:</span>
                  <span className="font-semibold text-slate-900 break-all">{c.phone}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 font-sans">Email:</span>
                  <span className="text-slate-700 break-all">{c.email || '—'}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                <span className="uppercase font-mono font-semibold text-indigo-600">
                  {c.sourceChannel}
                </span>
                <span aria-hidden="true">·</span>
                <span>{c.preferredLanguage}</span>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-slate-900">
                  Consent: {c.consentStatus.replace(/_/g, ' ')}
                </span>
              </div>

              {(c.requirementsSummary || c.notes) && (
                <div className="p-2.5 bg-slate-50 rounded-lg space-y-1 text-slate-700 break-words">
                  {c.requirementsSummary && <div>{c.requirementsSummary}</div>}
                  {c.notes && (
                    <div className="text-[11px] text-slate-500 whitespace-pre-line">
                      {c.notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-6 text-center text-xs text-slate-500">
              No contacts match the active filters.
            </div>
          )}
        </div>

        {/* TABLET & DESKTOP VIEW (>= 640px): Structured Data Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 pr-4 font-medium">Name & Company</th>
                <th className="py-2.5 px-4 font-medium">Phone / @Handle & Email</th>
                <th className="py-2.5 px-4 font-medium">Source & Language</th>
                <th className="py-2.5 px-4 font-medium">Consent Status</th>
                <th className="py-2.5 px-4 font-medium">Extracted Requirements & Merge Notes</th>
                <th className="py-2.5 pl-4 font-medium text-right">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="py-3 pr-4">
                    <div className="font-semibold text-slate-900">
                      {c.name}{' '}
                      <span className="font-mono text-[11px] text-slate-400">#{c.id}</span>
                    </div>
                    <div className="text-slate-500">{c.company || 'Direct Prospect'}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-mono tabular-nums text-slate-900">{c.phone}</div>
                    <div className="text-slate-500">{c.email || '—'}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="uppercase text-slate-800 font-mono text-[11px]">
                      {c.sourceChannel}
                    </div>
                    <div className="text-slate-500">{c.preferredLanguage}</div>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900">
                    {c.consentStatus.replace(/_/g, ' ')}
                  </td>
                  <td className="py-3 px-4 max-w-md text-slate-700">
                    <div>{c.requirementsSummary}</div>
                    {c.notes && (
                      <div className="text-[11px] text-slate-500 mt-1 whitespace-pre-line">
                        {c.notes}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pl-4 text-right text-slate-700">{c.assignedEmployee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Contact Form (Touch-Optimized 44px Inputs & Submit Button) */}
      <form
        onSubmit={handleCreateContact}
        className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-4 shadow-xs"
      >
        <h3 className="text-sm font-semibold text-slate-900">Create New CRM Contact</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Elena Rostova"
              className="w-full min-h-[44px] sm:min-h-0 p-2.5 sm:p-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Phone or Social Handle</label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+44 7700 900511"
              className="w-full min-h-[44px] sm:min-h-0 p-2.5 sm:p-2 border border-slate-200 rounded-lg font-mono"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="elena@company.com"
              className="w-full min-h-[44px] sm:min-h-0 p-2.5 sm:p-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Company</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Baltic Marine Group"
              className="w-full min-h-[44px] sm:min-h-0 p-2.5 sm:p-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Source Channel</label>
            <select
              value={sourceChannel}
              onChange={(e) => setSourceChannel(e.target.value)}
              className="w-full min-h-[44px] sm:min-h-0 p-2.5 sm:p-2 border border-slate-200 rounded-lg bg-white"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="tiktok">TikTok</option>
            </select>
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Preferred Language</label>
            <input
              type="text"
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
              className="w-full min-h-[44px] sm:min-h-0 p-2.5 sm:p-2 border border-slate-200 rounded-lg"
            />
          </div>
        </div>
        <div className="text-xs">
          <label className="block font-medium text-slate-700 mb-1">Requirements & Notes</label>
          <input
            type="text"
            value={requirementsSummary}
            onChange={(e) => setRequirementsSummary(e.target.value)}
            placeholder="Interested in 30 WhatsApp numbers + Instagram DM automation..."
            className="w-full min-h-[44px] sm:min-h-0 p-2.5 sm:p-2 border border-slate-200 rounded-lg"
          />
        </div>
        <button
          type="submit"
          className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-5 py-2.5 sm:py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800"
        >
          Save Contact to PostgreSQL
        </button>
      </form>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 2. RECRUITMENT PIPELINE, CANDIDATE MANAGEMENT & SALES OPPORTUNITIES MODULE
// ---------------------------------------------------------------------------
export const PipelineModule: React.FC<ModuleProps> = ({ data, apiFetch, onRefresh, notify }) => {
  const [viewLayout, setViewLayout] = useState<'table' | 'kanban'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);

  // Create / Edit Candidate & Lead Form State
  const [editingLeadId, setEditingLeadId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [nationality, setNationality] = useState('');
  const [preferredJob, setPreferredJob] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('');
  const [ownerName, setOwnerName] = useState(data.user.name || 'Marcus Chen');
  const [sourceChannel, setSourceChannel] = useState('whatsapp');
  const [priority, setPriority] = useState('high');
  const [stage, setStage] = useState('Qualified');
  const [estimatedValueUsd, setEstimatedValueUsd] = useState('4800');
  const [leadScore, setLeadScore] = useState('85');
  const [nextFollowUpAt, setNextFollowUpAt] = useState('2026-10-24');
  const [extractedRequirements, setExtractedRequirements] = useState('');
  const [notes, setNotes] = useState('');

  // CSV Import & Export State
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvText, setCsvText] = useState(
    'contactName,phone,email,nationality,preferredJob,destinationCountry,sourceChannel,stage,estimatedValueUsd,notes\nMateo Silva,+34 612 889 104,mateo.silva@example.com,Spain,Senior Marine Engineer,United Arab Emirates,whatsapp,Qualified,6500,Valid STCW certificates and 8 years offshore vessel experience\nNadia Mansoor,+971 50 443 9921,nadia.m@example.com,UAE,Hospitality Operations Manager,Qatar,instagram,Interested,4200,Fluent Arabic and English; available within 30 days'
  );
  const [importingCsv, setImportingCsv] = useState(false);
  const [exportingLeadsCsv, setExportingLeadsCsv] = useState(false);
  const [aiScreeningLeadId, setAiScreeningLeadId] = useState<number | null>(null);

  const stages = [
    'New Lead',
    'Contacted',
    'Interested',
    'Documents Pending',
    'Qualified',
    'Employer Review',
    'Offer',
    'Visa Process',
    'Deployed',
    'Meeting Booked',
    'Proposal Sent',
    'Negotiation',
    'Won',
    'On Hold',
    'Rejected',
    'Lost',
  ];

  const uniqueOwners = Array.from(
    new Set([
      data.user.name,
      'Marcus Chen',
      'Layla Al-Mansoor',
      'Sofia Rossi',
      ...data.leads.map((l) => l.ownerName).filter(Boolean),
    ])
  );

  const filteredLeads = data.leads.filter((l) => {
    if (!showArchived && l.isArchived) return false;
    if (stageFilter !== 'all' && l.stage !== stageFilter) return false;
    if (channelFilter !== 'all' && l.sourceChannel.toLowerCase() !== channelFilter.toLowerCase()) {
      return false;
    }
    if (ownerFilter !== 'all' && l.ownerName !== ownerFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        l.title.toLowerCase().includes(q) ||
        l.contactName.toLowerCase().includes(q) ||
        (l.phone || '').toLowerCase().includes(q) ||
        (l.email || '').toLowerCase().includes(q) ||
        (l.nationality || '').toLowerCase().includes(q) ||
        (l.preferredJob || '').toLowerCase().includes(q) ||
        (l.destinationCountry || '').toLowerCase().includes(q) ||
        (l.extractedRequirements || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleStageChange = async (leadId: number, nextStage: string) => {
    try {
      await apiFetch(`/api/leads/${leadId}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({ stage: nextStage }),
      });
      await onRefresh();
      notify(`Moved candidate/lead #${leadId} to "${nextStage}".`);
    } catch (err: any) {
      notify(err.message || 'Failed to update stage', 'error');
    }
  };

  const resetLeadForm = () => {
    setEditingLeadId(null);
    setTitle('');
    setContactName('');
    setPhone('');
    setEmail('');
    setNationality('');
    setPreferredJob('');
    setDestinationCountry('');
    setExtractedRequirements('');
    setNotes('');
    setStage('Qualified');
    setEstimatedValueUsd('4800');
    setLeadScore('85');
  };

  const handleStartEditLead = (lead: LeadRecord) => {
    setEditingLeadId(lead.id);
    setTitle(lead.title);
    setContactName(lead.contactName);
    setPhone(lead.phone || '');
    setEmail(lead.email || '');
    setNationality(lead.nationality || '');
    setPreferredJob(lead.preferredJob || '');
    setDestinationCountry(lead.destinationCountry || '');
    setOwnerName(lead.ownerName || data.user.name);
    setSourceChannel(lead.sourceChannel || 'whatsapp');
    setPriority(lead.priority || 'high');
    setStage(lead.stage || 'Qualified');
    setEstimatedValueUsd(String(lead.estimatedValueUsd || '4800'));
    setLeadScore(String(lead.leadScore || 85));
    setNextFollowUpAt(lead.nextFollowUpAt || '2026-10-25');
    setExtractedRequirements(lead.extractedRequirements || '');
    setNotes(lead.notes || '');
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim()) return;
    try {
      const payload = {
        title:
          title.trim() ||
          `${contactName} — ${preferredJob || 'Candidate'} (${destinationCountry || 'Global'})`,
        contactName,
        phone,
        email,
        nationality,
        preferredJob,
        destinationCountry,
        ownerName,
        sourceChannel,
        priority,
        stage,
        estimatedValueUsd,
        leadScore: Number(leadScore) || 85,
        nextFollowUpAt,
        extractedRequirements:
          extractedRequirements ||
          `${preferredJob || 'Role'} · Destination: ${destinationCountry || 'TBD'} · Nationality: ${nationality || 'TBD'}`,
        notes,
      };

      if (editingLeadId) {
        await apiFetch(`/api/leads/${editingLeadId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        notify(`Updated candidate/lead record #${editingLeadId} (${contactName}).`);
      } else {
        await apiFetch('/api/leads', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        notify(`Created candidate/lead record for ${contactName} in ${stage}.`);
      }
      resetLeadForm();
      await onRefresh();
    } catch (err: any) {
      notify(err.message || 'Failed to save candidate/lead', 'error');
    }
  };

  const handleToggleArchiveLead = async (lead: LeadRecord) => {
    try {
      await apiFetch(`/api/leads/${lead.id}/archive`, {
        method: 'PATCH',
        body: JSON.stringify({ isArchived: !lead.isArchived }),
      });
      await onRefresh();
      notify(
        lead.isArchived
          ? `Restored candidate/lead #${lead.id} (${lead.contactName}) from archive.`
          : `Archived candidate/lead #${lead.id} (${lead.contactName}).`
      );
    } catch (err: any) {
      notify(err.message || 'Failed to archive lead', 'error');
    }
  };

  const handleDeleteLead = async (lead: LeadRecord) => {
    try {
      await apiFetch(`/api/leads/${lead.id}`, {
        method: 'DELETE',
      });
      await onRefresh();
      notify(`Deleted candidate/lead #${lead.id} (${lead.contactName}) and logged audit trail.`);
    } catch (err: any) {
      notify(err.message || 'Failed to delete lead (check RBAC role)', 'error');
    }
  };

  const handleRunInlineAiScreen = async (lead: LeadRecord) => {
    setAiScreeningLeadId(lead.id);
    try {
      const res = await apiFetch('/api/ai/recruitment-assistant', {
        method: 'POST',
        body: JSON.stringify({
          leadId: lead.id,
          contactName: lead.contactName,
          nationality: lead.nationality,
          preferredJob: lead.preferredJob || lead.title,
          destinationCountry: lead.destinationCountry,
          notes: lead.notes || lead.extractedRequirements,
        }),
      });
      const asst = res.assistant;
      if (asst) {
        await apiFetch(`/api/leads/${lead.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            leadScore: asst.qualificationScore,
            scoreExplanation: asst.candidateSummary,
            notes: `${lead.notes ? lead.notes + '\n' : ''}[AI Copilot]: Recommended stage "${asst.recommendedStage}". Follow-up draft: ${asst.whatsappFollowUpMessage}`,
          }),
        });
        await onRefresh();
        notify(
          `AI Copilot scored ${lead.contactName}: ${asst.qualificationScore}/100 · Recommended: ${asst.recommendedStage}`
        );
      }
    } catch (err: any) {
      notify(err.message || 'AI screening failed', 'error');
    } finally {
      setAiScreeningLeadId(null);
    }
  };

  const handleImportCsvSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) return;
    setImportingCsv(true);
    try {
      const lines = csvText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 2) {
        notify('CSV must include a header row and at least 1 candidate row.', 'error');
        setImportingCsv(false);
        return;
      }
      const headers = lines[0].split(',').map((h) => h.trim());
      const rows = lines.slice(1).map((line) => {
        const cols = line.split(',').map((c) => c.trim());
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
          obj[h] = cols[i] || '';
        });
        return obj;
      });

      const res = await apiFetch('/api/leads/import-csv', {
        method: 'POST',
        body: JSON.stringify({ rows }),
      });
      await onRefresh();
      setShowCsvImport(false);
      notify(
        `CSV Import Complete: ${res.importedCount} candidates imported, ${res.skippedDuplicatesCount} duplicates skipped.`
      );
    } catch (err: any) {
      notify(err.message || 'CSV import failed', 'error');
    } finally {
      setImportingCsv(false);
    }
  };

  const handleExportPipelineCsv = async () => {
    setExportingLeadsCsv(true);
    try {
      const headers = [
        'Lead ID',
        'Candidate / Contact Name',
        'Opportunity / Job Title',
        'Phone',
        'Email',
        'Nationality',
        'Preferred Job',
        'Destination Country',
        'Stage',
        'Source Channel',
        'Assigned Staff',
        'AI Score',
        'Estimated Value (USD)',
        'Next Follow-Up',
        'Requirements & Notes',
      ];
      const rows = filteredLeads.map((l) => [
        l.id,
        l.contactName,
        l.title,
        l.phone || '',
        l.email || '',
        l.nationality || '',
        l.preferredJob || '',
        l.destinationCountry || '',
        l.stage,
        l.sourceChannel,
        l.ownerName,
        l.leadScore,
        l.estimatedValueUsd,
        l.nextFollowUpAt || '',
        `${l.extractedRequirements || ''} ${l.notes || ''}`.trim(),
      ]);

      await exportFilteredDataAsCsv({
        moduleName: 'Contacts',
        resourceType: 'contacts',
        filenamePrefix: 'connectai_recruitment_pipeline',
        headers,
        rows,
        filterSummary: `Stage=${stageFilter}, Channel=${channelFilter}, Owner=${ownerFilter}, Search="${searchQuery || 'none'}"`,
        data,
        apiFetch,
        onRefresh,
        notify,
      });
    } finally {
      setExportingLeadsCsv(false);
    }
  };

  const totalPipelineValue = filteredLeads.reduce(
    (acc, l) => acc + (Number(l.estimatedValueUsd) || 0),
    0
  );

  const duplicatePairs = findDuplicateContactPairs(data.contacts);
  const mergeAuditLogs = data.auditLogs.filter(
    (log) =>
      log.action === 'CONTACT_RECORDS_MERGED' || log.action === 'DUPLICATE_CONTACT_DETECTED'
  );

  const handleQuickMerge = async (primaryId: number, duplicateId: number) => {
    try {
      const res = await apiFetch('/api/contacts/merge', {
        method: 'POST',
        body: JSON.stringify({
          primaryContactId: primaryId,
          duplicateContactId: duplicateId,
        }),
      });
      await onRefresh();
      notify(res.auditSummary || `Merged Contact #${duplicateId} into #${primaryId}.`);
    } catch (err: any) {
      notify(err.message || 'Failed to merge duplicate contacts', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* CRM Duplicate Contacts Alert & Merge Records Action */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-slate-900">
                Detected Duplicate Contacts & Candidate Consolidation
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Consolidate cross-channel duplicate contacts linked to recruitment and sales pipeline records while preserving full audit trails.
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-600">
            {duplicatePairs.length} duplicate pair(s) active
          </span>
        </div>

        {duplicatePairs.length > 0 ? (
          <div className="space-y-3">
            {duplicatePairs.map((pair) => (
              <div
                key={pair.id}
                className="p-3.5 border border-amber-200 bg-amber-50/30 rounded-lg flex flex-wrap items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900">
                    {pair.primary.name} (#{pair.primary.id} · {pair.primary.sourceChannel.toUpperCase()}) ⇄{' '}
                    {pair.duplicate.name} (#{pair.duplicate.id} · {pair.duplicate.sourceChannel.toUpperCase()})
                  </div>
                  <div className="text-slate-600">
                    {pair.reasons.join(' · ')} · Confidence: {pair.confidenceScore}%
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleQuickMerge(pair.primary.id, pair.duplicate.id)}
                  className="px-3.5 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-md hover:bg-slate-800 whitespace-nowrap"
                >
                  Merge Records
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-500">
            Zero duplicate contacts currently detected across pipeline leads.
          </div>
        )}

        {mergeAuditLogs.length > 0 && (
          <div className="pt-2 border-t border-slate-200 text-xs space-y-1">
            <div className="font-semibold text-slate-800">Recent Merge Audit Trail:</div>
            {mergeAuditLogs.slice(0, 3).map((log) => (
              <div key={log.id} className="text-slate-600 font-mono text-[11px]">
                [{new Date(log.createdAt).toLocaleTimeString()}] {log.action} by {log.actorName}:{' '}
                {log.details}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Recruitment & Sales Pipeline Control Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              International Recruitment & Omnichannel Opportunity Pipeline
            </h2>
            <p className="text-xs text-slate-500">
              Track candidates and enterprise deals from New Lead, Documents Pending, and Employer Review through Offer, Visa Process, Deployed, and Won.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* View Switcher */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setViewLayout('table')}
                className={`px-3 py-1.5 font-medium rounded-md flex items-center gap-1.5 ${
                  viewLayout === 'table'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                Table View
              </button>
              <button
                type="button"
                onClick={() => setViewLayout('kanban')}
                className={`px-3 py-1.5 font-medium rounded-md flex items-center gap-1.5 ${
                  viewLayout === 'kanban'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Stage Board
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowCsvImport(!showCsvImport)}
              className="px-3 py-1.5 border border-slate-200 bg-white text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              Import CSV
            </button>

            <button
              type="button"
              onClick={handleExportPipelineCsv}
              disabled={exportingLeadsCsv}
              className="px-3.5 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              {exportingLeadsCsv ? 'Exporting...' : `Export CSV (${filteredLeads.length})`}
            </button>
          </div>
        </div>

        {/* CSV Import Drawer */}
        {showCsvImport && (
          <form
            onSubmit={handleImportCsvSubmit}
            className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs"
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-900">
                Bulk CSV Candidate & Lead Import (Automatic Duplicate Detection by Phone / Email)
              </div>
              <button
                type="button"
                onClick={() => setShowCsvImport(false)}
                className="text-slate-500 underline"
              >
                Close
              </button>
            </div>
            <p className="text-slate-600">
              Paste CSV rows with headers: <span className="font-mono">contactName,phone,email,nationality,preferredJob,destinationCountry,sourceChannel,stage,estimatedValueUsd,notes</span>
            </p>
            <textarea
              rows={4}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-lg bg-white font-mono text-[11px]"
            />
            <button
              type="submit"
              disabled={importingCsv}
              className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {importingCsv ? 'Validating & Importing...' : 'Validate & Import Candidates'}
            </button>
          </form>
        )}

        {/* Search & Multi-Dimensional Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
          <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate, job, country, phone..."
              className="w-full sm:w-56 min-h-[44px] sm:min-h-0 px-3 py-2 sm:p-1.5 border border-slate-200 rounded-lg bg-white"
            />
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-3 py-2 sm:p-1.5 border border-slate-200 rounded-lg bg-white text-slate-800"
            >
              <option value="all">All Stages ({data.leads.length})</option>
              {stages.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-3 py-2 sm:p-1.5 border border-slate-200 rounded-lg bg-white text-slate-800"
            >
              <option value="all">All Channels</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="tiktok">TikTok</option>
            </select>
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-3 py-2 sm:p-1.5 border border-slate-200 rounded-lg bg-white text-slate-800"
            >
              <option value="all">All Assigned Staff</option>
              {uniqueOwners.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-slate-700 min-h-[44px] sm:min-h-0 px-1">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Show Archived
            </label>
          </div>
          <div className="font-mono tabular-nums text-slate-900 font-semibold">
            Filtered Pipeline: ${totalPipelineValue.toLocaleString()} ({filteredLeads.length} records)
          </div>
        </div>

        {/* TABLE VIEW vs KANBAN BOARD VIEW */}
        {viewLayout === 'table' ? (
          <>
            {/* Mobile Card Layout (< 640px) for Recruitment Pipeline */}
            <div className="sm:hidden space-y-3">
              {filteredLeads.map((lead) => (
                <div
                  key={lead.id}
                  className={`p-4 border border-slate-200 rounded-xl bg-white space-y-3 text-xs shadow-2xs ${
                    lead.isArchived ? 'opacity-60 bg-slate-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-slate-900 break-words">
                        {lead.contactName}{' '}
                        <span className="font-mono text-[11px] text-slate-400">#{lead.id}</span>
                      </div>
                      <div className="text-slate-600 break-words">{lead.title}</div>
                    </div>
                    <div className="text-right font-mono tabular-nums shrink-0">
                      <div className="font-semibold text-emerald-700">
                        ${Number(lead.estimatedValueUsd).toLocaleString()}
                      </div>
                      <div className="text-[11px] text-indigo-600 font-semibold">
                        Score: {lead.leadScore}/100
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-slate-700">
                    <div>
                      <span className="text-slate-500">Role:</span>{' '}
                      <span className="font-medium text-slate-900">
                        {lead.preferredJob || 'Enterprise / General Role'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Route:</span>{' '}
                      {lead.nationality || 'International'} → {lead.destinationCountry || 'Global'}
                    </div>
                    <div className="font-mono text-[11px] text-slate-500 break-all">
                      {lead.phone || 'No phone'} · {lead.sourceChannel.toUpperCase()} · Owner:{' '}
                      {lead.ownerName}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <select
                      value={lead.stage}
                      onChange={(e) => handleStageChange(lead.id, e.target.value)}
                      className="w-full min-h-[44px] px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 font-medium text-slate-900"
                    >
                      {stages.map((st) => (
                        <option key={st} value={st}>
                          Stage: {st}
                        </option>
                      ))}
                    </select>

                    <div className="grid grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => handleRunInlineAiScreen(lead)}
                        disabled={aiScreeningLeadId === lead.id}
                        className="min-h-[44px] flex items-center justify-center gap-1 text-indigo-600 bg-indigo-50/60 hover:bg-indigo-100 rounded-lg border border-indigo-200 font-medium"
                      >
                        <Sparkles className="w-4 h-4" /> AI
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartEditLead(lead)}
                        className="min-h-[44px] flex items-center justify-center gap-1 text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 font-medium"
                      >
                        <Edit3 className="w-4 h-4" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleArchiveLead(lead)}
                        className="min-h-[44px] flex items-center justify-center gap-1 text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 font-medium"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteLead(lead)}
                        className="min-h-[44px] flex items-center justify-center gap-1 text-rose-600 bg-rose-50/60 hover:bg-rose-100 rounded-lg border border-rose-200 font-medium"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop & Tablet Table View (>= 640px) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 pr-4 font-medium">Candidate / Opportunity</th>
                    <th className="py-2.5 px-3 font-medium">Role, Nationality & Destination</th>
                    <th className="py-2.5 px-3 font-medium">AI Score & Notes</th>
                    <th className="py-2.5 px-3 font-medium text-right">Value & Follow-Up</th>
                    <th className="py-2.5 px-3 font-medium text-right">Pipeline Stage</th>
                    <th className="py-2.5 pl-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className={`hover:bg-slate-50 ${lead.isArchived ? 'opacity-60 bg-slate-50' : ''}`}
                    >
                      <td className="py-3 pr-4">
                        <div className="font-semibold text-slate-900">
                          {lead.contactName}{' '}
                          <span className="font-mono text-[11px] text-slate-400">#{lead.id}</span>
                        </div>
                        <div className="text-slate-600">{lead.title}</div>
                        <div className="text-slate-500 font-mono text-[11px] mt-0.5">
                          {lead.phone || 'No phone'} · {lead.sourceChannel.toUpperCase()} · Owner:{' '}
                          {lead.ownerName}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-900">
                          {lead.preferredJob || 'Enterprise / General Role'}
                        </div>
                        <div className="text-slate-500">
                          Nationality: {lead.nationality || 'International'} → Dest:{' '}
                          {lead.destinationCountry || 'Global'}
                        </div>
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        <div className="font-mono tabular-nums font-semibold text-indigo-600">
                          Score: {lead.leadScore}/100
                        </div>
                        <div className="text-slate-600 line-clamp-2 text-[11px]">
                          {lead.extractedRequirements}
                        </div>
                        {lead.notes && (
                          <div className="text-slate-500 text-[11px] mt-0.5 line-clamp-2">
                            {lead.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        <div className="font-semibold text-slate-900">
                          ${Number(lead.estimatedValueUsd).toLocaleString()}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Follow-up: {lead.nextFollowUpAt || 'Unscheduled'}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <select
                          value={lead.stage}
                          onChange={(e) => handleStageChange(lead.id, e.target.value)}
                          className="p-1.5 text-xs border border-slate-200 rounded-md bg-white font-medium text-slate-900"
                        >
                          {stages.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 pl-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleRunInlineAiScreen(lead)}
                            disabled={aiScreeningLeadId === lead.id}
                            title="AI Copilot Qualification & Screening"
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-md border border-slate-200"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEditLead(lead)}
                            title="Edit Candidate / Lead"
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-md border border-slate-200"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleArchiveLead(lead)}
                            title={lead.isArchived ? 'Restore' : 'Archive'}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-md border border-slate-200"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLead(lead)}
                            title="Delete Record (Owner/Admin/Manager)"
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-md border border-slate-200"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* KANBAN STAGE BOARD VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-2">
            {[
              'New Lead',
              'Contacted',
              'Documents Pending',
              'Qualified',
              'Employer Review',
              'Offer',
              'Visa Process',
              'Deployed',
              'Won',
            ].map((colStage) => {
              const colLeads = filteredLeads.filter((l) => l.stage === colStage);
              return (
                <div
                  key={colStage}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-semibold text-slate-900">{colStage}</span>
                    <span className="text-[11px] font-mono tabular-nums text-slate-500">
                      {colLeads.length}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {colLeads.map((l) => (
                      <div
                        key={l.id}
                        className="bg-white border border-slate-200 rounded-lg p-3 space-y-2 text-xs shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold text-slate-900">{l.contactName}</div>
                          <span className="font-mono text-[11px] text-indigo-600 font-semibold">
                            {l.leadScore}/100
                          </span>
                        </div>
                        <div className="text-slate-600 text-[11px]">{l.preferredJob || l.title}</div>
                        <div className="text-slate-500 text-[11px]">
                          {l.nationality || 'Global'} → {l.destinationCountry || 'Global'}
                        </div>
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="font-mono font-semibold text-slate-900">
                            ${Number(l.estimatedValueUsd).toLocaleString()}
                          </span>
                          <select
                            value={l.stage}
                            onChange={(e) => handleStageChange(l.id, e.target.value)}
                            className="p-1 text-[11px] border border-slate-200 rounded bg-slate-50"
                          >
                            {stages.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                    {colLeads.length === 0 && (
                      <div className="py-4 text-center text-[11px] text-slate-400">
                        No candidates in {colStage}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Candidate & Qualified Lead Form */}
      <form
        onSubmit={handleSaveLead}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            {editingLeadId
              ? `Editing Candidate / Opportunity #${editingLeadId} (${contactName})`
              : 'Add New Candidate / Qualified Lead to Recruitment Pipeline'}
          </h3>
          {editingLeadId && (
            <button
              type="button"
              onClick={resetLeadForm}
              className="text-xs text-slate-500 underline"
            >
              Cancel Edit
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Candidate / Contact Name *</label>
            <input
              type="text"
              required
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="David Sterling"
              className="w-full p-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Phone / WhatsApp</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+44 7700 900511"
              className="w-full p-2 border border-slate-200 rounded-lg font-mono"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="candidate@email.com"
              className="w-full p-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Nationality</label>
            <input
              type="text"
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              placeholder="e.g. Philippines, Poland, India, UK"
              className="w-full p-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Preferred Job / Role</label>
            <input
              type="text"
              value={preferredJob}
              onChange={(e) => setPreferredJob(e.target.value)}
              placeholder="e.g. Registered Nurse / Civil Engineer"
              className="w-full p-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Destination Country</label>
            <input
              type="text"
              value={destinationCountry}
              onChange={(e) => setDestinationCountry(e.target.value)}
              placeholder="e.g. United Kingdom, UAE, Germany"
              className="w-full p-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Lead Source Channel</label>
            <select
              value={sourceChannel}
              onChange={(e) => setSourceChannel(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg bg-white"
            >
              <option value="whatsapp">WhatsApp Business</option>
              <option value="instagram">Instagram Boost</option>
              <option value="facebook">Facebook CTWA</option>
              <option value="tiktok">TikTok Business</option>
            </select>
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Recruitment / CRM Stage</label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg bg-white"
            >
              {stages.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Assigned Staff Member</label>
            <select
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg bg-white"
            >
              {uniqueOwners.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Placement / Deal Value ($)</label>
            <input
              type="number"
              value={estimatedValueUsd}
              onChange={(e) => setEstimatedValueUsd(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg font-mono"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">AI Lead Score (1-100)</label>
            <input
              type="number"
              value={leadScore}
              onChange={(e) => setLeadScore(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg font-mono"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Next Follow-Up Date</label>
            <input
              type="date"
              value={nextFollowUpAt}
              onChange={(e) => setNextFollowUpAt(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg font-mono"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Opportunity Title (Optional — auto-generated if blank)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior ICU Nurse Placement — UK NHS Trust"
              className="w-full p-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Candidate Qualifications, Documents & Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="IELTS passed, passport valid through 2030, ready for employer interview..."
              className="w-full p-2 border border-slate-200 rounded-lg"
            />
          </div>
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
        >
          {editingLeadId ? 'Update Candidate / Pipeline Record' : '+ Save Candidate to Pipeline'}
        </button>
      </form>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 3. TASKS & CALENDAR MODULE
// ---------------------------------------------------------------------------
export const TasksAndCalendarModule: React.FC<ModuleProps> = ({
  data,
  apiFetch,
  onRefresh,
  notify,
}) => {
  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState('follow_up');
  const [contactName, setContactName] = useState('');
  const [dueDate, setDueDate] = useState('2026-10-25');
  const [priority, setPriority] = useState('high');

  // New Appointment Booking State
  const [aptTitle, setAptTitle] = useState('');
  const [aptContact, setAptContact] = useState('');
  const [aptDate, setAptDate] = useState('2026-10-26 11:00 UTC');
  const [aptDuration, setAptDuration] = useState('30');
  const [aptChannel, setAptChannel] = useState('whatsapp');
  const [aptNotes, setAptNotes] = useState('');

  const handleToggleTask = async (id: number) => {
    try {
      await apiFetch(`/api/tasks/${id}/toggle`, { method: 'PATCH' });
      await onRefresh();
      notify('Task status updated.');
    } catch (err: any) {
      notify(err.message || 'Failed to update task', 'error');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await apiFetch('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title,
          taskType,
          contactName,
          dueDate,
          priority,
        }),
      });
      setTitle('');
      setContactName('');
      await onRefresh();
      notify('Follow-up task scheduled.');
    } catch (err: any) {
      notify(err.message || 'Failed to create task', 'error');
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aptTitle.trim() || !aptContact.trim()) return;
    try {
      await apiFetch('/api/appointments', {
        method: 'POST',
        body: JSON.stringify({
          title: aptTitle,
          contactName: aptContact,
          scheduledAt: aptDate,
          durationMinutes: Number(aptDuration) || 30,
          channelSource: aptChannel,
          notes: aptNotes,
        }),
      });
      setAptTitle('');
      setAptContact('');
      setAptNotes('');
      await onRefresh();
      notify('Candidate interview / appointment booked.');
    } catch (err: any) {
      notify(err.message || 'Failed to book appointment', 'error');
    }
  };

  const handleUpdateAppointmentStatus = async (id: number, status: string) => {
    try {
      await apiFetch(`/api/appointments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await onRefresh();
      notify(`Updated appointment #${id} status to ${status}.`);
    } catch (err: any) {
      notify(err.message || 'Failed to update appointment', 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            Staff Follow-Up Tasks & Candidate Reminders
          </h2>
          <span className="text-xs font-mono text-slate-500">
            {data.tasks.filter((t) => t.status !== 'completed').length} Pending ·{' '}
            {data.tasks.filter((t) => t.status === 'completed').length} Completed
          </span>
        </div>
        <div className="divide-y divide-slate-200">
          {data.tasks.map((t) => (
            <div key={t.id} className="py-3 flex items-center justify-between gap-4 text-xs">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={t.status === 'completed'}
                  onChange={() => handleToggleTask(t.id)}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <div>
                  <div
                    className={`font-medium ${
                      t.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900'
                    }`}
                  >
                    {t.title}
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    {t.taskType.replace(/_/g, ' ')} · Contact: {t.contactName || 'General'} ·
                    Assigned: {t.assignedEmployee}
                  </div>
                </div>
              </div>
              <div className="text-right font-mono tabular-nums shrink-0">
                <div className="text-slate-800">{t.dueDate}</div>
                <div className="text-slate-500">{t.priority}</div>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleCreateTask} className="pt-4 border-t border-slate-200 space-y-3">
          <h3 className="text-xs font-semibold text-slate-900">Schedule New Follow-Up Task</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Verify candidate passport & visa documents..."
              className="p-2 border border-slate-200 rounded-lg"
            />
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Candidate / Contact Name"
              className="p-2 border border-slate-200 rounded-lg"
            />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="p-2 border border-slate-200 rounded-lg font-mono"
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="p-2 border border-slate-200 rounded-lg bg-white"
            >
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800"
          >
            + Add Follow-Up Task
          </button>
        </form>
      </div>

      {/* Appointments & Interviews Calendar */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs flex flex-col justify-between">
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-900">
            Booked Candidate Interviews & Client Walkthroughs
          </h2>
          <div className="space-y-3">
            {data.appointments.map((apt) => (
              <div key={apt.id} className="p-3.5 border border-slate-200 rounded-lg text-xs space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-slate-900">{apt.title}</div>
                  <select
                    value={apt.status}
                    onChange={(e) => handleUpdateAppointmentStatus(apt.id, e.target.value)}
                    className="p-1 text-[11px] border border-slate-200 rounded bg-slate-50 font-mono"
                  >
                    <option value="scheduled">scheduled</option>
                    <option value="completed">completed</option>
                    <option value="rescheduled">rescheduled</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </div>
                <div className="text-slate-600">{apt.contactName}</div>
                <div className="font-mono tabular-nums text-indigo-600">
                  {apt.scheduledAt} ({apt.durationMinutes} mins) · via {apt.channelSource}
                </div>
                {apt.notes && <p className="text-slate-500 pt-0.5">{apt.notes}</p>}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleCreateAppointment} className="pt-4 border-t border-slate-200 space-y-3 text-xs">
          <h3 className="font-semibold text-slate-900">Book Candidate Interview / Walkthrough</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              required
              value={aptTitle}
              onChange={(e) => setAptTitle(e.target.value)}
              placeholder="Employer Screening Interview"
              className="p-2 border border-slate-200 rounded-lg"
            />
            <input
              type="text"
              required
              value={aptContact}
              onChange={(e) => setAptContact(e.target.value)}
              placeholder="Candidate / Client Name"
              className="p-2 border border-slate-200 rounded-lg"
            />
            <input
              type="text"
              value={aptDate}
              onChange={(e) => setAptDate(e.target.value)}
              placeholder="2026-10-26 11:00 UTC"
              className="p-2 border border-slate-200 rounded-lg font-mono"
            />
            <select
              value={aptChannel}
              onChange={(e) => setAptChannel(e.target.value)}
              className="p-2 border border-slate-200 rounded-lg bg-white"
            >
              <option value="whatsapp">WhatsApp Video / Call</option>
              <option value="instagram">Instagram Direct</option>
              <option value="zoom_meet">Google Meet / Video</option>
            </select>
          </div>
          <input
            type="text"
            value={aptNotes}
            onChange={(e) => setAptNotes(e.target.value)}
            placeholder="Interview agenda or technical documents to verify..."
            className="w-full p-2 border border-slate-200 rounded-lg"
          />
          <button
            type="submit"
            className="w-full py-2 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
          >
            Book Interview / Appointment
          </button>
        </form>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 4. VISUAL WORKFLOW AUTOMATION BUILDER & APPROVALS
// ---------------------------------------------------------------------------
export const WorkflowsModule: React.FC<ModuleProps> = ({ data, apiFetch, onRefresh, notify }) => {
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('inbound_whatsapp_or_social');
  const [conditionsSummary, setConditionsSummary] = useState(
    'Consent == opted_in AND ServiceWindow == open AND AI Confidence >= 80%'
  );
  const [actionsSummary, setActionsSummary] = useState(
    '1. Grounded Gemini Reply → 2. Upsert CRM Lead → 3. Notify Assigned Rep'
  );
  const [requiresApproval, setRequiresApproval] = useState(false);

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await apiFetch('/api/workflows', {
        method: 'POST',
        body: JSON.stringify({
          name,
          triggerType,
          conditionsSummary,
          actionsSummary,
          requiresApproval,
        }),
      });
      setName('');
      await onRefresh();
      notify('Workflow automation rule saved and verified.');
    } catch (err: any) {
      notify(err.message || 'Failed to create workflow', 'error');
    }
  };

  const handleReviewApproval = async (id: number, decision: 'approved' | 'rejected') => {
    try {
      await apiFetch(`/api/approvals/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
      await onRefresh();
      notify(`Approval item #${id} marked as ${decision}.`);
    } catch (err: any) {
      notify(err.message || 'Approval review failed', 'error');
    }
  };

  return (
    <div className="space-y-8">
      {/* Human-in-the-Loop Approvals Queue */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-900">
          Human-in-the-Loop Approvals Queue (Sensitive Outbound, Ad Boost Spend & High-Impact Actions)
        </h2>
        <div className="divide-y divide-slate-200 text-xs">
          {data.approvals.map((ap) => (
            <div key={ap.id} className="py-3 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1 max-w-2xl">
                <div className="font-semibold text-slate-900">
                  {ap.title} · <span className="font-mono text-slate-500">{ap.status}</span>
                </div>
                <p className="text-slate-600">{ap.description}</p>
                <div className="text-slate-400">Requested by: {ap.requestedBy}</div>
              </div>
              {ap.status === 'pending' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReviewApproval(ap.id, 'approved')}
                    className="px-3 py-1.5 bg-emerald-700 text-white font-medium rounded hover:bg-emerald-800"
                  >
                    Approve & Execute
                  </button>
                  <button
                    onClick={() => handleReviewApproval(ap.id, 'rejected')}
                    className="px-3 py-1.5 border border-slate-300 text-slate-700 font-medium rounded hover:bg-slate-50"
                  >
                    Reject
                  </button>
                </div>
              ) : (
                <span className="font-mono text-slate-500">
                  Reviewed by {ap.reviewedBy || 'Manager'} ({ap.status})
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Active Workflows */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {data.workflows.map((wf) => (
          <div
            key={wf.id}
            className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between space-y-3 text-xs"
          >
            <div className="space-y-2">
              <div className="font-semibold text-sm text-slate-900">{wf.name}</div>
              <p className="text-slate-600">{wf.description}</p>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded space-y-1 font-mono text-[11px]">
                <div>Trigger: {wf.triggerType}</div>
                <div>If: {wf.conditionsSummary}</div>
                <div>Then: {wf.actionsSummary}</div>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-mono tabular-nums text-slate-500">
              <span>Runs: {wf.executionCount}</span>
              <span>Success: {wf.successCount}</span>
              <span>{wf.requiresApproval ? 'Approval Gate' : 'Automated'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Workflow Builder */}
      <form
        onSubmit={handleCreateWorkflow}
        className="bg-white border border-slate-200 rounded-lg p-6 space-y-4"
      >
        <h3 className="text-sm font-semibold text-slate-900">
          Create New Trigger → Condition → Action Workflow
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Workflow Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="TikTok DM Intent == Pricing → Send Catalog & Assign Rep"
              className="w-full p-2 border border-slate-200 rounded-md"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Trigger Event</label>
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-md bg-white"
            >
              <option value="inbound_whatsapp_or_social">New WhatsApp / Social DM</option>
              <option value="new_qualified_lead">New Qualified Lead Created</option>
              <option value="lead_stage_changed">Lead Stage Changed</option>
              <option value="no_response_24h">No Customer Response (24h Window Closing)</option>
            </select>
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Conditions (Consent & Policy Checked)</label>
            <input
              type="text"
              value={conditionsSummary}
              onChange={(e) => setConditionsSummary(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-md font-mono"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Actions Sequence</label>
            <input
              type="text"
              value={actionsSummary}
              onChange={(e) => setActionsSummary(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-md font-mono"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={requiresApproval}
            onChange={(e) => setRequiresApproval(e.target.checked)}
          />
          Require manager approval before executing outbound customer actions
        </label>
        <button
          type="submit"
          className="px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-md hover:bg-slate-800"
        >
          Save & Activate Workflow
        </button>
      </form>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 5. ANALYTICS & MANAGEMENT REPORTS (With Interactive Filters & Global RBAC CSV Export)
// ---------------------------------------------------------------------------
export const AnalyticsModule: React.FC<ModuleProps> = ({
  data,
  apiFetch,
  onRefresh,
  notify,
}) => {
  const [channelFilter, setChannelFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [exportingCsv, setExportingCsv] = useState(false);
  const [updatingRbac, setUpdatingRbac] = useState(false);

  const rbacStatus = evaluateExportRbac(data.membership);

  // Filter conversations, leads, contacts, and social boosts by active filter controls
  const filteredConversations = data.conversations.filter((c) => {
    if (channelFilter !== 'all' && c.channelType.toLowerCase() !== channelFilter) return false;
    if (
      searchQuery.trim() &&
      !c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !c.assignedEmployee.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const filteredContacts = data.contacts.filter((c) => {
    if (channelFilter !== 'all' && !c.sourceChannel.toLowerCase().includes(channelFilter)) {
      return false;
    }
    if (
      searchQuery.trim() &&
      !c.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !c.company.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const filteredLeads = data.leads.filter((l) => {
    if (channelFilter !== 'all' && l.sourceChannel.toLowerCase() !== channelFilter) return false;
    if (stageFilter !== 'all' && l.stage !== stageFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        l.title.toLowerCase().includes(q) ||
        l.contactName.toLowerCase().includes(q) ||
        l.ownerName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredBoosts = data.socialBoosts.filter((b) => {
    if (channelFilter !== 'all' && b.channelType.toLowerCase() !== channelFilter) return false;
    if (
      searchQuery.trim() &&
      !b.campaignName.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const totalConvs = filteredConversations.length;
  const aiHandledConvs = filteredConversations.filter((c) => c.handlingMode === 'ai_auto').length;
  const aiResolutionRate = totalConvs > 0 ? Math.round((aiHandledConvs / totalConvs) * 100) : 0;

  const totalContacts = filteredContacts.length;
  const totalLeads = filteredLeads.length;
  const leadConversionRate =
    totalContacts > 0 ? Math.round((totalLeads / totalContacts) * 100) : 0;

  const totalPipelineUsd = filteredLeads.reduce(
    (sum, l) => sum + (Number(l.estimatedValueUsd) || 0),
    0
  );

  const activeFilterSummary = [
    channelFilter !== 'all' ? `Channel=${channelFilter}` : 'Channel=All',
    stageFilter !== 'all' ? `Stage="${stageFilter}"` : 'Stage=All',
    searchQuery.trim() ? `Query="${searchQuery.trim()}"` : null,
  ]
    .filter(Boolean)
    .join(', ');

  const exportAuditLogs = data.auditLogs.filter(
    (log) =>
      (log.action === 'DATA_EXPORTED_CSV' || log.action === 'DATA_EXPORT_DENIED_RBAC') &&
      log.resourceType === 'analytics'
  );

  const handleExportAnalyticsCsv = async () => {
    setExportingCsv(true);
    try {
      await exportFilteredDataAsCsv({
        moduleName: 'Analytics',
        resourceType: 'analytics',
        filenamePrefix: 'connectai_analytics_filtered',
        headers: [
          'Record Type',
          'ID',
          'Title / Campaign / Thread',
          'Contact / Audience',
          'Owner / Agent',
          'Channel',
          'Stage / Status',
          'Lead Score / AI Mode',
          'Pipeline Value / Budget (USD)',
          'Extracted Requirements / Outcome',
          'Target Date',
        ],
        rows: [
          ...filteredLeads.map((l) => [
            'CRM_PIPELINE_LEAD',
            l.id,
            l.title,
            l.contactName,
            l.ownerName,
            l.sourceChannel,
            l.stage,
            l.leadScore,
            l.estimatedValueUsd,
            l.extractedRequirements,
            l.dueDate,
          ]),
          ...filteredBoosts.map((b) => [
            'SOCIAL_AD_BOOST',
            b.id,
            b.campaignName,
            b.targetAudience,
            'AI Growth Router',
            b.channelType,
            b.status,
            `${b.qualifiedLeadsCount} Qualified Leads`,
            b.dailyBudgetUsd,
            `${b.impressions} impressions / ${b.conversationsStarted} AI chats`,
            b.createdAt,
          ]),
          ...filteredConversations.map((c) => [
            'CONVERSATION_THREAD',
            c.id,
            c.detectedIntent || 'Customer Inquiry',
            c.customerName,
            c.assignedEmployee,
            c.channelType,
            c.status,
            c.handlingMode,
            '0',
            c.aiSummary,
            c.lastMessageAt,
          ]),
        ],
        filterSummary: activeFilterSummary,
        data,
        apiFetch,
        onRefresh,
        notify,
      });
    } finally {
      setExportingCsv(false);
    }
  };

  const handleToggleExportRbac = async () => {
    setUpdatingRbac(true);
    try {
      const nextAllow = !rbacStatus.allowed;
      await apiFetch('/api/membership/rbac', {
        method: 'PATCH',
        body: JSON.stringify({
          role: nextAllow ? 'company_owner' : 'agent',
          allowExport: nextAllow,
        }),
      });
      await onRefresh();
      notify(
        nextAllow
          ? 'RBAC Updated: Granted export_data permission (company_owner).'
          : 'RBAC Updated: Restricted export_data permission (agent role) to test RBAC enforcement.'
      );
    } catch (err: any) {
      notify(err.message || 'Failed to update RBAC permission', 'error');
    } finally {
      setUpdatingRbac(false);
    }
  };

  const totalExportableRows =
    filteredLeads.length + filteredBoosts.length + filteredConversations.length;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Verified Business Analytics & Transparent Metric Formulas
            </h2>
            <p className="text-xs text-slate-500">
              Every metric below is calculated directly from live PostgreSQL records in tenant #{data.activeTenant.id} and updates dynamically with your active filters.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleToggleExportRbac}
              disabled={updatingRbac}
              title="Click to test RBAC permission enforcement for CSV exports"
              className={`px-2.5 py-1.5 text-xs font-mono rounded border ${
                rbacStatus.allowed
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  : 'border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100'
              }`}
            >
              {rbacStatus.allowed
                ? `RBAC: export_data Allowed (${rbacStatus.role})`
                : `RBAC: export_data Restricted (${rbacStatus.role})`}
            </button>

            <button
              type="button"
              onClick={handleExportAnalyticsCsv}
              disabled={exportingCsv}
              className="px-3.5 py-2 bg-slate-900 text-white text-xs font-medium rounded-md hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              {exportingCsv
                ? 'Exporting & Auditing...'
                : `Export Data (${totalExportableRows} CSV)`}
            </button>
          </div>
        </div>

        {/* Analytics Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-md border border-slate-200 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-700">Filter Analytics Dataset:</span>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="p-1.5 border border-slate-200 rounded bg-white text-slate-800"
            >
              <option value="all">All Channels</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="tiktok">TikTok</option>
            </select>

            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="p-1.5 border border-slate-200 rounded bg-white text-slate-800"
            >
              <option value="all">All Pipeline Stages</option>
              <option value="New Lead">New Lead</option>
              <option value="Qualified">Qualified</option>
              <option value="Demo / Proposal">Demo / Proposal</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Closed Won">Closed Won</option>
            </select>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by deal title, contact, owner, campaign..."
              className="p-1.5 border border-slate-200 rounded bg-white w-64"
            />
          </div>

          <div className="font-mono text-[11px] text-slate-500">
            Active Scope: {activeFilterSummary}
          </div>
        </div>

        {/* Latest Analytics Export Audit Log Banner */}
        {exportAuditLogs.length > 0 && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs space-y-1">
            <div className="font-semibold text-slate-900">
              Latest Analytics Export Audit Log Entry:
            </div>
            <div className="font-mono text-[11px] text-slate-700 flex flex-wrap items-center justify-between gap-2">
              <span>
                [{exportAuditLogs[0].action}] {exportAuditLogs[0].details}
              </span>
              <span className="text-slate-500">
                {new Date(exportAuditLogs[0].createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          <div className="p-4 border border-slate-200 rounded-md">
            <div className="text-xs text-slate-500">AI Automation Coverage (Filtered)</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {aiResolutionRate}%
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-1">
              Formula: {aiHandledConvs} AI Auto / {totalConvs} Filtered Threads
            </div>
          </div>
          <div className="p-4 border border-slate-200 rounded-md">
            <div className="text-xs text-slate-500">Contact-to-Qualified-Lead Rate</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {leadConversionRate}%
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-1">
              Formula: {totalLeads} Filtered Leads / {totalContacts} Contacts
            </div>
          </div>
          <div className="p-4 border border-slate-200 rounded-md">
            <div className="text-xs text-slate-500">Filtered Pipeline Value</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
              ${totalPipelineUsd.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-1">
              Source: SUM(filtered_leads.estimated_value_usd)
            </div>
          </div>
          <div className="p-4 border border-slate-200 rounded-md">
            <div className="text-xs text-slate-500">Social Boost Qualified Leads</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {filteredBoosts.reduce((s, b) => s + b.qualifiedLeadsCount, 0)}
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-1">
              Across {filteredBoosts.length} Filtered Ad Boost Campaigns
            </div>
          </div>
        </div>

        {/* Filtered Analytics & Pipeline Dataset Preview Table */}
        <div className="pt-2 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-900">
              Currently Filtered Analytics & Revenue Records ({filteredLeads.length} Opportunities · {filteredBoosts.length} Campaigns · {filteredConversations.length} Threads)
            </span>
            <span className="font-mono text-slate-500">
              Included in CSV Export ({totalExportableRows} total rows)
            </span>
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-md">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <th className="py-2 px-3 font-medium">Deal / Opportunity</th>
                  <th className="py-2 px-3 font-medium">Contact</th>
                  <th className="py-2 px-3 font-medium">Channel</th>
                  <th className="py-2 px-3 font-medium">Stage</th>
                  <th className="py-2 px-3 font-medium">Owner</th>
                  <th className="py-2 px-3 font-medium text-right">Lead Score</th>
                  <th className="py-2 px-3 font-medium text-right">Value (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLeads.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-medium text-slate-900">{l.title}</td>
                    <td className="py-2.5 px-3 text-slate-700">{l.contactName}</td>
                    <td className="py-2.5 px-3 font-mono uppercase text-[11px] text-slate-700">
                      {l.sourceChannel}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{l.stage}</td>
                    <td className="py-2.5 px-3 text-slate-600">{l.ownerName}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-900">
                      {l.leadScore}/100
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                      ${Number(l.estimatedValueUsd).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-slate-500">
                      No pipeline records match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 6. TEAM, PERFORMANCE SCORECARD, RBAC PERMISSIONS & MULTI-TENANT ISOLATION VERIFIER
// ---------------------------------------------------------------------------
export const TeamAndSecurityModule: React.FC<ModuleProps> = ({
  data,
  apiFetch,
  onRefresh,
  notify,
}) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('agent');
  const [inviteDept, setInviteDept] = useState('Sales & Support');
  const [newTenantName, setNewTenantName] = useState('');
  const [isolationResult, setIsolationResult] = useState<string | null>(null);
  const [activeRoleSelect, setActiveRoleSelect] = useState(
    data.membership?.role || 'company_owner'
  );
  const rbacStatus = evaluateExportRbac(data.membership);

  // Calculate real Staff Performance Metrics from PostgreSQL records
  const staffNames = Array.from(
    new Set([
      data.user.name,
      'Marcus Chen',
      'Layla Al-Mansoor',
      'Sofia Rossi',
      ...data.leads.map((l) => l.ownerName).filter(Boolean),
      ...data.conversations.map((c) => c.assignedEmployee).filter(Boolean),
    ])
  );

  const staffMetrics = staffNames.map((memberName) => {
    const memberLeads = data.leads.filter((l) => l.ownerName === memberName);
    const memberConvs = data.conversations.filter((c) => c.assignedEmployee === memberName);
    const memberTasks = data.tasks.filter((t) => t.assignedEmployee === memberName);
    const completedTasks = memberTasks.filter((t) => t.status === 'completed').length;
    const pipelineVal = memberLeads.reduce(
      (sum, l) => sum + (Number(l.estimatedValueUsd) || 0),
      0
    );
    const avgScore =
      memberLeads.length > 0
        ? Math.round(memberLeads.reduce((s, l) => s + (l.leadScore || 0), 0) / memberLeads.length)
        : 0;
    return {
      name: memberName,
      leadsCount: memberLeads.length,
      pipelineVal,
      avgScore,
      activeConvs: memberConvs.length,
      tasksRatio: `${completedTasks}/${memberTasks.length}`,
    };
  });

  const handleUpdateSessionRole = async (nextRole: string, allowExport: boolean) => {
    try {
      setActiveRoleSelect(nextRole);
      await apiFetch('/api/membership/rbac', {
        method: 'PATCH',
        body: JSON.stringify({ role: nextRole, allowExport }),
      });
      await onRefresh();
      notify(`Updated active session RBAC role to "${nextRole}" (Export Permitted: ${allowExport ? 'YES' : 'NO'}).`);
    } catch (err: any) {
      notify(err.message || 'Failed to update RBAC role', 'error');
    }
  };

  const handleUpdateInvitationStatus = async (id: number, status: 'accepted' | 'revoked') => {
    try {
      await apiFetch(`/api/invitations/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await onRefresh();
      notify(`Updated staff invitation #${id} status to ${status}.`);
    } catch (err: any) {
      notify(err.message || 'Failed to update invitation status', 'error');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    try {
      await apiFetch('/api/invitations', {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          department: inviteDept,
        }),
      });
      setInviteEmail('');
      await onRefresh();
      notify(`Invitation issued to ${inviteEmail}.`);
    } catch (err: any) {
      notify(err.message || 'Failed to send invitation', 'error');
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName.trim()) return;
    try {
      await apiFetch('/api/tenants/create', {
        method: 'POST',
        body: JSON.stringify({ name: newTenantName }),
      });
      setNewTenantName('');
      await onRefresh();
      notify(`Created and switched to isolated tenant workspace: ${newTenantName}`);
    } catch (err: any) {
      notify(err.message || 'Failed to create workspace', 'error');
    }
  };

  const handleVerifyIsolation = async () => {
    try {
      const res = await apiFetch('/api/security/verify-isolation', { method: 'POST' });
      setIsolationResult(res.message);
      await onRefresh();
      notify('Verified strict multi-tenant PostgreSQL isolation.');
    } catch (err: any) {
      notify(err.message || 'Isolation check failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Staff Performance & Recruitment Conversion Scorecard */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Team Performance & Recruitment Conversion Scorecard
            </h2>
            <p className="text-xs text-slate-500">
              Live staff productivity calculated from assigned pipeline candidates, active omnichannel threads, and completed follow-up tasks.
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-600">
            {staffMetrics.length} Active Team Members
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 pr-4 font-medium">Staff Member</th>
                <th className="py-2.5 px-4 font-medium text-right">Assigned Leads</th>
                <th className="py-2.5 px-4 font-medium text-right">Avg AI Lead Score</th>
                <th className="py-2.5 px-4 font-medium text-right">Active Conversations</th>
                <th className="py-2.5 px-4 font-medium text-right">Tasks Completed</th>
                <th className="py-2.5 pl-4 font-medium text-right">Managed Pipeline Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {staffMetrics.map((m) => (
                <tr key={m.name} className="hover:bg-slate-50">
                  <td className="py-3 pr-4 font-semibold text-slate-900">{m.name}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                    {m.leadsCount}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-indigo-600 font-semibold">
                    {m.avgScore > 0 ? `${m.avgScore}/100` : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                    {m.activeConvs}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                    {m.tasksRatio}
                  </td>
                  <td className="py-3 pl-4 text-right font-mono tabular-nums font-semibold text-emerald-700">
                    ${m.pipelineVal.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Multi-Tenant Isolation Proof & Active Session RBAC Role Switcher */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Multi-Tenant Workspace Isolation & RBAC Governance
            </h2>
            <p className="text-xs text-slate-500">
              Active Tenant: <span className="font-mono">{data.activeTenant.name}</span> (Tenant ID #{data.activeTenant.id} · Slug: {data.activeTenant.slug})
            </p>
          </div>
          <button
            onClick={handleVerifyIsolation}
            className="px-3.5 py-2 bg-emerald-700 text-white text-xs font-medium rounded-lg hover:bg-emerald-800 flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            Run Cross-Tenant Isolation Audit Check
          </button>
        </div>

        {isolationResult && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-950 font-mono">
            {isolationResult}
          </div>
        )}

        {/* Active Session RBAC Role & Permission Tester */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-4 text-xs">
          <div>
            <div className="font-semibold text-slate-900">
              Active Session RBAC Role & Data Export Permission Control
            </div>
            <div className="text-slate-600 mt-0.5">
              Current Role: <span className="font-mono font-semibold">{data.membership?.role || 'company_owner'}</span> ·{' '}
              {rbacStatus.reason}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={activeRoleSelect}
              onChange={(e) => {
                const r = e.target.value;
                const allow = ['company_owner', 'company_admin', 'manager', 'analyst'].includes(r);
                handleUpdateSessionRole(r, allow);
              }}
              className="p-1.5 border border-slate-200 rounded-md bg-white font-medium text-slate-900"
            >
              <option value="company_owner">Company Owner (Full Access + Export/Delete)</option>
              <option value="company_admin">Company Admin (Admin + Export/Delete)</option>
              <option value="manager">Department Manager (Team + Export/Delete)</option>
              <option value="analyst">Analyst (Read + Export Allowed)</option>
              <option value="agent">Support/Recruitment Agent (Restricted — No CSV Export/Delete)</option>
            </select>
          </div>
        </div>

        <form onSubmit={handleCreateTenant} className="flex flex-wrap items-center gap-3 pt-2">
          <input
            type="text"
            value={newTenantName}
            onChange={(e) => setNewTenantName(e.target.value)}
            placeholder="New Isolated Company Workspace Name..."
            className="p-2 text-xs border border-slate-200 rounded-lg w-72"
          />
          <button
            type="submit"
            className="px-3.5 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800"
          >
            Create Isolated Tenant Workspace
          </button>
        </form>
      </div>

      {/* Staff Invitations & Roles */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
        <h3 className="text-sm font-semibold text-slate-900">Staff Members & Invitations</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-4 font-medium">Staff Email</th>
                <th className="py-2 px-4 font-medium">RBAC Role</th>
                <th className="py-2 px-4 font-medium">Department</th>
                <th className="py-2 px-4 font-medium">Invited By</th>
                <th className="py-2 px-4 font-medium text-right">Status</th>
                <th className="py-2 pl-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.invitations.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="py-2.5 pr-4 font-medium text-slate-900">{inv.email}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-700">{inv.role}</td>
                  <td className="py-2.5 px-4 text-slate-700">{inv.department}</td>
                  <td className="py-2.5 px-4 text-slate-500">{inv.invitedBy}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-800">{inv.status}</td>
                  <td className="py-2.5 pl-4 text-right whitespace-nowrap space-x-1.5">
                    {inv.status !== 'accepted' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateInvitationStatus(inv.id, 'accepted')}
                        className="px-2 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[11px] font-medium hover:bg-emerald-100"
                      >
                        Mark Accepted
                      </button>
                    )}
                    {inv.status !== 'revoked' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateInvitationStatus(inv.id, 'revoked')}
                        className="px-2 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded text-[11px] font-medium hover:bg-rose-100"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 text-xs">
          <input
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@company.com"
            className="p-2 border border-slate-200 rounded-lg"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="p-2 border border-slate-200 rounded-lg bg-white"
          >
            <option value="company_admin">Company Administrator</option>
            <option value="manager">Department Manager</option>
            <option value="team_leader">Team Leader</option>
            <option value="agent">Support / Sales Agent</option>
            <option value="analyst">Read-Only Analyst</option>
          </select>
          <input
            type="text"
            value={inviteDept}
            onChange={(e) => setInviteDept(e.target.value)}
            placeholder="Department"
            className="p-2 border border-slate-200 rounded-lg"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800"
          >
            Invite Staff Member
          </button>
        </form>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 7. INTEGRATIONS MARKETPLACE & CREDENTIAL STATUS
// ---------------------------------------------------------------------------
export const IntegrationsModule: React.FC<ModuleProps> = ({
  data,
  apiFetch,
  onRefresh,
  notify,
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [endpointIdentifier, setEndpointIdentifier] = useState('');

  const handleSaveIntegration = async (id: number) => {
    try {
      await apiFetch(`/api/integrations/${id}/configure`, {
        method: 'POST',
        body: JSON.stringify({
          endpointIdentifier,
          verifyTokenHint: 'Webhook Registered',
        }),
      });
      setEditingId(null);
      setEndpointIdentifier('');
      await onRefresh();
      notify('Updated integration endpoint configuration.');
    } catch (err: any) {
      notify(err.message || 'Failed to configure integration', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Integrations Marketplace & Server-Side Provider Status
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Live connection telemetry. API keys and secret tokens are strictly stored server-side and never exposed to the browser.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.integrations.map((intg) => (
            <div
              key={intg.id}
              className="border border-slate-200 rounded-lg p-4 flex flex-col justify-between space-y-3 text-xs"
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-sm text-slate-900">{intg.displayName}</div>
                  <span
                    className={`font-mono uppercase text-[11px] shrink-0 ${
                      intg.status === 'connected'
                        ? 'text-emerald-700 font-semibold'
                        : 'text-amber-700'
                    }`}
                  >
                    {intg.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="text-slate-500 font-mono">{intg.maskedCredentialHint}</div>
                <div className="text-slate-600">
                  <span className="font-medium text-slate-800">Permissions:</span>{' '}
                  {intg.requiredPermissions}
                </div>
                <div className="text-slate-600">
                  <span className="font-medium text-slate-800">Setup:</span>{' '}
                  {intg.setupInstructions}
                </div>
                {intg.recentError && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-900 text-[11px]">
                    {intg.recentError}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-200">
                {editingId === intg.id ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={endpointIdentifier}
                      onChange={(e) => setEndpointIdentifier(e.target.value)}
                      placeholder="Enter Account / WABA / Page ID..."
                      className="flex-1 p-1.5 border border-slate-200 rounded"
                    />
                    <button
                      onClick={() => handleSaveIntegration(intg.id)}
                      className="px-3 py-1.5 bg-slate-900 text-white rounded"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingId(intg.id)}
                    className="text-slate-700 hover:text-slate-900 font-medium underline underline-offset-4"
                  >
                    Configure Account Identifier / Webhook Metadata
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 8. SAAS SUBSCRIPTION, BILLING & USAGE METERING
// ---------------------------------------------------------------------------
export const BillingModule: React.FC<ModuleProps> = ({ data, apiFetch, onRefresh, notify }) => {
  const plans = [
    {
      name: 'Starter Team Plan',
      audience: 'For early-stage teams',
      price: 99,
      numbers: 5,
      staff: 10,
      voice: 500,
    },
    {
      name: 'Growth Pro',
      audience: 'For scaling omnichannel operations',
      price: 299,
      numbers: 35,
      staff: 30,
      voice: 2000,
    },
    {
      name: 'Enterprise Omnichannel 100',
      audience: 'For high-volume multi-department fleets',
      price: 799,
      numbers: 100,
      staff: 100,
      voice: 5000,
    },
  ];

  const handleSelectPlan = async (p: typeof plans[0]) => {
    try {
      await apiFetch('/api/subscription/change', {
        method: 'POST',
        body: JSON.stringify({
          planName: p.name,
          monthlyPriceUsd: p.price,
          maxWhatsappNumbers: p.numbers,
          maxStaffSeats: p.staff,
          maxVoiceMinutes: p.voice,
        }),
      });
      await onRefresh();
      notify(`Updated workspace subscription to ${p.name}.`);
    } catch (err: any) {
      notify(err.message || 'Plan update failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {plans.map((p) => {
          const isCurrent = data.subscription?.planName === p.name;
          return (
            <div
              key={p.name}
              className={`bg-white border rounded-lg p-6 flex flex-col justify-between space-y-4 ${
                isCurrent ? 'border-slate-900' : 'border-slate-200'
              }`}
            >
              <div className="space-y-2">
                <div className="text-xs text-slate-500">{p.audience}</div>
                <h3 className="text-base font-semibold text-slate-900">{p.name}</h3>
                <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                  ${p.price}
                  <span className="text-xs font-normal text-slate-500">/month</span>
                </div>
                <ul className="text-xs text-slate-600 space-y-1.5 pt-2">
                  <li>Up to {p.numbers} Official WhatsApp & Social Numbers</li>
                  <li>Up to {p.staff} Staff Seats with Department RBAC</li>
                  <li>{p.voice.toLocaleString()} Gemini Voice AI TTS Minutes</li>
                  <li>Facebook, Instagram & TikTok Ad Boost Automation</li>
                </ul>
              </div>
              <button
                onClick={() => handleSelectPlan(p)}
                disabled={isCurrent}
                className={`w-full py-2 px-4 text-xs font-medium rounded-md ${
                  isCurrent
                    ? 'bg-slate-100 text-slate-500'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {isCurrent ? 'Current Active Plan' : 'Select Plan'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Metered Usage Records */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Recorded Tenant Usage & Estimated Provider Costs
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-4 font-medium">Metered Category</th>
                <th className="py-2 px-4 font-medium text-right">Units Recorded</th>
                <th className="py-2 pl-4 font-medium text-right">Estimated Cost (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.usageRecords.map((u) => (
                <tr key={u.id}>
                  <td className="py-2.5 pr-4 font-mono text-slate-800">{u.metricType}</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-900">
                    {u.unitsUsed.toLocaleString()}
                  </td>
                  <td className="py-2.5 pl-4 text-right font-mono tabular-nums text-slate-700">
                    ${u.estimatedCostUsd}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 9. SETTINGS & COMPLIANCE CONTROLS
// ---------------------------------------------------------------------------
export const SettingsModule: React.FC<ModuleProps> = ({ data, apiFetch, onRefresh, notify }) => {
  const [name, setName] = useState(data.activeTenant.name);
  const [timezone, setTimezone] = useState(data.activeTenant.timezone);
  const [retentionDays, setRetentionDays] = useState(String(data.activeTenant.retentionDays));
  const [emergencyPause, setEmergencyPause] = useState(data.activeTenant.emergencyPause);
  const [aiDisclosureEnabled, setAiDisclosureEnabled] = useState(
    data.activeTenant.aiDisclosureEnabled
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/tenants/settings', {
        method: 'POST',
        body: JSON.stringify({
          name,
          timezone,
          retentionDays: Number(retentionDays),
          emergencyPause,
          aiDisclosureEnabled,
        }),
      });
      await onRefresh();
      notify('Workspace security, retention, and AI governance settings saved.');
    } catch (err: any) {
      notify(err.message || 'Failed to save settings', 'error');
    }
  };

  return (
    <form
      onSubmit={handleSave}
      className="bg-white border border-slate-200 rounded-lg p-6 space-y-5 max-w-3xl"
    >
      <h2 className="text-base font-semibold text-slate-900">
        Workspace Governance, Privacy & Emergency AI Controls
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block font-medium text-slate-700 mb-1">Company Workspace Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border border-slate-200 rounded-md"
          />
        </div>
        <div>
          <label className="block font-medium text-slate-700 mb-1">Workspace Timezone</label>
          <input
            type="text"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full p-2 border border-slate-200 rounded-md"
          />
        </div>
        <div>
          <label className="block font-medium text-slate-700 mb-1">
            Data & Call Transcript Retention Policy (Days)
          </label>
          <input
            type="number"
            value={retentionDays}
            onChange={(e) => setRetentionDays(e.target.value)}
            className="w-full p-2 border border-slate-200 rounded-md font-mono"
          />
        </div>
      </div>

      <div className="space-y-3 pt-2 border-t border-slate-200 text-xs">
        <label className="flex items-center gap-2.5 text-slate-800 font-medium">
          <input
            type="checkbox"
            checked={emergencyPause}
            onChange={(e) => setEmergencyPause(e.target.checked)}
            className="h-4 w-4"
          />
          Global Emergency AI Pause (Immediately halt all automatic AI outbound replies across all WhatsApp & Social numbers)
        </label>

        <label className="flex items-center gap-2.5 text-slate-800 font-medium">
          <input
            type="checkbox"
            checked={aiDisclosureEnabled}
            onChange={(e) => setAiDisclosureEnabled(e.target.checked)}
            className="h-4 w-4"
          />
          Enforce AI Transparency Disclosure on First Customer Interaction & Voice Calls
        </label>
      </div>

      <button
        type="submit"
        className="px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-md hover:bg-slate-800"
      >
        Save Workspace Settings
      </button>
    </form>
  );
};

// ---------------------------------------------------------------------------
// 10. IMMUTABLE SECURITY & COMPLIANCE AUDIT LOGS
// ---------------------------------------------------------------------------
export const AuditLogsModule: React.FC<{ data: BootstrapPayload }> = ({ data }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Security, AI Action & Compliance Audit Trail
        </h2>
        <p className="text-xs text-slate-500">
          Immutable tenant-isolated log recording who created, assigned, approved, exported, or modified any record.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-4 font-medium">Timestamp</th>
              <th className="py-2 px-4 font-medium">Actor</th>
              <th className="py-2 px-4 font-medium">Action</th>
              <th className="py-2 px-4 font-medium">Resource</th>
              <th className="py-2 pl-4 font-medium">Verification Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.auditLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="py-2.5 pr-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="py-2.5 px-4 font-medium text-slate-900">{log.actorName}</td>
                <td className="py-2.5 px-4 font-mono text-slate-800">{log.action}</td>
                <td className="py-2.5 px-4 font-mono text-slate-600">
                  {log.resourceType} #{log.resourceId}
                </td>
                <td className="py-2.5 pl-4 text-slate-700">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
