# Fix Docker Hub Authentication Error

## The Problem
The error "access token has insufficient scopes" means your Docker token needs more permissions.

## Solution: Create a New Docker Access Token

### Step 1: Create New Token with Correct Permissions
1. Go to: https://hub.docker.com/settings/security
2. Click "New Access Token"
3. Set:
   - **Description**: dreamforge-github-actions
   - **Access permissions**: Select **"Read, Write, Delete"** (IMPORTANT!)
4. Click "Generate"
5. Copy the new token (it starts with `dckr_pat_`)

### Step 2: Update GitHub Secret
1. Go to: https://github.com/dennis8984/dreamforge/settings/secrets/actions
2. Click on `DOCKER_TOKEN`
3. Click "Update secret"
4. Paste the NEW token (with Read, Write, Delete permissions)
5. Click "Update secret"

### Step 3: Re-run the GitHub Action
1. Go to: https://github.com/dennis8984/dreamforge/actions
2. Click on the failed workflow
3. Click "Re-run all jobs"

## Alternative: Manual Build Using Google Cloud Shell

If GitHub Actions continues to fail, use this method:

### Option 1: Use Google Cloud Shell (FREE)
1. Open: https://shell.cloud.google.com
2. Run these commands:

```bash
# Clone your repository
git clone https://github.com/dennis8984/dreamforge.git
cd dreamforge/runpod

# Login to Docker Hub (use your new token)
docker login -u dennisf598
# When prompted for password, paste your new token

# Build the image
docker build -t dennisf598/dreamforge-gpu:latest .

# Push to Docker Hub
docker push dennisf598/dreamforge-gpu:latest
```

### Option 2: Use Play with Docker (FREE)
1. Go to: https://labs.play-with-docker.com
2. Click "Start"
3. Click "Add New Instance"
4. Run the same commands as above

## Verify Token Permissions

Your Docker token should have these permissions:
- ✅ Read (pull images)
- ✅ Write (push images)
- ✅ Delete (optional, but recommended)

## Test Your Token Locally

You can test if your token works:
```bash
# On any machine with Docker:
docker login -u dennisf598 -p YOUR_NEW_TOKEN
docker pull hello-world
docker tag hello-world dennisf598/test:latest
docker push dennisf598/test:latest
```

If the push works, your token has the right permissions.

## Quick Checklist

- [ ] Created new Docker token with Read/Write/Delete permissions
- [ ] Updated DOCKER_TOKEN in GitHub Secrets
- [ ] Re-ran the GitHub Action
- [ ] Or used Cloud Shell/Play with Docker as alternative

## Your Container Details

Once successfully built, your container will be at:
```
docker pull dennisf598/dreamforge-gpu:latest
```

Use this in Runpod:
- Container Image: `dennisf598/dreamforge-gpu:latest`
- Environment Variables: `NANO_BANANA_API_KEY=your_key`