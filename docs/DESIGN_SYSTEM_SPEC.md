# Vyapari Nestam Business OS - Design System & Experience Foundation Specification

**Document Version:** 1.0  
**Status:** Final & Implementation-Ready Contract  
**Role Scope:** Google's Chief Design Officer, Material Design Architect, UX Systems Architect, Enterprise Design System Lead, Accessibility Expert, Frontend Platform Architect, Product Designer, and Staff UX Engineer.

---

## 1. Design Philosophy

The **Vyapari Nestam Design System (VNDS)** is built on the philosophy of **"Invisible Complexity, Uncompromising Clarity."** 

Vyapari Nestam Business OS handles sophisticated multi-tenant SaaS workflows, BYOS Google Workspace data synchronizations, AI RAG grounded intelligence, multi-channel WhatsApp automation, and complex financial ledgers. However, the end-user (small business owners, receptionist staff, doctors, stylists, cashiers) demands an interface that feels as effortless, fast, and intuitive as a consumer app.

### Core Visual Philosophy
* **Sophisticated Light Theme First**: A crisp, high-contrast, warm-neutral foundation that minimizes eye strain, maximizes legibility, and radiates professional trust.
* **Mathematical Precision**: Strict 8px rhythmic spatial grids, 1.125 Major Second typographic scaling, and calculated nested border radii.
* **Anti-Slop Imperative**: Zero unnecessary gradients, zero glassmorphism glare, zero arbitrary drop shadows, zero generic 3-column marketing blocks. Every border, margin, and color swatch exists for functional clarity.

---

## 2. UX Principles

1. **Observe → Understand → Act → Confirm (O-U-A-C)**: Every workflow visually exposes status monitoring (Observe), contextual insights (Understand), instant 1-click execution controls (Act), and explicit state validation (Confirm).
2. **Instant Operational Feedback**: All user actions use optimistic UI updates, immediate micro-animations (<150ms), and unambiguous progress indicators.
3. **Transparent & Human-Governed AI**: AI-generated content is clearly attributed, displays grounding confidence scores, provides direct source citations, and requires explicit human approval for high-risk write operations.
4. **Desktop-First Precision, Touch-First Ergonomics**: Optimized for high-density multi-pane desktop workstations while ensuring 44px+ touch targets and single-thumb bottom sheets on mobile devices.
5. **BYOS Sovereignty Visibility**: Clear visual indicators showing when records are synced with client-owned Google Drive, Google Sheets, or Google Calendar.

---

## 3. Information Hierarchy

To prevent cognitive overload across dense enterprise modules, Vyapari Nestam enforces a strict 4-level information hierarchy:

1. **Level 1: System Command & Navigation Bar (Fixed Top/Left)**: Workspace selector, active branch indicator, global command palette (`Cmd/Ctrl + K`), notification bell, and high-level module tabs.
2. **Level 2: Module Operational Rail & Summary Cards**: Primary module KPIs, filtering controls, views switcher (List / Grid / Calendar / Kanban), and primary CTA (`+ New Contact`, `+ Book Slot`).
3. **Level 3: Primary Workspace Canvas**: Split view or main data container displaying interactive data tables, workflow builders, communications desks, or analytics dashboards.
4. **Level 4: Contextual Inspector / Bottom Sheet**: Slide-over drawer or bottom sheet for detailed record view (Contact 360°, Invoice Inspector, AI Prompt Config) without losing workspace context.

---

## 4. Layout Grid System

Vyapari Nestam utilizes a responsive, fluid 12-column grid system built on a flexible CSS Grid and Flexbox foundation:

| Screen Breakpoint | Range (px) | Grid Columns | Margin (px) | Gutter (px) | Primary Layout Pattern |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Mobile (sm)** | 320 – 639 | 4 | 16 | 12 | Single-column stacked, fixed bottom bar |
| **Tablet (md)** | 640 – 1023 | 8 | 24 | 16 | Collapsible sidebar, 2-column cards |
| **Desktop (lg)** | 1024 – 1439 | 12 | 32 | 20 | Fixed sidebar, multi-pane split workspace |
| **Ultra-Wide (xl/2xl)**| 1440+ | 12 | 40 (Max 1600px)| 24 | Expanded bento grid, dual-pane inspector |

