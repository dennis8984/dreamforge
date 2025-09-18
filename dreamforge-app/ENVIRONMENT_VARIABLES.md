# Required Environment Variables for Vercel

## Runpod Configuration (Required for Real AI Generation)

Add these to your Vercel project settings under Environment Variables:

### 1. RUNPOD_API_KEY
- **Description**: Your Runpod API key
- **How to get**:
  1. Go to https://www.runpod.ai/
  2. Sign in to your account
  3. Go to Settings > API Keys
  4. Create a new API key
- **Example**: `rp_1234567890abcdef...`

### 2. RUNPOD_API_URL
- **Description**: Your Runpod serverless endpoint URL
- **How to get**:
  1. Go to Runpod Console > Serverless
  2. Create a new endpoint with Stable Diffusion XL
  3. Copy the endpoint ID from the dashboard
  4. Format: `https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/run`
- **Example**: `https://api.runpod.ai/v2/xez46ruk06q834/run`

## Supabase Configuration (Optional - for database)

### 3. NEXT_PUBLIC_SUPABASE_URL
- **Description**: Your Supabase project URL
- **Example**: `https://abcdefghijklmnop.supabase.co`

### 4. NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Description**: Your Supabase anonymous key
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## Google Gemini Configuration (Optional - uses default if not set)

### 5. NEXT_PUBLIC_GEMINI_API_KEY
- **Description**: Your Google Gemini API key for prompt enhancement
- **How to get**: https://makersuite.google.com/app/apikey
- **Note**: A default key is provided but may have rate limits

## How to Set in Vercel

1. Go to your Vercel project dashboard
2. Click on "Settings" tab
3. Navigate to "Environment Variables"
4. Add each variable:
   - Key: `RUNPOD_API_KEY`
   - Value: Your actual API key
   - Environment: Select all (Production, Preview, Development)
5. Click "Save"
6. Redeploy your project for changes to take effect

## Testing Your Configuration

After setting environment variables, check the API status:
```bash
curl https://your-app.vercel.app/api/generate
```

Should return:
```json
{
  "status": "healthy",
  "runpod_configured": true,
  "gemini_configured": true,
  "message": "Real AI generation ready"
}
```

If `runpod_configured` is false, double-check your RUNPOD_API_KEY and RUNPOD_API_URL variables.