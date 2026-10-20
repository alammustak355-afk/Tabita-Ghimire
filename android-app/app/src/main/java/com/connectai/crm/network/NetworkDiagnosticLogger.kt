package com.connectai.crm.network

import android.util.Log
import com.connectai.crm.BuildConfig

/**
 * Debug-only diagnostic utility that logs the raw network response body and safe metadata
 * when an API request fails. Strictly disabled in release builds (!BuildConfig.DEBUG) and
 * excludes all sensitive headers (Authorization, Cookie, Set-Cookie, API keys, etc.).
 */
object NetworkDiagnosticLogger {

    private const val TAG = "ConnectAiNetDiag"
    private const val MAX_BODY_LOG_CHARS = 2048

    private val SENSITIVE_HEADER_NAMES = setOf(
        "authorization",
        "proxy-authorization",
        "cookie",
        "set-cookie",
        "x-api-key",
        "api-key",
        "x-auth-token",
        "x-access-token",
        "x-firebase-token",
        "x-client-secret",
        "www-authenticate"
    )

    private val SENSITIVE_QUERY_PARAM_REGEX = Regex(
        "([?&](?:token|access_token|auth_token|__aistudio_auth_token|key|api_key|secret|password)=)[^&\\s]+",
        RegexOption.IGNORE_CASE
    )

    private val SENSITIVE_BODY_FIELD_REGEX = Regex(
        "(\"(?:password|secret|accessToken|refreshToken|apiKey|bearerToken|clientSecret|__SECURE-aistudio_auth_token)\"\\s*:\\s*\")[^\"]*(\")",
        RegexOption.IGNORE_CASE
    )

    /**
     * Filters out any sensitive headers so credentials, cookies, and tokens are never logged.
     */
    internal fun filterSafeHeaders(rawHeaders: Map<String?, List<String>?>?): Map<String, String> {
        if (rawHeaders.isNullOrEmpty()) return emptyMap()
        val safe = LinkedHashMap<String, String>()
        for ((key, values) in rawHeaders) {
            val cleanKey = key?.trim().orEmpty()
            if (cleanKey.isEmpty()) continue
            val lowerKey = cleanKey.lowercase()
            if (lowerKey in SENSITIVE_HEADER_NAMES ||
                lowerKey.contains("token") ||
                lowerKey.contains("secret") ||
                lowerKey.contains("cookie") ||
                lowerKey.contains("auth") ||
                lowerKey.contains("key")
            ) {
                continue
            }
            val joined = values?.joinToString(", ")?.trim().orEmpty()
            if (joined.isNotEmpty()) {
                safe[cleanKey] = redactUrlSecrets(joined)
            }
        }
        return safe
    }

    /**
     * Redacts sensitive query parameters from URLs or Location redirect headers.
     */
    internal fun redactUrlSecrets(rawUrl: String): String {
        if (rawUrl.isBlank()) return rawUrl
        return SENSITIVE_QUERY_PARAM_REGEX.replace(rawUrl, "$1[REDACTED]")
    }

    /**
     * Sanitizes raw response bodies (preserving HTML/JSON structure for debugging while redacting secrets)
     * and truncates oversized bodies to MAX_BODY_LOG_CHARS.
     */
    internal fun sanitizeRawResponseBody(rawBody: String, maxChars: Int = MAX_BODY_LOG_CHARS): String {
        if (rawBody.isEmpty()) return "<empty response body>"
        val redacted = SENSITIVE_BODY_FIELD_REGEX.replace(rawBody, "$1[REDACTED]$2")
            .let { SENSITIVE_QUERY_PARAM_REGEX.replace(it, "$1[REDACTED]") }
        return if (redacted.length > maxChars) {
            redacted.take(maxChars) + "... [truncated ${redacted.length - maxChars} chars]"
        } else {
            redacted
        }
    }

    /**
     * Builds the diagnostic log string ONLY when isDebugBuild is true.
     * Returns an empty string in release builds.
     */
    internal fun buildDebugLogPayload(
        method: String,
        endpointUrl: String,
        httpStatusCode: Int,
        contentType: String,
        latencyMs: Long,
        failureReason: String,
        rawResponseBody: String,
        responseHeaders: Map<String?, List<String>?>? = null,
        isDebugBuild: Boolean = BuildConfig.DEBUG
    ): String {
        if (!isDebugBuild) return ""

        val safeUrl = redactUrlSecrets(endpointUrl)
        val safeHeaders = filterSafeHeaders(responseHeaders)
        val sanitizedBody = sanitizeRawResponseBody(rawResponseBody)

        return buildString {
            appendLine("=== ConnectAI CRM Network Failure Diagnostic (DEBUG ONLY) ===")
            appendLine("Request      : ${method.uppercase()} $safeUrl")
            appendLine("HTTP Status  : $httpStatusCode | Content-Type: ${contentType.ifBlank { "none" }} | Latency: ${latencyMs}ms")
            appendLine("Reason       : $failureReason")
            if (safeHeaders.isNotEmpty()) {
                appendLine("Safe Headers : $safeHeaders")
            }
            appendLine("Raw Body     : $sanitizedBody")
            append("=== End Network Failure Diagnostic ===")
        }
    }

    /**
     * Logs a failed HTTP response to Android Logcat strictly in debug builds (BuildConfig.DEBUG).
     */
    fun logFailedResponse(
        method: String,
        endpointUrl: String,
        httpStatusCode: Int,
        contentType: String,
        latencyMs: Long,
        failureReason: String,
        rawResponseBody: String,
        responseHeaders: Map<String?, List<String>?>? = null,
        isDebugBuild: Boolean = BuildConfig.DEBUG
    ): String {
        if (!isDebugBuild) return ""
        val payload = buildDebugLogPayload(
            method = method,
            endpointUrl = endpointUrl,
            httpStatusCode = httpStatusCode,
            contentType = contentType,
            latencyMs = latencyMs,
            failureReason = failureReason,
            rawResponseBody = rawResponseBody,
            responseHeaders = responseHeaders,
            isDebugBuild = true
        )
        if (payload.isNotEmpty()) {
            runCatching {
                Log.w(TAG, payload)
            }
        }
        return payload
    }
}
