# Vercel Environment Variables Setup

## CRITICAL: Add these to Vercel for production to work!

Go to your Vercel Dashboard → Project Settings → Environment Variables and add:

### Required Environment Variables

| Variable | Value |
|----------|-------|
| `RUNPOD_API_URL` | `https://api.runpod.ai/v2/ga8coh1zc01r57/run` |
| `RUNPOD_API_KEY` | `rpa_S3JTVFGGKN706EK4XJ5RTJ577JRY6OC7PERX57HC1sp1yl` |

### How to Add:

1. Go to https://vercel.com/dashboard
2. Select your project: `dreamforge-app`
3. Click on "Settings" tab
4. Click on "Environment Variables" in the left sidebar
5. Add each variable:
   - Name: `RUNPOD_API_URL`
   - Value: `https://api.runpod.ai/v2/ga8coh1zc01r57/run`
   - Environment: Select "Production", "Preview", and "Development"
   - Click "Save"
6. Repeat for `RUNPOD_API_KEY`
7. **IMPORTANT**: After adding variables, you must redeploy for changes to take effect

### Verify Your Runpod Worker

Your worker is now active at: `ga8coh1zc01r57`

Jobs are being queued successfully. If images are taking long to generate:
- Check your Runpod dashboard for worker status
- Ensure your worker has GPU resources available
- Check if the worker is scaled down (serverless) and needs to warm up

### Test Your Setup

After deploying to Vercel with these environment variables:
1. Go to your production URL
2. Navigate to `/admin?admin=true`
3. Create a model and try generating an image
4. The image should generate successfully

## Current Status

✅ API connection working
✅ Jobs being queued successfully
✅ New endpoint configured correctly

The system is ready for production once you add these environment variables to Vercel!