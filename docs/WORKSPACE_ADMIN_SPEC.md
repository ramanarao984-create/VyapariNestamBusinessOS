# Vyapari Nestam Business OS - Workspace & Business Administration Module Experience Specification

**Document Version:** 1.0  
**Status:** Final & Implementation-Ready  
**Role Scope:** Google's Chief SaaS Platform Architect, Enterprise Workspace Architect, IAM Expert, Security Architect, Product Designer, Enterprise UX Architect, and Staff Product Manager.

---

## 1. Executive Summary

The **Workspace & Business Administration Module** serves as the central operational control center, governance engine, and security perimeter for **Vyapari Nestam Business OS**. While operational modules (Contacts, Operations, Communications, Finance, Growth, AI Administration) carry out day-to-day customer interactions and workflows, Workspace Administration defines **who can perform which actions, where data is stored, how systems integrate, and how business rules adapt across branches and industries**.

Operating on a **Multi-Tenant SaaS** foundation with a strict **Bring Your Own Storage (BYOS)** architecture, this module ensures complete customer ownership over identity, configuration, storage infrastructure (Google Drive, Google Sheets, Google Calendar), Meta WhatsApp Cloud API credentials, and AI API keys.

### Alignment with the O-U-A-C Framework
* **Observe**: Continuously monitors Google Workspace API health, WhatsApp webhook uptime, AI API token usage, user session security, BYOS storage quotas, and configuration audit logs.
* **Understand**: Evaluates permission discrepancies, security event anomalies, API connection health failures, quota bottlenecks, and industry configuration drifts.
* **Act**: Delivers 1-click credential re-authorization, user invitation/deactivation, role creation, branch resource allocation, BYOS directory repair, and automated backup dispatches.
* **Confirm**: Validates API handshakes, writes immutable configuration change logs to customer-owned Google Sheets, updates security policies, and refreshes the Workspace Health Score.

---

## 2. Workspace Hierarchy Architecture

Vyapari Nestam organizes business operations through a strict 7-level multi-tenant organizational taxonomy:

```
BUSINESS TENANT (Organization Level)
 └── BRANCHES (Physical or Virtual Business Locations)
      └── DEPARTMENTS (Operational Units: Clinical, Reception, Sales, Billing)
           └── TEAMS (Functional Staff Groups: Stylists, Junior Doctors, Trainers)
                └── USERS (Authenticated Employees & Staff)
                     └── ROLES (Assigned Functional Responsibilities)
                          └── PERMISSIONS (Granular Feature, Resource & Field-Level Controls)
```

### Taxonomy Definitions
* **Business Tenant**: The root organization holding the main SaaS account, master BYOS storage credentials, and primary billing profile.
* **Branches**: Independent operational units (e.g., *Hyderabad Clinic*, *Vijayawada Branch*). Each branch has isolated working hours, calendars, staff, and invoice sequences, while sharing master branding and customer databases.
* **Departments**: Logic groupings within a branch (e.g., *Dental Department*, *Front Desk*, *Pharmacy*).
* **Teams**: Functional groupings across or within departments (e.g., *Morning Shift*, *VIP Reception Team*).
* **Users**: Individual staff members with authenticated Google Accounts or email logins.
* **Roles**: Pre-defined or custom permission sets (e.g., *Branch Manager*, *Senior Dentist*, *Receptionist*).
* **Permissions**: Granular boolean flags governing UI visibility, API execution, resource creation, editing, deletion, and field-level masking.

---

## 3. Business Profile & Identity Configuration

Centralized branding, legal entity registration, and operational policy configuration:

* **Core Profile Data**: Business Name, Operating Name (DBA), Logo URL, Favicon, Primary Brand Color, Dark Mode Brand Accent.
* **Taxation & Legal IDs**: GSTIN (India), PAN, TAN, MSME Registration Number, Drug License Number (Healthcare), FSSAI ID (Retail/Food).
* **Contact & Address Details**: Primary Business Phone, WhatsApp Business Number, Billing Email, Physical Address, Geolocation Coordinates (Latitude/Longitude for GBP map alignment).
* **Localization & Operating Rules**: Time Zone (`Asia/Kolkata` default), Primary Language (`en-IN`), Secondary Languages (`te-IN`, `hi-IN`), Currency (`INR / ₹`), Date Format (`DD/MM/YYYY`).
* **Holiday Calendar & Operating Hours**: National/Regional holiday schedule, weekly branch closures, special emergency hours.
* **Appointment & Service Policies**: Global cancellation window (e.g., 24 hours), booking deposit rules, late arrival grace period, overbooking threshold.

