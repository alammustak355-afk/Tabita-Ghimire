package com.connectai.crm.data

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import com.connectai.crm.BuildConfig

@Suppress("DEPRECATION")
class SessionVault(context: Context) {

    private val prefs: SharedPreferences = runCatching {
        EncryptedSharedPreferences.create(
            "connectai_crm_encrypted_vault",
            MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC),
            context.applicationContext,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }.getOrElse {
        // Recover gracefully if OEM Keystore / backup restore invalidates master key
        runCatching {
            context.applicationContext.deleteSharedPreferences("connectai_crm_encrypted_vault")
        }
        context.applicationContext.getSharedPreferences(
            "connectai_crm_fallback_vault",
            Context.MODE_PRIVATE
        )
    }

    var bearerToken: String
        get() = prefs.getString(KEY_BEARER_TOKEN, "demo-session-token") ?: "demo-session-token"
        set(value) = prefs.edit().putString(KEY_BEARER_TOKEN, value.trim()).apply()

    var activeTenantSlug: String
        get() = prefs.getString(KEY_TENANT_SLUG, "") ?: ""
        set(value) = prefs.edit().putString(KEY_TENANT_SLUG, value.trim()).apply()

    var backendBaseUrl: String
        get() = normalizeBackendBaseUrl(
            prefs.getString(KEY_BACKEND_URL, BuildConfig.PROD_BACKEND_URL)
                ?: BuildConfig.PROD_BACKEND_URL
        )
        set(value) {
            val cleaned = normalizeBackendBaseUrl(value)
            if (cleaned.startsWith("https://")) {
                prefs.edit().putString(KEY_BACKEND_URL, cleaned).apply()
            }
        }

    var isSignedOut: Boolean
        get() = prefs.getBoolean(KEY_SIGNED_OUT, false)
        set(value) = prefs.edit().putBoolean(KEY_SIGNED_OUT, value).apply()

    var hasCompletedOnboarding: Boolean
        get() = prefs.getBoolean(KEY_ONBOARDING_COMPLETED, false)
        set(value) = prefs.edit().putBoolean(KEY_ONBOARDING_COMPLETED, value).apply()

    var companyName: String
        get() = prefs.getString(KEY_COMPANY_NAME, "ConnectAI CRM Workspace") ?: "ConnectAI CRM Workspace"
        set(value) = prefs.edit().putString(KEY_COMPANY_NAME, value.trim().ifBlank { "ConnectAI CRM Workspace" }).apply()

    var userDisplayName: String
        get() = prefs.getString(KEY_USER_DISPLAY_NAME, "Workspace Owner") ?: "Workspace Owner"
        set(value) = prefs.edit().putString(KEY_USER_DISPLAY_NAME, value.trim().ifBlank { "Workspace Owner" }).apply()

    var workspaceIndustry: String
        get() = prefs.getString(KEY_WORKSPACE_INDUSTRY, "Recruitment & Omnichannel CRM") ?: "Recruitment & Omnichannel CRM"
        set(value) = prefs.edit().putString(KEY_WORKSPACE_INDUSTRY, value.trim()).apply()

    var workspaceTimezone: String
        get() = prefs.getString(KEY_WORKSPACE_TIMEZONE, "UTC") ?: "UTC"
        set(value) = prefs.edit().putString(KEY_WORKSPACE_TIMEZONE, value.trim()).apply()

    fun signInWithToken(token: String, tenantSlug: String = "") {
        bearerToken = token.ifBlank { "demo-session-token" }
        if (tenantSlug.isNotBlank()) {
            activeTenantSlug = tenantSlug
        }
        isSignedOut = false
    }

    fun signOutAndClearSession() {
        prefs.edit()
            .remove(KEY_BEARER_TOKEN)
            .putBoolean(KEY_SIGNED_OUT, true)
            .apply()
    }

    companion object {
        private const val KEY_BEARER_TOKEN = "auth_bearer_token"
        private const val KEY_TENANT_SLUG = "active_tenant_slug"
        private const val KEY_BACKEND_URL = "backend_base_url"
        private const val KEY_SIGNED_OUT = "is_signed_out"
        private const val KEY_ONBOARDING_COMPLETED = "onboarding_completed_v2"
        private const val KEY_COMPANY_NAME = "workspace_company_name"
        private const val KEY_USER_DISPLAY_NAME = "user_display_name"
        private const val KEY_WORKSPACE_INDUSTRY = "workspace_industry"
        private const val KEY_WORKSPACE_TIMEZONE = "workspace_timezone"

        fun normalizeBackendBaseUrl(raw: String): String {
            var url = raw.trim()
            if (url.isEmpty()) return BuildConfig.PROD_BACKEND_URL
            if (!url.startsWith("https://", ignoreCase = true) && !url.startsWith("http://", ignoreCase = true)) {
                url = "https://$url"
            }
            if (url.startsWith("http://", ignoreCase = true)) {
                url = "https://" + url.substring(7)
            }
            url = url.trimEnd('/')
            val suffixesToStrip = listOf("/api/bootstrap", "/api/health", "/api")
            for (suffix in suffixesToStrip) {
                if (url.endsWith(suffix, ignoreCase = true)) {
                    url = url.dropLast(suffix.length).trimEnd('/')
                }
            }
            return url
        }
    }
}