---

## 5. Typography Scale

The typographic hierarchy pairs **Plus Jakarta Sans** (clean, modern geometric body and UI font) with **Playfair Display** (high-contrast display font for executive metrics and major headers).

* **Scale Ratio**: 1.125 (Major Second) for dense UI components; 1.250 (Major Third) for display metrics.

```css
/* Design Tokens: Typography Scale */
--font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
--font-serif: 'Playfair Display', Georgia, serif;

--text-xs: 0.75rem;    /* 12px / Line Height: 1.33 / Captions, Badges */
--text-sm: 0.875rem;   /* 14px / Line Height: 1.43 / Table Data, Form Labels */
--text-base: 1.000rem;  /* 16px / Line Height: 1.50 / Body, Inputs, Buttons */
--text-lg: 1.125rem;   /* 18px / Line Height: 1.44 / Subheadings, Card Titles */
--text-xl: 1.250rem;   /* 20px / Line Height: 1.40 / Section Headers */
--text-2xl: 1.500rem;  /* 24px / Line Height: 1.33 / Module Titles */
--text-3xl: 1.875rem;  /* 30px / Line Height: 1.20 / Modal Titles */
--text-4xl: 2.250rem;  /* 36px / Line Height: 1.15 / Metric Scorecards */
```

---

## 6. Color System

A sophisticated warm-neutral palette with high-contrast functional accents compliant with WCAG 2.2 AA (minimum 4.5:1 ratio for text).

```css
/* Color Tokens (Tailwind CSS Mapping) */
:root {
  /* Neutral Canvas & Surfaces */
  --color-bg-app: #FAFAF9;        /* Stone 50 - Off-white main background */
  --color-bg-surface: #FFFFFF;    /* Pure White - Card & Container background */
  --color-bg-muted: #F5F5F4;      /* Stone 100 - Hover & Muted background */
  --color-border: #E7E5E4;        /* Stone 200 - Clean 1px hairline borders */
  --color-border-strong: #D6D3D1; /* Stone 300 - Input & Focus borders */

  /* Text Colors */
  --color-text-primary: #1C1917;  /* Stone 900 - High-contrast body text */
  --color-text-secondary: #57534E;/* Stone 600 - Labels, Subtitles, Metadata */
  --color-text-muted: #A8A29E;    /* Stone 400 - Placeholders, Disabled text */

  /* Brand & Primary Accents */
  --color-primary: #0F172A;       /* Slate 900 - Deep executive brand anchor */
  --color-primary-hover: #1E293B; /* Slate 800 */
  --color-accent: #0284C7;        /* Sky 600 - Action links & active tabs */

  /* Functional Status Colors */
  --color-success: #15803D;       /* Green 700 - Completed, Paid, Approved */
  --color-success-bg: #F0FDF4;    /* Green 50 */
  --color-warning: #B45309;       /* Amber 700 - Pending, Overdue, Recall Due */
  --color-warning-bg: #FFFBEB;    /* Amber 50 */
  --color-danger: #B91C1C;        /* Red 700 - Cancelled, Error, Failed */
  --color-danger-bg: #FEF2F2;     /* Red 50 */
  --color-info: #1D4ED8;          /* Blue 700 - AI Suggested, Information */
  --color-info-bg: #EFF6FF;       /* Blue 50 */
}
```

---

## 7. Elevation & Shadows

Vyapari Nestam avoids muddy, blurry drop shadows in favor of crisp hairline borders combined with subtle, optical depth cues:

* **Level 0 (Flat Surface)**: `border border-stone-200 bg-white` (Standard data tables, list cards).
* **Level 1 (Card Hover / Raised)**: `shadow-xs border border-stone-200` (`box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05)`).
* **Level 2 (Dropdowns, Popovers, Command Palette)**: `shadow-md border border-stone-200` (`box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08)`).
* **Level 3 (Modals, Drawers, Floating Action Sheets)**: `shadow-xl border border-stone-300` (`box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.12)`).

---

## 8. Iconography

