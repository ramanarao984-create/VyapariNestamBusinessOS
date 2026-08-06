# Product Knowledge Base (PKB) v1.0
## Vyapari Nestam: Configuration-Driven Local Business Operating Platform

---

## SECTION 1: PRODUCT OVERVIEW

### 1.1 Product Purpose & Vision
**Vyapari Nestam** is a revolutionary Bring-Your-Own-Storage (BYOS) Local Business Operating Platform designed to liberate brick-and-mortar enterprises from traditional, expensive data silos. Initially launching as a **Clinic Growth Platform** for independent doctors and multi-specialty practices, the product is systematically engineered to serve as a general-purpose operational wrapper over personal Google Workspaces.

Its mission is to empower local businesses (clinics, gyms, real estate agencies, etc.) to digitize operations, automate communications, eliminate appointment drop-offs, and accelerate revenue collection—all while maintaining **100% data sovereignty**. By writing all transaction ledgers, profiles, templates, and audits back to the customer's personal Google Sheets and Google Drive, Vyapari Nestam eliminates the threat of vendor lock-in, slashes operational storage overheads to zero, and minimizes onboarding friction.

### 1.2 Target Users
1. **Clinic Owners / Principal Doctors**: Seek clear financial dashboards, client retention analytics, staff performance monitoring, and permanent data ownership without technical overhead.
2. **Receptionists / Front-Desk Staff**: The heavy daily users. Require ultra-simple, lightning-fast UIs with minimal clicks to register patients, log payments, schedule bookings, and dispatch WhatsApp communications.
3. **Visiting Consultants / Doctors**: Need instant mobile-friendly access to schedules, notes, and specific client records without viewing full business financials.
4. **General Business Managers (Gyms/Agencies)**: Seek lead lifecycle tracking, billing checklists, and communication campaign logs in localized dialects.

### 1.3 Architectural Topology
The architecture consists of an elegant **full-stack client-server** system designed to run securely and responsively:
* **Client Frontend**: React 18+ powered by Vite, utilizing Tailwind CSS for high-performance responsive interfaces, Lucide React for consistent semantic icon sets, and Framer Motion (`motion/react`) for smooth, high-fidelity micro-interactions and screen transitions.
* **Backend Integration Server**: An Express server running on Node.js that serves as a proxy for Google Workspace APIs, handles OAuth tokens, sequences multi-tab Google Sheet write queries, executes Gemini-driven natural language parsing, and orchestrates simulated or live Meta Cloud Webhook notifications.
* **Persistent Security & Tenant Metadata**: A lightweight hybrid infrastructure using Firebase Authentication for secure end-user identity and Supabase as a metadata caching layer to map user logins to their corresponding Google Spreadsheet IDs, Calendar IDs, and active subscription credentials.

```
                      +──────────────────────────────────────────────────+
                      │               Client Browser (SPA)               │
                      │   React 18 / Tailwind CSS / Framer Motion        │
                      +────────────────────────┬─────────────────────────+
                                               │
                                 HTTPS REST / WebSockets
                                               │
                                               ▼
                      +──────────────────────────────────────────────────+
                      │             Backend Proxy (Express)              │
                      +─────┬───────────────────┬───────────────────┬────+
                            │                   │                   │
                            ▼                   ▼                   ▼
                     Google Workspace     Firebase Auth      Supabase Metadata
                   Sheets/Calendar/Drive                     (Tenant Resolutions)
```

### 1.4 Architectural Strengths
1. **Absolute Data Sovereignty**: All primary business records are stored on the customer's personal Google Drive. If the subscription terminates, they lose access to the dashboard, but their entire business database remains perfectly intact, formatted, and readable in Google Sheets.
2. **Zero Storage Costs**: The vendor incurs zero database hosting, snapshotting, or synchronization costs, enabling high-margin ₹2,499/month pricing with near-zero technical scaling limits.
3. **Multi-Industry Config-First Engine**: All terminology, workflows, appointment stages, message templates, automated triggers, chatbot menus, and analytical KPIs are abstracted as configuration payloads. A single database schema and React codebase support completely different industries (e.g., Dental vs. Gym vs. Real Estate) instantly via simple tenant state values.
4. **Resilient Local Caching**: Falls back gracefully to `localStorage` or session-cached configurations if internet networks lag or Google API requests experience temporary latency.

### 1.5 Major Technical Limitations
1. **Google Sheets Performance Limits**: Google Sheets supports up to 10 million cells. While more than sufficient for small-to-medium clinics, extremely active businesses logging thousands of interactions monthly will hit cell limits or experience latency during full-table reads.
2. **Concurrent Request Serialization**: Google Sheets APIs lack robust native multi-user row-locking locks, presenting a risk of write collisions when multiple users save records simultaneously.
3. **Session Re-authorization Dependencies**: Google's security protocols expire OAuth refresh tokens or require user re-consent under various conditions, requiring elegant client-side prompts to prevent unexpected API failures.

---

## SECTION 2: NAVIGATION & ROUTING INVENTORY

The Vyapari Nestam user interface is designed as a single-page application (SPA) featuring a persistent, responsive navigation sidebar. To prevent rendering overhead and maintain state continuity, the screen view is driven by an in-app state router (`activeTab` state).

