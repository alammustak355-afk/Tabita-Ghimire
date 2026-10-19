import React, { useState } from 'react';
import {
  Send,
  Sparkles,
  Lock,
  Unlock,
  Plus,
  Search,
  Globe,
  Volume2,
  Upload,
  FileText,
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Bot,
  UserCheck,
  TrendingUp,
} from 'lucide-react';
import { BootstrapPayload } from '../types.ts';

interface ModuleProps {
  data: BootstrapPayload;
  apiFetch: (url: string, options?: RequestInit) => Promise<any>;
  onRefresh: () => Promise<void>;
  notify: (msg: string, type?: 'success' | 'error') => void;
}

// ---------------------------------------------------------------------------
// 1. UNIFIED OMNICHANNEL TEAM INBOX (WhatsApp, Instagram, Facebook, TikTok)
// ---------------------------------------------------------------------------
export const InboxModule: React.FC<ModuleProps> = ({ data, apiFetch, onRefresh, notify }) => {
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedConvId, setSelectedConvId] = useState<number>(
    data.conversations[0]?.id || 0
  );
  const [replyText, setReplyText] = useState<string>('');
  const [isInternalNote, setIsInternalNote] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [draftingAi, setDraftingAi] = useState<boolean>(false);

  const filteredConversations = data.conversations.filter((c) => {
    if (channelFilter !== 'all' && c.channelType !== channelFilter) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.customerName.toLowerCase().includes(q) ||
        c.customerHandleOrPhone.toLowerCase().includes(q) ||
        c.lastMessagePreview.toLowerCase().includes(q) ||
        c.detectedIntent.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeConv =
    data.conversations.find((c) => c.id === selectedConvId) ||
    filteredConversations[0] ||
    null;

  const activeMessages = activeConv
    ? data.messages.filter((m) => m.conversationId === activeConv.id)
    : [];

  const linkedContact = activeConv
    ? data.contacts.find((ct) => ct.id === activeConv.contactId)
    : null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || !replyText.trim()) return;
    setSending(true);
    try {
      const res = await apiFetch(`/api/conversations/${activeConv.id}/send`, {
        method: 'POST',
        body: JSON.stringify({
          content: replyText,
          direction: isInternalNote ? 'internal_note' : 'outbound',
          contentType: 'text',
        }),
      });
      setReplyText('');
      await onRefresh();
      const dStatus = res?.message?.deliveryStatus;
      notify(
        isInternalNote
          ? 'Internal team note saved to PostgreSQL (never sent to customer).'
          : dStatus === 'sent'
          ? 'Message dispatched live via Meta Graph API (status: sent).'
          : `Saved to PostgreSQL (${dStatus || 'stored_sandbox_mode'}) — external ${activeConv.channelType.toUpperCase()} API token not yet configured in server environment.`
      );
    } catch (err: any) {
      notify(err.message || 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleGenerateGroundedDraft = async () => {
    if (!activeConv) return;
    setDraftingAi(true);
    try {
      const res = await apiFetch(`/api/conversations/${activeConv.id}/ai-draft`, {
        method: 'POST',
      });
      if (res?.aiDraft?.suggestedReply) {
        setReplyText(res.aiDraft.suggestedReply);
      }
      await onRefresh();
      notify('Generated grounded reply from Knowledge Base using gemini-3.8-flash.');
    } catch (err: any) {
      notify(err.message || 'AI draft generation failed', 'error');
    } finally {
      setDraftingAi(false);
    }
  };

  const handleModeChange = async (newMode: string, newStatus?: string) => {
    if (!activeConv) return;
    try {
      await apiFetch(`/api/conversations/${activeConv.id}/control`, {
        method: 'POST',
        body: JSON.stringify({
          handlingMode: newMode,
          status: newStatus || activeConv.status,
          assignedEmployee: data.user.name,
        }),
      });
      await onRefresh();
      notify(`Conversation mode updated to ${newMode.replace(/_/g, ' ')}.`);
    } catch (err: any) {
      notify(err.message || 'Failed to update conversation mode', 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 border border-slate-200 bg-white rounded-lg overflow-hidden min-h-[720px]">
      {/* Left Column: Channel Filter & Conversation Queue */}
      <div className="lg:col-span-4 border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Omnichannel Team Inbox</h2>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {filteredConversations.length} threads
            </span>
          </div>

          {/* Search input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, phone, handle, intent..."
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-slate-900"
            />
          </div>

          {/* Segmented Channel Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md overflow-x-auto">
            {[
              { id: 'all', label: 'All' },
              { id: 'whatsapp', label: 'WhatsApp' },
              { id: 'instagram', label: 'Instagram' },
              { id: 'facebook', label: 'Facebook' },
              { id: 'tiktok', label: 'TikTok' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setChannelFilter(tab.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  channelFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Status:</span>
            {['all', 'open', 'pending', 'escalated', 'resolved'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`underline-offset-4 hover:text-slate-900 whitespace-nowrap ${
                  statusFilter === st ? 'font-semibold text-slate-900 underline' : ''
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
          {filteredConversations.map((conv) => {
            const isSelected = activeConv?.id === conv.id;
            return (
              <button
                key={conv.id}
                onClick={() => setSelectedConvId(conv.id)}
                className={`w-full text-left p-4 transition-colors hover:bg-slate-50 ${
                  isSelected ? 'bg-slate-50/90' : ''
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-sm text-slate-900 truncate">
                    {conv.customerName}
                  </span>
                  <span className="text-xs font-mono tabular-nums text-slate-500 shrink-0">
                    {conv.channelType.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-mono tabular-nums mt-0.5 truncate">
                  {conv.customerHandleOrPhone} · {conv.status} · {conv.handlingMode.replace(/_/g, ' ')}
                </div>
                <p className="text-xs text-slate-700 mt-2 line-clamp-2">
                  {conv.lastMessagePreview}
                </p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Intent: {conv.detectedIntent.replace(/_/g, ' ')}</span>
                  <span className="font-mono tabular-nums">
                    {conv.unreadCount > 0 ? `${conv.unreadCount} unread` : 'Read'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Center Column: Active Thread & Grounded AI Composer */}
      <div className="lg:col-span-5 border-r border-slate-200 flex flex-col">
        {activeConv ? (
          <>
            {/* Conversation Header */}
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {activeConv.customerName}
                </h3>
                <div className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                  {activeConv.customerHandleOrPhone} · {activeConv.channelType.toUpperCase()} ·{' '}
                  {activeConv.serviceWindowOpen ? '24h Service Window Open' : 'Template Required'}
                </div>
              </div>

              {/* Coordination & Human Takeover Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleModeChange('ai_auto', 'open')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap ${
                    activeConv.handlingMode === 'ai_auto'
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  AI Auto
                </button>
                <button
                  onClick={() => handleModeChange('ai_approval', 'pending')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap ${
                    activeConv.handlingMode === 'ai_approval'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Approval Mode
                </button>
                <button
                  onClick={() => handleModeChange('human_takeover', 'open')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap flex items-center gap-1 ${
                    activeConv.handlingMode === 'human_takeover'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {activeConv.handlingMode === 'human_takeover' ? (
                    <Lock className="w-3 h-3" />
                  ) : (
                    <Unlock className="w-3 h-3" />
                  )}
                  Human Takeover
                </button>
              </div>
            </div>

            {/* AI Summary Strip */}
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs text-slate-700 space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-medium text-slate-900">Gemini Conversation Summary</span>
                <span>
                  Sentiment: {activeConv.sentiment} · Assigned: {activeConv.assignedEmployee}
                </span>
              </div>
              <p className="text-slate-600">{activeConv.aiSummary || 'No summary generated yet.'}</p>
            </div>

            {/* Messages Timeline */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/40">
              {activeMessages.map((msg) => {
                const isCustomer = msg.direction === 'inbound';
                const isInternal = msg.direction === 'internal_note';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isCustomer ? 'items-start' : 'items-end'
                    }`}
                  >
                    <div
                      className={`max-w-[88%] rounded-lg p-3 text-sm border ${
                        isInternal
                          ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                          : isCustomer
                          ? 'bg-white border-slate-200 text-slate-900'
                          : 'bg-slate-900 border-slate-900 text-white'
                      }`}
                    >
                      <div
                        className={`text-[11px] mb-1 flex items-center justify-between gap-4 ${
                          isInternal
                            ? 'text-amber-800'
                            : isCustomer
                            ? 'text-slate-500'
                            : 'text-slate-300'
                        }`}
                      >
                        <span className="font-medium">{msg.senderName}</span>
                        <span className="font-mono tabular-nums">{msg.deliveryStatus}</span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      {msg.knowledgeCitations && (
                        <div className="mt-2 pt-1.5 border-t border-slate-700 text-[11px] text-emerald-300 font-mono">
                          Grounded Source: {msg.knowledgeCitations} ({msg.aiModelUsed} · conf{' '}
                          {msg.aiConfidence})
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Composer & AI Grounded Assist */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-white space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsInternalNote(false)}
                    className={`text-xs font-medium px-2.5 py-1 rounded ${
                      !isInternalNote
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Customer Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsInternalNote(true)}
                    className={`text-xs font-medium px-2.5 py-1 rounded ${
                      isInternalNote
                        ? 'bg-amber-700 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Internal Note (Never Sent to Customer)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateGroundedDraft}
                  disabled={draftingAi}
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1 whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {draftingAi ? 'Drafting from Knowledge Base...' : 'Draft Grounded AI Reply'}
                </button>
              </div>

              <textarea
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={
                  isInternalNote
                    ? 'Write an internal note for team members (@mention supported)...'
                    : 'Write a customer reply or click "Draft Grounded AI Reply"...'
                }
                className="w-full p-2.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-slate-900"
              />

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {activeConv.lockedByStaff
                    ? `Locked by ${activeConv.lockedByStaff} (Conflict Protection Active)`
                    : 'Coordinated AI + Staff Thread'}
                </span>
                <button
                  type="submit"
                  disabled={sending || !replyText.trim()}
                  className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sending
                    ? 'Sending...'
                    : isInternalNote
                    ? 'Save Internal Note'
                    : 'Send Message'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="p-8 text-center text-sm text-slate-500">
            Select a conversation from the queue to inspect messages and CRM details.
          </div>
        )}
      </div>

      {/* Right Column: Customer CRM Profile & Extracted Intelligence */}
      <div className="lg:col-span-3 p-4 space-y-5 overflow-y-auto bg-white">
        <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2">
          Customer CRM Profile
        </h3>
        {linkedContact ? (
          <div className="space-y-4 text-xs">
            <div>
              <div className="text-slate-500">Full Name & Company</div>
              <div className="font-semibold text-sm text-slate-900 mt-0.5">
                {linkedContact.name}
              </div>
              <div className="text-slate-700">{linkedContact.company || 'Individual Prospect'}</div>
            </div>

            <div className="space-y-1 border-t border-slate-200 pt-3">
              <div className="text-slate-500">Channel & Contact Details</div>
              <div className="font-mono tabular-nums text-slate-800">{linkedContact.phone}</div>
              <div className="text-slate-700">{linkedContact.email || 'No email recorded'}</div>
              <div className="text-slate-600">
                Source: {linkedContact.sourceChannel.toUpperCase()} · Language:{' '}
                {linkedContact.preferredLanguage}
              </div>
            </div>

            <div className="space-y-1 border-t border-slate-200 pt-3">
              <div className="text-slate-500">Consent & Policy Status</div>
              <div className="font-medium text-slate-900">
                Consent: {linkedContact.consentStatus}
              </div>
              <div className="text-slate-600">
                Connected Line: {linkedContact.connectedNumberDisplay || 'Primary Desk'}
              </div>
            </div>

            <div className="space-y-1 border-t border-slate-200 pt-3">
              <div className="text-slate-500">AI-Extracted Requirements</div>
              <p className="text-slate-800 leading-relaxed">
                {linkedContact.requirementsSummary || 'No requirements extracted yet.'}
              </p>
            </div>

            <div className="space-y-1 border-t border-slate-200 pt-3">
              <div className="text-slate-500">CRM Notes</div>
              <p className="text-slate-700 leading-relaxed">
                {linkedContact.notes || 'No manual notes.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500">No linked contact record found.</div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 2. WHATSAPP NUMBERS, SOCIAL CHANNELS (FB, IG, TIKTOK) & AD BOOST SUITE
// ---------------------------------------------------------------------------
export const ChannelsAndBoostModule: React.FC<
  ModuleProps & { initialSection?: 'all' | 'channels' | 'campaigns' }
> = ({ data, apiFetch, onRefresh, notify, initialSection = 'all' }) => {
  const [viewMode, setViewMode] = useState<'all' | 'channels' | 'campaigns'>(initialSection);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [channelType, setChannelType] = useState('whatsapp');
  const [department, setDepartment] = useState('Enterprise Sales');
  const [assignedStaffName, setAssignedStaffName] = useState(data.user.name);
  const [aiStatus, setAiStatus] = useState('auto_active');

  // Inbound Webhook Simulator state
  const [simCustomerName, setSimCustomerName] = useState('Tariq Al-Zahrani');
  const [simCustomerPhone, setSimCustomerPhone] = useState('+966 50 112 8890');
  const [simChannel, setSimChannel] = useState('whatsapp');
  const [simMessage, setSimMessage] = useState(
    'We want to connect 50 WhatsApp Business numbers and automate our Instagram & TikTok ad responses. What plan fits us?'
  );
  const [simulating, setSimulating] = useState(false);

  // Social Ad Boost Campaign state
  const [boostChannel, setBoostChannel] = useState('instagram');
  const [boostName, setBoostName] = useState('');
  const [boostCopy, setBoostCopy] = useState('');
  const [boostAudience, setBoostAudience] = useState('B2B Decision Makers & E-Commerce Founders');
  const [boostBudget, setBoostBudget] = useState('75');
  const [boostDuration, setBoostDuration] = useState('10');

  // Google Search Grounding state
  const [searchPrompt, setSearchPrompt] = useState(
    'Best high-converting Click-to-WhatsApp and Instagram/TikTok Ad Boost strategies for B2B SaaS & E-commerce in 2026'
  );
  const [groundingLoading, setGroundingLoading] = useState(false);
  const [groundingResult, setGroundingResult] = useState<{
    answer: string;
    sources: { title: string; uri: string }[];
  } | null>(null);

  const handleConnectChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim() || !displayName.trim()) return;
    try {
      const res = await apiFetch('/api/channels/connect', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber,
          displayName,
          phoneNumberId: phoneNumberId || `ID_${Date.now()}`,
          channelType,
          department,
          assignedStaffName,
          assignedAiAgentId: data.aiAgents[0]?.id || null,
          aiStatus,
        }),
      });
      setPhoneNumber('');
      setDisplayName('');
      setPhoneNumberId('');
      await onRefresh();
      const connStatus = res?.channel?.connectionStatus;
      notify(
        connStatus === 'connected_live'
          ? `Connected live ${channelType.toUpperCase()} endpoint: ${displayName}`
          : `Registered ${channelType.toUpperCase()} endpoint "${displayName}" in ${connStatus || 'webhook_ready'} mode (configure live API token in Integrations for external delivery).`
      );
    } catch (err: any) {
      notify(err.message || 'Failed to connect channel', 'error');
    }
  };

  const handleSimulateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simMessage.trim()) return;
    setSimulating(true);
    try {
      const res = await apiFetch('/api/channels/simulate-inbound', {
        method: 'POST',
        body: JSON.stringify({
          customerName: simCustomerName,
          customerPhone: simCustomerPhone,
          channelType: simChannel,
          messageText: simMessage,
          phoneNumberId: data.phoneNumbers[0]?.id,
        }),
      });
      await onRefresh();
      notify(
        res.autoSent
          ? `12-Step AI Engine processed inbound ${simChannel} webhook, sent grounded reply, and updated CRM Lead (Score: ${res.aiResult?.leadScore}).`
          : `Inbound ${simChannel} webhook processed and queued for human approval.`
      );
    } catch (err: any) {
      notify(err.message || 'Simulation failed', 'error');
    } finally {
      setSimulating(false);
    }
  };

  const handleCreateBoost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boostName.trim() || !boostCopy.trim()) return;
    try {
      await apiFetch('/api/social-boosts', {
        method: 'POST',
        body: JSON.stringify({
          channelType: boostChannel,
          campaignName: boostName,
          adCopy: boostCopy,
          targetAudience: boostAudience,
          dailyBudgetUsd: boostBudget,
          durationDays: boostDuration,
          linkedAiAgentId: data.aiAgents[0]?.id,
        }),
      });
      setBoostName('');
      setBoostCopy('');
      await onRefresh();
      notify('Social Ad Boost campaign created and routed to Manager Approvals.');
    } catch (err: any) {
      notify(err.message || 'Failed to create boost campaign', 'error');
    }
  };

  const handleRunSearchGrounding = async () => {
    if (!searchPrompt.trim()) return;
    setGroundingLoading(true);
    try {
      const res = await apiFetch('/api/ai/search-grounding', {
        method: 'POST',
        body: JSON.stringify({
          query: searchPrompt,
          contextType: 'Social Media Ad Boost & Click-to-WhatsApp Growth Research',
        }),
      });
      setGroundingResult(res);
      notify('Retrieved live Google Search grounded market intelligence (gemini-3.8-flash).');
    } catch (err: any) {
      notify(err.message || 'Search grounding failed', 'error');
    } finally {
      setGroundingLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Interactive Mode Switcher: Channels Fleet vs Campaign Studio */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setViewMode('all')}
            className={`px-3.5 py-1.5 font-medium rounded-md transition-colors ${
              viewMode === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Channels & Campaigns
          </button>
          <button
            type="button"
            onClick={() => setViewMode('channels')}
            className={`px-3.5 py-1.5 font-medium rounded-md transition-colors ${
              viewMode === 'channels'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            WhatsApp & Social Lines ({data.phoneNumbers.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('campaigns')}
            className={`px-3.5 py-1.5 font-medium rounded-md transition-colors ${
              viewMode === 'campaigns'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Campaign Studio & Ad Boost ({data.socialBoosts.length})
          </button>
        </div>
        <div className="text-xs text-slate-500 font-mono tabular-nums">
          Active Fleet: {data.phoneNumbers.length} / {data.subscription?.maxWhatsappNumbers || 100} lines ·{' '}
          {data.socialBoosts.reduce((s, b) => s + b.qualifiedLeadsCount, 0)} Campaign Leads
        </div>
      </div>

      {/* Connected Numbers & Omnichannel Endpoints Table */}
      {(viewMode === 'all' || viewMode === 'channels') && (
        <>
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Official WhatsApp Business Fleet & Social Channels (FB · IG · TikTok)
                </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Connect 20, 50, 100+ authorized Meta WhatsApp Business Cloud API numbers alongside Facebook Messenger, Instagram Professional, and TikTok Business accounts.
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-600">
            Active Endpoints: {data.phoneNumbers.length} / {data.subscription?.maxWhatsappNumbers || 100} plan limit
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 pr-4 font-medium">Channel & Number / Handle</th>
                <th className="py-2.5 px-4 font-medium">Display Name & ID</th>
                <th className="py-2.5 px-4 font-medium">Department & Staff</th>
                <th className="py-2.5 px-4 font-medium">AI Routing Mode</th>
                <th className="py-2.5 px-4 font-medium">Connection Status</th>
                <th className="py-2.5 pl-4 font-medium text-right">Quality / Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.phoneNumbers.map((num) => (
                <tr key={num.id} className="hover:bg-slate-50">
                  <td className="py-3 pr-4">
                    <div className="font-semibold text-slate-900 font-mono tabular-nums">
                      {num.phoneNumber}
                    </div>
                    <div className="text-slate-500 uppercase text-[11px]">{num.channelType}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900">{num.displayName}</div>
                    <div className="text-slate-500 font-mono tabular-nums">{num.phoneNumberId}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-slate-900">{num.department}</div>
                    <div className="text-slate-500">Assigned: {num.assignedStaffName}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-slate-900">{num.aiStatus.replace(/_/g, ' ')}</div>
                    <div className="text-slate-500">{num.businessHours}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900">
                      {num.connectionStatus.replace(/_/g, ' ')}
                    </div>
                    {num.recentError && (
                      <div className="text-amber-700 text-[11px] max-w-xs truncate">
                        {num.recentError}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pl-4 text-right font-mono tabular-nums text-slate-700">
                    {num.qualityRating}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboarding + Live 12-Step Webhook Simulator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Onboard New Official Number / Social Handle */}
        <form
          onSubmit={handleConnectChannel}
          className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Onboard Official WhatsApp Number or Social Handle
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Register an authorized Meta WABA Phone Number ID, Facebook Page, Instagram Handle, or TikTok Business Profile.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Platform Channel</label>
                <select
                  value={channelType}
                  onChange={(e) => setChannelType(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-md bg-white"
                >
                  <option value="whatsapp">Official WhatsApp Cloud API</option>
                  <option value="instagram">Instagram Professional DM & Reels</option>
                  <option value="facebook">Facebook Page Messenger & CTWA</option>
                  <option value="tiktok">TikTok Business Messaging</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Phone Number or @Handle
                </label>
                <input
                  type="text"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+44 20 7946 0921 or @brand.official"
                  className="w-full p-2 border border-slate-200 rounded-md"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Display Name / Desk</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="EMEA VIP Sales Line #14"
                  className="w-full p-2 border border-slate-200 rounded-md"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Meta Phone Number ID / Page ID
                </label>
                <input
                  type="text"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  placeholder="PNID_1029384756"
                  className="w-full p-2 border border-slate-200 rounded-md font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-md"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">AI Behavior Mode</label>
                <select
                  value={aiStatus}
                  onChange={(e) => setAiStatus(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-md bg-white"
                >
                  <option value="auto_active">Automatic Grounded AI Reply</option>
                  <option value="approval_required">AI Suggests · Human Approves</option>
                  <option value="human_only">Human Agents Only</option>
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-slate-900 text-white text-xs font-medium rounded-md hover:bg-slate-800 flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Register Authorized Channel Endpoint
          </button>
        </form>

        {/* 12-Step Inbound Webhook & AI Engine Test Harness */}
        <form
          onSubmit={handleSimulateWebhook}
          className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Test 12-Step Inbound Webhook & Grounded AI Engine
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dispatch a test customer message (WhatsApp, Instagram Reel Comment, Facebook Ad Click, or TikTok DM) through the live Gemini 3.8 Flash RAG & CRM qualification pipeline.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Source Channel</label>
                <select
                  value={simChannel}
                  onChange={(e) => setSimChannel(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-md bg-white"
                >
                  <option value="whatsapp">WhatsApp Cloud API</option>
                  <option value="instagram">Instagram DM / Boost</option>
                  <option value="facebook">Facebook Messenger</option>
                  <option value="tiktok">TikTok Business DM</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Customer Name</label>
                <input
                  type="text"
                  value={simCustomerName}
                  onChange={(e) => setSimCustomerName(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-md"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Phone / @Handle</label>
                <input
                  type="text"
                  value={simCustomerPhone}
                  onChange={(e) => setSimCustomerPhone(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-md font-mono"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block text-slate-700 font-medium mb-1">
                Inbound Customer Message (or "STOP" to test opt-out enforcement)
              </label>
              <textarea
                rows={3}
                value={simMessage}
                onChange={(e) => setSimMessage(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-md"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={simulating}
            className="w-full py-2.5 px-4 bg-emerald-700 text-white text-xs font-medium rounded-md hover:bg-emerald-800 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            {simulating
              ? 'Running 12-Step Gemini RAG & Lead Extraction...'
              : 'Trigger Inbound Webhook & Run AI Engine'}
          </button>
        </form>
      </div>
        </>
      )}

      {/* Omnichannel Social Ad Boost Manager + Google Search Grounding (Campaign Studio) */}
      {(viewMode === 'all' || viewMode === 'campaigns') && (
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Campaign Studio — Social Media Ad Boost & AI Growth Chatbot Suite (Facebook · Instagram · TikTok · CTWA)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Boost posts and Reels across Facebook, Instagram, and TikTok with automatic AI DM/comment qualification and live Google Search Grounding market intelligence.
            </p>
          </div>
        </div>

        {/* Active Social Boost Campaigns Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-4 font-medium">Campaign & Platform</th>
                <th className="py-2 px-4 font-medium">Ad Copy & Auto-DM Trigger</th>
                <th className="py-2 px-4 font-medium text-right">Budget</th>
                <th className="py-2 px-4 font-medium text-right">Impressions / Clicks</th>
                <th className="py-2 px-4 font-medium text-right">AI Chats / Qualified Leads</th>
                <th className="py-2 pl-4 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.socialBoosts.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="py-3 pr-4">
                    <div className="font-semibold text-slate-900">{b.campaignName}</div>
                    <div className="text-slate-500 uppercase text-[11px]">
                      {b.channelType} · {b.targetAudience}
                    </div>
                  </td>
                  <td className="py-3 px-4 max-w-md">
                    <p className="text-slate-700 line-clamp-2">{b.adCopy}</p>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                    ${b.dailyBudgetUsd}/day · {b.durationDays}d
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                    {b.impressions.toLocaleString()} / {b.clicks.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">
                    {b.conversationsStarted} chats · {b.qualifiedLeadsCount} leads
                  </td>
                  <td className="py-3 pl-4 text-right font-mono text-slate-700">
                    {b.status.replace(/_/g, ' ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Create Boost Campaign + Google Search Grounding Assistant */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          <form onSubmit={handleCreateBoost} className="space-y-3 border border-slate-200 rounded-md p-4">
            <h4 className="text-sm font-semibold text-slate-900">
              Launch New Social Boost & Auto-Chatbot Funnel
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Platform</label>
                <select
                  value={boostChannel}
                  onChange={(e) => setBoostChannel(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-md bg-white"
                >
                  <option value="instagram">Instagram Reel / Post Boost</option>
                  <option value="facebook">Facebook Click-to-WhatsApp</option>
                  <option value="tiktok">TikTok Spark Ad Boost</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Daily Budget ($)</label>
                <input
                  type="number"
                  value={boostBudget}
                  onChange={(e) => setBoostBudget(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-md font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Duration (Days)</label>
                <input
                  type="number"
                  value={boostDuration}
                  onChange={(e) => setBoostDuration(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-md font-mono"
                />
              </div>
            </div>
            <div className="text-xs">
              <label className="block text-slate-700 font-medium mb-1">Campaign Name</label>
              <input
                type="text"
                required
                value={boostName}
                onChange={(e) => setBoostName(e.target.value)}
                placeholder="Q4 Holiday Flash Boost — Auto-DM Lead Qualifier"
                className="w-full p-2 border border-slate-200 rounded-md"
              />
            </div>
            <div className="text-xs">
              <label className="block text-slate-700 font-medium mb-1">
                Boosted Post Copy & Keyword Trigger
              </label>
              <textarea
                rows={2}
                required
                value={boostCopy}
                onChange={(e) => setBoostCopy(e.target.value)}
                placeholder="Comment DEMO or click Send Message and our AI chatbot will qualify your requirements immediately..."
                className="w-full p-2 border border-slate-200 rounded-md"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 px-4 bg-slate-900 text-white text-xs font-medium rounded-md hover:bg-slate-800 flex items-center justify-center gap-1.5"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Submit Social Boost for Manager Approval
            </button>
          </form>

          {/* Google Search Grounding (gemini-3.8-flash + googleSearch) */}
          <div className="space-y-3 border border-slate-200 rounded-md p-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-emerald-700" />
                  Live Google Search Grounding (Market & Ad Intelligence)
                </h4>
                <span className="text-[11px] font-mono text-slate-500">
                  gemini-3.8-flash + googleSearch
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Research live market data, competitor offers, or social ad hooks grounded in up-to-date Google Search results.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchPrompt}
                  onChange={(e) => setSearchPrompt(e.target.value)}
                  className="flex-1 p-2 text-xs border border-slate-200 rounded-md"
                  placeholder="Ask about market benchmarks, prospect company news, or ad hooks..."
                />
                <button
                  type="button"
                  onClick={handleRunSearchGrounding}
                  disabled={groundingLoading}
                  className="px-3 py-2 bg-emerald-700 text-white text-xs font-medium rounded-md hover:bg-emerald-800 disabled:opacity-50 whitespace-nowrap"
                >
                  {groundingLoading ? 'Searching...' : 'Search Web'}
                </button>
              </div>

              {groundingResult && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs space-y-2 max-h-56 overflow-y-auto">
                  <div className="whitespace-pre-wrap text-slate-800 leading-relaxed">
                    {groundingResult.answer}
                  </div>
                  {groundingResult.sources.length > 0 && (
                    <div className="pt-2 border-t border-slate-200">
                      <div className="font-semibold text-slate-700 mb-1">
                        Verified Google Search Sources:
                      </div>
                      <ul className="space-y-1">
                        {groundingResult.sources.map((s, idx) => (
                          <li key={idx}>
                            <a
                              href={s.uri}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-700 hover:underline flex items-center gap-1 truncate"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              {s.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 3. AI COPILOT & VISUAL AI AGENT BUILDER
// ---------------------------------------------------------------------------
export const AiAgentsModule: React.FC<ModuleProps> = ({ data, apiFetch, onRefresh, notify }) => {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Sales & Customer Success');
  const [assignedChannels, setAssignedChannels] = useState(
    'WhatsApp, Instagram, Facebook, TikTok'
  );
  const [communicationStyle, setCommunicationStyle] = useState('Professional & Grounded');
  const [confidenceThreshold, setConfidenceThreshold] = useState('85');
  const [responseMode, setResponseMode] = useState('auto');
  const [systemInstructions, setSystemInstructions] = useState(
    'Answer strictly from approved company knowledge documents. Never fabricate pricing, vacancies, discounts, or legal commitments. Escalate to a human when uncertain.'
  );

  // Interactive AI Copilot Studio State
  const [selectedLeadId, setSelectedLeadId] = useState<string>(
    data.leads[0] ? String(data.leads[0].id) : ''
  );
  const [copilotName, setCopilotName] = useState(data.leads[0]?.contactName || 'Elena Rostova');
  const [copilotNationality, setCopilotNationality] = useState(
    data.leads[0]?.nationality || 'Poland / EU'
  );
  const [copilotRole, setCopilotRole] = useState(
    data.leads[0]?.preferredJob || 'Senior Logistics & Fleet Coordinator'
  );
  const [copilotDestination, setCopilotDestination] = useState(
    data.leads[0]?.destinationCountry || 'United Kingdom / UAE'
  );
  const [copilotInquiry, setCopilotInquiry] = useState(
    data.leads[0]?.extractedRequirements ||
      'Candidate has 6 years of international logistics experience, fluent in English, holds valid passport and certificates, asking about visa sponsorship timeline and onboarding schedule.'
  );
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotResult, setCopilotResult] = useState<{
    qualificationScore: number;
    recommendedStage: string;
    candidateSummary: string;
    interviewQuestions: string[];
    whatsappFollowUpMessage: string;
  } | null>(null);

  const handleSelectLeadForCopilot = (idStr: string) => {
    setSelectedLeadId(idStr);
    const found = data.leads.find((l) => String(l.id) === idStr);
    if (found) {
      setCopilotName(found.contactName);
      setCopilotNationality(found.nationality || 'International');
      setCopilotRole(found.preferredJob || found.title);
      setCopilotDestination(found.destinationCountry || 'Global');
      setCopilotInquiry(found.extractedRequirements || found.notes || found.title);
    }
  };

  const handleRunCopilot = async (e: React.FormEvent) => {
    e.preventDefault();
    setCopilotLoading(true);
    try {
      const res = await apiFetch('/api/ai/recruitment-assistant', {
        method: 'POST',
        body: JSON.stringify({
          leadId: selectedLeadId ? Number(selectedLeadId) : undefined,
          contactName: copilotName,
          nationality: copilotNationality,
          preferredJob: copilotRole,
          destinationCountry: copilotDestination,
          notes: copilotInquiry,
          messageContext: copilotInquiry,
        }),
      });
      setCopilotResult(res.assistant);
      notify(
        `AI Copilot evaluated ${copilotName} — Score: ${res.assistant?.qualificationScore}/100 · Recommended Stage: ${res.assistant?.recommendedStage}`
      );
    } catch (err: any) {
      notify(err.message || 'AI Copilot analysis failed', 'error');
    } finally {
      setCopilotLoading(false);
    }
  };

  const handleApplyCopilotToLead = async () => {
    if (!selectedLeadId || !copilotResult) return;
    try {
      await apiFetch(`/api/leads/${selectedLeadId}`, {
        method: 'PUT',
        body: JSON.stringify({
          stage: copilotResult.recommendedStage,
          leadScore: copilotResult.qualificationScore,
          scoreExplanation: copilotResult.candidateSummary,
        }),
      });
      await onRefresh();
      notify(
        `Updated Lead #${selectedLeadId} to stage "${copilotResult.recommendedStage}" with score ${copilotResult.qualificationScore}/100.`
      );
    } catch (err: any) {
      notify(err.message || 'Failed to update lead from AI Copilot', 'error');
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await apiFetch('/api/ai-agents', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description: `Department AI Agent for ${department}`,
          department,
          assignedChannels,
          communicationStyle,
          confidenceThreshold,
          responseMode,
          systemInstructions,
        }),
      });
      setName('');
      await onRefresh();
      notify(`Created and versioned AI Agent: ${name}`);
    } catch (err: any) {
      notify(err.message || 'Failed to create AI agent', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Interactive AI Copilot Studio for Recruitment & Omnichannel Sales */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-indigo-600 font-semibold">
              GEMINI 3.8 FLASH · GROUNDED RECRUITMENT & SALES COPILOT
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              AI Copilot Studio — Candidate Qualification, Screening & Follow-Up Generator
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Evaluate candidates and business leads against your approved knowledge base, generate structured interview questions, and draft ready-to-send WhatsApp messages.
            </p>
          </div>
          { data.leads.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-600 font-medium">Load Lead Record:</span>
              <select
                value={selectedLeadId}
                onChange={(e) => handleSelectLeadForCopilot(e.target.value)}
                className="p-2 border border-slate-200 rounded-lg bg-slate-50 font-medium text-slate-900"
              >
                <option value="">Custom Profile / New Inquiry</option>
                {data.leads.map((l) => (
                  <option key={l.id} value={String(l.id)}>
                    #{l.id} · {l.contactName} ({l.stage})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form onSubmit={handleRunCopilot} className="lg:col-span-6 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Candidate / Prospect Name
                </label>
                <input
                  type="text"
                  required
                  value={copilotName}
                  onChange={(e) => setCopilotName(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Nationality / Region
                </label>
                <input
                  type="text"
                  value={copilotNationality}
                  onChange={(e) => setCopilotNationality(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Preferred Job / Opportunity Role
                </label>
                <input
                  type="text"
                  value={copilotRole}
                  onChange={(e) => setCopilotRole(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Destination Country / Market
                </label>
                <input
                  type="text"
                  value={copilotDestination}
                  onChange={(e) => setCopilotDestination(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Candidate Experience, Documents Status, or Customer Message
              </label>
              <textarea
                rows={4}
                required
                value={copilotInquiry}
                onChange={(e) => setCopilotInquiry(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg"
              />
            </div>
            <button
              type="submit"
              disabled={copilotLoading}
              className="w-full py-2.5 px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              {copilotLoading
                ? 'Analyzing Profile & Grounding with Gemini...'
                : 'Generate AI Qualification, Screening Questions & WhatsApp Reply'}
            </button>
          </form>

          <div className="lg:col-span-6 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 text-xs">
            {copilotResult ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <div className="text-slate-500">AI Qualification Score</div>
                    <div className="text-2xl font-bold font-mono tabular-nums text-indigo-600">
                      {copilotResult.qualificationScore}/100
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-500">Recommended Pipeline Stage</div>
                    <div className="text-sm font-bold text-slate-900">
                      {copilotResult.recommendedStage}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-slate-900 mb-1">
                    Executive Candidate / Lead Summary:
                  </div>
                  <p className="text-slate-700 leading-relaxed">{copilotResult.candidateSummary}</p>
                </div>

                <div>
                  <div className="font-semibold text-slate-900 mb-1">
                    Suggested Screening & Interview Questions:
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-700">
                    {copilotResult.interviewQuestions.map((q, idx) => (
                      <li key={idx}>{q}</li>
                    ))}
                  </ol>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5">
                  <div className="font-semibold text-slate-900">
                    Ready-to-Send WhatsApp Follow-Up Message:
                  </div>
                  <p className="text-slate-700 whitespace-pre-wrap">
                    {copilotResult.whatsappFollowUpMessage}
                  </p>
                </div>

                {selectedLeadId && (
                  <button
                    type="button"
                    onClick={handleApplyCopilotToLead}
                    className="w-full py-2 px-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800"
                  >
                    Apply Score ({copilotResult.qualificationScore}/100) & Stage ({copilotResult.recommendedStage}) to Lead #{selectedLeadId}
                  </button>
                )}
              </>
            ) : (
              <div className="py-10 text-center space-y-2 text-slate-500">
                <Sparkles className="w-6 h-6 text-indigo-500 mx-auto" />
                <div className="font-semibold text-slate-800">
                  AI Copilot Ready for Candidate & Lead Analysis
                </div>
                <p className="max-w-md mx-auto">
                  Select a candidate or lead on the left and click Generate to run real-time Gemini qualification, stage recommendation, interview screening questions, and WhatsApp follow-up drafting.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Configured Department AI Agent Personas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {data.aiAgents.map((agent) => (
          <div
            key={agent.id}
            className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-xs"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">{agent.name}</h3>
                <span className="text-xs font-mono tabular-nums text-slate-500 shrink-0">
                  v{agent.versionNumber} · {agent.isDefault ? 'Default' : 'Custom'}
                </span>
              </div>
              <p className="text-xs text-slate-600">{agent.description}</p>
              <div className="text-xs text-slate-500 pt-1">
                Department: {agent.department} · Style: {agent.communicationStyle}
              </div>
              <div className="text-xs text-slate-500 font-mono tabular-nums">
                Mode: {agent.responseMode} · Min Confidence: {agent.confidenceThreshold}%
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700">
                <div className="font-medium text-slate-900 mb-1">Grounding & Safety Prompt:</div>
                <p className="line-clamp-4">{agent.systemInstructions}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
              Restricted: {agent.restrictedActions}
            </div>
          </div>
        ))}
      </div>

      {/* Create New AI Agent Form */}
      <form
        onSubmit={handleCreateAgent}
        className="bg-white border border-slate-200 rounded-lg p-6 space-y-4"
      >
        <h3 className="text-base font-semibold text-slate-900">
          Configure New Department or Channel AI Agent
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Agent Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Atlas — MENA Real Estate Closer"
              className="w-full p-2 border border-slate-200 rounded-md"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Department</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-md"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Assigned Channels</label>
            <input
              type="text"
              value={assignedChannels}
              onChange={(e) => setAssignedChannels(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-md"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Communication Style</label>
            <select
              value={communicationStyle}
              onChange={(e) => setCommunicationStyle(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-md bg-white"
            >
              <option value="Professional & Grounded">Professional & Grounded</option>
              <option value="Friendly & High-Conversion">Friendly & High-Conversion</option>
              <option value="Formal & Executive">Formal & Executive</option>
            </select>
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Confidence Threshold (%)
            </label>
            <input
              type="number"
              min={50}
              max={99}
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-md font-mono"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Sending Mode</label>
            <select
              value={responseMode}
              onChange={(e) => setResponseMode(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-md bg-white"
            >
              <option value="auto">Automatic Sending (Within Policy Window)</option>
              <option value="approval_required">Require Staff Approval Before Sending</option>
              <option value="suggest_only">Suggest Draft Only</option>
            </select>
          </div>
        </div>
        <div className="text-xs">
          <label className="block font-medium text-slate-700 mb-1">
            Business Instructions & Guardrails (Strict Knowledge Grounding)
          </label>
          <textarea
            rows={3}
            value={systemInstructions}
            onChange={(e) => setSystemInstructions(e.target.value)}
            className="w-full p-2.5 border border-slate-200 rounded-md"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-md hover:bg-slate-800"
        >
          Save & Activate AI Agent Version
        </button>
      </form>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 4. KNOWLEDGE BASE & GEMINI 4 ARGON IMAGE / DOCUMENT SCANNER
// ---------------------------------------------------------------------------
export const KnowledgeModule: React.FC<ModuleProps> = ({
  data,
  apiFetch,
  onRefresh,
  notify,
}) => {
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState('pdf');
  const [departmentScope, setDepartmentScope] = useState('All Departments');
  const [sourceReference, setSourceReference] = useState('');
  const [content, setContent] = useState('');

  // Image Upload & Analysis with gemini-4-argon
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/png');
  const [imagePrompt, setImagePrompt] = useState(
    'Extract all product pricing, service tiers, invoice line items, or customer requirements from this image so our AI agent can reference it.'
  );
  const [saveScanTitle, setSaveScanTitle] = useState('Scanned Rate Card / Document Analysis');
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [analysisOutput, setAnalysisOutput] = useState<string | null>(null);

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    try {
      await apiFetch('/api/knowledge', {
        method: 'POST',
        body: JSON.stringify({
          title,
          docType,
          departmentScope,
          sourceReference: sourceReference || `${title.toLowerCase().replace(/\s+/g, '_')}.${docType}`,
          content,
        }),
      });
      setTitle('');
      setContent('');
      await onRefresh();
      notify('Knowledge document chunked and indexed for RAG grounding.');
    } catch (err: any) {
      notify(err.message || 'Failed to index document', 'error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageMimeType(file.type || 'image/png');
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePreview) {
      notify('Please select an image file first.', 'error');
      return;
    }
    setAnalyzingImage(true);
    try {
      const res = await apiFetch('/api/ai/analyze-image', {
        method: 'POST',
        body: JSON.stringify({
          base64Data: imagePreview,
          mimeType: imageMimeType,
          prompt: imagePrompt,
          saveToKnowledgeTitle: saveScanTitle,
        }),
      });
      setAnalysisOutput(res.analysis);
      await onRefresh();
      notify('Image analyzed with gemini-4-argon and indexed into Knowledge Base.');
    } catch (err: any) {
      notify(err.message || 'Image analysis failed', 'error');
    } finally {
      setAnalyzingImage(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Gemini 4 Argon Vision & Document Scanner */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              AI Photo & Document Scanner (Powered by gemini-4-argon)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload a photo of a product catalog, rate card, customer invoice, or whiteboard to analyze with Gemini 4 Argon and automatically index into your tenant Knowledge Base.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">Model: gemini-4-argon</span>
        </div>

        <form onSubmit={handleAnalyzeImage} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Upload Photo or Document Image (PNG, JPEG, WEBP)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full p-2 border border-slate-200 rounded-md bg-slate-50"
              />
            </div>

            {imagePreview && (
              <div className="border border-slate-200 rounded-md p-2 bg-slate-50">
                <img
                  src={imagePreview}
                  alt="Uploaded preview for Gemini 4 Argon analysis"
                  referrerPolicy="no-referrer"
                  className="max-h-44 object-contain mx-auto rounded"
                />
              </div>
            )}

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Knowledge Base Title (Optional Auto-Index)
              </label>
              <input
                type="text"
                value={saveScanTitle}
                onChange={(e) => setSaveScanTitle(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-md"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Analysis Instructions</label>
              <textarea
                rows={2}
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-md"
              />
            </div>

            <button
              type="submit"
              disabled={analyzingImage || !imagePreview}
              className="w-full py-2.5 px-4 bg-slate-900 text-white text-xs font-medium rounded-md hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              {analyzingImage
                ? 'Analyzing Image with gemini-4-argon...'
                : 'Analyze Photo with Gemini 4 Argon & Save to Knowledge Base'}
            </button>
          </div>

          <div className="border border-slate-200 rounded-md p-4 bg-slate-50 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-900">
                Gemini 4 Argon Vision Extraction Result
              </div>
              {analysisOutput ? (
                <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                  {analysisOutput}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Upload any photo or document image on the left and click Analyze to inspect structured findings from gemini-4-argon.
                </p>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Approved Knowledge Base Documents List */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <h3 className="text-base font-semibold text-slate-900">
          Approved Company Knowledge Base (Tenant-Isolated RAG Sources)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.knowledgeDocuments.map((doc) => (
            <div key={doc.id} className="border border-slate-200 rounded-md p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold text-slate-900">{doc.title}</h4>
                <span className="text-xs font-mono tabular-nums text-slate-500 shrink-0">
                  {doc.docType.toUpperCase()} · v{doc.versionNumber}
                </span>
              </div>
              <div className="text-xs text-slate-500 font-mono">
                Source: {doc.sourceReference} · Scope: {doc.departmentScope} · {doc.chunkCount} chunks
              </div>
              <p className="text-xs text-slate-700 whitespace-pre-wrap line-clamp-4 leading-relaxed">
                {doc.content}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Add Manual Knowledge Document */}
      <form
        onSubmit={handleAddDocument}
        className="bg-white border border-slate-200 rounded-lg p-6 space-y-4"
      >
        <h3 className="text-base font-semibold text-slate-900">
          Ingest New Approved Policy, FAQ, or Pricing Document
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Document Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q4 Enterprise SLA & Refund Policy"
              className="w-full p-2 border border-slate-200 rounded-md"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Format Type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-md bg-white"
            >
              <option value="pdf">PDF Document</option>
              <option value="docx">DOCX Policy</option>
              <option value="faq">Approved FAQ</option>
              <option value="csv">CSV Rate Table</option>
              <option value="website">Authorized Website Extract</option>
            </select>
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Department Access</label>
            <input
              type="text"
              value={departmentScope}
              onChange={(e) => setDepartmentScope(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-md"
            />
          </div>
        </div>
        <div className="text-xs">
          <label className="block font-medium text-slate-700 mb-1">
            Approved Content (Used for Grounded AI Answers)
          </label>
          <textarea
            rows={4}
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste verified company pricing, FAQs, or policy text here..."
            className="w-full p-2.5 border border-slate-200 rounded-md"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-md hover:bg-slate-800"
        >
          Chunk & Index Document
        </button>
      </form>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 5. AI VOICE & WHATSAPP CALLING STUDIO (Powered by gemini-3.8-flash-tts)
// ---------------------------------------------------------------------------
export const VoiceAiModule: React.FC<ModuleProps> = ({
  data,
  apiFetch,
  onRefresh,
  notify,
}) => {
  const [contactName, setContactName] = useState('Henrik Lindqvist (Nordic Freight)');
  const [phoneNumber, setPhoneNumber] = useState('+44 7700 900412');
  const [voicePersona, setVoicePersona] = useState('Kore');
  const [language, setLanguage] = useState('English');
  const [isDualSpeaker, setIsDualSpeaker] = useState(false);
  const [scriptText, setScriptText] = useState(
    'Hello Henrik! <breath> This is Aria, the AI Voice Concierge from Apex Global. I am calling to confirm your 45-number WhatsApp Business onboarding session scheduled for Thursday at 10:30 UTC.'
  );
  const [synthesizing, setSynthesizing] = useState(false);
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);

  const handleSynthesizeVoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scriptText.trim()) return;
    setSynthesizing(true);
    try {
      const res = await apiFetch('/api/voice/synthesize', {
        method: 'POST',
        body: JSON.stringify({
          contactName,
          phoneNumber,
          voiceAgentName: `Aria Voice Agent (${voicePersona})`,
          scriptText,
          voicePersona,
          language,
          isDualSpeaker,
        }),
      });
      setAudioDataUrl(res.audioDataUrl);
      await onRefresh();
      notify('Synthesized 24kHz WAV voice audio using gemini-3.8-flash-tts.');
    } catch (err: any) {
      notify(err.message || 'Voice synthesis failed', 'error');
    } finally {
      setSynthesizing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Provider Capability & Eligibility Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-slate-900">
            AI Voice Studio (gemini-3.8-flash-tts) & Official WhatsApp Business Calling Status
          </h2>
          <p className="text-xs text-slate-600 max-w-3xl">
            Gemini 3.8 Flash TTS speech generation is connected and active for single-speaker and dual-speaker call scripts. Live outbound Meta WhatsApp Business Calling API termination requires an eligible WABA phone number and human manager approval per call.
          </p>
        </div>
        <div className="text-xs font-mono tabular-nums text-right">
          <div className="text-emerald-700 font-semibold">
            TTS Engine: gemini-3.8-flash-tts (Connected)
          </div>
          <div className="text-amber-700">
            WhatsApp Calling SIP Trunk: Not Configured (Approval Gate Active)
          </div>
        </div>
      </div>

      {/* Interactive Gemini 3.8 Flash TTS Synthesizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleSynthesizeVoice}
          className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-4"
        >
          <h3 className="text-sm font-semibold text-slate-900">
            Synthesize Grounded AI Call Script or Voice Note (gemini-3.8-flash-tts)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Customer / Recipient</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Gemini Prebuilt Voice Persona
              </label>
              <select
                value={voicePersona}
                onChange={(e) => setVoicePersona(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-md bg-white"
              >
                <option value="Kore">Kore (Warm Executive Concierge)</option>
                <option value="Puck">Puck (Dynamic & Articulate)</option>
                <option value="Zephyr">Zephyr (Calm Support Specialist)</option>
                <option value="Fenrir">Fenrir (Deep Authoritative)</option>
                <option value="Charon">Charon (Clear Multilingual)</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Speaker Mode</label>
              <select
                value={isDualSpeaker ? 'dual' : 'single'}
                onChange={(e) => setIsDualSpeaker(e.target.value === 'dual')}
                className="w-full p-2 border border-slate-200 rounded-md bg-white"
              >
                <option value="single">Single Speaker Voice Note / IVR</option>
                <option value="dual">Dual-Speaker Call Simulation (Aria + Customer)</option>
              </select>
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-medium text-slate-700 mb-1">
              Call Script (Supports vocal expressions like &lt;breath&gt;, &lt;laugh&gt;, |yeah|)
            </label>
            <textarea
              rows={4}
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-md"
            />
          </div>

          <button
            type="submit"
            disabled={synthesizing}
            className="w-full py-2.5 px-4 bg-slate-900 text-white text-xs font-medium rounded-md hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Volume2 className="w-4 h-4" />
            {synthesizing
              ? 'Generating 24kHz WAV Audio with gemini-3.8-flash-tts...'
              : 'Synthesize Playable Speech (gemini-3.8-flash-tts)'}
          </button>
        </form>

        {/* Audio Player & Call Session Output */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Generated WAV Audio Player & Call Disclosure
            </h3>
            <p className="text-xs text-slate-500">
              Unary output from <span className="font-mono">gemini-3.8-flash-tts</span> returns a complete 24kHz mono 16-bit WAV file ready for browser playback or WhatsApp audio message dispatch.
            </p>

            {audioDataUrl ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-3">
                <div className="text-xs font-medium text-emerald-800">
                  Audio Synthesized Successfully (audio/wav · 24kHz)
                </div>
                <audio controls src={audioDataUrl} className="w-full" />
              </div>
            ) : (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-md text-center text-xs text-slate-500">
                Click "Synthesize Playable Speech" to generate and listen to live Gemini 3.8 Flash TTS audio.
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 pt-3 text-xs text-slate-600 space-y-1">
            <div className="font-medium text-slate-900">Compliance & Recording Policy</div>
            <p>
              All AI voice interactions disclose automated handling upfront and respect tenant retention limits ({data.activeTenant.retentionDays} days).
            </p>
          </div>
        </div>
      </div>

      {/* Call History & Transcripts */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <h3 className="text-base font-semibold text-slate-900">
          Voice Sessions, Call Outcomes & Transcripts
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-4 font-medium">Contact & Number</th>
                <th className="py-2 px-4 font-medium">Voice Agent & Persona</th>
                <th className="py-2 px-4 font-medium">Channel Type</th>
                <th className="py-2 px-4 font-medium">Status</th>
                <th className="py-2 px-4 font-medium text-right">Duration / Cost</th>
                <th className="py-2 pl-4 font-medium">Outcome Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.voiceSessions.map((vs) => (
                <tr key={vs.id} className="hover:bg-slate-50">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-slate-900">{vs.contactName}</div>
                    <div className="font-mono tabular-nums text-slate-500">{vs.phoneNumber}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-slate-900">{vs.voiceAgentName}</div>
                    <div className="text-slate-500">
                      Voice: {vs.voicePersona} · {vs.language}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700">{vs.callType}</td>
                  <td className="py-3 px-4 font-medium text-slate-900">
                    {vs.status.replace(/_/g, ' ')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                    {vs.durationSeconds}s · ${vs.estimatedCostUsd}
                  </td>
                  <td className="py-3 pl-4 text-slate-700 max-w-sm">{vs.outcomeSummary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