All icons are sourced exclusively from `lucide-react` to maintain stroke width consistency (1.75px default), optical balance, and sizing uniformity:

* **Micro Icons (Badges, Status Chips)**: 14px $\times$ 14px (`size={14}`).
* **Standard Controls (Buttons, Inputs, Table Actions)**: 16px $\times$ 16px (`size={16}`).
* **Section Headers & Nav Icons**: 20px $\times$ 20px (`size={20}`).
* **Empty State Hero Illustrations**: 40px $\times$ 40px (`size={40}`).

---

## 9. Spacing System

Based on a strict 8px spatial grid (with 4px sub-grid for tight control padding):

```css
--space-1: 0.25rem;  /* 4px  - Micro gap, badge padding */
--space-2: 0.50rem;  /* 8px  - Button vertical padding, tight gaps */
--space-3: 0.75rem;  /* 12px - Input padding, card internal gap */
--space-4: 1.00rem;  /* 16px - Standard container inner padding */
--space-6: 1.50rem;  /* 24px - Section padding, card gaps */
--space-8: 2.00rem;  /* 32px - Module container padding */
--space-12: 3.00rem; /* 48px - Modal outer padding, hero sections */
```

### Nested Radius Rule
$$\text{Inner Border Radius} = \text{Outer Border Radius} - \text{Padding}$$
*Example: Outer Card Radius = 12px; Padding = 16px $\rightarrow$ Inner Element Radius = 4px or pill.*

---

## 10. Core Component Library Specifications

### 1. Buttons
* **Primary Button**: `bg-slate-900 text-white hover:bg-slate-800 rounded-lg px-4 py-2 text-sm font-medium transition-all active:scale-98 focus:ring-2 focus:ring-slate-900 focus:ring-offset-2`.
* **Secondary Button**: `bg-white text-stone-800 border border-stone-300 hover:bg-stone-50 rounded-lg px-4 py-2 text-sm font-medium`.
* **Ghost / Icon Button**: `text-stone-600 hover:bg-stone-100 hover:text-stone-900 rounded-lg p-2 transition-colors`.
* **AI Action Button**: `bg-gradient-to-r from-sky-600 to-blue-600 text-white hover:from-sky-700 hover:to-blue-700 shadow-xs rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2`.

### 2. Form Inputs & Selects
* **Input Field**: `w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 disabled:bg-stone-100 disabled:cursor-not-allowed`.
* **Validation States**: Error adds `border-red-500 focus:ring-red-500` and displays error caption with `AlertCircle` icon below.

### 3. Data Tables
* **Header**: `bg-stone-50 text-stone-600 text-xs font-semibold uppercase tracking-wider px-4 py-3 border-b border-stone-200 text-left`.
* **Rows**: `hover:bg-stone-50/80 border-b border-stone-200 transition-colors text-sm text-stone-800 h-12 px-4`.
* **Pagination Footer**: Sticky bottom container with total record count, page size selector, and previous/next page navigation.

### 4. Command Palette (`Cmd/Ctrl + K`)
* **Overlay**: Centered modal overlay (`bg-stone-900/40 backdrop-blur-xs z-50`).
* **Input Box**: Prominent search bar with instant autocomplete results categorized into *Actions*, *Modules*, *Recent Contacts*, and *AI Shortcuts*.

### 5. AI Response Cards & Citations
* **Visual Frame**: Light blue subtle accent tint (`bg-blue-50/40 border border-blue-200 rounded-xl p-4`).
* **Header**: Displays AI Agent Badge, model tag (e.g. `Gemini 1.5 Flash`), and grounding confidence pill.
* **Grounding Citations**: Clickable source chips (`[Doc: Root Canal Care SOP #2]`) opening original BYOS Drive file.

### 6. Workflow Canvas Nodes
* **Trigger Node**: Blue header bar (`border-l-4 border-blue-600 bg-white shadow-xs rounded-lg p-3`).
* **Condition Node**: Amber header bar (`border-l-4 border-amber-500 bg-white shadow-xs rounded-lg p-3`).
* **Action Node**: Green header bar (`border-l-4 border-green-600 bg-white shadow-xs rounded-lg p-3`).