| Sidebar Selection | Route Alias (SPA state) | Purpose of View | Primary User | Access Scope / Permissions | External API Dependencies |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Dashboard** | `dashboard` | Unified business overview showing daily status, upcoming schedule summaries, unpaid balance logs, and quick action widgets. | Owner, Receptionist | Read-Write (Financials restricted to Owner) | Google Calendar, Google Sheets |
| **Contacts** | `contacts` | Directory listing of all customers/patients. Houses profile search, case card views, clinical files logs, and dynamic interaction histories. | All roles | All (Write restricted to authorized staff) | Google Sheets, Google Drive |
| **Calendar** | `calendar` | Bidirectional schedule grid allowing visual booking, drag-to-reschedule, and filter-by-consultant. | Receptionist, Doctor | Full Schedule Read-Write | Google Calendar |
| **Treatments / Billing**| `billing` | Financial ledger showing active quotes, installment trackers, transaction details, and instant PDF invoice generators. | Owner, Receptionist | Read-Write (Owner exclusive logs) | Google Sheets, Google Drive |
| **WhatsApp Hub** | `whatsapp` | Central command for WhatsApp campaigns, pre-configured templates, chatbot menu visualizer, and live AI autopilot logs. | Owner, Receptionist | Read-Write (Setup limited to Owner) | Meta API, Sheets, Gemini API |
| **SEO Optimizer** | `seo` | Local GMB visibility scanner that checks search factors, generates highly relevant local keywords, and logs history. | Owner | Owner Only | Google Sheets |
| **Settings** | `settings` | System controls for OAuth links, workspace setup verification, staff profiles, and active Industry selector. | Owner | Owner Only | Supabase, Firebase, Google API |

---

## SECTION 3: FEATURE INVENTORY

