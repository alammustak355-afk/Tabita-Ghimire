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
    SETTINGS_SECURITY("settings", "Settings & Security", "Governance"),
    HELP_USER_GUIDE("guide", "Help & User Guide", "Governance")
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

data class ApiDiagnosticInfo(
    val endpointUrl: String = "",
    val httpStatusCode: Int = 0,
    val contentType: String = "",
    val latencyMs: Long = 0L,
    val errorSummary: String = "",
    val remediationHint: String = "",
    val responsePreview: String = ""
)


data class CrmWorkspaceSnapshot(
    val isLiveBackend: Boolean,
    val connectionBanner: String,
    val apiDiagnostic: ApiDiagnosticInfo = ApiDiagnosticInfo(),
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
    fun buildSafeDemoSnapshot(
        reason: String,
        diagnostic: ApiDiagnosticInfo = ApiDiagnosticInfo(errorSummary = reason),
        companyName: String = "ConnectAI CRM Workspace",
        userName: String = "Workspace Owner"
    ): CrmWorkspaceSnapshot {
        val tenant = TenantWorkspace(
            id = 1,
            name = companyName.ifBlank { "ConnectAI CRM Workspace" },
            slug = "clean-workspace",
            industry = "Recruitment & Omnichannel CRM",
            timezone = "UTC",
            plan = "Starter Workspace",
            emergencyPause = false,
            aiDisclosureEnabled = true,
            retentionDays = 365
        )
        return CrmWorkspaceSnapshot(
            isLiveBackend = false,
            connectionBanner = "LIVE API DISCONNECTED — $reason",
            apiDiagnostic = diagnostic,
            user = UserProfile(
                id = 1,
                uid = "local-owner-uid-01",
                email = "owner@connectai-crm.io",
                name = userName.ifBlank { "Workspace Owner" },
                role = "company_owner"
            ),
            activeTenant = tenant,
            authorizedTenants = listOf(tenant),
            contacts = emptyList(),
            leads = emptyList(),
            conversations = emptyList(),
            messages = emptyList(),
            channels = emptyList(),
            campaigns = emptyList(),
            tasks = emptyList(),
            appointments = emptyList(),
            aiAgents = emptyList(),
            integrations = listOf(
                IntegrationRecord(
                    id = 1001,
                    providerKey = "meta_whatsapp_cloud",
                    displayName = "Meta WhatsApp Business Cloud API",
                    category = "messaging",
                    status = "not_configured",
                    maskedCredentialHint = "Not Configured — Connect WABA Token & Phone Number ID",
                    requiredPermissions = "whatsapp_business_messaging, whatsapp_business_management",
                    setupInstructions = "Configure your public Cloud Run backend URL and Meta WhatsApp Access Token when ready."
                ),
                IntegrationRecord(
                    id = 1002,
                    providerKey = "google_gemini_ai",
                    displayName = "Google Gemini AI (Server-Side Grounded Copilot)",
                    category = "ai",
                    status = "requires_live_backend",
                    maskedCredentialHint = "Server-Side GEMINI_API_KEY",
                    requiredPermissions = "Server-side proxy only (Zero client key exposure)",
                    setupInstructions = "Deploy Express backend to public Cloud Run to enable live /api/ai/copilot calls."
                )
            ),
            invitations = emptyList(),
            auditLogs = emptyList()
        )
    }
}