---

## 4. Multi-Branch Management

Enterprise multi-location governance supporting unified or branch-isolated operational controls:

```
+-----------------------------------------------------------------------------------+
|                            MULTI-BRANCH ARCHITECTURE                              |
+-----------------------------------------------------------------------------------+
| MASTER TENANT (Vyapari Nestam Owner)                                              |
|  ├─ Shared Resources: Global Customer Database (Contact 360°), Global Knowledge Base|
|  ├─ Master BYOS: Unified Google Drive Root, Central Finance Ledger Sheet          |
|  └─ Master Settings: Global Branding, Central Security Policies, AI Guardrails    |
+-----------------------------------------------------------------------------------+
| BRANCH A (Hyderabad)                   | BRANCH B (Vijayawada)                    |
|  ├─ Isolated Calendar & Working Hours   |  ├─ Isolated Calendar & Working Hours    |
|  ├─ Branch Staff & Practitioner Schedule|  ├─ Branch Staff & Practitioner Schedule |
|  ├─ Local Invoice Prefix (HYD-INV-001)  |  ├─ Local Invoice Prefix (VIJ-INV-001)   |
|  └─ Branch Queue & Walk-In Desk        |  └─ Branch Queue & Walk-In Desk         |
+-----------------------------------------------------------------------------------+
```

### Key Multi-Branch Capabilities
1. **Shared Customer Database**: A customer visiting Branch A can seamlessly visit Branch B; their Contact 360° history, lifetime spend, and loyalty points are unified across all branches.
2. **Branch-Specific Invoicing**: Unique invoice series (e.g., `HYD-2026-001` vs `VIJ-2026-001`) with local GST state code mapping.
3. **Cross-Branch Scheduling**: Staff floating across locations (e.g., a Consultant Doctor visiting Hyderabad on Mondays and Vijayawada on Thursdays).
4. **Cross-Branch Reporting**: Owner can aggregate revenue and performance across all branches or filter by individual branch.

---

## 5. User Management & Staff Onboarding

Lifecycle administration for staff accounts, access credentials, and operational assignments:

```
[Invite User via Email/Google] → [Assign Branch & Role] → [Send Activation Link] 
    → [OAuth / Password Setup] → [Enforce MFA & Device Registration] → [Active Session]
```

### Capability Details
* **User Onboarding Workflow**: Owner/Admin triggers email invite specifying Email, Full Name, Designation, Branch Assignment, Department, and Primary Role.
* **Authentication Options**:
  * **Google Sign-In / Workspace SSO** (Recommended): Direct single sign-on using employee Google Account.
  * **Email + Secure Password**: Enforced with strong password rules (12+ characters, special symbols, numbers).
* **Session & Device Controls**: Monitor active sessions, enforce automatic idle logout (default: 30 minutes), and revoke active JWT tokens remotely upon suspension.
* **Deactivation & Reassignment**: When an employee leaves, their account is deactivated in 1 click. Past appointments and records remain intact, while upcoming bookings are automatically transferred to a designated colleague.

---

## 6. Role-Based Access Control (RBAC) & Permissions Engine

A three-tier permissions engine combining pre-built System Roles with custom Role construction:

### System Default Roles
1. **Business Owner**: Full unrestricted access across all modules, branches, security settings, financial accounts, and BYOS configurations.
2. **Branch Manager**: Full operational access within assigned branch(es); cannot modify master BYOS credentials or tenant billing.
3. **Receptionist / Front Desk**: Access to Operations, Contacts creation, Queue Desk, and WhatsApp Chat; cannot view financial P&L or export customer lists.
4. **Practitioner / Doctor / Trainer**: Access to personal appointment calendar, patient/client clinical notes, and session logs; restricted from editing invoice prices or global growth settings.
5. **Cashier / Accountant**: Full access to Finance, Billing, Ledger, Receipts, and Tax Reports; cannot edit clinical SOPs or launch marketing campaigns.
6. **Marketing Manager**: Full access to Growth Module, GBP Management, WhatsApp Campaigns, and Analytics; read-only access to Finance.

