# WhatsApp Persistence Migration & PostgREST Schema Reload Guide

This document explains how to apply the WhatsApp persistence schema migration and reload PostgREST schema cache in Supabase.

---

## 1. Schema Migration File

The complete versioned SQL migration is stored in:
`/supabase/migrations/20260726000000_whatsapp_persistence.sql`

It creates the following core multi-tenant tables, indexes, and constraints:
- `tenants`: Primary multi-tenant organization records.
- `whatsapp_connections`: Encrypted credential vault (`phone_number_id`, `waba_id`, `token_ciphertext`).
- `whatsapp_conversations`: Contact conversation states (`tenant_id`, `external_contact_identifier`, `automation_mode`).
- `whatsapp_messages`: Persistent message vault (`meta_message_id`, `direction`, `body`, `status`).
- `whatsapp_idempotency_logs`: Webhook deduplication log for exact once processing.
- `whatsapp_templates`: Synced Meta Cloud API message templates.

---

## 2. Running the Migration

### Option A: Via Supabase SQL Editor (Recommended for Cloud Projects)
1. Open your **Supabase Dashboard** -> **SQL Editor**.
2. Copy the contents of `/supabase/migrations/20260726000000_whatsapp_persistence.sql`.
3. Paste into the SQL query box and click **Run**.

### Option B: Via Supabase CLI
```bash
supabase db push
# or locally
supabase migration up
```

---

## 3. Reloading the PostgREST Schema Cache

After running a DDL migration (creating tables or adding columns), PostgREST requires reloading its schema cache.

### Automatic Schema Reload
Run the following SQL in Supabase SQL Editor:
```sql
NOTIFY pgrst, 'reload schema';
```

### Manual Schema Reload in Supabase UI
1. Go to **Project Settings** -> **API**.
2. Click **Reload schema cache**.

---

## 4. Verifying System Readiness

After applying the migration and reloading the schema cache, verify readiness using the application endpoint:

```bash
curl http://localhost:3000/api/whatsapp/readiness
```

Expected output when ready:
```json
{
  "ready": true,
  "status": "ready",
  "code": "WHATSAPP_READY",
  "message": "WhatsApp Cloud API integration is fully provisioned with durable database storage."
}
```

Or run the full application health check:
```bash
curl http://localhost:3000/api/health
```
