# Tenant Lifecycle & Onboarding Operations

This document describes the lifecycle of a clinic tenant within Nestam CRM, from initial self-service onboarding and context resolution to cache management and cleanup.

---

## 1. Onboarding & Provisioning Flow

Clinic onboarding is handled via a structured, self-service wizard. The onboarding pipeline executes in `OnboardingService.completeOnboarding` through the following sequence:

```
[Onboarding Inputs]
         │
         ▼
 1. Schema Validation (Clinic name, Emails, Google IDs)
         │
         ▼
 2. Duplicate Check (Verify tenant code is unique in Supabase)
         │
         ▼
 3. Initialize Settings (Default feature flags & working hours)
         │
         ▼
 4. Create Tenant Metadata Record (Insert into `tenants` table)
         │
         ▼
 5. Create Owner Metadata Record (Insert into `users` table with Owner role)
         │
         ▼
 6. Secure Logging & Audit Trail (Events: CLINIC_CREATED, OWNER_CREATED)
         │
         ▼
[Tenant Fully Active]
```

### Automatic ID Generation
Tenant IDs are generated as lowercase, URL-safe kebab-case strings derived from the clinic name (e.g., `"City Dental Clinic"` -> `"city-dental-clinic"`). Duplicate verification is performed before creation.

---

## 2. Active Tenant Context Resolution

When a user logs in, their profile and permissions are resolved as follows:
1. **Firebase Authentication**: The client retrieves the Firebase ID Token.
2. **Tenant Resolution**: The user's Firebase UID is passed to `TenantResolver.resolve(uid)`.
3. **Caching Phase**:
   - **Cache Hit**: Returns `ResolvedTenantContext` in `< 5ms`.
   - **Cache Miss**:
     - Fetches `UserMetadata` from the `users` table.
     - Fetches `Tenant` metadata from the `tenants` table.
     - Merges configuration and default feature flags.
     - Logs a structured `LOGIN` audit event.
     - Saves the context to `TenantCache` for future requests.

---

## 3. Cache Management & Invalidation

To maintain database efficiency while ensuring data consistency, `TenantCache` provides explicit invalidation methods:

- **Automatic Expiry**: Cached entries are automatically invalidated after their TTL expires.
- **Manual User Invalidation (`TenantResolver.invalidate(uid)`)**: Clears cache for a single user. Called when a user's role is updated or they refresh their profile.
- **Manual Tenant Invalidation (`TenantResolver.invalidateTenant(tenantId)`)**: Clears cached contexts for *all* users belonging to a tenant. Called when a tenant changes their clinic name, updates global business hours, or updates sub-tenant feature flags.

---

## 4. Termination & Cleanup Policies

When a subscription is cancelled or a tenant request deletion (Offboarding):
1. **Subscription Status Change**: The tenant record `subscriptionStatus` is updated to `'suspended'` or `'inactive'`. The resolver will still resolve, but frontend routes will block access to premium modules using feature flag and status checks.
2. **Hard Offboarding / Deletion**:
   - Delete all associated `users` under the `tenantId`.
   - Delete the core `tenant` record.
   - Dispatch `CLINIC_DELETED` security audit events.
   - Evict the tenant and its users from the in-memory `TenantCache` entirely.
