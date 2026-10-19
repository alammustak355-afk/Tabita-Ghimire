package com.connectai.crm.ui.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.connectai.crm.model.NavDestination

// Coordinated Enterprise SaaS Palette
val Navy950 = Color(0xFF070B19)
val Navy900 = Color(0xFF0F172A)
val Navy800 = Color(0xFF1E293B)
val Navy700 = Color(0xFF334155)

val Slate50 = Color(0xFFF8FAFC)
val Slate100 = Color(0xFFF1F5F9)
val Slate200 = Color(0xFFE2E8F0)
val Slate500 = Color(0xFF64748B)
val Slate600 = Color(0xFF475569)
val Slate700 = Color(0xFF334155)

val Indigo600 = Color(0xFF4F46E5)
val Indigo500 = Color(0xFF6366F1)
val Indigo100 = Color(0xFFE0E7FF)

val ElectricBlue600 = Color(0xFF2563EB)
val RoyalBlue600 = Color(0xFF2563EB)
val RoyalBlue100 = Color(0xFFDBEAFE)

val Violet600 = Color(0xFF7C3AED)
val Violet100 = Color(0xFFEDE9FE)

val Teal600 = Color(0xFF0D9488)
val Teal100 = Color(0xFFCCFBF1)

val Cyan600 = Color(0xFF0891B2)
val Cyan100 = Color(0xFFCFFAFE)

val Emerald600 = Color(0xFF059669)
val Emerald100 = Color(0xFFD1FAE5)

val Amber600 = Color(0xFFD97706)
val Amber100 = Color(0xFFFEF3C7)

val Rose600 = Color(0xFFE11D48)
val Rose100 = Color(0xFFFFE4E6)

// Bundled/System Sans-Serif Typography Scale (Offline-Safe, High-Readability Hierarchy)
val ConnectAiTypography = Typography(
    displaySmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 28.sp,
        lineHeight = 34.sp,
        letterSpacing = (-0.5).sp
    ),
    headlineLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 24.sp,
        lineHeight = 30.sp,
        letterSpacing = (-0.4).sp
    ),
    headlineMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 20.sp,
        lineHeight = 26.sp,
        letterSpacing = (-0.3).sp
    ),
    headlineSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 18.sp,
        lineHeight = 24.sp,
        letterSpacing = (-0.2).sp
    ),
    titleLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 17.sp,
        lineHeight = 23.sp,
        letterSpacing = (-0.15).sp
    ),
    titleMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 15.sp,
        lineHeight = 21.sp,
        letterSpacing = 0.sp
    ),
    titleSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 13.sp,
        lineHeight = 18.sp,
        letterSpacing = 0.05.sp
    ),
    bodyLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 21.sp,
        letterSpacing = 0.1.sp
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 13.sp,
        lineHeight = 19.sp,
        letterSpacing = 0.1.sp
    ),
    bodySmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 17.sp,
        letterSpacing = 0.15.sp
    ),
    labelLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 13.sp,
        lineHeight = 18.sp,
        letterSpacing = 0.15.sp
    ),
    labelMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 11.sp,
        lineHeight = 15.sp,
        letterSpacing = 0.25.sp
    ),
    labelSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 10.sp,
        lineHeight = 14.sp,
        letterSpacing = 0.3.sp
    )
)

private val ConnectAiColorScheme = lightColorScheme(
    primary = Indigo600,
    onPrimary = Color.White,
    primaryContainer = Indigo100,
    onPrimaryContainer = Color(0xFF1E1B4B),
    secondary = RoyalBlue600,
    onSecondary = Color.White,
    secondaryContainer = RoyalBlue100,
    onSecondaryContainer = Color(0xFF1E3A8A),
    tertiary = Violet600,
    onTertiary = Color.White,
    tertiaryContainer = Violet100,
    onTertiaryContainer = Color(0xFF4C1D95),
    background = Slate50,
    onBackground = Navy900,
    surface = Color.White,
    onSurface = Navy900,
    surfaceVariant = Slate100,
    onSurfaceVariant = Slate600,
    outline = Slate200
)

@Composable
fun ConnectAiCrmTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = ConnectAiColorScheme,
        typography = ConnectAiTypography,
        content = content
    )
}

/**
 * Maps each navigation destination to a distinctive Material Design icon.
 */
fun destinationIcon(dest: NavDestination): ImageVector = when (dest) {
    NavDestination.OVERVIEW -> Icons.Default.SpaceDashboard
    NavDestination.LEAD_CENTER -> Icons.Default.PeopleAlt
    NavDestination.UNIFIED_INBOX -> Icons.Default.Forum
    NavDestination.AI_COPILOT -> Icons.Default.AutoAwesome
    NavDestination.WHATSAPP_CHANNELS -> Icons.Default.PermPhoneMsg
    NavDestination.CAMPAIGN_STUDIO -> Icons.Default.Campaign
    NavDestination.RECRUITMENT_PIPELINE -> Icons.Default.WorkOutline
    NavDestination.FOLLOW_UP_TASKS -> Icons.Default.TaskAlt
    NavDestination.TEAM_PERFORMANCE -> Icons.Default.Groups
    NavDestination.ANALYTICS_REPORTS -> Icons.Default.Insights
    NavDestination.INTEGRATIONS -> Icons.Default.Hub
    NavDestination.SETTINGS_SECURITY -> Icons.Default.AdminPanelSettings
    NavDestination.HELP_USER_GUIDE -> Icons.Default.MenuBook
}

/**
 * Maps each navigation destination to its coordinated colour accent.
 */
