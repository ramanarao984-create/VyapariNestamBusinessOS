# Vyapari Nestam Business OS

Vyapari Nestam Business OS is a CRM and automation workspace for service businesses. It combines customer management, appointments, WhatsApp automation, Google Workspace integrations, AI-assisted workflows, tenant metadata, and operational dashboards.

## Current Production Target

Live Vercel project:

- https://vyapari-nestam-business-os.vercel.app

Primary repository:

- https://github.com/ramanarao984-create/VyapariNestamBusinessOS

## Architecture

- Frontend: React 19, Vite, Tailwind CSS, Recharts, Motion
- Runtime server: Express bundled with esbuild into `dist/server.cjs`
- Authentication: Firebase Authentication with Google Sign-In
- Metadata database: Supabase/Postgres with tenant-aware services and migrations
- AI: Gemini through server-side API routes
- Messaging: Meta WhatsApp Business Cloud API through server-side routes
- Scheduler: Vercel Cron calling `/api/internal/automation/process-due`

## Local Development

Prerequisites:

- Node.js 20 or newer
- npm
- Firebase project with Google Sign-In enabled
- Supabase project if testing tenant metadata flows

Install dependencies:

```bash
npm ci
```

Create local environment:

```bash
cp .env.example .env.local
```

Run development server:

```bash
npm run dev
```

Run verification:

```bash
npm run lint
npm test
npm run build
```

## Production Environment

Configure these in Vercel Project Settings, not in GitHub:

- `APP_MODE=production`
- `APP_URL`
- `GEMINI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`
- `WHATSAPP_APP_SECRET`
- `ENCRYPTION_SECRET`
- `CRON_SECRET`

Firebase client config is currently stored in `firebase-applet-config.json`. The deployed Vercel domains must also be present in Firebase Authentication authorized domains.

## Deployment

Vercel imports from GitHub branch `main` and deploys production automatically.

The Vercel Hobby cron-safe schedule is:

```json
{
  "crons": [
    {
      "path": "/api/internal/automation/process-due",
      "schedule": "0 0 * * *"
    }
  ]
}
```

Do not change this back to a five-minute schedule on Hobby. Use Vercel Pro or an external scheduler for higher frequency jobs.

## CI

GitHub Actions runs on pushes and pull requests to `main`:

- TypeScript check: `npm run lint`
- Tests: `npm test`
- Production build: `npm run build`

## Security Notes

- Do not expose Supabase service role keys, Meta access tokens, Gemini API keys, or encryption secrets to client-side code.
- Keep Google OAuth scopes least-privilege and review before public launch.
- Use server-side endpoints for WhatsApp, Gemini, cron, and Supabase privileged operations.
- Review `docs/SECURITY.md` before deploying a customer-facing release.
- Verify Supabase RLS policies and tenant isolation before onboarding multiple real tenants.

## Production Readiness Status

This project is currently suitable for private pilot testing. Before broad paid production, complete:

- CI must pass consistently.
- Supabase migrations and RLS policies must be verified on the live database.
- Tenant lifecycle, invite, and cross-tenant isolation tests must pass.
- WhatsApp webhook verification, retries, rate limits, and audit logs must be tested.
- AI/chatbot guardrails, usage limits, and observability must be enabled.
- Error tracking and operational runbooks must be added.
