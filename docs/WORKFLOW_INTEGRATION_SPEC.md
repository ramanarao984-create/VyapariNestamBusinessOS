# Vyapari Nestam Business OS - Workflow Automation & Integration Hub Module Experience Specification

**Document Version:** 1.0  
**Status:** Final & Implementation-Ready  
**Role Scope:** Google's Chief Integration Architect, Enterprise Workflow Architect, Event-Driven Systems Architect, Google Workspace Architect, BPMN Expert, Automation Platform Architect, Staff Product Designer, and Enterprise SaaS Architect.

---

## 1. Executive Summary

The **Workflow Automation & Integration Hub Module** serves as the **central nervous system and orchestration engine** of **Vyapari Nestam Business OS**. While domain modules (Contacts, Operations, Communications, Finance, Growth, AI Administration, Workspace Administration) execute specialized business functions, this module coordinates, automates, and connects events across all internal modules, AI agents, and external Google Workspace & Meta services.

Built on a **Multi-tenant SaaS** architecture backed by client-owned **Bring Your Own Storage (BYOS)** (Google Sheets, Google Drive, Google Calendar, Meta WhatsApp Cloud API, and Gemini AI), this module enables non-technical business owners and staff to design, trigger, monitor, and recover cross-functional business workflows without writing code.

### Alignment with the O-U-A-C Framework
* **Observe**: Monitors system event streams (`CONTACT_CREATED`, `APPOINTMENT_COMPLETED`, `INVOICE_PAID`, `REVIEW_RECEIVED`), webhook payloads, scheduled chron triggers, and external API rate limits.
* **Understand**: Evaluates condition trees (`IF payment_amount > 5000 AND customer_tier == VIP`), AI confidence thresholds, approval state requirements, and retry policies.
* **Act**: Dispatches automated multi-channel actions (WhatsApp messages, Google Calendar slot locks, Drive folder creations, AI Agent invocations, Google Business Profile post updates).
* **Confirm**: Validates action execution status, logs complete workflow run histories in customer-owned Google Sheets (`Workflow_Execution_Logs`), updates the Contact 360° timeline, and triggers fallback/compensation logic upon failure.

---

## 2. Workflow Architecture

The module utilizes an asynchronous, event-driven microservices architecture:

```
+-----------------------------------------------------------------------------------+
|               WORKFLOW AUTOMATION & INTEGRATION HUB ARCHITECTURE                  |
+-----------------------------------------------------------------------------------+
| 1. EVENT BUS & INGESTION LAYER                                                    |
|    - Internal Module Events | Google Drive Webhooks | WhatsApp Webhooks           |
+-----------------------------------------------------------------------------------+
| 2. TRIGGER ENGINE & SCHEDULER                                                     |
|    - Event Matcher | Cron Scheduler | Webhook Listener | Business Rule Listener   |
+-----------------------------------------------------------------------------------+
| 3. CONDITION & RULES EVALUATION ENGINE                                            |
|    - Nested AND/OR Trees | Date/Time Rules | AI Confidence Evaluator              |
+-----------------------------------------------------------------------------------+
| 4. APPROVAL & HUMAN-IN-THE-LOOP ENGINE                                            |
|    - Manager Approval Modal | Timeout Escalations | Delegation Handler            |
+-----------------------------------------------------------------------------------+
| 5. AI AGENT & ACTION ORCHESTRATOR                                                 |
|    - Tool Calling Router | Gemini Agent Invoker | Multi-Module Action Dispatcher  |
+-----------------------------------------------------------------------------------+
| 6. RETRY, DEAD LETTER QUEUE (DLQ) & RECOVERY ENGINE                                |
|    - Exponential Backoff | Circuit Breaker | Compensation Actions | Fallback     |
+-----------------------------------------------------------------------------------+
| 7. BYOS PERSISTENCE & AUDIT LOGGING LAYER                                         |
|    - Google Sheets (Workflow Definitions & Logs) | Google Drive (Artifacts)       |
+-----------------------------------------------------------------------------------+
```

