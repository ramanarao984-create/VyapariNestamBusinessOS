# Vyapari Nestam Business OS - Growth & Marketing Automation Module Experience Specification

**Document Version:** 1.0  
**Status:** Final & Implementation-Ready  
**Role Scope:** Principal Google Workspace Architect, GBP Specialist, Enterprise CRM Architect, AI Solution Architect, Growth Marketing Strategist, Local SEO & Customer Lifecycle Expert.

---

## 1. Module Purpose

The **Growth & Marketing Automation Module** is the revenue expansion and customer acquisition/retention engine of **Vyapari Nestam Business OS**. Built on top of a multi-tenant SaaS architecture with a **Bring Your Own Storage (BYOS)** foundation (Google Sheets, Google Drive, Google Calendar, Meta WhatsApp Cloud API, Google Business Profile API, and Gemini AI), this module transforms passive business recordkeeping into an active, automated growth machine.

### Alignment with the O-U-A-C Framework
1. **Observe**: Continuously monitors customer activity, Google Business Profile health, booking velocity, review sentiment, recall schedules, and revenue leakages.
2. **Understand**: Translates raw data (past visits, spending patterns, local search rankings, profile gaps) into actionable business intelligence using AI and rule-based scoring engines.
3. **Act**: Provides 1-click execution for AI-generated WhatsApp campaigns, Google Business Profile post creation, automated recall dispatches, and review request sequences.
4. **Confirm**: Logs all campaign actions, tracks customer conversions, measures revenue attribution, updates the Contact 360° timeline, and re-calculates local growth scores.

---

## 2. Business Goals

* **Accelerate Customer Acquisition**: Boost local search visibility and GBP conversions to convert local searchers into booked appointments.
* **Maximize Customer Lifetime Value (LTV)**: Automate personalized recall journeys across healthcare, wellness, fitness, and retail industries.
* **Eliminate Manual Campaign Effort**: Use Gemini AI as a 24/7 Marketing Copilot to draft copy, segment contacts, and schedule multi-channel outreach.
* **Supercharge Local Reputation**: Automate post-service review request workflows via WhatsApp, achieving a >35% review collection rate.
* **Zero Data Lock-In**: Store all campaign analytics, lead sources, review scores, and referral histories directly in client-owned Google Sheets and Drive.

---

## 3. Entry Points

* **Main Workspace Navigation**: Growth & Marketing tab on Primary Navigation.
* **Global Command Palette**: Search shortcuts (`/growth`, `/campaign`, `/gbp-health`, `/recall`).
* **Dashboard Growth Rail**: High-priority growth tasks and revenue leakage alerts on the primary dashboard.
* **Contact 360° Profile**: Direct quick actions (`Trigger Recall`, `Send Referral Code`, `Send Promotional Offer`).
* **Operations / Appointment Checkout**: Post-appointment checkout trigger (`Request Google Review`, `Enroll in Recall`).
* **Communications Desk**: In-line AI suggestion to convert a conversation into a lead or send a promo campaign.
* **Google Business Profile Health Notification**: Weekly/daily alert on GBP profile gaps or pending reviews.

---

## 4. Exit Points

* **Contacts Module (Contact 360°)**: Deep link to individual customer timeline showing campaign interactions and review logs.
* **Communications Module (WhatsApp Desk)**: Handoff to live chat when a customer replies to a broadcast or recall campaign.
* **Operations & Scheduling Module**: Direct booking creation when a customer clicks a booking link in a growth campaign.
* **Finance & Revenue Module**: Coupon code redemption, loyalty point adjustment, and package/membership renewals.
* **Google Business Profile Console / Deep Links**: 1-click navigation to GBP web management when API limits require native handling.
* **BYOS Drive & Sheets**: Exported campaign performance spreadsheets and creative assets stored in Google Drive.

---

## 5. Customer Lifecycle Automation

The lifecycle automation engine executes event-driven and schedule-driven workflows through ten mandatory stages:

```
Lead → Inquiry → Appointment → Treatment → Payment → Review Request → Recall → Membership Renewal → Referral → Reactivation
```

### Stage Transitions & Logic Table

