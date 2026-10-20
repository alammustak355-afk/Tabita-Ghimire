package com.connectai.crm

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.connectai.crm.data.SessionVault
import com.connectai.crm.model.*
import com.connectai.crm.network.ConnectAiApiClient
import com.connectai.crm.ui.screens.*
import com.connectai.crm.ui.theme.*
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)

        val sessionVault = SessionVault(applicationContext)
        val apiClient = ConnectAiApiClient(sessionVault)

        setContent {
            ConnectAiCrmTheme {
                ConnectAiCrmAppRoot(
                    sessionVault = sessionVault,
                    apiClient = apiClient
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ConnectAiCrmAppRoot(
    sessionVault: SessionVault,
    apiClient: ConnectAiApiClient
) {
    val scope = rememberCoroutineScope()
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val snackbarHostState = remember { SnackbarHostState() }

    var activeDest by remember { mutableStateOf(NavDestination.OVERVIEW) }
    var isLoading by remember { mutableStateOf(true) }
    var isSignedOut by remember { mutableStateOf(sessionVault.isSignedOut) }
    var liveSnapshot by remember { mutableStateOf<CrmWorkspaceSnapshot?>(null) }
    var apiError by remember { mutableStateOf<ApiDiagnosticInfo?>(null) }

    var copilotResult by remember { mutableStateOf<AiCopilotResult?>(null) }
    var isRunningCopilot by remember { mutableStateOf(false) }
    var showNewLeadDialog by remember { mutableStateOf(false) }
    var showBackendConfigDialog by remember { mutableStateOf(false) }
    var retryAttemptCount by remember { mutableIntStateOf(0) }

    fun refreshWorkspace(showUserFeedback: Boolean = false) {
        scope.launch {
            isLoading = true
            if (showUserFeedback) {
                retryAttemptCount += 1
            }
            try {
                val updated = apiClient.fetchBootstrapWorkspace()
                liveSnapshot = updated
                apiError = null
                isLoading = false
                if (showUserFeedback) {
                    snackbarHostState.showSnackbar(
                        message = "Connected to Live API (${updated.activeTenant.name}) — HTTP 200 application/json",
                        duration = SnackbarDuration.Short
                    )
                }
            } catch (e: com.connectai.crm.network.BackendApiException) {
                apiError = e.diagnostic
                isLoading = false
                if (showUserFeedback) {
                    val diag = e.diagnostic
                    val statusLabel = if (diag.httpStatusCode > 0) "HTTP ${diag.httpStatusCode}" else "Network Error"
                    snackbarHostState.showSnackbar(
                        message = "Retry #$retryAttemptCount failed ($statusLabel · ${diag.contentType.ifBlank { "no content-type" }}): ${diag.errorSummary}",
                        duration = SnackbarDuration.Long
                    )
                }
            } catch (e: Exception) {
                val errMsg = e.message ?: "Unable to reach ConnectAI CRM backend."
                apiError = ApiDiagnosticInfo(
                    endpointUrl = "${sessionVault.backendBaseUrl}/api/bootstrap",
                    httpStatusCode = 0,
                    contentType = "none",
                    errorSummary = errMsg,
                    remediationHint = "Check internet connectivity and verify your HTTPS backend URL."
                )
                isLoading = false
            }
        }
    }

    LaunchedEffect(isSignedOut) {
        if (!isSignedOut) {
            refreshWorkspace(showUserFeedback = false)
        }
    }

    if (isSignedOut) {
        SignInScreen(
            initialBackendUrl = sessionVault.backendBaseUrl,
            onSignIn = { token, url ->
                sessionVault.backendBaseUrl = url
                sessionVault.signInWithToken(token)
                isSignedOut = false
            }
        )
        return
    }

    val currentSnapshot = liveSnapshot
    if (currentSnapshot == null) {
        Scaffold(
            snackbarHost = { SnackbarHost(snackbarHostState) },
            topBar = {
                TopAppBar(
                    title = {
                        Column {
                            Text(
                                text = "ConnectAI CRM",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Text(
                                text = if (isLoading) "CONNECTING TO LIVE BACKEND..." else "LIVE API CONNECTION ERROR",
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Monospace,
                                color = if (isLoading) Color(0xFF818CF8) else Color(0xFFFBBF24)
                            )
                        }
                    },
                    actions = {
                        IconButton(onClick = { refreshWorkspace(showUserFeedback = true) }) {
                            Icon(Icons.Default.Refresh, contentDescription = "Retry Live API", tint = Color.White)
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = Navy900)
                )
            }
        ) { innerPadding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Slate50)
                    .padding(innerPadding)
                    .padding(20.dp),
                contentAlignment = Alignment.Center
            ) {
                if (isLoading) {
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = Color.White,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            CircularProgressIndicator(color = Indigo600)
                            Text(
                                text = "Connecting to Live ConnectAI CRM Backend...",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = Navy900
                            )
                            Text(
                                text = "GET ${sessionVault.backendBaseUrl}/api/bootstrap",
                                fontSize = 11.sp,
                                fontFamily = FontFamily.Monospace,
                                color = Color(0xFF475569)
                            )
                        }
                    }
                } else {
                    val diag = apiError ?: ApiDiagnosticInfo(
                        endpointUrl = "${sessionVault.backendBaseUrl}/api/bootstrap",
                        errorSummary = "Live backend connection failed."
                    )
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = Color.White,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(20.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Text(
                                text = "Live Backend Connection Required",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = Rose600
                            )
                            Text(
                                text = diag.errorSummary,
                                fontSize = 13.sp,
                                color = Navy900
                            )
                            Text(
                                text = "Endpoint: ${diag.endpointUrl.ifBlank { "${sessionVault.backendBaseUrl}/api/bootstrap" }}",
                                fontSize = 11.sp,
                                fontFamily = FontFamily.Monospace,
                                color = Color(0xFF334155)
                            )
                            Text(
                                text = "HTTP Status: ${if (diag.httpStatusCode > 0) diag.httpStatusCode else "Network Error"} · Content-Type: ${diag.contentType.ifBlank { "none" }}",
                                fontSize = 11.sp,
                                fontFamily = FontFamily.Monospace,
                                color = Color(0xFF475569)
                            )
                            if (diag.remediationHint.isNotBlank()) {
                                Text(
                                    text = diag.remediationHint,
                                    fontSize = 12.sp,
                                    color = Color(0xFF92400E)
                                )
                            }
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Button(
                                    onClick = { refreshWorkspace(showUserFeedback = true) },
                                    colors = ButtonDefaults.buttonColors(containerColor = Indigo600),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Text("Retry Live API", fontSize = 12.sp)
                                }
                                OutlinedButton(
                                    onClick = { showBackendConfigDialog = true },
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Text("Configure URL", fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }
            }
        }

        if (showBackendConfigDialog) {
            BackendDiagnosticAndUrlDialog(
                currentBackendUrl = sessionVault.backendBaseUrl,
                diagnostic = apiError ?: ApiDiagnosticInfo(endpointUrl = "${sessionVault.backendBaseUrl}/api/bootstrap"),
                isLiveBackend = false,
                onTestUrl = { testUrl -> apiClient.testBackendConnectivity(testUrl) },
                onDismiss = { showBackendConfigDialog = false },
                onSaveAndRetry = { newUrl ->
                    sessionVault.backendBaseUrl = newUrl
                    showBackendConfigDialog = false
                    refreshWorkspace(showUserFeedback = true)
                }
            )
        }
        return
    }

    val snapshot = currentSnapshot

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(
                drawerContainerColor = Navy950,
                drawerContentColor = Color.White
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxHeight()
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = "CONNECTAI CRM",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Text(
                        text = snapshot.activeTenant.name,
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        color = Color(0xFF818CF8)
                    )
                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = Navy800)

                    NavDestination.entries.forEach { dest ->
                        val selected = activeDest == dest
                        val iconTint = if (selected) Color.White else destinationAccentColor(dest)
                        NavigationDrawerItem(
                            icon = {
                                Icon(
                                    imageVector = destinationIcon(dest),
                                    contentDescription = dest.label,
                                    tint = iconTint
                                )
                            },
                            label = { Text(dest.label, fontSize = 13.sp) },
                            selected = selected,
                            onClick = {
                                activeDest = dest
                                scope.launch { drawerState.close() }
                            },
                            colors = NavigationDrawerItemDefaults.colors(
                                selectedContainerColor = Indigo600,
                                selectedTextColor = Color.White,
                                unselectedContainerColor = Color.Transparent,
                                unselectedTextColor = Color(0xFFCBD5E1)
                            )
                        )
                    }
                }
            }
        }
    ) {
        Scaffold(
            snackbarHost = { SnackbarHost(snackbarHostState) },
            topBar = {
                Column {
                    TopAppBar(
                        title = {
                            Column {
                                Text(
                                    text = activeDest.label,
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Text(
                                    text = "LIVE CLOUD SQL · ${snapshot.activeTenant.name}",
                                    fontSize = 10.sp,
                                    fontFamily = FontFamily.Monospace,
                                    color = Color(0xFF34D399)
                                )
                            }
                        },
                        navigationIcon = {
                            IconButton(onClick = { scope.launch { drawerState.open() } }) {
                                Icon(Icons.Default.Menu, contentDescription = "Open Menu", tint = Color.White)
                            }
                        },
                        actions = {
                            IconButton(onClick = { refreshWorkspace(showUserFeedback = true) }) {
                                Icon(Icons.Default.Refresh, contentDescription = "Refresh Live API", tint = Color.White)
                            }
                            IconButton(onClick = { showNewLeadDialog = true }) {
                                Icon(Icons.Default.Add, contentDescription = "Add Lead", tint = Color.White)
                            }
                        },
                        colors = TopAppBarDefaults.topAppBarColors(containerColor = Navy900)
                    )
                    if (isLoading) {
                        LinearProgressIndicator(
                            modifier = Modifier.fillMaxWidth(),
                            color = Indigo600,
                            trackColor = Navy800
                        )
                    }
                    val activeErr = apiError
                    if (activeErr != null) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFFFEF3C7))
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(
                                text = "SYNC WARNING — ${activeErr.errorSummary}",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color(0xFF92400E)
                            )
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.End,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                TextButton(onClick = { showBackendConfigDialog = true }) {
                                    Text("Set API URL / Diagnostics", fontSize = 11.sp, color = Indigo600)
                                }
                                TextButton(
                                    onClick = { refreshWorkspace(showUserFeedback = true) },
                                    enabled = !isLoading
                                ) {
                                    Text(
                                        text = if (isLoading) "Retrying Live API..." else "Retry Live API",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF92400E)
                                    )
                                }
                            }
                        }
                    }
                }
            },
            bottomBar = {
                NavigationBar(containerColor = Navy950, contentColor = Color.White) {
                    listOf(
                        NavDestination.OVERVIEW to Icons.Default.Home,
                        NavDestination.UNIFIED_INBOX to Icons.Default.Email,
                        NavDestination.RECRUITMENT_PIPELINE to Icons.Default.List,
                        NavDestination.AI_COPILOT to Icons.Default.Star,
                        NavDestination.LEAD_CENTER to Icons.Default.Person
                    ).forEach { (dest, icon) ->
                        NavigationBarItem(
                            selected = activeDest == dest,
                            onClick = { activeDest = dest },
                            icon = { Icon(icon, contentDescription = dest.label) },
                            label = { Text(dest.label.split(" ").first(), fontSize = 10.sp) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = Color.White,
                                selectedTextColor = Color(0xFF818CF8),
                                indicatorColor = Indigo600,
                                unselectedIconColor = Color(0xFF94A3B8),
                                unselectedTextColor = Color(0xFF94A3B8)
                            )
                        )
                    }
                }
            }
        ) { innerPadding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Slate50)
                    .padding(innerPadding)
            ) {
                when (activeDest) {
                    NavDestination.OVERVIEW -> OverviewScreen(
                        snapshot = snapshot,
                        onOpenNewLeadDialog = { showNewLeadDialog = true },
                        onNavigate = { activeDest = it },
                        onRetryLiveApi = { refreshWorkspace(showUserFeedback = true) },
                        onOpenBackendConfig = { showBackendConfigDialog = true }
                    )

                    NavDestination.LEAD_CENTER -> LeadCenterScreen(
                        snapshot = snapshot,
                        onCreateContact = { name, phone, email, company, channel, reqs ->
                            scope.launch {
                                runCatching {
                                    apiClient.createContact(name, phone, email, company, channel, reqs)
                                    refreshWorkspace()
                                    snackbarHostState.showSnackbar("Saved contact $name")
                                }.onFailure {
                                    snackbarHostState.showSnackbar(it.message ?: "Failed to create contact")
                                }
                            }
                        },
                        onMergeDuplicates = { primId, dupId ->
                            scope.launch {
                                runCatching {
                                    apiClient.mergeDuplicateContacts(primId, dupId)
                                    refreshWorkspace()
                                    snackbarHostState.showSnackbar("Merged duplicate contacts & recorded audit trail")
                                }.onFailure {
                                    snackbarHostState.showSnackbar(it.message ?: "Merge failed")
                                }
                            }
                        },
                        onOpenNewLeadDialog = { showNewLeadDialog = true }
                    )

                    NavDestination.UNIFIED_INBOX -> UnifiedInboxScreen(
                        snapshot = snapshot,
                        onSendMessage = { convId, text, dir ->
                            scope.launch {
                                runCatching {
                                    apiClient.sendInboxMessage(convId, text, dir)
                                    refreshWorkspace()
                                }.onFailure {
                                    snackbarHostState.showSnackbar(it.message ?: "Send failed")
                                }
                            }
                        },
                        onGenerateAiDraft = { convId ->
                            scope.launch {
                                runCatching {
                                    apiClient.generateConversationAiDraft(convId)
                                    refreshWorkspace()
                                    snackbarHostState.showSnackbar("Generated grounded Gemini reply draft")
                                }.onFailure {
                                    snackbarHostState.showSnackbar(it.message ?: "AI draft failed")
                                }
                            }
                        }
                    )

                    NavDestination.AI_COPILOT -> AiCopilotScreen(
                        snapshot = snapshot,
                        copilotResult = copilotResult,
                        isRunningCopilot = isRunningCopilot,
                        onRunCopilot = { action, prompt ->
                            scope.launch {
                                isRunningCopilot = true
                                runCatching {
                                    copilotResult = apiClient.runAiCopilot(action, prompt)
                                    refreshWorkspace()
                                }.onFailure {
                                    snackbarHostState.showSnackbar(it.message ?: "AI Copilot request failed")
                                }
                                isRunningCopilot = false
                            }
                        }
                    )

                    NavDestination.WHATSAPP_CHANNELS -> WhatsAppChannelsScreen(
                        snapshot = snapshot,
                        onConnectChannel = { phone, name, type, phoneId ->
                            scope.launch {
                                runCatching {
                                    apiClient.connectChannel(phone, name, type, phoneId)
                                    refreshWorkspace()
                                    snackbarHostState.showSnackbar("Registered $name ($type)")
                                }.onFailure {
                                    snackbarHostState.showSnackbar(it.message ?: "Channel registration failed")
                                }
                            }
                        },
                        onSimulateWebhook = { name, phone, type, msg ->
                            scope.launch {
                                runCatching {
                                    apiClient.simulateInboundWebhook(name, phone, type, msg)
                                    refreshWorkspace()
                                    snackbarHostState.showSnackbar("Processed inbound message via 12-Step AI Engine")
                                }.onFailure {
                                    snackbarHostState.showSnackbar(it.message ?: "Simulation failed")
                                }
                            }
                        }
                    )

                    NavDestination.CAMPAIGN_STUDIO -> CampaignStudioScreen(
                        snapshot = snapshot,
                        onCreateCampaign = { ch, name, obj, copy, budget ->
                            scope.launch {
                                runCatching {
                                    apiClient.createCampaignBoost(ch, name, obj, copy, budget)
                                    refreshWorkspace()
                                    snackbarHostState.showSnackbar("Created campaign $name")
                                }.onFailure {
                                    snackbarHostState.showSnackbar(it.message ?: "Campaign creation failed")
                                }
                            }
                        }
                    )

                    NavDestination.RECRUITMENT_PIPELINE -> RecruitmentPipelineScreen(
                        snapshot = snapshot,
                        onUpdateLeadStage = { id, stage ->
                            scope.launch {
                                runCatching {
                                    apiClient.updateLeadStage(id, stage)
                                    refreshWorkspace()
                                    snackbarHostState.showSnackbar("Moved candidate to $stage")
                                }.onFailure {
                                    snackbarHostState.showSnackbar(it.message ?: "Stage update failed")
                                }
                            }
                        },
                        onArchiveLead = { id, arch ->
                            scope.launch {
                                runCatching {
                                    apiClient.archiveLead(id, arch)
                                    refreshWorkspace()
                                }.onFailure {
                                    snackbarHostState.showSnackbar(it.message ?: "Archive update failed")
                                }
                            }
                        },
                        onDeleteLead = { id ->
                            scope.launch {
                                runCatching {
                                    apiClient.deleteLead(id)
                                    refreshWorkspace()
                                    snackbarHostState.showSnackbar("Deleted candidate record")
                                }.onFailure {
                                    snackbarHostState.showSnackbar(it.message ?: "Delete restricted by RBAC")
                                }
                            }
                        },
                        onOpenNewLeadDialog = { showNewLeadDialog = true }
                    )

                    NavDestination.FOLLOW_UP_TASKS -> FollowUpTasksScreen(
                        snapshot = snapshot,
                        onCreateTask = { title, contact, due, prio ->
                            scope.launch {
                                runCatching {
                                    apiClient.createTask(title, contact, due, prio)
                                    refreshWorkspace()
                                    snackbarHostState.showSnackbar("Saved task: $title")
                                }.onFailure {
                                    snackbarHostState.showSnackbar(it.message ?: "Task creation failed")
                                }
                            }
                        },
                        onToggleTask = { id ->
                            scope.launch {
                                runCatching {
                                    apiClient.toggleTask(id)
                                    refreshWorkspace()
                                }
                            }
                        },
                        onCreateAppointment = { contact, title, at, ch ->
                            scope.launch {
                                runCatching {
                                    apiClient.createAppointment(contact, title, at, ch)
                                    refreshWorkspace()
                                    snackbarHostState.showSnackbar("Booked interview with $contact")
                                }.onFailure {
                                    snackbarHostState.showSnackbar(it.message ?: "Booking failed")
                                }
                            }
                        }
                    )

                    NavDestination.TEAM_PERFORMANCE -> TeamPerformanceScreen(
                        snapshot = snapshot,
                        onInviteStaff = { email, role, dept ->
                            scope.launch {
                                runCatching {
                                    apiClient.inviteStaffMember(email, role, dept)
                                    refreshWorkspace()
                                    snackbarHostState.showSnackbar("Invited $email")
                                }.onFailure {
                                    snackbarHostState.showSnackbar(it.message ?: "Invite failed")
                                }
                            }
                        },
                        onUpdateRbacRole = { role, allowExp ->
                            scope.launch {
                                runCatching {
                                    apiClient.updateSessionRbacRole(role, allowExp)
                                    refreshWorkspace()
                                    snackbarHostState.showSnackbar("Updated active RBAC role to $role")
                                }.onFailure {
                                    snackbarHostState.showSnackbar(it.message ?: "RBAC update failed")
                                }
                            }
                        }
                    )

                    NavDestination.ANALYTICS_REPORTS -> AnalyticsReportsScreen(snapshot = snapshot)

                    NavDestination.INTEGRATIONS -> IntegrationsScreen(snapshot = snapshot)

                    NavDestination.SETTINGS_SECURITY -> SettingsSecurityScreen(
                        snapshot = snapshot,
                        backendUrl = sessionVault.backendBaseUrl,
                        onUpdateBackendUrl = { newUrl ->
                            sessionVault.backendBaseUrl = newUrl
                            refreshWorkspace(showUserFeedback = true)
                        },
                        onSwitchTenant = { slug ->
                            sessionVault.activeTenantSlug = slug
                            refreshWorkspace(showUserFeedback = true)
                        },
                        onToggleEmergencyPause = { pause ->
                            scope.launch {
                                runCatching {
                                    apiClient.updateTenantSettings(
                                        name = snapshot.activeTenant.name,
                                        timezone = snapshot.activeTenant.timezone,
                                        emergencyPause = pause,
                                        aiDisclosureEnabled = snapshot.activeTenant.aiDisclosureEnabled
                                    )
                                    refreshWorkspace(showUserFeedback = true)
                                }
                            }
                        },
                        onSignOut = {
                            sessionVault.signOutAndClearSession()
                            isSignedOut = true
                        }
                    )

                    NavDestination.HELP_USER_GUIDE -> HelpUserGuideScreen(
                        snapshot = snapshot,
                        backendUrl = sessionVault.backendBaseUrl,
                        onOpenBackendConfig = { showBackendConfigDialog = true },
                        onNavigate = { activeDest = it }
                    )
                }
            }
        }
    }

    if (showBackendConfigDialog) {
        BackendDiagnosticAndUrlDialog(
            currentBackendUrl = sessionVault.backendBaseUrl,
            diagnostic = snapshot.apiDiagnostic,
            isLiveBackend = snapshot.isLiveBackend,
            onTestUrl = { testUrl -> apiClient.testBackendConnectivity(testUrl) },
            onDismiss = { showBackendConfigDialog = false },
            onSaveAndRetry = { newUrl ->
                sessionVault.backendBaseUrl = newUrl
                showBackendConfigDialog = false
                refreshWorkspace(showUserFeedback = true)
            }
        )
    }

    if (showNewLeadDialog) {
        NewLeadCandidateDialog(
            onDismiss = { showNewLeadDialog = false },
            onSave = { title, name, phone, email, nat, job, dest, ch, stage, value, notes ->
                scope.launch {
                    runCatching {
                        apiClient.createLeadOrCandidate(
                            title = title,
                            contactName = name,
                            phone = phone,
                            email = email,
                            nationality = nat,
                            preferredJob = job,
                            destinationCountry = dest,
                            sourceChannel = ch,
                            stage = stage,
                            estimatedValueUsd = value,
                            notes = notes
                        )
                        showNewLeadDialog = false
                        refreshWorkspace(showUserFeedback = true)
                        snackbarHostState.showSnackbar("Added $name to Recruitment Pipeline")
                    }.onFailure {
                        snackbarHostState.showSnackbar(it.message ?: "Failed to save candidate")
                    }
                }
            }
        )
    }
}