The platform features are structured to be entirely modular. The catalog below documents every feature, categorizing its target persona, operational status, and scalability potential.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                            FEATURE CATALOG                                             │
├──────────────────────────────┬──────────────────┬─────────────┬──────────────────┬─────────────────────┤
│ Feature Name                 │ Persona          │ Status      │ Scope Class      │ Config Candidate?   │
├──────────────────────────────┼──────────────────┼─────────────┼──────────────────┼─────────────────────┤
│ Self-Service Onboarding      │ Owner            │ Complete    │ Generic Platform │ Yes (Steps/Assets)  │
│ Dynamic Sheet Provisioning   │ Owner            │ Complete    │ Reusable Env     │ Yes (Tab templates) │
│ Global Search Directory      │ Receptionist     │ Complete    │ Generic Platform │ Yes (Query fields)  │
│ Multi-stage Pipeline Tracking│ Receptionist     │ Complete    │ Industry-neutral │ Yes (Stage configs) │
│ Interactive Case Card        │ Doctor           │ Complete    │ Clinic Specific  │ Yes (Fields Schema) │
│ Bidirectional Calendar Sync  │ Receptionist     │ Complete    │ Generic Platform │ No (Standard API)   │
│ Split-Payment Ledger         │ Receptionist     │ Complete    │ Industry-neutral │ Yes (Pricing models)│
│ Interactive Whatsapp Flow    │ Receptionist     │ Complete    │ Generic Platform │ Yes (Tree payload)  │
│ Automated Intent Recalls     │ Owner            │ Complete    │ Generic Platform │ Yes (Prompt templates)│
│ Local SEO Audit Engine       │ Owner            │ Complete    │ Generic Platform │ Yes (Keyword models)│
│ Dynamic Workspace Settings   │ Owner            │ Complete    │ Generic Platform │ No (Core service)   │
└──────────────────────────────┴──────────────────┴─────────────┴──────────────────┴─────────────────────┘
```

---

## SECTION 4: MODULE BREAKDOWN

### 4.1 Onboarding & Setup Wizard
* **Purpose**: Allows a brand-new business owner to register their profile, select their industry type, generate default catalog services, map Google integrations, and launch their fully operational workspace within minutes.
* **Workflow**:
  1. **Profile Setup**: Collect Business Name, City/Neighborhood, and Industry Sector.
  2. **Channel Selection**: Configure storage channels (Sheets, Calendar, Drive).
  3. **Service Catalog Generation**: Display pre-filled popular catalog services based on industry with custom price adjustment fields.
  4. **Dynamic FAQ Generation**: Initialize foundational knowledge base questions.
  5. **Brand Tone Selection**: Choose localized communications dialect (e.g., *Mixed Telugu-English*, *Warm/Friendly*, *Formal*, *Direct*).
  6. **Pain Points Checklist**: Identify system configurations (e.g., auto-reminders, lead loss) to activate custom pre-sets.
* **Inputs**: Alphanumeric fields, dropdown selections, service cost numbers, FAQ text strings.
* **Outputs**: Initialized row models written to `CRM_KnowledgeBase`, `CRM_Templates`, and `CRM_Contacts` on Google Sheets; created custom Google Calendar, and nested Google Drive folder hierarchies.
* **Screens**: Modular 6-step progress screen with animated step slide-ins and real-time template translation previews based on selected brand voice.
* **Business Rules**:
  * Changing the industry sector inside Step 1 must automatically purge and overwrite the defaults in subsequent steps with the targeted industry presets.
* **Validation Rules**:
  * Business Name must be between 3 and 100 characters.
  * Pricing fields must contain positive numeric values.

### 4.2 Unified Growth Dashboard
* **Purpose**: Serves as the operational control center. Consolidates multi-tab spreadsheet parameters into actionable metrics, highlighting operational leakage (missed appointments) and financial leaks (unpaid client bills).
* **Screens / Widgets**:
  1. **KPI Scorecard Panel**: Four dynamic stats: Today's Appointments, Monthly Revenue collected, Active Lead/Client Pipeline count, and Client Retention Rate.
  2. **Actionable Growth Rails**:
     * *No-Shows Rail*: List of clients scheduled for today who did not check-in, complete with a single-click "Re-book" WhatsApp trigger.
     * *Outstanding Collections Rail*: Log of active clients carrying unpaid balances with a single-click "Payment UPI Nudge" dispatch.
  3. **Upcoming Appointments Timeline**: Real-time chronological view of bookings synced from Google Calendar with visual check-in checkmarks.
* **Business Rules**:
  * Financial metrics must restrict visibility strictly to the "Owner" role.

### 4.3 Patient Directory & Digital Profile Card
* **Purpose**: Manage the comprehensive lifecycle of registered clients. Provides lightning-fast lookup and deep dive clinical history cards.
* **Inputs**: Name, Phone, Email, Category status, Medical Alerts list, Case notes.
* **Outputs**: Row additions and modifications in Google Sheets.
* **Interactive Controls**:
  * *Global Search Box*: Filters contacts instantly across name, phone, or medical conditions.
  * *Slide-Out Profile Drawer*: A beautiful bento-grid overlay revealing patient milestones, visit logs, timeline of interactions, and medical alert flags.
  * *Diagnostic File Uploader*: Drag-and-drop drag-zone that maps files directly to the patient's individual Google Drive subfolder, keeping files beautifully linked.

### 4.4 Split-Billing & Revenue Ledger
* **Purpose**: Eliminate payment leaks across multi-sitting treatments (such as root canal treatments, orthodontics braces tracking, or annual personal gym training plans).
* **Business Rules**:
  * Treatment pricing must support upfront deposit payments, recurring installments, and partial adjustments.
  * Logging a payment must trigger:
    1. Instant transaction log appended to the `CRM_RevenueTracker` sheet tab.
    2. Recalculation and update of the parent contact's `Amount Collected` cell in the `CRM_Contacts` sheet.
    3. Automated Generation of a clean PDF receipt uploaded to Google Drive.
    4. Auto-queued WhatsApp confirmation showing receipt links and updated remaining balances.

### 4.5 SEO Local Audit Engine
* **Purpose**: Allow small businesses to compete on local Google Maps search. Computes visibility factors, offers step-by-step optimization checklists, and auto-generates localized local search keywords.
* **Workflow**:
  * User presses the "Run Audit Scan" trigger. The system runs local directory citation checks, analyzes review frequency, checks keyword density, and outputs an audit report card.
* **Inputs**: Business Profile Name, target Landmark, and Industry ID.
* **Outputs**: A dynamic visibility report card with high-conversion local keyword sheets (e.g., "Best dentist near Benz Circle") and actionable checklists.

---

## SECTION 5: DOMAIN DATA MODELS

The platform data structures are designed to be extremely compact, highly relational, and entirely industry-neutral. Database fields adapt their semantic meaning in the UI using dynamic terminology maps.

### 5.1 Contact (Client/Patient)
* **Purpose**: The primary entity model mapping registered leads, clients, or patients.
* **Properties**:
  * `id` (*String*): Unique identifier (maps to phone number).
  * `name` (*String*): Full name.
  * `phone` (*String*): Formatted WhatsApp phone number (e.g., `+919440552671`).
  * `email` (*String, Optional*): Client email.
  * `category` (*Enum*): `Lead` | `Active` | `Inactive` | `Follow-up`.
  * `notes` (*String*): Free-form historic or medical case notes.
  * `lastContacted` (*ISO String*): Timestamp of latest interaction.
  * `createdAt` (*ISO String*): Date of profile registration.
  * `treatmentType` (*String, Optional*): Current active service/treatment.
  * `treatmentValue` (*Number, Optional*): Quoted cost of the active service.
  * `amountCollected` (*Number, Optional*): Total payment collected to date.
  * `pipelineStage` (*Enum*): `Inquiry` | `Scheduled` | `Visited` | `Treatment` | `Completed`.
  * `isRepeat` (*Boolean*): Flag identifying returning customers.
  * `source` (*Enum*): `WhatsApp` | `Phone` | `Website` | `Walk-in`.

### 5.2 Interaction
* **Purpose**: Logs all touchpoints (calls, WhatsApp campaigns, auto-replies) for a specific Contact.
* **Properties**:
  * `id` (*String*): Unique interaction log ID.
  * `contactId` (*String*): Fkey pointing to Contact.
  * `contactName` (*String*): Normalized contact name.
  * `type` (*Enum*): `WhatsApp Sent` | `Incoming Message` | `Phone Call` | `In-Person` | `Email` | `Calendar Follow-up` | `Note`.
  * `notes` (*String*): Text details of the interaction.
  * `outcome` (*String*): Resolution status (e.g., *Confirmed*, *No Answer*).
  * `timestamp` (*ISO String*): Timestamp of touchpoint occurrence.

### 5.3 MessageTemplate
* **Purpose**: Standardizes messaging scripts for instant manual click-to-send or automated trigger dispatches.
* **Properties**:
  * `id` (*String*): Unique template reference ID.
  * `title` (*String*): Human-readable template title.
  * `category` (*String*): Mapping key (e.g., `Scheduler`, `Support`, `Marketing`, `Sales`).
  * `text` (*String*): Script containing variable replacement tags (e.g., `{{name}}`, `{{dateTime}}`, `{{businessName}}`).

### 5.4 RevenueLog
* **Purpose**: Detail payment transactions under split-billing treatments.
* **Properties**:
  * `id` (*String*): Unique transaction receipt ID.
  * `contactId` (*String*): Reference Contact.
  * `contactName` (*String*): Reference Name.
  * `amountCollected` (*Number*): Paid amount in this transaction.
  * `treatmentType` (*String*): Service item billed.
  * `timestamp` (*ISO String*): Transaction timestamp.
  * `notes` (*String*): Payment mode (e.g., `UPI`, `Cash`, `Card`).

---

## SECTION 6: METADATA & PERSISTENCE LAYER (SUPABASE & FIREBASE)

Vyapari Nestam utilizes a secure, lightweight cloud layer to manage authentication and user-to-storage mapping coordinates. No customer clinical or financial data is stored in this central metadata layer.

### 6.1 Firebase Authentication
* **Purpose**: Manages multi-tenant identity. Supports Google Sign-In, enabling clinics to link their identity securely and grant read-write consent to Workspace resources.
* **Configuration**: Scoped request permissions:
  * `https://www.googleapis.com/auth/userinfo.profile` (Profile metadata)
  * `https://www.googleapis.com/auth/spreadsheets` (Full Google Sheets management)
  * `https://www.googleapis.com/auth/calendar` (Full Google Calendar management)
  * `https://www.googleapis.com/auth/drive` (Full Google Drive structure read-write)

