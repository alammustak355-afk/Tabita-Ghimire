# ConnectAI CRM — Complete User Guide & Operating Handbook

**Application:** ConnectAI CRM — Omnichannel WhatsApp, Social & Voice AI SaaS  
**Android Package ID:** `com.connectai.crm.mobile` (Debug: `com.connectai.crm.mobile.debug`)  
**Architecture:** React 19 + Express + Cloud SQL PostgreSQL (`europe-west1`) + Server-Side Google Gemini AI + Native Android (Kotlin 2.0 & Jetpack Compose Material 3)

---

## Table of Contents

1. [Chapter 1 — What ConnectAI CRM Does & System Overview](#chapter-1--what-connectai-crm-does--system-overview)
2. [Chapter 2 — Installing & Opening the Android App](#chapter-2--installing--opening-the-android-app)
3. [Chapter 3 — First-Time Workspace Setup & Connecting the Live Backend URL](#chapter-3--first-time-workspace-setup--connecting-the-live-backend-url)
4. [Chapter 4 — Understanding the Overview Dashboard](#chapter-4--understanding-the-overview-dashboard)
5. [Chapter 5 — Managing Contacts & Duplicate Consolidation (Lead Center)](#chapter-5--managing-contacts--duplicate-consolidation-lead-center)
6. [Chapter 6 — International Recruitment Pipeline (11 Stages)](#chapter-6--international-recruitment-pipeline-11-stages)
7. [Chapter 7 — Unified Omnichannel Inbox & Grounded AI Draft Replies](#chapter-7--unified-omnichannel-inbox--grounded-ai-draft-replies)
8. [Chapter 8 — AI Recruitment & Sales Copilot](#chapter-8--ai-recruitment--sales-copilot)
9. [Chapter 9 — WhatsApp Business Cloud API, Social Channels & 12-Step Webhook Simulator](#chapter-9--whatsapp-business-cloud-api-social-channels--12-step-webhook-simulator)
10. [Chapter 10 — Campaign Studio (Click-to-WhatsApp & Social Boosts)](#chapter-10--campaign-studio-click-to-whatsapp--social-boosts)
11. [Chapter 11 — Follow-up Tasks & Candidate Interview Scheduling](#chapter-11--follow-up-tasks--candidate-interview-scheduling)
12. [Chapter 12 — Team Performance, Staff Invitations & RBAC Governance](#chapter-12--team-performance-staff-invitations--rbac-governance)
13. [Chapter 13 — External Integrations & Honest Status Indicators](#chapter-13--external-integrations--honest-status-indicators)
14. [Chapter 14 — Settings, Multi-Tenant Isolation, Security & Clean Workspace Reset](#chapter-14--settings-multi-tenant-isolation-security--clean-workspace-reset)
15. [Chapter 15 — Building & Updating the Android APK / AAB on GitHub Actions](#chapter-15--building--updating-the-android-apk--aab-on-github-actions)
16. [Chapter 16 — Complete Troubleshooting Guide (HTML vs. JSON, Offline Mode, Build Errors)](#chapter-16--complete-troubleshooting-guide-html-vs-json-offline-mode-build-errors)

---

## Chapter 1 — What ConnectAI CRM Does & System Overview

ConnectAI CRM is a multi-tenant omnichannel customer relationship management and international recruitment platform built for recruitment agencies, B2B sales teams, and service businesses.

### Core Capabilities Implemented in This Project
* **Clean, Zero-Fake-Data Workspace Initialization:** Every new workspace starts with **0 leads**, **0 contacts**, **0 conversations**, **0 tasks**, and **$0 pipeline value**. No sample or fabricated records are ever inserted into your real business database.
* **Overview Dashboard:** Displays real-time KPI cards calculated strictly from your stored database records (`Total Leads`, `Active Threads`, `Qualified Leads`, `Pipeline Value`, `Follow-ups Due`, and `Conversion Rate`).
* **Lead Center & Duplicate Consolidation:** Manage verified contacts across WhatsApp, Instagram, Facebook, and TikTok, with automatic duplicate phone/email detection and one-tap record merging.
* **11-Stage International Recruitment Pipeline:** Track candidates across `New Lead`, `Contacted`, `Interested`, `Documents Pending`, `Qualified`, `Employer Review`, `Offer`, `Visa Process`, `Deployed`, `Rejected`, and `On Hold`.
* **Unified Omnichannel Inbox:** Read and reply to customer messages, add yellow internal staff notes, and generate grounded AI reply drafts using server-side Google Gemini.
* **WhatsApp & Channels + 12-Step AI Qualification Engine:** Register official WhatsApp Business Cloud API numbers or test end-to-end automated lead capture and scoring using the built-in 12-Step Inbound Webhook Simulator.
* **Follow-up Tasks & Candidate Interviews:** Assign due dates, track overdue items, and book candidate or employer interviews.
* **Team RBAC & Security Audit Trail:** Enforce 5 role levels (`company_owner`, `manager`, `analyst`, `agent`, `viewer`), control CSV data export permissions, trigger an Emergency AI Automation Pause, and inspect immutable security audit logs.

---

## Chapter 2 — Installing & Opening the Android App

### Step-by-Step Installation on Your Android Phone
1. Open your GitHub repository (`alammustak355-afk/Tabita-Ghimire`) in your mobile browser and tap **Actions**.
2. Tap the latest green workflow run titled **Build ConnectAI CRM Android APK & Play Store AAB**.
3. Scroll down to the **Artifacts** section and tap **`connectai-crm-debug-apk`** to download the ZIP archive.
4. Open your phone's **Files** / **Downloads** app, tap the downloaded ZIP file, and extract **`app-debug.apk`**.
5. Tap **`app-debug.apk`** to install ConnectAI CRM (`com.connectai.crm.mobile.debug`). If prompted by Android, allow installation from your browser or file manager.
6. Tap **Open** to launch ConnectAI CRM.

---

## Chapter 3 — First-Time Workspace Setup & Connecting the Live Backend URL

### Why the App Shows "Offline / Backend Not Connected" Until Cloud Run Is Deployed
* Google AI Studio's preview URLs (`https://ais-pre-...run.app` and `https://ais-dev-...run.app`) are protected by an interactive browser cookie gate (`/__cookie_check.html`).
* When a native Android app calls an `ais-pre-...` preview URL, Google's proxy responds with `HTTP 302` or `text/html` (`<!doctype html>`) instead of JSON.
* ConnectAI CRM safely intercepts HTML and redirect responses before JSON parsing so the app never crashes, and displays a clear **Backend API Diagnostics & Configuration** dialog.

### How to Deploy & Connect Your Live Backend URL
1. In **Google AI Studio**, tap the **Deploy / Publish** button (rocket icon) at the top right to deploy this project to a **public Google Cloud Run service**.
2. Copy the deployed Cloud Run HTTPS URL (for example: `https://connectai-crm-xxxxxx.europe-west2.run.app`).
3. Open the ConnectAI CRM Android app on your phone.
4. Tap **Set API URL / Diagnostics** on the top banner (or open the left drawer → **Settings & Security**).
5. Paste your deployed Cloud Run URL into **Public Cloud Run HTTPS Backend URL** (the app automatically normalizes the URL, forces `https://`, and strips accidental `/api/bootstrap` suffixes).
6. Tap **Test URL** or **Save & Retry Live API**.
7. Once connected, the top status bar turns emerald green: **`LIVE CLOUD SQL · <Your Workspace Name>`**.

---

## Chapter 4 — Understanding the Overview Dashboard

* **Executive Hero Banner:** Shows your active workspace name, connection status, and quick buttons for **+ Add New Lead** and **Open Unified Inbox**.
* **Search & Stage Filter Strip:** Filter your dashboard metrics in real time by keyword (candidate name, role, destination country) or by recruitment stage.
* **6 Live KPI Cards:**
  * **Total Leads:** Count of active (non-archived) leads/candidates and total CRM contacts.
  * **Active Threads:** Open omnichannel conversations and unread message count.
  * **Qualified Leads:** Candidates in `Qualified`, `Employer Review`, `Offer`, `Visa Process`, `Deployed`, or `Won`.
  * **Pipeline Value:** Sum of estimated placement value (USD) for qualified leads.
  * **Follow-ups Due:** Count of pending follow-up tasks and scheduled interviews.
  * **Conversion Rate:** Percentage of active leads that have reached `Offer`, `Visa Process`, `Deployed`, or `Won`.

---

## Chapter 5 — Managing Contacts & Duplicate Consolidation (Lead Center)

### Adding a New Contact
1. Open **Lead Center** from the bottom bar or navigation drawer.
2. Tap **+ Contact**.
3. Enter **Full Name** and **Phone / WhatsApp Number** (required), plus optional Email, Employer/Company, and Requirements Summary.
4. Tap **Save Contact to PostgreSQL**.

### Merging Duplicate Contacts
* Whenever two contacts share the same normalized phone number (7+ digits) or email address, a yellow **Detected Duplicate Contacts** banner appears automatically at the top of Lead Center.
* Tap **Merge Records** next to any pair to consolidate their conversations, leads, and notes into the primary contact record and log an audit entry.

---

## Chapter 6 — International Recruitment Pipeline (11 Stages)

### Adding a Candidate or Business Lead
1. Tap the **+** icon in the top bar (or **+ Add Candidate** inside **Recruitment Pipeline**).
2. Fill in the candidate's **Name**, **Phone/WhatsApp**, **Email**, **Nationality**, **Preferred Job / Role**, **Destination Country**, **Placement Value (USD)**, and **Qualifications & Notes**.
3. Tap **Save to Workspace**.

### Moving Candidates Across the 11 Stages
* Each candidate card includes a horizontal **Quick Stage Selector Strip**:
  `New Lead` → `Contacted` → `Interested` → `Documents Pending` → `Qualified` → `Employer Review` → `Offer` → `Visa Process` → `Deployed` → `Rejected` → `On Hold`.
* Tap any stage chip on a candidate card to immediately update their stage in PostgreSQL.
* Tap **Archive** to hide inactive candidates without losing historical data, or **Delete** (restricted to authorized RBAC roles) to permanently remove a record.

---

## Chapter 7 — Unified Omnichannel Inbox & Grounded AI Draft Replies

1. Open **Unified Inbox** from the bottom navigation bar.
2. Tap any conversation chip along the top horizontal bar to load the full message history.
3. **Generating an AI Reply Draft:**
   * Tap **✨ AI Draft Reply** at the top right of the thread, or tap **Use Suggested Reply** inside the blue AI Summary box.
   * The draft is placed into your message input box so you can review or edit it before sending.
4. **Sending a Reply vs. Internal Staff Note:**
   * Keep the chip set to **Reply** to send an outbound customer message.
   * Tap the chip to switch to **Internal Note** (highlighted in amber) to record a private staff-only comment inside the thread.

---

## Chapter 8 — AI Recruitment & Sales Copilot

1. Open **AI Copilot** from the bottom navigation bar or left drawer.
2. Select one of the 4 grounded analysis modes:
   * **Candidate Qualification:** Scores candidate readiness and missing compliance documents.
   * **Executive Daily Briefing:** Summarizes urgent threads, overdue tasks, and pipeline value.
   * **Draft WhatsApp Follow-Ups:** Generates personalized WhatsApp templates for active candidates.
   * **Pipeline Bottleneck Audit:** Identifies stages where candidates are stalling.
3. Optionally customize the instruction prompt and tap **✨ Run AI Copilot Analysis**.
4. Note: AI Copilot runs server-side via `/api/ai/copilot` using the server's `GEMINI_API_KEY`. It requires your live backend to be connected.

---

## Chapter 9 — WhatsApp Business Cloud API, Social Channels & 12-Step Webhook Simulator

1. Open **WhatsApp & Channels** from the navigation drawer.
2. **Connecting a Business Line:** Enter your Display Name, Phone Number / `@Handle`, and Meta Phone Number ID, then tap **Register Channel Endpoint**.
3. **Testing Inbound Messages Without Meta API Credentials (12-Step AI Engine):**
   * Scroll to the **Test Inbound Candidate Message (12-Step AI Engine)** card.
   * Enter a candidate name, phone number, and sample inbound message (e.g., *"Hi, I am a qualified TIG Welder looking for sponsorship"*).
   * Tap **Simulate Inbound Webhook + AI Qualification**.
   * The server automatically creates/updates the contact, opens a conversation thread, scores the lead, extracts job requirements, drafts a grounded reply, and creates a follow-up task.

---

## Chapter 10 — Campaign Studio (Click-to-WhatsApp & Social Boosts)

1. Open **Campaign Studio** from the navigation drawer.
2. Choose a target channel (`INSTAGRAM`, `FACEBOOK`, `TIKTOK`, or `WHATSAPP`).
3. Enter your **Campaign Title**, **Campaign Objective**, **Ad Copy & Call-to-Action**, and **Daily Budget (USD)**.
4. Tap **Create Campaign & Queue Approval** to save the campaign in your workspace.

---

## Chapter 11 — Follow-up Tasks & Candidate Interview Scheduling

1. Open **Follow-up Tasks** from the navigation drawer.
2. **Create a Task:** Enter the Task Description, Candidate/Contact name, and Due Date (`YYYY-MM-DD`), then tap **Save Follow-up Task**.
3. **Complete a Task:** Tap the checkbox next to any task to toggle its status between `pending` and `completed`.
4. **Book an Interview:** Scroll to **+ Book Candidate / Employer Interview**, enter the Candidate/Employer Name, Interview Title, and Date & Time (UTC), and tap **Schedule Interview**.

---

## Chapter 12 — Team Performance, Staff Invitations & RBAC Governance

1. Open **Team & Performance** from the navigation drawer.
2. **Staff Scorecard:** View each team member's active lead count and placed/won candidate count.
3. **Active Session RBAC Role Switcher:** Test or enforce role permissions across `company_owner`, `manager`, `analyst`, `agent`, and `viewer`, and toggle `Grant CSV Data Export Permission`.
4. **Invite Team Member:** Enter a staff email address and department, then tap **Send Workspace Invitation**.

---

## Chapter 13 — External Integrations & Honest Status Indicators

Open **Integrations** from the navigation drawer to inspect the real status of external providers:
* **Meta WhatsApp Business Cloud API:** Shows `CONNECTED` only when `META_WHATSAPP_ACCESS_TOKEN` is configured on the server; otherwise operates in verified Webhook Simulator mode.
* **Google Gemini AI:** Processes grounded AI Copilot and reply drafting server-side so no API key is ever exposed inside the Android APK.

---

## Chapter 14 — Settings, Multi-Tenant Isolation, Security & Clean Workspace Reset

Open **Settings & Security** from the navigation drawer to:
* **Switch Tenant Workspaces:** Switch between isolated company workspaces (`tenant_id`).
* **Emergency AI Automation Pause:** Flip the master kill-switch to immediately halt all automated AI responses and route all inbound messages to human staff.
* **Configure Production Backend API Endpoint:** Test and save your public Cloud Run HTTPS URL.
* **Inspect Immutable Security Audit Logs:** Review timestamped records of logins, RBAC changes, contact merges, and configuration updates.

---

## Chapter 15 — Building & Updating the Android APK / AAB on GitHub Actions

Whenever code changes are pushed to the `main` branch of your GitHub repository (`alammustak355-afk/Tabita-Ghimire`), the workflow `.github/workflows/android-release.yml` automatically:
1. Sets up JDK 17 (`Temurin`) and Android SDK Platform 35 (`compileSdk = 35`, `targetSdk = 35`, `minSdk = 26`).
2. Runs `./gradlew assembleDebug --stacktrace` to produce the installable phone APK (`connectai-crm-debug-apk`).
3. Runs `./gradlew bundleRelease --stacktrace` to produce the Play Store Android App Bundle (`connectai-crm-release-aab`).

---

## Chapter 16 — Complete Troubleshooting Guide (HTML vs. JSON, Offline Mode, Build Errors)

### Problem 1: `Value <!doctype ... of type java.lang.String cannot be converted to JSONObject`
* **Root Cause:** Older builds followed a `302` redirect from the AI Studio preview URL (`ais-pre-...run.app`) to `/__cookie_check.html` and passed the HTML login page directly to `JSONObject(...)`.
* **How It Is Fixed:** `ConnectAiApiClient.kt` now disables automatic redirects (`instanceFollowRedirects = false`), inspects HTTP status codes (`300..399`) and `Content-Type` headers before parsing, and never crashes on HTML responses. To switch from Offline Mode to Live Mode, deploy the backend to a **public Cloud Run URL** and paste that URL in **Set API URL / Diagnostics**.

### Problem 2: GitHub Actions Run #3 Failed with Exit Code 1 (`build-android`)
* **Root Cause:** In commit `def213ea415c4c11bf99f4756c3a03b4bc5ecd40`, `NavDestination.HELP_USER_GUIDE` was added to `enum class NavDestination` in `CrmModels.kt`, but `MainActivity.kt` did not include a `NavDestination.HELP_USER_GUIDE -> ...` branch in its `when (activeDest)` block. Kotlin 2.0 requires `when` expressions over enums to be exhaustive.
* **How It Is Fixed:** `MainActivity.kt` now includes the `NavDestination.HELP_USER_GUIDE -> HelpUserGuideScreen(...)` branch, and `OperationsAndAdminScreens.kt` implements `HelpUserGuideScreen` so all 13 navigation destinations compile cleanly.

### Problem 3: Workspace Shows Zero Leads / Zero Pipeline Value After Connecting
* **Explanation:** By design, ConnectAI CRM starts **100% clean** with zero fake sample records. Tap the **+** button in the top bar (or use the **12-Step Inbound Webhook Simulator** in **WhatsApp & Channels**) to create your first real candidate or lead.