@Composable
fun BackendDiagnosticAndUrlDialog(
    currentBackendUrl: String,
    diagnostic: ApiDiagnosticInfo,
    isLiveBackend: Boolean,
    onTestUrl: suspend (String) -> ApiDiagnosticInfo,
    onDismiss: () -> Unit,
    onSaveAndRetry: (String) -> Unit
) {
    val scope = rememberCoroutineScope()
    var urlInput by remember(currentBackendUrl) { mutableStateOf(currentBackendUrl) }
    var activeDiag by remember(diagnostic) { mutableStateOf(diagnostic) }
    var isTesting by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = if (isLiveBackend) "Live Backend Connection Verified" else "Backend API Diagnostics & Configuration",
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp
            )
        },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "Endpoint: ${activeDiag.endpointUrl.ifBlank { "$currentBackendUrl/api/bootstrap" }}",
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace,
                    color = Navy900
                )
                Text(
                    text = "HTTP Status: ${if (activeDiag.httpStatusCode > 0) activeDiag.httpStatusCode else "Unreachable"} · Content-Type: ${activeDiag.contentType.ifBlank { "none" }}${if (activeDiag.latencyMs > 0) " · ${activeDiag.latencyMs}ms" else ""}",
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace,
                    color = if (activeDiag.httpStatusCode == 200 && activeDiag.contentType.contains("json")) Emerald600 else Rose600
                )
                if (activeDiag.errorSummary.isNotBlank()) {
                    Text(
                        text = "Result: ${activeDiag.errorSummary}",
                        fontSize = 12.sp,
                        color = Color(0xFF334155)
                    )
                }
                if (activeDiag.remediationHint.isNotBlank()) {
                    Text(
                        text = "How to Fix: ${activeDiag.remediationHint}",
                        fontSize = 11.sp,
                        color = Color(0xFF92400E)
                    )
                }
                OutlinedTextField(
                    value = urlInput,
                    onValueChange = { urlInput = it },
                    label = { Text("Public Cloud Run HTTPS Backend URL") },
                    placeholder = { Text("https://your-service-name.europe-west2.run.app") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                OutlinedButton(
                    onClick = {
                        scope.launch {
                            isTesting = true
                            activeDiag = onTestUrl(urlInput)
                            isTesting = false
                        }
                    },
                    enabled = !isTesting,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(if (isTesting) "Testing /api/bootstrap..." else "Test URL (/api/bootstrap)")
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onSaveAndRetry(urlInput) },
                colors = ButtonDefaults.buttonColors(containerColor = Indigo600)
            ) {
                Text("Save & Retry Live API")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Close")
            }
        }
    )
}

