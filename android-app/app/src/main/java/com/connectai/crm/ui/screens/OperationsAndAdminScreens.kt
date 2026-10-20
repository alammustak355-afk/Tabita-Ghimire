package com.connectai.crm.ui.screens

import androidx.compose.foundation.border
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
// 7. RECRUITMENT PIPELINE SCREEN (11 Stages, Candidate Cards & Stage Movement)
// ---------------------------------------------------------------------------
@Composable
fun RecruitmentPipelineScreen(
    snapshot: CrmWorkspaceSnapshot,
    onUpdateLeadStage: (Int, String) -> Unit,
    onArchiveLead: (Int, Boolean) -> Unit,
    onDeleteLead: (Int) -> Unit,
    onOpenNewLeadDialog: () -> Unit
) {
    var selectedStage by remember { mutableStateOf("All") }
    var search by remember { mutableStateOf("") }
    var showArchived by remember { mutableStateOf(false) }

    val filteredLeads = snapshot.leads.filter { l ->
        val matchesArchive = if (showArchived) l.isArchived else !l.isArchived
        val matchesStage = selectedStage == "All" || l.stage.equals(selectedStage, ignoreCase = true)
        val matchesSearch = search.isBlank() ||
            l.contactName.contains(search, ignoreCase = true) ||
            l.preferredJob.contains(search, ignoreCase = true) ||
            l.destinationCountry.contains(search, ignoreCase = true) ||
            l.nationality.contains(search, ignoreCase = true)
        matchesArchive && matchesStage && matchesSearch
    }

    val currencyFmt = NumberFormat.getCurrencyInstance(Locale.US).apply { maximumFractionDigits = 0 }

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
                Column(modifier = Modifier.weight(1f)) {
                    Text("International Recruitment Pipeline", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Navy900)
                    Text("${filteredLeads.size} candidate & placement records", fontSize = 12.sp, color = Color(0xFF64748B))
                }
                Button(
                    onClick = onOpenNewLeadDialog,
                    colors = ButtonDefaults.buttonColors(containerColor = Indigo600)
                ) {
                    Text("+ Add Candidate", fontSize = 12.sp)
                }
            }
        }

        item {
            OutlinedTextField(
                value = search,
                onValueChange = { search = it },
                label = { Text("Search candidate, job role, nationality, or destination...", fontSize = 12.sp) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
        }

        item {
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                (listOf("All") + RECRUITMENT_STAGES).forEach { stage ->
                    val count = if (stage == "All") {
                        snapshot.leads.count { !it.isArchived }
                    } else {
                        snapshot.leads.count { !it.isArchived && it.stage.equals(stage, ignoreCase = true) }
                    }
                    FilterChip(
                        selected = selectedStage == stage,
                        onClick = { selectedStage = stage },
                        label = { Text("$stage ($count)", fontSize = 11.sp) }
                    )
                }
                FilterChip(
                    selected = showArchived,
                    onClick = { showArchived = !showArchived },
                    label = { Text(if (showArchived) "Showing Archived" else "Show Archived", fontSize = 11.sp) }
                )
            }
        }

        items(filteredLeads, key = { it.id }) { lead ->
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = Color.White,
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(14.dp))
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(lead.contactName, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Navy900)
                            Text(lead.title, fontSize = 12.sp, color = Color(0xFF475569))
                        }
                        StatusPill(text = lead.stage, color = Indigo600)
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Nationality: ${lead.nationality.ifBlank { "N/A" }} → ${lead.destinationCountry.ifBlank { "Global" }}",
                            fontSize = 12.sp,
                            color = Color(0xFF334155)
                        )
                        Text(
                            text = currencyFmt.format(lead.estimatedValueUsd),
                            fontSize = 13.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            color = Emerald600
                        )
                    }

                    Text(
                        text = "Job: ${lead.preferredJob.ifBlank { "General" }} · Phone: ${lead.phone.ifBlank { "N/A" }} · Score: ${lead.leadScore}/100",
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        color = Color(0xFF64748B)
                    )

                    if (lead.extractedRequirements.isNotBlank()) {
                        Text(lead.extractedRequirements, fontSize = 12.sp, color = Color(0xFF475569))
                    }

                    // Quick Stage Selector Strip
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        RECRUITMENT_STAGES.forEach { st ->
                            val isCurrent = lead.stage.equals(st, ignoreCase = true)
                            AssistChip(
                                onClick = { if (!isCurrent) onUpdateLeadStage(lead.id, st) },
                                label = {
                                    Text(
                                        text = st,
                                        fontSize = 10.sp,
                                        fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Normal
                                    )
                                }
                            )
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End
                    ) {
                        TextButton(onClick = { onArchiveLead(lead.id, !lead.isArchived) }) {
                            Text(if (lead.isArchived) "Restore" else "Archive", fontSize = 11.sp)
                        }
                        TextButton(onClick = { onDeleteLead(lead.id) }) {
                            Text("Delete", fontSize = 11.sp, color = Rose600)
                        }
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// 8. FOLLOW-UP TASKS & INTERVIEWS SCREEN
// ---------------------------------------------------------------------------
@Composable
fun FollowUpTasksScreen(
    snapshot: CrmWorkspaceSnapshot,
    onCreateTask: (String, String, String, String) -> Unit,
    onToggleTask: (Int) -> Unit,
    onCreateAppointment: (String, String, String, String) -> Unit
) {
    var taskTitle by remember { mutableStateOf("") }
    var taskContact by remember { mutableStateOf("") }
    var taskDue by remember { mutableStateOf("2026-10-28") }
    var taskPriority by remember { mutableStateOf("high") }

    var apptContact by remember { mutableStateOf("") }
    var apptTitle by remember { mutableStateOf("") }
    var apptDate by remember { mutableStateOf("2026-10-27 14:00 UTC") }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Follow-up Tasks & Candidate Interviews", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Navy900)
        }

        // Add Follow-up Task Card
        item {
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = Color.White,
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(14.dp))
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("+ Create Follow-up Task", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    OutlinedTextField(
                        value = taskTitle,
                        onValueChange = { taskTitle = it },
                        label = { Text("Task Description *") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = taskContact,
                            onValueChange = { taskContact = it },
                            label = { Text("Candidate / Contact") },
                            modifier = Modifier.weight(1f),
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = taskDue,
                            onValueChange = { taskDue = it },
                            label = { Text("Due Date (YYYY-MM-DD)") },
                            modifier = Modifier.weight(1f),
                            singleLine = true
                        )
                    }
                    Button(
                        onClick = {
                            if (taskTitle.isNotBlank()) {
                                onCreateTask(taskTitle, taskContact, taskDue, taskPriority)
                                taskTitle = ""
                                taskContact = ""
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Indigo600)
                    ) {
                        Text("Save Follow-up Task")
                    }
                }
            }
        }

        items(snapshot.tasks, key = { it.id }) { task ->
            val completed = task.status == "completed"
            val overdue = !completed && task.dueDate < "2026-10-19"
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = Color.White,
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(12.dp))
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        modifier = Modifier.weight(1f),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = completed,
                            onCheckedChange = { onToggleTask(task.id) }
                        )
                        Column {
                            Text(
                                text = task.title,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 13.sp,
                                color = if (completed) Color(0xFF94A3B8) else Navy900
                            )
                            Text(
                                text = "${task.contactName.ifBlank { "General" }} · Due: ${task.dueDate} · Assigned: ${task.assignedEmployee}",
                                fontSize = 11.sp,
                                fontFamily = FontFamily.Monospace,
                                color = Color(0xFF64748B)
                            )
                        }
                    }
                    StatusPill(
                        text = when {
                            completed -> "DONE"
                            overdue -> "OVERDUE"
                            else -> task.priority.uppercase()
                        },
                        color = when {
                            completed -> Emerald600
                            overdue -> Rose600
                            else -> Amber600
                        }
                    )
                }
            }
        }

        // Book Candidate Interview
        item {
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = Color.White,
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(14.dp))
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("+ Book Candidate / Employer Interview", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    OutlinedTextField(
                        value = apptContact,
                        onValueChange = { apptContact = it },
                        label = { Text("Candidate / Employer Name *") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = apptTitle,
                        onValueChange = { apptTitle = it },
                        label = { Text("Interview Title *") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = apptDate,
                        onValueChange = { apptDate = it },
                        label = { Text("Date & Time (UTC)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    Button(
                        onClick = {
                            if (apptContact.isNotBlank() && apptTitle.isNotBlank()) {
                                onCreateAppointment(apptContact, apptTitle, apptDate, "whatsapp")
                                apptContact = ""
                                apptTitle = ""
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = ElectricBlue600)
                    ) {
                        Text("Schedule Interview")
                    }
                }
            }
        }

        items(snapshot.appointments, key = { it.id }) { appt ->
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = Color.White,
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(12.dp))
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(appt.title, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Text("${appt.contactName} · ${appt.scheduledAt} (${appt.durationMinutes}m)", fontSize = 12.sp, fontFamily = FontFamily.Monospace)
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// 9. TEAM & PERFORMANCE SCREEN (Staff Scorecard, RBAC & Invitations)
// ---------------------------------------------------------------------------
@Composable
fun TeamPerformanceScreen(
    snapshot: CrmWorkspaceSnapshot,
    onInviteStaff: (String, String, String) -> Unit,
    onUpdateRbacRole: (String, Boolean) -> Unit
) {
    var inviteEmail by remember { mutableStateOf("") }
    var inviteRole by remember { mutableStateOf("agent") }
    var inviteDept by remember { mutableStateOf("International Recruitment") }
    var allowExport by remember { mutableStateOf(true) }

    val staffNames = (snapshot.leads.map { it.ownerName } + snapshot.user.name)
        .filter { it.isNotBlank() }
        .distinct()

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Team & Performance — RBAC Governance", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Navy900)
            Text("Active User: ${snapshot.user.name} · Role: ${snapshot.user.role}", fontSize = 12.sp, color = Color(0xFF64748B))
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
                    Text("Staff Conversion & Pipeline Scorecard", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    staffNames.forEach { staff ->
                        val staffLeads = snapshot.leads.filter { !it.isArchived && it.ownerName == staff }
                        val converted = staffLeads.count { it.stage in setOf("Offer", "Visa Process", "Deployed", "Won") }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(staff, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                            Text(
                                "${staffLeads.size} leads · $converted placed/won",
                                fontSize = 12.sp,
                                fontFamily = FontFamily.Monospace,
                                color = Indigo600
                            )
                        }
                    }
                }
            }
        }

        // Active Session RBAC Role Switcher
        item {
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = Color.White,
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(14.dp))
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Active Session RBAC Role & Export Permission", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Row(
                        modifier = Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        listOf("company_owner", "manager", "analyst", "agent", "viewer").forEach { role ->
                            FilterChip(
                                selected = snapshot.user.role == role,
                                onClick = { onUpdateRbacRole(role, allowExport) },
                                label = { Text(role, fontSize = 11.sp) }
                            )
                        }
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            checked = allowExport,
                            onCheckedChange = {
                                allowExport = it
                                onUpdateRbacRole(snapshot.user.role, it)
                            }
                        )
                        Text("Grant CSV Data Export Permission (export_data)", fontSize = 12.sp)
                    }
                }
            }
        }

        // Invite Staff Member
        item {
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = Color.White,
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(14.dp))
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("+ Invite Team Member", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    OutlinedTextField(
                        value = inviteEmail,
                        onValueChange = { inviteEmail = it },
                        label = { Text("Staff Email Address *") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = inviteDept,
                        onValueChange = { inviteDept = it },
                        label = { Text("Department") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    Button(
                        onClick = {
                            if (inviteEmail.contains("@")) {
                                onInviteStaff(inviteEmail, inviteRole, inviteDept)
                                inviteEmail = ""
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Indigo600)
                    ) {
                        Text("Send Workspace Invitation")
                    }
                }
            }
        }

        items(snapshot.invitations, key = { it.id }) { inv ->
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = Color.White,
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(12.dp))
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(inv.email, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        Text("${inv.role} · ${inv.department}", fontSize = 11.sp, color = Color(0xFF64748B))
                    }
                    StatusPill(text = inv.status.uppercase(), color = Indigo600)
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// 10. ANALYTICS & REPORTS SCREEN
// ---------------------------------------------------------------------------
@Composable
fun AnalyticsReportsScreen(snapshot: CrmWorkspaceSnapshot) {
    val activeLeads = snapshot.leads.filter { !it.isArchived }
    val channelCounts = listOf("whatsapp", "instagram", "facebook", "tiktok").map { ch ->
        ch.uppercase() to activeLeads.count { it.sourceChannel.contains(ch, ignoreCase = true) }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Analytics & Executive Reports", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Navy900)
            Text("Calculated strictly from stored workspace records.", fontSize = 12.sp, color = Color(0xFF64748B))
        }

        item {
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = Color.White,
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(14.dp))
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Lead & Candidate Attribution by Channel", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    channelCounts.forEach { (ch, count) ->
                        val pct = if (activeLeads.isNotEmpty()) (count.toFloat() / activeLeads.size) else 0f
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(ch, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                Text("$count leads (${(pct * 100).toInt()}%)", fontSize = 12.sp, fontFamily = FontFamily.Monospace)
                            }
                            LinearProgressIndicator(
                                progress = { pct },
                                modifier = Modifier.fillMaxWidth(),
                                color = Indigo600,
                                trackColor = Slate100
                            )
                        }
                    }
                }
            }
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
                    Text("Recruitment Stage Distribution", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    RECRUITMENT_STAGES.forEach { stage ->
                        val count = activeLeads.count { it.stage.equals(stage, ignoreCase = true) }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(stage, fontSize = 12.sp, color = Color(0xFF334155))
                            Text("$count", fontSize = 12.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// 11. INTEGRATIONS SCREEN
// ---------------------------------------------------------------------------
@Composable
fun IntegrationsScreen(snapshot: CrmWorkspaceSnapshot) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("External Integrations & API Status", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Navy900)
            Text(
                "Transparent verification: Only providers with verified server credentials report CONNECTED.",
                fontSize = 12.sp,
                color = Color(0xFF64748B)
            )
        }

        items(snapshot.integrations, key = { it.id }) { integ ->
            val isLive = integ.status == "connected" || integ.status == "connected_live"
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = Color.White,
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(14.dp))
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(integ.displayName, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Navy900)
                        StatusPill(
                            text = integ.status.uppercase(),
                            color = if (isLive) Emerald600 else Amber600
                        )
                    }
                    Text("Credential Hint: ${integ.maskedCredentialHint}", fontSize = 11.sp, fontFamily = FontFamily.Monospace)
                    Text("Required Permissions: ${integ.requiredPermissions}", fontSize = 11.sp, color = Color(0xFF475569))
                    if (integ.setupInstructions.isNotBlank()) {
                        Text("Setup: ${integ.setupInstructions}", fontSize = 11.sp, color = Color(0xFF64748B))
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// 12. SETTINGS & SECURITY SCREEN
// ---------------------------------------------------------------------------
@Composable
fun SettingsSecurityScreen(
    snapshot: CrmWorkspaceSnapshot,
    backendUrl: String,
    onUpdateBackendUrl: (String) -> Unit,
    onSwitchTenant: (String) -> Unit,
    onToggleEmergencyPause: (Boolean) -> Unit,
    onSignOut: () -> Unit
) {
    var editableUrl by remember(backendUrl) { mutableStateOf(backendUrl) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Settings, Workspace Isolation & Security", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Navy900)
        }

        // Workspace Switcher & Emergency Pause
        item {
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = Color.White,
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(14.dp))
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Active Tenant Workspace: ${snapshot.activeTenant.name}", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Row(
                        modifier = Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        snapshot.authorizedTenants.forEach { t ->
                            FilterChip(
                                selected = t.slug == snapshot.activeTenant.slug,
                                onClick = { onSwitchTenant(t.slug) },
                                label = { Text(t.name, fontSize = 11.sp) }
                            )
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Emergency AI Automation Pause", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                            Text("Halts all automated AI replies and routes threads to human staff.", fontSize = 11.sp, color = Color(0xFF64748B))
                        }
                        Switch(
                            checked = snapshot.activeTenant.emergencyPause,
                            onCheckedChange = { onToggleEmergencyPause(it) }
                        )
                    }
                }
            }
        }

        // Production Backend HTTPS Endpoint Configuration
        item {
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = Color.White,
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(14.dp))
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Production Backend API Endpoint (HTTPS)", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        StatusPill(
                            text = if (snapshot.isLiveBackend) "CONNECTED LIVE" else "DISCONNECTED",
                            color = if (snapshot.isLiveBackend) Emerald600 else Rose600
                        )
                    }
                    if (snapshot.apiDiagnostic.endpointUrl.isNotBlank()) {
                        Text(
                            text = "Tested: ${snapshot.apiDiagnostic.endpointUrl} (HTTP ${snapshot.apiDiagnostic.httpStatusCode} · ${snapshot.apiDiagnostic.contentType.ifBlank { "none" }})",
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace,
                            color = Color(0xFF475569)
                        )
                    }
                    if (snapshot.apiDiagnostic.errorSummary.isNotBlank()) {
                        Text(
                            text = snapshot.apiDiagnostic.errorSummary,
                            fontSize = 11.sp,
                            color = if (snapshot.isLiveBackend) Emerald600 else Rose600
                        )
                    }
                    if (snapshot.apiDiagnostic.remediationHint.isNotBlank()) {
                        Text(
                            text = snapshot.apiDiagnostic.remediationHint,
                            fontSize = 11.sp,
                            color = Color(0xFF92400E)
                        )
                    }
                    OutlinedTextField(
                        value = editableUrl,
                        onValueChange = { editableUrl = it },
                        label = { Text("Public Cloud Run / Express Backend URL") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = { onUpdateBackendUrl(editableUrl) },
                            colors = ButtonDefaults.buttonColors(containerColor = Indigo600)
                        ) {
                            Text("Save & Retry Live API")
                        }
                        OutlinedButton(onClick = onSignOut) {
                            Text("Sign Out Session", color = Rose600)
                        }
                    }
                }
            }
        }

        // Security Audit Trail
        item {
            Text("Immutable Security Audit Logs (${snapshot.auditLogs.size})", fontWeight = FontWeight.Bold, fontSize = 14.sp)
        }

        items(snapshot.auditLogs, key = { it.id }) { log ->
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = Color.White,
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(10.dp))
            ) {
                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(log.action, fontWeight = FontWeight.Bold, fontSize = 12.sp, fontFamily = FontFamily.Monospace, color = Indigo600)
                        Text(log.actorName, fontSize = 11.sp, color = Color(0xFF64748B))
                    }
                    Text(log.details, fontSize = 11.sp, color = Color(0xFF334155))
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// 13. HELP & USER GUIDE SCREEN (In-App Operating Handbook & Troubleshooting)
// ---------------------------------------------------------------------------
@Composable
fun HelpUserGuideScreen(
    snapshot: CrmWorkspaceSnapshot,
    backendUrl: String,
    onOpenBackendConfig: () -> Unit,
    onNavigate: (NavDestination) -> Unit
) {
    val chapters = remember {
        listOf(
            Triple(
                "1. Getting Started & Fresh Workspace Policy",
                "Zero Fake Data Guarantee",
                "ConnectAI CRM starts 100% clean with 0 leads, 0 contacts, 0 conversations, and $0 pipeline value. No sample or fabricated business records are ever inserted into your workspace. All dashboard KPIs are calculated strictly from real records you create or receive."
            ),
            Triple(
                "2. Connecting Your Live Cloud Run Backend URL",
                "Fixing Offline Mode & HTML Redirects",
                "Google AI Studio preview links (ais-pre-...run.app) require browser cookies (__cookie_check.html) and redirect mobile apps. To connect live PostgreSQL data:\n• In AI Studio, tap Deploy / Publish -> Cloud Run.\n• Copy your public https://...run.app service URL.\n• Tap 'Configure Backend URL' below, paste the URL, tap 'Test URL', and tap 'Save & Retry Live API'."
            ),
            Triple(
                "3. Managing Leads, Contacts & Duplicates",
                "Lead Center & 11-Stage Recruitment Pipeline",
                "• Tap '+' in the top bar or open Recruitment Pipeline to add candidates with nationality, job role, destination country, and placement value.\n• Tap any stage chip on a candidate card to move them across the 11 recruitment stages (New Lead -> Contacted -> Interested -> Documents Pending -> Qualified -> Employer Review -> Offer -> Visa Process -> Deployed).\n• Open Lead Center to add contacts and merge duplicate phone/email records with one tap."
            ),
            Triple(
                "4. Unified Inbox, WhatsApp & AI Copilot",
                "Omnichannel Messaging & 12-Step Webhook Simulator",
                "• Open Unified Inbox to reply to customer messages, toggle yellow Internal Notes, or tap 'AI Draft Reply' for grounded Gemini responses.\n• Open WhatsApp & Channels to register official WABA lines or test end-to-end automated lead qualification using the 12-Step Inbound Webhook Simulator.\n• Open AI Copilot for candidate qualification scoring, executive briefings, and bottleneck audits."
            ),
            Triple(
                "5. Tasks, Interviews, RBAC & Data Privacy",
                "Governance, Security & Emergency AI Pause",
                "• Use Follow-up Tasks to schedule reminders and candidate interviews.\n• Use Team & Performance to invite staff and manage 5 RBAC roles (company_owner, manager, analyst, agent, viewer).\n• Use Settings & Security to switch isolated tenant workspaces, inspect immutable audit logs, or flip the Emergency AI Automation Pause switch."
            ),
            Triple(
                "6. Downloading the Full PDF & Markdown User Guide",
                "ConnectAI_CRM_User_Guide.pdf & .md",
                "The complete 16-chapter ConnectAI CRM User Guide & Operating Handbook is stored in your project root directory as ConnectAI_CRM_User_Guide.pdf and ConnectAI_CRM_User_Guide.md, and is also downloadable directly from your web dashboard and backend at /ConnectAI_CRM_User_Guide.pdf and /ConnectAI_CRM_User_Guide.md."
            )
        )
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            ExecutiveHeroBanner(
                eyebrow = "CONNECTAI CRM · OPERATING HANDBOOK",
                title = "Help & Complete User Guide",
                subtitle = "Step-by-step instructions for workspace setup, live Cloud Run API connection, international recruitment pipeline, omnichannel inbox, and troubleshooting.",
                primaryActionText = "Configure Backend URL",
                onPrimaryAction = onOpenBackendConfig,
                secondaryActionText = "Go to Overview",
                onSecondaryAction = { onNavigate(NavDestination.OVERVIEW) }
            )
        }

        item {
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = Color.White,
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(14.dp))
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Current Connection Diagnostic", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Navy900)
                        StatusPill(
                            text = if (snapshot.isLiveBackend) "LIVE BACKEND" else "OFFLINE / NOT CONNECTED",
                            color = if (snapshot.isLiveBackend) Emerald600 else Amber600
                        )
                    }
                    Text(
                        text = "Configured URL: $backendUrl",
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        color = Color(0xFF334155)
                    )
                    Text(
                        text = "PDF Download Path: $backendUrl/ConnectAI_CRM_User_Guide.pdf",
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        color = Indigo600
                    )
                    Text(
                        text = "Markdown Download Path: $backendUrl/ConnectAI_CRM_User_Guide.md",
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        color = Indigo600
                    )
                }
            }
        }

        items(chapters, key = { it.first }) { (title, subtitle, body) ->
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = Color.White,
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(14.dp))
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(title, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Navy900)
                    Text(subtitle, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = Teal600)
                    Text(body, fontSize = 12.sp, color = Color(0xFF334155), lineHeight = 18.sp)
                }
            }
        }
    }
}

