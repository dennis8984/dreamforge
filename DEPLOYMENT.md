# DreamForge Deployment Guide

## Complete deployment setup for Vercel + Supabase + Runpod

### Prerequisites
- GitHub account
- Vercel account
- Supabase account
- Runpod account
- Stripe account

## Step 1: Set up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. Run the schema setup:
   - Go to SQL Editor in Supabase dashboard
   - Copy contents from `supabase/schema.sql`
   - Execute the SQL

3. Get your credentials:
   - Project URL: `https://YOUR_PROJECT.supabase.co`
   - Anon Key: Found in Settings > API
   - Service Role Key: Found in Settings > API (keep secret!)

4. Enable Storage:
   - Go to Storage
   - Create bucket named `generated-images`
   - Set it to public

## Step 2: Deploy Runpod Serverless Endpoint

1. Create Runpod account at [runpod.io](https://runpod.io)

2. Build and deploy the Docker container:
   ```bash
   cd runpod
   docker build -t dreamforge-gpu .
   docker tag dreamforge-gpu:latest YOUR_DOCKERHUB/dreamforge-gpu:latest
   docker push YOUR_DOCKERHUB/dreamforge-gpu:latest
   ```

3. Create serverless endpoint in Runpod:
   - Choose GPU: RTX 4090 or A100
   - Container image: `YOUR_DOCKERHUB/dreamforge-gpu:latest`
   - Set environment variables:
     - `NANO_BANANA_API_KEY`
     - `AWS_ACCESS_KEY_ID`
     - `AWS_SECRET_ACCESS_KEY`
     - `REDIS_HOST` (optional, use Upstash Redis)

4. Get your endpoint URL:
   - `https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/runsync`

## Step 3: Push to GitHub

```bash
git add .
git commit -m "Initial commit - DreamForge AI Platform"
git remote add origin https://github.com/YOUR_USERNAME/dreamforge.git
git push -u origin main
```

## Step 4: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and click "Import Project"

2. Connect your GitHub repository

3. Configure environment variables in Vercel dashboard:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_KEY=your_service_key

   STRIPE_SECRET_KEY=sk_live_YOUR_KEY
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY

   RUNPOD_API_URL=https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/runsync
   RUNPOD_API_KEY=your_runpod_api_key

   NANO_BANANA_API_KEY=your_google_gemini_key
   ```

4. Deploy!

## Step 5: Configure Stripe Webhooks

1. Go to Stripe Dashboard > Webhooks
2. Add endpoint: `https://YOUR_DOMAIN.vercel.app/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
4. Copy webhook secret to Vercel env vars

## Production Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Vercel    │────▶│  Supabase   │     │   Runpod    │
│  (Frontend) │     │ (Database)  │     │   (GPU AI)  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                    │
       ▼                   ▼                    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Cloudflare │     │   Stripe    │     │  Redis/R2   │
│    (CDN)    │     │ (Payments)  │     │  (Storage)  │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Cost Breakdown (Monthly)

### For 10,000 generations/month:
- **Vercel Pro**: $20/month
- **Supabase**: Free tier (up to 500MB)
- **Runpod GPU**: ~$40 (2 sec/generation @ $0.0002/sec)
- **Cloudflare R2**: ~$5 (storage)
- **Total**: ~$65/month

### Scaling considerations:
- Runpod auto-scales to zero when idle
- Use Redis caching to reduce duplicate generations
- Implement CDN for all static assets
- Consider using spot instances for 70% cost reduction

## Monitoring & Analytics

1. **Vercel Analytics**: Built-in performance monitoring
2. **Supabase Dashboard**: Database metrics
3. **Runpod Dashboard**: GPU usage and costs
4. **Stripe Dashboard**: Revenue tracking

## Security Checklist

- [ ] All API keys in environment variables
- [ ] Supabase RLS policies enabled
- [ ] Rate limiting implemented
- [ ] Content moderation for generated images
- [ ] HTTPS enforced everywhere
- [ ] Webhook signatures verified

## Troubleshooting

### Common Issues:

1. **CORS errors**: Check Vercel CORS settings
2. **Slow generation**: Upgrade to faster GPU (A100/H100)
3. **Database connection**: Check Supabase connection pooling
4. **Payment failures**: Verify Stripe webhook configuration

## Support

- Vercel: [vercel.com/support](https://vercel.com/support)
- Supabase: [supabase.com/docs](https://supabase.com/docs)
- Runpod: [docs.runpod.io](https://docs.runpod.io)

## Next Steps

1. Set up custom domain
2. Implement analytics (Mixpanel/Amplitude)
3. Add social login (OAuth)
4. Implement model training pipeline
5. Add community features

---

Built with ❤️ for the Google Gemini Nano Banana Hackathon