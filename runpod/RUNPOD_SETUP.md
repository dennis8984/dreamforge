# Runpod GPU Deployment Guide

## Quick Setup (Without Docker on Local Machine)

Since Docker isn't installed locally, you have 3 options:

### Option 1: Use GitHub Actions (Recommended)
1. Go to your GitHub repository settings
2. Add these secrets:
   - `DOCKER_USERNAME`: Your Docker Hub username
   - `DOCKER_TOKEN`: Your Docker Hub access token
3. Push changes to trigger the workflow:
   ```bash
   git add .
   git commit -m "Add Runpod deployment"
   git push
   ```
4. The GitHub Action will automatically build and push to Docker Hub

### Option 2: Use Runpod's Template
1. Go to [Runpod Console](https://www.runpod.io/console/serverless)
2. Click "New Endpoint"
3. Select "Custom Container"
4. Use this pre-built image: `runpod/base:0.6.2-cuda12.2.0`
5. Upload your `handler_simple.py` directly in Runpod

### Option 3: Use Cloud Shell
1. Open [Google Cloud Shell](https://shell.cloud.google.com) (free)
2. Clone your repo:
   ```bash
   git clone https://github.com/dennis8984/dreamforge.git
   cd dreamforge/runpod
   ```
3. Build and push:
   ```bash
   docker build -t YOUR_DOCKERHUB/dreamforge-gpu .
   docker push YOUR_DOCKERHUB/dreamforge-gpu:latest
   ```

## Setting Up Runpod Endpoint

### Step 1: Create Runpod Account
1. Sign up at [runpod.io](https://www.runpod.io)
2. Add credits ($10 minimum for testing)

### Step 2: Create Serverless Endpoint
1. Go to Serverless > Endpoints
2. Click "New Endpoint"
3. Configure:
   - **Name**: dreamforge-ai-generator
   - **Select GPU**:
     - Testing: RTX 3090 ($0.00014/sec)
     - Production: RTX 4090 ($0.00020/sec)
     - High Performance: A100 ($0.00044/sec)
   - **Container Image**:
     - If using Docker Hub: `YOUR_DOCKERHUB/dreamforge-gpu:latest`
     - If using template: `runpod/base:0.6.2-cuda12.2.0`
   - **Container Disk**: 10 GB
   - **Max Workers**: 3
   - **Idle Timeout**: 5 seconds (to save costs)

### Step 3: Set Environment Variables
Add these in Runpod dashboard:
```
NANO_BANANA_API_KEY=your_google_gemini_api_key
```

Optional (if using S3):
```
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
S3_BUCKET_NAME=dreamforge-images
```

### Step 4: Get Your Endpoint URL
After creation, you'll get:
- **Endpoint ID**: `xxxxxx`
- **API URL**: `https://api.runpod.ai/v2/xxxxxx/runsync`
- **API Key**: `xxxxxxxx`

### Step 5: Update Vercel Environment Variables
Add to Vercel dashboard:
```
RUNPOD_API_URL=https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/runsync
RUNPOD_API_KEY=your_runpod_api_key
```

## Testing Your Endpoint

### Using cURL:
```bash
curl -X POST https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/runsync \
  -H "Authorization: Bearer YOUR_RUNPOD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "prompt": "A beautiful sunset over mountains",
      "parameters": {
        "temperature": 0.7
      }
    }
  }'
```

### Expected Response:
```json
{
  "status": "COMPLETED",
  "output": {
    "status": "success",
    "image_base64": "iVBORw0KGgoAAAANS...",
    "generation_time_ms": 1500,
    "width": 512,
    "height": 512
  }
}
```

## Cost Optimization

### Pricing Breakdown:
- **RTX 3090**: $0.00014/sec (~$0.28 per 2000 seconds)
- **RTX 4090**: $0.00020/sec (~$0.40 per 2000 seconds)
- **A100**: $0.00044/sec (~$0.88 per 2000 seconds)

### Cost per 1000 generations (2 sec avg):
- **RTX 3090**: $0.56
- **RTX 4090**: $0.80
- **A100**: $1.76

### Tips to Reduce Costs:
1. Set idle timeout to 5 seconds
2. Use RTX 3090 for testing
3. Implement caching to avoid duplicate generations
4. Use spot instances when available (30% cheaper)
5. Monitor usage in Runpod dashboard

## Monitoring

Check your endpoint performance:
1. Go to Runpod Console > Endpoints
2. Click on your endpoint
3. View:
   - Request count
   - Average latency
   - Error rate
   - Cost breakdown

## Troubleshooting

### Common Issues:

1. **"CUDA out of memory"**
   - Reduce image size
   - Lower batch size
   - Use larger GPU

2. **"Module not found"**
   - Check requirements.txt
   - Rebuild Docker image
   - Verify base image has Python 3.9+

3. **Slow generation**
   - Check GPU utilization
   - Optimize model loading
   - Use GPU with more VRAM

4. **High costs**
   - Reduce idle timeout
   - Implement better caching
   - Use RTX 3090 instead of A100

## Alternative: Use Replicate.com

If Runpod setup is complex, consider [Replicate](https://replicate.com):
1. Push model to Replicate
2. Get API endpoint instantly
3. Pay per generation (~$0.005 per image)
4. No infrastructure management

## Support

- Runpod Discord: [discord.gg/runpod](https://discord.gg/pJ3P2DbUUq)
- Documentation: [docs.runpod.io](https://docs.runpod.io)
- Status Page: [status.runpod.io](https://status.runpod.io)