| Stage | Trigger Event | Preconditions | Valid Transitions | Invalid Transitions | Recovery & Exception Logic |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Lead** | GBP Click, WhatsApp Message, Web Form, Walk-in Lead | Phone number captured; Opt-out = False | Inquiry, Appointment | Treatment, Payment, Review | Auto-send welcome intro + service menu via WhatsApp within 60s. |
| **2. Inquiry** | Customer asks for pricing, hours, or service details | Valid Lead status | Appointment, Lost Inquiry | Review Request, Recall | AI Copilot answers query; if silent >24h, trigger 1-click follow-up prompt. |
| **3. Appointment** | Booking created in Operations | Date/Time confirmed | Treatment, Cancelled, No-Show | Review Request, Payment | Send instant WhatsApp confirmation with Google Calendar invite + location link. |
| **4. Treatment/Service** | Appointment status set to `IN_PROGRESS` or `COMPLETED` | Service provided | Payment, Follow-up | Review Request (if unpaid) | Log service details in Contact 360°; flag required clinical/service recall window. |
| **5. Payment** | Invoice cleared in Finance Module | Valid completed service | Review Request, Recall | Lead, Inquiry | Upon receipt, wait 2 hours (configurable) before launching Review Request workflow. |
| **6. Review Request** | Payment complete + 2h delay elapsed | No active negative feedback score | Recall, Referral | Lead, Inquiry | Send WhatsApp message with direct GBP Review URL. If rating < 4, route to internal Feedback Form. |
| **7. Recall** | Pre-calculated elapsed days reached (e.g. 180 days for Dental) | No active future appointment | Appointment, Inactive | Review Request | Dispatch automated recall WhatsApp. If unread after 3 days, send SMS/AI voice follow-up. |
| **8. Membership Renewal** | Package/Membership expires in 15 days | Active membership holder | Active Member, Lapsed Member | Lead | Send tier renewal offer with bonus wallet credits or discount coupon. |
| **9. Referral** | Post-positive review (5 stars) OR 3rd completed visit | NPS >= 9 or 5-star reviewer | Referral Lead generated | Lead | Send personalized referral link & unique coupon code for customer + friend. |
| **10. Reactivation** | Inactive status (>180 days no visit) | Last visit > threshold | Lead, Active Customer | Review Request | Automated "We Miss You" campaign with 20% discount; if no open after 3 tries, archive contact. |

---

## 6. Smart Segmentation Engine

Vyapari Nestam includes a multi-dimensional segmentation engine powered by Google Sheets formulas and Gemini AI filtering:

1. **New Customers**: Created in last 30 days, <= 1 visit.
2. **Repeat Customers**: >= 2 visits, last visit within 90 days.
3. **VIP Customers**: Top 10% lifetime spend OR >5 visits with zero cancellations.
4. **High Lifetime Value (LTV)**: Cumulative spend > ₹25,000 (configurable per industry).
5. **Inactive Customers**: No visits in 120–360 days but previous history > ₹2,000.
6. **Recall Due**: Exact match on service recall due date (e.g., 6-month dental checkup, 30-day salon haircut).
7. **Package Holders**: Active treatment package balance > 0.
8. **Membership Holders**: Active recurring membership with expiry date within 30 days.
9. **Birthday & Anniversary**: Dynamic date-matching query (`TODAY() = BIRTHDAY`).
10. **High Spenders**: Average transaction value (ATV) > 2x industry benchmark.
11. **Referral Champions**: Generated >= 2 converted referral leads.
12. **Behaviour-Based Segments**:
    * *No-Show Prone*: >2 cancelled/no-show appointments.
    * *WhatsApp Engaged*: >80% message open & link click rate.
    * *Feedback Detractors*: Rated 1–3 stars on internal feedback.

---

## 7. Marketing Campaign Manager

Full lifecycle management for multi-channel promotional broadcasts and transactional campaigns.

### Supported Channels
* **WhatsApp Cloud API** (Primary): Native Meta Cloud API integration with utility, marketing, and authentication templates.
* **Gmail API** (Future-Ready): HTML email newsletters and detailed invoice/loyalty statements.
* **SMS**: DLT-compliant SMS backup for critical alerts or non-WhatsApp users.

