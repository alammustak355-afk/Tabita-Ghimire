package com.connectai.crm.model

enum class NavDestination(val route: String, val label: String, val group: String) {
    OVERVIEW("overview", "Overview", "Primary"),
    LEAD_CENTER("leads", "Lead Center", "Primary"),
    UNIFIED_INBOX("inbox", "Unified Inbox", "Primary"),
    AI_COPILOT("copilot", "AI Copilot", "Primary"),
    WHATSAPP_CHANNELS("channels", "WhatsApp & Channels", "Primary"),
    CAMPAIGN_STUDIO("campaigns", "Campaign Studio", "Growth"),
    RECRUITMENT_PIPELINE("pipeline", "Recruitment Pipeline", "Recruitment"),
    FOLLOW_UP_TASKS("tasks", "Follow-up Tasks", "Recruitment"),
    TEAM_PERFORMANCE("team", "Team & Performance", "Governance"),
    ANALYTICS_REPORTS("analytics", "Analytics & Reports", "Governance"),
    INTEGRATIONS("integrations", "Integrations", "Governance"),
    SETTINGS_SECURITY("settings", "Settings & Security", "Governance")
}

val RECRUITMENT_STAGES = listOf(
    "New Lead",
    "Contacted",
    "Interested",
    "Documents Pending",
    "Qualified",
    "Employer Review",
    "Offer",
    "Visa Process",
    "Deployed",
    "Rejected",
    "On Hold"
)

data class TenantWorkspace(
    val id: Int,
    val name: String,
    val slug: String,
    val industry: String,
    val timezone: String,
    val plan: String,
    val emergencyPause: Boolean,
    val aiDisclosureEnabled: Boolean,
    val retentionDays: Int
)

data class UserProfile(
    val id: Int,
    val uid: String,
    val email: String,
    val name: String,
    val role: String
)

data class ContactRecord(
    val id: Int,
    val name: String,
    val phone: String,
    val email: String,
    val company: String,
    val sourceChannel: String,
    val consentStatus: String,
    val assignedEmployee: String,
    val requirementsSummary: String,
    val notes: String
)

data class LeadCandidateRecord(
    val id: Int,
    val title: String,
    val contactName: String,
    val phone: String,
    val email: String,
    val nationality: String,
    val preferredJob: String,
    val destinationCountry: String,
    val ownerName: String,
    val sourceChannel: String,
    val priority: String,
    val stage: String,
    val leadScore: Int,
    val extractedRequirements: String,
    val notes: String,
    val estimatedValueUsd: Double,
    val nextAction: String,
    val dueDate: String,
    val isArchived: Boolean = false
)

data class ConversationRecord(
    val id: Int,
    val customerName: String,
    val customerHandleOrPhone: String,
    val channelType: String,
    val status: String,
    val priority: String,
    val assignedEmployee: String,
    val handlingMode: String,
    val unreadCount: Int,
    val lastMessagePreview: String,
    val aiSummary: String,
    val suggestedReply: String
)

data class MessageRecord(
    val id: Int,
    val conversationId: Int,
    val senderType: String,
    val senderName: String,
    val direction: String,
    val content: String,
    val deliveryStatus: String
)

data class WhatsAppChannelRecord(
    val id: Int,
    val phoneNumber: String,
    val displayName: String,
    val phoneNumberId: String,
    val channelType: String,
    val department: String,
    val assignedStaffName: String,
    val aiStatus: String,
    val connectionStatus: String,
    val recentError: String?
)

data class SocialBoostCampaignRecord(
    val id: Int,
    val channelType: String,
    val campaignName: String,
    val objective: String,
    val adCopy: String,
    val dailyBudgetUsd: String,
    val durationDays: Int,
    val status: String,
    val impressions: Int,
    val clicks: Int,
    val conversationsStarted: Int,
    val qualifiedLeadsCount: Int
)

data class TaskItemRecord(
    val id: Int,
    val title: String,
    val taskType: String,
    val assignedEmployee: String,
    val contactName: String,
    val dueDate: String,
    val priority: String,
    val status: String
)