### 6.2 Supabase Tenant Metadata Schema
The database schema in Supabase acts as a lightweight coordinate router:
* **`tenants` Table**:
  * `id` (*UUID, Primary Key*): Linked directly to Firebase Auth UID.
  * `business_name` (*String*): The primary trading name.
  * `selected_industry` (*Enum*): Active sector selector mapping config presets.
  * `google_spreadsheet_id` (*String*): Target spreadsheet coordinate.
  * `google_calendar_id` (*String*): Target calendar coordinate.
  * `google_drive_folder_id` (*String*): Root file manager folder directory.
  * `is_onboarded` (*Boolean*): Wizard completion flag.
  * `created_at` (*Timestamp*).
* **`feature_flags` Table**:
  * `tenant_id` (*UUID*): Reference tenant.
  * `flag_key` (*String*): Feature tag (e.g., `ai_autopilot`, `seo_audit`).
  * `is_enabled` (*Boolean*): Enabled state.

---

## SECTION 7: DATA FLOWS & SYNCHRONIZATION WORKFLOWS

### 7.1 Unified Onboarding Flow
1. **Auth Trigger**: Tenant signs up using Firebase Google OAuth.
2. **Permission Consent**: User approves Google Sheets, Calendar, and Drive API scopes.
3. **Database Creation**: The proxy calls the Sheets API to create a new spreadsheet (`createCrmSpreadsheet`) titled "WhatsApp CRM Database".
4. **Header Calibration**: The spreadsheet is initialized with six functional tabs: `CRM_Contacts`, `CRM_Interactions`, `CRM_KnowledgeBase`, `CRM_Templates`, `CRM_SEOAuditLogs`, and `CRM_RevenueTracker`.
5. **Folder Calibration**: Google Drive API provisions a main parent directory "Vyapari Nestam Media", inside which individual client photo subfolders are dynamically nested.
6. **Metadata Locking**: Google coordinates (`spreadsheet_id`, `calendar_id`, `folder_id`) are saved to the Supabase database.

### 7.2 Patient Check-In & Consultation Flow

```
 [Patient Arrives] ──► Receptionist clicks 'Check-In' ──► Status updates to 'Waiting'
                                                                 │
                                                                 ▼
 [Doctor Reviews]  ◄── System alerts Doctor screen ◄── Visits Google Sheets
         │
         ▼
 [Save Notes]      ──► Appends to 'CRM_Interactions' ──► Syncs with Google Calendar event
```

