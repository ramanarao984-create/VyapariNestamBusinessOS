# Vyapari Nestam Business OS - Platform Engineering Blueprint & API Contract Specification

**Document Version:** 1.0  
**Status:** Final & Implementation-Ready Engineering Constitution  
**Role Scope:** Google's Distinguished Software Engineer, Principal Cloud Architect, Enterprise API Architect, Google Workspace Architect, Distributed Systems Architect, Security Architect, Tech Lead, and Staff Engineering Manager.

---

## 1. Engineering Principles & Software Architecture Foundation

The engineering architecture of **Vyapari Nestam Business OS** is governed by five foundational principles designed to guarantee multi-tenant scalability, data sovereignty, resilience, and maintainability:

### Core Principles
1. **Domain-Driven Design (DDD) & Clean Architecture**: Tight isolation between Domain Entities, Use-Case Application Services, and Infrastructure Adapters.
2. **BYOS (Bring Your Own Storage) First**: Data persistence delegates storage to customer-owned Google Workspace infrastructure (Google Sheets, Google Drive, Google Calendar) while maintaining high-performance in-memory caching and index structures.
3. **Event-Driven Reactive Orchestration**: Loose coupling between modules via an asynchronous Event Bus (`EventBus`), supporting idempotency, correlation tracking, and dead-letter queue (DLQ) recoveries.
4. **AI-First Integration with Deterministic Fallbacks**: AI capabilities (Gemini 1.5 Flash/Pro) operate through structured JSON schemas with automatic validation, grounding score checks, and deterministic fallback routines.
5. **Zero-Trust Security & Strict Tenant Isolation**: Every API request and database query enforces context-aware tenant isolation, field-level PII masking, and explicit role permissions (RBAC).

---

## 2. Overall System Architecture

Vyapari Nestam employs a layered, modular architecture:

```
+-----------------------------------------------------------------------------------+
|                        PRESENTATION LAYER (React 18 / Vite)                       |
|   - Design System (VNDS) | App Components | State Managers | Service Workers       |
+-----------------------------------------------------------------------------------+
                                         │
                                   HTTP / WebSockets
                                         ▼
+-----------------------------------------------------------------------------------+
|                   APPLICATION & API GATEWAY LAYER (Node.js / Express)            |
|   - API Gateway | JWT Auth & Tenant Isolator | Rate Limiter | Circuit Breakers    |
+-----------------------------------------------------------------------------------+
                                         │
                   ┌─────────────────────┼─────────────────────┐
                   ▼                     ▼                     ▼
+---------------------+ +---------------------+ +---------------------+
| DOMAIN SERVICES     | | AI GATEWAY ENGINE   | | WORKFLOW ORCH.      |
| - Contacts Service  | | - Gemini Provider   | | - Event Bus         |
| - Operations Svc    | | - RAG / Vector Store| | - Rules Evaluator   |
| - Finance Service   | | - Prompt Guard      | | - Scheduler / DLQ   |
+---------------------+ +---------------------+ +---------------------+
                   │                     │                     │
                   └─────────────────────┼─────────────────────┘
                                         ▼
+-----------------------------------------------------------------------------------+
|                   INFRASTRUCTURE & BYOS PERSISTENCE ADAPTERS                      |
|   - Google Sheets API Adapter | Google Drive API Adapter | Google Calendar Sync  |
|   - Meta WhatsApp Cloud API   | Google Business Profile  | Redis Caching Layer   |
+-----------------------------------------------------------------------------------+
```

### Layer Responsibilities
* **Presentation Layer**: Client-side single-page application executing UI state transitions, optimistic rendering, and offline local action queueing.
* **API Gateway Layer**: Handles request routing, authentication verification, tenant context injection, rate limiting, and CORS validation.
* **Domain Layer**: Implements business rules, state transitions, domain events, and transaction boundaries.
* **AI Gateway Layer**: Normalizes LLM requests, manages API keys, parses structured outputs, and evaluates grounding confidence scores.
* **Infrastructure Layer**: Encapsulates external API integrations, BYOS Google Workspace connectors, and caching primitives.

---

## 3. Frontend Architecture

### Technology Stack & State Architecture
* **Core Framework**: React 18+ with Vite compiler and TypeScript strict mode.
* **State Management**:
  * **Server / API State**: React Query (`@tanstack/react-query`) for automated caching, background revalidation, optimistic updates, and garbage collection.
  * **Global UI State**: Zustand for lightweight client state (active workspace, active branch, sidebar collapse, modal state).
  * **Local Form State**: React Hook Form with Zod schema validation.