### Campaign Types
1. **Seasonal & Festival Campaigns**: Diwali, New Year, Pongal/Sankranti, Eid regional promotional broadcasts.
2. **Promotional Offers**: Limited-time discounts, flash sales, off-peak slot filling.
3. **Service Launch**: New service or product announcements targeting relevant segments.
4. **Membership & Package Campaigns**: Upgrades, renewals, and package top-ups.
5. **Referral & Loyalty Campaigns**: Invite-a-friend bonuses and milestone reward unlocking.
6. **Review Collection Campaigns**: Targeted outreach to recent unreviewed high-satisfaction customers.
7. **Automated Recall Campaigns**: Daily background job evaluating recall triggers.

### Campaign Execution Architecture
* **Audience**: Selected from Smart Segmentation Engine.
* **Scheduling**: Immediate dispatch or scheduled date/time with rate-limiting (e.g. max 50 messages/min to respect Meta limits).
* **Approval Workflow**: Require Business Owner approval for campaigns costing > ₹500 or reaching >200 contacts.
* **Analytics & ROI Engine**: Real-time metric tracking recorded in Google Sheets:
  $$\text{Campaign ROI (\%)} = \left( \frac{\text{Attributed Revenue} - \text{Campaign Cost}}{\text{Campaign Cost}} \right) \times 100$$

---

## 8. Customer Recall Automation

Vertical-specific automated recall journeys operating on background cron triggers:

```
[Cron Job Daily at 08:00 AM] → [Read Sheets Recall Table] → [Filter Due Dates] → [Execute WhatsApp Recall Template]
```

* **Dental Clinics**:
  * *Scale & Polish Recall*: 6 months post-cleaning.
  * *Orthodontic Adjustment*: 30 days post-braces fitting.
* **Medical Clinics**:
  * *Diabetic / Thyroid Follow-Up*: 90-day lab review recall.
  * *Pediatric Vaccination*: Age-based immunization schedule alert.
* **Salons & Spas**:
  * *Haircut & Color Touch-up*: 30–45 days post-service.
  * *Facial / Skin Care*: 30 days post-treatment.
* **Gyms & Fitness**:
  * *Inactivity Alert*: 7 consecutive days of missed attendance.
  * *Membership Expiry*: 10 days prior to monthly/annual end date.
* **Education & Coaching**:
  * *Fee Installment Reminder*: 5 days before due date.
  * *Batch Renewal / Term Advance*: 15 days before term end.
* **Retail & Kirana**:
  * *Monthly Grocery Reorder*: 25 days post-basket purchase.
* **Distributors**:
  * *Stock Replenishment Call*: 14 days post-wholesale delivery.
* **Real Estate**:
  * *6-Month Lease Renewal / Investment Portfolio Review*.

---

## 9. Loyalty & Referral Engine

### Reward Structure & Rules
* **Reward Points**: Earn 1 Point per ₹100 spent. 1 Point = ₹1 wallet value.
* **Referral Tracking**: Each customer gets a unique referral code (`VYAPARI-{FIRSTNAME}-{RAND3}`) and deep link.
* **Double-Sided Incentive**:
  * *Referrer*: Receives ₹200 Wallet Credit when referred friend completes first visit.
  * *Referee (Friend)*: Receives 15% off first service invoice.
* **Membership Rewards**: Tiered multipliers (Bronze = 1x, Silver = 1.5x, Gold = 2x points).
* **Coupons & Vouchers**: Single-use or multi-use promo codes managed in Google Sheets with start/end dates and minimum basket limits.
* **Milestone Rewards**: Automatic bonus after 5th, 10th, and 20th visit.
* **Birthday & Anniversary Vouchers**: Auto-issued 3 days prior with 14-day validity.

---

## 10. AI Marketing Copilot (Powered by Gemini)

An AI assistant embedded directly in the Growth workspace:

* **Campaign Recommendations**: Scans Contact database and identifies revenue opportunities (e.g., *"You have 42 salon clients overdue for hair coloring. Launching a campaign today could yield ~₹28,000"*).
* **Audience Selection**: Natural language segmentation (e.g., *"Select all customers who spent >₹5,000 in the last 6 months but haven't visited in 60 days"*).
* **WhatsApp Copywriting**: Drafts highly converting, localized WhatsApp copy with variable tag insertion (`{{Name}}`, `{{LastService}}`, `{{BookingLink}}`).
* **Seasonal Campaign Suggestions**: Auto-generates festival campaigns matched to Indian cultural calendar dates.
* **Churn Prediction**: Flags customers showing reduced visit frequency or declining basket sizes before they churn.
* **Marketing Calendar Auto-Fill**: Populates a monthly promotional schedule in Google Calendar.

