# Runpod Configuration Guide

## Quick Setup

### Step 1: Get Your Runpod API Key
1. Go to [Runpod.io](https://runpod.io)
2. Sign up or login to your account
3. Navigate to Settings → API Keys
4. Click "Create API Key"
5. Copy your API key

### Step 2: Deploy a Stable Diffusion Endpoint
1. In Runpod dashboard, go to "Serverless" → "Endpoints"
2. Click "New Endpoint"
3. Select "Stable Diffusion XL" template
4. Configure:
   - Name: `dreamforge-sdxl`
   - GPU Type: Select based on your budget (RTX 4090 recommended)
   - Min Workers: 0 (scales to zero when idle)
   - Max Workers: 3 (adjust based on expected load)
5. Click "Deploy"
6. Copy the Endpoint ID from the dashboard

### Step 3: Configure Environment Variables in Vercel

1. Go to your Vercel dashboard
2. Select your DreamForge project
3. Go to Settings → Environment Variables
4. Add these variables:

```
RUNPOD_API_KEY=runpod_YOUR_API_KEY_HERE
RUNPOD_API_URL=https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/runsync
```

### Step 4: For Local Development

Create or update `.env.local`:

```bash
RUNPOD_API_KEY=runpod_YOUR_API_KEY_HERE
RUNPOD_API_URL=https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/runsync
```

## Testing Your Setup

1. Restart your development server:
```bash
npm run dev
```

2. Go to `/admin/character?admin=true`
3. Try creating a character with "Start with Description"
4. If configured correctly, it should generate real images

## Endpoint URL Formats

Runpod supports two endpoint types:

- **Synchronous (recommended for small images):**
  ```
  https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/runsync
  ```

- **Asynchronous (for large batches):**
  ```
  https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/run
  ```

We use synchronous by default for immediate results.

## Cost Optimization

- Set Min Workers to 0 to avoid idle charges
- Use spot instances for 70% cost savings
- Monitor usage in Runpod dashboard
- Set spending limits in account settings

## Troubleshooting

### "Endpoint not found" Error
- Verify your endpoint ID is correct
- Ensure the endpoint is "Running" in Runpod dashboard

### "Authentication failed" Error
- Check that your API key starts with `runpod_`
- Verify the key hasn't expired

### Images not generating
- Check endpoint logs in Runpod dashboard
- Ensure you have credits in your account
- Verify the endpoint has available workers

## Support

For Runpod issues: https://runpod.io/support
For DreamForge issues: Create an issue in the GitHub repo