data class AppointmentItemRecord(
    val id: Int,
    val contactName: String,
    val title: String,
    val scheduledAt: String,
    val durationMinutes: Int,
    val status: String,
    val channelSource: String
)

data class AiAgentRecord(
    val id: Int,
    val name: String,
    val department: String,
    val assignedChannels: String,
    val communicationStyle: String,
    val confidenceThreshold: Int,
    val responseMode: String,
    val isActive: Boolean
)

data class IntegrationRecord(
    val id: Int,
    val providerKey: String,
    val displayName: String,
    val category: String,
    val status: String,
    val maskedCredentialHint: String,
    val requiredPermissions: String,
    val setupInstructions: String
)

data class InvitationRecord(
    val id: Int,
    val email: String,
    val role: String,
    val department: String,
    val status: String,
    val invitedBy: String
)

data class AuditLogRecord(
    val id: Int,
    val actorName: String,
    val action: String,
    val resourceType: String,
    val details: String
)

data class AiCopilotResult(
    val headline: String,
    val summary: String,
    val draftText: String,
    val bulletPoints: List<String>,
    val recommendedAction: String,
    val requiresHumanApproval: Boolean
)

data class CrmWorkspaceSnapshot(
    val isLiveBackend: Boolean,
    val connectionBanner: String,
    val user: UserProfile,
    val activeTenant: TenantWorkspace,
    val authorizedTenants: List<TenantWorkspace>,
    val contacts: List<ContactRecord>,
    val leads: List<LeadCandidateRecord>,
    val conversations: List<ConversationRecord>,
    val messages: List<MessageRecord>,
    val channels: List<WhatsAppChannelRecord>,
    val campaigns: List<SocialBoostCampaignRecord>,
    val tasks: List<TaskItemRecord>,
    val appointments: List<AppointmentItemRecord>,
    val aiAgents: List<AiAgentRecord>,
    val integrations: List<IntegrationRecord>,
    val invitations: List<InvitationRecord>,
    val auditLogs: List<AuditLogRecord>
)