---

## 11. Google Business Profile Growth Intelligence

A dedicated subsystem applying the **O-U-A-C Framework** to dominate local Google search results.

```
+-------------------------------------------------------------------+
|               GOOGLE BUSINESS PROFILE GROWTH ENGINE               |
+-------------------+--------------------+--------------------------+
|  OBSERVE          |  UNDERSTAND        |  ACT                     |  CONFIRM
|  - GBP Score      |  - Identify Gaps   |  - 1-Click Photo Upload  |  - Re-calculate Score
|  - Profile Audit  |  - Priority Logic  |  - Generate FAQ / Post   |  - Audit Log in Sheets
|  - Search Analytics| - ROI Estimator   |  - Reply to Reviews      |  - Measure Call Growth
+-------------------+--------------------+--------------------------+
```

### 1. OBSERVE (GBP Health Dashboard)
Calculates a real-time **GBP Health Score (0–100%)** based on:
* Profile Completeness (Categories, Description, Attributes, Hours).
* Photo/Video freshness (Count of uploads in last 30 days).
* Review Volume & Velocity (New reviews received per week).
* Review Response Rate (% of total reviews answered).
* Google Posts Activity (Active posts in last 7 days).
* Q&A / FAQ Completeness.
* Primary & Secondary Category Precision.
* Local Search Metrics: Search Views, Map Views, Direct Calls, Direction Requests, Website Clicks.

### 2. UNDERSTAND (Diagnostic & Impact Engine)
Translates profile deficiencies into clear, prioritized business insights:

| Detected Gap | Business Impact | Priority | Estimated Improvement |
| :--- | :--- | :--- | :--- |
| **No photos added in >30 days** | Google algorithm favors active profiles. Visual trust drops by 30%. | HIGH | +15% Local Map Views |
| **8 Unanswered Reviews** | Unanswered reviews signal poor customer care and harm local rank. | CRITICAL | +10% Search Conversion |
| **Missing Primary Keywords in Description** | Local SEO misses ranking for high-intent searches (e.g. "Best dentist near me"). | MEDIUM | +20% Search Impressions |
| **No Active Google Post** | Missing promotional call-out in Google Search Knowledge Panel. | MEDIUM | +8% Website/Booking Clicks |
| **Missing Holiday Hours** | Risk of negative reviews if customer visits on closed holiday. | HIGH | Prevents Customer Churn |

### 3. ACT (Actionable Growth Rail)
Converts every diagnostic insight into an instant 1-click execution task:
* **Upload Photos**: Open optimized photo picker with AI auto-tagging.
* **Generate FAQ**: AI generates top 5 local customer questions & answers.
* **Generate Google Post**: AI drafts post text, adds CTA button (`Book Now`), and attaches image.
* **Respond to Reviews**: AI generates personalized, polite replies for positive and negative reviews.
* **Update Business Info**: 1-click sync of business hours, phone, and booking URL.

### 4. CONFIRM (Verification & Audit)
* Re-evaluates profile data via API or deep-link verification.
* Recalculates the GBP Health Score.
* Logs action timestamp, actor, and before/after state in BYOS Google Sheet (`GBP_Audit_Log`).
* Displays projected impact on Calls, Direction Requests, and Revenue.

---

## 12. Google Business Profile API Review & Capability Matrix

A technical assessment of official Google Business Profile APIs (v1) for developer integration:

| Feature / Action | API Support Status | API Scope / Method | Required User Scope | Technical Limitations & Fallback |
| :--- | :--- | :--- | :--- | :--- |
| **Read Profile Info & Ratings** | Fully Supported | `mybusinessbusinessinformation.googleapis.com` | `https://www.googleapis.com/auth/business.manage` | Direct REST/gRPC API. |
| **Read & Reply to Reviews** | Fully Supported | `mybusinessreviews.googleapis.com` | `https://www.googleapis.com/auth/business.manage` | Requires approved GBP API Project Access from Google. |
| **Create & Publish Google Posts** | Fully Supported | `mybusinessnotifications.googleapis.com` / Local Posts API | `https://www.googleapis.com/auth/business.manage` | Supports Text, Image, and Call-To-Action buttons. |
| **Upload Photos & Videos** | Fully Supported | Media API (`accounts.locations.media`) | `https://www.googleapis.com/auth/business.manage` | Max file size limits apply (10MB for photos). |
| **Update Business Hours & Info** | Fully Supported | Location API (`locations.patch`) | `https://www.googleapis.com/auth/business.manage` | Changes may undergo Google verification review. |
| **Read Search & Map Insights** | Fully Supported | Performance API (`locations.fetchMultiDailyMetricsTimeSeries`) | `https://www.googleapis.com/auth/business.manage` | Returns metrics for Impressions, Calls, Directions. |
| **Q&A / FAQ Management** | Supported | Q&A API (`locations.questions`) | `https://www.googleapis.com/auth/business.manage` | Full API support for listing & answering questions. |
| **Initial GBP Profile Creation** | Deep Link / Manual | N/A | N/A | New business verification requires Google video/phone flow. Deep link to `business.google.com/create`. |

---

## 13. Deep Link & Action Workflows

For actions requiring direct Google web interface interaction or fallback execution, Vyapari Nestam provides pre-formatted Deep Links:

```
[System Recommendation] → [API Available?] ──YES──> [Execute REST API Call] ──> [Confirm]
                                         └──NO───> [Construct Deep Link] ──> [Open GBP Console]
```

### Deep Link Mapping Table

| Task / Recommendation | Recommended Route | Fallback Deep Link URL Pattern |
| :--- | :--- | :--- |
| **Manage Reviews** | API First | `https://business.google.com/reviews?l={LocationID}` |
| **Upload Photos** | API First | `https://business.google.com/photos?l={LocationID}` |
| **Create Google Post** | API First | `https://business.google.com/posts?l={LocationID}` |
| **Edit Description & Info** | API First | `https://business.google.com/info?l={LocationID}` |
| **Update Hours & Holidays** | API First | `https://business.google.com/hours?l={LocationID}` |
| **Add Products / Services** | API First | `https://business.google.com/products?l={LocationID}` |
| **Set Appointment Link** | API First | `https://business.google.com/info/appointment-url?l={LocationID}` |
| **Verify Business Profile** | Deep Link Only | `https://business.google.com/verify?l={LocationID}` |

---

## 14. AI Growth Coach

A daily operational routine delivered to the Business Owner and Manager every morning at 08:30 AM via Dashboard & WhatsApp summary.

### Daily Growth Tasks Example Output

```
=====================================================
VYAPARI NESTAM AI GROWTH COACH - TODAY'S PLAN
Growth Score: 78/100 (+4 this week)
=====================================================

TASKS FOR TODAY:
1. [HIGH PRIORITY] Respond to 3 unreplied 5-star Google Reviews.
   -> Est. Impact: +5% local search visibility.
   -> [1-Click AI Reply]

2. [HIGH PRIORITY] Run WhatsApp Recall for 14 Dental Scaling patients due this week.
   -> Est. Revenue: ₹18,200 | Est. Appointments: 9
   -> [Launch Campaign]

3. [MEDIUM PRIORITY] Publish Google Post: "Monsoon Dental Care Special - 20% Off".
   -> Est. Clicks: 25 | [1-Click Publish]

4. [MEDIUM PRIORITY] Upload 5 new clinic hygiene photos to GBP.
   -> Est. Trust Boost: High | [Upload Photos]

PENDING TASKS: 2 | COMPLETED TODAY: 0
=====================================================
```

---

## 15. Review Management

* **Automated Review Requests**: Post-payment WhatsApp dispatch containing direct GBP review link.
* **AI Reply Generator**:
  * *Positive Reviews (4–5 Stars)*: Auto-generates warm, professional thank-you note incorporating business keywords.
  * *Negative Reviews (1–3 Stars)*: Auto-generates empathetic, non-defensive response offering private manager resolution via WhatsApp/Phone.