* **Routing**: React Router v6 with code-splitting at route boundaries (`React.lazy`).
* **Offline Strategy**: Service Worker caching static assets; IndexedDB staging queued client actions during network drops, re-playing them upon network restoration.

---

## 4. Backend Architecture & Service Modules

### Backend Stack
* **Runtime**: Node.js v20 LTS with Express / TypeScript.
* **Execution**: Single CommonJS bundle compiled via `esbuild` to `dist/server.cjs` running on Cloud Run containers.
* **Authentication Middleware**: Verifies Google OAuth JWT tokens and tenant metadata on every endpoint.

### Service Decomposition
1. **Tenant & Identity Service**: Workspace bootstrapping, branch setup, user management, and RBAC evaluation.
2. **Contacts & CRM Service**: Customer 360° record management, PII masking, and contact tag engines.
3. **Operations & Booking Service**: Practitioner scheduling, calendar slot locking, and queue desk state machines.
4. **Finance & Invoicing Service**: Bill generation, tax calculation, payment link processing, and ledger auditing.
5. **Growth & Reputation Service**: Campaign execution, recall scheduling, and Google Business Profile management.
6. **AI Administration & Knowledge Service**: Knowledge ingestion, vector chunking, prompt execution, and model routing.
7. **Workflow & Event Engine**: Event publishing, trigger matching, step execution, and approval routing.

---

## 5. API Standards & Conventions

All endpoints adhere strictly to RESTful conventions over HTTPS:

### Standards
* **Base URL**: `https://api.vyaparinestam.com/v1`
* **Resource Naming**: Plural nouns in lowercase (e.g., `/api/v1/contacts`, `/api/v1/invoices`).
* **Headers Required**:
  * `Authorization`: `Bearer <JWT_TOKEN>`
  * `X-Tenant-ID`: `<TENANT_UUID>`
  * `X-Branch-ID`: `<BRANCH_UUID>`
  * `Content-Type`: `application/json`
* **Pagination**: Cursor-based pagination for high-volume endpoints:
  `GET /api/v1/contacts?limit=50&starting_after=cnt_9f8a2b`
* **Filtering & Sorting**: Standard URL query params:
  `GET /api/v1/operations/appointments?branch_id=br_01&status=CONFIRMED&sort=-slot_time`
* **Idempotency**: All `POST` and `PUT` operations accept an `Idempotency-Key` header to prevent duplicate execution during network retries.

---

## 6. API Contract Templates & Standard Response Models