object DemoFallbackDataset {
    fun buildSafeDemoSnapshot(reason: String): CrmWorkspaceSnapshot {
        val tenant = TenantWorkspace(
            id = 1,
            name = "Apex Global Recruitment & B2B (Demo Mode)",
            slug = "apex-global-demo",
            industry = "International Recruitment & B2B SaaS",
            timezone = "Europe/London",
            plan = "Enterprise Omnichannel",
            emergencyPause = false,
            aiDisclosureEnabled = true,
            retentionDays = 365
        )
        return CrmWorkspaceSnapshot(
            isLiveBackend = false,
            connectionBanner = "SAFE DEMO MODE ACTIVE — $reason",
            user = UserProfile(
                id = 1,
                uid = "demo-owner-uid-01",
                email = "alammustak355@gmail.com",
                name = "Workspace Owner",
                role = "company_owner"
            ),
            activeTenant = tenant,
            authorizedTenants = listOf(tenant),
            contacts = listOf(
                ContactRecord(
                    id = 101,
                    name = "Elena Rostova",
                    phone = "+44 7700 900511",
                    email = "elena.rostova@medstaff.eu",
                    company = "EU Healthcare Placement",
                    sourceChannel = "whatsapp",
                    consentStatus = "opted_in",
                    assignedEmployee = "Workspace Owner",
                    requirementsSummary = "Registered Nurse (ICU), IELTS 7.5, seeking UK NHS or UAE hospital sponsorship.",
                    notes = "[DEMO RECORD] Verified nursing diploma and passport."
                ),
                ContactRecord(
                    id = 102,
                    name = "Henrik Lindqvist",
                    phone = "+46 70 123 4567",
                    email = "h.lindqvist@nordicfreight.se",
                    company = "Nordic Freight AB",
                    sourceChannel = "instagram",
                    consentStatus = "opted_in",
                    assignedEmployee = "Sarah Jenkins",
                    requirementsSummary = "Seeking 15 HGV Class 1 drivers for Sweden-Germany corridor.",
                    notes = "[DEMO RECORD] Employer recruitment contract inquiry."
                )
            ),
            leads = listOf(
                LeadCandidateRecord(
                    id = 201,
                    title = "Elena Rostova — UK Senior ICU Nurse",
                    contactName = "Elena Rostova",
                    phone = "+44 7700 900511",
                    email = "elena.rostova@medstaff.eu",
                    nationality = "Poland",
                    preferredJob = "Senior ICU Registered Nurse",
                    destinationCountry = "United Kingdom",
                    ownerName = "Workspace Owner",
                    sourceChannel = "whatsapp",
                    priority = "urgent",
                    stage = "Qualified",
                    leadScore = 92,
                    extractedRequirements = "IELTS 7.5, 6 yrs ICU experience, NMC CBT passed.",
                    notes = "Ready for employer interview.",
                    estimatedValueUsd = 6500.0,
                    nextAction = "Confirm Royal London Hospital video interview",
                    dueDate = "2026-10-22"
                ),
                LeadCandidateRecord(
                    id = 202,
                    title = "Mateo Silva — Civil Site Engineer (UAE)",
                    contactName = "Mateo Silva",
                    phone = "+351 912 345 678",
                    email = "mateo.silva@lusobuild.pt",
                    nationality = "Portugal",
                    preferredJob = "Civil Site Engineer",
                    destinationCountry = "United Arab Emirates",
                    ownerName = "Sarah Jenkins",
                    sourceChannel = "facebook",
                    priority = "high",
                    stage = "Documents Pending",
                    leadScore = 81,
                    extractedRequirements = "8 years infrastructure & metro experience.",
                    notes = "Awaiting attested degree upload.",
                    estimatedValueUsd = 8200.0,
                    nextAction = "Collect attested engineering diploma",
                    dueDate = "2026-10-24"
                ),
                LeadCandidateRecord(
                    id = 203,
                    title = "Amina Al-Mansoor — Visa Process Completed",
                    contactName = "Amina Al-Mansoor",
                    phone = "+971 50 998 1122",
                    email = "amina@gulfhospitality.ae",
                    nationality = "Morocco",
                    preferredJob = "Hospitality Operations Manager",
                    destinationCountry = "Germany",
                    ownerName = "Workspace Owner",
                    sourceChannel = "tiktok",
                    priority = "high",
                    stage = "Deployed",
                    leadScore = 96,
                    extractedRequirements = "Trilingual (Arabic, French, English), 5-star hotel background.",
                    notes = "Candidate deployed successfully.",
                    estimatedValueUsd = 9400.0,
                    nextAction = "30-day post-deployment check-in",
                    dueDate = "2026-11-01"
                )
            ),
            conversations = listOf(
                ConversationRecord(
                    id = 301,
                    customerName = "Elena Rostova",
                    customerHandleOrPhone = "+44 7700 900511",
                    channelType = "whatsapp",
                    status = "open",
                    priority = "high",
                    assignedEmployee = "Workspace Owner",
                    handlingMode = "ai_auto",
                    unreadCount = 1,
                    lastMessagePreview = "Hello! I have uploaded my NMC CBT certificate and passport copy. When is the hospital interview?",
                    aiSummary = "Candidate Elena Rostova confirmed NMC CBT completion and requested interview slot.",
                    suggestedReply = "Thank you Elena! We have received your NMC CBT certificate. Would Thursday at 14:00 UTC work for your panel interview?"
                )
            ),
            messages = listOf(
                MessageRecord(
                    id = 401,
                    conversationId = 301,
                    senderType = "customer",
                    senderName = "Elena Rostova",
                    direction = "inbound",
                    content = "Hello! I have uploaded my NMC CBT certificate and passport copy. When is the hospital interview?",
                    deliveryStatus = "read"
                )
            ),
            channels = listOf(
                WhatsAppChannelRecord(
                    id = 501,
                    phoneNumber = "+44 20 7946 0192",
                    displayName = "ConnectAI UK Recruitment Desk",
                    phoneNumberId = "WABA_UK_01",
                    channelType = "whatsapp",
                    department = "International Recruitment",
                    assignedStaffName = "Workspace Owner",
                    aiStatus = "auto_active",
                    connectionStatus = "webhook_ready",
                    recentError = "Meta Access Token not configured on server; Webhook Simulator active."
                )
            ),
            campaigns = listOf(
                SocialBoostCampaignRecord(
                    id = 601,
                    channelType = "instagram",
                    campaignName = "EU & UK Healthcare Nurses Fast-Track 2026",
                    objective = "Click-to-WhatsApp Candidate Intake",
                    adCopy = "Registered Nurses: Fast-track UK & EU hospital sponsorship with full visa support.",
                    dailyBudgetUsd = "65",
                    durationDays = 14,
                    status = "active_sandbox",
                    impressions = 18420,
                    clicks = 940,
                    conversationsStarted = 142,
                    qualifiedLeadsCount = 38
                )
            ),
            tasks = listOf(
                TaskItemRecord(
                    id = 701,
                    title = "Verify Elena Rostova NMC CBT & Passport Copy",
                    taskType = "document_check",
                    assignedEmployee = "Workspace Owner",
                    contactName = "Elena Rostova",
                    dueDate = "2026-10-18",
                    priority = "urgent",
                    status = "pending"
                ),
                TaskItemRecord(
                    id = 702,
                    title = "Send Employer Shortlist to Nordic Freight AB",
                    taskType = "follow_up",
                    assignedEmployee = "Sarah Jenkins",
                    contactName = "Henrik Lindqvist",
                    dueDate = "2026-10-25",
                    priority = "high",
                    status = "pending"
                )
            ),
            appointments = listOf(
                AppointmentItemRecord(
                    id = 801,
                    contactName = "Elena Rostova",
                    title = "UK NHS Trust Clinical Panel Interview",
                    scheduledAt = "2026-10-23 14:00 UTC",
                    durationMinutes = 45,
                    status = "confirmed",
                    channelSource = "whatsapp"
                )
            ),
            aiAgents = listOf(
                AiAgentRecord(
                    id = 901,
                    name = "Aria Recruitment & Sales Concierge",
                    department = "Recruitment & B2B Intake",
                    assignedChannels = "WhatsApp, Instagram, Facebook, TikTok",
                    communicationStyle = "Executive, Warm & Grounded",
                    confidenceThreshold = 82,
                    responseMode = "auto",
                    isActive = true
                )
            ),
            integrations = listOf(
                IntegrationRecord(
                    id = 1001,
                    providerKey = "meta_whatsapp_cloud",
                    displayName = "Meta WhatsApp Business Cloud API",
                    category = "messaging",
                    status = "webhook_ready",
                    maskedCredentialHint = "META_WHATSAPP_ACCESS_TOKEN required for live dispatch",
                    requiredPermissions = "whatsapp_business_messaging, whatsapp_business_management",
                    setupInstructions = "Add META_WHATSAPP_ACCESS_TOKEN and Phone Number ID in server environment."
                ),
                IntegrationRecord(
                    id = 1002,
                    providerKey = "google_gemini_ai",
                    displayName = "Google Gemini AI (Server-Side Grounded Copilot)",
                    category = "ai",
                    status = "connected",
                    maskedCredentialHint = "Server-Side GEMINI_API_KEY",
                    requiredPermissions = "Server-side proxy only (Zero client key exposure)",
                    setupInstructions = "Configured on Express backend via /api/ai/copilot."
                )
            ),
            invitations = listOf(
                InvitationRecord(
                    id = 1101,
                    email = "s.jenkins@connectai-crm.io",
                    role = "manager",
                    department = "Recruitment Operations",
                    status = "accepted",
                    invitedBy = "Workspace Owner"
                )
            ),
            auditLogs = listOf(
                AuditLogRecord(
                    id = 1201,
                    actorName = "Workspace Owner",
                    action = "ANDROID_CLIENT_INITIALIZED",
                    resourceType = "security",
                    details = "Initialized ConnectAI CRM Android client with tenant isolation."
                )
            )
        )
    }
}
