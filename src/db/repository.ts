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
import { eq, and, desc } from 'drizzle-orm';

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
    let userMemberships = await db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, user.id));

    let activeTenant;

    if (userMemberships.length === 0) {
      // Create primary tenant for this user + a second isolated tenant for multi-tenant demonstration
      const primarySlug = `workspace-${uid.slice(0, 8).toLowerCase()}-${Date.now().toString().slice(-4)}`;
      const createdTenants = await db
        .insert(tenants)
        .values({
          name: 'Apex Global Omnichannel Ltd.',
          slug: primarySlug,
          industry: 'Enterprise B2B & E-Commerce',
          timezone: 'Europe/London (UTC+0)',
          plan: 'Enterprise Omnichannel 100',
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
        permissionsJson: '["manage_numbers","manage_inbox","manage_crm","manage_ai","manage_workflows","manage_voice","manage_billing","export_data","view_audit_logs"]',
        isActive: true,
      });

      // Seed initial enterprise dataset for this tenant
      await seedTenantWorkspaceData(activeTenant.id, user.uid, user.name);
    } else {
      // If user requested switching to another tenant they belong to
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
          // If !isMember (e.g., user just signed in with Google while client state held the previous sandbox slug),
          // strict tenant isolation prevents access to foundTenants[0] and keeps targetTenantId as the user's own authorized tenant.
        }
      }

      const tenantRows = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, targetTenantId));
      activeTenant = tenantRows[0];

      if (activeTenant && !activeTenant.isDemoSeeded) {
        await seedTenantWorkspaceData(activeTenant.id, user.uid, user.name);
      } else if (activeTenant) {
        // Ensure at least one cross-channel duplicate pair exists if none have been seeded or merged yet
        const existingContacts = await db
          .select()
          .from(contacts)
          .where(eq(contacts.tenantId, activeTenant.id));
        const existingMergeLogs = await db
          .select()
          .from(auditLogs)
          .where(
            and(
              eq(auditLogs.tenantId, activeTenant.id),
              eq(auditLogs.action, 'CONTACT_RECORDS_MERGED')
            )
          );
        if (existingContacts.length <= 4 && existingMergeLogs.length === 0) {
          await db.insert(contacts).values([
            {
              tenantId: activeTenant.id,
              name: 'Henrik Lindqvist',
              phone: '447700900412',
              email: 'h.lindqvist@nordicfreight.se',
              company: 'Nordic Freight & Logistics',
              preferredLanguage: 'English & Swedish',
              sourceChannel: 'instagram',
              consentStatus: 'opted_in',
              connectedNumberDisplay: '@apexglobal.official',
              assignedEmployee: 'Sofia Rossi',
              requirementsSummary: 'Also messaged via Instagram Reel Ad: requested custom webhook SLA documentation for 45 European port lines.',
              notes: 'Cross-channel duplicate from Instagram DM campaign.',
            },
            {
              tenantId: activeTenant.id,
              name: 'Amira Al-Futtaim (Dubai Broker Lead)',
              phone: '+971 50 492 8810',
              email: 'amira@gulfpremierproperties.ae',
              company: 'Gulf Premier Properties Dubai',
              preferredLanguage: 'Arabic & English',
              sourceChannel: 'whatsapp',
              consentStatus: 'opted_in',
              connectedNumberDisplay: '+971 4 512 9088',
              assignedEmployee: 'Layla Al-Mansoor',
              requirementsSummary: 'Inbound WhatsApp follow-up confirming budget approval for 60 broker numbers + TikTok/IG ad boost integration.',
              notes: 'Secondary record created when prospect messaged Dubai WhatsApp desk directly.',
            },
          ]);
        }

        // Backfill recruitment/candidate fields on existing pre-seeded leads if empty
        const existingLeads = await db
          .select()
          .from(leads)
          .where(eq(leads.tenantId, activeTenant.id));
        for (const ld of existingLeads) {
          if (!ld.preferredJob && !ld.destinationCountry) {
            if (ld.contactName.includes('Henrik')) {
              await db
                .update(leads)
                .set({
                  phone: '+44 7700 900412',
                  email: 'h.lindqvist@nordicfreight.se',
                  nationality: 'Swedish',
                  preferredJob: 'Senior Port Operations & Fleet Director (45 Lines)',
                  destinationCountry: 'United Kingdom & Sweden',
                  notes: 'Verified COO credentials; ready for technical WABA onboarding.',
                })
                .where(eq(leads.id, ld.id));
            } else if (ld.contactName.includes('Amira')) {
              await db
                .update(leads)
                .set({
                  phone: '+971 50 492 8810',
                  email: 'amira@gulfpremierproperties.ae',
                  nationality: 'Emirati (UAE)',
                  preferredJob: 'Luxury Real Estate Placement & 60-Broker Desk',
                  destinationCountry: 'United Arab Emirates',
                  notes: 'High-priority executive placement & omnichannel desk rollout.',
                })
                .where(eq(leads.id, ld.id));
            } else if (ld.contactName.includes('Carlos')) {
              await db
                .update(leads)
                .set({
                  phone: '+1 305 555 0194',
                  email: 'cmendoza@solarismed.com',
                  nationality: 'Spanish / US',
                  preferredJob: 'Healthcare Specialist & Bilingual Clinical Coordinator',
                  destinationCountry: 'United States & Spain',
                  notes: 'Documents verified; awaiting HIPAA/GDPR compliance review.',
                })
                .where(eq(leads.id, ld.id));
            } else {
              await db
                .update(leads)
                .set({
                  phone: '@chloe.velo.commerce',
                  email: 'chloe@velocommerce.io',
                  nationality: 'Japanese / UK',
                  preferredJob: 'Digital Growth & Social Commerce Specialist',
                  destinationCountry: 'United Kingdom',
                  notes: 'Inbound from TikTok Spark Ad campaign.',
                })
                .where(eq(leads.id, ld.id));
            }
          }
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

export async function seedTenantWorkspaceData(
  tenantId: number,
  actorUid: string,
  actorName: string
) {
  try {
    // Mark tenant as seeded
    await db
      .update(tenants)
      .set({ isDemoSeeded: true })
      .where(eq(tenants.id, tenantId));

    // 1. Seed Default Roles & Permissions
    const rolesData = [
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
    ];
    await db.insert(rolesPermissions).values(rolesData);

    // 2. Seed Staff Invitations
    await db.insert(invitations).values([
      {
        tenantId,
        email: 'marcus.chen@apexglobal-crm.io',
        role: 'manager',
        department: 'Enterprise Sales',
        status: 'accepted',
        invitedBy: actorName,
        token: 'inv_verified_99281a',
      },
      {
        tenantId,
        email: 'layla.almansoor@apexglobal-crm.io',
        role: 'team_leader',
        department: 'MENA & Europe Support',
        status: 'accepted',
        invitedBy: actorName,
        token: 'inv_verified_99282b',
      },
      {
        tenantId,
        email: 'sofia.rossi@apexglobal-crm.io',
        role: 'agent',
        department: 'Social Growth & Instagram/TikTok Desk',
        status: 'accepted',
        invitedBy: actorName,
        token: 'inv_verified_99283c',
      },
      {
        tenantId,
        email: 'david.kim@apexglobal-crm.io',
        role: 'analyst',
        department: 'Revenue Operations',
        status: 'pending',
        invitedBy: actorName,
        token: 'inv_pending_99284d',
      },
    ]);

    // 3. Seed AI Agents first so we can link numbers to them
    const insertedAgents = await db
      .insert(aiAgents)
      .values([
        {
          tenantId,
          name: 'Aria — Global WhatsApp & Omnichannel Concierge',
          description: 'Company-wide default AI agent handling WhatsApp Cloud API, Instagram DM, Facebook Messenger, and TikTok Business inquiries.',
          department: 'Sales & Customer Success',
          assignedChannels: 'WhatsApp (+44 20 7946 0192, +1 415 890 4321), Instagram (@apexglobal.official), Facebook Page',
          systemInstructions:
            'You are Aria, the official AI Concierge for Apex Global Omnichannel Ltd. Always ground your answers strictly in the approved Knowledge Base. Never invent pricing, discounts, availability, or legal terms. If a customer asks for custom enterprise pricing over 100 seats or requests a human, escalate immediately and summarize their requirements for the sales team.',
          communicationStyle: 'Professional, Warm & Concise',
          supportedLanguages: 'English, Spanish, Arabic, French, German, Hindi',
          confidenceThreshold: 82,
          responseMode: 'auto',
          allowedActions: 'Grounded Knowledge Q&A, Lead Qualification, Tagging, Appointment Slot Proposal',
          restrictedActions: 'Never fabricate prices, never confirm wire payments, never initiate outbound calls without human approval',
          isDefault: true,
          isActive: true,
          versionNumber: 3,
        },
        {
          tenantId,
          name: 'Pulse — Social Ad Boost & TikTok/IG Lead Closer',
          description: 'Specialized growth chatbot for Facebook, Instagram Reels, and TikTok Ad Boost campaigns. Converts post comments and ad DMs into qualified CRM leads.',
          department: 'Growth & Social Marketing',
          assignedChannels: 'Instagram (@apexglobal.official), TikTok (@apexglobal.ai), Facebook Messenger',
          systemInstructions:
            'Respond immediately to prospects clicking through from Instagram, Facebook, and TikTok Boosted Posts. Answer product questions from the approved catalog, capture their WhatsApp number and business email, and qualify their monthly volume.',
          communicationStyle: 'Friendly, High-Conversion & Clear',
          supportedLanguages: 'English, Spanish, Portuguese, Arabic',
          confidenceThreshold: 78,
          responseMode: 'auto',
          allowedActions: 'Capture Contact Phone/Email, Score Lead, Send Approved Catalog Link',
          restrictedActions: 'Never promise unapproved promo codes or guaranteed ROI figures',
          isDefault: false,
          isActive: true,
          versionNumber: 2,
        },
        {
          tenantId,
          name: 'Sentinel — Technical Support & Escalation Specialist',
          description: 'Handles API onboarding, SLA troubleshooting, and invoice document verification using approval-first human review.',
          department: 'Technical Support',
          assignedChannels: 'WhatsApp (+44 20 7946 0888)',
          systemInstructions:
            'Assist existing enterprise clients with technical troubleshooting based on official documentation. Draft replies for human agent approval when confidence is below 90% or when account configuration changes are requested.',
          communicationStyle: 'Formal & Technical',
          supportedLanguages: 'English, German, French',
          confidenceThreshold: 90,
          responseMode: 'approval_required',
          allowedActions: 'Draft Technical Reply, Attach Knowledge Citation, Escalate to Tier-2 Engineer',
          restrictedActions: 'Never modify account billing or revoke tokens automatically',
          isDefault: false,
          isActive: true,
          versionNumber: 1,
        },
      ])
      .returning();

    const defaultAgentId = insertedAgents[0].id;
    const socialAgentId = insertedAgents[1].id;
    const supportAgentId = insertedAgents[2].id;

    // Seed AI Agent Versions
    await db.insert(aiAgentVersions).values([
      {
        tenantId,
        agentId: defaultAgentId,
        versionNumber: 3,
        instructionsSnapshot: insertedAgents[0].systemInstructions,
        styleSnapshot: insertedAgents[0].communicationStyle,
        createdBy: actorName,
      },
      {
        tenantId,
        agentId: socialAgentId,
        versionNumber: 2,
        instructionsSnapshot: insertedAgents[1].systemInstructions,
        styleSnapshot: insertedAgents[1].communicationStyle,
        createdBy: 'Marcus Chen',
      },
    ]);

    // 4. Seed Official WhatsApp Business Accounts (WABA) & Social Accounts
    const hasMetaToken = Boolean(process.env.META_WHATSAPP_ACCESS_TOKEN);
    const insertedWabas = await db
      .insert(whatsappBusinessAccounts)
      .values([
        {
          tenantId,
          accountName: 'Apex Global EMEA WABA (Official Cloud API)',
          wabaId: 'WABA-904812948102',
          platform: 'whatsapp',
          verificationStatus: hasMetaToken ? 'verified_meta_business' : 'awaiting_meta_cloud_token',
          connectionStatus: hasMetaToken ? 'connected_live' : 'webhook_ready_token_missing',
          lastWebhookAt: new Date(Date.now() - 1000 * 60 * 14),
          recentError: hasMetaToken
            ? null
            : 'META_WHATSAPP_ACCESS_TOKEN not set in environment; inbound webhooks & local sandbox active, live Graph API dispatch paused until token is added.',
        },
        {
          tenantId,
          accountName: 'Apex North America & LATAM WABA',
          wabaId: 'WABA-773910442190',
          platform: 'whatsapp',
          verificationStatus: 'awaiting_meta_cloud_token',
          connectionStatus: 'webhook_ready_token_missing',
          lastWebhookAt: new Date(Date.now() - 1000 * 60 * 42),
          recentError: 'Configure permanent System User token in Integrations to enable live outbound Graph API delivery.',
        },
        {
          tenantId,
          accountName: 'Apex Omnichannel Social Suite (FB / IG / TikTok)',
          wabaId: 'META-IG-TT-8839201',
          platform: 'omnichannel_social',
          verificationStatus: 'webhook_endpoint_active',
          connectionStatus: 'webhook_ready_token_missing',
          lastWebhookAt: new Date(Date.now() - 1000 * 60 * 8),
          recentError: 'Connect Facebook Page, Instagram Professional, and TikTok Business tokens in Integrations for live external ad boost publishing.',
        },
      ])
      .returning();

    // 5. Seed Connected WhatsApp Numbers & Omnichannel Social Channels
    const insertedNumbers = await db
      .insert(whatsappPhoneNumbers)
      .values([
        {
          tenantId,
          wabaAccountId: insertedWabas[0].id,
          phoneNumber: '+44 20 7946 0192',
          displayName: 'Apex UK & Europe Enterprise Desk',
          phoneNumberId: 'PNID_UK_1092837465',
          channelType: 'whatsapp',
          department: 'Enterprise Sales',
          assignedStaffName: 'Marcus Chen',
          assignedAiAgentId: defaultAgentId,
          aiStatus: 'auto_active',
          businessHours: '08:00 - 20:00 Europe/London',
          language: 'English',
          qualityRating: 'GREEN (High · 100k/day tier)',
          connectionStatus: hasMetaToken ? 'connected_live' : 'webhook_ready',
          lastWebhookAt: new Date(Date.now() - 1000 * 60 * 12),
          recentError: hasMetaToken ? null : 'Outbound Graph API requires META_WHATSAPP_ACCESS_TOKEN',
        },
        {
          tenantId,
          wabaAccountId: insertedWabas[0].id,
          phoneNumber: '+971 4 512 9088',
          displayName: 'Apex MENA & Dubai Concierge',
          phoneNumberId: 'PNID_UAE_4829103847',
          channelType: 'whatsapp',
          department: 'MENA & Europe Support',
          assignedStaffName: 'Layla Al-Mansoor',
          assignedAiAgentId: defaultAgentId,
          aiStatus: 'auto_active',
          businessHours: '09:00 - 21:00 Asia/Dubai',
          language: 'Arabic & English',
          qualityRating: 'GREEN (High · 100k/day tier)',
          connectionStatus: 'webhook_ready',
          lastWebhookAt: new Date(Date.now() - 1000 * 60 * 28),
          recentError: null,
        },
        {
          tenantId,
          wabaAccountId: insertedWabas[1].id,
          phoneNumber: '+1 415 890 4321',
          displayName: 'Apex US & Americas Sales Line',
          phoneNumberId: 'PNID_US_9928371829',
          channelType: 'whatsapp',
          department: 'Enterprise Sales',
          assignedStaffName: 'Marcus Chen',
          assignedAiAgentId: defaultAgentId,
          aiStatus: 'approval_required',
          businessHours: '08:00 - 18:00 America/New_York',
          language: 'English & Spanish',
          qualityRating: 'GREEN (High · 10k/day tier)',
          connectionStatus: 'webhook_ready',
          lastWebhookAt: new Date(Date.now() - 1000 * 60 * 55),
          recentError: null,
        },
        {
          tenantId,
          wabaAccountId: insertedWabas[0].id,
          phoneNumber: '+44 20 7946 0888',
          displayName: 'Apex 24/7 SLA Technical Support',
          phoneNumberId: 'PNID_SUP_3391827364',
          channelType: 'whatsapp',
          department: 'Technical Support',
          assignedStaffName: 'Layla Al-Mansoor',
          assignedAiAgentId: supportAgentId,
          aiStatus: 'approval_required',
          businessHours: '24/7 Coverage',
          language: 'English',
          qualityRating: 'GREEN (High)',
          connectionStatus: 'webhook_ready',
          lastWebhookAt: new Date(Date.now() - 1000 * 60 * 5),
          recentError: null,
        },
        {
          tenantId,
          wabaAccountId: insertedWabas[2].id,
          phoneNumber: '@apexglobal.official',
          displayName: 'Instagram Business DM & Reels Auto-Responder',
          phoneNumberId: 'IG_ID_774829102',
          channelType: 'instagram',
          department: 'Growth & Social Marketing',
          assignedStaffName: 'Sofia Rossi',
          assignedAiAgentId: socialAgentId,
          aiStatus: 'auto_active',
          businessHours: '24/7 Automated DM & Comment Trigger',
          language: 'English, Spanish, Italian',
          qualityRating: 'Verified Business Handle',
          connectionStatus: 'webhook_ready',
          lastWebhookAt: new Date(Date.now() - 1000 * 60 * 4),
          recentError: null,
        },
        {
          tenantId,
          wabaAccountId: insertedWabas[2].id,
          phoneNumber: 'fb.com/ApexGlobalCRM',
          displayName: 'Facebook Page Messenger & Click-to-WhatsApp Ads',
          phoneNumberId: 'FB_PAGE_663918273',
          channelType: 'facebook',
          department: 'Growth & Social Marketing',
          assignedStaffName: 'Sofia Rossi',
          assignedAiAgentId: socialAgentId,
          aiStatus: 'auto_active',
          businessHours: '24/7 Automated Messenger',
          language: 'English',
          qualityRating: 'Verified Page',
          connectionStatus: 'webhook_ready',
          lastWebhookAt: new Date(Date.now() - 1000 * 60 * 19),
          recentError: null,
        },
        {
          tenantId,
          wabaAccountId: insertedWabas[2].id,
          phoneNumber: '@apexglobal.ai',
          displayName: 'TikTok Business Lead Gen & Direct Message Bot',
          phoneNumberId: 'TT_BIZ_552910384',
          channelType: 'tiktok',
          department: 'Growth & Social Marketing',
          assignedStaffName: 'Sofia Rossi',
          assignedAiAgentId: socialAgentId,
          aiStatus: 'auto_active',
          businessHours: '24/7 Automated Lead Capture',
          language: 'English',
          qualityRating: 'TikTok Business Account',
          connectionStatus: 'webhook_ready',
          lastWebhookAt: new Date(Date.now() - 1000 * 60 * 31),
          recentError: null,
        },
      ])
      .returning();

    // 6. Seed Social Media & WhatsApp Ad Boost Campaigns
    await db.insert(socialBoostCampaigns).values([
      {
        tenantId,
        channelType: 'instagram',
        campaignName: 'Q4 Instagram Reels Boost — "Automate 50+ WhatsApp Lines with AI"',
        objective: 'Click-to-DM & Comment Keyword ("GROWTH") Auto-Qualification',
        adCopy: 'Scaling customer operations across 20+ WhatsApp numbers? Comment GROWTH or send us a DM and our AI Concierge will build your custom deployment blueprint in 60 seconds.',
        targetAudience: 'B2B Founders, COO, Customer Support Directors (UK, UAE, US)',
        dailyBudgetUsd: '85',
        durationDays: 14,
        linkedAiAgentId: socialAgentId,
        autoRespondCommentsAndDms: true,
        status: 'active_sandbox',
        impressions: 42890,
        clicks: 1640,
        conversationsStarted: 312,
        qualifiedLeadsCount: 68,
      },
      {
        tenantId,
        channelType: 'facebook',
        campaignName: 'Facebook Click-to-WhatsApp (CTWA) Enterprise Lead Funnel',
        objective: 'Direct WhatsApp Conversation + Instant Lead Scoring',
        adCopy: 'Connect all your regional WhatsApp Business numbers, Instagram DMs, and TikTok leads into one unified AI inbox. Tap "Send WhatsApp Message" to test our live demo desk.',
        targetAudience: 'E-Commerce & Real Estate Agencies (25-250 employees)',
        dailyBudgetUsd: '120',
        durationDays: 30,
        linkedAiAgentId: defaultAgentId,
        autoRespondCommentsAndDms: true,
        status: 'active_sandbox',
        impressions: 68400,
        clicks: 2310,
        conversationsStarted: 489,
        qualifiedLeadsCount: 114,
      },
      {
        tenantId,
        channelType: 'tiktok',
        campaignName: 'TikTok Spark Ad Boost — Omnichannel AI Voice & Chat Walkthrough',
        objective: 'TikTok Instant Message & Lead Form Auto-Response',
        adCopy: 'Watch how 1 AI agent handles WhatsApp, Instagram, and TikTok DMs simultaneously while booking qualified sales calls.',
        targetAudience: 'High-Growth D2C Brands & SaaS Operators',
        dailyBudgetUsd: '95',
        durationDays: 10,
        linkedAiAgentId: socialAgentId,
        autoRespondCommentsAndDms: true,
        status: 'pending_approval',
        impressions: 19200,
        clicks: 820,
        conversationsStarted: 145,
        qualifiedLeadsCount: 29,
      },
    ]);

    // 7. Seed Knowledge Base Documents & Chunks
    const insertedDocs = await db
      .insert(knowledgeDocuments)
      .values([
        {
          tenantId,
          title: 'Official Pricing, Plans & Multi-Number Tiers (2026 Approved)',
          docType: 'pdf',
          departmentScope: 'All Departments',
          content:
            'ConnectAI CRM Approved Pricing Tiers:\n1. Starter Team Plan: $99/month — Up to 5 Official WhatsApp Business numbers, 10 staff seats, 10,000 monthly conversations, 500 Voice AI minutes, Facebook & Instagram DM integration included.\n2. Growth Pro Plan: $299/month — Up to 35 Official WhatsApp Business numbers, 30 staff seats, 50,000 monthly conversations, 2,000 Voice AI minutes, TikTok Business & Social Ad Boost automation included.\n3. Enterprise 100+ Fleet Plan: $799/month — 100+ Official WhatsApp Business numbers (subject to Meta WABA tier eligibility), unlimited departments, dedicated SLA, custom RAG security policy, and SSO.\nImportant Policy: Annual billing provides a 15% discount. Custom volume quotes above 250 numbers require VP of Sales approval. Never offer unauthorized discounts.',
          sourceReference: 'pricing_sheet_v4_approved.pdf',
          processingStatus: 'ready',
          versionNumber: 4,
          chunkCount: 3,
        },
        {
          tenantId,
          title: 'Meta WhatsApp 24-Hour Customer Service Window & Template Policy',
          docType: 'faq',
          departmentScope: 'Sales & Customer Success',
          content:
            'Official WhatsApp Business Platform Compliance Rules:\n- Standard free-form text or AI messages can only be sent within 24 hours of the customer\'s last inbound message (the Customer Service Window).\n- Outside the 24-hour window, outbound contact requires an approved Meta Utility, Authentication, or Marketing Template message and explicit customer opt-in consent.\n- If a customer replies STOP or UNSUBSCRIBE, immediately mark consent_status as opted_out and halt all automated workflows.',
          sourceReference: 'whatsapp_compliance_handbook.docx',
          processingStatus: 'ready',
          versionNumber: 2,
          chunkCount: 2,
        },
        {
          tenantId,
          title: 'Omnichannel Social Boost & Facebook/Instagram/TikTok Auto-DM Guide',
          docType: 'txt',
          departmentScope: 'Growth & Social Marketing',
          content:
            'Social Media & Boost Automation Guidelines:\n- Connected Facebook Pages, Instagram Professional accounts, and TikTok Business profiles route all comments and direct messages into the Unified Inbox.\n- Ad Boost campaigns require human manager approval before live budget spend is committed.\n- When a prospect messages from an Instagram Reel boost or Click-to-WhatsApp ad, the Pulse AI agent qualifies their company size, captures their phone/email, and creates a CRM Lead when score >= 65.',
          sourceReference: 'social_growth_playbook.txt',
          processingStatus: 'ready',
          versionNumber: 1,
          chunkCount: 2,
        },
      ])
      .returning();

    for (const doc of insertedDocs) {
      await db.insert(knowledgeChunks).values({
        tenantId,
        documentId: doc.id,
        chunkIndex: 0,
        content: doc.content,
      });
    }

    // 8. Seed CRM Contacts
    const insertedContacts = await db
      .insert(contacts)
      .values([
        {
          tenantId,
          name: 'Henrik Lindqvist',
          phone: '+44 7700 900412',
          email: 'h.lindqvist@nordicfreight.se',
          company: 'Nordic Freight & Logistics AB',
          preferredLanguage: 'English',
          sourceChannel: 'whatsapp',
          consentStatus: 'opted_in',
          connectedNumberDisplay: '+44 20 7946 0192',
          assignedEmployee: 'Marcus Chen',
          requirementsSummary: 'Needs 45 regional WhatsApp Business numbers for port dispatchers + automated shipment status AI agent.',
          notes: 'Decision maker (COO). Evaluating Enterprise 100+ Fleet Plan for Q4 rollout.',
        },
        {
          tenantId,
          name: 'Amira Al-Futtaim',
          phone: '+971 50 492 8810',
          email: 'amira@gulfpremierproperties.ae',
          company: 'Gulf Premier Properties Dubai',
          preferredLanguage: 'Arabic & English',
          sourceChannel: 'instagram',
          consentStatus: 'opted_in',
          connectedNumberDisplay: '@apexglobal.official',
          assignedEmployee: 'Layla Al-Mansoor',
          requirementsSummary: 'Inbound from Q4 Instagram Reels Boost. Wants 60 broker WhatsApp lines + Instagram DM auto-responder for luxury villa inquiries.',
          notes: 'High-intent lead from Instagram Boost campaign. Requested executive demo on Thursday.',
        },
        {
          tenantId,
          name: 'Carlos Mendoza',
          phone: '+1 305 555 0194',
          email: 'cmendoza@solarismed.com',
          company: 'Solaris Medical Clinics',
          preferredLanguage: 'Spanish & English',
          sourceChannel: 'facebook',
          consentStatus: 'opted_in',
          connectedNumberDisplay: 'fb.com/ApexGlobalCRM',
          assignedEmployee: 'Sofia Rossi',
          requirementsSummary: 'Clicked Facebook CTWA Ad. Needs patient appointment scheduling across 22 clinic WhatsApp numbers and Voice AI reminder calls.',
          notes: 'Requires HIPAA/GDPR data retention controls (30-day transcript purge).',
        },
        {
          tenantId,
          name: 'Chloe Takahashi',
          phone: '@chloe.velo.commerce',
          email: 'chloe@velocommerce.io',
          company: 'Velo D2C Brands',
          preferredLanguage: 'English',
          sourceChannel: 'tiktok',
          consentStatus: 'opted_in',
          connectedNumberDisplay: '@apexglobal.ai',
          assignedEmployee: 'Sofia Rossi',
          requirementsSummary: 'TikTok Spark Ad lead. Wants automated TikTok & Instagram DM chatbot + social boost campaign manager for product drops.',
          notes: 'Growth Pro Plan fit ($299/mo).',
        },
      ])
      .returning();

    // 9. Seed Unified Inbox Conversations & Messages
    const insertedConvs = await db
      .insert(conversations)
      .values([
        {
          tenantId,
          contactId: insertedContacts[0].id,
          phoneNumberId: insertedNumbers[0].id,
          channelType: 'whatsapp',
          customerName: 'Henrik Lindqvist',
          customerHandleOrPhone: '+44 7700 900412',
          status: 'open',
          priority: 'urgent',
          department: 'Enterprise Sales',
          assignedEmployee: 'Marcus Chen',
          assignedAiAgentId: defaultAgentId,
          handlingMode: 'ai_auto',
          unreadCount: 1,
          aiSummary: 'COO at Nordic Freight inquiring about connecting 45 regional WhatsApp Business numbers and Enterprise 100+ Fleet Plan pricing ($799/mo). High buying intent.',
          detectedIntent: 'enterprise_pricing_and_onboarding',
          sentiment: 'positive',
          suggestedReply: 'Based on our approved Enterprise 100+ Fleet Plan ($799/month), you can connect all 45 regional WhatsApp Business numbers with department-level routing and dedicated SLA. Would you like me to schedule a 20-minute onboarding walkthrough with Marcus Chen tomorrow?',
          tagsCsv: 'Enterprise,45-Numbers,WhatsApp-Cloud-API',
          serviceWindowOpen: true,
          lastMessagePreview: 'Can we assign each of the 45 WhatsApp numbers to separate port teams while keeping one unified dashboard?',
          lastMessageAt: new Date(Date.now() - 1000 * 60 * 6),
        },
        {
          tenantId,
          contactId: insertedContacts[1].id,
          phoneNumberId: insertedNumbers[4].id,
          channelType: 'instagram',
          customerName: 'Amira Al-Futtaim',
          customerHandleOrPhone: '@amira.gulfproperties',
          status: 'open',
          priority: 'high',
          department: 'Growth & Social Marketing',
          assignedEmployee: 'Layla Al-Mansoor',
          assignedAiAgentId: socialAgentId,
          handlingMode: 'ai_auto',
          unreadCount: 2,
          aiSummary: 'Responded to Q4 Instagram Reels Boost ("GROWTH"). Wants to connect 60 broker WhatsApp numbers + Instagram DM automation and run property ad boosts directly.',
          detectedIntent: 'social_boost_and_multi_whatsapp',
          sentiment: 'positive',
          suggestedReply: 'Yes! ConnectAI CRM lets you manage all 60 broker WhatsApp Business numbers alongside your Instagram and Facebook DMs, and launch AI-assisted Ad Boosts directly from the dashboard.',
          tagsCsv: 'IG-Boost-Lead,60-Numbers,Real-Estate-MENA',
          serviceWindowOpen: true,
          lastMessagePreview: 'I saw your Instagram Reel! Can your AI also reply to our boosted Instagram and TikTok property posts automatically?',
          lastMessageAt: new Date(Date.now() - 1000 * 60 * 11),
        },
        {
          tenantId,
          contactId: insertedContacts[2].id,
          phoneNumberId: insertedNumbers[5].id,
          channelType: 'facebook',
          customerName: 'Carlos Mendoza',
          customerHandleOrPhone: '+1 305 555 0194 (FB CTWA)',
          status: 'pending',
          priority: 'high',
          department: 'Enterprise Sales',
          assignedEmployee: 'Sofia Rossi',
          assignedAiAgentId: defaultAgentId,
          handlingMode: 'ai_approval',
          unreadCount: 0,
          aiSummary: 'Clicked Facebook Click-to-WhatsApp Ad. Asking about 22 clinic numbers and bilingual Spanish/English AI Voice appointment reminders.',
          detectedIntent: 'voice_ai_and_clinic_routing',
          sentiment: 'neutral',
          suggestedReply: 'Our Growth Pro Plan ($299/mo) supports up to 35 official WhatsApp Business numbers and includes 2,000 Voice AI minutes with Spanish and English TTS support.',
          tagsCsv: 'FB-CTWA-Ad,Voice-AI,Healthcare',
          serviceWindowOpen: true,
          lastMessagePreview: 'Do the AI voice appointment reminders support both Spanish and English patients?',
          lastMessageAt: new Date(Date.now() - 1000 * 60 * 24),
        },
        {
          tenantId,
          contactId: insertedContacts[3].id,
          phoneNumberId: insertedNumbers[6].id,
          channelType: 'tiktok',
          customerName: 'Chloe Takahashi',
          customerHandleOrPhone: '@chloe.velo.commerce',
          status: 'open',
          priority: 'normal',
          department: 'Growth & Social Marketing',
          assignedEmployee: 'Sofia Rossi',
          assignedAiAgentId: socialAgentId,
          handlingMode: 'ai_auto',
          unreadCount: 1,
          aiSummary: 'TikTok Business DM lead asking how to connect TikTok, Instagram, and WhatsApp into one AI chatbot to boost D2C conversions.',
          detectedIntent: 'omnichannel_social_chatbot',
          sentiment: 'positive',
          suggestedReply: 'You can connect your TikTok Business account, Instagram, Facebook Page, and WhatsApp numbers in Integrations. Our Pulse AI Agent responds automatically to DMs and comments 24/7.',
          tagsCsv: 'TikTok-Lead,D2C-Growth,Auto-Chatbot',
          serviceWindowOpen: true,
          lastMessagePreview: 'How fast does the AI respond when someone messages us from a boosted TikTok video?',
          lastMessageAt: new Date(Date.now() - 1000 * 60 * 35),
        },
      ])
      .returning();

    // Seed Messages for Conversation 1 (Henrik - WhatsApp)
    await db.insert(messages).values([
      {
        tenantId,
        conversationId: insertedConvs[0].id,
        senderType: 'customer',
        senderName: 'Henrik Lindqvist',
        direction: 'inbound',
        contentType: 'text',
        content: 'Hello, we operate 45 regional dispatch WhatsApp Business numbers across Europe. What is your pricing for 45 numbers and can your AI answer customer queries from our PDF rate cards?',
        deliveryStatus: 'read',
        providerMessageId: 'wamid.HBgMNDQ3NzAwOTAwNDEyFQIAEhggMDE',
      },
      {
        tenantId,
        conversationId: insertedConvs[0].id,
        senderType: 'ai_agent',
        senderName: 'Aria — Global WhatsApp & Omnichannel Concierge',
        direction: 'outbound',
        contentType: 'text',
        content: 'Hello Henrik! According to our approved pricing documentation, 45 WhatsApp Business numbers are supported under our Enterprise 100+ Fleet Plan at $799/month (or Growth Pro at $299/month for up to 35 numbers). You can upload your PDF rate cards to the Knowledge Base so our AI answers strictly from verified company documents with source citations.',
        deliveryStatus: 'delivered',
        providerMessageId: 'wamid.HBgMNDQ3NzAwOTAwNDEyFQIAEhggMDI',
        aiModelUsed: 'gemini-3.8-flash',
        aiConfidence: '0.94',
        knowledgeCitations: 'Official Pricing, Plans & Multi-Number Tiers (2026 Approved)',
      },
      {
        tenantId,
        conversationId: insertedConvs[0].id,
        senderType: 'staff',
        senderName: 'Marcus Chen',
        direction: 'internal_note',
        contentType: 'text',
        content: 'Internal Note: Verified Nordic Freight on LinkedIn (420 employees). High-priority Q4 enterprise deal — keep AI in auto-assist mode and book technical discovery.',
        deliveryStatus: 'internal',
      },
      {
        tenantId,
        conversationId: insertedConvs[0].id,
        senderType: 'customer',
        senderName: 'Henrik Lindqvist',
        direction: 'inbound',
        contentType: 'text',
        content: 'Can we assign each of the 45 WhatsApp numbers to separate port teams while keeping one unified dashboard?',
        deliveryStatus: 'read',
        providerMessageId: 'wamid.HBgMNDQ3NzAwOTAwNDEyFQIAEhggMDM',
      },
    ]);

    // Seed Messages for Conversation 2 (Amira - Instagram)
    await db.insert(messages).values([
      {
        tenantId,
        conversationId: insertedConvs[1].id,
        senderType: 'customer',
        senderName: 'Amira Al-Futtaim',
        direction: 'inbound',
        contentType: 'text',
        content: 'GROWTH — I saw your Instagram Reel! Can your AI also reply to our boosted Instagram and TikTok property posts automatically and route qualified buyers to our 60 WhatsApp brokers?',
        deliveryStatus: 'read',
        providerMessageId: 'igmid.88392019283',
      },
      {
        tenantId,
        conversationId: insertedConvs[1].id,
        senderType: 'ai_agent',
        senderName: 'Pulse — Social Ad Boost & TikTok/IG Lead Closer',
        direction: 'outbound',
        contentType: 'text',
        content: 'Welcome Amira! Yes — ConnectAI CRM connects your Instagram Professional account, Facebook Page, TikTok Business profile, and up to 100+ official WhatsApp Business broker numbers. When a buyer comments or DMs on a boosted post, Pulse responds automatically, qualifies their budget, and routes the lead to the assigned broker.',
        deliveryStatus: 'delivered',
        providerMessageId: 'igmid.88392019284',
        aiModelUsed: 'gemini-3.8-flash',
        aiConfidence: '0.92',
        knowledgeCitations: 'Omnichannel Social Boost & Facebook/Instagram/TikTok Auto-DM Guide',
      },
    ]);

    // Seed Messages for Conversation 3 (Carlos - Facebook CTWA)
    await db.insert(messages).values([
      {
        tenantId,
        conversationId: insertedConvs[2].id,
        senderType: 'customer',
        senderName: 'Carlos Mendoza',
        direction: 'inbound',
        contentType: 'text',
        content: 'Do the AI voice appointment reminders support both Spanish and English patients across our 22 clinic numbers?',
        deliveryStatus: 'read',
        providerMessageId: 'fbmid.77482910',
      },
    ]);

    // Seed Messages for Conversation 4 (Chloe - TikTok)
    await db.insert(messages).values([
      {
        tenantId,
        conversationId: insertedConvs[3].id,
        senderType: 'customer',
        senderName: 'Chloe Takahashi',
        direction: 'inbound',
        contentType: 'text',
        content: 'How fast does the AI respond when someone messages us from a boosted TikTok video?',
        deliveryStatus: 'read',
        providerMessageId: 'ttmid.55492011',
      },
    ]);

    // 10. Seed Pipeline Stages & Leads
    const stageNames = [
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
    for (let i = 0; i < stageNames.length; i++) {
      await db.insert(pipelineStages).values({
        tenantId,
        name: stageNames[i],
        stageOrder: i + 1,
        color:
          stageNames[i] === 'Deployed' || stageNames[i] === 'Closed Won'
            ? 'emerald'
            : stageNames[i] === 'Rejected'
            ? 'rose'
            : 'indigo',
      });
    }

    await db.insert(leads).values([
      {
        tenantId,
        contactId: insertedContacts[0].id,
        title: 'Nordic Freight — Senior Port Operations & 45-Line Fleet Rollout',
        contactName: 'Henrik Lindqvist',
        phone: '+44 7700 900412',
        email: 'h.lindqvist@nordicfreight.se',
        nationality: 'Swedish',
        preferredJob: 'Senior Port Operations & Logistics Director',
        destinationCountry: 'United Kingdom & Sweden',
        ownerName: 'Marcus Chen',
        sourceChannel: 'whatsapp',
        priority: 'urgent',
        stage: 'Qualified',
        leadScore: 94,
        scoreExplanation: '+35 Verified Executive Profile · +30 Multi-Country Scope · +29 Immediate Q4 Timeline',
        extractedRequirements: '45 WABA lines, department RBAC for port teams, PDF rate-card RAG grounding.',
        notes: 'Verified identity & company registration; ready for final employer/executive review.',
        estimatedValueUsd: '9588',
        nextAction: 'Conduct technical WABA onboarding call',
        dueDate: '2026-10-22',
      },
      {
        tenantId,
        contactId: insertedContacts[1].id,
        title: 'Gulf Premier — Luxury Property Consultant Cohort & 60-Line Desk',
        contactName: 'Amira Al-Futtaim',
        phone: '+971 50 492 8810',
        email: 'amira@gulfpremierproperties.ae',
        nationality: 'Emirati (UAE)',
        preferredJob: 'International Real Estate Advisory & Broker Cohort',
        destinationCountry: 'United Arab Emirates',
        ownerName: 'Layla Al-Mansoor',
        sourceChannel: 'instagram',
        priority: 'high',
        stage: 'Employer Review',
        leadScore: 91,
        scoreExplanation: '+30 Inbound from IG Reel Boost · +35 60 Broker Lines · +26 Executive Demo Booked',
        extractedRequirements: '60 WhatsApp broker numbers, Instagram/TikTok auto-DM responder, bilingual Arabic/English AI.',
        notes: 'High-intent lead from Instagram Boost campaign. Scheduled executive walkthrough.',
        estimatedValueUsd: '14400',
        nextAction: 'Executive demo & Meta Embedded Signup walkthrough',
        dueDate: '2026-10-21',
      },
      {
        tenantId,
        contactId: insertedContacts[2].id,
        title: 'Solaris Medical — Bilingual Clinical Specialists & 22-Clinic Voice AI',
        contactName: 'Carlos Mendoza',
        phone: '+1 305 555 0194',
        email: 'cmendoza@solarismed.com',
        nationality: 'Spanish / US',
        preferredJob: 'Registered Nurse & Clinical Operations Coordinator',
        destinationCountry: 'United States & Spain',
        ownerName: 'Sofia Rossi',
        sourceChannel: 'facebook',
        priority: 'high',
        stage: 'Documents Pending',
        leadScore: 84,
        scoreExplanation: '+25 Facebook CTWA Ad · +30 22 Clinic Lines · +29 Voice TTS Integration Fit',
        extractedRequirements: '22 WhatsApp lines, bilingual Spanish/English Voice AI reminders, 30-day retention compliance.',
        notes: 'Credential verification in progress; requires 30-day transcript retention policy.',
        estimatedValueUsd: '3588',
        nextAction: 'Follow up on credential & HIPAA/GDPR addendum',
        dueDate: '2026-10-24',
      },
      {
        tenantId,
        contactId: insertedContacts[3].id,
        title: 'Velo Commerce — E-Commerce Growth & Social Specialist Placement',
        contactName: 'Chloe Takahashi',
        phone: '@chloe.velo.commerce',
        email: 'chloe@velocommerce.io',
        nationality: 'Japanese / UK',
        preferredJob: 'Omnichannel Growth & Social Marketing Lead',
        destinationCountry: 'United Kingdom',
        ownerName: 'Sofia Rossi',
        sourceChannel: 'tiktok',
        priority: 'normal',
        stage: 'Contacted',
        leadScore: 76,
        scoreExplanation: '+30 TikTok Spark Ad Lead · +25 Multi-Social DM Fit · +21 Active Schedule',
        extractedRequirements: 'TikTok Business + Instagram DM automation + Ad Boost campaign management.',
        notes: 'Initial screening completed via TikTok DM.',
        estimatedValueUsd: '3588',
        nextAction: 'Share Growth Pro onboarding checklist',
        dueDate: '2026-10-26',
      },
    ]);

    // 11. Seed Tasks & Appointments
    await db.insert(tasks).values([
      {
        tenantId,
        title: 'Verify Meta Embedded Signup WABA ID for Nordic Freight (45 numbers)',
        taskType: 'follow_up',
        assignedEmployee: 'Marcus Chen',
        contactName: 'Henrik Lindqvist',
        conversationId: insertedConvs[0].id,
        dueDate: '2026-10-20',
        priority: 'urgent',
        status: 'pending',
      },
      {
        tenantId,
        title: 'Approve TikTok Spark Ad Boost budget ($95/day) & Pulse AI script',
        taskType: 'social_boost',
        assignedEmployee: actorName,
        contactName: 'Chloe Takahashi',
        conversationId: insertedConvs[3].id,
        dueDate: '2026-10-20',
        priority: 'high',
        status: 'pending',
      },
      {
        tenantId,
        title: 'Send bilingual Spanish Voice AI sample WAV to Solaris Medical',
        taskType: 'call',
        assignedEmployee: 'Sofia Rossi',
        contactName: 'Carlos Mendoza',
        conversationId: insertedConvs[2].id,
        dueDate: '2026-10-21',
        priority: 'normal',
        status: 'in_progress',
      },
    ]);

    await db.insert(appointments).values([
      {
        tenantId,
        contactName: 'Amira Al-Futtaim (Gulf Premier Properties)',
        title: '60-Number WhatsApp + IG/TikTok Ad Boost Architecture Review',
        scheduledAt: '2026-10-21 14:00 UTC',
        durationMinutes: 45,
        status: 'scheduled',
        channelSource: 'instagram',
        notes: 'Demonstrate live routing between Instagram Reels Boost comments and Dubai WhatsApp broker numbers.',
      },
      {
        tenantId,
        contactName: 'Henrik Lindqvist (Nordic Freight)',
        title: 'Enterprise 100+ Fleet WABA Migration & Security Audit',
        scheduledAt: '2026-10-22 10:30 UTC',
        durationMinutes: 30,
        status: 'scheduled',
        channelSource: 'whatsapp',
        notes: 'Review webhook HMAC signature validation and department RBAC.',
      },
    ]);

    // 12. Seed Workflows & Approvals
    const insertedWorkflows = await db
      .insert(workflowDefinitions)
      .values([
        {
          tenantId,
          name: 'Inbound WhatsApp & Social DM → Grounded AI Reply + Lead Qualification',
          description: 'Checks consent & 24h service window, retrieves Knowledge Base chunks, generates grounded Gemini reply, extracts CRM requirements, and creates a Lead when score >= 75.',
          triggerType: 'inbound_whatsapp_or_social',
          conditionsSummary: 'Consent == opted_in AND ServiceWindow == open AND AI Confidence >= 80%',
          actionsSummary: '1. Query Knowledge Base RAG → 2. Generate Gemini 3.8 Flash Reply → 3. Upsert Contact & Lead Score → 4. Log Audit Trail',
          requiresApproval: false,
          isActive: true,
          executionCount: 142,
          successCount: 140,
          failureCount: 2,
        },
        {
          tenantId,
          name: 'Instagram / Facebook / TikTok Boost Comment → Auto-DM + Sales Task',
          description: 'Triggers when a prospect comments "GROWTH" or clicks a boosted social post, sends an instant AI qualification DM, and assigns a follow-up task.',
          triggerType: 'inbound_social_dm',
          conditionsSummary: 'Channel IN [instagram, facebook, tiktok] AND Campaign == Active Boost',
          actionsSummary: '1. Send Pulse AI Qualification DM → 2. Capture Phone/Email → 3. Create High-Priority CRM Lead',
          requiresApproval: false,
          isActive: true,
          executionCount: 89,
          successCount: 89,
          failureCount: 0,
        },
        {
          tenantId,
          name: 'High-Value Opportunity (> $10k) → Manager Approval & Voice Call Follow-up',
          description: 'When an extracted lead exceeds $10,000 estimated value, pauses automatic outbound calling and requests manager approval.',
          triggerType: 'new_qualified_lead',
          conditionsSummary: 'Lead Estimated Value >= $10,000 AND Consent == opted_in',
          actionsSummary: '1. Create Manager Approval Request → 2. Prepare Gemini 3.8 Flash TTS Call Script → 3. Notify Department Head',
          requiresApproval: true,
          isActive: true,
          executionCount: 18,
          successCount: 18,
          failureCount: 0,
        },
      ])
      .returning();

    await db.insert(workflowExecutions).values([
      {
        tenantId,
        workflowId: insertedWorkflows[0].id,
        workflowName: insertedWorkflows[0].name,
        triggerContext: 'Inbound WhatsApp from Henrik Lindqvist (+44 7700 900412)',
        status: 'completed',
        stepDetails: 'Consent verified → Retrieved Pricing PDF chunk #1 → Generated reply (0.94 confidence) → Updated Lead Score to 94',
      },
      {
        tenantId,
        workflowId: insertedWorkflows[1].id,
        workflowName: insertedWorkflows[1].name,
        triggerContext: 'Instagram Reel Boost DM from Amira Al-Futtaim (@amira.gulfproperties)',
        status: 'completed',
        stepDetails: 'Matched keyword GROWTH → Sent Pulse AI reply → Created Lead ($14,400 est.) → Assigned to Layla Al-Mansoor',
      },
    ]);

    await db.insert(approvals).values([
      {
        tenantId,
        approvalType: 'social_boost_campaign',
        title: 'Approve TikTok Spark Ad Boost ($95/day for 10 days)',
        description: 'Campaign: "TikTok Spark Ad Boost — Omnichannel AI Voice & Chat Walkthrough" linked to Pulse AI Agent.',
        targetEntityId: 3,
        status: 'pending',
        requestedBy: 'Sofia Rossi',
      },
      {
        tenantId,
        approvalType: 'ai_reply',
        title: 'Approve AI Technical Reply to Carlos Mendoza (Solaris Medical)',
        description: 'Proposed response confirming Spanish/English Gemini Voice TTS support and 30-day data retention controls.',
        targetEntityId: insertedConvs[2].id,
        status: 'pending',
        requestedBy: 'Sentinel AI Agent',
      },
    ]);

    // 13. Seed Voice AI Sessions & Transcripts
    const insertedVoice = await db
      .insert(voiceSessions)
      .values([
        {
          tenantId,
          contactName: 'Henrik Lindqvist (Nordic Freight)',
          phoneNumber: '+44 7700 900412',
          voiceAgentName: 'Aria Voice Concierge (Gemini 3.8 Flash TTS)',
          callType: 'sandbox_tts_simulation',
          voicePersona: 'Kore',
          language: 'English',
          status: 'completed',
          durationSeconds: 58,
          estimatedCostUsd: '0.04',
          consentRecorded: true,
          outcomeSummary: 'Qualified 45-number port dispatch requirement and confirmed Thursday 10:30 UTC architecture call.',
        },
        {
          tenantId,
          contactName: 'Carlos Mendoza (Solaris Medical)',
          phoneNumber: '+1 305 555 0194',
          voiceAgentName: 'Aria Bilingual Healthcare Voice Agent',
          callType: 'whatsapp_business_calling',
          voicePersona: 'Puck',
          language: 'Spanish & English',
          status: 'blocked_unconfigured_api',
          durationSeconds: 0,
          estimatedCostUsd: '0.00',
          consentRecorded: true,
          outcomeSummary: 'Official WhatsApp Business Calling API permission not yet enabled on WABA-773910442190; synthesized Gemini 3.8 Flash TTS preview ready.',
        },
      ])
      .returning();

    await db.insert(callTranscripts).values([
      {
        tenantId,
        voiceSessionId: insertedVoice[0].id,
        scriptAndTranscript:
          'Aria (Kore): Hello Henrik, this is Aria, the automated AI voice concierge from Apex Global. This call is recorded with your consent. I am following up on your inquiry regarding 45 regional WhatsApp Business lines.\nHenrik: Great, we need each port terminal in Sweden and the UK to manage its own number while headquarters sees all analytics.\nAria (Kore): Understood! Our Enterprise 100+ Fleet Plan supports strict department-level number permissions with a unified executive dashboard. I have locked in your technical onboarding review with Marcus Chen.',
        aiSummary: 'Customer confirmed multi-terminal RBAC requirement for 45 numbers across UK and Sweden.',
        extractedNextSteps: 'Prepare multi-department WABA routing template prior to Thursday meeting.',
      },
    ]);

    // 14. Seed Integration Credentials (Honest live vs unconfigured states)
    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
    await db.insert(integrationCredentials).values([
      {
        tenantId,
        providerKey: 'gemini_ai',
        displayName: 'Google Gemini AI Engine (3.8 Flash, 3.8 Flash TTS, 4 Argon Vision, Search Grounding)',
        category: 'AI & Speech',
        status: hasGeminiKey ? 'connected' : 'not_configured',
        maskedCredentialHint: hasGeminiKey ? 'process.env.GEMINI_API_KEY (Server-Side Managed)' : 'Missing GEMINI_API_KEY',
        requiredPermissions: 'Server-side @google/genai SDK access for text, RAG, Google Search grounding, TTS, and Vision',
        setupInstructions: 'Managed automatically via Google AI Studio server environment variables.',
        lastSuccessAt: hasGeminiKey ? new Date() : null,
        recentError: hasGeminiKey ? null : 'GEMINI_API_KEY environment variable is not configured.',
      },
      {
        tenantId,
        providerKey: 'cloudsql_postgres',
        displayName: 'Google Cloud SQL (PostgreSQL + Drizzle ORM Multi-Tenant Isolation)',
        category: 'Database & Auth',
        status: 'connected',
        maskedCredentialHint: `Host: ${process.env.SQL_HOST ? 'Cloud SQL Auth Proxy Socket' : 'Configured'}`,
        requiredPermissions: 'Read/Write Pool + Firebase Auth Token Verification',
        setupInstructions: 'Connected via Cloud SQL Auth Proxy and Drizzle ORM.',
        lastSuccessAt: new Date(),
        recentError: null,
      },
      {
        tenantId,
        providerKey: 'meta_whatsapp',
        displayName: 'Official Meta WhatsApp Business Platform / Cloud API (Graph API v21.0)',
        category: 'Messaging Channels',
        status: hasMetaToken ? 'connected' : 'not_configured',
        maskedCredentialHint: hasMetaToken ? 'Bearer EAAG... (Configured)' : 'Not Configured — Enter System User Token',
        requiredPermissions: 'whatsapp_business_messaging, whatsapp_business_management',
        setupInstructions: 'Provide your Meta System User Access Token, WABA ID, and Webhook Verify Token. Webhook endpoint: POST /api/webhooks/whatsapp',
        lastSuccessAt: hasMetaToken ? new Date() : null,
        recentError: hasMetaToken ? null : 'Live Graph API outbound dispatch requires a valid Meta WhatsApp Access Token. Local webhook simulator & AI sandbox are active.',
      },
      {
        tenantId,
        providerKey: 'meta_fb_ig',
        displayName: 'Facebook Messenger, Instagram Professional DM & Meta Ads Boost API',
        category: 'Social & Growth Boost',
        status: process.env.FACEBOOK_PAGE_ACCESS_TOKEN ? 'connected' : 'not_configured',
        maskedCredentialHint: process.env.FACEBOOK_PAGE_ACCESS_TOKEN ? 'Configured' : 'Not Configured — Enter Page/IG Token',
        requiredPermissions: 'pages_messaging, instagram_manage_messages, ads_management',
        setupInstructions: 'Connect your Meta App Page & Instagram Professional Token to enable live DM auto-replies and live ad spend boosts.',
        lastSuccessAt: null,
        recentError: 'Missing FACEBOOK_PAGE_ACCESS_TOKEN / INSTAGRAM_ACCESS_TOKEN for live external ad spend; sandbox campaign builder & AI auto-responder active.',
      },
      {
        tenantId,
        providerKey: 'tiktok_business',
        displayName: 'TikTok Business Messaging & Spark Ad Boost API',
        category: 'Social & Growth Boost',
        status: process.env.TIKTOK_BUSINESS_ACCESS_TOKEN ? 'connected' : 'not_configured',
        maskedCredentialHint: process.env.TIKTOK_BUSINESS_ACCESS_TOKEN ? 'Configured' : 'Not Configured — Enter TikTok Business Token',
        requiredPermissions: 'biz.message.write, ad.campaign.manage, lead.read',
        setupInstructions: 'Enter your TikTok for Business OAuth token to sync Spark Ad leads and direct messages.',
        lastSuccessAt: null,
        recentError: 'TikTok Business API credentials not yet added.',
      },
      {
        tenantId,
        providerKey: 'whatsapp_calling_sip',
        displayName: 'WhatsApp Business Calling API & SIP/PSTN Voice Gateway',
        category: 'Voice & Telephony',
        status: 'not_configured',
        maskedCredentialHint: 'Not Configured — Requires Meta Calling Eligibility + SIP Trunk',
        requiredPermissions: 'whatsapp_business_calling, SIP URI termination',
        setupInstructions: 'Official WhatsApp Business Calling requires an eligible WABA number (2,000+ messaging limit) and human approval for outbound calls. Gemini 3.8 Flash TTS Voice Synthesis is live.',
        lastSuccessAt: null,
        recentError: 'WABA Calling permission not yet provisioned with Meta; Gemini 3.8 Flash TTS studio and call script synthesizer are live.',
      },
      {
        tenantId,
        providerKey: 'stripe_billing',
        displayName: 'Stripe SaaS Subscription & Usage Metering',
        category: 'Billing',
        status: process.env.STRIPE_SECRET_KEY ? 'connected' : 'not_configured',
        maskedCredentialHint: process.env.STRIPE_SECRET_KEY ? 'sk_live_...' : 'Not Configured — Enter Stripe Secret Key',
        requiredPermissions: 'checkout.sessions, subscriptions, meter_events',
        setupInstructions: 'Configure STRIPE_SECRET_KEY to enable live card checkout sessions. Plan limits and usage metering are enforced in PostgreSQL.',
        lastSuccessAt: null,
        recentError: null,
      },
    ]);

    // 15. Seed Subscription, Usage, Notifications & Audit Logs
    await db.insert(subscriptionRecords).values({
      tenantId,
      planName: 'Enterprise Omnichannel 100',
      status: 'active',
      monthlyPriceUsd: 799,
      maxWhatsappNumbers: 100,
      maxStaffSeats: 50,
      maxMonthlyConversations: 100000,
      maxVoiceMinutes: 5000,
      renewalDate: '2026-11-19',
    });

    await db.insert(usageRecords).values([
      { tenantId, metricType: 'whatsapp_api_messages', unitsUsed: 1420, estimatedCostUsd: '11.36' },
      { tenantId, metricType: 'social_dm_messages', unitsUsed: 946, estimatedCostUsd: '0.00' },
      { tenantId, metricType: 'gemini_ai_calls', unitsUsed: 618, estimatedCostUsd: '1.85' },
      { tenantId, metricType: 'voice_tts_generations', unitsUsed: 42, estimatedCostUsd: '0.84' },
      { tenantId, metricType: 'image_scans', unitsUsed: 19, estimatedCostUsd: '0.38' },
    ]);

    await db.insert(notifications).values([
      {
        tenantId,
        type: 'escalation',
        title: 'High-Value WhatsApp Lead Qualified (Score 94/100)',
        message: 'Henrik Lindqvist (Nordic Freight) requested 45 regional WhatsApp Business numbers.',
        isRead: false,
      },
      {
        tenantId,
        type: 'workflow_alert',
        title: 'Instagram Reels Boost Generated 68 Qualified Leads',
        message: 'Pulse AI Agent automatically responded to 312 DMs and comments from Q4 Reels Boost.',
        isRead: false,
      },
      {
        tenantId,
        type: 'follow_up',
        title: 'Pending Human Approval: TikTok Spark Ad Boost & Solaris Reply',
        message: '2 sensitive actions are waiting in the Approvals queue.',
        isRead: false,
      },
    ]);

    await db.insert(auditLogs).values([
      {
        tenantId,
        actorUid,
        actorName,
        action: 'TENANT_WORKSPACE_INITIALIZED',
        resourceType: 'tenant',
        resourceId: String(tenantId),
        details: 'Provisioned PostgreSQL multi-tenant schema, RBAC roles, 7 omnichannel endpoints, and 3 AI agents.',
      },
      {
        tenantId,
        actorUid: 'system-gemini-rag',
        actorName: 'Aria AI Concierge',
        action: 'AI_GROUNDED_RESPONSE_GENERATED',
        resourceType: 'conversation',
        resourceId: String(insertedConvs[0].id),
        details: 'Generated response grounded in pricing_sheet_v4_approved.pdf (confidence: 0.94, model: gemini-3.8-flash).',
      },
    ]);
  } catch (error) {
    console.error('Error seeding tenant workspace data:', error);
    throw new Error('Failed to seed initial workspace records.', { cause: error });
  }
}