@Composable
fun NewLeadCandidateDialog(
    onDismiss: () -> Unit,
    onSave: (String, String, String, String, String, String, String, String, String, String, String) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var nationality by remember { mutableStateOf("") }
    var preferredJob by remember { mutableStateOf("") }
    var destinationCountry by remember { mutableStateOf("") }
    var sourceChannel by remember { mutableStateOf("whatsapp") }
    var stage by remember { mutableStateOf("New Lead") }
    var valueUsd by remember { mutableStateOf("4500") }
    var notes by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("+ Add Candidate or Business Lead", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Candidate / Contact Name *") }, singleLine = true)
                OutlinedTextField(value = phone, onValueChange = { phone = it }, label = { Text("Phone / WhatsApp Number") }, singleLine = true)
                OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Email Address") }, singleLine = true)
                OutlinedTextField(value = nationality, onValueChange = { nationality = it }, label = { Text("Nationality") }, singleLine = true)
                OutlinedTextField(value = preferredJob, onValueChange = { preferredJob = it }, label = { Text("Preferred Job / Role") }, singleLine = true)
                OutlinedTextField(value = destinationCountry, onValueChange = { destinationCountry = it }, label = { Text("Destination Country") }, singleLine = true)
                OutlinedTextField(value = valueUsd, onValueChange = { valueUsd = it }, label = { Text("Placement Value (USD)") }, singleLine = true)
                OutlinedTextField(value = notes, onValueChange = { notes = it }, label = { Text("Qualifications & Notes") })
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (name.isNotBlank()) {
                        onSave(
                            "$name — ${preferredJob.ifBlank { "Placement" }}",
                            name,
                            phone,
                            email,
                            nationality,
                            preferredJob,
                            destinationCountry,
                            sourceChannel,
                            stage,
                            valueUsd,
                            notes
                        )
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = Indigo600)
            ) {
                Text("Save to Workspace")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

@Composable
fun SignInScreen(
    initialBackendUrl: String,
    onSignIn: (String, String) -> Unit
) {
    var backendUrl by remember { mutableStateOf(initialBackendUrl) }
    var sessionToken by remember { mutableStateOf("demo-session-token") }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Navy950)
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Surface(
            shape = RoundedCornerShape(18.dp),
            color = Color.White,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(22.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text("ConnectAI CRM — Android", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = Navy900)
                Text(
                    "Sign in to your isolated Cloud SQL PostgreSQL workspace over HTTPS.",
                    fontSize = 12.sp,
                    color = Color(0xFF64748B)
                )
                OutlinedTextField(
                    value = backendUrl,
                    onValueChange = { backendUrl = it },
                    label = { Text("Production HTTPS Backend URL") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                OutlinedTextField(
                    value = sessionToken,
                    onValueChange = { sessionToken = it },
                    label = { Text("Firebase ID Token or Workspace Session Token") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                Button(
                    onClick = { onSignIn(sessionToken, backendUrl) },
                    colors = ButtonDefaults.buttonColors(containerColor = Indigo600),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Sign In to ConnectAI Workspace")
                }
            }
        }
    }
}
