# Production Readiness Scorecard

Last updated: 2026-08-07

## Current Score

Estimated readiness: **81 / 100**

This score assumes the latest GitHub `main` branch is deployed to Vercel and required production environment variables are present. It is not a launch approval until live auth, database, WhatsApp webhook, AI, and automation paths pass end-to-end verification.

## Category Scores

| Area | Score | Status | Notes |
| --- | ---: | --- | --- |
| Deployment | 7/10 | Improving | Vercel builds are passing. Real `api/` functions exist for health and automation cron. Remaining work: full API route coverage or Express refactor; resolve Vercel TypeScript warnings. |
| Security | 7/10 | Improving | Browser-side Meta token persistence removed, Google OAuth scope posture documented, security headers added, cron auth supports Vercel Bearer secrets. Remaining work: CSP, rate limiting, secret rotation runbook, live security scan; confirm health fails closed in production. |
| Auth & Identity | 7/10 | Improving | Firebase Google sign-in now supports Gmail and Workspace identities, with Workspace API authorization separated from login. Remaining work: verify Google consent screen publishing/scopes and user onboarding edge cases. |
| Multi-Tenant Isolation | 7/10 | Needs Live DB Proof | SQL migrations generally enable RLS for tenant-facing tables. Migration policy tests now guard RLS and unsafe grants. Remaining work: live Supabase project must be active and inspected for applied migrations/policies. |
| Schema Readiness | 7/10 | Needs Live DB Proof | Migrations cover WhatsApp, Google vault, tenant sector config, automation, audit metadata. Remaining work: check live drift, indexes, constraints, and backup/restore posture. |
| BYOS / BYO Storage | 5/10 | Early | Current architecture is mostly app-managed storage with Supabase/Firebase. Remaining work: tenant-scoped integration abstraction, per-tenant external storage credentials, export/delete flows. |
| WhatsApp Runtime | 7/10 | Improving | Persistence, consent, conversation window, handover, outbound jobs, and a Vercel-safe automation cron worker exist. Remaining work: live webhook verification, Meta app production review, rate limits, replay tests. |
| AI Agent | 7/10 | Improving | AI safety utilities now cover prompt-injection detection, PII redaction, and prompt size checks. Remaining work: wire guardrails into live AI endpoints, per-tenant usage caps, eval suite, model/provider failure policies. |
| Chatbot Builder | 7/10 | Improving | Flow structure/version validation utilities exist. Remaining work: publish/version controls, invalid-flow validation in UI/API, rollback, simulation, channel policy enforcement. |
| UI/UX | 8/10 | Strong | UI appears polished and domain-tailored. Remaining work: verify mobile/responsive flows, loading/error states, accessibility, and route-level lazy loading. |
| Observability | 5/10 | Early | Health function and structured request logging exist. Remaining work: Vercel runtime error monitoring, Sentry/PostHog or equivalent, audit dashboards, alerting. |
| CI/Test Coverage | 9/10 | Improving | CI, unit tests, auth tests, cron worker tests, AI safety tests, SQL migration policy tests, and production preflight checks exist. Remaining work: e2e tests against deployed preview, webhook contract tests, Supabase branch tests. |

## Blockers To Reach 90/100

1. Activate/connect the correct Supabase production project and verify live migrations, RLS, policies, and backups.
2. Refactor backend/API deployment so every `/api/*` route needed by the app is available as Vercel Functions, not only health and automation cron.
3. Run live cron smoke tests after Supabase is active: due action claim, consent block, quiet-hours reschedule, outbound job enqueue.
4. Add end-to-end deployment tests for Google sign-in, Workspace authorization, WhatsApp webhook verification, reminder cron, and AI chat.
5. Add production observability: runtime errors, structured logs, alerting, and tenant-level audit event review.
6. Wire AI/chatbot safety utilities into live endpoints and add tenant-level quotas/evals.
7. Add BYOS design and implementation for tenant-owned data export/import, external storage credentials, and deletion workflows.
8. Add CSP after testing Firebase/Google/Meta allowlists in preview.
9. Reduce bundle size with route/code splitting and verify mobile performance.
10. Publish operational runbooks for incident response, secret rotation, webhook replay, and rollback.

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
- Wired automation cron directly to Supabase queue claiming, consent checks, quiet-hours handling, outbound job enqueue, and execution/action status updates.
- Added AI/chatbot safety utilities and tests.
- Added baseline Vercel security headers.
- Added production preflight checks to CI and made the health endpoint fail closed when critical runtime configuration is missing.
- Removed internal cron/database error details from HTTP error responses and resolved cron Supabase client type-check errors.
- Split frontend vendor bundles; latest Vercel build reduced the main JavaScript chunk from approximately 1.48 MB to 741 KB.
