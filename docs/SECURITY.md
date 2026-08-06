# Security & Access Control Guide

This document describes the security controls, authentication standards, and data protection mechanisms implemented in Nestam CRM.

---

## 1. Authentication

The application utilizes **Firebase Authentication** coupled with **Google Sign-In**:
- **Identity Provider**: Google Sign-In is mandated to ensure secure, OAuth-verified emails.
- **Short-Lived Tokens**: Firebase handles session persistence securely. Silent ID token refresh is executed automatically via `AuthService.refreshFirebaseSession()`.
- **Google OAuth Scopes**: During login, Google OAuth scopes (`spreadsheets`, `calendar.events`, `business.manage`) are requested. The retrieved Google access token is saved **strictly** inside transient `sessionStorage` in the client's browser. It is **never** persisted in the database or written to non-volatile local storage, eliminating the risk of persistent token theft or backend compromises.

---

## 2. Authorization & Role-Based Access Control (RBAC)

Granular authorization is enforced both client-side and server-side:

### Pre-Defined Roles
- **Owner**: Full system privileges, including billing configuration, tenant-level settings, and staff user administration.
- **Admin**: Clinical administration, scheduling overrides, patient metadata curation, and custom reports.
- **Doctor**: Clinical diagnostics, patient charts access, medical prescriptions, and active appointment logs.
- **Receptionist**: Appointment booking, calendar dispatch, patient registration, and checkout billing.
- **ReadOnly**: Auditing or read-only operational dashboards.

### Components-Level & Hook Guards
- **`useAuthorization`**: Hook returning specific permission flags. Used for conditional layouts:
  ```typescript
  const { can } = useAuthorization();
  if (can('MANAGE_BILLING')) { ... }
  ```
- **`<ProtectedComponent>`**: Fully blocks component render or routes unless permissions are met:
  ```tsx
  <ProtectedComponent requiredPermission="MANAGE_STAFF">
    <StaffManagementPanel />
  </ProtectedComponent>
  ```

---

## 3. Database Row-Level Security (RLS)

All SaaS metadata is stored on a PostgreSQL database powered by Supabase. Access to raw tenant and user metadata is heavily restricted at the database level:
- **Tenant Isolation**: Row-Level Security (RLS) is enabled on all tables (e.g., `tenants`, `users`, `audit_logs`).
- **Policy Enforcement**: Policies ensure that users can only query, modify, or insert records that match their resolved `tenantId` (unless executing a vetted system-role action with the server's backend service role key).
- **Service Role Key Safety**: The database service-role key (`SUPABASE_SERVICE_ROLE_KEY`) has bypass privileges and is stored **strictly** in server-side environment variables. It is never exposed, bundled, or made accessible to client browsers.

---

## 4. API & Network Security

- **Reverse Proxy Routing**: All external application ingress is routed exclusively via an Nginx reverse proxy mapped to port `3000`.
- **API Proxy Pattern**: Direct calls to sensitive endpoints (Gemini AI, Meta WhatsApp Business Cloud API) are proxy-routed through `/api/*` server-side endpoints, keeping secrets safe.
- **No API Keys in Frontend**: Under no circumstances are Gemini API keys, Supabase service keys, or Meta tokens sent to or used inside client-side components.

---

## 5. Global Error Handling & Sanitization

In production mode, the centralized Express error middleware sanitizes all failed requests:
- **Stack Trace Stripping**: Stack traces and raw internal database errors are completely stripped from responses sent back to client browsers, preventing information leakage.
- **Traceability (`requestId`)**: A unique `requestId` is appended to all HTTP request lifecycles. This ID is logged alongside error details on the server and returned to the client in the response, allowing administrators to look up full, sanitized logs on request.
- **Log Masking**: Sensitive variables, credentials, and full OAuth tokens are automatically masked or ignored by the structured logging pipeline.