### Standard Success Response
```json
{
  "success": true,
  "data": {
    "id": "cnt_8f92a1b3",
    "type": "contact",
    "attributes": {
      "full_name": "Ramanarao K.",
      "phone_masked": "+91 98****3210",
      "loyalty_tier": "VIP",
      "created_at": "2026-07-24T02:30:00Z"
    }
  },
  "meta": {
    "request_id": "req_01J9X8A1B2C3",
    "timestamp": "2026-07-24T03:10:00Z"
  }
}
```

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PERMISSIONS",
    "message": "User role 'Receptionist' is restricted from exporting client CSV records.",
    "target": "contacts:export",
    "details": [
      {
        "field": "role",
        "issue": "Required permission 'MANAGE_DATA_EXPORTS' missing."
      }
    ]
  },
  "meta": {
    "request_id": "req_01J9X8A1B2C3",
    "timestamp": "2026-07-24T03:10:00Z"
  }
}
```

### Standard HTTP Status Codes
* `200 OK`: Successful retrieval or update.
* `201 Created`: Resource successfully created.
* `202 Accepted`: Asynchronous job queued (e.g. broadcast dispatch, report generation).
* `400 Bad Request`: Validation failure or malformed body.
* `401 Unauthorized`: Missing or expired JWT authentication token.
* `403 Forbidden`: Authenticated user lacks required RBAC permissions.
* `404 Not Found`: Resource ID does not exist within the active tenant context.
* `429 Too Many Requests`: Rate limit exceeded (100 req/min per user).
* `500 Internal Server Error`: Unhandled server error.

---

## 7. Event Contract Standards

All system events emitted across modules follow a standardized CloudEvents 1.0 specification:

```json
{
  "specversion": "1.0",
  "id": "evt_01J9X98A7B6C",
  "source": "/services/operations-service",
  "type": "com.vyaparinestam.operations.booking_confirmed",
  "datacontenttype": "application/json",
  "time": "2026-07-24T03:10:00Z",
  "tenant_id": "tenant_hyd_01",
  "branch_id": "branch_main",
  "traceparent": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
  "data": {
    "booking_id": "bk_882910",
    "contact_id": "cnt_8f92a1b3",
    "practitioner_id": "dr_sharma",
    "slot_iso": "2026-07-24T10:30:00+05:30",
    "service_type": "Dental Scaling"
  }
}
```

---

## 8. Third-Party & Google Integration Standards

| Service | Connector Pattern | Authentication | Quota & Rate Limit Protection |
| :--- | :--- | :--- | :--- |
| **Google Sheets API v4** | Batch Append / Read Adapter | OAuth 2.0 User Grant | In-memory batching (Writes flushed every 15s or 50 records) |
| **Google Drive API v3** | Multipart Stream Upload | OAuth 2.0 User Grant | Parallel stream cap (Max 3 concurrent file uploads) |
| **Google Calendar API** | Webhook Push Notification | OAuth 2.0 User Grant | Exponential backoff on 403 `rateLimitExceeded` |
| **Meta WhatsApp Cloud API**| Direct Graph API Adapter | System User Token | Token bucket limiter (Max 50 msgs/sec) |
| **Gemini AI API** | `@google/genai` SDK | Server API Key | Model fallback router (Gemini 1.5 Flash $\rightarrow$ Pro $\rightarrow$ Fallback) |

---

## 9. Authentication, Authorization & Security

* **Authentication**: Managed via Google Workspace OAuth 2.0 and Firebase Auth tokens.
* **Token Structure**: RSA-256 signed JWTs containing `uid`, `tenant_id`, `branch_id`, `roles`, and `exp` (15-min lifetime).
* **Role-Based Access Control (RBAC)**: Fine-grained permission checks evaluated in middleware:
  `hasPermission(req.user, 'FINANCE_ISSUE_REFUND')`.
* **Field-Level PII Protection**: Middleware automatically strips or masks PII fields (`phone`, `email`, `address`) for users without `VIEW_FULL_PII` privileges.

---

## 10. Observability & Telemetry

* **Structured JSON Logging**: All application logs emitted to `stdout` in structured JSON format including `severity`, `trace_id`, `span_id`, `tenant_id`, `message`, and `stack_trace`.
* **Distributed Tracing**: OpenTelemetry instrumentation tracking request propagation across API Gateway, Domain Services, AI Engine, and Google Workspace APIs.
* **Health Check Probes**:
  * `/api/health/liveness`: Returns `200 OK` if Express web server is responsive.
  * `/api/health/readiness`: Returns `200 OK` if BYOS connection, Redis cache, and Gemini API keys are verified active.

---

## 11. Performance SLAs & Targets

| Metric | Target SLA | Maximum Allowable Limit |
| :--- | :--- | :--- |
| **API Gateway Routing Latency** | < 15 ms | 50 ms |
| **Core CRUD Endpoints** | < 150 ms | 400 ms |
| **AI Stream First-Token Latency** | < 400 ms | 1200 ms |
| **Dashboard Initial Load** | < 800 ms | 1800 ms |
| **BYOS Google Sheet Write Flush** | < 1.0 second (Async) | 3.0 seconds |

---

## 12. Testing Strategy & CI/CD Pipeline

```
[Git Push] ──> [Lint & TypeScript Verification] ──> [Unit Tests (Vitest)] 
   ──> [Contract Verification (Pact)] ──> [Build Applet Bundle] ──> [Automated Deploy]
```

* **Unit Testing**: Vitest for business logic, utilities, and React custom hooks.
* **API & Contract Testing**: Integration tests mocking Google APIs and validating REST responses against Zod schemas.
* **End-to-End (E2E) Testing**: Playwright testing critical user journeys (Contact Creation, Appointment Booking, Bill Checkout).
* **AI Quality Regression**: Test suite verifying prompt templates against benchmark inputs to ensure grounding accuracy >= 95%.

---

## 13. Deployment & Release Management

* **Build Target**: Vite bundles client assets into `dist/`; `esbuild` bundles `server.ts` into a single CommonJS file `dist/server.cjs`.
* **Start Command**: `node dist/server.cjs` running in Cloud Run runtime environments binding to `0.0.0.0:3000`.
* **Zero-Downtime Releases**: Cloud Run rolling updates ensuring old container revision serves traffic until new container health check passes `/api/health/readiness`.

---

### Verification & Compliance
This document serves as the authoritative Platform Engineering Specification for **Vyapari Nestam Business OS**. All future code additions, backend services, API routes, and integration connectors must strictly conform to these engineering standards and contract schemas.
