# Production Readiness Scorecard

Last updated: 2026-08-07

## Current Score

Estimated readiness: **74 / 100**

This score assumes the latest GitHub `main` branch is deployed to Vercel and required production environment variables are present. It is not a launch approval until live auth, database, WhatsApp webhook, AI, and automation paths pass end-to-end verification.

## Category Scores

| Area | Score | Status | Notes |
| --- | ---: | --- | --- |
| Deployment | 7/10 | Improving | Vercel builds are passing. Real `api/` functions were added for health and automation cron. Remaining work: full API route coverage or Express refactor. |
| Security | 7/10 | Improving | Browser-side Meta token persistence removed, Google OAuth scope posture documented, security headers added, cron auth helper supports Bearer secrets. Remaining work: CSP, rate limiting, secret rotation runbook, live security scan. |
| Auth & Identity | 7/10 | Improving | Firebase Google sign-in now supports Gmail and Workspace identities, with Workspace API authorization separated from login. Remaining work: verify Google consent screen publishing/scopes and user onboarding edge cases. |
| Multi-Tenant Isolation | 7/10 | Needs Live DB Proof | SQL migrations generally enable RLS for tenant-facing tables. Migration policy tests now guard RLS and unsafe grants. Remaining work: live Supabase project must be active and inspected for applied migrations/policies. |
| Schema Readiness | 7/10 | Needs Live DB Proof | Migrations cover WhatsApp, Google vault, tenant sector config, automation, audit metadata. Remaining work: check live drift, indexes, constraints, and backup/restore posture. |
| BYOS / BYO Storage | 5/10 | Early | Current architecture is mostly app-managed storage with Supabase/Firebase. Remaining work: tenant-scoped integration abstraction, per-tenant external storage credentials, export/delete flows. |
| WhatsApp Runtime | 7/10 | Improving | Persistence, consent, conversation window, handover, outbound jobs, and cron processor exist. Remaining work: live webhook verification, Meta app production review, rate limits, replay tests. |
| AI Agent | 6/10 | Needs Guardrails | AI assistant exists with JSON response mode and fallback. Remaining work: prompt-injection guardrails, PII redaction, per-tenant usage caps, eval suite, model/provider failure policies. |
| Chatbot Builder | 6/10 | Needs Guardrails | Flow/automation primitives exist. Remaining work: publish/version controls, invalid-flow validation, rollback, simulation, channel policy enforcement. |
| UI/UX | 8/10 | Strong | UI appears polished and domain-tailored. Remaining work: verify mobile/responsive flows, loading/error states, accessibility, large-bundle performance. |
| Observability | 5/10 | Early | Health function and structured request logging exist. Remaining work: Vercel runtime error monitoring, Sentry/PostHog or equivalent, audit dashboards, alerting. |
| CI/Test Coverage | 7/10 | Improving | CI, unit tests, auth tests, cron auth tests, and SQL migration policy tests exist. Remaining work: e2e tests against deployed preview, webhook contract tests, Supabase branch tests. |

## Blockers To Reach 90/100

1. Activate/connect the correct Supabase production project and verify live migrations, RLS, policies, and backups.
2. Refactor backend/API deployment so every `/api/*` route needed by the app is available as Vercel Functions, not only the new health and cron functions.
3. Add end-to-end deployment tests for Google sign-in, Workspace authorization, WhatsApp webhook verification, reminder cron, and AI chat.
4. Add production observability: runtime errors, structured logs, alerting, and tenant-level audit event review.
5. Add AI/chatbot safety controls: prompt-injection resistance, PII boundaries, tenant quotas, flow validation, simulation, and rollback.
6. Add BYOS design and implementation for tenant-owned data export/import, external storage credentials, and deletion workflows.
7. Add CSP after testing Firebase/Google/Meta allowlists in preview.
8. Reduce bundle size with route/code splitting and verify mobile performance.
9. Publish operational runbooks for incident response, secret rotation, webhook replay, and rollback.
10. Run a final production smoke test against the live Vercel URL after all environment variables are configured.

## Recent Hardening Completed

- Added CI workflow for install, lint, test, and build.
- Fixed package metadata and Node runtime pinning for Vercel.
- Added cross-platform clean script.
- Replaced README with production deployment guidance.
- Added production `.env.example` coverage.
- Separated Google identity login from Workspace API authorization.
- Avoided persisting Google/Meta API access tokens in browser storage.
- Added OAuth scope policy documentation.
- Added migration security policy tests.
- Added Vercel cron auth helper and test coverage.
- Added Vercel Functions for `/api/health` and `/api/internal/automation/process-due`.
- Added baseline Vercel security headers.
