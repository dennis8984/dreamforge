# Nubeku Environment Variables Setup

## CRITICAL: Add these in Nubeku secrets for production to work!

Go to [Nubeku Dashboard](https://dash.nubeku.com) → your app → Secrets and add the variables from `.env.example`.

### Required for image generation

| Variable | Value |
|----------|-------|
| `RUNPOD_API_URL` | `https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/run` |
| `RUNPOD_API_KEY` | Your Runpod API key |

Also set Supabase, Stripe, and other keys listed in `.env.example`. Mark sensitive values as secrets.

### How to add

1. Go to https://dash.nubeku.com
2. Open the DreamForge app
3. Open Secrets / Environment variables
4. Paste each `KEY=value` (mark secrets appropriately)
5. Redeploy (or push to the connected branch) so the new secrets load

`NEXT_PUBLIC_*` values are baked in at build time — set them before the build runs.

### Getting Runpod credentials

1. Sign up/login at https://runpod.io
2. Create a Serverless Endpoint (Stable Diffusion or your chat worker)
3. Copy the Endpoint ID from the URL
4. Generate an API key from Account Settings

### Test

After deploy:
1. Open https://dreamforge.apps.nubeku.com (or your custom domain)
2. Hit `/admin` and try an image generation
3. Check Nubeku runtime logs if something fails

## Status

Production host is **Nubeku**, not Vercel. Nubeku injects its own insights script; do not re-add `@vercel/analytics`.
