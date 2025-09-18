# Runpod Setup Guide

## ⚠️ IMPORTANT: You must set up Runpod API credentials for image generation to work!

The application is currently not generating images because the Runpod API key is not configured.

## Step 1: Get Your Runpod Credentials

1. Go to [Runpod.io](https://runpod.io)
2. Sign up or log in to your account
3. Navigate to your API Keys section
4. Create a new API key and copy it

## Step 2: Get Your Endpoint ID

1. In Runpod, go to "Serverless" → "Endpoints"
2. Create a new endpoint with Stable Diffusion XL template, or use your existing endpoint
3. Copy your Endpoint ID from the URL (it looks like: `xez46ruk06q834`)
4. Your full API URL will be: `https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/run`

## Step 3: Set Environment Variables

### For Local Development:

Edit `.env.local` file:
```env
RUNPOD_API_URL=https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/run
RUNPOD_API_KEY=YOUR_ACTUAL_API_KEY_HERE
```

### For Production (Vercel):

1. Go to your [Vercel Dashboard](https://vercel.com)
2. Select your project (dreamforge-app)
3. Go to Settings → Environment Variables
4. Add these variables:

| Key | Value | Environment |
|-----|-------|------------|
| RUNPOD_API_URL | https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/run | Production |
| RUNPOD_API_KEY | YOUR_ACTUAL_API_KEY_HERE | Production |

5. Click "Save" for each variable
6. **IMPORTANT**: Redeploy your application for changes to take effect

## Step 4: Verify Setup

After setting the environment variables:

1. The application should start making actual API calls to Runpod
2. You should see activity in your Runpod console
3. Images should generate successfully

## Troubleshooting

If images are still not generating:

1. Check the browser console for errors
2. Verify your API key is correct (no extra spaces)
3. Ensure your Runpod endpoint is active and running
4. Check your Runpod account has credits/balance

## Current Issue

The app is currently using placeholder values:
- API Key: `your_runpod_api_key_here` (NOT VALID)
- This prevents any actual API calls to Runpod

Once you add your real API key, the application will work properly!