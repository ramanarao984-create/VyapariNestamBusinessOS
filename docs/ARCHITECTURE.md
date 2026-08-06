# Application Architecture

This document describes the high-level architecture, module design, and technical integration patterns of the Clinic CRM (Nestam CRM) application.

## High-Level Overview

Nestam CRM is built as a full-stack, enterprise-ready application utilizing **React (Vite)** on the frontend and a **custom Express Node.js server** on the backend. This architecture provides seamless, high-performance static asset delivery coupled with a secure, server-side API proxy layer for sensitive service calls (e.g., Gemini AI, Meta WhatsApp API, Supabase service-role actions).

```
┌────────────────────────────────────────────────────────┐
│                      Client Browser                    │
│                                                        │
│  ┌──────────────────┐  ┌───────────────┐  ┌─────────┐  │
│  │  React SPA / UI  │──│ TenantContext │──│  Auth   │  │
│  └──────────────────┘  └───────────────┘  └─────────┘  │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ HTTPS / WSS (Port 3000)
                            ▼
┌────────────────────────────────────────────────────────┐
│                    Custom Express Server               │
│                                                        │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────┐  │
│  │   Vite Dev MW   │  │   API Proxies /  │  │ System │  │
│  │ (or Dist Static)│  │ WhatsApp/Gemini  │  │ Health │  │
│  └─────────────────┘  └──────────────────┘  └────────┘  │
└───────────────────────────┬────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
    ┌───────────────┐  ┌─────────┐  ┌────────────────┐
    │  Supabase DB  │  │ Firebase│  │ Google APIs /  │
    │ (SaaS Metadata)  │  Auth   │  │ Workspace (SA) │
    └───────────────┘  └─────────┘  └────────────────┘
```

---

## Core Components

### 1. Tenant Context & Multi-Tenancy Resolver
The application implements an **isolated metadata-driven multi-tenant database model**.
- **TenantResolver (`src/auth/TenantResolver.ts`)**: When a user authenticates via Firebase, their Firebase UID is resolved against the database to fetch their associated `tenantId`, user `role`, specific `clinicConfig`, and tenant-level `featureFlags`.
- **TenantCache (`src/auth/TenantCache.ts`)**: To avoid database bottlenecks, resolved tenant contexts are cached in-memory with a robust cache invalidation scheme triggered upon onboarding, profile updates, or manual clear requests.
- **TenantProvider & TenantContext (`src/auth/TenantProvider.tsx`)**: Injects the resolved tenant configuration globally throughout the React component hierarchy.

### 2. Role-Based Access Control (RBAC)
Granular, application-wide authorization is enforced through the RBAC engine (`src/auth/AuthorizationService.ts`):
- **Roles**: Explicit roles are `Owner`, `Admin`, `Doctor`, `Receptionist`, and `ReadOnly`.
- **Permission Matrix (`src/auth/Permission.ts`)**: Maps standard operations (e.g., `MANAGE_BILLING`, `VIEW_PATIENTS`, `EDIT_CLINIC_CONFIG`) to the authorized roles.
- **Declarative Guards**:
  - `useAuthorization` hook for conditional rendering in components.
  - `<ProtectedComponent>` wrapper to lock down entire subtrees based on required permissions.

### 3. Feature Flags
Product capabilities can be decoupled, metered, or customized per tenant using Feature Flags (`src/features/`):
- Flags such as `enableWhatsApp`, `enableBilling`, and `enableAiAssistant` are loaded dynamically during tenant resolution.
- Components selectively render using the `useFeatureFlags` hook to prevent access to unauthorized or unpaid features.

### 4. Google Workspace Resolver
The application integrates with the user's personal/business Google Workspace storage and collaboration tools:
- **GoogleWorkspaceResolver (`src/google/GoogleWorkspaceResolver.ts`)**: Dynamically resolves the specific Google Sheets (`spreadsheetId`), Google Drive folder (`driveFolderId`), and Google Calendar (`calendarId`) owned by or assigned to the active tenant.
- All workspace transactions are performed server-side or via direct browser SDK calls using short-lived Google OAuth tokens stored strictly in browser transient memory (`sessionStorage`), preventing server-side credential leaks.

### 5. Observability & System Health
Observability and stability are engineered directly into the platform core:
- **HealthService (`src/system/HealthService.ts`)**: Exposes deep and lightweight system health probes covering database latency, external API reachability (Google APIs DNS and outbound internet ping), and environment configuration validity.
- **Centralized Logger (`src/services/metadata/logger.ts`)**: Outputs highly structured logs containing `requestId`, `tenantId`, `firebaseUid`, and execution performance times (`durationMs`), enabling advanced monitoring.