### Permission Matrix (Sample View)

| Permission Scope | Owner | Manager | Receptionist | Practitioner | Cashier | Marketer |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Manage BYOS Credentials** | YES | NO | NO | NO | NO | NO |
| **Export Customer CSV** | YES | YES | NO | NO | NO | NO |
| **View Full Contact Phone** | YES | YES | MASKED | MASKED | YES | MASKED |
| **Create/Edit Appointments** | YES | YES | YES | SELF ONLY | NO | NO |
| **Issue Refunds / Discounts** | YES | APPROVAL | NO | NO | YES | NO |
| **Publish GBP Posts / Replies**| YES | YES | NO | NO | NO | YES |
| **Access AI Admin & Prompts** | YES | NO | NO | NO | NO | NO |

---

## 7. Authentication, MFA & Security Infrastructure

Enterprise security controls safeguarding business data and customer confidentiality:

* **Single Sign-On (SSO)**: Native integration with Google Identity Services (Google Workspace / Gmail accounts).
* **Multi-Factor Authentication (MFA)**: Mandatory TOTP (Google Authenticator / Authy) or SMS OTP for Business Owner and Manager roles.
* **Session Token Governance**: JWT access tokens signed with RSA-256 (15-minute expiry) and HTTP-only, Secure, SameSite=Strict Refresh Tokens stored in browser state.
* **IP Address Whitelisting**: Restrict Receptionist and Cashier logins strictly to the branch office static IP address.
* **Field-Level PII Masking**: Customer phone numbers and email addresses masked (e.g. `+91 98****3210`) for non-owner roles to prevent data theft.
* **Brute Force Protection**: Automatic account lock for 15 minutes after 5 failed login attempts.

---

## 8. BYOS (Bring Your Own Storage) Configuration & Health

The technical hub for managing customer-owned Google Workspace infrastructure:

```
[Vyapari Nestam SaaS] ──OAuth 2.0──> [Customer Google Workspace Account]
                                         ├─ Google Drive (File Assets & Invoices)
                                         ├─ Google Sheets (Database & Audit Logs)
                                         └─ Google Calendar (Staff Schedules)
```

### Configuration & Health Management
* **OAuth 2.0 Scope Management**: Requests exact scopes (`drive.file`, `spreadsheets`, `calendar`).
* **Automated Directory Bootstrapping**: 1-click button creating the standardized root structure:
  `Google Drive Root / Vyapari_Nestam_Root / {Invoices, Patient_Docs, Campaign_Assets, Database_Sheets}`.
* **Storage Quota Monitor**: Live progress bar showing used vs available space in Google Drive.
* **Connection Health Checker**: Automated background ping verifying refresh token validity every 6 hours. Displays `CONNECTED` (Green), `NEEDS_REAUTHORIZATION` (Amber), or `DISCONNECTED` (Red).
* **1-Click Repair & Re-Index**: Re-creates missing Google Sheet tabs or broken Drive folder references without data loss.

---

## 9. Meta WhatsApp Cloud API Configuration

Native integration management for WhatsApp Business communications:

* **API Credential Management**: Meta Phone Number ID, WhatsApp Business Account ID (WABA), and System User Permanent Token.
* **Webhook Endpoint Verifier**: Generates unique Webhook Verification Tokens and displays current status (`ACTIVE`, `DEGRADED`, `FAILED`).
* **Message Template Sync**: 1-click synchronization fetching approved Meta Cloud API message templates into Vyapari Nestam.
* **Quality Rating & Tier Monitor**: Live display of WhatsApp Phone Number Quality Rating (`GREEN / GOOD`, `YELLOW / AVERAGE`, `RED / POOR`) and current daily messaging tier (1K, 10K, 100K messages/day).
* **Fallback Routing Rules**: Automatically switch to SMS or Email if WhatsApp message delivery fails.

