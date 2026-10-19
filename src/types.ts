export type NavSection =
  | 'dashboard'
  | 'inbox'
  | 'channels'
  | 'campaigns'
  | 'contacts'
  | 'pipeline'
  | 'tasks'
  | 'ai_agents'
  | 'knowledge'
  | 'workflows'
  | 'voice_ai'
  | 'analytics'
  | 'team'
  | 'integrations'
  | 'billing'
  | 'settings'
  | 'audit_logs';

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  industry: string;
  timezone: string;
  plan: string;
  emergencyPause: boolean;
  aiDisclosureEnabled: boolean;
  retentionDays: number;
  createdAt: string;
}

export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface PhoneNumberChannel {
  id: number;
  tenantId: number;
  wabaAccountId?: number;
  phoneNumber: string;
  displayName: string;
  phoneNumberId: string;
  channelType: 'whatsapp' | 'facebook' | 'instagram' | 'tiktok' | string;
  department: string;
  assignedStaffName: string;
  assignedAiAgentId?: number | null;
  aiStatus: string;
  businessHours: string;
  language: string;
  qualityRating: string;
  connectionStatus: string;
  lastWebhookAt?: string;
  recentError?: string | null;
}

export interface SocialBoostCampaign {
  id: number;
  channelType: string;
  campaignName: string;
  objective: string;
  adCopy: string;
  targetAudience: string;
  dailyBudgetUsd: string;
  durationDays: number;
  linkedAiAgentId?: number | null;
  autoRespondCommentsAndDms: boolean;
  status: string;
  impressions: number;
  clicks: number;
  conversationsStarted: number;
  qualifiedLeadsCount: number;
  createdAt: string;
}

export interface ContactRecord {
  id: number;
  name: string;
  phone: string;
  email: string;
  company: string;
  preferredLanguage: string;
  sourceChannel: string;
  consentStatus: string;
  connectedNumberDisplay: string;
  assignedEmployee: string;
  requirementsSummary: string;
  notes: string;
  createdAt: string;
}

export interface ConversationRecord {
  id: number;
  contactId: number;
  phoneNumberId?: number | null;
  channelType: string;
  customerName: string;
  customerHandleOrPhone: string;
  status: string;
  priority: string;
  department: string;
  assignedEmployee: string;
  assignedAiAgentId?: number | null;
  handlingMode: string;
  lockedByStaff?: string | null;
  unreadCount: number;
  aiSummary: string;
  detectedIntent: string;
  sentiment: string;
  suggestedReply: string;
  tagsCsv: string;
  serviceWindowOpen: boolean;
  lastMessagePreview: string;
  lastMessageAt: string;
}

export interface MessageRecord {
  id: number;
  conversationId: number;
  senderType: string;
  senderName: string;
  direction: string;
  contentType: string;
  content: string;
  deliveryStatus: string;
  providerMessageId?: string;
  aiModelUsed?: string;
  aiConfidence?: string;
  knowledgeCitations?: string;
  createdAt: string;
}

export interface LeadRecord {
  id: number;
  contactId?: number;
  title: string;
  contactName: string;
  phone?: string;
  email?: string;
  nationality?: string;
  preferredJob?: string;
  destinationCountry?: string;
  ownerName: string;
  sourceChannel: string;
  priority: string;
  stage: string;
  leadScore: number;
  scoreExplanation: string;
  extractedRequirements: string;
  notes?: string;
  estimatedValueUsd: string;
  nextAction: string;
  dueDate: string;
  nextFollowUpAt?: string;
  isArchived?: boolean;
  createdAt?: string;
}

export interface TaskRecord {
  id: number;
  title: string;
  taskType: string;
  assignedEmployee: string;
  contactName: string;
  dueDate: string;
  priority: string;
  status: string;
}

export interface AppointmentRecord {
  id: number;
  contactName: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  channelSource: string;
  notes: string;
}

