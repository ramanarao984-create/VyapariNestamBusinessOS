# Product Requirements Document (PRD) v1.0
## Vyapari Nestam CRM: The Clinic Growth Platform

---

### 1. Vision
To empower regional and independent Indian clinics to transition from chaotic, disorganized physical registers to automated growth engines without sacrificing control, affordability, or ownership of their clinical data. 

We envision a world where a solo doctor in a Tier-2 town runs a high-performance, automated clinic with the same structural efficiency as a corporate hospital chain—powered by the software they already trust and own: Google Workspace.

---

### 2. Mission
To design and deploy the ultimate high-adoption, zero-friction Clinic Growth Platform for Indian practitioners. By engineering a secure, high-fidelity CRM interface on top of a "Bring Your Own Storage" (BYOS) Google Workspace backend, we eliminate data lock-in, slash software overhead, and directly optimize the clinic's bottom-line: reducing missed appointments, accelerating collections, and driving long-term patient repeat visits.

---

### 3. Product Positioning
* **Category**: Clinic Growth Platform (not an administrative "EMR" or an exotic "AI CRM").
* **Core Value Statement**: *"Your Clinic Growth Platform, on Your Own Terms."*
* **The Paradigm Shift**: Traditional EMRs act as data silos designed to lock doctors in and extract high monthly fees. Vyapari Nestam CRM positions itself as a specialized **growth wrapper** over the clinic’s personal Google Workspace. The clinic gets the automation, WhatsApp engine, and responsive UI they need, while the database remains permanently in their private Google Drive and Sheets. If they ever stop the subscription, they retain 100% of their records in standard, readable spreadsheets.

---

### 4. Ideal Customer Profile (ICP)
* **Target Segments**: Independent Dental Clinics and Medical/Specialty Clinics.
* **Geography**: India, starting with Tier-1 and Tier-2 cities in Andhra Pradesh (e.g., Visakhapatnam, Vijayawada, Guntur, Rajahmundry, Nellore, Kakinada).
* **Clinic Size**: 
  * Solo doctors operating individual practices.
  * Small partnership clinics with 1 to 3 active doctors and 2 to 20 clinical/administrative staff (receptionists, dental assistants, compounders).
* **Technology Adoption Level**: High smartphone usage (WhatsApp, UPI, Google Pay), moderate desktop literacy, high trust in Google-branded services, but deep resistance to complex, rigid enterprise software.

---

### 5. Customer Problems & Pain Points

#### A. The "Data Lock-In" Anxiety
Doctors fear cloud vendors raising subscription fees, going out of business, or locking their patient database behind proprietary formats. Many refuse to adopt cloud systems because they want complete control over their records.

#### B. High Appointment No-Show Rates (Loss of Revenue)
Patients forget appointment times, leading to empty slots and wasted doctor hours. Semi-manual tracking means receptionists must spend hours calling or texting patients individually—a task that is often forgotten during peak clinic hours.

#### C. Payment Leakage in Multi-Session Treatments
Treatments like root canals, orthodontics, or multi-week clinical courses are billed across several sittings. Clinics lack a cohesive ledger to track partial payments, leading to forgotten balances and major revenue leakage.

#### D. Non-Existent Patient Recall & Retention
Clinics lose up to 40% of their historical patient base annually simply because they fail to send routine check-up reminders or medical follow-ups.

#### E. High Software Abandonment due to Staff Friction
Receptionists are often hired with basic administrative skills. Complex, English-heavy EMR platforms require hours of training, leading to staff bypass and a return to physical paper registers.

---

### 6. Competitive Landscape

