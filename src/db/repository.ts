import { db } from './index.ts';
import {
  tenants,
  users,
  memberships,
  rolesPermissions,
  invitations,
  whatsappBusinessAccounts,
  whatsappPhoneNumbers,
  socialBoostCampaigns,
  integrationCredentials,
  webhookEvents,
  contacts,
  tags,
  conversations,
  conversationAssignments,
  messages,
  messageStatusEvents,
  pipelineStages,
  leads,
  tasks,
  appointments,
  aiAgents,
  aiAgentVersions,
  knowledgeDocuments,
  knowledgeChunks,
  workflowDefinitions,
  workflowExecutions,
  approvals,
  voiceSessions,
  callTranscripts,
  notifications,
  usageRecords,
  subscriptionRecords,
  auditLogs,
} from './schema.ts';
import { eq, and } from 'drizzle-orm';

export const DEFAULT_PIPELINE_STAGES = [
  'New Lead',
  'Contacted',
  'Interested',
  'Documents Pending',
  'Qualified',
  'Employer Review',
  'Offer',
  'Visa Process',
  'Deployed',
  'Closed Won',
  'On Hold',
  'Rejected',
];

export async function getOrCreateUserAndTenant(
  uid: string,
  email: string,
  name: string,
  requestedTenantSlug?: string
) {
  try {
    // 1. Upsert user safely
    const upsertedUsers = await db
      .insert(users)
      .values({
        uid,
        email,
        name: name || email.split('@')[0] || 'Workspace Owner',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email },
      })
      .returning();

    const user = upsertedUsers[0];

    // 2. Check existing memberships for this user
    const userMemberships = await db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, user.id));

    let activeTenant;

    if (userMemberships.length === 0) {
      // Create a completely clean, isolated workspace for this new user (NO prefilled demo records)
      const primarySlug = `workspace-${uid.slice(0, 8).toLowerCase()}-${Date.now().toString().slice(-4)}`;
      const createdTenants = await db
        .insert(tenants)
        .values({
          name: 'ConnectAI CRM Workspace',
          slug: primarySlug,
          industry: 'Recruitment & Omnichannel CRM',
          timezone: 'UTC',
          plan: 'Starter Workspace',
          isDemoSeeded: false,
        })
        .returning();

      activeTenant = createdTenants[0];

      await db.insert(memberships).values({
        tenantId: activeTenant.id,
        userId: user.id,
        role: 'company_owner',
        department: 'Executive & Operations',
        assignedNumbersJson: '["All Numbers"]',
        permissionsJson:
          '["manage_numbers","manage_inbox","manage_crm","manage_ai","manage_workflows","manage_voice","manage_billing","export_data","view_audit_logs"]',
        isActive: true,
      });

      await db
        .update(users)
        .set({ activeTenantId: activeTenant.id })
        .where(eq(users.id, user.id));

      // Initialize only empty structural stages, roles, and integration descriptors (0 sample business records)
      await initializeCleanTenantStructure(activeTenant.id, user.uid, user.name);
    } else {
      // Resolve the user's authorized tenant
      let targetTenantId = user.activeTenantId || userMemberships[0].tenantId;
      if (requestedTenantSlug) {
        const foundTenants = await db
          .select()
          .from(tenants)
          .where(eq(tenants.slug, requestedTenantSlug));
        if (foundTenants.length > 0) {
          const isMember = userMemberships.some(
            (m) => m.tenantId === foundTenants[0].id && m.isActive
          );
          if (isMember) {
            targetTenantId = foundTenants[0].id;
          }
        }
      }

      const tenantRows = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, targetTenantId));
      activeTenant = tenantRows[0];

      // One-time cleanup if this tenant still carries legacy auto-seeded demo records (isDemoSeeded === true)
      if (activeTenant && activeTenant.isDemoSeeded) {
        await resetTenantWorkspaceToClean(
          activeTenant.id,
          user.uid,
          user.name,
          'Removed legacy prefilled demo records so workspace starts clean.'
        );
        const refreshedRows = await db
          .select()
          .from(tenants)
          .where(eq(tenants.id, activeTenant.id));
        activeTenant = refreshedRows[0] || activeTenant;
      } else if (activeTenant) {
        // Ensure structural pipeline stages exist without inserting any business records
        const existingStages = await db
          .select()
          .from(pipelineStages)
          .where(eq(pipelineStages.tenantId, activeTenant.id));
        if (existingStages.length === 0) {
          await initializeCleanTenantStructure(activeTenant.id, user.uid, user.name);
        }
      }
    }

    // Fetch all tenants this user is authorized to access
    const refreshedMemberships = await db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, user.id));

    const allTenants = await db.select().from(tenants);
    const authorizedTenants = allTenants.filter((t) =>
      refreshedMemberships.some((m) => m.tenantId === t.id && m.isActive)
    );

    return {
      user,
      activeTenant,
      authorizedTenants,
      membership: refreshedMemberships.find((m) => m.tenantId === activeTenant.id),
    };
  } catch (error) {
    console.error('Database error in getOrCreateUserAndTenant:', error);
    throw new Error('Failed to initialize user and tenant workspace.', { cause: error });
  }
}