---

## 11. AI Experience Principles & Interaction Patterns

1. **Clear Attribution**: Every AI-generated draft or automated decision is styled with a distinct AI sparkle icon (`Sparkles` from `lucide-react`) and blue tint border.
2. **Confidence Visualization**:
   * **High Confidence (>=85%)**: Green indicator pill (`Grounded 94%`). Auto-executed or 1-click confirmed.
   * **Medium Confidence (60–84%)**: Amber indicator pill (`Review Suggested 72%`). Displays pre-filled draft for staff review.
   * **Low Confidence (<60%)**: Red indicator pill (`Low Grounding 45%`). Triggers automated fallback and human handoff.
3. **Editable Drafts**: All AI-drafted messages (WhatsApp copy, email campaign, review reply) are rendered in active text areas allowing staff to edit prior to dispatch.
4. **Human-in-the-Loop Approval**: Financial discounts, refunds, or mass broadcasts display an explicit `Approve Action` / `Reject Action` modal bar.

---

## 12. Forms & Data Entry UX

* **Validation Contract**: Inline validation fires on blur (`onBlur`). Submit buttons remain active, but trigger focus trap to first invalid field if clicked prematurely.
* **Autosave Engine**: Form drafts (e.g., long clinical notes, campaign setups) automatically persist to IndexedDB / local state every 3 seconds, displaying a subtle `"Draft Saved"` indicator.
* **Keyboard Flow**: Logical `tabIndex` order across all controls; pressing `Enter` in single-line inputs advances focus or submits form; `Esc` closes modals/drawers.

---

## 13. Responsive Design & Touch Adaptation

* **Mobile Viewport (320px – 639px)**:
  * Primary navigation collapses into a bottom navigation bar (`Home`, `Queue`, `Chat`, `Menu`).
  * Complex multi-column data tables automatically transform into mobile stacked cards.
  * Modals convert into single-thumb mobile bottom sheets with pull handles.
* **Tablet Viewport (640px – 1023px)**:
  * Sidebar collapses to icon-only mode with active tooltips.
  * Split views default to stacked tabs with horizontal swipe gestures.

---

## 14. Motion & Animation System

Powered by `motion` (`motion/react`) with strict performance and accessibility guidelines:

* **Micro-Interactions (Button clicks, toggles)**: `duration: 0.15s, ease: "easeOut"`.
* **Page & Tab Transitions**: Subtle opacity fade + 4px slide-up (`initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}`).
* **Drawer & Modal Transitions**: Smooth slide-in overlay (`transition={{ type: "spring", damping: 25, stiffness: 300 }}`).
* **AI Streaming Response Animation**: Smooth character reveal with subtle pulse indicator on active cursor.
* **Reduced Motion Override**: Respects `prefers-reduced-motion: reduce` by disabling physical translation animations and falling back to instant opacity toggles.

---

## 15. Accessibility (WCAG 2.2 AA Compliance)

* **Contrast Ratios**: Body text (4.5:1 minimum), large headings (3:1 minimum), interactive element borders (3:1 minimum).
* **Focus Indicators**: All focusable controls display a prominent 2px focus ring (`ring-2 ring-slate-900 ring-offset-2`).
* **Screen Reader Announcers**: Dynamic state updates (e.g. AI stream completion, Toast alerts, Table filter counts) utilize `aria-live="polite"` regions.
* **Touch Surfaces**: Minimum interactive target area of 44px $\times$ 44px on touch viewports.

---

## 16. Performance UX & Offline Resilience

* **Optimistic UI Updates**: User actions (e.g. marking queue status `IN_SERVICE`, toggling invoice paid) immediately reflect in UI state before server confirmation.
* **Skeleton Loaders**: Content layout skeletons match exact component geometry to prevent Cumulative Layout Shift (CLS < 0.05).
* **Offline Banner**: Sticky subtle amber bar (`"Offline Mode - Actions queued locally"`) displayed when network drops; automatically syncs queued actions on reconnection.

---

## 17. Component Behavioral Contracts

Every reusable component in the codebase (`/src/components/*`) must implement this strict TypeScript contract:

