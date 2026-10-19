package com.connectai.crm.data

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import com.connectai.crm.BuildConfig

@Suppress("DEPRECATION")
class SessionVault(context: Context) {

    private val prefs: SharedPreferences = EncryptedSharedPreferences.create(
        "connectai_crm_encrypted_vault",
        MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC),
        context.applicationContext,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    var bearerToken: String
        get() = prefs.getString(KEY_BEARER_TOKEN, "demo-session-token") ?: "demo-session-token"
        set(value) = prefs.edit().putString(KEY_BEARER_TOKEN, value.trim()).apply()

    var activeTenantSlug: String
        get() = prefs.getString(KEY_TENANT_SLUG, "") ?: ""
        set(value) = prefs.edit().putString(KEY_TENANT_SLUG, value.trim()).apply()

    var backendBaseUrl: String
        get() = prefs.getString(KEY_BACKEND_URL, BuildConfig.PROD_BACKEND_URL)
            ?: BuildConfig.PROD_BACKEND_URL
        set(value) {
            val cleaned = value.trim().removeSuffix("/")
            if (cleaned.startsWith("https://")) {
                prefs.edit().putString(KEY_BACKEND_URL, cleaned).apply()
            }
        }

    var isSignedOut: Boolean
        get() = prefs.getBoolean(KEY_SIGNED_OUT, false)
        set(value) = prefs.edit().putBoolean(KEY_SIGNED_OUT, value).apply()

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
    }
}
