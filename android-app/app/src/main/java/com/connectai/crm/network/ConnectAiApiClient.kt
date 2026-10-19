package com.connectai.crm.network

import com.connectai.crm.data.SessionVault
import com.connectai.crm.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class ConnectAiApiClient(private val sessionVault: SessionVault) {

    private fun openAuthenticatedConnection(path: String, method: String): HttpURLConnection {
        val baseUrl = sessionVault.backendBaseUrl.removeSuffix("/")
        require(baseUrl.startsWith("https://")) {
            "Security Violation: Production backend URL must use HTTPS."
        }
        val url = URL("$baseUrl$path")
        return (url.openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 12000
            readTimeout = 18000
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Content-Type", "application/json; charset=utf-8")
            setRequestProperty("Authorization", "Bearer ${sessionVault.bearerToken}")
            if (sessionVault.activeTenantSlug.isNotBlank()) {
                setRequestProperty("x-tenant-slug", sessionVault.activeTenantSlug)
            }
            if (method == "POST" || method == "PUT" || method == "PATCH") {
                doOutput = true
            }
        }
    }

    private suspend fun executeJsonRequest(
        path: String,
        method: String = "GET",
        body: JSONObject? = null
    ): JSONObject = withContext(Dispatchers.IO) {
        val conn = openAuthenticatedConnection(path, method)
        try {
            if (body != null) {
                OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { writer ->
                    writer.write(body.toString())
                    writer.flush()
                }
            }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val text = stream?.let {
                BufferedReader(InputStreamReader(it, Charsets.UTF_8)).use { r -> r.readText() }
            } ?: "{}"

            if (code !in 200..299) {
                val errMsg = runCatching { JSONObject(text).optString("error") }
                    .getOrDefault("")
                    .ifBlank { "HTTP $code from $path" }
                throw IllegalStateException(errMsg)
            }
            if (text.trim().startsWith("[")) {
                JSONObject().put("items", JSONArray(text))
            } else {
                JSONObject(text)
            }
        } finally {
            conn.disconnect()
        }
    }

    suspend fun fetchBootstrapWorkspace(): CrmWorkspaceSnapshot {
        return try {
            val root = executeJsonRequest("/api/bootstrap", "GET")
            parseBootstrapJson(root)
        } catch (e: Exception) {
            DemoFallbackDataset.buildSafeDemoSnapshot(
                reason = e.message ?: "Backend unreachable; displaying labeled Demo Workspace."
            )
        }
    }

    suspend fun createLeadOrCandidate(
        title: String,
        contactName: String,
        phone: String,
        email: String,
        nationality: String,
        preferredJob: String,
        destinationCountry: String,
        sourceChannel: String,
        stage: String,
        estimatedValueUsd: String,
        notes: String
    ): JSONObject {
        require(contactName.isNotBlank()) { "Candidate or contact name is required." }
        val payload = JSONObject().apply {
            put("title", title.ifBlank { "$contactName — ${preferredJob.ifBlank { "Opportunity" }}" })
            put("contactName", contactName.trim())
            put("phone", phone.trim())
            put("email", email.trim())
            put("nationality", nationality.trim())
            put("preferredJob", preferredJob.trim())
            put("destinationCountry", destinationCountry.trim())
            put("sourceChannel", sourceChannel)
            put("stage", stage)
            put("estimatedValueUsd", estimatedValueUsd.ifBlank { "0" })
            put("notes", notes.trim())
            put("extractedRequirements", notes.trim())
        }
        return executeJsonRequest("/api/leads", "POST", payload)
    }

    suspend fun updateLeadStage(leadId: Int, newStage: String): JSONObject {
        val payload = JSONObject().put("stage", newStage)
        return executeJsonRequest("/api/leads/$leadId/stage", "PATCH", payload)
    }

    suspend fun archiveLead(leadId: Int, archive: Boolean): JSONObject {
        val payload = JSONObject().put("isArchived", archive)
        return executeJsonRequest("/api/leads/$leadId/archive", "PATCH", payload)
    }

    suspend fun deleteLead(leadId: Int): JSONObject {
        return executeJsonRequest("/api/leads/$leadId", "DELETE")
    }

    suspend fun createContact(
        name: String,
        phone: String,
        email: String,
        company: String,
        sourceChannel: String,
        requirementsSummary: String
    ): JSONObject {
        require(name.isNotBlank() && phone.isNotBlank()) { "Contact name and phone/handle are required." }
        val payload = JSONObject().apply {
            put("name", name.trim())
            put("phone", phone.trim())
            put("email", email.trim())
            put("company", company.trim())
            put("sourceChannel", sourceChannel)
            put("requirementsSummary", requirementsSummary.trim())
        }
        return executeJsonRequest("/api/contacts", "POST", payload)
    }

    suspend fun mergeDuplicateContacts(primaryId: Int, duplicateId: Int): JSONObject {
        val payload = JSONObject().apply {
            put("primaryContactId", primaryId)
            put("duplicateContactId", duplicateId)
        }
        return executeJsonRequest("/api/contacts/merge", "POST", payload)
    }

    suspend fun sendInboxMessage(
        conversationId: Int,
        content: String,
        direction: String = "outbound"
    ): JSONObject {
        require(content.isNotBlank()) { "Message content cannot be empty." }
        val payload = JSONObject().apply {
            put("content", content.trim())
            put("direction", direction)
            put("contentType", "text")
        }
        return executeJsonRequest("/api/conversations/$conversationId/send", "POST", payload)
    }

    suspend fun generateConversationAiDraft(conversationId: Int): JSONObject {
        return executeJsonRequest("/api/conversations/$conversationId/ai-draft", "POST", JSONObject())
    }

    suspend fun runAiCopilot(actionType: String, customInput: String): AiCopilotResult {
        val payload = JSONObject().apply {
            put("actionType", actionType)
            put("customInput", customInput)
        }
        val res = executeJsonRequest("/api/ai/copilot", "POST", payload)
        val r = res.optJSONObject("result") ?: JSONObject()
        val bulletsJson = r.optJSONArray("bulletPoints") ?: JSONArray()
        val bullets = mutableListOf<String>()
        for (i in 0 until bulletsJson.length()) {
            bullets.add(bulletsJson.optString(i))
        }
        return AiCopilotResult(
            headline = r.optString("headline", "AI Copilot Analysis Complete"),
            summary = r.optString("summary", ""),
            draftText = r.optString("draftText", ""),
            bulletPoints = bullets,
            recommendedAction = r.optString("recommendedAction", ""),
            requiresHumanApproval = r.optBoolean("requiresHumanApproval", true)
        )
    }

    suspend fun connectChannel(
        phoneNumber: String,
        displayName: String,
        channelType: String,
        phoneNumberId: String
    ): JSONObject {
        require(phoneNumber.isNotBlank() && displayName.isNotBlank()) {
            "Phone number/handle and display name are required."
        }
        val payload = JSONObject().apply {
            put("phoneNumber", phoneNumber.trim())
            put("displayName", displayName.trim())
            put("channelType", channelType)
            put("phoneNumberId", phoneNumberId.trim())
        }
        return executeJsonRequest("/api/channels/connect", "POST", payload)
    }

    suspend fun simulateInboundWebhook(
        customerName: String,
        customerPhone: String,
        channelType: String,
        messageText: String
    ): JSONObject {
        val payload = JSONObject().apply {
            put("customerName", customerName.trim())
            put("customerPhone", customerPhone.trim())
            put("channelType", channelType)
            put("messageText", messageText.trim())
        }
        return executeJsonRequest("/api/channels/simulate-inbound", "POST", payload)
    }

    suspend fun createCampaignBoost(
        channelType: String,
        campaignName: String,
        objective: String,
        adCopy: String,
        dailyBudgetUsd: String
    ): JSONObject {
        require(campaignName.isNotBlank() && adCopy.isNotBlank()) {
            "Campaign name and ad copy are required."
        }
        val payload = JSONObject().apply {
            put("channelType", channelType)
            put("campaignName", campaignName.trim())
            put("objective", objective.trim())
            put("adCopy", adCopy.trim())
            put("dailyBudgetUsd", dailyBudgetUsd.ifBlank { "50" })
            put("durationDays", 7)
        }
        return executeJsonRequest("/api/social-boosts", "POST", payload)
    }

    suspend fun createTask(
        title: String,
        contactName: String,
        dueDate: String,
        priority: String
    ): JSONObject {
        require(title.isNotBlank()) { "Task title is required." }
        val payload = JSONObject().apply {
            put("title", title.trim())
            put("contactName", contactName.trim())
            put("dueDate", dueDate.ifBlank { "2026-10-28" })
            put("priority", priority)
        }
        return executeJsonRequest("/api/tasks", "POST", payload)
    }

    suspend fun toggleTask(taskId: Int): JSONObject {
        return executeJsonRequest("/api/tasks/$taskId/toggle", "PATCH", JSONObject())
    }

    suspend fun createAppointment(
        contactName: String,
        title: String,
        scheduledAt: String,
        channelSource: String
    ): JSONObject {
        require(contactName.isNotBlank() && title.isNotBlank()) {
            "Candidate name and interview title are required."
        }
        val payload = JSONObject().apply {
            put("contactName", contactName.trim())
            put("title", title.trim())
            put("scheduledAt", scheduledAt.ifBlank { "2026-10-26 14:00 UTC" })
            put("channelSource", channelSource)
        }
        return executeJsonRequest("/api/appointments", "POST", payload)
    }

    suspend fun inviteStaffMember(email: String, role: String, department: String): JSONObject {
        require(email.contains("@")) { "A valid staff email address is required." }
        val payload = JSONObject().apply {
            put("email", email.trim())
            put("role", role)
            put("department", department)
        }
        return executeJsonRequest("/api/invitations", "POST", payload)
    }

    suspend fun updateSessionRbacRole(role: String, allowExport: Boolean): JSONObject {
        val payload = JSONObject().apply {
            put("role", role)
            put("allowExport", allowExport)
        }
        return executeJsonRequest("/api/membership/rbac", "PATCH", payload)
    }

    suspend fun updateTenantSettings(
        name: String,
        timezone: String,
        emergencyPause: Boolean,
        aiDisclosureEnabled: Boolean
    ): JSONObject {
        val payload = JSONObject().apply {
            put("name", name.trim())
            put("timezone", timezone.trim())
            put("emergencyPause", emergencyPause)
            put("aiDisclosureEnabled", aiDisclosureEnabled)
        }
        return executeJsonRequest("/api/tenants/settings", "POST", payload)
    }

    private fun parseBootstrapJson(root: JSONObject): CrmWorkspaceSnapshot {
        val userObj = root.optJSONObject("user") ?: JSONObject()
        val membershipObj = root.optJSONObject("membership") ?: JSONObject()
        val tenantObj = root.optJSONObject("activeTenant") ?: JSONObject()

        val activeTenant = TenantWorkspace(
            id = tenantObj.optInt("id", 1),
            name = tenantObj.optString("name", "ConnectAI Workspace"),
            slug = tenantObj.optString("slug", "default"),
            industry = tenantObj.optString("industry", "International Recruitment & B2B"),
            timezone = tenantObj.optString("timezone", "UTC"),
            plan = tenantObj.optString("plan", "Enterprise"),
            emergencyPause = tenantObj.optBoolean("emergencyPause", false),
            aiDisclosureEnabled = tenantObj.optBoolean("aiDisclosureEnabled", true),
            retentionDays = tenantObj.optInt("retentionDays", 365)
        )

        val tenantsArr = root.optJSONArray("authorizedTenants") ?: JSONArray()
        val authorizedTenants = mutableListOf<TenantWorkspace>()
        for (i in 0 until tenantsArr.length()) {
            val t = tenantsArr.optJSONObject(i) ?: continue
            authorizedTenants.add(
                TenantWorkspace(
                    id = t.optInt("id"),
                    name = t.optString("name"),
                    slug = t.optString("slug"),
                    industry = t.optString("industry"),
                    timezone = t.optString("timezone", "UTC"),
                    plan = t.optString("plan", "Pro"),
                    emergencyPause = t.optBoolean("emergencyPause", false),
                    aiDisclosureEnabled = t.optBoolean("aiDisclosureEnabled", true),
                    retentionDays = t.optInt("retentionDays", 365)
                )
            )
        }

        val contactsArr = root.optJSONArray("contacts") ?: JSONArray()
        val contacts = mutableListOf<ContactRecord>()
        for (i in 0 until contactsArr.length()) {
            val c = contactsArr.optJSONObject(i) ?: continue
            contacts.add(
                ContactRecord(
                    id = c.optInt("id"),
                    name = c.optString("name"),
                    phone = c.optString("phone"),
                    email = c.optString("email", ""),
                    company = c.optString("company", ""),
                    sourceChannel = c.optString("sourceChannel", "whatsapp"),
                    consentStatus = c.optString("consentStatus", "opted_in"),
                    assignedEmployee = c.optString("assignedEmployee", ""),
                    requirementsSummary = c.optString("requirementsSummary", ""),
                    notes = c.optString("notes", "")
                )
            )
        }

        val leadsArr = root.optJSONArray("leads") ?: JSONArray()
        val leads = mutableListOf<LeadCandidateRecord>()
        for (i in 0 until leadsArr.length()) {
            val l = leadsArr.optJSONObject(i) ?: continue
            leads.add(
                LeadCandidateRecord(
                    id = l.optInt("id"),
                    title = l.optString("title"),
                    contactName = l.optString("contactName"),
                    phone = l.optString("phone", ""),
                    email = l.optString("email", ""),
                    nationality = l.optString("nationality", ""),
                    preferredJob = l.optString("preferredJob", ""),
                    destinationCountry = l.optString("destinationCountry", ""),
                    ownerName = l.optString("ownerName", ""),
                    sourceChannel = l.optString("sourceChannel", "whatsapp"),
                    priority = l.optString("priority", "high"),
                    stage = l.optString("stage", "New Lead"),
                    leadScore = l.optInt("leadScore", 75),
                    extractedRequirements = l.optString("extractedRequirements", ""),
                    notes = l.optString("notes", ""),
                    estimatedValueUsd = l.optString("estimatedValueUsd", "0").toDoubleOrNull() ?: 0.0,
                    nextAction = l.optString("nextAction", ""),
                    dueDate = l.optString("dueDate", ""),
                    isArchived = l.optBoolean("isArchived", false)
                )
            )
        }

        val convsArr = root.optJSONArray("conversations") ?: JSONArray()
        val conversations = mutableListOf<ConversationRecord>()
        for (i in 0 until convsArr.length()) {
            val c = convsArr.optJSONObject(i) ?: continue
            conversations.add(
                ConversationRecord(
                    id = c.optInt("id"),
                    customerName = c.optString("customerName"),
                    customerHandleOrPhone = c.optString("customerHandleOrPhone"),
                    channelType = c.optString("channelType", "whatsapp"),
                    status = c.optString("status", "open"),
                    priority = c.optString("priority", "normal"),
                    assignedEmployee = c.optString("assignedEmployee", ""),
                    handlingMode = c.optString("handlingMode", "ai_auto"),
                    unreadCount = c.optInt("unreadCount", 0),
                    lastMessagePreview = c.optString("lastMessagePreview", ""),
                    aiSummary = c.optString("aiSummary", ""),
                    suggestedReply = c.optString("suggestedReply", "")
                )
            )
        }

        val msgsArr = root.optJSONArray("messages") ?: JSONArray()
        val messages = mutableListOf<MessageRecord>()
        for (i in 0 until msgsArr.length()) {
            val m = msgsArr.optJSONObject(i) ?: continue
            messages.add(
                MessageRecord(
                    id = m.optInt("id"),
                    conversationId = m.optInt("conversationId"),
                    senderType = m.optString("senderType"),
                    senderName = m.optString("senderName"),
                    direction = m.optString("direction"),
                    content = m.optString("content"),
                    deliveryStatus = m.optString("deliveryStatus")
                )
            )
        }

        val phonesArr = root.optJSONArray("phoneNumbers") ?: JSONArray()
        val channels = mutableListOf<WhatsAppChannelRecord>()
        for (i in 0 until phonesArr.length()) {
            val p = phonesArr.optJSONObject(i) ?: continue
            channels.add(
                WhatsAppChannelRecord(
                    id = p.optInt("id"),
                    phoneNumber = p.optString("phoneNumber"),
                    displayName = p.optString("displayName"),
                    phoneNumberId = p.optString("phoneNumberId"),
                    channelType = p.optString("channelType", "whatsapp"),
                    department = p.optString("department", "Sales"),
                    assignedStaffName = p.optString("assignedStaffName", ""),
                    aiStatus = p.optString("aiStatus", "auto_active"),
                    connectionStatus = p.optString("connectionStatus", "webhook_ready"),
                    recentError = p.optString("recentError", "").ifBlank { null }
                )
            )
        }

        val boostsArr = root.optJSONArray("socialBoosts") ?: JSONArray()
        val campaigns = mutableListOf<SocialBoostCampaignRecord>()
        for (i in 0 until boostsArr.length()) {
            val b = boostsArr.optJSONObject(i) ?: continue
            campaigns.add(
                SocialBoostCampaignRecord(
                    id = b.optInt("id"),
                    channelType = b.optString("channelType", "instagram"),
                    campaignName = b.optString("campaignName"),
                    objective = b.optString("objective"),
                    adCopy = b.optString("adCopy"),
                    dailyBudgetUsd = b.optString("dailyBudgetUsd", "50"),
                    durationDays = b.optInt("durationDays", 7),
                    status = b.optString("status", "pending_approval"),
                    impressions = b.optInt("impressions", 0),
                    clicks = b.optInt("clicks", 0),
                    conversationsStarted = b.optInt("conversationsStarted", 0),
                    qualifiedLeadsCount = b.optInt("qualifiedLeadsCount", 0)
                )
            )
        }

        val tasksArr = root.optJSONArray("tasks") ?: JSONArray()
        val tasks = mutableListOf<TaskItemRecord>()
        for (i in 0 until tasksArr.length()) {
            val t = tasksArr.optJSONObject(i) ?: continue
            tasks.add(
                TaskItemRecord(
                    id = t.optInt("id"),
                    title = t.optString("title"),
                    taskType = t.optString("taskType", "follow_up"),
                    assignedEmployee = t.optString("assignedEmployee", ""),
                    contactName = t.optString("contactName", ""),
                    dueDate = t.optString("dueDate", ""),
                    priority = t.optString("priority", "normal"),
                    status = t.optString("status", "pending")
                )
            )
        }

        val apptsArr = root.optJSONArray("appointments") ?: JSONArray()
        val appointments = mutableListOf<AppointmentItemRecord>()
        for (i in 0 until apptsArr.length()) {
            val a = apptsArr.optJSONObject(i) ?: continue
            appointments.add(
                AppointmentItemRecord(
                    id = a.optInt("id"),
                    contactName = a.optString("contactName"),
                    title = a.optString("title"),
                    scheduledAt = a.optString("scheduledAt"),
                    durationMinutes = a.optInt("durationMinutes", 30),
                    status = a.optString("status", "confirmed"),
                    channelSource = a.optString("channelSource", "whatsapp")
                )
            )
        }

        val agentsArr = root.optJSONArray("aiAgents") ?: JSONArray()
        val aiAgents = mutableListOf<AiAgentRecord>()
        for (i in 0 until agentsArr.length()) {
            val ag = agentsArr.optJSONObject(i) ?: continue
            aiAgents.add(
                AiAgentRecord(
                    id = ag.optInt("id"),
                    name = ag.optString("name"),
                    department = ag.optString("department"),
                    assignedChannels = ag.optString("assignedChannels"),
                    communicationStyle = ag.optString("communicationStyle"),
                    confidenceThreshold = ag.optInt("confidenceThreshold", 80),
                    responseMode = ag.optString("responseMode", "auto"),
                    isActive = ag.optBoolean("isActive", true)
                )
            )
        }

        val intsArr = root.optJSONArray("integrations") ?: JSONArray()
        val integrations = mutableListOf<IntegrationRecord>()
        for (i in 0 until intsArr.length()) {
            val ig = intsArr.optJSONObject(i) ?: continue
            integrations.add(
                IntegrationRecord(
                    id = ig.optInt("id"),
                    providerKey = ig.optString("providerKey"),
                    displayName = ig.optString("displayName"),
                    category = ig.optString("category"),
                    status = ig.optString("status"),
                    maskedCredentialHint = ig.optString("maskedCredentialHint", ""),
                    requiredPermissions = ig.optString("requiredPermissions", ""),
                    setupInstructions = ig.optString("setupInstructions", "")
                )
            )
        }

        val invsArr = root.optJSONArray("invitations") ?: JSONArray()
        val invitations = mutableListOf<InvitationRecord>()
        for (i in 0 until invsArr.length()) {
            val iv = invsArr.optJSONObject(i) ?: continue
            invitations.add(
                InvitationRecord(
                    id = iv.optInt("id"),
                    email = iv.optString("email"),
                    role = iv.optString("role"),
                    department = iv.optString("department"),
                    status = iv.optString("status"),
                    invitedBy = iv.optString("invitedBy")
                )
            )
        }

        val logsArr = root.optJSONArray("auditLogs") ?: JSONArray()
        val auditLogs = mutableListOf<AuditLogRecord>()
        for (i in 0 until minOf(logsArr.length(), 40)) {
            val lg = logsArr.optJSONObject(i) ?: continue
            auditLogs.add(
                AuditLogRecord(
                    id = lg.optInt("id"),
                    actorName = lg.optString("actorName"),
                    action = lg.optString("action"),
                    resourceType = lg.optString("resourceType"),
                    details = lg.optString("details")
                )
            )
        }

        return CrmWorkspaceSnapshot(
            isLiveBackend = true,
            connectionBanner = "CONNECTED TO LIVE CLOUD SQL POSTGRESQL (${activeTenant.name})",
            user = UserProfile(
                id = userObj.optInt("id", 1),
                uid = userObj.optString("uid", ""),
                email = userObj.optString("email", ""),
                name = userObj.optString("name", "Workspace Owner"),
                role = membershipObj.optString("role", "company_owner")
            ),
            activeTenant = activeTenant,
            authorizedTenants = authorizedTenants.ifEmpty { listOf(activeTenant) },
            contacts = contacts,
            leads = leads,
            conversations = conversations,
            messages = messages,
            channels = channels,
            campaigns = campaigns,
            tasks = tasks,
            appointments = appointments,
            aiAgents = aiAgents,
            integrations = integrations,
            invitations = invitations,
            auditLogs = auditLogs
        )
    }
}