fun destinationAccentColor(dest: NavDestination): Color = when (dest) {
    NavDestination.OVERVIEW -> RoyalBlue600
    NavDestination.LEAD_CENTER -> Indigo600
    NavDestination.UNIFIED_INBOX -> Emerald600
    NavDestination.AI_COPILOT -> Violet600
    NavDestination.WHATSAPP_CHANNELS -> Emerald600
    NavDestination.CAMPAIGN_STUDIO -> Rose600
    NavDestination.RECRUITMENT_PIPELINE -> Teal600
    NavDestination.FOLLOW_UP_TASKS -> Amber600
    NavDestination.TEAM_PERFORMANCE -> RoyalBlue600
    NavDestination.ANALYTICS_REPORTS -> Cyan600
    NavDestination.INTEGRATIONS -> Violet600
    NavDestination.SETTINGS_SECURITY -> Indigo600
    NavDestination.HELP_USER_GUIDE -> Teal600
}


/**
 * Colourful rounded icon container used across cards, navigation, KPIs, and feature headers.
 */
@Composable
fun FeatureIconBadge(
    icon: ImageVector,
    tint: Color,
    containerSize: Dp = 40.dp,
    iconSize: Dp = 20.dp,
    cornerRadius: Dp = 12.dp,
    contentDescription: String? = null
) {
    Box(
        modifier = Modifier
            .size(containerSize)
            .clip(RoundedCornerShape(cornerRadius))
            .background(tint.copy(alpha = 0.12f))
            .border(1.dp, tint.copy(alpha = 0.24f), RoundedCornerShape(cornerRadius)),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            tint = tint,
            modifier = Modifier.size(iconSize)
        )
    }
}

@Composable
fun SectionHeaderRow(
    icon: ImageVector,
    iconTint: Color,
    title: String,
    subtitle: String? = null,
    trailingContent: @Composable (() -> Unit)? = null
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            modifier = Modifier.weight(1f),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            FeatureIconBadge(
                icon = icon,
                tint = iconTint,
                containerSize = 36.dp,
                iconSize = 18.dp,
                cornerRadius = 10.dp,
                contentDescription = title
            )
            Column {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = Navy900
                )
                if (!subtitle.isNullOrBlank()) {
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = Slate500
                    )
                }
            }
        }
        if (trailingContent != null) {
            trailingContent()
        }
    }
}

@Composable
fun ExecutiveHeroBanner(
    eyebrow: String,
    title: String,
    subtitle: String,
    icon: ImageVector = Icons.Default.SpaceDashboard,
    iconTint: Color = Color(0xFF818CF8),
    primaryActionText: String? = null,
    onPrimaryAction: (() -> Unit)? = null,
    secondaryActionText: String? = null,
    onSecondaryAction: (() -> Unit)? = null
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                brush = Brush.linearGradient(
                    colors = listOf(Navy950, Navy900, Color(0xFF1E1B4B))
                ),
                shape = RoundedCornerShape(18.dp)
            )
            .border(1.dp, Color(0xFF312E81), RoundedCornerShape(18.dp))
            .padding(18.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(iconTint.copy(alpha = 0.18f))
                        .border(1.dp, iconTint.copy(alpha = 0.38f), RoundedCornerShape(10.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = eyebrow,
                        tint = iconTint,
                        modifier = Modifier.size(19.dp)
                    )
                }
                Text(
                    text = eyebrow.uppercase(),
                    color = Color(0xFFA5B4FC),
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.8.sp
                )
            }
            Text(
                text = title,
                color = Color.White,
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = subtitle,
                color = Color(0xFFCBD5E1),
                style = MaterialTheme.typography.bodyMedium
            )
            if (primaryActionText != null || secondaryActionText != null) {
                Row(
                    modifier = Modifier.padding(top = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (primaryActionText != null && onPrimaryAction != null) {
                        Button(
                            onClick = onPrimaryAction,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Indigo600,
                                contentColor = Color.White
                            ),
                            shape = RoundedCornerShape(10.dp),
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp),
                            modifier = Modifier.defaultMinSize(minHeight = 44.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.AddCircleOutline,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = primaryActionText,
                                style = MaterialTheme.typography.labelLarge
                            )
                        }
                    }
                    if (secondaryActionText != null && onSecondaryAction != null) {
                        OutlinedButton(
                            onClick = onSecondaryAction,
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 10.dp),
                            modifier = Modifier.defaultMinSize(minHeight = 44.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.ArrowForward,
                                contentDescription = null,
                                modifier = Modifier.size(15.dp),
                                tint = Color(0xFFA5B4FC)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = secondaryActionText,
                                style = MaterialTheme.typography.labelLarge
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun KpiMetricCard(
    title: String,
    value: String,
    subtitle: String,
    accentColor: Color = Indigo600,
    icon: ImageVector = Icons.Default.Analytics,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        color = Color.White,
        tonalElevation = 1.dp,
        shadowElevation = 2.dp
    ) {
        Column(
            modifier = Modifier
                .border(1.dp, Slate200, RoundedCornerShape(16.dp))
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = title,
                    color = Slate600,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                Spacer(modifier = Modifier.width(6.dp))
                FeatureIconBadge(
                    icon = icon,
                    tint = accentColor,
                    containerSize = 32.dp,
                    iconSize = 17.dp,
                    cornerRadius = 9.dp,
                    contentDescription = title
                )
            }
            Text(
                text = value,
                color = Navy900,
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.ExtraBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = subtitle,
                color = Slate500,
                style = MaterialTheme.typography.bodySmall,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
fun StatusPill(text: String, color: Color = Indigo600) {
    Surface(
        color = color.copy(alpha = 0.12f),
        shape = RoundedCornerShape(8.dp)
    ) {
        Text(
            text = text,
            color = color,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
        )
    }
}
