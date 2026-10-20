package com.connectai.crm

import com.connectai.crm.data.SessionVault
import com.connectai.crm.model.NavDestination
import com.connectai.crm.network.BackendApiException
import com.connectai.crm.network.ConnectAiApiClient
import com.connectai.crm.ui.theme.destinationAccentColor
import com.connectai.crm.ui.theme.destinationIcon
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class ConnectAiStabilityTest {

    @Test
    fun `live bootstrap workspace parser maps empty tenant collections with zero mock records`() {
        val rawBootstrap = JSONObject(
            """
            {
              "user": {"id": 1, "uid": "u_01", "email": "tabita@connectai.io", "name": "Tabita Ghimire"},
              "membership": {"role": "company_owner"},
              "activeTenant": {"id": 1, "name": "Tabita Recruitment Agency", "slug": "tabita-global"},
              "contacts": [],
              "leads": [],
              "conversations": [],
              "messages": [],
              "phoneNumbers": [],
              "socialBoosts": [],
              "tasks": [],
              "appointments": [],
              "aiAgents": [],
              "integrations": [],
              "invitations": [],
              "auditLogs": []
            }
            """.trimIndent()
        )
        val snapshot = ConnectAiApiClient.parseBootstrapWorkspaceJson(
            root = rawBootstrap,
            endpointUrl = "https://ais-pre-23awl6srmfqwmf4tftm5ii-46650627537.europe-west2.run.app/api/bootstrap"
        )

        assertTrue("Parsed bootstrap snapshot must report live backend status", snapshot.isLiveBackend)
        assertTrue("Banner must indicate CONNECTED TO LIVE CLOUD SQL", snapshot.connectionBanner.startsWith("CONNECTED TO LIVE CLOUD SQL"))
        assertTrue("Leads list must be empty when backend returns empty array", snapshot.leads.isEmpty())
        assertTrue("Contacts list must be empty when backend returns empty array", snapshot.contacts.isEmpty())
        assertTrue("Conversations must be empty when backend returns empty array", snapshot.conversations.isEmpty())
        assertTrue("Messages must be empty when backend returns empty array", snapshot.messages.isEmpty())
        assertTrue("Tasks must be empty when backend returns empty array", snapshot.tasks.isEmpty())
        assertTrue("Appointments must be empty when backend returns empty array", snapshot.appointments.isEmpty())
        assertTrue("Campaigns must be empty when backend returns empty array", snapshot.campaigns.isEmpty())
        assertTrue("Channels must be empty when backend returns empty array", snapshot.channels.isEmpty())
        assertTrue("AI agents must be empty when backend returns empty array", snapshot.aiAgents.isEmpty())
        assertTrue("Invitations must be empty when backend returns empty array", snapshot.invitations.isEmpty())
        assertTrue("Audit logs must be empty when backend returns empty array", snapshot.auditLogs.isEmpty())
        assertEquals("Tabita Recruitment Agency", snapshot.activeTenant.name)
        assertEquals("Tabita Ghimire", snapshot.user.name)
    }

    @Test
    fun `normalizeBackendBaseUrl enforces https and strips trailing api paths`() {
        assertEquals(
            "https://connectai-prod.a.run.app",
            SessionVault.normalizeBackendBaseUrl("http://connectai-prod.a.run.app/api/bootstrap/")
        )
        assertEquals(
            "https://connectai-prod.a.run.app",
            SessionVault.normalizeBackendBaseUrl("connectai-prod.a.run.app/api")
        )
        assertEquals(
            "https://connectai-prod.a.run.app",
            SessionVault.normalizeBackendBaseUrl("  https://connectai-prod.a.run.app/api/health  ")
        )
        assertEquals(
            "https://ais-pre-23awl6srmfqwmf4tftm5ii-46650627537.europe-west2.run.app",
            SessionVault.normalizeBackendBaseUrl("https://ais-dev-23awl6srmfqwmf4tftm5ii-46650627537.europe-west2.run.app/api/bootstrap")
        )
    }

    @Test
    fun `extractSetCookiePairs and buildCookieHeader preserve GAESA and proxy auth cookies`() {
        val rawHeaders = listOf(
            "__SECURE-aistudio_auth_flow_may_set_cookies=true; Path=/; Secure; SameSite=None",
            "GAESA=Cp4BMDAxMGRkODYwNzM1ZTZlYWJmZDM5; expires=Thu, 19-Nov-2026 10:48:50 GMT; path=/"
        )
        val parsed = ConnectAiApiClient.extractSetCookiePairs(rawHeaders)
        assertEquals("true", parsed["__SECURE-aistudio_auth_flow_may_set_cookies"])
        assertEquals("Cp4BMDAxMGRkODYwNzM1ZTZlYWJmZDM5", parsed["GAESA"])

        val combined = LinkedHashMap<String, String>().apply {
            put("__SECURE-aistudio_auth_token", "one_token_to_rule_them_all")
            putAll(parsed)
        }
        val cookieHeader = ConnectAiApiClient.buildCookieHeader(combined)
        assertTrue(cookieHeader.contains("__SECURE-aistudio_auth_token=one_token_to_rule_them_all"))
        assertTrue(cookieHeader.contains("GAESA=Cp4BMDAxMGRkODYwNzM1ZTZlYWJmZDM5"))
    }

    @Test
    fun `parseSafeJsonResponse detects HTML cookie gate and throws structured BackendApiException`() {
        val htmlCookiePage = """
            <!doctype html>
            <html>
            <head><title>Cookie check</title></head>
            <body>Redirecting to /__cookie_check.html</body>
            </html>
        """.trimIndent()

        try {
            ConnectAiApiClient.parseSafeJsonResponse(
                rawText = htmlCookiePage,
                contentType = "text/html; charset=utf-8",
                httpCode = 200,
                fullUrl = "https://ais-pre-example.europe-west2.run.app/api/bootstrap",
                requireBootstrapSchema = true
            )
            fail("Expected BackendApiException when HTML cookie check page is returned")
        } catch (e: BackendApiException) {
            assertEquals(200, e.diagnostic.httpStatusCode)
            assertTrue(e.diagnostic.errorSummary.contains("cookie check", ignoreCase = true))
            assertTrue(e.diagnostic.remediationHint.contains("Cloud Run", ignoreCase = true))
        }
    }

    @Test
    fun `parseSafeJsonResponse handles empty and malformed JSON and HTTP 401 403 404 500 error bodies`() {
        // 1. Empty body on bootstrap schema must throw BackendApiException
        try {
            ConnectAiApiClient.parseSafeJsonResponse(
                rawText = "   ",
                contentType = "application/json",
                httpCode = 200,
                fullUrl = "https://connectai-prod.a.run.app/api/bootstrap",
                requireBootstrapSchema = true
            )
            fail("Expected BackendApiException on empty bootstrap response")
        } catch (e: BackendApiException) {
            assertTrue(e.diagnostic.errorSummary.contains("Empty response body"))
        }

        // 2. Malformed JSON must throw BackendApiException instead of unhandled JSONException
        try {
            ConnectAiApiClient.parseSafeJsonResponse(
                rawText = "{corrupted_json: true",
                contentType = "application/json",
                httpCode = 500,
                fullUrl = "https://connectai-prod.a.run.app/api/bootstrap",
                requireBootstrapSchema = true
            )
            fail("Expected BackendApiException on malformed JSON")
        } catch (e: BackendApiException) {
            assertEquals(500, e.diagnostic.httpStatusCode)
        }

        // 3. HTTP 401/403/404/500 JSON error bodies parse cleanly when requireBootstrapSchema = false
        for (status in listOf(401, 403, 404, 500)) {
            val errObj = ConnectAiApiClient.parseSafeJsonResponse(
                rawText = """{"error":"HTTP $status error test"}""",
                contentType = "application/json",
                httpCode = status,
                fullUrl = "https://connectai-prod.a.run.app/api/leads",
                requireBootstrapSchema = false
            )
            assertEquals("HTTP $status error test", errObj.optString("error"))
        }
    }

    @Test
    fun `parseSafeJsonResponse parses valid JSON and double-encoded JSON strings`() {
        val normalJson = ConnectAiApiClient.parseSafeJsonResponse(
            rawText = """{"activeTenant":{"name":"ConnectAI"},"leads":[]}""",
            contentType = "application/json",
            httpCode = 200,
            fullUrl = "https://connectai-prod.a.run.app/api/bootstrap",
            requireBootstrapSchema = true
        )
        assertEquals("ConnectAI", normalJson.getJSONObject("activeTenant").getString("name"))

        val doubleEncoded = ConnectAiApiClient.parseSafeJsonResponse(
            rawText = "\"{\\\"activeTenant\\\":{\\\"name\\\":\\\"DoubleEncoded\\\"}}\"",
            contentType = "application/json",
            httpCode = 200,
            fullUrl = "https://connectai-prod.a.run.app/api/bootstrap",
            requireBootstrapSchema = true
        )
        assertEquals("DoubleEncoded", doubleEncoded.getJSONObject("activeTenant").getString("name"))
    }

    @Test
    fun `all 13 NavDestination entries have valid routes, labels, groups, icons, and accent colors`() {
        val entries = NavDestination.entries
        assertEquals("Expected 13 navigation destinations including HELP_USER_GUIDE", 13, entries.size)
        assertTrue("NavDestination must include HELP_USER_GUIDE", entries.contains(NavDestination.HELP_USER_GUIDE))
        for (dest in entries) {
            assertTrue("Label must not be blank for $dest", dest.label.isNotBlank())
            assertTrue("Route must not be blank for $dest", dest.route.isNotBlank())
            assertTrue("Group must not be blank for $dest", dest.group.isNotBlank())
            assertNotNull("Icon must be mapped for $dest", destinationIcon(dest))
            assertNotNull("Accent color must be mapped for $dest", destinationAccentColor(dest))
        }
    }

    @Test
    fun `NetworkDiagnosticLogger intercepts failed API calls in debug mode and excludes Authorization and sensitive headers`() {
        val requestHeaders = mapOf<String?, List<String>?>(
            "Authorization" to listOf("Bearer super-secret-jwt-token-999"),
            "Proxy-Authorization" to listOf("Basic secret-proxy-creds"),
            "Cookie" to listOf("__SECURE-aistudio_auth_token=secret-cookie-value"),
            "Accept" to listOf("application/json"),
            "x-tenant-slug" to listOf("tabita-global")
        )
        val responseHeaders = mapOf<String?, List<String>?>(
            "Set-Cookie" to listOf("GAESA=secret-gaesa-session-token; Path=/"),
            "X-Api-Key" to listOf("ai-secret-key-12345"),
            "Content-Type" to listOf("text/html; charset=utf-8"),
            "Server" to listOf("Google Frontend")
        )
        val rawBody = """<!doctype html><html><head><title>502 Bad Gateway</title></head><body>{"accessToken":"hidden-secret-123"}</body></html>"""

        // 1. Release build (isDebugBuild = false) must return empty string and never log
        val releaseOutput = com.connectai.crm.network.NetworkDiagnosticLogger.interceptFailedApiCall(
            method = "GET",
            endpointUrl = "https://ais-pre-example.run.app/api/bootstrap?access_token=url-secret-789",
            httpStatusCode = 502,
            contentType = "text/html",
            latencyMs = 45L,
            failureReason = "HTTP 502 Bad Gateway",
            rawResponseBody = rawBody,
            responseHeaders = responseHeaders,
            requestHeaders = requestHeaders,
            isDebugBuild = false
        )
        assertEquals("Release build must never produce diagnostic log output", "", releaseOutput)

        // 2. Debug build (isDebugBuild = true) must identify HTML/error page, log raw body, and exclude Authorization/sensitive headers
        val debugOutput = com.connectai.crm.network.NetworkDiagnosticLogger.interceptFailedApiCall(
            method = "GET",
            endpointUrl = "https://ais-pre-example.run.app/api/bootstrap?access_token=url-secret-789",
            httpStatusCode = 502,
            contentType = "text/html",
            latencyMs = 45L,
            failureReason = "HTTP 502 Bad Gateway",
            rawResponseBody = rawBody,
            responseHeaders = responseHeaders,
            requestHeaders = requestHeaders,
            isDebugBuild = true
        )
        assertTrue("Debug log must identify HTML error page", debugOutput.contains("HTML_ERROR_PAGE (HTTP 502)"))
        assertTrue("Debug log must include extracted HTML title", debugOutput.contains("502 Bad Gateway"))
        assertTrue("Debug log must include raw HTML body", debugOutput.contains("<!doctype html>"))
        assertTrue("Debug log must include safe Server response header", debugOutput.contains("Google Frontend"))
        assertTrue("Debug log must include safe x-tenant-slug request header", debugOutput.contains("tabita-global"))
        assertFalse("Debug log must exclude Authorization header value", debugOutput.contains("super-secret-jwt-token-999"))
        assertFalse("Debug log must exclude Proxy-Authorization header value", debugOutput.contains("secret-proxy-creds"))
        assertFalse("Debug log must exclude Cookie header value", debugOutput.contains("secret-cookie-value"))
        assertFalse("Debug log must exclude Set-Cookie header value", debugOutput.contains("secret-gaesa-session-token"))
        assertFalse("Debug log must exclude X-Api-Key header value", debugOutput.contains("ai-secret-key-12345"))
        assertFalse("Debug log must redact query parameter access_token", debugOutput.contains("url-secret-789"))
        assertFalse("Debug log must redact body accessToken field", debugOutput.contains("hidden-secret-123"))
    }
}


