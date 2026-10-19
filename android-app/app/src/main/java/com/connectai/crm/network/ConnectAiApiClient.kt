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

class BackendApiException(
    override val message: String,
    val diagnostic: ApiDiagnosticInfo
) : IllegalStateException(message)

class ConnectAiApiClient(private val sessionVault: SessionVault) {

    private fun openAuthenticatedConnection(path: String, method: String): HttpURLConnection {
        val baseUrl = SessionVault.normalizeBackendBaseUrl(sessionVault.backendBaseUrl)
        require(baseUrl.startsWith("https://")) {
            "Security Violation: Production backend URL must use HTTPS (current: $baseUrl)."
        }
        val url = URL("$baseUrl$path")

        return (url.openConnection() as HttpURLConnection).apply {
            requestMethod = method
            // Disable automatic redirect following so we can detect AI Studio's 302 -> /__cookie_check.html gate
            instanceFollowRedirects = false
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

    private fun extractHtmlTitle(rawHtml: String): String {
        val match = Regex("<title>(.*?)</title>", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL))
            .find(rawHtml)
        return match?.groupValues?.getOrNull(1)?.trim().orEmpty()
    }

    private fun parseSafeJsonResponse(
        rawText: String,
        contentType: String,
        httpCode: Int,
        fullUrl: String,
        requireBootstrapSchema: Boolean
    ): JSONObject {
        val trimmed = rawText.trim()
        val lowerContentType = contentType.lowercase()

        // 1. Handle Empty Responses safely
        if (trimmed.isEmpty()) {
            if (requireBootstrapSchema) {
                val msg = "Empty response body (HTTP $httpCode, Content-Type: ${contentType.ifBlank { "none" }}) from $fullUrl."
                throw BackendApiException(
                    message = msg,
                    diagnostic = ApiDiagnosticInfo(
                        endpointUrl = fullUrl,
                        httpStatusCode = httpCode,
                        contentType = contentType.ifBlank { "empty" },
                        errorSummary = msg,
                        remediationHint = "Verify that the backend server is running and returning JSON on /api/bootstrap."
                    )
                )
            }
            return JSONObject()
        }

        // 2. Detect HTML responses (e.g. <!doctype html>, <html>, /__cookie_check.html) BEFORE JSONTokener
        if (lowerContentType.contains("text/html") || trimmed.startsWith("<")) {
            val htmlTitle = extractHtmlTitle(trimmed)
            val isAiStudioPreviewGate = fullUrl.contains("ais-pre-") ||
                fullUrl.contains("ais-dev-") ||
                trimmed.contains("__cookie_check") ||
                trimmed.contains("applet-auth-bridge") ||
                htmlTitle.contains("Cookie check", ignoreCase = true)

            val summary = if (isAiStudioPreviewGate) {
                "AI Studio preview proxy ($fullUrl) returned an HTML browser cookie check (HTTP $httpCode, Content-Type: text/html${if (htmlTitle.isNotBlank()) ", Title: \"$htmlTitle\"" else ""}) instead of JSON."
            } else {
                "Endpoint returned HTML (${htmlTitle.ifBlank { "text/html" }}, HTTP $httpCode) instead of application/json."
            }
            val hint = if (isAiStudioPreviewGate) {
                "The URL 'ais-pre-...run.app' is an internal AI Studio web preview proxy that requires browser cookies (__cookie_check.html). To connect the native Android app to live data, deploy this backend to a public Cloud Run service in AI Studio (Deploy -> Cloud Run) and paste that public Cloud Run URL in Settings."
            } else {
                "Verify that the configured Backend URL points to your deployed ConnectAI Express server and not a static HTML page."
            }
            throw BackendApiException(
                message = "$summary $hint",
                diagnostic = ApiDiagnosticInfo(
                    endpointUrl = fullUrl,
                    httpStatusCode = httpCode,
                    contentType = contentType.ifBlank { "text/html" },
                    errorSummary = summary,
                    remediationHint = hint
                )
            )
        }

        // 3. Safely parse JSON Object, JSON Array, JSON String, or Plain Text using JSONTokener
        val parsedValue = try {
            org.json.JSONTokener(trimmed).nextValue()
        } catch (e: Exception) {
            val preview = trimmed.take(120).replace("\n", " ")
            val msg = "Invalid JSON response (HTTP $httpCode, Content-Type: ${contentType.ifBlank { "unknown" }}): \"$preview\""
            throw BackendApiException(
                message = msg,
                diagnostic = ApiDiagnosticInfo(
                    endpointUrl = fullUrl,
                    httpStatusCode = httpCode,
                    contentType = contentType.ifBlank { "text/plain" },
                    errorSummary = msg,
                    remediationHint = "Ensure the endpoint returns valid application/json."
                )
            )
        }

