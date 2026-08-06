# Google OAuth Scope Policy

Vyapari Nestam Business OS separates app authentication from Google Workspace API authorization.

## Identity Sign-In

The normal sign-in flow requests only Google identity scopes:

- `openid`
- `profile`
- `email`

This keeps first login low-friction and avoids requesting sensitive Workspace access before the user needs it.

## Workspace API Authorization

The app requests Workspace scopes only from the explicit Google Workspace authorization flow used for live sync features:

- `https://www.googleapis.com/auth/spreadsheets`
- `https://www.googleapis.com/auth/calendar.events`
- `https://www.googleapis.com/auth/business.manage`

This flow uses `prompt=consent select_account` so users can clearly choose the account and approve the higher-risk scopes.

## Token Handling

Workspace OAuth access tokens are kept in memory only for the active browser session. They are not persisted to `localStorage`, `sessionStorage`, Supabase, Sheets, or any frontend-accessible durable store.

Production integrations should move long-lived refresh-token handling fully server-side, encrypted with `ENCRYPTION_SECRET`, and tied to tenant membership records.

## Production Requirements

Before public launch:

- Verify the OAuth consent screen status and allowed test/production users.
- Confirm all requested scopes are required for shipped features.
- Add tenant-level integration connection state and audit logs.
- Prefer incremental authorization at the feature boundary instead of broad consent during login.
- Revoke and rotate any leaked or stale OAuth credentials immediately.