1. **Arrival**: Patient checks in at reception. Receptionist updates the pipeline stage to `Visited`.
2. **Sheet Update**: The client-side app updates the local cache and triggers `saveContactsToSheet` to push the stage update back to the sheet.
3. **Doctor Notification**: The doctor's screen refreshes, displaying the patient as "Waiting".
4. **Consultation**: The doctor opens the case card, reviews historical case notes, enters prescription lines, and clicks "Complete Consultation".
5. **Event Appending**: The system creates a historical log entry inside the `CRM_Interactions` sheet tab and syncs details to the respective Google Calendar slot.

### 7.3 Instant Bidirectional Google Calendar Sync
* **Outgoing Sync**: Booking an appointment in the CRM invokes `createCalendarEvent`, translating contact records into formal Google Calendar events with description blocks carrying the payment status.
* **Incoming Sync**: Loading the Calendar page triggers `fetchCalendarFollowUps`, querying the Google Calendar API for events inside the active month view. The system parses description parameters to map them dynamically back to existing contact files.

---

## SECTION 8: NO-CODE AUTOMATION ENGINE

The Vyapari Nestam **No-Code Automation Engine** translates operational events into automated system actions. Businesses configure behavioral rules without writing code.

### 8.1 Triggers, Conditions & Actions
The engine evaluates rules defined in `types.ts` as `AutomationRule`:
* **Triggers**:
  * `first_message`: Fires when a customer sends their first WhatsApp message.
  * `keyword`: Evaluates incoming text against specific comma-separated terms (e.g., *pain*, *implant*, *membership*, *plots*).
  * `outside_hours`: Evaluates incoming requests against configured business operating hours.
  * `appointment_booked`: Triggers on a successful calendar reservation event.
* **Conditions**:
  * Checks incoming message content against active keyword filters.
  * Checks system timestamp against operating hours range (e.g., *9:00 AM - 8:00 PM*).
* **Actions**:
  * `send_reply`: Dispatches an automated, localized message script template.
  * `assign_agent`: Escapes the automated loop and flags the contact for human staff intervention.
  * `schedule_followup`: Automatically inserts a reminder card inside the Calendar tasks list.
  * `alert_staff`: Displays an alert banner on the receptionist's dashboard.

### 8.2 Variable Replacement Mechanics
Automated messages replace custom placeholders at the moment of dispatch:
* `{{name}}`: Normalized Contact Name.
* `{{dateTime}}`: Scheduled Appointment Date & Time.
* `{{businessName}}`: Connected Business Name.
* `{{senderName}}`: Primary Doctor or Practitioner Name.
* `{{reviewsLink}}`: Google Review Link.

---

## SECTION 9: WHATSAPP PLATFORM INTEGRATION

The platform offers a dual-mode communication framework, balancing zero-cost testing simulations with enterprise-grade Meta API integrations.

```
                    +─────────────────────────────────────────+
                    │          WhatsApp Platform              │
                    +────────────────────┬────────────────────+
                                         │
                        Select Communication Mode
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
         +─────────────────────+                   +─────────────────────+
         │   Simulated Mode    │                   │      Meta Mode      │
         │   • Simulated logs  │                   │   • Meta Cloud API  │
         │   • Local events    │                   │   • Live Webhooks   │
         │   • Free testing    │                   │   • Real message    │
         +─────────────────────+                   +─────────────────────+
```

### 9.1 Mode Configurations
1. **Simulated Mode (Default)**: Emulates a local WhatsApp gateway. Displays outgoing logs, connection statuses, simulated device pairing stats (battery, signal), and incoming message webhooks. This allows clinics to test workflows instantly with no Meta developer setup.
2. **Meta Cloud API Mode**: Uses the official Meta Graph API. Connects to the business's official verified phone number, enabling templated messages to be delivered directly to customers' phones.

### 9.2 official Webhook Structure
The platform hosts a dedicated Webhook API endpoint (`/api/whatsapp/webhook`) mapped to the Meta standard payload. Incoming messages parse:
* Sender Phone: Extract numeric identifier.
* Message Text: Extract text strings.
* Message Type: Map text/media categories.
On receipt, the webhook resolves the tenant, processes the text against the active Chatbot Node or Automation Rules, executes the Gemini AI Copilot logic if active, and dispatches responses instantly.

### 9.3 Multi-Level Interactive Chatbot Flow
The chatbot operates on a tree of structured `ChatbotNode` elements, enabling fully interactive automated menus:
* **Root Node (`node-root`)**: Triggered by keywords (e.g., *menu*, *hello*, *0*). Returns a list of options (e.g., *1. Timings*, *2. Treatments*, *3. Experts*, *4. Reviews*, *5. Booking*).
* **Nested Option Nodes**: Selecting "2" returns the catalog sub-menu. Selecting "2.a" provides deep-dive treatment specs.
* **Smart Action Nodes**:
  * `show_prices`: Automatically lists current prices pulled from the dynamic Google Sheets database.
  * `calendar`: Triggers a calendar scheduling dialog, parsing natural language details to log booking cards.

---

## SECTION 10: AI COPILOT & NATURAL LANGUAGE ENGINE

### 10.1 The @google/genai TypeScript SDK Architecture
Vyapari Nestam uses the standard Gemini API via the official `@google/genai` SDK on the backend. This setup prevents key leaks, speeds up processing, and allows secure data handling.

```typescript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
```