| Attribute | Vyapari Nestam CRM | Practo Ray | Cliniko / CareStack | Google Sheets (Pure) | Manual Registers (Paper) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Data Ownership** | **100% Client Owned** (stored directly in client's Google Sheets / Drive) | Proprietary Cloud Silo (locked by vendor) | Proprietary Cloud Silo (locked by vendor) | 100% Client Owned | 100% Client Owned (vulnerable to physical damage) |
| **Automation** | **Fully Automated** (scheduled WhatsApp, reminders, receipts, recalls) | Basic SMS (expensive, rigid templates) | Email & SMS (expensive, non-localized for India) | Zero (requires manual copy-pasting) | Zero |
| **Interface Complexity** | **Bespoke Clinic UI** (Zero training, localized Telugu/English layouts) | Over-engineered, clinical, high learning curve | Complex, clinical, global-first | Messy, hard to navigate on mobile, high error rate | Simple but slow and unsearchable |
| **Cost Structure** | **Fixed low-cost monthly fee** + BYOS Google account | Expensive monthly subscription per doctor | High USD-denominated pricing | Free | Free (cost of paper) |
| **WhatsApp Integration** | **Native Meta API** (automated templates and UPI-friendly triggers) | No/Limited (relies on legacy carrier SMS) | Minimal/SMS-focused | Zero | Zero |

---

### 7. Unique Value Proposition (UVP)
> **"Absolute Data Sovereignty, Automated Clinic Growth."**
> Vyapari Nestam CRM is the only software that supercharges your clinic's scheduling, billing, and patient engagement while storing 100% of your records in your own Google Drive. We don't lock you in; we just make your clinic grow.

---

### 8. Version 1.0 Scope (In vs. Out)

#### IN Scope (Core Pillars)
1. **Self-Service Clinic Onboarding Wizard**: Connects to the clinic's Firebase Auth, provisions the metadata layer, and maps or auto-generates their Google Spreadsheet database, Google Calendar, and Drive Folders.
2. **Unified Receptionist Dashboard**: A "single screen of truth" focusing on today's appointments, outstanding balances, daily collections, and critical follow-up tasks.
3. **High-Fidelity Patient Directory**: Centralized search, digital patient cards, medical alerts, complete visit history, and instant access to diagnostic files stored directly on Drive.
4. **Bi-directional Google Calendar Scheduler**: Visual, touch-friendly booking calendar that syncs with Google Calendar in real-time.
5. **Session-Based Split Billing Ledger**: Easily handles upfront deposits, installment payments, and custom treatment quotes, generating instant PDF receipts stored in Google Drive.
6. **WhatsApp Communication Suite**: Native Meta API integration for scheduled appointment reminders, check-in greetings, UPI payment requests, and automated clinical recalls.

#### OUT Scope (Deferred for V2)
1. **In-App Video Teleconsultations**: (Clinics will instead use automated WhatsApp or Google Meet links).
2. **Comprehensive Pharmacy & Inventory Management**: (Avoid over-engineering V1; clinics can track inventory in a separate simple tab in their Google Sheet).
3. **Insurance Claims Integration (TPA)**: (Too complex and non-standardized for solo Indian clinics).
4. **Patient-Facing Mobile App**: (All patient-facing interactions occur frictionlessly via WhatsApp).

---

### 9. Core Functional Modules

#### A. Onboarding & Setup Wizard
* Connects the clinic owner's Google account to authorize Google Calendar, Drive, and Sheets.
* Dynamically writes default templates, headers, and formulas to the connected Sheet.
* Captures clinic-specific parameters: name, operating hours, active doctor profiles, and custom services list.

#### B. Unified Growth Dashboard
* **Daily Performance Summary**: Appointments completed, active cancellations, total collections, and newly registered patients.
* **Actionable Growth Rails**:
  * *High-Risk No-Shows*: Shows patients who missed appointments today with a single-click WhatsApp "Re-book" trigger.
  * *Collection Pipeline*: Lists patients with outstanding balances who visited recently with a single-click "Payment Link / UPI Nudge".

#### C. Patient Profile & Digital Case Cards
* **Unified Profile**: Demographics, medical history check-boxes (e.g., Hypertension, Diabetes, Pregnancy), and persistent "Sticky Notes" for personal patient preferences.
* **Clinical Records**: Visually grouped visit history. Clicking a visit opens clinical notes, prescribed medications, and direct links to diagnostic scans (stored and structured neatly in the mapped Google Drive Folder).

#### D. Appointment Booking Engine
* A clean, visual day/week/month calendar.
* Drag-and-drop rescheduling.
* Prevent double-booking for the same doctor.
* Automated sync ensures appointments booked in the CRM appear on the doctor’s personal phone via Google Calendar.

#### E. Split-Billing & Invoice Ledger
* Standardized treatment catalog mapping services to prices (e.g., Root Canal: ₹6,000, Extraction: ₹1,500).
* Split billing support: track "Total Quoted", "Paid Today", and "Balance Outstanding".
* Log each payment transaction with payment mode (UPI, Cash, Card) and sync instantly to the Google Sheet billing ledger.

#### F. WhatsApp Nudge Engine
* **Automated Triggers**:
  * *On Booking*: "Dear [Name], your appointment with [Doctor] is confirmed for [Date] at [Time]."
  * *2 Hours Before*: "Reminder: See you soon! Location link: [Google Maps Link]."
  * *On Payment*: "Thank you! We received ₹[Amount]. Remaining balance: ₹[Balance]. View Receipt: [Drive Link]."
  * *Recalls*: Pre-scheduled reminders based on treatment categories (e.g., 6 months after a dental scaling visit: "Time for your routine dental cleanup, Dr. [Name] is available this week.").

---

### 10. User Personas & Permissions

```
┌────────────────────────────────────────────────────────┐
│                      Clinic Staff                      │
├─────────────────┬──────────────────────────────────────┤
│ Role            │ Scope of Action & Permissions        │
├─────────────────┼──────────────────────────────────────┤
│ Owner (Doctor)  │ Full control, financial dashboards,   │
│                 │ staff access, billing configs.       │
├─────────────────┼──────────────────────────────────────┤
│ Doctor          │ Clinical notes, prescriptions,       │
│                 │ personal schedule, patient history.  │
├─────────────────┼──────────────────────────────────────┤
│ Receptionist    │ Booking, check-ins, payment collection,│
│                 │ WhatsApp dispatch, general search.   │
├─────────────────┼──────────────────────────────────────┤
│ ReadOnly        │ Audits, read-only analytics views.   │
└─────────────────┴──────────────────────────────────────┘
```

#### 1. Dr. Srinivas (Clinic Owner)
* **Demographics**: 45 years old, Senior Dentist, Guntur.
* **Goals**: Wants to view daily clinical revenue, minimize patient leakage, keep staff accountable, and ensure his data is secure and portable.
* **Frustrations**: Hates paying exorbitant annual SaaS fees, fears cloud platforms locking his data, and dislikes looking at complicated administrative screens.

#### 2. Prasad (Receptionist)
* **Demographics**: 24 years old, High-school graduate, fast mobile typist.
* **Goals**: Quickly register patients, book appointments, collect payments, and send reminders without typing long messages manually.
* **Frustrations**: Gets easily overwhelmed when multiple patients stand at the front desk. Struggles with systems requiring complex multi-tab clicks or dense English instructions.

#### 3. Dr. Anjali (Visiting Orthodontist)
* **Demographics**: 32 years old, travels to 4 clinics weekly.
* **Goals**: See her schedule for the day, view past records for her active orthodontic patients, write clinical notes, and leave.
* **Frustrations**: Does not want access to the main clinic's financial reports or other doctors' schedules. Needs a clean, mobile-friendly interface she can access between clinics.

---

### 11. Complete End-to-End User Journey

```
  [Discovery & Booking] ──► Patient schedules; Auto WhatsApp confirmation sent.
          │
          ▼
  [Check-in & Arrival]  ──► Receptionist checks patient in with one tap.
          │
          ▼
  [Clinical Session]    ──► Doctor reviews case card, logs notes & prescriptions.
          │
          ▼
  [Billing & Split Pay] ──► Treatment is billed; split payment logged; PDF receipt on Drive.
          │
          ▼
  [Recall & Retention]  ──► Scheduled follow-up / 6-month automated check-up reminder.
```

1. **Discovery & Booking**:
   * Patient Suresh calls the clinic. Receptionist Prasad opens the CRM calendar, checks slot availability, and books Suresh for a "Dental Crown Consultation" with Dr. Srinivas on Wednesday at 5:00 PM.
   * *System Action*: Appointment is written to the clinic's Google Calendar and synchronized with the metadata database. An automated WhatsApp confirmation with a Google Maps location is sent to Suresh.

2. **Arrival & Check-In**:
   * Suresh arrives at the clinic on Wednesday. Prasad searches for "Suresh" in the CRM search bar, taps "Check-In".
   * *System Action*: Suresh's status changes to "Waiting" on the Dashboard. Dr. Srinivas is instantly notified on his screen that his next patient has arrived.

3. **Consultation & Clinical Session**:
   * Dr. Srinivas opens Suresh's Digital Case Card, reviews historical notes, and diagnoses the need for a Ceramic Crown (total treatment estimate: ₹8,000). 
   * Dr. Srinivas types clinical notes, adds a prescription list, and saves the session.
   * *System Action*: Notes and prescriptions are instantly appended to the patient's record on Google Sheets.

4. **Billing & First Installment**:
   * Suresh walks to the reception desk. Prasad pulls up Suresh's active treatment card. The system shows: "Ceramic Crown: ₹8,000". Suresh pays ₹3,000 today via Google Pay UPI.
   * Prasad enters "₹3,000", selects "UPI", and hits "Generate Receipt".
   * *System Action*: The CRM updates the sheet, logs ₹3,000 paid, flags ₹5,000 as "Balance Outstanding", compiles a clean PDF invoice, uploads it to Suresh's Drive folder, and sends a WhatsApp receipt with a Drive download link to Suresh.

5. **Follow-Up and Collection**:
   * Two weeks later, Suresh returns for final crown fitting. Dr. Srinivas completes the treatment.
   * Suresh pays the remaining ₹5,000 balance. Prasad logs the payment in the CRM.
   * *System Action*: Balance outstanding updates to ₹0. Suresh's treatment status shifts to "Completed".

6. **Recall and Repeat Visit**:
   * 6 months later, the system detects Suresh has completed crown treatment and is due for a routine dental scaling.
   * *System Action*: An automated WhatsApp recall nudge is triggered: "Hi Suresh! It's been 6 months since your crown treatment with Dr. Srinivas. Time for your routine check-up and teeth cleaning. Tap here to book a slot this Friday." Suresh taps, and the cycle repeats.

---

### 12. Information Architecture & Navigation Structure

Our visual hierarchy is flat and responsive, optimized for desktop and mobile, ensuring no core action is more than two taps away.

```
[Main Layout]
   ├── Top Navigation Bar (Clinic selector, User Profile, Global Patient Search, System Status Indicator)
   └── Main Viewport (Dynamically rendered based on active sidebar selection)

[Sidebar Navigation]
   ├── Dashboard (Daily stats, "High-Risk No-Shows" rail, "Outstanding Balance" collection queue)
   ├── Patient Directory (Dynamic search, Active Patients list, "Add Patient" action card)
   ├── Calendar Scheduler (Touch-optimized day/week/month booking layout, Doctor filters)
   ├── Treatments & Billing (Active quotes ledger, payment tracking, invoices directory)
   ├── WhatsApp Engagement (Template configurations, message queue log, campaign tracker)
   └── Clinic Settings (Staff accounts, service catalog, operating hours, Google configuration status)
```

---

### 13. Feature Prioritization (MoSCoW Matrix)

#### Must Have (Non-Negotiable for Launch)
* Self-service onboarding wizard mapping Sheets/Drive/Calendar.
* Complete Patient Directory with alphanumeric/mobile search.
* Visual Scheduler with instant bidirectional Google Calendar sync.
* Multi-session split-payment tracking ledger with cash/UPI/card logging.
* Core RBAC role controls (Owner, Doctor, Receptionist).
* Automated WhatsApp reminders triggered by Booking, Check-In, and Billing.

#### Should Have (Highly Desirable)
* Quick-action growth widgets on the dashboard (one-tap payment link requests).
* Custom medical alerts banner on the Patient Card (allergies, systemic health flags).
* Localization: Telugu WhatsApp templates alongside English.
* Drag-and-drop calendar slot re-scheduling.

#### Could Have (Nice to Have)
* UPI QR Code generator directly on the receptionist's checkout screen (calculates outstanding amount).
* Bulk seasonal greetings WhatsApp campaign manager (e.g., Diwali or Sankranti clinic timings).
* Automated daily closing ledger summary emailed to the Owner.

#### Won't Have (Explicitly Out for V1)
* Cross-branch pharmaceutical stock inventory synchronization.
* Direct insurance claim processing API integrations.
* In-app voice or video consultations.

---

### 14. Success Metrics (KPIs)

1. **Time-to-Value (TTV)**: Clinic completes the onboarding wizard and successfully saves their 1st patient record in under **15 minutes**.
2. **Reduction in No-Shows**: Drop-off rate for scheduled appointments decreases from an industry average of ~25% down to **< 8%** within 60 days of WhatsApp auto-reminders activation.
3. **Days Sales Outstanding (DSO)**: Average time to collect outstanding partial-session treatment balances reduced by **40%**.
4. **Platform Stickiness (MAU)**: At least **90%** of active clinics having their receptionist log in and update patient statuses daily.
5. **Zero Data Portability Churn**: Retention remains high because doctors trust they can leave at any time and keep their Google Sheets data—resulting in an expected annual customer churn of **< 2%**.

---

### 15. Pricing Strategy & Commercial Flow

#### A. One-Time Setup & Onboarding Fee (₹7,000 – ₹9,000)
* **What it covers**:
  * Professional setup of the clinic's dedicated Google Workspace.
  * Structural calibration of their master Google Sheet database.
  * Integration of the Meta WhatsApp Business Cloud API with custom verified business display names.
  * Complete remote training session for the clinic’s receptionist and doctors.

#### B. Monthly Recurring Subscription (₹2,499 / Month)
* **What it covers**:
  * Unrestricted access to the high-performance Vyapari Nestam CRM dashboard and UI.
  * Advanced cloud server proxies managing high-fidelity Sheet queries, secure API routing, and calendar synchronizations.
  * Ongoing platform maintenance, structural backup monitoring, and access to new feature releases.
  * Note: Meta WhatsApp API messaging costs (micro-payments per template conversation) are paid directly by the clinic to Meta, maintaining absolute transparency.

---

### 16. Future AI Opportunities (High-Value, Low-Complexity)
* **Voice-to-Text Clinical Scribe**: A simple recording button inside the clinical session where a doctor can speak notes in a mix of Telugu and English. An AI model parses the audio and returns formatted, clean text to populate the patient's digital record sheet.
* **Smart Treatment Planner**: Generates an automated, structured treatment timeline and installment payment schedule based on basic diagnosis categories selected by the doctor.
* **Adherence Predictor**: Analyzes historical appointment data and payment patterns to flag patients with a high risk of skipping follow-up check-ups, enabling pre-emptive personalized WhatsApp engagement.

---

### Gaps, Assumptions, Open Questions, and Risks

#### 1. Technical Gaps & Limitations of Google Sheets as a Database
* *Risk*: As a clinic grows, their master Google Sheet can experience latency when executing high-volume queries or reaching Sheet limits (currently 10 million cells).
* *Mitigation*: Design the metadata caching layer to handle high-frequency UI tasks, writing batches asynchronously to the Sheets. Implement automated archiving scripts (e.g., moving completed treatment records older than 2 years to an archive sheet) during setup.

#### 2. WhatsApp Business Account Verification Hurdles
* *Risk*: Meta requires business verification (GST registration, clinic registration, or electric bills) to unlock official WhatsApp templates. Solo doctors often lack clean business registration papers, delaying onboarding.
* *Mitigation*: The setup process must support a "Sandbox / Unverified" state where clinics can use their WhatsApp Business number with limitations while the customer success team manually assists them with Meta verification during the onboarding week.

#### 3. Concurrent Multi-User Write Operations in Sheets
* *Risk*: If a receptionist, an owner-doctor, and a visiting consultant update records at the exact same millisecond, write collisions can occur.
* *Mitigation*: Implement a server-side write queue in the Express server that serializes spreadsheet updates sequentially per tenant, ensuring data integrity.

#### 4. Google OAuth Session Expiry
* *Risk*: Short-lived user OAuth tokens expire, causing API calls to Google Calendar or Sheets to fail midway through a session.
* *Mitigation*: The CRM must implement a smooth, unobtrusive client-side "Re-authorize Google Account" pop-up or use offline Google Refresh Tokens stored securely on our server.

#### 5. Network Connectivity in Tier-3 Locations
* *Risk*: Intermittent internet connection at the clinic reception desk can lead to unresponsive interfaces.
* *Mitigation*: The application must use local browser states (`localStorage`) to queue offline changes (e.g., booking a patient during an outage) and synchronize with the server once connectivity is restored.