/**
 * Initializes only the structural schema configuration for a new workspace:
 * - Role definitions (RBAC)
 * - Empty pipeline stage columns
 * - Integration status descriptors (reflecting actual env configuration, never fake records)
 * - Default subscription tier metadata
 * Does NOT insert any leads, candidates, contacts, conversations, messages, tasks, campaigns, or fake statistics.
 */
export async function initializeCleanTenantStructure(
  tenantId: number,
  actorUid: string,
  actorName: string
) {
  try {
    // 1. Default RBAC Roles & Permissions
    const existingRoles = await db
      .select()
      .from(rolesPermissions)
      .where(eq(rolesPermissions.tenantId, tenantId));

    if (existingRoles.length === 0) {
      await db.insert(rolesPermissions).values([
        {
          tenantId,
          roleName: 'company_owner',
          permissionsJson: JSON.stringify([
            'Full Tenant Control',
            'WhatsApp & Social Number Onboarding',
            'AI Agent Configuration & Rollback',
            'Social Ad Boost Approval',
            'CRM Export & Deletion',
            'Billing & Staff Revocation',
          ]),
        },
        {
          tenantId,
          roleName: 'manager',
          permissionsJson: JSON.stringify([
            'Assign Conversations & Numbers',
            'Approve AI Outbound & Social Boosts',
            'Manage CRM Pipeline & Workflows',
            'View Department Analytics',
          ]),
        },
        {
          tenantId,
          roleName: 'agent',
          permissionsJson: JSON.stringify([
            'Unified Inbox Reply & Human Takeover',
            'Update Assigned Contacts & Leads',
            'Complete Follow-up Tasks',
          ]),
        },
        {
          tenantId,
          roleName: 'analyst',
          permissionsJson: JSON.stringify([
            'Read-Only Analytics & Reports',
            'View Audit Trail & Cost Metrics',
          ]),
        },
      ]);
    }

    // 2. Empty Pipeline Stage Columns
    const existingStages = await db
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.tenantId, tenantId));

    if (existingStages.length === 0) {
      for (let i = 0; i < DEFAULT_PIPELINE_STAGES.length; i++) {
        const stageName = DEFAULT_PIPELINE_STAGES[i];
        await db.insert(pipelineStages).values({
          tenantId,
          name: stageName,
          stageOrder: i + 1,
          color:
            stageName === 'Deployed' || stageName === 'Closed Won'
              ? 'emerald'
              : stageName === 'Rejected'
              ? 'rose'
              : 'indigo',
        });
      }
    }

    // 3. Integration Status Descriptors (Honest configuration state)
    const existingIntegrations = await db
      .select()
      .from(integrationCredentials)
      .where(eq(integrationCredentials.tenantId, tenantId));

    if (existingIntegrations.length === 0) {
      await db.insert(integrationCredentials).values([
        {
          tenantId,
          providerKey: 'whatsapp_cloud_api',
          displayName: 'Meta WhatsApp Business Platform (Cloud API)',
          category: 'Messaging & WABA',
          status: process.env.WHATSAPP_ACCESS_TOKEN ? 'connected' : 'not_configured',
          maskedCredentialHint: process.env.WHATSAPP_ACCESS_TOKEN
            ? 'WHATSAPP_ACCESS_TOKEN Configured'
            : 'Not Configured — Add WABA Token & Phone Number ID',
          requiredPermissions: 'whatsapp_business_messaging, whatsapp_business_management',
          setupInstructions:
            'Configure WHATSAPP_ACCESS_TOKEN, WHATSAPP_VERIFY_TOKEN, and register your WABA Phone Number ID in WhatsApp & Channels.',
          lastSuccessAt: null,
          recentError: null,
        },
        {
          tenantId,
          providerKey: 'meta_social_graph',
          displayName: 'Facebook Messenger & Instagram Graph API',
          category: 'Social Messaging',
          status:
            process.env.FACEBOOK_PAGE_ACCESS_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN
              ? 'connected'
              : 'not_configured',
          maskedCredentialHint:
            process.env.FACEBOOK_PAGE_ACCESS_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN
              ? 'Configured'
              : 'Not Configured — Connect Meta Page / Instagram Token',
          requiredPermissions: 'pages_messaging, instagram_manage_messages, ads_management',
          setupInstructions:
            'Connect your Meta App Page & Instagram Professional Token to enable live DM delivery.',
          lastSuccessAt: null,
          recentError: null,
        },
        {
          tenantId,
          providerKey: 'tiktok_business',
          displayName: 'TikTok Business Messaging & Lead API',
          category: 'Social & Growth Boost',
          status: process.env.TIKTOK_BUSINESS_ACCESS_TOKEN ? 'connected' : 'not_configured',
          maskedCredentialHint: process.env.TIKTOK_BUSINESS_ACCESS_TOKEN
            ? 'Configured'
            : 'Not Configured — Enter TikTok Business Token',
          requiredPermissions: 'biz.message.write, ad.campaign.manage, lead.read',
          setupInstructions:
            'Enter your TikTok for Business OAuth token when ready to sync leads and messages.',
          lastSuccessAt: null,
          recentError: null,
        },
        {
          tenantId,
          providerKey: 'stripe_billing',
          displayName: 'Stripe SaaS Subscription & Usage Metering',
          category: 'Billing',
          status: process.env.STRIPE_SECRET_KEY ? 'connected' : 'not_configured',
          maskedCredentialHint: process.env.STRIPE_SECRET_KEY
            ? 'sk_live_...'
            : 'Not Configured — Optional Billing Key',
          requiredPermissions: 'checkout.sessions, subscriptions, meter_events',
          setupInstructions:
            'Optional: Configure STRIPE_SECRET_KEY for external billing checkout.',
          lastSuccessAt: null,
          recentError: null,
        },
      ]);
    }

    // 4. Default Subscription Record
    const existingSub = await db
      .select()
      .from(subscriptionRecords)
      .where(eq(subscriptionRecords.tenantId, tenantId));

    if (existingSub.length === 0) {
      await db.insert(subscriptionRecords).values({
        tenantId,
        planName: 'Starter Workspace',
        status: 'active',
        monthlyPriceUsd: 0,
        maxWhatsappNumbers: 25,
        maxStaffSeats: 15,
        maxMonthlyConversations: 25000,
        maxVoiceMinutes: 1000,
        renewalDate: '2026-12-31',
      });
    }

    await db.insert(auditLogs).values({
      tenantId,
      actorUid,
      actorName,
      action: 'CLEAN_WORKSPACE_INITIALIZED',
      resourceType: 'tenant',
      resourceId: String(tenantId),
      details: 'Initialized clean workspace with 0 prefilled business records.',
    });
  } catch (error) {
    console.error('Error in initializeCleanTenantStructure:', error);
    throw new Error('Failed to initialize clean workspace structure.', { cause: error });
  }
}