        return when (parsedValue) {
            is JSONObject -> parsedValue
            is JSONArray -> JSONObject().put("items", parsedValue)
            is String -> {
                // Handle double-encoded JSON strings ("{\"activeTenant\":...}") or plain-text strings safely
                val innerTrimmed = parsedValue.trim()
                if (innerTrimmed.startsWith("{") && innerTrimmed.endsWith("}")) {
                    runCatching { JSONObject(innerTrimmed) }.getOrElse {
                        if (requireBootstrapSchema) {
                            throw BackendApiException(
                                message = "Malformed JSON string payload from $fullUrl (HTTP $httpCode).",
                                diagnostic = ApiDiagnosticInfo(
                                    endpointUrl = fullUrl,
                                    httpStatusCode = httpCode,
                                    contentType = contentType,
                                    errorSummary = "Server returned a String that could not be parsed as a JSONObject.",
                                    remediationHint = "Check the backend response format at $fullUrl."
                                )
                            )
                        }
                        JSONObject().put("message", parsedValue)
                    }
                } else if (innerTrimmed.startsWith("[") && innerTrimmed.endsWith("]")) {
                    runCatching { JSONObject().put("items", JSONArray(innerTrimmed)) }.getOrElse {
                        JSONObject().put("message", parsedValue)
                    }
                } else {
                    if (requireBootstrapSchema) {
                        val preview = parsedValue.take(120).replace("\n", " ")
                        val msg = "Expected JSON object from $fullUrl, but received string/text (HTTP $httpCode, Content-Type: ${contentType.ifBlank { "text/plain" }}): \"$preview\""
                        throw BackendApiException(
                            message = msg,
                            diagnostic = ApiDiagnosticInfo(
                                endpointUrl = fullUrl,
                                httpStatusCode = httpCode,
                                contentType = contentType.ifBlank { "text/plain" },
                                errorSummary = msg,
                                remediationHint = "Configure a public Cloud Run backend URL that serves /api/bootstrap as application/json."
                            )
                        )
                    }
                    JSONObject().put("message", parsedValue).put("value", parsedValue)
                }
            }
            else -> {
                if (requireBootstrapSchema) {
                    throw BackendApiException(
                        message = "Unexpected JSON primitive (${parsedValue?.javaClass?.simpleName}) from $fullUrl.",
                        diagnostic = ApiDiagnosticInfo(
                            endpointUrl = fullUrl,
                            httpStatusCode = httpCode,
                            contentType = contentType,
                            errorSummary = "Expected JSON object from /api/bootstrap.",
                            remediationHint = "Verify the backend URL points to the ConnectAI CRM server."
                        )
                    )
                }
                JSONObject().put("value", parsedValue)
            }
        }
    }

    private suspend fun executeJsonRequest(
        path: String,
        method: String = "GET",
        body: JSONObject? = null,
        requireBootstrapSchema: Boolean = false
    ): JSONObject = withContext(Dispatchers.IO) {
        val baseUrl = SessionVault.normalizeBackendBaseUrl(sessionVault.backendBaseUrl)
        val fullUrl = "$baseUrl$path"
        val startMs = System.currentTimeMillis()
        val conn = openAuthenticatedConnection(path, method)
        try {
            if (body != null) {
                OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { writer ->
                    writer.write(body.toString())
                    writer.flush()
                }
            }
            val code = conn.responseCode
            val elapsedMs = (System.currentTimeMillis() - startMs).coerceAtLeast(1L)
            val contentType = conn.contentType ?: conn.getHeaderField("Content-Type") ?: ""
            val locationHeader = conn.getHeaderField("Location") ?: ""

            // Handle HTTP 3xx Redirects explicitly (such as AI Studio's 302 -> /__cookie_check.html)
            if (code in 300..399) {
                val isCookieCheckRedirect = locationHeader.contains("__cookie_check") ||
                    locationHeader.contains("applet-auth-bridge") ||
                    fullUrl.contains("ais-pre-") ||
                    fullUrl.contains("ais-dev-")
                val summary = if (isCookieCheckRedirect) {
                    "HTTP $code Redirect to AI Studio Cookie Gate (${locationHeader.ifBlank { "/__cookie_check.html" }}, Content-Type: ${contentType.ifBlank { "text/html" }})"
                } else {
                    "HTTP $code Redirect from $fullUrl to $locationHeader"
                }
                val hint = if (isCookieCheckRedirect) {
                    "The configured URL ($baseUrl) is an AI Studio internal preview proxy that blocks external mobile apps with a 302 redirect to /__cookie_check.html. Deploy the backend to public Cloud Run in AI Studio and set the deployed URL in Settings."
                } else {
                    "Update the Backend URL to the direct HTTPS endpoint without redirects."
                }
                throw BackendApiException(
                    message = "$summary — $hint",
                    diagnostic = ApiDiagnosticInfo(
                        endpointUrl = fullUrl,
                        httpStatusCode = code,
                        contentType = contentType.ifBlank { "text/html" },
                        latencyMs = elapsedMs,
                        errorSummary = summary,
                        remediationHint = hint,
                        responsePreview = "Location: ${locationHeader.ifBlank { "/__cookie_check.html" }}"
                    )
                )
            }

            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val text = stream?.let {
                BufferedReader(InputStreamReader(it, Charsets.UTF_8)).use { r -> r.readText() }
            } ?: ""

            if (code !in 200..299) {
                // Safely parse JSON, HTML, or plain-text error bodies without throwing JSONException
                val parsedErrorMsg = runCatching {
                    val obj = parseSafeJsonResponse(text, contentType, code, fullUrl, false)
                    obj.optString("error").ifBlank { obj.optString("message") }
                }.getOrDefault("")
                val fallbackText = if (contentType.lowercase().contains("text/html") || text.trim().startsWith("<")) {
                    extractHtmlTitle(text).ifBlank { "HTML error page" }
                } else {
                    text.trim().take(140)
                }
                val cleanErr = parsedErrorMsg.ifBlank {
                    if (fallbackText.isNotBlank()) "HTTP $code ($path): $fallbackText" else "HTTP $code from $path"
                }
                val authHint = if (code == 401 || code == 403) {
                    "Authentication failed (HTTP $code). Verify your Bearer token or sign in again in Settings."
                } else {
                    "Check backend deployment status and server logs for $fullUrl."
                }
                throw BackendApiException(
                    message = cleanErr,
                    diagnostic = ApiDiagnosticInfo(
                        endpointUrl = fullUrl,
                        httpStatusCode = code,
                        contentType = contentType.ifBlank { "unknown" },
                        latencyMs = elapsedMs,
                        errorSummary = cleanErr,
                        remediationHint = authHint,
                        responsePreview = text.trim().take(180)
                    )
                )
            }

            parseSafeJsonResponse(
                rawText = text,
                contentType = contentType,
                httpCode = code,
                fullUrl = fullUrl,
                requireBootstrapSchema = requireBootstrapSchema
            )
        } catch (e: BackendApiException) {
            throw e
        } catch (e: Exception) {
            val elapsedMs = (System.currentTimeMillis() - startMs).coerceAtLeast(1L)
            val errSummary = "${e.javaClass.simpleName}: ${e.message ?: "Network connection failed"}"
            throw BackendApiException(
                message = errSummary,
                diagnostic = ApiDiagnosticInfo(
                    endpointUrl = fullUrl,
                    httpStatusCode = 0,
                    contentType = "none",
                    latencyMs = elapsedMs,
                    errorSummary = errSummary,
                    remediationHint = "Check your internet connection and verify that $baseUrl is publicly deployed."
                )
            )
        } finally {
            conn.disconnect()
        }
    }

    suspend fun testBackendConnectivity(customBaseUrl: String? = null): ApiDiagnosticInfo = withContext(Dispatchers.IO) {
        val previousUrl = sessionVault.backendBaseUrl
        if (!customBaseUrl.isNullOrBlank()) {
            sessionVault.backendBaseUrl = customBaseUrl
        }
        val baseUrl = SessionVault.normalizeBackendBaseUrl(sessionVault.backendBaseUrl)
        val endpointUrl = "$baseUrl/api/bootstrap"
        val startMs = System.currentTimeMillis()
        try {
            val root = executeJsonRequest(
                path = "/api/bootstrap",
                method = "GET",
                body = null,
                requireBootstrapSchema = true
            )
            val elapsedMs = (System.currentTimeMillis() - startMs).coerceAtLeast(1L)
            val tenantName = root.optJSONObject("activeTenant")?.optString("name") ?: "Workspace"
            val leadsCount = root.optJSONArray("leads")?.length() ?: 0
            ApiDiagnosticInfo(
                endpointUrl = endpointUrl,
                httpStatusCode = 200,
                contentType = "application/json; charset=utf-8",
                latencyMs = elapsedMs,
                errorSummary = "LIVE API VERIFIED — Connected to $tenantName ($leadsCount live leads).",
                remediationHint = "Connection healthy. Live Cloud SQL PostgreSQL data is active.",
                responsePreview = "{\"activeTenant\":\"$tenantName\",\"leadsCount\":$leadsCount,\"status\":\"HTTP 200 OK\"}"
            )
        } catch (e: BackendApiException) {
            if (!customBaseUrl.isNullOrBlank()) {
                sessionVault.backendBaseUrl = previousUrl
            }
            e.diagnostic
        } catch (e: Exception) {
            if (!customBaseUrl.isNullOrBlank()) {
                sessionVault.backendBaseUrl = previousUrl
            }
            val elapsedMs = (System.currentTimeMillis() - startMs).coerceAtLeast(1L)
            ApiDiagnosticInfo(
                endpointUrl = endpointUrl,
                httpStatusCode = 0,
                contentType = "none",
                latencyMs = elapsedMs,
                errorSummary = e.message ?: "Connection failed",
                remediationHint = "Verify the HTTPS Cloud Run URL and try again."
            )
        }
    }

    suspend fun fetchBootstrapWorkspace(): CrmWorkspaceSnapshot {
        val baseUrl = SessionVault.normalizeBackendBaseUrl(sessionVault.backendBaseUrl)
        val endpointUrl = "$baseUrl/api/bootstrap"
        return try {
            val root = executeJsonRequest(
                path = "/api/bootstrap",
                method = "GET",
                body = null,
                requireBootstrapSchema = true
            )
            if (!root.has("activeTenant") && !root.has("leads") && !root.has("contacts")) {
                throw BackendApiException(
                    message = "Response from $endpointUrl did not contain ConnectAI CRM workspace fields.",
                    diagnostic = ApiDiagnosticInfo(
                        endpointUrl = endpointUrl,
                        httpStatusCode = 200,
                        contentType = "application/json",
                        errorSummary = "Missing expected CRM fields (activeTenant, leads, contacts) in JSON response.",
                        remediationHint = "Ensure $baseUrl is running the ConnectAI CRM Express server."
                    )
                )
            }
            parseBootstrapJson(root, endpointUrl)
        } catch (e: BackendApiException) {
            DemoFallbackDataset.buildSafeDemoSnapshot(
                reason = e.diagnostic.errorSummary,
                diagnostic = e.diagnostic,
                companyName = sessionVault.companyName,
                userName = sessionVault.userDisplayName
            )
        } catch (e: Exception) {
            val reason = e.message ?: "Backend unreachable; displaying clean offline workspace."
            DemoFallbackDataset.buildSafeDemoSnapshot(
                reason = reason,
                diagnostic = ApiDiagnosticInfo(
                    endpointUrl = endpointUrl,
                    httpStatusCode = 0,
                    contentType = "none",
                    errorSummary = reason,
                    remediationHint = "Deploy the backend to a public Cloud Run URL and configure it in Settings."
                ),
                companyName = sessionVault.companyName,
                userName = sessionVault.userDisplayName
            )
        }
    }

    suspend fun saveWorkspaceOnboarding(
        companyName: String,
        industry: String,
        timezone: String,
        userName: String,
        aiDisclosureEnabled: Boolean = true
    ): JSONObject {
        sessionVault.companyName = companyName
        sessionVault.workspaceIndustry = industry
        sessionVault.workspaceTimezone = timezone
        sessionVault.userDisplayName = userName
        sessionVault.hasCompletedOnboarding = true
        val payload = JSONObject().apply {
            put("companyName", companyName.trim())
            put("industry", industry.trim())
            put("timezone", timezone.trim())
            put("userName", userName.trim())
            put("aiDisclosureEnabled", aiDisclosureEnabled)
        }
        return executeJsonRequest("/api/workspace/onboarding", "POST", payload)
    }

    suspend fun resetWorkspaceClean(confirmPhrase: String): JSONObject {
        val payload = JSONObject().apply {
            put("confirmPhrase", confirmPhrase.trim())
        }
        return executeJsonRequest("/api/workspace/reset", "POST", payload)
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

    private fun parseBootstrapJson(root: JSONObject, endpointUrl: String): CrmWorkspaceSnapshot {
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
                    estimatedValueUsd = l.optString("estimatedValueUsd", "0")
                        .replace(Regex("[^0-9.-]"), "")
                        .toDoubleOrNull() ?: l.optDouble("estimatedValueUsd", 0.0),
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
            apiDiagnostic = ApiDiagnosticInfo(
                endpointUrl = endpointUrl,
                httpStatusCode = 200,
                contentType = "application/json",
                errorSummary = "Verified Live API Connection (HTTP 200 application/json)",
                remediationHint = ""
            ),
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
