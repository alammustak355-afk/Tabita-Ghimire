package com.connectai.crm

import com.connectai.crm.data.SessionVault
import com.connectai.crm.model.DemoFallbackDataset
import com.connectai.crm.model.NavDestination
import com.connectai.crm.network.BackendApiException
import com.connectai.crm.network.ConnectAiApiClient
import com.connectai.crm.ui.theme.destinationAccentColor
import com.connectai.crm.ui.theme.destinationIcon
import org.junit.Assert.*
import org.junit.Test

class ConnectAiStabilityTest {

    @Test
    fun `fresh fallback workspace starts completely empty with zero business records`() {
        val snapshot = DemoFallbackDataset.buildSafeDemoSnapshot(
            reason = "Initial first-launch clean state",
            companyName = "Tabita Recruitment Agency",
            userName = "Tabita Ghimire"
        )

        assertFalse("Fallback snapshot must not claim live backend status", snapshot.isLiveBackend)
        assertTrue("Leads list must be empty on fresh start", snapshot.leads.isEmpty())
        assertTrue("Contacts list must be empty on fresh start", snapshot.contacts.isEmpty())
        assertTrue("Conversations must be empty on fresh start", snapshot.conversations.isEmpty())
        assertTrue("Messages must be empty on fresh start", snapshot.messages.isEmpty())
        assertTrue("Tasks must be empty on fresh start", snapshot.tasks.isEmpty())
        assertTrue("Appointments must be empty on fresh start", snapshot.appointments.isEmpty())
        assertTrue("Campaigns must be empty on fresh start", snapshot.campaigns.isEmpty())
        assertTrue("Channels must be empty on fresh start", snapshot.channels.isEmpty())
        assertTrue("AI agents must be empty on fresh start", snapshot.aiAgents.isEmpty())
        assertTrue("Invitations must be empty on fresh start", snapshot.invitations.isEmpty())
        assertTrue("Audit logs must be empty on fresh start", snapshot.auditLogs.isEmpty())
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
}
