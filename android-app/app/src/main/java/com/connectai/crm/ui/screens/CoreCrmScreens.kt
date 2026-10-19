package com.connectai.crm.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.connectai.crm.model.*
import com.connectai.crm.ui.theme.*
import java.text.NumberFormat
import java.util.Locale

// ---------------------------------------------------------------------------
// 1. OVERVIEW DASHBOARD SCREEN
// ---------------------------------------------------------------------------
@Composable
fun OverviewScreen(
    snapshot: CrmWorkspaceSnapshot,
    onOpenNewLeadDialog: () -> Unit,
    onNavigate: (NavDestination) -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    var stageFilter by remember { mutableStateOf("All") }

    val activeLeads = snapshot.leads.filter { !it.isArchived }
    val filteredLeads = activeLeads.filter { lead ->
        val matchesStage = stageFilter == "All" || lead.stage.equals(stageFilter, ignoreCase = true)
        val matchesSearch = searchQuery.isBlank() ||
            lead.contactName.contains(searchQuery, ignoreCase = true) ||
            lead.title.contains(searchQuery, ignoreCase = true) ||
            lead.destinationCountry.contains(searchQuery, ignoreCase = true)
        matchesStage && matchesSearch
    }

    val qualifiedStages = setOf("Qualified", "Employer Review", "Offer", "Visa Process", "Deployed", "Won")
    val convertedStages = setOf("Offer", "Visa Process", "Deployed", "Won")
    val qualifiedLeads = filteredLeads.filter { it.stage in qualifiedStages }
    val convertedLeads = filteredLeads.filter { it.stage in convertedStages }
    val pipelineValue = qualifiedLeads.sumOf { it.estimatedValueUsd }
    val conversionRate = if (filteredLeads.isNotEmpty()) {
        (convertedLeads.size * 100) / filteredLeads.size
    } else 0
    val pendingTasks = snapshot.tasks.count { it.status != "completed" }
    val currencyFmt = NumberFormat.getCurrencyInstance(Locale.US).apply { maximumFractionDigits = 0 }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            ExecutiveHeroBanner(
                eyebrow = "YOUR BUSINESS AT A GLANCE · ${snapshot.activeTenant.name}",
                title = "Welcome to ConnectAI, ${snapshot.user.name}",
                subtitle = "Your intelligent Android workspace for leads, conversations, international recruitment, and growth.",
                primaryActionText = "+ Add New Lead",
                onPrimaryAction = onOpenNewLeadDialog,
                secondaryActionText = "Open Unified Inbox (${snapshot.conversations.size})",
                onSecondaryAction = { onNavigate(NavDestination.UNIFIED_INBOX) }
            )
        }

        item {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                label = { Text("Search leads, candidates, or countries...", fontSize = 12.sp) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
        }

        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                (listOf("All") + RECRUITMENT_STAGES).forEach { stage ->
                    FilterChip(
                        selected = stageFilter == stage,
                        onClick = { stageFilter = stage },
                        label = { Text(stage, fontSize = 11.sp) }
                    )
                }
            }
        }

        // 6 Executive KPI Cards (2-column grid for mobile phones)
        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    KpiMetricCard(
                        title = "Total Leads",
                        value = "${filteredLeads.size}",
                        subtitle = "${snapshot.contacts.size} CRM Contacts",
                        accentColor = Indigo600,
                        modifier = Modifier.weight(1f)
                    )
                    KpiMetricCard(
                        title = "Active Threads",
                        value = "${snapshot.conversations.size}",
                        subtitle = "${snapshot.conversations.sumOf { it.unreadCount }} unread msgs",
                        accentColor = ElectricBlue600,
                        modifier = Modifier.weight(1f)
                    )
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    KpiMetricCard(
                        title = "Qualified Leads",
                        value = "${qualifiedLeads.size}",
                        subtitle = "Ready for next stage",
                        accentColor = Violet600,
                        modifier = Modifier.weight(1f)
                    )
                    KpiMetricCard(
                        title = "Pipeline Value",
                        value = currencyFmt.format(pipelineValue),
                        subtitle = "Qualified opportunities",
                        accentColor = Emerald600,
                        modifier = Modifier.weight(1f)
                    )
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    KpiMetricCard(
                        title = "Follow-ups Due",
                        value = "$pendingTasks",
                        subtitle = "${snapshot.appointments.size} interviews booked",
                        accentColor = Amber600,
                        modifier = Modifier.weight(1f)
                    )
                    KpiMetricCard(
                        title = "Conversion Rate",
                        value = "$conversionRate%",
                        subtitle = "${convertedLeads.size} Offer/Visa/Deployed",
                        accentColor = Emerald600,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        item {
            Text(
                text = "Recent Candidates & Business Opportunities",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = Navy900
            )
        }

        items(filteredLeads.take(8), key = { it.id }) { lead ->
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = Color.White,
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(12.dp))
                    .clickable { onNavigate(NavDestination.RECRUITMENT_PIPELINE) }
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = lead.contactName,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = Navy900
                        )
                        StatusPill(text = lead.stage, color = Indigo600)
                    }
                    Text(
                        text = "${lead.preferredJob.ifBlank { lead.title }} · ${lead.destinationCountry.ifBlank { "Global" }}",
                        fontSize = 12.sp,
                        color = Color(0xFF475569)
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Channel: ${lead.sourceChannel.uppercase()} · Score: ${lead.leadScore}/100",
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace,
                            color = Color(0xFF64748B)
                        )
                        Text(
                            text = currencyFmt.format(lead.estimatedValueUsd),
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            color = Emerald600
                        )
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// 2. LEAD CENTER SCREEN (Contacts, Lead Status & Duplicate Consolidation)
// ---------------------------------------------------------------------------
@Composable
fun LeadCenterScreen(
    snapshot: CrmWorkspaceSnapshot,
    onCreateContact: (String, String, String, String, String, String) -> Unit,
    onMergeDuplicates: (Int, Int) -> Unit,
    onOpenNewLeadDialog: () -> Unit
) {
    var search by remember { mutableStateOf("") }
    var channelFilter by remember { mutableStateOf("all") }
    var showAddContact by remember { mutableStateOf(false) }

    var newName by remember { mutableStateOf("") }
    var newPhone by remember { mutableStateOf("") }
    var newEmail by remember { mutableStateOf("") }
    var newCompany by remember { mutableStateOf("") }
    var newChannel by remember { mutableStateOf("whatsapp") }
    var newReqs by remember { mutableStateOf("") }

    val filteredContacts = snapshot.contacts.filter { c ->
        val matchesChannel = channelFilter == "all" || c.sourceChannel.contains(channelFilter, ignoreCase = true)
        val matchesSearch = search.isBlank() ||
            c.name.contains(search, ignoreCase = true) ||
            c.phone.contains(search, ignoreCase = true) ||
            c.email.contains(search, ignoreCase = true) ||
            c.company.contains(search, ignoreCase = true)
        matchesChannel && matchesSearch
    }

    // Detect duplicate pairs by normalized phone or email
    val duplicatePairs = remember(snapshot.contacts) {
        val pairs = mutableListOf<Pair<ContactRecord, ContactRecord>>()
        val list = snapshot.contacts
        for (i in list.indices) {
            for (j in i + 1 until list.size) {
                val a = list[i]
                val b = list[j]
                val phoneA = a.phone.filter { it.isDigit() }
                val phoneB = b.phone.filter { it.isDigit() }
                val samePhone = phoneA.length >= 7 && phoneA == phoneB
                val sameEmail = a.email.isNotBlank() && a.email.equals(b.email, ignoreCase = true)
                if (samePhone || sameEmail) {
                    pairs.add(a to b)
                }
            }
        }
        pairs
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Lead Center & Contacts", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Navy900)
                    Text("${filteredContacts.size} verified records · Mobile card layout", fontSize = 12.sp, color = Color(0xFF64748B))
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = { showAddContact = !showAddContact },
                        colors = ButtonDefaults.buttonColors(containerColor = Indigo600)
                    ) {
                        Text("+ Contact", fontSize = 12.sp)
                    }
                    OutlinedButton(onClick = onOpenNewLeadDialog) {
                        Text("+ Candidate", fontSize = 12.sp)
                    }
                }
            }
        }

        if (showAddContact) {
            item {
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = Color.White,
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, Indigo500, RoundedCornerShape(14.dp))
                ) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text("Create New CRM Contact", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        OutlinedTextField(
                            value = newName,
                            onValueChange = { newName = it },
                            label = { Text("Full Name *") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = newPhone,
                            onValueChange = { newPhone = it },
                            label = { Text("Phone / WhatsApp Number *") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = newEmail,
                            onValueChange = { newEmail = it },
                            label = { Text("Email Address") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = newCompany,
                            onValueChange = { newCompany = it },
                            label = { Text("Employer / Company") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = newReqs,
                            onValueChange = { newReqs = it },
                            label = { Text("Candidate / Lead Requirements Summary") },
                            modifier = Modifier.fillMaxWidth()
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(
                                onClick = {
                                    if (newName.isNotBlank() && newPhone.isNotBlank()) {
                                        onCreateContact(newName, newPhone, newEmail, newCompany, newChannel, newReqs)
                                        newName = ""
                                        newPhone = ""
                                        newEmail = ""
                                        newCompany = ""
                                        newReqs = ""
                                        showAddContact = false
                                    }
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Indigo600)
                            ) {
                                Text("Save Contact to PostgreSQL")
                            }
                            TextButton(onClick = { showAddContact = false }) {
                                Text("Cancel")
                            }
                        }
                    }
                }
            }
        }

        // Duplicate Contact Detection & Merge Section
        if (duplicatePairs.isNotEmpty()) {
            item {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xFFFFFBEB),
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, Color(0xFFFDE68A), RoundedCornerShape(12.dp))
                ) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "Detected Duplicate Contacts (${duplicatePairs.size})",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = Color(0xFF92400E)
                        )
                        duplicatePairs.forEach { (primary, duplicate) ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = "${primary.name} (#${primary.id}) ⇄ ${duplicate.name} (#${duplicate.id})",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Navy900
                                    )
                                    Text(
                                        text = "Shared: ${primary.phone} · ${primary.email}",
                                        fontSize = 11.sp,
                                        color = Color(0xFF78350F)
                                    )
                                }
                                Button(
                                    onClick = { onMergeDuplicates(primary.id, duplicate.id) },
                                    colors = ButtonDefaults.buttonColors(containerColor = Amber600)
                                ) {
                                    Text("Merge Records", fontSize = 11.sp)
                                }
                            }
                        }
                    }
                }
            }
        }

        item {
            OutlinedTextField(
                value = search,
                onValueChange = { search = it },
                label = { Text("Search name, phone, email, or company...", fontSize = 12.sp) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
        }

        item {
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf("all", "whatsapp", "instagram", "facebook", "tiktok").forEach { ch ->
                    FilterChip(
                        selected = channelFilter == ch,
                        onClick = { channelFilter = ch },
                        label = { Text(ch.uppercase(), fontSize = 11.sp) }
                    )
                }
            }
        }

        items(filteredContacts, key = { it.id }) { contact ->
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = Color.White,
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(14.dp))
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(contact.name, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Navy900)
                        StatusPill(text = contact.sourceChannel.uppercase(), color = Indigo600)
                    }
                    Text(
                        text = "${contact.phone} · ${contact.email.ifBlank { "No email" }}",
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace,
                        color = Color(0xFF334155)
                    )
                    if (contact.company.isNotBlank()) {
                        Text("Company: ${contact.company} · Owner: ${contact.assignedEmployee}", fontSize = 12.sp, color = Color(0xFF475569))
                    }
                    if (contact.requirementsSummary.isNotBlank()) {
                        Text(contact.requirementsSummary, fontSize = 12.sp, color = Color(0xFF475569))
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// 3. UNIFIED INBOX SCREEN (Omnichannel Messaging & AI Reply Drafting)
// ---------------------------------------------------------------------------
@Composable
fun UnifiedInboxScreen(
    snapshot: CrmWorkspaceSnapshot,
    onSendMessage: (Int, String, String) -> Unit,
    onGenerateAiDraft: (Int) -> Unit
) {
    var selectedConvId by remember {
        mutableStateOf(snapshot.conversations.firstOrNull()?.id ?: 0)
    }
    var replyText by remember { mutableStateOf("") }
    var isInternalNote by remember { mutableStateOf(false) }

    val activeConv = snapshot.conversations.find { it.id == selectedConvId }
        ?: snapshot.conversations.firstOrNull()
    val threadMessages = snapshot.messages.filter { it.conversationId == activeConv?.id }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Unified Omnichannel Inbox", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Navy900)

        // Horizontal Selector of Active Conversations on Mobile
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            snapshot.conversations.forEach { conv ->
                val selected = conv.id == activeConv?.id
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = if (selected) Navy900 else Color.White,
                    modifier = Modifier
                        .border(
                            1.dp,
                            if (selected) Indigo600 else Color(0xFFE2E8F0),
                            RoundedCornerShape(10.dp)
                        )
                        .clickable {
                            selectedConvId = conv.id
                            if (conv.suggestedReply.isNotBlank() && replyText.isBlank()) {
                                replyText = conv.suggestedReply
                            }
                        }
                ) {
                    Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
                        Text(
                            text = conv.customerName,
                            color = if (selected) Color.White else Navy900,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp
                        )
                        Text(
                            text = "${conv.channelType.uppercase()} · ${conv.status}",
                            color = if (selected) Color(0xFF94A3B8) else Color(0xFF64748B),
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                }
            }
        }

        if (activeConv == null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No active conversations yet. Use WhatsApp & Channels to simulate or connect a line.")
            }
        } else {
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = Color.White,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(14.dp))
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(activeConv.customerName, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text(
                                "${activeConv.customerHandleOrPhone} · Mode: ${activeConv.handlingMode}",
                                fontSize = 11.sp,
                                color = Color(0xFF64748B)
                            )
                        }
                        OutlinedButton(onClick = { onGenerateAiDraft(activeConv.id) }) {
                            Text("✨ AI Draft Reply", fontSize = 11.sp)
                        }
                    }

                    if (activeConv.aiSummary.isNotBlank()) {
                        Surface(
                            color = Color(0xFFEEF2FF),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 6.dp)
                        ) {
                            Column(modifier = Modifier.padding(8.dp)) {
                                Text("AI Summary: ${activeConv.aiSummary}", fontSize = 11.sp, color = Color(0xFF1E1B4B))
                                if (activeConv.suggestedReply.isNotBlank()) {
                                    TextButton(onClick = { replyText = activeConv.suggestedReply }) {
                                        Text("Use Suggested Reply", fontSize = 11.sp)
                                    }
                                }
                            }
                        }
                    }

                    HorizontalDivider(modifier = Modifier.padding(vertical = 6.dp))

                    LazyColumn(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(threadMessages, key = { it.id }) { msg ->
                            val isOutbound = msg.direction != "inbound"
                            val bubbleColor = when {
                                msg.direction == "internal_note" -> Color(0xFFFEF3C7)
                                isOutbound -> Indigo600
                                else -> Slate100
                            }
                            val textColor = if (isOutbound && msg.direction != "internal_note") Color.White else Navy900
                            Column(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalAlignment = if (isOutbound) Alignment.End else Alignment.Start
                            ) {
                                Surface(
                                    color = bubbleColor,
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Column(modifier = Modifier.padding(10.dp)) {
                                        Text(
                                            text = "${msg.senderName} (${msg.deliveryStatus})",
                                            fontSize = 10.sp,
                                            color = textColor.copy(alpha = 0.75f)
                                        )
                                        Text(text = msg.content, fontSize = 13.sp, color = textColor)
                                    }
                                }
                            }
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        FilterChip(
                            selected = isInternalNote,
                            onClick = { isInternalNote = !isInternalNote },
                            label = { Text(if (isInternalNote) "Internal Note" else "Reply", fontSize = 11.sp) }
                        )
                        OutlinedTextField(
                            value = replyText,
                            onValueChange = { replyText = it },
                            placeholder = { Text("Type message or internal note...", fontSize = 12.sp) },
                            modifier = Modifier.weight(1f),
                            singleLine = true
                        )
                        Button(
                            onClick = {
                                if (replyText.isNotBlank()) {
                                    onSendMessage(
                                        activeConv.id,
                                        replyText,
                                        if (isInternalNote) "internal_note" else "outbound"
                                    )
                                    replyText = ""
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Indigo600)
                        ) {
                            Text("Send", fontSize = 12.sp)
                        }
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// 4. AI COPILOT SCREEN (Recruitment & Sales Grounded Intelligence)
// ---------------------------------------------------------------------------
@Composable
fun AiCopilotScreen(
    snapshot: CrmWorkspaceSnapshot,
    copilotResult: AiCopilotResult?,
    isRunningCopilot: Boolean,
    onRunCopilot: (String, String) -> Unit
) {
    var selectedAction by remember { mutableStateOf("candidate_qualification") }
    var customPrompt by remember {
        mutableStateOf("Evaluate candidate suitability for UK/EU healthcare & engineering roles and draft WhatsApp follow-up.")
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            ExecutiveHeroBanner(
                eyebrow = "SERVER-SIDE GEMINI AI COPILOT",
                title = "AI Recruitment & Sales Copilot",
                subtitle = "Grounded strictly in your PostgreSQL candidate records, active conversations, and approved company Knowledge Base."
            )
        }

        item {
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf(
                    "candidate_qualification" to "Candidate Qualification",
                    "executive_briefing" to "Executive Daily Briefing",
                    "whatsapp_followup" to "Draft WhatsApp Follow-Ups",
                    "pipeline_bottlenecks" to "Pipeline Bottleneck Audit"
                ).forEach { (key, label) ->
                    FilterChip(
                        selected = selectedAction == key,
                        onClick = { selectedAction = key },
                        label = { Text(label, fontSize = 11.sp) }
                    )
                }
            }
        }

        item {
            OutlinedTextField(
                value = customPrompt,
                onValueChange = { customPrompt = it },
                label = { Text("Instructions or Candidate Context for AI Copilot") },
                modifier = Modifier.fillMaxWidth()
            )
        }

        item {
            Button(
                onClick = { onRunCopilot(selectedAction, customPrompt) },
                enabled = !isRunningCopilot,
                colors = ButtonDefaults.buttonColors(containerColor = Indigo600),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(if (isRunningCopilot) "Running Grounded Gemini Analysis..." else "✨ Run AI Copilot Analysis")
            }
        }

        if (copilotResult != null) {
            item {
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = Color.White,
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, Indigo500, RoundedCornerShape(14.dp))
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        StatusPill(
                            text = if (copilotResult.requiresHumanApproval) "QUEUED FOR HUMAN APPROVAL" else "GROUNDED ANALYSIS",
                            color = Violet600
                        )
                        Text(copilotResult.headline, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Navy900)
                        Text(copilotResult.summary, fontSize = 13.sp, color = Color(0xFF334155))
                        copilotResult.bulletPoints.forEach { bullet ->
                            Text("• $bullet", fontSize = 12.sp, color = Color(0xFF475569))
                        }
                        if (copilotResult.draftText.isNotBlank()) {
                            Surface(
                                color = Slate100,
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = copilotResult.draftText,
                                    fontSize = 12.sp,
                                    fontFamily = FontFamily.Monospace,
                                    modifier = Modifier.padding(10.dp)
                                )
                            }
                        }
                        Text(
                            text = "Recommended Action: ${copilotResult.recommendedAction}",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 12.sp,
                            color = Indigo600
                        )
                    }
                }
            }
        }

        item {
            Text("Configured AI Agents (${snapshot.aiAgents.size})", fontWeight = FontWeight.Bold, fontSize = 14.sp)
        }

        items(snapshot.aiAgents, key = { it.id }) { agent ->
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = Color.White,
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(12.dp))
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(agent.name, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Text("${agent.department} · Channels: ${agent.assignedChannels}", fontSize = 12.sp, color = Color(0xFF64748B))
                    Text("Confidence Threshold: ${agent.confidenceThreshold}% · Mode: ${agent.responseMode}", fontSize = 11.sp, fontFamily = FontFamily.Monospace)
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// 5. WHATSAPP & CHANNELS SCREEN
// ---------------------------------------------------------------------------
@Composable
fun WhatsAppChannelsScreen(
    snapshot: CrmWorkspaceSnapshot,
    onConnectChannel: (String, String, String, String) -> Unit,
    onSimulateWebhook: (String, String, String, String) -> Unit
) {
    var phone by remember { mutableStateOf("") }
    var displayName by remember { mutableStateOf("") }
    var channelType by remember { mutableStateOf("whatsapp") }
    var phoneId by remember { mutableStateOf("") }

    var simName by remember { mutableStateOf("Lukasz Kowalski") }
    var simPhone by remember { mutableStateOf("+48 601 554 321") }
    var simText by remember { mutableStateOf("Hi, I am a qualified TIG Welder in Poland looking for sponsorship in Germany or UK.") }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("WhatsApp Business Cloud API & Social Lines", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Navy900)
            Text(
                "Honest Connection Status: Channels without live Meta/TikTok server access tokens operate in verified Webhook Simulator mode.",
                fontSize = 12.sp,
                color = Color(0xFF64748B)
            )
        }

        items(snapshot.channels, key = { it.id }) { ch ->
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = Color.White,
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(12.dp))
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(ch.displayName, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        StatusPill(
                            text = if (ch.connectionStatus == "connected_live") "LIVE API" else "WEBHOOK READY",
                            color = if (ch.connectionStatus == "connected_live") Emerald600 else Amber600
                        )
                    }
                    Text("${ch.channelType.uppercase()} · ${ch.phoneNumber} · ID: ${ch.phoneNumberId}", fontSize = 12.sp, fontFamily = FontFamily.Monospace)
                    if (!ch.recentError.isNullOrBlank()) {
                        Text(ch.recentError, fontSize = 11.sp, color = Color(0xFF64748B))
                    }
                }
            }
        }

        // Register New Official Channel
        item {
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = Color.White,
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(14.dp))
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Connect Official WhatsApp or Social Business Line", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    OutlinedTextField(
                        value = displayName,
                        onValueChange = { displayName = it },
                        label = { Text("Display Name (e.g. UK Healthcare Desk)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = phone,
                        onValueChange = { phone = it },
                        label = { Text("Phone Number or @Handle") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = phoneId,
                        onValueChange = { phoneId = it },
                        label = { Text("Meta Phone Number ID / Page ID") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    Button(
                        onClick = {
                            if (phone.isNotBlank() && displayName.isNotBlank()) {
                                onConnectChannel(phone, displayName, channelType, phoneId)
                                phone = ""
                                displayName = ""
                                phoneId = ""
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Indigo600)
                    ) {
                        Text("Register Channel Endpoint")
                    }
                }
            }
        }

        // 12-Step Inbound Webhook & AI Qualification Simulator
        item {
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = Color(0xFFEEF2FF),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Indigo500, RoundedCornerShape(14.dp))
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Test Inbound Candidate Message (12-Step AI Engine)", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    OutlinedTextField(
                        value = simName,
                        onValueChange = { simName = it },
                        label = { Text("Candidate / Customer Name") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = simPhone,
                        onValueChange = { simPhone = it },
                        label = { Text("Phone Number") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = simText,
                        onValueChange = { simText = it },
                        label = { Text("Inbound Message") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Button(
                        onClick = { onSimulateWebhook(simName, simPhone, "whatsapp", simText) },
                        colors = ButtonDefaults.buttonColors(containerColor = Indigo600)
                    ) {
                        Text("Simulate Inbound Webhook + AI Qualification")
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// 6. CAMPAIGN STUDIO SCREEN (Social Boost & CTWA Marketing Campaigns)
// ---------------------------------------------------------------------------
@Composable
fun CampaignStudioScreen(
    snapshot: CrmWorkspaceSnapshot,
    onCreateCampaign: (String, String, String, String, String) -> Unit
) {
    var channel by remember { mutableStateOf("instagram") }
    var name by remember { mutableStateOf("") }
    var objective by remember { mutableStateOf("Click-to-WhatsApp Candidate Recruitment") }
    var adCopy by remember { mutableStateOf("") }
    var budget by remember { mutableStateOf("60") }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Campaign Studio — Social & Click-to-WhatsApp Boosts", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Navy900)
        }

        item {
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = Color.White,
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(14.dp))
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Launch New Social Ad / CTWA Campaign", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("instagram", "facebook", "tiktok", "whatsapp").forEach { ch ->
                            FilterChip(
                                selected = channel == ch,
                                onClick = { channel = ch },
                                label = { Text(ch.uppercase(), fontSize = 11.sp) }
                            )
                        }
                    }
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text("Campaign Title *") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = objective,
                        onValueChange = { objective = it },
                        label = { Text("Campaign Objective") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = adCopy,
                        onValueChange = { adCopy = it },
                        label = { Text("Ad Copy & Call-to-Action *") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = budget,
                        onValueChange = { budget = it },
                        label = { Text("Daily Budget (USD)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    Button(
                        onClick = {
                            if (name.isNotBlank() && adCopy.isNotBlank()) {
                                onCreateCampaign(channel, name, objective, adCopy, budget)
                                name = ""
                                adCopy = ""
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Indigo600)
                    ) {
                        Text("Create Campaign & Queue Approval")
                    }
                }
            }
        }

        items(snapshot.campaigns, key = { it.id }) { camp ->
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = Color.White,
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(12.dp))
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(camp.campaignName, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        StatusPill(text = "${camp.channelType.uppercase()} · $${camp.dailyBudgetUsd}/d", color = Violet600)
                    }
                    Text(camp.adCopy, fontSize = 12.sp, color = Color(0xFF475569))
                    Text(
                        text = "${camp.impressions} impr · ${camp.clicks} clicks · ${camp.conversationsStarted} AI chats · ${camp.qualifiedLeadsCount} qualified leads",
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        color = Emerald600
                    )
                }
            }
        }
    }
}