* **Negative Review Escalation**: Immediate alert to Business Owner dashboard & WhatsApp whenever a <=3 star review is received.
* **Sentiment Analysis**: Classifies incoming review text into sentiment categories: `Service Quality`, `Wait Time`, `Pricing`, `Staff Behaviour`, `Cleanliness`.

---

## 16. Analytics & ROI Framework

Tracking growth metrics with attribution stored in Google Sheets:

* **Campaign ROI**: $\text{Revenue Generated} / \text{Campaign Cost}$.
* **GBP Visibility Growth**: % increase in Google Search & Map impressions month-over-month.
* **Review Velocity**: Number of new reviews collected per 30 days.
* **Referral ROI**: Revenue generated from referred customers vs referral credits issued.
* **Customer Acquisition Cost (CAC)**: Total marketing spend / New customers acquired.
* **Customer Lifetime Value (LTV)**: Average Transaction Value $\times$ Purchase Frequency $\times$ Lifespan.
* **Lead Source Attribution**: Tracks revenue contribution by channel (`GBP`, `WhatsApp Referral`, `Walk-in`, `Social Media`).

---

## 17. Mobile Experience

* **Responsive Layout**: Designed for single-thumb execution on mobile web and PWA.
* **Quick Growth Actions**: Fixed bottom sheet for `Quick Recall`, `Post to GBP`, `Send Review Link`.
* **WhatsApp Integration**: Native `whatsapp://` URL protocol triggers for local message drafting.
* **Camera Integration**: Direct mobile camera upload to GBP Media library and Google Drive.
* **Offline Queue**: Actions queued locally in IndexedDB when offline and synced on re-connection.

---

## 18. Desktop Experience

* **Command Center Layout**: Multi-pane split screen with list view on left and AI Copilot / Analytics on right.
* **Keyboard Shortcuts**:
  * `G + C`: Open Campaign Builder
  * `G + P`: Open GBP Growth Dashboard
  * `G + R`: Open Review Management
  * `Cmd/Ctrl + K`: Global Command Palette
* **Drag-and-Drop Campaign Builder**: Visual audience and message composition.

---

## 19. Role-Based Permissions Matrix

| Action / Capability | Owner | Manager | Receptionist | Marketer | Practitioner |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **View Growth Dashboard** | YES | YES | YES | YES | READ-ONLY |
| **Launch WhatsApp Broadcast** | YES | YES | NO | YES | NO |
| **Manage GBP Posts & Photos** | YES | YES | NO | YES | NO |
| **Reply to Google Reviews** | YES | YES | YES | YES | NO |
| **Trigger Single Recall / Review Link** | YES | YES | YES | YES | YES |
| **Edit Coupon & Loyalty Settings** | YES | NO | NO | NO | NO |
| **Connect GBP / WhatsApp API Keys** | YES | NO | NO | NO | NO |

---

## 20. Accessibility (WCAG 2.1 AA Compliance)

* **Contrast Ratios**: Minimum 4.5:1 text-to-background contrast ratio.
* **Keyboard Navigation**: Full focus trap management and visible focus indicators across all widgets.
* **Screen Reader Support**: Complete `aria-label`, `aria-expanded`, and `aria-live` regions for real-time campaign updates.
* **Touch Targets**: Minimum 44px $\times$ 44px interactive touch surface area.

---

## 21. Performance Targets

* **Dashboard Load Time**: < 1.2 seconds.
* **AI Copilot Response Latency**: < 2.5 seconds (streaming completion).
* **WhatsApp Campaign Dispatch Throughput**: 50 messages/minute (rate-limited for API safety).
* **GBP Health Score Calculation**: < 500ms.
* **Offline Synchronization Latency**: < 2 seconds upon network restoration.

---

## 22. BYOS (Bring Your Own Storage) Integration Architecture

All Growth & Marketing data is stored transparently in client-owned Google Workspace infrastructure:

```
GOOGLE DRIVE (Client Account)
 └── Vyapari_Nestam_Root/
      ├── Growth_Marketing/
      │    ├── Campaigns/ (Campaign Asset Images & PDFs)
      │    ├── GBP_Photos/ (Uploaded Business Photos)
      │    └── QR_Codes/ (Generated Referral QR Codes)
      └── Database_Sheet (Google Sheets)
           ├── Tab: Growth_Campaigns
           ├── Tab: GBP_Audit_Log
           ├── Tab: Reviews_Log
           ├── Tab: Recalls_Schedule
           └── Tab: Loyalty_Ledger
```