### Core Architecture Components
1. **Event Bus**: Central event broker routing real-time domain events to subscribed workflows.
2. **Workflow Engine**: State machine orchestrating node execution, variable scoping, and step state transitions.
3. **Rules Engine**: Fast condition evaluator for business rules and threshold checks.
4. **Scheduler**: Precision time-based queue engine managing delays, cron jobs, and holiday-aware schedules.
5. **Approval Engine**: Human-in-the-loop coordinator handling approval requests via Dashboard and WhatsApp.
6. **Retry Engine**: Fault-tolerant retry handler with exponential backoff and dead-letter queues.
7. **Audit Engine**: Immutable execution logger writing detailed run traces directly to customer BYOS Google Sheets.

---

## 3. Event Catalog

Standardized event taxonomy emitted by Vyapari Nestam Business OS modules:

| Event Identifier | Emitting Module | Trigger Condition | Standard Payload Key |
| :--- | :--- | :--- | :--- |
| `CONTACT_CREATED` | Contacts | New lead or walk-in registered | `contact_id`, `phone`, `name`, `source` |
| `CONTACT_UPDATED` | Contacts | Profile attributes or tier changed | `contact_id`, `updated_fields` |
| `BOOKING_REQUESTED` | Operations | Online or WhatsApp booking submitted | `booking_id`, `service_id`, `slot_iso` |
| `BOOKING_CONFIRMED` | Operations | Appointment locked on Calendar | `booking_id`, `practitioner_id`, `time` |
| `BOOKING_CANCELLED` | Operations | Appointment cancelled or no-show | `booking_id`, `reason`, `cancelled_by` |
| `SERVICE_COMPLETED` | Operations | Practitioner marks procedure done | `booking_id`, `contact_id`, `service_type` |
| `INVOICE_GENERATED` | Finance | Bill created at checkout | `invoice_id`, `amount`, `due_date` |
| `PAYMENT_RECEIVED` | Finance | Invoice paid via UPI/Cash/Card | `invoice_id`, `amount_paid`, `method` |
| `PAYMENT_OVERDUE` | Finance | Payment pending past due date | `invoice_id`, `contact_id`, `days_overdue` |
| `REVIEW_RECEIVED` | Growth / GBP | New Google or internal review posted | `review_id`, `rating`, `comment_text` |
| `RECALL_DUE` | Growth | Patient/Client due date reached | `recall_id`, `contact_id`, `service_type` |
| `WHATSAPP_MSG_RECEIVED`| Communications | Inbound customer message | `phone`, `message_text`, `media_url` |
| `AI_ACTION_REQUIRED` | AI Admin | AI confidence < 0.70 or write tool call | `agent_id`, `proposed_action`, `context` |

---

## 4. Trigger Types

Workflows can be initiated via ten distinct trigger modalities:

1. **Manual Trigger**: User launches a workflow from a button in Contact 360°, Invoice View, or Dashboard.
2. **Scheduled Cron Trigger**: Time-based triggers (e.g. *"Every morning at 08:30 AM"*, *"1st of every month"*).
3. **Webhook Trigger**: Inbound HTTP POST payload from external systems (e.g., website forms, Meta Ads).
4. **System Domain Event**: Reactive trigger responding to internal events (`PAYMENT_RECEIVED`, `BOOKING_CONFIRMED`).
5. **Google Calendar Event**: Triggered when a new event is added or modified in the practitioner's Google Calendar.
6. **Google Drive Event**: Triggered when a new file or patient document is added to a BYOS Drive folder.
7. **Google Sheets Row Change**: Triggered when a row is edited or added in a synchronized Google Sheet.
8. **WhatsApp Event**: Triggered by inbound customer WhatsApp messages or button clicks.
9. **AI Confidence Event**: Triggered when AI evaluates a query or requires human approval for an action.
10. **Business Rule Violation**: Triggered when inventory drops below threshold or invoice exceeds discount limits.

