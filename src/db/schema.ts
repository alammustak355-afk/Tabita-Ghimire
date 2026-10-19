import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
} from 'drizzle-orm/pg-core';

// 1. Tenants (Multi-tenant isolation root)
export const tenants = pgTable('tenants', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  industry: text('industry').notNull().default('Technology & B2B Services'),
  timezone: text('timezone').notNull().default('UTC'),
  plan: text('plan').notNull().default('Growth Pro'),
  emergencyPause: boolean('emergency_pause').notNull().default(false),
  aiDisclosureEnabled: boolean('ai_disclosure_enabled').notNull().default(true),
  retentionDays: integer('retention_days').notNull().default(90),
  isDemoSeeded: boolean('is_demo_seeded').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Users (Linked to Firebase Auth UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  name: text('name').notNull().default('Workspace Owner'),
  avatarUrl: text('avatar_url'),
  activeTenantId: integer('active_tenant_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 3. Memberships (Tenant RBAC & Department Assignment)
export const memberships = pgTable('memberships', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  role: text('role').notNull().default('company_owner'), // platform_admin, company_owner, company_admin, manager, team_leader, agent, analyst
  department: text('department').notNull().default('Executive & Operations'),
  assignedNumbersJson: text('assigned_numbers_json').notNull().default('[]'),
  permissionsJson: text('permissions_json').notNull().default('["all"]'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. Roles and Permissions Matrix
export const rolesPermissions = pgTable('roles_permissions', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  roleName: text('role_name').notNull(),
  permissionsJson: text('permissions_json').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 5. Staff Invitations
export const invitations = pgTable('invitations', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  email: text('email').notNull(),
  role: text('role').notNull().default('agent'),
  department: text('department').notNull().default('Sales & Support'),
  status: text('status').notNull().default('pending'), // pending, accepted, rejected, revoked
  invitedBy: text('invited_by').notNull(),
  token: text('token').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 6. Official WhatsApp Business Accounts (WABA) & Social Business Accounts
export const whatsappBusinessAccounts = pgTable('whatsapp_business_accounts', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  accountName: text('account_name').notNull(),
  wabaId: text('waba_id').notNull(),
  platform: text('platform').notNull().default('whatsapp'), // whatsapp, facebook, instagram, tiktok
  verificationStatus: text('verification_status').notNull().default('unverified_credentials_missing'),
  connectionStatus: text('connection_status').notNull().default('not_configured'), // connected_live, sandbox_ready, not_configured, error
  lastWebhookAt: timestamp('last_webhook_at'),
  recentError: text('recent_error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 7. Connected WhatsApp Phone Numbers & Omnichannel Handles (20, 50, 100+ supported)
export const whatsappPhoneNumbers = pgTable('whatsapp_phone_numbers', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  wabaAccountId: integer('waba_account_id').references(() => whatsappBusinessAccounts.id),
  phoneNumber: text('phone_number').notNull(), // or @handle for IG/TikTok/FB Page
  displayName: text('display_name').notNull(),
  phoneNumberId: text('phone_number_id').notNull(),
  channelType: text('channel_type').notNull().default('whatsapp'), // whatsapp, facebook, instagram, tiktok
  department: text('department').notNull().default('Sales'),
  assignedStaffName: text('assigned_staff_name').notNull().default('Unassigned'),
  assignedAiAgentId: integer('assigned_ai_agent_id'),
  aiStatus: text('ai_status').notNull().default('auto_active'), // auto_active, approval_required, human_only, paused
  businessHours: text('business_hours').notNull().default('08:00 - 20:00 UTC'),
  language: text('language').notNull().default('English'),
  qualityRating: text('quality_rating').notNull().default('GREEN (High)'),
  connectionStatus: text('connection_status').notNull().default('not_configured'), // connected_live, webhook_ready, not_configured, error
  lastWebhookAt: timestamp('last_webhook_at'),
  recentError: text('recent_error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 8. Social Media & Click-to-WhatsApp Ad Boost Campaigns (FB, IG, TikTok, WhatsApp)
export const socialBoostCampaigns = pgTable('social_boost_campaigns', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  channelType: text('channel_type').notNull().default('instagram'), // facebook, instagram, tiktok, whatsapp_ctwa
  campaignName: text('campaign_name').notNull(),
  objective: text('objective').notNull().default('Lead Generation & Auto-DM Chatbot'),
  adCopy: text('ad_copy').notNull(),
  targetAudience: text('target_audience').notNull(),
  dailyBudgetUsd: numeric('daily_budget_usd').notNull().default('50'),
  durationDays: integer('duration_days').notNull().default(7),
  linkedAiAgentId: integer('linked_ai_agent_id'),
  autoRespondCommentsAndDms: boolean('auto_respond_comments_and_dms').notNull().default(true),
  status: text('status').notNull().default('pending_approval'), // draft, pending_approval, active_sandbox, blocked_missing_ad_token, completed
  impressions: integer('impressions').notNull().default(0),
  clicks: integer('clicks').notNull().default(0),
  conversationsStarted: integer('conversations_started').notNull().default(0),
  qualifiedLeadsCount: integer('qualified_leads_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 9. Integration Credentials & Provider Status
export const integrationCredentials = pgTable('integration_credentials', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  providerKey: text('provider_key').notNull(), // meta_whatsapp, meta_fb_ig, tiktok_business, gemini_ai, google_calendar, voice_sip, stripe_billing, smtp_email
  displayName: text('display_name').notNull(),
  category: text('category').notNull(),
  status: text('status').notNull().default('not_configured'), // connected, not_configured, pending_verification, error
  maskedCredentialHint: text('masked_credential_hint'),
  configJson: text('config_json').notNull().default('{}'),
  requiredPermissions: text('required_permissions').notNull(),
  setupInstructions: text('setup_instructions').notNull(),
  lastSuccessAt: timestamp('last_success_at'),
  recentError: text('recent_error'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 10. Webhook Events (Idempotency & Signature Verification Log)
export const webhookEvents = pgTable('webhook_events', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  provider: text('provider').notNull(), // whatsapp, facebook, instagram, tiktok
  externalEventId: text('external_event_id').notNull(),
  eventType: text('event_type').notNull(),
  signatureVerified: boolean('signature_verified').notNull().default(false),
  payloadJson: text('payload_json').notNull(),
  processingStatus: text('processing_status').notNull().default('processed'), // processed, duplicate_ignored, failed
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 11. CRM Contacts
export const contacts = pgTable('contacts', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email').default(''),
  company: text('company').default(''),
  preferredLanguage: text('preferred_language').notNull().default('English'),
  sourceChannel: text('source_channel').notNull().default('whatsapp'), // whatsapp, facebook, instagram, tiktok, web
  consentStatus: text('consent_status').notNull().default('opted_in'), // opted_in, opted_out, transactional_only
  connectedNumberDisplay: text('connected_number_display').default(''),
  assignedEmployee: text('assigned_employee').default('Unassigned'),
  requirementsSummary: text('requirements_summary').default(''),
  notes: text('notes').default(''),
  customFieldsJson: text('custom_fields_json').notNull().default('{}'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 12. Tags
export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  name: text('name').notNull(),
  color: text('color').notNull().default('slate'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 13. Contact Tags Junction
export const contactTags = pgTable('contact_tags', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  contactId: integer('contact_id').references(() => contacts.id).notNull(),
  tagId: integer('tag_id').references(() => tags.id).notNull(),
});

// 14. Unified Inbox Conversations (WhatsApp, FB, IG, TikTok)
export const conversations = pgTable('conversations', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  contactId: integer('contact_id').references(() => contacts.id).notNull(),
  phoneNumberId: integer('phone_number_id').references(() => whatsappPhoneNumbers.id),
  channelType: text('channel_type').notNull().default('whatsapp'), // whatsapp, facebook, instagram, tiktok
  customerName: text('customer_name').notNull(),
  customerHandleOrPhone: text('customer_handle_or_phone').notNull(),
  status: text('status').notNull().default('open'), // new, open, pending, waiting_for_customer, escalated, resolved
  priority: text('priority').notNull().default('normal'), // low, normal, high, urgent
  department: text('department').notNull().default('Sales'),
  assignedEmployee: text('assigned_employee').notNull().default('AI Concierge'),
  assignedAiAgentId: integer('assigned_ai_agent_id'),
  handlingMode: text('handling_mode').notNull().default('ai_auto'), // ai_auto, ai_approval, human_takeover
  lockedByStaff: text('locked_by_staff'),
  unreadCount: integer('unread_count').notNull().default(0),
  aiSummary: text('ai_summary').default(''),
  detectedIntent: text('detected_intent').default('general_inquiry'),
  sentiment: text('sentiment').default('neutral'), // positive, neutral, negative
  suggestedReply: text('suggested_reply').default(''),
  tagsCsv: text('tags_csv').default(''),
  serviceWindowOpen: boolean('service_window_open').notNull().default(true),
  lastMessagePreview: text('last_message_preview').default(''),
  lastMessageAt: timestamp('last_message_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 15. Conversation Assignments History
export const conversationAssignments = pgTable('conversation_assignments', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  conversationId: integer('conversation_id').references(() => conversations.id).notNull(),
  assignedTo: text('assigned_to').notNull(),
  assignedBy: text('assigned_by').notNull(),
  reason: text('reason').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 16. Messages
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  conversationId: integer('conversation_id').references(() => conversations.id).notNull(),
  senderType: text('sender_type').notNull(), // customer, staff, ai_agent, internal_note
  senderName: text('sender_name').notNull(),
  direction: text('direction').notNull(), // inbound, outbound, internal_note
  contentType: text('content_type').notNull().default('text'), // text, image, audio, document, template
  content: text('content').notNull(),
  mediaUrl: text('media_url'),
  deliveryStatus: text('delivery_status').notNull().default('delivered'), // sent, delivered, read, failed, pending_approval, simulated_sandbox, internal
  providerMessageId: text('provider_message_id'),
  aiModelUsed: text('ai_model_used'),
  aiConfidence: numeric('ai_confidence'),
  knowledgeCitations: text('knowledge_citations'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 17. Message Status Events
export const messageStatusEvents = pgTable('message_status_events', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  messageId: integer('message_id').references(() => messages.id).notNull(),
  status: text('status').notNull(),
  details: text('details'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 18. Pipeline Stages
export const pipelineStages = pgTable('pipeline_stages', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  name: text('name').notNull(),
  stageOrder: integer('stage_order').notNull(),
  color: text('color').notNull().default('slate'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 19. CRM Leads, Candidates & Opportunities
export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  contactId: integer('contact_id').references(() => contacts.id),
  title: text('title').notNull(),
  contactName: text('contact_name').notNull(),
  phone: text('phone').notNull().default(''),
  email: text('email').notNull().default(''),
  nationality: text('nationality').notNull().default(''),
  preferredJob: text('preferred_job').notNull().default(''),
  destinationCountry: text('destination_country').notNull().default(''),
  ownerName: text('owner_name').notNull().default('Unassigned'),
  sourceChannel: text('source_channel').notNull().default('whatsapp'), // whatsapp, facebook, instagram, tiktok, csv_import, web
  priority: text('priority').notNull().default('high'),
  stage: text('stage').notNull().default('New Lead'), // New Lead, Contacted, Interested, Documents Pending, Qualified, Demo / Proposal, Employer Review, Offer, Negotiation, Visa Process, Deployed, Closed Won, Rejected, On Hold
  leadScore: integer('lead_score').notNull().default(70),
  scoreExplanation: text('score_explanation').notNull().default('Verified inquiry with clear timeline'),
  extractedRequirements: text('extracted_requirements').notNull().default(''),
  notes: text('notes').notNull().default(''),
  estimatedValueUsd: numeric('estimated_value_usd').notNull().default('0'),
  nextAction: text('next_action').notNull().default('Send qualification follow-up'),
  dueDate: text('due_date').notNull().default('2026-10-25'),
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 20. Tasks & Follow-up Reminders
export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  title: text('title').notNull(),
  taskType: text('task_type').notNull().default('follow_up'), // follow_up, call, meeting, document_request, social_boost
  assignedEmployee: text('assigned_employee').notNull().default('Workspace Owner'),
  contactName: text('contact_name').default(''),
  conversationId: integer('conversation_id'),
  dueDate: text('due_date').notNull(),
  priority: text('priority').notNull().default('normal'),
  status: text('status').notNull().default('pending'), // pending, in_progress, completed, overdue
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

// 21. Appointments & Calendar Bookings
export const appointments = pgTable('appointments', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  contactName: text('contact_name').notNull(),
  title: text('title').notNull(),
  scheduledAt: text('scheduled_at').notNull(),
  durationMinutes: integer('duration_minutes').notNull().default(30),
  status: text('status').notNull().default('scheduled'), // scheduled, completed, missed, cancelled
  channelSource: text('channel_source').notNull().default('whatsapp'),
  notes: text('notes').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 22. AI Agents
export const aiAgents = pgTable('ai_agents', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  department: text('department').notNull().default('Customer Success & Sales'),
  assignedChannels: text('assigned_channels').notNull().default('WhatsApp, Instagram, Facebook, TikTok'),
  systemInstructions: text('system_instructions').notNull(),
  communicationStyle: text('communication_style').notNull().default('Professional & Grounded'),
  supportedLanguages: text('supported_languages').notNull().default('English, Spanish, Arabic, Hindi, French'),
  confidenceThreshold: integer('confidence_threshold').notNull().default(80),
  responseMode: text('response_mode').notNull().default('auto'), // auto, approval_required, suggest_only
  allowedActions: text('allowed_actions').notNull().default('Answer from Knowledge Base, Qualify Lead, Schedule Callback, Tag Conversation'),
  restrictedActions: text('restricted_actions').notNull().default('Never invent prices, discounts, legal terms, or payment confirmations'),
  isDefault: boolean('is_default').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  versionNumber: integer('version_number').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 23. AI Agent Versions
export const aiAgentVersions = pgTable('ai_agent_versions', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  agentId: integer('agent_id').references(() => aiAgents.id).notNull(),
  versionNumber: integer('version_number').notNull(),
  instructionsSnapshot: text('instructions_snapshot').notNull(),
  styleSnapshot: text('style_snapshot').notNull(),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 24. Knowledge Base Documents
export const knowledgeDocuments = pgTable('knowledge_documents', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  title: text('title').notNull(),
  docType: text('doc_type').notNull().default('faq'), // pdf, docx, txt, csv, faq, website, image_analysis
  departmentScope: text('department_scope').notNull().default('All Departments'),
  content: text('content').notNull(),
  sourceReference: text('source_reference').notNull().default('Internal Approved Policy'),
  processingStatus: text('processing_status').notNull().default('ready'), // ready, processing, error
  versionNumber: integer('version_number').notNull().default(1),
  chunkCount: integer('chunk_count').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 25. Knowledge Chunks (For Grounded RAG Retrieval)
export const knowledgeChunks = pgTable('knowledge_chunks', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  documentId: integer('document_id').references(() => knowledgeDocuments.id).notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 26. Workflow Automation Definitions
export const workflowDefinitions = pgTable('workflow_definitions', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  triggerType: text('trigger_type').notNull(), // inbound_whatsapp, inbound_social_dm, new_qualified_lead, lead_stage_changed, no_response_24h, task_overdue
  conditionsSummary: text('conditions_summary').notNull(),
  actionsSummary: text('actions_summary').notNull(),
  requiresApproval: boolean('requires_approval').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  executionCount: integer('execution_count').notNull().default(0),
  successCount: integer('success_count').notNull().default(0),
  failureCount: integer('failure_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 27. Workflow Executions
export const workflowExecutions = pgTable('workflow_executions', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  workflowId: integer('workflow_id').references(() => workflowDefinitions.id).notNull(),
  workflowName: text('workflow_name').notNull(),
  triggerContext: text('trigger_context').notNull(),
  status: text('status').notNull().default('completed'), // completed, awaiting_approval, failed
  stepDetails: text('step_details').notNull(),
  executedAt: timestamp('executed_at').defaultNow().notNull(),
});

// 28. Human-in-the-Loop Approvals Queue
export const approvals = pgTable('approvals', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  approvalType: text('approval_type').notNull(), // ai_reply, social_boost_campaign, workflow_action, outbound_voice_call
  title: text('title').notNull(),
  description: text('description').notNull(),
  targetEntityId: integer('target_entity_id'),
  status: text('status').notNull().default('pending'), // pending, approved, rejected
  requestedBy: text('requested_by').notNull(),
  reviewedBy: text('reviewed_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at'),
});

// 29. Voice AI Sessions & WhatsApp Calling Logs
export const voiceSessions = pgTable('voice_sessions', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  contactName: text('contact_name').notNull(),
  phoneNumber: text('phone_number').notNull(),
  voiceAgentName: text('voice_agent_name').notNull(),
  callType: text('call_type').notNull().default('sandbox_tts_simulation'), // whatsapp_business_calling, pstn_sip, sandbox_tts_simulation
  voicePersona: text('voice_persona').notNull().default('Kore'),
  language: text('language').notNull().default('English'),
  status: text('status').notNull().default('completed'), // completed, blocked_unconfigured_api, awaiting_human_approval, transferred
  durationSeconds: integer('duration_seconds').notNull().default(45),
  estimatedCostUsd: numeric('estimated_cost_usd').notNull().default('0.04'),
  consentRecorded: boolean('consent_recorded').notNull().default(true),
  outcomeSummary: text('outcome_summary').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 30. Call Transcripts
export const callTranscripts = pgTable('call_transcripts', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  voiceSessionId: integer('voice_session_id').references(() => voiceSessions.id).notNull(),
  scriptAndTranscript: text('script_and_transcript').notNull(),
  aiSummary: text('ai_summary').notNull(),
  extractedNextSteps: text('extracted_next_steps').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 31. In-App & Scheduled Notifications
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  type: text('type').notNull(), // assignment, escalation, follow_up, workflow_alert, billing_alert
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 32. Usage Records
export const usageRecords = pgTable('usage_records', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  metricType: text('metric_type').notNull(), // whatsapp_api_messages, social_dm_messages, gemini_ai_calls, voice_tts_generations, image_scans
  unitsUsed: integer('units_used').notNull().default(1),
  estimatedCostUsd: numeric('estimated_cost_usd').notNull().default('0.005'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 33. SaaS Subscription & Limits
export const subscriptionRecords = pgTable('subscription_records', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  planName: text('plan_name').notNull().default('Enterprise Omnichannel 100'),
  status: text('status').notNull().default('active_trial'),
  monthlyPriceUsd: integer('monthly_price_usd').notNull().default(299),
  maxWhatsappNumbers: integer('max_whatsapp_numbers').notNull().default(100),
  maxStaffSeats: integer('max_staff_seats').notNull().default(50),
  maxMonthlyConversations: integer('max_monthly_conversations').notNull().default(50000),
  maxVoiceMinutes: integer('max_voice_minutes').notNull().default(2000),
  renewalDate: text('renewal_date').notNull().default('2026-11-19'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 34. Security & Compliance Audit Logs
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  actorUid: text('actor_uid').notNull(),
  actorName: text('actor_name').notNull(),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id').notNull(),
  details: text('details').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
