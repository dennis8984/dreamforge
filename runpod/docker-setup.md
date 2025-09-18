# Docker Setup for Runpod Deployment

## Your Docker Hub Credentials
- **Username**: dennisf598
- **Token**: dckr_pat_d0JDodfMsd_CJmRFlrA6f1g5GB0

## Quick Setup Steps

### Step 1: Add Secrets to GitHub
1. Go to: https://github.com/dennis8984/dreamforge/settings/secrets/actions
2. Click "New repository secret"
3. Add these two secrets:
   - Name: `DOCKER_USERNAME`
   - Value: `dennisf598`

   - Name: `DOCKER_TOKEN`
   - Value: `dckr_pat_d0JDodfMsd_CJmRFlrA6f1g5GB0`

### Step 2: Trigger the Build
Once secrets are added, the GitHub Action will automatically build and push your Docker image.

To manually trigger:
1. Go to: https://github.com/dennis8984/dreamforge/actions
2. Click on "Build and Deploy Runpod Container"
3. Click "Run workflow"

### Step 3: Your Docker Image
After the build completes, your image will be available at:
```
dennisf598/dreamforge-gpu:latest
```

### Step 4: Use in Runpod
When creating your Runpod endpoint, use:
- Container Image: `dennisf598/dreamforge-gpu:latest`

## Manual Build (Optional)
If you want to build locally using Cloud Shell or another machine with Docker:

```bash
# Login to Docker Hub
docker login -u dennisf598 -p dckr_pat_d0JDodfMsd_CJmRFlrA6f1g5GB0

# Build the image
cd runpod
docker build -t dreamforge-gpu .

# Tag for your Docker Hub
docker tag dreamforge-gpu:latest dennisf598/dreamforge-gpu:latest

# Push to Docker Hub
docker push dennisf598/dreamforge-gpu:latest
```

## Important Notes
- The handler_simple.py runs INSIDE the container on Runpod
- Docker credentials are only needed for building/pushing the container
- Your Nano Banana API key goes in Runpod's environment variables, not in the code