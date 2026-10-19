package com.connectai.crm

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.Uri
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys

class MainActivity : ComponentActivity() {

    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private var crmWebView: WebView? = null

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val callback = fileUploadCallback ?: return@registerForActivityResult
        val uris = WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
        callback.onReceiveValue(uris)
        fileUploadCallback = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)

        val securePrefs = createEncryptedSessionPreferences(applicationContext)
        val productionUrl = BuildConfig.PROD_BACKEND_URL

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                val webView = crmWebView
                if (webView != null && webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        setContent {
            ConnectAiCrmMaterial3Theme {
                ConnectAiCrmScreen(
                    productionUrl = productionUrl,
                    onSaveLastVisitedUrl = { url ->
                        securePrefs.edit().putString("last_verified_workspace_url", url).apply()
                    },
                    onWebViewCreated = { crmWebView = it },
                    onLaunchFileChooser = { intent, callback ->
                        fileUploadCallback?.onReceiveValue(null)
                        fileUploadCallback = callback
                        fileChooserLauncher.launch(intent)
                    }
                )
            }
        }
    }

    override fun onPause() {
        super.onPause()
        CookieManager.getInstance().flush()
    }

    private fun createEncryptedSessionPreferences(context: Context) =
        EncryptedSharedPreferences.create(
            "connectai_crm_secure_session",
            MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC),
            context,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
}

@Composable
fun ConnectAiCrmMaterial3Theme(content: @Composable () -> Unit) {
    val colorScheme = darkColorScheme(
        primary = Color(0xFF4F46E5),       // Electric Indigo
        secondary = Color(0xFF2563EB),     // Royal Blue
        background = Color(0xFF0F172A),    // Deep Navy
        surface = Color(0xFF0F172A),
        onPrimary = Color.White,
        onBackground = Color(0xFFF8FAFC),
        onSurface = Color(0xFFF8FAFC)
    )
    MaterialTheme(colorScheme = colorScheme, content = content)
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun ConnectAiCrmScreen(
    productionUrl: String,
    onSaveLastVisitedUrl: (String) -> Unit,
    onWebViewCreated: (WebView) -> Unit,
    onLaunchFileChooser: (Intent, ValueCallback<Array<Uri>>) -> Unit
) {
    var isLoading by remember { mutableStateOf(true) }
    var loadError by remember { mutableStateOf<String?>(null) }
    var isOnline by remember { mutableStateOf(true) }
    val context = androidx.compose.ui.platform.LocalContext.current

    DisposableEffect(context) {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                isOnline = true
            }

            override fun onLost(network: Network) {
                isOnline = false
            }
        }
        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()
        cm.registerNetworkCallback(request, callback)
        onDispose { cm.unregisterNetworkCallback(callback) }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
            .systemBarsPadding()
    ) {
        // Offline Network Banner
        AnimatedVisibility(visible = !isOnline) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFFD97706))
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Offline Mode — Cached workspace active. Reconnecting via HTTPS...",
                    color = Color.White,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }

        // Loading Progress Indicator
        if (isLoading) {
            LinearProgressIndicator(
                modifier = Modifier.fillMaxWidth(),
                color = Color(0xFF4F46E5),
                trackColor = Color(0xFF1E293B)
            )
        }

        // Network Error Recovery Screen
        if (loadError != null) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(24.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "ConnectAI CRM Connection Interrupted",
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = loadError ?: "Unable to reach the production CRM backend over HTTPS.",
                    color = Color(0xFF94A3B8),
                    fontSize = 13.sp
                )
                Spacer(modifier = Modifier.height(20.dp))
                Button(
                    onClick = { loadError = null },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4F46E5))
                ) {
                    Text("Retry Secure Connection", color = Color.White)
                }
            }
        } else {
            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { ctx ->
                    WebView(ctx).apply {
                        onWebViewCreated(this)
                        val cookieManager = CookieManager.getInstance()
                        cookieManager.setAcceptCookie(true)
                        cookieManager.setAcceptThirdPartyCookies(this, true)

                        settings.apply {
                            javaScriptEnabled = true
                            domStorageEnabled = true
                            databaseEnabled = true
                            cacheMode = WebSettings.LOAD_DEFAULT
                            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
                            allowFileAccess = false
                            allowContentAccess = true
                            userAgentString = "$userAgentString ConnectAICRM-Android/1.0.0"
                        }

                        webViewClient = object : WebViewClient() {
                            override fun onPageFinished(view: WebView?, url: String?) {
                                isLoading = false
                                if (url != null && url.startsWith("https://")) {
                                    onSaveLastVisitedUrl(url)
                                }
                                CookieManager.getInstance().flush()
                            }

                            override fun onReceivedError(
                                view: WebView?,
                                request: WebResourceRequest?,
                                error: WebResourceError?
                            ) {
                                if (request?.isForMainFrame == true) {
                                    isLoading = false
                                    loadError = error?.description?.toString()
                                        ?: "Network connection timed out."
                                }
                            }
                        }

                        webChromeClient = object : WebChromeClient() {
                            override fun onShowFileChooser(
                                webView: WebView?,
                                filePathCallback: ValueCallback<Array<Uri>>?,
                                fileChooserParams: FileChooserParams?
                            ): Boolean {
                                if (filePathCallback == null || fileChooserParams == null) {
                                    return false
                                }
                                onLaunchFileChooser(
                                    fileChooserParams.createIntent(),
                                    filePathCallback
                                )
                                return true
                            }
                        }

                        loadUrl(productionUrl)
                    }
                }
            )
        }
    }
}