---

## 5. Condition Builder & Rules Engine

A visual, low-code expression evaluator supporting complex logic trees:

```
IF [ Event.amount > 5000 ] 
   AND [ Contact.loyalty_tier EQUALS "VIP" ]
   AND [ ( CurrentTime.hour >= 9 AND CurrentTime.hour <= 20 ) OR IsEmergency == TRUE ]
THEN -> Branch 1: Executive Workflow
ELSE -> Branch 2: Standard Workflow
```

### Supported Condition Operators
* **Comparison**: `EQUALS`, `NOT_EQUALS`, `GREATER_THAN`, `LESS_THAN`, `CONTAINS`, `STARTS_WITH`, `IS_EMPTY`.
* **Logical Combinators**: `AND`, `OR`, `NOT`, Nested Groupings.
* **Temporal Operators**: `IS_TODAY`, `IS_HOLIDAY`, `DAYS_BETWEEN(date1, date2) < 30`.
* **Role & Staff Rules**: `User.role EQUALS 'Owner'`, `Branch EQUALS 'Hyderabad'`.
* **AI Operators**: `AI_Confidence >= 0.85`, `Sentiment EQUALS 'POSITIVE'`.

---

## 6. Action Library

Pre-built operational steps that can be chained together:

### Internal Module Actions
* **Contacts**: `Create Contact`, `Update Tags`, `Increment Loyalty Points`, `Assign Staff`.
* **Operations**: `Create Booking`, `Lock Slot on Google Calendar`, `Mark No-Show`, `Reschedule`.
* **Finance**: `Generate Invoice PDF`, `Apply Coupon Code`, `Issue Wallet Credit`, `Send Payment Link`.
* **Communications**: `Send WhatsApp Message`, `Send WhatsApp Template`, `Escalate to Human Chat`.
* **Growth**: `Dispatch Review Request`, `Schedule Recall Alert`, `Post to Google Business Profile`.

### Workspace & Infrastructure Actions
* **Google Drive**: `Create Patient Folder`, `Upload Invoice PDF`, `Share Document Link`.
* **Google Sheets**: `Append Log Row`, `Update Cell Value`, `Lookup Customer Row`.
* **Google Calendar**: `Add Event`, `Delete Event`, `Check Slot Availability`.
* **External HTTP**: `Execute Webhook POST`, `Fetch REST API Payload`.

---

## 7. AI Workflow Actions

Injecting AI capabilities directly into automated workflows:

* **Invoke AI Agent**: Route workflow execution to a specified agent (e.g. *AI Receptionist*, *Sales Copilot*).
* **Generate AI Summary**: Summarize long customer interaction histories or clinical notes into a 3-bullet text block.
* **Classify Sentiment & Intent**: Analyze incoming WhatsApp messages to route urgent queries to the manager.
* **Extract Structured Data**: Parse unstructured voice notes or document images into JSON fields.
* **Auto-Translate**: Translate broadcast messages into the customer's native regional language (`Telugu`, `Hindi`).
* **Recommend Next Action**: Ask Gemini AI to analyze a churn-prone customer and select the optimal incentive.

---

## 8. Approval Workflows & Human-in-the-Loop

Governance mechanism preventing unauthorized execution of high-risk actions:

```
[Workflow Step: Request 25% Discount] → [Pause Execution] ──> [Send WhatsApp & Dashboard Approval Request to Manager]
                                                                     ├─ APPROVED ──> [Resume Workflow: Issue Discount]
                                                                     └─ REJECTED ──> [Resume Workflow: Send Standard Bill]
```

### Approval Features
* **Approval Triggers**: Manual discount overrides >10%, refunds > ₹1,000, bulk broadcast dispatches > 500 contacts, deletion of customer records.
* **Multi-Step & Parallel Approvals**: Require approval from both Branch Manager AND Financial Cashier.
* **Timeout & Escalation**: If manager does not respond within 15 minutes, automatically escalate approval to Business Owner via WhatsApp.

