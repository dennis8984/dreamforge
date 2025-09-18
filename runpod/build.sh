#!/bin/bash

# Runpod Docker Build Script
# Run this on a machine with Docker installed, or use GitHub Actions

DOCKER_USERNAME=${1:-"dennisf598"}
IMAGE_NAME="dreamforge-gpu"
TAG="latest"

echo "Building Docker image for Runpod..."
echo "Docker Hub Username: $DOCKER_USERNAME"
echo ""

# Build the image
echo "Step 1: Building image..."
docker build -t $IMAGE_NAME:$TAG .

# Tag for Docker Hub
echo "Step 2: Tagging image..."
docker tag $IMAGE_NAME:$TAG $DOCKER_USERNAME/$IMAGE_NAME:$TAG

# Push to Docker Hub
echo "Step 3: Pushing to Docker Hub..."
echo "Please make sure you're logged in to Docker Hub (docker login)"
docker push $DOCKER_USERNAME/$IMAGE_NAME:$TAG

echo ""
echo "✅ Build complete!"
echo "Image available at: $DOCKER_USERNAME/$IMAGE_NAME:$TAG"
echo ""
echo "Next steps:"
echo "1. Go to https://www.runpod.io/console/serverless"
echo "2. Create new endpoint"
echo "3. Use image: $DOCKER_USERNAME/$IMAGE_NAME:$TAG"
echo "4. Set these environment variables in Runpod:"
echo "   - NANO_BANANA_API_KEY"
echo "   - AWS_ACCESS_KEY_ID (optional)"
echo "   - AWS_SECRET_ACCESS_KEY (optional)"
echo "   - REDIS_HOST (optional)"