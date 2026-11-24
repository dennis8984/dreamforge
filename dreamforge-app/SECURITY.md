# Security Configuration Guide

## ⚠️ CRITICAL SECURITY NOTICE

**NEVER commit API keys, tokens, or secrets to version control!**

All sensitive credentials must be stored in environment variables and added through Nubeku secrets (https://dash.nubeku.com).

## Environment Variables Setup

### Required Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `RUNPOD_API_KEY` | Runpod API authentication key | https://runpod.io → Account Settings → API Keys |
| `RUNPOD_API_URL` | Runpod endpoint URL | https://runpod.io → Serverless → Your Endpoint URL |

### Optional Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | https://supabase.com → Project Settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | https://supabase.com → Project Settings → API |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | https://supabase.com → Project Settings → API |
| `STRIPE_SECRET_KEY` | Stripe secret key | https://stripe.com → Developers → API Keys |
| `NANO_BANANA_API_KEY` | Google Gemini API key | https://makersuite.google.com/app/apikey |

## Local Development

1. Copy `.env.local.example` to `.env.local`
2. Fill in your actual values
3. **Never commit `.env.local` to git**

```bash
cp .env.local.example .env.local
# Edit .env.local with your actual values
```

## Production Deployment (Nubeku)

1. Go to [Nubeku Dashboard](https://dash.nubeku.com)
2. Select your DreamForge app
3. Open Secrets / environment variables
4. Add each variable with its production value (mark secrets appropriately)
5. Redeploy or push so the new secrets load (set `NEXT_PUBLIC_*` before build)

## Security Best Practices

1. **Rotate Keys Regularly**: Change API keys every 90 days
2. **Use Different Keys**: Never use the same keys for development and production
3. **Limit Permissions**: Use keys with minimal required permissions
4. **Monitor Usage**: Regularly check API usage for anomalies
5. **Enable 2FA**: Enable two-factor authentication on all service accounts

## If Keys Are Exposed

If you accidentally commit secrets:

1. **Immediately revoke** the exposed keys
2. Generate new keys from the service provider
3. Update environment variables in all deployments
4. Remove the commit from history using BFG Repo-Cleaner:

```bash
# Download BFG Repo-Cleaner
wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar

# Remove all files with secrets
java -jar bfg-1.14.0.jar --delete-files .env.local
java -jar bfg-1.14.0.jar --replace-text passwords.txt

# Clean up the repo
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# Force push (coordinate with team)
git push --force
```

## Preventing Future Leaks

### Pre-commit Hook

Add this to `.git/hooks/pre-commit`:

```bash
#!/bin/sh
# Check for potential secrets
if git diff --cached | grep -E "(api_key|api_secret|access_token|RUNPOD_API_KEY|SUPABASE.*KEY)" | grep -v "example\|placeholder\|YOUR_.*_HERE"; then
    echo "⚠️  Potential secrets detected in commit!"
    echo "Please review your changes and remove any sensitive data."
    exit 1
fi
```

### GitHub Actions Secret Scanning

Add `.github/workflows/secret-scan.yml`:

```yaml
name: Secret Scanning
on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Contact

If you discover a security vulnerability, please email security@dreamforge.app immediately.