---

## 9. Scheduler & Time Intelligence

Precision time orchestration aware of regional working dynamics:

* **Cron Expressions**: Standard 5-field cron scheduling (e.g., `0 8 * * *` for daily at 8:00 AM).
* **Business Hours Enforcement**: Automatically delay customer-facing WhatsApp broadcasts until official opening hours (e.g., 09:00 AM).
* **Holiday Calendar Awareness**: Skip auto-reminders or recall messages on national/regional public holidays configured in Workspace Admin.
* **Time Zone Normalization**: All timestamps processed in tenant time zone (`Asia/Kolkata` default).

---

## 10. Integration Hub & Connected Services

Unified management for external API channels:

| Integration Service | Protocol / Method | Primary Capabilities | Auth Strategy |
| :--- | :--- | :--- | :--- |
| **Google Calendar** | Google REST API | Sync appointments, check slot collisions | OAuth 2.0 (`calendar`) |
| **Google Drive** | Google Drive API v3 | Store PDF bills, clinical files, photos | OAuth 2.0 (`drive.file`) |
| **Google Sheets** | Google Sheets API v4 | BYOS database read/write, audit logging | OAuth 2.0 (`spreadsheets`)|
| **Google Business Profile** | GBP API v1 | Publish posts, read reviews, reply | OAuth 2.0 (`business.manage`) |
| **Meta WhatsApp Cloud API** | Graph API REST | Direct WhatsApp template & chat dispatches | System User Permanent Token |
| **Custom Webhooks** | HTTP POST/GET | Inbound lead forms, external CRM sync | Secret Signing Key / API Key |

---

## 11. Visual Workflow Builder

An intuitive drag-and-drop canvas designed for business owners and non-coders:

```
+-----------------------------------------------------------------------------------+
|                        VISUAL WORKFLOW BUILDER CANVAS                             |
+-----------------------------------------------------------------------------------+
| [TRIGGER: Payment Received]                                                       |
|       │                                                                           |
|       ▼                                                                           |
| [CONDITION: Payment Amount > ₹2,000?]                                             |
|       ├── YES ──> [ACTION: Add 50 Loyalty Points] ──> [ACTION: Send VIP WhatsApp] |
|       └── NO  ──> [ACTION: Add 10 Loyalty Points] ──> [ACTION: Send Standard Rec. ]|
|                                                                                   |
| [TEST RUN]   [SIMULATE LOGIC]   [SAVE AS TEMPLATE]   [DEPLOY WORKFLOW]              |
+-----------------------------------------------------------------------------------+
```

### Canvas Capabilities
* **Drag-and-Drop Nodes**: Triggers, Conditions, Actions, AI Steps, Delays, and Approvals.
* **Live Node Variables**: Auto-complete dynamic variable tags (`{{Event.PaymentAmount}}`, `{{Contact.Name}}`).
* **Simulation Mode**: Run a test payload through the workflow canvas with step-by-step visual highlighting before deploying.
* **Versioning**: Draft, Published, and Historical versions with 1-click rollback.

---

## 12. Pre-Built Workflow Templates

Out-of-the-box automation templates ready for single-click activation:

1. **Appointment Confirmation & Calendar Sync**: Auto-send WhatsApp invite + location link upon booking.
2. **Post-Visit Google Review Collection**: Wait 2 hours after payment → Send direct GBP review URL via WhatsApp.
3. **Automated Patient/Client Recall**: 180 days post-procedure → Check for upcoming bookings → Dispatch recall offer.
4. **No-Show Recovery Sequence**: Appointment missed → Send empathetic WhatsApp message offering 1-click rescheduling.
5. **Overdue Payment Reminder**: Invoice 3 days overdue → Send polite WhatsApp reminder with UPI payment link.
6. **New Lead Welcome & Qualification**: Inbound WhatsApp inquiry → AI Receptionist qualifies service needed → Notifies front desk.
7. **Birthday & Anniversary Wish with Voucher**: On customer birthday → Auto-issue 15% discount coupon via WhatsApp.
8. **Referral Reward Dispatch**: Referred friend completes 1st visit → Auto-credit ₹200 to referrer's wallet.

