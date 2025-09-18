# Setting Up Runpod for Real AI Image Generation

## Prerequisites
1. Create a Runpod account at https://www.runpod.ai/
2. Add credits to your account (minimum $10 recommended)

## Step 1: Create a Serverless Endpoint

1. Go to Runpod Console > Serverless
2. Click "New Endpoint"
3. Select "Stable Diffusion XL" template or use custom Docker image:
   ```
   runpod/stable-diffusion:sdxl-1.0
   ```
4. Configure endpoint settings:
   - Name: `dreamforge-sdxl`
   - Min Workers: 0 (scales to zero when not in use)
   - Max Workers: 3
   - Idle Timeout: 60 seconds
   - Container Disk: 20 GB
   - Worker Timeout: 300 seconds

## Step 2: Get Your API Credentials

1. After creating the endpoint, copy:
   - Endpoint ID (looks like: `xez46ruk06q834`)
   - API Key from your account settings

2. Your API URL will be:
   ```
   https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/run
   ```

## Step 3: Configure Environment Variables

### For Local Development
Add to `.env.local`:
```env
RUNPOD_API_KEY=your_runpod_api_key_here
RUNPOD_API_URL=https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/run
```

### For Production (Vercel)
1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add:
   - `RUNPOD_API_KEY` - Your Runpod API key
   - `RUNPOD_API_URL` - Your endpoint URL

## Step 4: Configure Supabase (Required for Production)

1. Run the migration in Supabase SQL editor:
```sql
-- Add capabilities column to ai_models table
ALTER TABLE ai_models
ADD COLUMN IF NOT EXISTS capabilities JSONB DEFAULT '{"max_resolution": "1024x1024", "styles": [], "speed": "fast"}'::jsonb;

-- Add nano_banana_model column if it doesn't exist
ALTER TABLE ai_models
ADD COLUMN IF NOT EXISTS nano_banana_model VARCHAR(255) DEFAULT 'gemini-2.5-flash-image-preview';

-- Update existing rows with default capabilities
UPDATE ai_models
SET capabilities = '{"max_resolution": "1024x1024", "styles": [], "speed": "fast"}'::jsonb
WHERE capabilities IS NULL;
```

2. Add Supabase credentials to Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Step 5: Test Your Setup

1. Check the generation API health:
   ```bash
   curl https://your-app.vercel.app/api/generate
   ```

   Should return:
   ```json
   {
     "status": "healthy",
     "runpod_configured": true,
     "gemini_configured": true,
     "models_available": ["gemini-2.5-flash-image-preview", "stable-diffusion-xl"],
     "message": "Real AI generation ready"
   }
   ```

2. Test generation through the UI:
   - Login to your app
   - Enter a prompt
   - Click "Generate with AI"
   - Should see real AI-generated images

## Troubleshooting

### "Mock generation" message appears
- Ensure `RUNPOD_API_KEY` is set in environment variables
- Redeploy after adding environment variables
- Check Vercel function logs for errors

### Generation fails with 401 error
- Verify your Runpod API key is correct
- Check if you have credits in your Runpod account

### Generation times out
- Increase worker timeout in Runpod endpoint settings
- Check if endpoint is running (may need to wake up from cold start)

### Supabase errors
- Run the migration SQL above
- Ensure Supabase credentials are correctly set
- Check Supabase dashboard for any table/column issues

## Cost Optimization

- Set Min Workers to 0 to avoid charges when idle
- Use smaller image sizes (512x512) for testing
- Monitor usage in Runpod dashboard
- Consider caching frequently requested prompts

## Support

For issues with:
- Runpod: https://docs.runpod.ai/
- Supabase: https://supabase.com/docs
- This app: Create an issue in the GitHub repository