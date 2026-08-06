# Production Deployment Guide

This document outlines the steps, requirements, and best practices to deploy the Nestam CRM application to a production environment.

## Prerequisites

1. **Google Cloud Platform (GCP) Project**:
   - Cloud Run (for application hosting).
   - Artifact Registry (for storing Docker images).
   - Firebase Console (matching Auth and storage configs).
2. **Supabase PostgreSQL Database**:
   - A live database instance holding SaaS tenant metadata.
3. **Google API Credentials**:
   - OAuth Client ID and secret set up in GCP Credentials for the user sign-in and Google Workspace integration.

---

## Environment Variables Configuration

The following environment variables must be populated in the production environment (e.g., Cloud Run environment variables or Secret Manager):

| Variable Name | Description | Example Value |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Server-side API key for Google GenAI services. | `AIzaSy...` |
| `SUPABASE_URL` | The endpoint of the Supabase API. | `https://your-project.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | High-privilege service key (keep hidden on backend). | `eyJhbGciOi...` |
| `APP_URL` | Absolute canonical URL of the deployed app. | `https://crm.yourdomain.com` |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Business cloud phone ID. | `1029384756` |
| `WHATSAPP_ACCESS_TOKEN` | System-user access token for Meta WhatsApp API. | `EAAG...` |
| `WHATSAPP_VERIFY_TOKEN` | Verification token for webhook handshake. | `nestam_crm_secure_token` |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | ID of the Meta WhatsApp Business Account. | `987654321` |

---

## Production Build & Start Architecture

In production, the application is compiled and run in a single container optimized for low cold-start latency.

### 1. Build Phase (`npm run build`)
```bash
npm run build
```
This single command orchestrates:
1. **Frontend compilation**: Vite bundles the React SPA and outputs optimized static assets in the `dist/` directory.
2. **Backend bundling**: `esbuild` compiles `server.ts` into a standalone, optimized CommonJS file `dist/server.cjs`. This bundling step pre-resolves all internal relative TypeScript paths and skips Node's strict runtime ESM relative module resolution checks.

### 2. Run Phase (`npm start`)
```bash
npm start
```
Starts the bundled server using Node.js: `node dist/server.cjs`.
- The server automatically binds to host `0.0.0.0` and port `3000` (required for container ingress).
- The server serves the pre-compiled React SPA assets in `dist/` statically, and mounts all Express API proxy endpoints.

---

## Deploying to Google Cloud Run

To containerize and deploy to Cloud Run:

### 1. Dockerfile Configuration
Ensure you have a production-optimized `Dockerfile` at the root:
```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
```

### 2. Deploy Command
```bash
gcloud builds submit --tag gcr.io/your-project-id/nestam-crm
gcloud run deploy nestam-crm \
  --image gcr.io/your-project-id/nestam-crm \
  --platform managed \
  --port 3000 \
  --allow-unauthenticated \
  --update-env-vars NODE_ENV=production,SUPABASE_URL=...
```

---

## Database Migrations

Before launching, execute schema migrations to set up the SaaS metadata database tables on Supabase:
```bash
npm run db:migrate
```
*(Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are exported in your shell beforehand).*