### 10.2 Dynamic RAG (Retrieval-Augmented Generation) Workflow
When a contact has `aiAutopilot` active, incoming customer WhatsApp messages trigger a localized RAG cycle:
1. **Knowledge Retrieval**: The system reads the `CRM_KnowledgeBase` tab in the client's Google Sheet, retrieving four context blocks: Timings, Treatments, Doctor Profiles, and Reviews.
2. **Prompt Assembly**: The system builds a structured instruction prompt using the business profile, customer details, past conversations, and the retrieved knowledge base context.
3. **Execution**: Gemini processes the prompt and returns a response that matches the clinic's brand voice.

### 10.3 Structured Natural Language Scheduling Parser
When a customer texts a scheduling request (e.g., *"Book a pediatric consult for Prasad tomorrow at 11 AM"*), Gemini analyzes the message and returns a structured JSON payload:
```json
{
  "shouldSchedule": true,
  "summary": "Pediatric Consultation - Prasad",
  "date": "2026-07-22",
  "time": "11:00:00",
  "description": "Booked automatically via WhatsApp AI Co-Pilot"
}
```
The Express server processes this JSON payload, verifies slot availability on Google Calendar, reserves the calendar slot, logs the interaction, and texts the customer a booking confirmation.

---

## SECTION 11: GOOGLE WORKSPACE DATA SYNCHRONIZATION

The core of the platform's Bring-Your-Own-Storage (BYOS) model is its deep, resilient integration with Google Workspace. It treats Google Sheets, Calendar, and Drive as a secure database.

### 11.1 Master Sheet Directory Architecture
The client's primary database is a single Google Spreadsheet titled **"WhatsApp CRM Database"** structured across six tabs:

1. **`CRM_Contacts` Tab**:
   * *Column Matrix*: `Contact ID` (A), `Name` (B), `Phone` (C), `Category` (D), `Notes` (E), `Last Contacted` (F), `Created At` (G), `Source` (H), `Is Repeat` (I), `Amount Collected` (J).
2. **`CRM_Interactions` Tab**:
   * *Column Matrix*: `Interaction ID` (A), `Contact ID` (B), `Contact Name` (C), `Type` (D), `Notes` (E), `Outcome` (F), `Timestamp` (G).
3. **`CRM_KnowledgeBase` Tab**:
   * *Column Matrix*: `Field` (A), `Content` (B), `Industry Sector` (C).
4. **`CRM_Templates` Tab**:
   * *Column Matrix*: `Template ID` (A), `Title` (B), `Category` (C), `Message Text` (D).
5. **`CRM_SEOAuditLogs` Tab**:
   * *Column Matrix*: `Log ID` (A), `Business Name` (B), `City/Landmark` (C), `Industry` (D), `SEO Score` (E), `Completed Items Count` (F), `Total Items Count` (G), `Timestamp` (H).
6. **`CRM_RevenueTracker` Tab**:
   * *Column Matrix*: `Log ID` (A), `Contact ID` (B), `Contact Name` (C), `Amount Collected` (D), `Treatment Type` (E), `Timestamp` (F), `Notes` (G).

### 11.2 Real-Time Sync & Token Handling
* **Google OAuth Lifecycle**: Upon Firebase authentication, Google's access token is stored in the application state.
* **Synchronization Operations**: Reads are executed on page load and tab transitions, and writes are batched asynchronously using debounce functions to prevent hitting API rate limits.
* **Token Expiry Resilience**: If an API call fails with a `401 Unauthorized` status, the proxy catches the error and uses the secure, server-side offline refresh tokens to request a new session access token. This keeps integrations running smoothly.

---

## SECTION 12: ANALYTICAL REPORTS & INSIGHTS

Vyapari Nestam features a specialized reports panel to help business owners track and improve key operational metrics.

### 12.1 Analytical Scorecards
1. **Revenue Growth Report**:
   * *Metrics*: Monthly collected revenue, pending payments, and payment methods (Cash, UPI, Card).
   * *Visualization*: Recharts area chart showing daily collection trends.
2. **Appointment Analytics**:
   * *Metrics*: Completed sessions, cancellations, and no-shows.
   * *Visualization*: Interactive bar chart detailing weekly scheduling changes.
3. **Patient Pipeline Conversion**:
   * *Metrics*: Conversion rates of leads moving from Initial Inquiry to Completed treatments.
   * *Visualization*: Funnel chart highlighting pipeline drop-off stages.
4. **Acquisition Channels**:
   * *Metrics*: Lead distribution across WhatsApp, Phone, Website, and Walk-in sources.
   * *Visualization*: Donut chart identifying top lead-generating channels.

### 12.2 Missing KPIs
* **Days Sales Outstanding (DSO)**: The average time taken to collect remaining balances after completing treatments.
* **Staff Performance Index**: Tracks check-in speeds, payment logging accuracy, and WhatsApp response times per receptionist.

---

## SECTION 13: DASHBOARD CONTROL WIDGETS