export interface AiAgentRecord {
  id: number;
  name: string;
  description: string;
  department: string;
  assignedChannels: string;
  systemInstructions: string;
  communicationStyle: string;
  supportedLanguages: string;
  confidenceThreshold: number;
  responseMode: string;
  allowedActions: string;
  restrictedActions: string;
  isDefault: boolean;
  isActive: boolean;
  versionNumber: number;
}

export interface KnowledgeDocRecord {
  id: number;
  title: string;
  docType: string;
  departmentScope: string;
  content: string;
  sourceReference: string;
  processingStatus: string;
  versionNumber: number;
  chunkCount: number;
  createdAt: string;
}

export interface WorkflowRecord {
  id: number;
  name: string;
  description: string;
  triggerType: string;
  conditionsSummary: string;
  actionsSummary: string;
  requiresApproval: boolean;
  isActive: boolean;
  executionCount: number;
  successCount: number;
  failureCount: number;
}

export interface WorkflowExecutionRecord {
  id: number;
  workflowId: number;
  workflowName: string;
  triggerContext: string;
  status: string;
  stepDetails: string;
  executedAt: string;
}

export interface ApprovalRecord {
  id: number;
  approvalType: string;
  title: string;
  description: string;
  targetEntityId?: number;
  status: string;
  requestedBy: string;
  reviewedBy?: string;
  createdAt: string;
}

export interface VoiceSessionRecord {
  id: number;
  contactName: string;
  phoneNumber: string;
  voiceAgentName: string;
  callType: string;
  voicePersona: string;
  language: string;
  status: string;
  durationSeconds: number;
  estimatedCostUsd: string;
  consentRecorded: boolean;
  outcomeSummary: string;
  createdAt: string;
}

export interface CallTranscriptRecord {
  id: number;
  voiceSessionId: number;
  scriptAndTranscript: string;
  aiSummary: string;
  extractedNextSteps: string;
  createdAt: string;
}

export interface IntegrationRecord {
  id: number;
  providerKey: string;
  displayName: string;
  category: string;
  status: string;
  maskedCredentialHint?: string;
  requiredPermissions: string;
  setupInstructions: string;
  lastSuccessAt?: string;
  recentError?: string | null;
}

export interface UsageRecord {
  id: number;
  metricType: string;
  unitsUsed: number;
  estimatedCostUsd: string;
  createdAt: string;
}

export interface SubscriptionRecord {
  id: number;
  planName: string;
  status: string;
  monthlyPriceUsd: number;
  maxWhatsappNumbers: number;
  maxStaffSeats: number;
  maxMonthlyConversations: number;
  maxVoiceMinutes: number;
  renewalDate: string;
}

export interface InvitationRecord {
  id: number;
  email: string;
  role: string;
  department: string;
  status: string;
  invitedBy: string;
  token: string;
  createdAt: string;
}

export interface AuditLogRecord {
  id: number;
  actorUid: string;
  actorName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: string;
  createdAt: string;
}

export interface BootstrapPayload {
  user: UserProfile;
  activeTenant: Tenant;
  authorizedTenants: Tenant[];
  membership: any;
  wabaAccounts: any[];
  phoneNumbers: PhoneNumberChannel[];
  socialBoosts: SocialBoostCampaign[];
  integrations: IntegrationRecord[];
  contacts: ContactRecord[];
  conversations: ConversationRecord[];
  messages: MessageRecord[];
  pipelineStages: any[];
  leads: LeadRecord[];
  tasks: TaskRecord[];
  appointments: AppointmentRecord[];
  aiAgents: AiAgentRecord[];
  aiAgentVersions: any[];
  knowledgeDocuments: KnowledgeDocRecord[];
  workflows: WorkflowRecord[];
  workflowExecutions: WorkflowExecutionRecord[];
  approvals: ApprovalRecord[];
  voiceSessions: VoiceSessionRecord[];
  callTranscripts: CallTranscriptRecord[];
  notifications: any[];
  usageRecords: UsageRecord[];
  subscription: SubscriptionRecord | null;
  invitations: InvitationRecord[];
  rolesPermissions: any[];
  auditLogs: AuditLogRecord[];
  webhookEvents: any[];
}