/**
 * Explicitly resets a tenant workspace to a completely clean state (0 business records),
 * preserving the tenant account, owner membership, and structural pipeline stage columns.
 */
export async function resetTenantWorkspaceToClean(
  tenantId: number,
  actorUid: string,
  actorName: string,
  reason = 'User requested protected workspace reset to clean state.'
) {
  try {
    // Delete child/dependent records first to satisfy foreign key constraints
    await db.delete(messageStatusEvents).where(eq(messageStatusEvents.tenantId, tenantId));
    await db.delete(messages).where(eq(messages.tenantId, tenantId));
    await db.delete(conversationAssignments).where(eq(conversationAssignments.tenantId, tenantId));
    await db.delete(conversations).where(eq(conversations.tenantId, tenantId));
    await db.delete(callTranscripts).where(eq(callTranscripts.tenantId, tenantId));
    await db.delete(voiceSessions).where(eq(voiceSessions.tenantId, tenantId));
    await db.delete(tasks).where(eq(tasks.tenantId, tenantId));
    await db.delete(appointments).where(eq(appointments.tenantId, tenantId));
    await db.delete(leads).where(eq(leads.tenantId, tenantId));
    await db.delete(tags).where(eq(tags.tenantId, tenantId));
    await db.delete(contacts).where(eq(contacts.tenantId, tenantId));
    await db.delete(socialBoostCampaigns).where(eq(socialBoostCampaigns.tenantId, tenantId));
    await db.delete(whatsappPhoneNumbers).where(eq(whatsappPhoneNumbers.tenantId, tenantId));
    await db.delete(whatsappBusinessAccounts).where(eq(whatsappBusinessAccounts.tenantId, tenantId));
    await db.delete(knowledgeChunks).where(eq(knowledgeChunks.tenantId, tenantId));
    await db.delete(knowledgeDocuments).where(eq(knowledgeDocuments.tenantId, tenantId));
    await db.delete(aiAgentVersions).where(eq(aiAgentVersions.tenantId, tenantId));
    await db.delete(aiAgents).where(eq(aiAgents.tenantId, tenantId));
    await db.delete(workflowExecutions).where(eq(workflowExecutions.tenantId, tenantId));
    await db.delete(workflowDefinitions).where(eq(workflowDefinitions.tenantId, tenantId));
    await db.delete(approvals).where(eq(approvals.tenantId, tenantId));
    await db.delete(usageRecords).where(eq(usageRecords.tenantId, tenantId));
    await db.delete(notifications).where(eq(notifications.tenantId, tenantId));
    await db.delete(invitations).where(eq(invitations.tenantId, tenantId));
    await db.delete(webhookEvents).where(eq(webhookEvents.tenantId, tenantId));
    await db.delete(auditLogs).where(eq(auditLogs.tenantId, tenantId));

    // Mark tenant as clean (isDemoSeeded: false)
    await db
      .update(tenants)
      .set({ isDemoSeeded: false })
      .where(eq(tenants.id, tenantId));

    // Ensure structural pipeline stages, roles, and integration status entries exist
    await initializeCleanTenantStructure(tenantId, actorUid, actorName);

    await db.insert(auditLogs).values({
      tenantId,
      actorUid,
      actorName,
      action: 'WORKSPACE_RESET_TO_CLEAN',
      resourceType: 'tenant',
      resourceId: String(tenantId),
      details: reason,
    });
  } catch (error) {
    console.error('Error in resetTenantWorkspaceToClean:', error);
    throw new Error('Failed to reset tenant workspace to clean state.', { cause: error });
  }
}