---

## 10. AI Platform Configuration

Master governance for AI models, token usage, and default agents across the OS:

* **API Key Management**: Client-provided `GEMINI_API_KEY` or `OPENAI_API_KEY` stored securely in encrypted secrets.
* **Default Model Selector**:
  * *Default Chat Model*: Gemini 1.5 Flash (Optimized for speed and cost).
  * *Reasoning / Reporting Model*: Gemini 1.5 Pro (For P&L, clinical notes, and growth analytics).
* **Token Budget & Cost Controls**: Set monthly USD/INR spending cap. Hard stop or warning alert upon reaching 80% and 100% of budget.
* **Global Safety Guardrails**: Toggle PII Redaction, Medical Advice Disclaimers, and Hallucination Fallback strictness.

---

## 11. Finance & Revenue Management Configuration

Master rules governing billing, tax compliance, and revenue accounting:

* **GST & Tax Rules**: Configure CGST, SGST, IGST rates per service category (e.g. 18% for Salon, 0% / Exempt for Healthcare consultations).
* **Invoice Numbering Sequence**: Customizable prefix and auto-increment format per branch (e.g., `HYD-INV-2026-0001`).
* **Payment Methods Enabled**: Toggle Cash, UPI QR Code, Razorpay / Stripe Payment Gateway, POS Card Machine, Cheque, Package Balance, Wallet Credits.
* **Discount Approval Caps**: Maximum allowed discount percentage for Receptionists (e.g., max 5%) vs Managers (max 20%). Discounts > cap require Owner PIN.
* **Round-Off Rules**: Automatic rounding of total invoice amount to nearest whole rupee (`ROUND_NEAREST`).

---

## 12. Operations & Scheduling Configuration

Master rules governing operational calendars, resource utilization, and walk-in queues:

* **Default Working Hours**: Set start and end times per day for the organization (e.g. 09:00 AM to 08:00 PM).
* **Slot Duration & Buffer**: Standard appointment slot (e.g., 30 mins) + automatic sterilization/cleaning buffer time (e.g., 10 mins).
* **Resource Matrix**: Register physical chairs, consultation rooms, ultrasound machines, and equipment assigned to appointments.
* **Overbooking & Double-Booking Policies**: Permit or strictly block overlapping appointments for practitioners.
* **No-Show Threshold**: Automatically flag customers as "No-Show Prone" after 2 consecutive missed appointments.

---

## 13. Communications Configuration

Global communication policies and automated messaging rules:

* **Business Hours Auto-Reply**: Automatic WhatsApp reply sent during off-hours with business opening times and online booking link.
* **Message Throttling**: Rate limit broadcast dispatches (max 50 messages/minute) to prevent Meta spam flags.
* **Default Language Preferences**: Set auto-translation target language (`Telugu`, `Hindi`, `English`) based on customer regional area code.
* **Human Handoff Escalation**: Auto-assign incoming customer chats to available Receptionists when AI confidence drops below 0.70.

---

## 14. Growth & Marketing Configuration

Master defaults for automated recall, loyalty rewards, and review collection:

* **Post-Service Review Delay**: Time elapsed after payment before sending Google Review link via WhatsApp (default: 2 hours).
* **Recall Intervals**: Global recall rules per service category (e.g., Dental Cleaning = 180 days; Haircut = 30 days).
* **Loyalty Points Ratio**: Define earn rate (e.g., ₹100 spent = 1 point) and redemption value (1 point = ₹1).
* **Google Business Profile Integration**: OAuth connection to Google Business Profile API with location selector.

---

## 15. Centralized Notification Center Configuration

System-wide rules governing alert delivery across channels:

```
EVENT TRIGGERED (e.g., Emergency Walk-In, System Error, Failed Payment)
   │
   ├── Priority: CRITICAL ──> [WhatsApp Alert + Push Notification + Sound Alarm]
   ├── Priority: HIGH     ──> [In-App Alert Rail + Email Summary]
   └── Priority: LOW      ──> [In-App Notification Badge Only]
```

