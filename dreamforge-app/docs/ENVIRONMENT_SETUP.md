# Environment Variables Setup Guide

## Overview

DreamForge uses environment variables to securely manage API keys and configuration. Never hardcode secrets in your code!

## Quick Setup

### Local Development

1. Copy the example file:
```bash
cp .env.local.example .env.local
```

2. Edit `.env.local` and add your actual API keys:
```env
RUNPOD_API_URL=https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/run
RUNPOD_API_KEY=your_actual_runpod_key_here
```

### Production (Vercel)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **Environment Variables**
4. Add each variable with its production value
5. **Important**: Select all environments (Production, Preview, Development)
6. Redeploy your application

## Required Environment Variables

### Runpod (AI Image Generation)

| Variable | Description | How to Get |
|----------|-------------|------------|
| `RUNPOD_API_URL` | Your Runpod serverless endpoint URL | 1. Login to [Runpod](https://runpod.io)<br>2. Create a Serverless Endpoint<br>3. Copy the endpoint URL<br>Format: `https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/run` |
| `RUNPOD_API_KEY` | Runpod API authentication key | 1. Go to [Runpod Settings](https://runpod.io/settings)<br>2. Navigate to API Keys<br>3. Create a new API key<br>4. Copy immediately (shown only once) |

## Optional Environment Variables

### Supabase (Database)

| Variable | Description | Location in Supabase |
|----------|-------------|---------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anonymous/Public key | Project Settings → API → anon public |
| `SUPABASE_SERVICE_KEY` | Service role key (backend only) | Project Settings → API → service_role |

### Stripe (Payments)

| Variable | Description | Location in Stripe |
|----------|-------------|-------------------|
| `STRIPE_SECRET_KEY` | Secret API key | Developers → API keys → Secret key |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | Developers → Webhooks → Signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Publishable key | Developers → API keys → Publishable key |

### Google Gemini (AI)

| Variable | Description | How to Get |
|----------|-------------|------------|
| `NANO_BANANA_API_KEY` | Google Gemini API key | [Google AI Studio](https://makersuite.google.com/app/apikey) |

## Environment Files Reference

```
.env.local           # Local development (NEVER commit)
.env.local.example   # Template with placeholders (safe to commit)
.env.production      # Production reference (no actual values)
```

## Vercel Environment Variables

### Adding Variables in Vercel

1. Navigate to your project in Vercel Dashboard
2. Go to **Settings** → **Environment Variables**
3. Click **Add New**
4. Enter:
   - **Key**: The variable name (e.g., `RUNPOD_API_KEY`)
   - **Value**: Your actual API key
   - **Environment**: Select where it applies:
     - ✅ Production
     - ✅ Preview
     - ✅ Development (optional)
5. Click **Save**

### Important Notes for Vercel

- Variables are automatically injected at build time
- Changes require redeployment to take effect
- Use different values for development vs production
- Vercel encrypts all environment variables

## Security Best Practices

### DO ✅

- Store all secrets in environment variables
- Use `.env.local` for local development only
- Add different keys for development and production
- Rotate keys regularly (every 90 days)
- Use minimal permissions for API keys

### DON'T ❌

- Commit `.env.local` to Git
- Share API keys in messages or documentation
- Use the same keys for multiple environments
- Hardcode secrets in your code
- Log or display secrets in console

## Verification

### Check Local Environment

```bash
npm run verify-env
```

This will verify:
- Required variables are set
- No placeholder values remain
- No suspicious patterns detected

### Check for Exposed Secrets

```bash
npm run security-check
```

This scans your codebase for accidentally hardcoded secrets.

## Troubleshooting

### "API key not configured" Error

1. Verify the environment variable is set:
   - Local: Check `.env.local`
   - Production: Check Vercel Dashboard

2. Ensure no typos in variable names

3. For Vercel: Redeploy after adding variables

### "Invalid API key" Error

1. Verify the key is correct and active
2. Check if the key has been rotated/revoked
3. Ensure you're using the right environment's key

### Variables Not Loading

1. Restart your development server after changing `.env.local`
2. Clear Next.js cache: `rm -rf .next`
3. For Vercel: Trigger a new deployment

## Support

For help with environment setup:
- Check [SECURITY.md](../SECURITY.md) for security guidelines
- Review [VERCEL_ENV_SETUP.md](../VERCEL_ENV_SETUP.md) for Vercel-specific instructions
- Open an issue on GitHub for technical problems