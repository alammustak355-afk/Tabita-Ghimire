package com.connectai.crm.network

import android.util.Log
import com.connectai.crm.BuildConfig

/**
 * Debug-only diagnostic utility that intercepts failed API calls, classifies whether the raw
 * response body is an HTML document, auth/cookie gate, or HTTP error page, and logs the raw
 * response body to Logcat. Strictly disabled in release builds (!BuildConfig.DEBUG) and
 * explicitly excludes sensitive headers such as Authorization, Cookie, Set-Cookie, and API keys.
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

    private val HTML_TITLE_REGEX = Regex("<title[^>]*>(.*?)</title>", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL))

    /**
     * Checks whether a header key is sensitive (e.g., Authorization, Cookie, Set-Cookie, tokens, keys).
     */
    internal fun isSensitiveHeader(headerName: String): Boolean {
        val lowerKey = headerName.trim().lowercase()
        if (lowerKey.isEmpty()) return false
        return lowerKey in SENSITIVE_HEADER_NAMES ||
            lowerKey.contains("authorization") ||
            lowerKey.contains("auth") ||
            lowerKey.contains("token") ||
            lowerKey.contains("secret") ||
            lowerKey.contains("cookie") ||
            lowerKey.contains("key") ||
            lowerKey.contains("password") ||
            lowerKey.contains("credential")
    }

    /**
     * Filters out any sensitive headers (such as Authorization, Cookie, Set-Cookie, X-Api-Key)
     * so credentials and session tokens are never written to Logcat.
     */
    internal fun filterSafeHeaders(rawHeaders: Map<String?, List<String>?>?): Map<String, String> {
        if (rawHeaders.isNullOrEmpty()) return emptyMap()
        val safe = LinkedHashMap<String, String>()
        for ((key, values) in rawHeaders) {
            val cleanKey = key?.trim().orEmpty()
            if (cleanKey.isEmpty() || isSensitiveHeader(cleanKey)) {
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
     * Inspects the HTTP status code, Content-Type, and raw response body to determine whether
     * the failed API response is an HTML page, proxy auth/cookie gate, HTTP error page, or JSON error.
     */
    internal fun classifyResponseBodyType(
        httpStatusCode: Int,
        contentType: String,
        rawResponseBody: String
    ): String {
        val trimmed = rawResponseBody.trim()
        val lowerBody = trimmed.take(600).lowercase()
        val lowerCt = contentType.lowercase()

        val isHtml = lowerCt.contains("text/html") ||
            lowerBody.startsWith("<!doctype html") ||
            lowerBody.startsWith("<html") ||
            lowerBody.startsWith("<head") ||
            lowerBody.startsWith("<body") ||
            lowerBody.contains("<html")

        val htmlTitle = HTML_TITLE_REGEX.find(trimmed)?.groupValues?.getOrNull(1)
            ?.replace(Regex("\\s+"), " ")
            ?.trim()
            ?.take(80)
            .orEmpty()
        val titleSuffix = if (htmlTitle.isNotEmpty()) " (title: \"$htmlTitle\")" else ""

        return when {
            lowerBody.contains("__cookie_check.html") ||
                lowerBody.contains("__aistudio_auth_flow.js") ||
                lowerBody.contains("applet-auth-bridge") ||
                lowerBody.contains("accounts.google.com") -> {
                "HTML_AUTH_OR_COOKIE_GATE$titleSuffix"
            }
            isHtml && httpStatusCode >= 400 -> {
                "HTML_ERROR_PAGE (HTTP $httpStatusCode)$titleSuffix"
            }
            isHtml -> {
                "HTML_DOCUMENT_OR_FALLBACK_PAGE (Expected JSON)$titleSuffix"
            }
            httpStatusCode in 300..399 -> {
                "HTTP_REDIRECT_RESPONSE (HTTP $httpStatusCode)"
            }
            trimmed.isEmpty() -> {
                if (httpStatusCode > 0) "EMPTY_ERROR_RESPONSE (HTTP $httpStatusCode)" else "NETWORK_OR_CONNECTION_ERROR"
            }
            (trimmed.startsWith("{") || trimmed.startsWith("[")) && httpStatusCode >= 400 -> {
                "JSON_ERROR_RESPONSE (HTTP $httpStatusCode)"
            }
            httpStatusCode >= 400 -> {
                "PLAIN_TEXT_ERROR_PAGE (HTTP $httpStatusCode)"
            }
            else -> {
                "MALFORMED_OR_UNEXPECTED_PAYLOAD"
            }
        }
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
        requestHeaders: Map<String?, List<String>?>? = null,
        isDebugBuild: Boolean = BuildConfig.DEBUG
    ): String {
        if (!isDebugBuild) return ""

        val safeUrl = redactUrlSecrets(endpointUrl)
        val safeRequestHeaders = filterSafeHeaders(requestHeaders)
        val safeResponseHeaders = filterSafeHeaders(responseHeaders)
        val bodyClassification = classifyResponseBodyType(httpStatusCode, contentType, rawResponseBody)
        val sanitizedBody = sanitizeRawResponseBody(rawResponseBody)

        return buildString {
            appendLine("=== ConnectAI CRM Failed API Call Intercepted (DEBUG ONLY) ===")
            appendLine("Request       : ${method.uppercase()} $safeUrl")
            appendLine("HTTP Status   : $httpStatusCode | Content-Type: ${contentType.ifBlank { "none" }} | Latency: ${latencyMs}ms")
            appendLine("Body Type     : $bodyClassification")
            appendLine("Failure Reason: $failureReason")
            if (safeRequestHeaders.isNotEmpty()) {
                appendLine("Safe Req Hdrs : $safeRequestHeaders")
            }
            if (safeResponseHeaders.isNotEmpty()) {
                appendLine("Safe Resp Hdrs: $safeResponseHeaders")
            }
            appendLine("Raw Body      : $sanitizedBody")
            append("=== End Failed API Call Diagnostic ===")
        }
    }

    /**
     * Primary diagnostic interceptor for failed API calls.
     * Strictly executes in debug mode (BuildConfig.DEBUG), classifies whether the response is HTML
     * or an error page, excludes sensitive headers such as Authorization, and logs the raw body to Logcat.
     */
    fun interceptFailedApiCall(
        method: String,
        endpointUrl: String,
        httpStatusCode: Int,
        contentType: String,
        latencyMs: Long,
        failureReason: String,
        rawResponseBody: String,
        responseHeaders: Map<String?, List<String>?>? = null,
        requestHeaders: Map<String?, List<String>?>? = null,
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
            requestHeaders = requestHeaders,
            isDebugBuild = true
        )
        if (payload.isNotEmpty()) {
            runCatching {
                Log.e(TAG, payload)
            }
        }
        return payload
    }

    /**
     * Backwards-compatible alias that delegates directly to [interceptFailedApiCall].
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
        requestHeaders: Map<String?, List<String>?>? = null,
        isDebugBuild: Boolean = BuildConfig.DEBUG
    ): String = interceptFailedApiCall(
        method = method,
        endpointUrl = endpointUrl,
        httpStatusCode = httpStatusCode,
        contentType = contentType,
        latencyMs = latencyMs,
        failureReason = failureReason,
        rawResponseBody = rawResponseBody,
        responseHeaders = responseHeaders,
        requestHeaders = requestHeaders,
        isDebugBuild = isDebugBuild
    )
}