### Google Sheets Schema Mapping

* **`Growth_Campaigns` Tab**: `CampaignID`, `Name`, `Channel`, `Segment`, `TargetCount`, `SentCount`, `DeliveredCount`, `ClickedCount`, `ConvertedCount`, `Cost`, `RevenueAttributed`, `Timestamp`.
* **`GBP_Audit_Log` Tab**: `AuditID`, `HealthScore`, `MissingPhotos`, `UnrepliedReviews`, `ActionTaken`, `Actor`, `Timestamp`.
* **`Reviews_Log` Tab**: `ReviewID`, `Author`, `Rating`, `Comment`, `Sentiment`, `ReplyStatus`, `ReplyText`, `Timestamp`.
* **`Recalls_Schedule` Tab**: `RecallID`, `ContactID`, `ContactName`, `ServiceType`, `DueDate`, `Status`, `LastContactedDate`.

---

## 23. Industry Adaptation Matrix

How the Growth & Marketing engine adapts dynamically without code changes:

| Industry | Primary Recall Driver | GBP Feature Highlight | Top Campaign Template | Loyalty Incentive |
| :--- | :--- | :--- | :--- | :--- |
| **Dental Clinic** | 6-Month Teeth Cleaning | Medical Services & Before/After Photos | Dental Hygiene Checkup Offer | Free Fluoride Treatment on 3rd Visit |
| **Medical Clinic** | 90-Day Lab Review | Doctor Specialties & Clinic Hours | Seasonal Flu / Health Package | Free Sugar Test Voucher |
| **Salon & Spa** | 30-Day Hair/Skin Touchup | Service Menu & Stylist Photos | Festive Beauty Pamper Package | 20% Off Hair Spa on Birthday |
| **Gym & Fitness** | 7-Day Inactivity Alert | Equipment Photos & Trainer Profiles | 3-Month Fitness Transformation Challenge | 1 Free Personal Training Session |
| **Education** | Term Fee / Re-enrollment | Course Catalog & Class Photos | Early Bird Admission Campaign | ₹500 Fee Credit per Student Referral |
| **Retail / Kirana** | 25-Day Grocery Re-order | Product Catalog & Local Offers | Monthly Super-Saver Grocery List | 100 Bonus Points on ₹2,000 Spend |
| **Distributor** | 14-Day Stock Re-order | Wholesale Catalog & Contact Info | Bulk Order Discount Broadcast | Tiered Cash Discount on Prompt Payment |
| **Real Estate** | 6-Month Property Review | Property Listings & Virtual Tours | Exclusive New Project Launch Alert | Gift Voucher on Lease Renewal |

---

## 24. Business Operating System Integration

The Growth module acts as the connective growth tissue across all Vyapari Nestam modules:

```
[Operations: Appointment Checkout] ──> Triggers ──> [Growth: Review & Recall Engine]
                                                           │
                                                           ▼
[Contacts 360° Timeline] <── Updates ── [Growth: Sent WhatsApp Broadcasts & Reviews]
                                                           │
                                                           ▼
[Finance & Revenue Module] <── Feeds ── [Growth: Discount Coupons & Loyalty Credits]
                                                           │
                                                           ▼
[Google Workspace BYOS] <── Syncs ── [Google Sheets, Drive, Calendar, GBP API]
```

* **Integration with Contacts (Contact 360°)**: Every review given, broadcast received, link clicked, and referral generated is logged on the universal contact timeline.
* **Integration with Operations**: Completed appointments automatically schedule recall dates and dispatch review links.
* **Integration with Finance**: Invoice payments issue loyalty points and validate promotional coupon codes.
* **Integration with Communications**: Inbound campaign replies are seamlessly handed off to the WhatsApp Conversation Desk for human chat.
* **Integration with Dashboard**: Live Growth Score, GBP Health, and Daily Growth Tasks are surfaced on the central operational command center.

---

### Verification & Compliance
This specification is fully compliant with the Vyapari Nestam Product Design Constitution, Enterprise IA, and Google Workspace BYOS architectural guidelines. It provides full coverage for engineering, UI design, and AI model integration.
