# 🚀 Runpod Endpoint Deployment Complete!

## Your Runpod Details
- **Endpoint URL**: `https://api.runpod.ai/v2/xez46ruk06q834/run`
- **Endpoint ID**: `xez46ruk06q834`

## Next Steps

### 1. Get Your Runpod API Key
1. Go to [Runpod Settings](https://www.runpod.io/console/user/settings)
2. Find or create an API Key
3. Copy the key

### 2. Test Your Endpoint
Run this command with your API key:
```bash
node test-runpod.js YOUR_RUNPOD_API_KEY
```

Or test with cURL:
```bash
curl -X POST https://api.runpod.ai/v2/xez46ruk06q834/run \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "prompt": "A beautiful sunset",
      "parameters": {"temperature": 0.7}
    }
  }'
```

### 3. Configure Your Endpoint in Runpod

Go to your [Runpod Console](https://www.runpod.io/console/serverless) and configure:

#### Container Settings:
- **Container Image**: `dennisf598/dreamforge-gpu:latest`
- **Container Registry Credentials**: (if private)
  - Username: `dennisf598`
  - Password: Your Docker token

#### Environment Variables:
Add these in Runpod dashboard:
```
NANO_BANANA_API_KEY=your_gemini_api_key_here
```

#### GPU Configuration:
- **For Testing**: RTX 3090 (cheapest)
- **For Production**: RTX 4090 or A100
- **Max Workers**: 3
- **Idle Timeout**: 5 seconds (saves money)

### 4. Update Vercel Environment Variables

Add these to your Vercel project:
1. Go to: https://vercel.com/your-username/dreamforge/settings/environment-variables
2. Add:
```
RUNPOD_API_URL=https://api.runpod.ai/v2/xez46ruk06q834/run
RUNPOD_API_KEY=your_runpod_api_key
NANO_BANANA_API_KEY=your_gemini_api_key_here
```

### 5. Deploy to Vercel

```bash
# If you haven't deployed yet:
vercel

# Or push to GitHub (auto-deploys if connected):
git add .
git commit -m "Configure Runpod endpoint"
git push
```

## Testing the Full Flow

### Local Testing:
1. Update `.env.local` with your Runpod API key
2. Restart your dev server
3. Try generating an image in the UI

### Production Testing:
1. Deploy to Vercel
2. Visit your-app.vercel.app
3. Try the generation feature

## Cost Management

### Current Pricing:
- **Idle**: $0/hour (auto-scales to zero)
- **Active**: ~$0.50-1.44/hour depending on GPU
- **Per Generation**: ~$0.001-0.003 (2-3 seconds)

### Cost Optimization:
1. Set **Idle Timeout** to 5 seconds
2. Use **RTX 3090** for testing
3. Implement **caching** to avoid duplicate generations
4. Monitor usage in Runpod dashboard

## Monitoring Your Endpoint

1. Go to: https://www.runpod.io/console/serverless
2. Click on your endpoint
3. View:
   - Request count
   - Average latency
   - Error logs
   - Cost breakdown

## Troubleshooting

### If endpoint returns errors:
1. Check container logs in Runpod dashboard
2. Verify environment variables are set
3. Check if Docker image was pulled successfully

### If generation fails:
1. Verify NANO_BANANA_API_KEY is correct
2. Check Gemini API quotas
3. Look at error logs in Runpod

### If too expensive:
1. Reduce idle timeout
2. Use smaller GPU (RTX 3090)
3. Implement better caching

## Support Links

- **Runpod Dashboard**: https://www.runpod.io/console/serverless
- **Your Endpoint**: https://www.runpod.io/console/serverless/user/endpoint/xez46ruk06q834
- **Runpod Discord**: https://discord.gg/runpod
- **GitHub Repo**: https://github.com/dennis8984/dreamforge

## Quick Test URLs

Once deployed:
- **Local**: http://localhost:3000
- **Vercel**: https://dreamforge.vercel.app
- **API Test**: https://dreamforge.vercel.app/api/generate

Your Runpod endpoint is ready! Just add your API key and test it.