---

## 13. Error Handling, Retries & Dead Letter Queue (DLQ)

Resilient execution safeguards ensuring zero lost transactions:

* **Exponential Backoff Retries**: If WhatsApp or Google API fails (5xx network error), retry automatically after 1 min, 5 mins, 15 mins, and 1 hour.
* **Compensation Actions**: If a booking slot locking fails after invoice generation, automatically void invoice draft and notify staff.
* **Dead Letter Queue (DLQ)**: Failed workflows exceeding max retries are moved to DLQ. Surfaced on Dashboard with 1-click "Retry Failed Run" button.
* **Failure Alerts**: Immediate WhatsApp alert to Admin when a critical workflow fails.

---

## 14. Monitoring & Observability Dashboard

Real-time telemetry tracking operational health:

* **Active Executions**: Live count of running, completed, and failed workflow runs.
* **Success Rate Gauge**: Percentage of successful executions over last 24h/7 days (Target: >99.5%).
* **Average Execution Duration**: Time taken per workflow run (Target: <800ms for non-delayed runs).
* **AI Token & API Cost Tracker**: Cost breakdown per automated workflow.

---

## 15. Audit & Compliance

Complete execution traceability recorded in customer-owned Google Workspace:

* **Execution History Tab**: Logs `RunID`, `WorkflowID`, `TriggerEvent`, `Actor`, `Status`, `ExecutionTimeMs`, `Timestamp`.
* **Payload Inspection**: View exact JSON input and output payloads for every node in a workflow run.
* **Immutable BYOS Sheet**: All audit records appended directly to Google Sheet `Workflow_Execution_Logs`.

---

## 16. Mobile Experience

* **Touch Canvas & Task Center**: Visual execution status cards optimized for mobile web browsers and PWA.
* **1-Tap Approval Sheet**: Mobile bottom sheet allowing managers to approve/reject discount and workflow requests on the go.
* **Push Notifications**: Instant alerts when a workflow requires human intervention or encounters a DLQ failure.

---

## 17. Desktop Experience

* **Full Studio Canvas**: High-density workspace with sidebar palette, canvas grid, and variable inspector.
* **Keyboard Shortcuts**:
  * `G + W`: Open Visual Workflow Builder
  * `Cmd/Ctrl + S`: Save Workflow Draft
  * `Cmd/Ctrl + R`: Run Test Simulation

---

## 18. Accessibility (WCAG 2.1 AA Compliance)

* **Screen Reader Accessibility**: Keyboard focusable canvas nodes with `aria-label` describing node type and connections.
* **High Contrast Elements**: High-contrast node borders (4.5:1 ratio) distinguishing Triggers (Blue), Conditions (Amber), and Actions (Green).
* **Keyboard-Only Canvas Navigation**: Arrow keys navigate node graph; `Enter` opens node configuration panel.

---

## 19. Performance Targets

| Operational Metric | Target Performance | Maximum Allowed Limit |
| :--- | :--- | :--- |
| **Event Ingestion to Trigger Evaluation** | < 100 ms | 300 ms |
| **Synchronous Node Execution Latency** | < 200 ms | 500 ms |
| **Canvas Test Simulation Run** | < 500 ms | 1500 ms |
| **Workflow Run History Logging** | < 300 ms (Async) | 1000 ms |
| **Dead Letter Queue Recovery Execution**| < 1.0 second | 3.0 seconds |

---

## 20. BYOS (Bring Your Own Storage) Integration Architecture