| Widget Component | Data Source | Calculation Logic | Business Purpose | Refresh Rate |
| :--- | :--- | :--- | :--- | :--- |
| **Total Revenue Card** | `CRM_RevenueTracker` | Sum of all rows in the `Amount Collected` column. | Displays real-time financial performance. | On tab change / payment event |
| **Active Client Pipeline** | `CRM_Contacts` | Count of contacts where pipeline stage is not `Completed`. | Shows the size of the active customer base. | Instant on stage edit |
| **Retention Rate Tracker**| `CRM_Contacts` | `(Repeat Clients / Total Clients) * 100` | Measures customer loyalty and repeat visits. | Computed on sheet load |
| **Upcoming Bookings** | Google Calendar | Chronological list of events in the next 24 hours. | Helps receptionists plan their daily workflow. | Every 5 minutes (auto) |

---

## SECTION 14: PLATFORM CONFIGURATION DIRECTORY

The architecture is built on a configuration-driven design. The table below outlines how system elements are configured.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       CONFIGURATION MANAGEMENT                                         │
├──────────────────────────────┬──────────────────────────────┬──────────────────────────────────────────┤
│ System Property              │ State Class                  │ Future Path / Schema Target              │
├──────────────────────────────┼──────────────────────────────┼──────────────────────────────────────────┤
│ Target Industries            │ Hardcoded (industryConfig)   │ Moved to global database lookup table    │
│ Service Catalog Items        │ Initialized in wizard        │ Saved as configurations in Sheet         │
│ Terminology Labels           │ Hardcoded (Terminology maps) │ Moved to tenant-specific DB payload      │
│ Brand Tones                  │ UI Wizard Selected           │ Abstracted as prompt template metadata   │
│ Automation Rules             │ Mapped to industry presets   │ Fully editable JSON inside Sheets        │
│ Pipeline Stages              │ Hardcoded presets            │ User-defined stage list payload          │
└──────────────────────────────┴──────────────────────────────┴──────────────────────────────────────────┘
```

---

## SECTION 15: REUSABILITY & EXTENSION ANALYSIS

### 15.1 Core Modules Reusability Matrix
* **Onboarding Wizard**: *Reusable Everywhere*. The wizard structure, channels, and brand tone screens can support any local business (wellness center, retail, consulting) by swapping industry-specific presets.
* **Contacts Directory & Slide-Drawer**: *Industry-Neutral*. The directory and profile views are highly reusable; medical-specific clinical history displays adapt to other industries by reading the terminology configuration map.
* **Billing split-ledger**: *Industry-Neutral*. The payment tracking, outstanding balances tracker, and PDF receipt generator are fully compatible with any service business that uses milestone-based payments.
* **SEO Local Scan Engine**: *Reusable Everywhere*. The citation auditing, checklists, and local keyword generators work for any physical local business.

### 15.2 Refactoring Action Items
1. **Abstract Clinical Case Card Views**: Refactor the clinical details and case history components into a dynamic field-rendering system that displays forms based on the active industry (e.g., *Tooth Map* for Dental, *Property Preferences* for Real Estate, *Body Fat Tracker* for Gyms).
2. **Move Industry Configuration to Supabase**: Shift the static configurations in `industryConfig.ts` to a global database. This allows developers to add or update industries without modifying the React code.

---

## SECTION 16: TECHNICAL DEBT & RISK AUDIT

### 16.1 Code Smells & Scalability Risks
1. **Large Frontend State Bundling**: Much of the business logic, Google API interactions, and mock transitions are managed within `src/App.tsx`. As the application grows, this structure can lead to longer load times and maintainability challenges.
2. **Batch API Write Rate Limits**: Rapidly editing multiple contacts trigger immediate, individual calls to the Sheets API. Under high concurrent usage, this setup risks triggering rate limit blocks from Google.
3. **No Local Validation Cache**: If the server-side API proxy returns a slow response, the UI lacks an optimistic rendering layer to instantly reflect local changes while synchronization runs in the background.

### 16.2 Security Vulnerabilities
* **Google API Client-Side Token Exposure**: Access tokens are held in the React application state. While standard for single-page applications, storing these tokens in memory presents a security risk if the application is vulnerable to Cross-Site Scripting (XSS).

---

## SECTION 17: COMPREHENSIVE USER EXPERIENCE REVIEW

### 17.1 UI & Layout Architecture
The application features a clean, professional dark-mode design with high-contrast emerald and slate accents. It offers a structured layout with balanced negative space, making it easy to read during busy workdays.

```
 +──────────────────────────────────────────────────────────────────────────────+
 │  Logo  │ Global Patient Search Box                   │ Sync Status │ User   │
 +──────────────────────────────────────────────────────────────────────────────+
 │ Dash   │                                                                     │
 │        │  +──────────────────────────────────────────+   +────────────────+  │
 │ Cont   │  │                                          │   │                │  │
 │        │  │          Main Interactive View           │   │   Quick Actions│  │
 │ Cal    │  │                                          │   │                │  │
 │        │  │                                          │   │   - New Client │  │
 │ Bill   │  │                                          │   │   - Book Slot  │  │
 │        │  +──────────────────────────────────────────+   +────────────────+  │
 │ Set    │                                                                     │
 +────────┴──────────────────────────────────────────────────────────────────────+
