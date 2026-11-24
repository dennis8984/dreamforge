# Required Environment Variables (Nubeku)

Production secrets live in the [Nubeku dashboard](https://dash.nubeku.com) secrets vault. Locally, use `.env.local` (see `.env.example`).

## Core

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

RUNPOD_API_URL=https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/run
RUNPOD_API_KEY=
RUNPOD_CHAT_API_URL=
OPENROUTER_API_KEY=

ELEVENLABS_API_KEY=
CHAT_ENCRYPTION_KEY=
NEXT_PUBLIC_APP_URL=https://dreamforge.apps.nubeku.com
```

Full list: `.env.example`.

## How to set in Nubeku

1. Open https://dash.nubeku.com
2. Select the DreamForge app
3. Add secrets / env vars
4. Redeploy or push to trigger a new build

`NEXT_PUBLIC_*` must be present at build time.

## Smoke test

```bash
curl https://dreamforge.apps.nubeku.com/api/generate
```