All workflow definitions, state logs, templates, and execution histories reside inside customer-owned Google Workspace infrastructure:

```
GOOGLE DRIVE (Client Account)
 └── Vyapari_Nestam_Root/
      ├── Workflow_Definitions/ (JSON Workflow Schemas)
      └── Database_Sheet (Google Sheets)
           ├── Tab: Workflow_Registry
           ├── Tab: Workflow_Execution_Logs
           └── Tab: Dead_Letter_Queue
```

---

## 21. Industry Adaptation Matrix

How the Workflow Engine adapts across industries purely through configuration:

| Industry | Top Automated Workflow | Primary Event Trigger | Key Action Dispatched |
| :--- | :--- | :--- | :--- |
| **Dental Clinic** | Post-Op Scaling Recall Journey | `SERVICE_COMPLETED (Scaling)` | Schedule 180-Day Recall WhatsApp + Review Link |
| **Medical Clinic** | Lab Test Follow-up & Doctor Review | `LAB_REPORT_ADDED (Drive)` | Notify Doctor + Send WhatsApp Alert to Patient |
| **Salon & Spa** | Stylist Slot Fill & Hair Color Recall | `RECALL_DUE (Hair Color)` | Send 20% Off Tuesday Slot Offer |
| **Gym & Fitness** | 7-Day Inactivity Attendance Recovery | `MEMBER_INACTIVE_7_DAYS` | Send Motivational WhatsApp + Trainer Check-in |
| **Education** | Fee Installment Overdue Alert | `INVOICE_OVERDUE (Fee)` | Dispatch Parent WhatsApp Notification + UPI Link |
| **Retail / Kirana** | Monthly Grocery Basket Re-order | `RECALL_DUE (25 Days)` | Send Auto-Filled Re-order Cart Link |
| **Distributor** | Credit Limit Warning & Order Hold | `ORDER_CREATED` | Check Credit Limit -> Send Manager Approval |
| **Real Estate** | Site Visit Follow-up & Brochure Send | `SITE_VISIT_COMPLETED` | Auto-send Project Brochure PDF via WhatsApp |

---

## 22. Business Operating System Integration

Workflow Automation acts as the connective orchestration tissue across all modules:

```
                       +-----------------------------------------------+
                       | WORKFLOW AUTOMATION & INTEGRATION HUB MODULE   |
                       | (Event Bus, Rules Engine, Scheduler, Actions)  |
                       +-----------------------+-----------------------+
                                               |
         +-------------------+-----------------+-------------------+-------------------+
         |                   |                 |                   |                   |
         ▼                   ▼                 ▼                   ▼                   ▼
+-----------------+ +-----------------+ +---------------+ +-----------------+ +-----------------+
| DASHBOARD       | | CONTACTS        | | OPERATIONS    | | COMMUNICATIONS  | | FINANCE, GROWTH |
| - DLQ Metrics   | | - Contact 360°  | | - Calendar    | | - WhatsApp      | |   & AI ADMIN    |
| - Execution Logs| |   Timeline Log  | |   Auto-Lock   | |   Auto-Dispatch | - Review & Bills|
+-----------------+ +-----------------+ +---------------+ +-----------------+ +-----------------+
```

---

## 23. Future Roadmap & Extension Points

Extension points for enterprise workflow scaling:

1. **Marketplace Automation Exchange**: Pre-built community workflows importable with 1 click.
2. **Custom JavaScript / Python Code Steps**: Low-code sandbox for custom data manipulation steps.
3. **Webhook Marketplace**: Turnkey triggers for Shopify, WooCommerce, Instamojo, and Razorpay.
4. **Kafka / Event Streaming Integration**: Enterprise event bus connectors for high-volume enterprise franchises.

---

### Verification & Compliance
This specification completes the functional and architectural specification suite for **Vyapari Nestam Business OS**. It provides an exhaustive, production-ready, BYOS-first blueprint for engineering, backend development, AI integration, and UI design.