* **Notification Matrix**: Matrix allowing Admins to toggle In-App, WhatsApp, Email, or Mobile Push notifications for each event category (Operational, Financial, Communication, Security, AI).
* **Escalation Rules**: If an unassigned walk-in is waiting > 15 minutes, escalate alert from Receptionist to Branch Manager.

---

## 16. Audit & Compliance Center

Complete security and operational audit trail recorded immutably in customer BYOS Google Sheets:

* **Audit Log Viewer**: Filterable log displaying `Timestamp`, `Actor ID`, `IP Address`, `Module`, `Action Type`, `Before State`, and `After State`.
* **Tracked Event Categories**:
  * *Security*: Logins, Password Changes, MFA Resets, Permission Changes, Account Suspensions.
  * *Financial*: Invoice Voiding, Manual Discount Overrides, Refunds, Ledger Manual Adjustments.
  * *Data Access*: Customer CSV Exports, Mass Delete Actions, Contact Merges.
  * *Configuration*: Changes to BYOS keys, Tax rates, or Working hours.
* **Export & Compliance**: 1-click export of audit logs to CSV or Google Drive PDF for regulatory compliance.

---

## 17. Workspace Health Dashboard

Real-time monitoring panel built on the **O-U-A-C Framework**:

```
+-----------------------------------------------------------------------------------+
|                            WORKSPACE HEALTH DASHBOARD                             |
| Health Score: 98/100 [SYSTEM EXCELLENT]                                           |
+-----------------------------------------------------------------------------------+
| SYSTEM COMPONENT        | STATUS      | LATENCY | QUOTA / HEALTH      | ACTION   |
+-------------------------+-------------+---------+---------------------+----------|
| Google Workspace Drive  | OPERATIONAL | 180ms   | 42% Used (12.6 GB)  | [Manage] |
| Google Sheets Database  | OPERATIONAL | 220ms   | Healthy (4/5MB Tab) | [Optimize]|
| Google Calendar API     | OPERATIONAL | 150ms   | Sync Active         | [Verify] |
| Meta WhatsApp Cloud API | OPERATIONAL | 310ms   | Green (Tier 10K)    | [Sync]   |
| Gemini AI API           | OPERATIONAL | 540ms   | 24% Token Budget    | [Top-Up] |
| Webhook Listener        | ACTIVE      | 45ms    | 100% Delivery Rate  | [Test]   |
+-----------------------------------------------------------------------------------+
```

---

## 18. Backup, Recovery & Disaster Management

Data resiliency strategies keeping client data 100% safe and recoverable:

* **Continuous BYOS Sync**: Live data saved directly to client Google Sheets and Drive.
* **1-Click Local Backup Export**: Downloads complete JSON/CSV snapshot of all business settings, contact indexes, and configuration state.
* **Disaster Recovery Restore**: Re-hydrates entire business tenant configuration onto a new Vyapari Nestam instance using the BYOS Google Drive backup folder.
* **Version Control for Configurations**: Rollback any accidental business setting change to a previous version saved in Google Sheets history.

---

## 19. Mobile Experience

* **Touch-Optimized Admin Console**: Responsive design tailored for mobile web browsers and PWA.
* **Quick Emergency Actions**: Sticky mobile action sheet for `Lock Workspace`, `Pause WhatsApp Auto-Replies`, and `Revoke User Session`.
* **Push Notifications**: Instant admin alerts for critical security events or system downtime.

---

## 20. Desktop Experience

* **Command Center Layout**: High-density multi-column management console with sidebar navigation.
* **Keyboard Shortcuts**:
  * `G + A`: Open Administration Module
  * `G + U`: Open User Management
  * `G + B`: Open BYOS Health Console
  * `Cmd/Ctrl + Shift + L`: Lock Active Admin Session

---

## 21. Role-Based Permissions Matrix for Administration

| Capability / Action | Owner | Branch Mgr | Tech Admin | Receptionist | Cashier |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Manage BYOS Credentials & Keys**| YES | NO | YES | NO | NO |
| **Invite & Deactivate Users** | YES | YES | YES | NO | NO |
| **Create Custom Roles & Permissions**| YES | NO | NO | NO | NO |
| **View Audit Logs** | YES | YES | YES | NO | NO |
| **Modify Tax & Invoice Numbers** | YES | NO | NO | NO | NO |
| **View Workspace Health Score** | YES | YES | YES | NO | NO |