```ts
export interface BaseComponentProps {
  id: string;                      // Required unique DOM identifier
  className?: string;              // Tailwind utility overrides
  isDisabled?: boolean;            // Disabled interaction state
  isLoading?: boolean;             // Loading skeleton / spinner state
  'aria-label'?: string;           // Accessible screen reader label
  'data-testid'?: string;          // Automated QA test selector
}
```

---

## 18. Design Tokens Reference Sheet

```json
{
  "typography": {
    "fontFamily": {
      "sans": "Plus Jakarta Sans, sans-serif",
      "serif": "Playfair Display, serif"
    },
    "fontSize": {
      "xs": "12px", "sm": "14px", "base": "16px",
      "lg": "18px", "xl": "20px", "2xl": "24px", "3xl": "30px", "4xl": "36px"
    }
  },
  "spacing": {
    "1": "4px", "2": "8px", "3": "12px", "4": "16px",
    "6": "24px", "8": "32px", "12": "48px"
  },
  "borderRadius": {
    "sm": "4px", "md": "6px", "lg": "8px", "xl": "12px", "full": "9999px"
  },
  "breakpoints": {
    "sm": "640px", "md": "768px", "lg": "1024px", "xl": "1280px", "2xl": "1536px"
  }
}
```

---

## 19. Industry Adaptation Engine (Presentation Layer)

How presentation labels and domain icons adapt across verticals without code modifications:

| Industry | Primary Domain Label (`Customer`) | Primary Resource Label (`Staff`) | Primary Action Button | Domain Accent Icon |
| :--- | :--- | :--- | :--- | :--- |
| **Dental Clinic** | Patient | Dentist / Hygienist | `+ Book Dental Slot` | `Stethoscope` |
| **Medical Clinic** | Patient | Doctor / Consultant | `+ Schedule Consultation` | `Activity` |
| **Salon & Spa** | Client | Stylist / Therapist | `+ Book Chair / Spa` | `Scissors` |
| **Gym & Fitness** | Member | Personal Trainer | `+ Register Member` | `Dumbbell` |
| **Education** | Student | Teacher / Lecturer | `+ Enroll Student` | `GraduationCap` |
| **Retail / Kirana** | Customer | Cashier / Counter Staff | `+ Quick POS Bill` | `ShoppingCart` |
| **Distributor** | Dealer / Retailer | Sales Executive | `+ Create Wholesale Order` | `Truck` |
| **Real Estate** | Prospect / Buyer | Real Estate Agent | `+ Schedule Site Visit` | `Building` |

---

## 20. Business OS Integration

The Design System governs every screen across all 10 modules of Vyapari Nestam:

```
[Design System & Experience Foundation Specification]
  ├── Dashboard Module (KPI Cards, Queue Lists, AI Insight Banners)
  ├── Contacts Module (Contact 360° Inspector, Data Tables, Filters)
  ├── Operations Module (Calendar Views, Slot Lockers, Resource Badges)
  ├── Communications Module (WhatsApp Chat Desk, Message Bubbles)
  ├── Finance Module (Invoice Cards, GST Tables, Payment Modals)
  ├── Growth Module (GBP Health Dashboard, Review Cards, Recall Sheets)
  ├── Knowledge Base & AI Admin (RAG Citations, Agent Config Cards)
  ├── Workspace Admin (Health Gauge, User Permission Matrix)
  ├── Workflow Automation (Visual Canvas Nodes, Trigger Cards)
  └── Reports & BI Module (Recharts Scorecards, Cohort Heatmaps)
```

---

## 21. Future Roadmap

1. **Native Dark Mode Theme**: Full dark mode palette extension (`bg-stone-900`, `text-stone-100`, `border-stone-800`).
2. **White-Label Theme Engine**: Allow enterprise franchise partners to customize brand primary color and custom logo.
3. **Pluggable Widget SDK**: Standardized React component wrapper for 3rd-party developer marketplace widgets.

---

### Verification & Compliance
This document serves as the absolute design contract governing all frontend code, UI presentation, and accessibility compliance across **Vyapari Nestam Business OS**. All future component additions must strictly conform to these tokens and behavioral standards.