```

### 17.2 Usability Evaluation
* **Receptionist Usability**: *High*. Key actions like booking appointments, registering clients, and completing check-ins are accessible on the main screen in 1 or 2 clicks, minimizing distraction during check-in peaks.
* **Doctor Usability**: *High*. The simplified profile slide-out drawer provides doctors with quick, focused access to patient history, diagnostic files, and case notes without cluttering the screen with unnecessary administrative settings.
* **Owner Usability**: *High*. Financial reports, automation rules, and SEO audits are organized in clean, separate tabs with scannable summaries, making it easy to monitor business growth.

---

## SECTION 18: PRODUCT MANAGEMENT REVIEW

### 18.1 Strategic Product Opportunities
1. **Standardized UPI QR Code Generator**: Adding a dynamic UPI QR code generator (using the doctor's bank details) directly to the receptionist's checkout screen. This displays a custom QR code for the outstanding treatment amount, speeding up in-person payments.
2. **SMS Gateway Fallback**: Integrating an SMS gateway (e.g., Twilio, Gupshup) alongside WhatsApp. This ensures message delivery if a patient's mobile data is turned off, maintaining reliable communication.

### 18.2 Features with Low Adoption Potential
* **Detailed Manual Template Builder**: Receptionists often avoid building complex templates from scratch during busy work hours. The system should focus on providing pre-configured templates that adapt to the business's industry, rather than complex manual builders.

---

## SECTION 19: MULTI-INDUSTRY ENGINE

### 19.1 Target Architecture
Vyapari Nestam's long-term success relies on its ability to support different local business industries using a single, unified codebase. The platform achieves this by storing all industry-specific details, terminology, and workflows as structured data, rather than hardcoding them.

```
 +───────────────────────────────────────────────────────────+
 │                Tenant Subscription Profile                │
 +─────────────────────────────┬─────────────────────────────+
                               │
                       Industry Category
                               │
                               ▼
 +───────────────────────────────────────────────────────────+
 │               Industry Configuration Engine               │
 +─────────────────────────────┬─────────────────────────────+
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
  Terminology Map        Pipeline Stages     Automation Presets
  "Patient" -> "Member"   "Visited" -> "Toured"   Custom Auto-Replies
```

### 19.2 The Core Terminology Map
The system uses the Terminology Map (`IndustryTerminology`) to dynamically update all UI text labels based on the active industry, ensuring a tailored experience for every business:

| Industry ID | `patientLabel` | `patientsLabel` | `treatmentLabel` | `doctorLabel` | `costLabel` |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **dental** | Patient | Patients | Treatment | Dentist | Treatment Cost (₹) |
| **cosmetic** | Patient | Patients | Aesthetic Procedure | Dermatologist | Procedure Fee (₹) |
| **multispecialty**| Patient | Patients | Consultation & Labs | Specialist Doctor| Consult Fee (₹) |
| **gym** | Member | Members | Fitness Package | Personal Trainer | Membership Price (₹)|
| **realestate** | Client | Clients | Property / Listing | Property Agent | Property Price (₹) |

### 19.3 Dynamic Progress Pipelines
Pipeline stages adapt their status labels and interface icons according to the active industry configuration, maintaining clean workflows across different sectors:
* **Dental Clinic Pipeline**: `Inquiry` (Lead) ➔ `Scheduled` (Booked) ➔ `Visited` (Consulted) ➔ `Treatment Underway` ➔ `Completed` (Done).
* **Gym Membership Pipeline**: `Inquiry` (Lead) ➔ `Trial Session Booked` ➔ `Trial Done (Gym Toured)` ➔ `Active Membership` ➔ `Completed` (Renewed/VIP).
* **Real Estate Agency Pipeline**: `Lead / Inquiry` ➔ `Showing Scheduled` ➔ `Site Visited` ➔ `Offer & Negotiation` ➔ `Closed Won` (Deal).

---

## SECTION 20: STRATEGIC RECOMMENDATIONS

### 20.1 Critical Fixes Before Launch
1. **Optimize API Operations**: Implement batching and debouncing for Google Sheets updates to prevent write collisions and stay within Google API rate limits.
2. **Improve Error and Refresh Token Handling**: Build a clear client-side notification for Google OAuth token expiration, prompting users to re-authorize their accounts smoothly without interrupting their workflows.

### 20.2 Quick Wins for User Experience
* **Add Quick-Action Dashboard Buttons**: Add 1-click buttons on the receptionist's dashboard to quickly trigger WhatsApp payment reminders or appointment confirmations, reducing routine manual tasks.
* **Pre-fill Setup Templates**: Automatically generate and pre-fill default services and templates based on the selected industry during onboarding, allowing businesses to launch with minimal manual entry.

### 20.3 Long-Term Product Roadmap
1. **Develop an Industry Configuration Console**: Build a centralized control panel for administrators to easily create, configure, and manage new industries, pipelines, and automation presets without writing code.
2. **Introduce Voice-to-Text Clinical Scribing**: Add a simple voice recording button for doctors to dictate treatment notes. An AI model parses the audio and automatically updates the patient's record in Google Sheets, saving valuable clinical documentation time.