---

## 22. Performance Targets

| System Action | Target Performance | Maximum Limit |
| :--- | :--- | :--- |
| **User Permission Evaluation Latency** | < 10 ms (In-Memory) | 50 ms |
| **BYOS OAuth Handshake Check** | < 300 ms | 1000 ms |
| **Workspace Health Status Load** | < 500 ms | 1500 ms |
| **User Session Revocation Execution** | Instant (<100ms) | 500 ms |
| **Configuration Change Save & Sync** | < 800 ms | 2000 ms |

---

## 23. Industry Configuration Engine

How the single Vyapari Nestam administration architecture adapts to various industries purely through configuration metadata:

| Industry | Terminology Mapping (`Customer`) | Primary Resource Managed | Critical Regulatory ID | Special Module Feature Enabled |
| :--- | :--- | :--- | :--- | :--- |
| **Dental Clinic** | Patient | Dental Chair / Operatory | Dental Council Registration ID | Tooth Charting & Clinical SOPs |
| **Medical Clinic** | Patient | Consultation Room | Medical Council Registration ID | Prescription Writing & Lab Recall |
| **Salon & Spa** | Client | Stylist Station / Therapy Room | Cosmetic License Number | Package Balance & Stylist Commission |
| **Gym & Fitness** | Member | Personal Trainer / Studio | Fitness Facility License | Member Check-In & Gate Integration |
| **Education** | Student | Classroom / Teacher | Educational Registration ID | Installment Invoicing & Term Recall |
| **Retail / Kirana** | Customer | POS Cash Register | FSSAI / Trade License | Barcode Scanning & Daily Cashbook |
| **Distributor** | Retailer / Dealer | Delivery Van / Warehouse | GSTIN / Wholesale License | Credit Limit Enforcement & Bulk Orders |
| **Real Estate** | Prospect / Client | Property Listing / Agent | RERA Registration Number | Site Visit Scheduling & Commission Ledger |

---

## 24. Business Operating System Integration

Workspace & Business Administration governs all underlying modules across the OS:

```
                       +-----------------------------------------------+
                       | WORKSPACE & BUSINESS ADMINISTRATION MODULE    |
                       | (Identity, RBAC, BYOS, API Keys, Governance)  |
                       +-----------------------+-----------------------+
                                               |
         +-------------------+-----------------+-------------------+-------------------+
         |                   |                 |                   |                   |
         ▼                   ▼                 ▼                   ▼                   ▼
+-----------------+ +-----------------+ +---------------+ +-----------------+ +-----------------+
| DASHBOARD       | | CONTACTS        | | OPERATIONS    | | COMMUNICATIONS  | | FINANCE, GROWTH |
| - Health Score  | | - PII Masking   | | - Hours & Slot| | - WhatsApp Keys | |   & AI ADMIN    |
| - Audit Alerts  | | - CSV Export    | |   Configuration | - Auto-Replies    | - GST & Models  |
+-----------------+ +-----------------+ +---------------+ +-----------------+ +-----------------+
```

---

## 25. Future Roadmap & Enterprise Expansion

Architectural hooks for enterprise scaling:

1. **Multi-Organization Franchise Management**: Master parent company dashboard controlling hundreds of independent franchisee tenants.
2. **Enterprise Single Sign-On (SSO)**: SAML 2.0 / Okta / Azure AD integration for enterprise corporate clients.
3. **SCIM User Provisioning**: Automated employee provisioning and deprovisioning via standard SCIM APIs.
4. **App Marketplace & Plugin SDK**: Allow 3rd-party developers to build pluggable widgets and custom integrations using Vyapari Nestam APIs.
5. **White-Label Branding**: Complete domain masking and custom branding for agency partners.

---

### Verification & Compliance
This specification completes the functional architecture of Vyapari Nestam Business OS. It provides an exhaustive, enterprise-grade, BYOS-first, and implementation-ready specification for engineering, security, and UI design teams.
