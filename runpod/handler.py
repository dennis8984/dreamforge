import runpod
import os
import hashlib
import json
import boto3
from io import BytesIO
from PIL import Image
import google.genai as genai
from datetime import datetime
import redis

# Initialize services
genai_client = genai.Client(api_key=os.environ.get("NANO_BANANA_API_KEY"))
s3_client = boto3.client(
    's3',
    aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
    region_name=os.environ.get("AWS_REGION", "us-west-2")
)
redis_client = redis.Redis(
    host=os.environ.get("REDIS_HOST"),
    port=int(os.environ.get("REDIS_PORT", 6379)),
    decode_responses=True
)

BUCKET_NAME = os.environ.get("S3_BUCKET_NAME", "dreamforge-images")
MODEL_NAME = "gemini-2.5-flash-image-preview"

def generate_image(prompt, parameters=None):
    """Generate image using Nano Banana SDK"""
    try:
        generation_config = genai.types.GenerationConfig(
            temperature=parameters.get("temperature", 0.7) if parameters else 0.7,
            top_p=parameters.get("top_p", 0.95) if parameters else 0.95,
            max_output_tokens=parameters.get("max_tokens", 8192) if parameters else 8192,
        )

        response = genai_client.models.generate_content(
            model=MODEL_NAME,
            contents=[prompt],
            config=generation_config
        )

        for part in response.candidates[0].content.parts:
            if hasattr(part, 'inline_data') and part.inline_data is not None:
                image_data = part.inline_data.data
                return Image.open(BytesIO(image_data))

    except Exception as e:
        raise Exception(f"Generation failed: {str(e)}")

def upload_to_s3(image, user_id, image_hash):
    """Upload image to S3 and return URL"""
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    buffer.seek(0)

    key = f"generations/{user_id}/{image_hash}.png"

    s3_client.put_object(
        Bucket=BUCKET_NAME,
        Key=key,
        Body=buffer.getvalue(),
        ContentType='image/png',
        ACL='public-read'
    )

    return f"https://{BUCKET_NAME}.s3.amazonaws.com/{key}"

def check_cache(prompt_hash):
    """Check Redis cache for existing generation"""
    try:
        cached = redis_client.get(f"generation:{prompt_hash}")
        if cached:
            return json.loads(cached)
    except:
        pass
    return None

def cache_result(prompt_hash, result, ttl=7200):
    """Cache generation result for 2 hours"""
    try:
        redis_client.setex(
            f"generation:{prompt_hash}",
            ttl,
            json.dumps(result)
        )
    except:
        pass

def handler(job):
    """
    Main handler for Runpod serverless endpoint
    Expected input:
    {
        "input": {
            "prompt": "A beautiful sunset over mountains",
            "user_id": "user-123",
            "model_id": "model-456",
            "parameters": {
                "temperature": 0.7,
                "guidance_scale": 7.5
            }
        }
    }
    """
    try:
        # Extract input
        input_data = job["input"]
        prompt = input_data["prompt"]
        user_id = input_data["user_id"]
        model_id = input_data.get("model_id")
        parameters = input_data.get("parameters", {})

        # Generate cache key
        prompt_hash = hashlib.md5(f"{prompt}{json.dumps(parameters)}".encode()).hexdigest()

        # Check cache first
        cached = check_cache(prompt_hash)
        if cached:
            return {
                "status": "success",
                "image_url": cached["image_url"],
                "cached": True,
                "generation_time_ms": 0,
                "width": cached.get("width", 512),
                "height": cached.get("height", 512)
            }

        # Start timing
        start_time = datetime.now()

        # Generate image
        image = generate_image(prompt, parameters)

        # Upload to S3
        image_url = upload_to_s3(image, user_id, prompt_hash)

        # Calculate generation time
        generation_time = int((datetime.now() - start_time).total_seconds() * 1000)

        # Prepare result
        result = {
            "status": "success",
            "image_url": image_url,
            "cached": False,
            "generation_time_ms": generation_time,
            "width": image.width,
            "height": image.height
        }

        # Cache the result
        cache_result(prompt_hash, result)

        return result

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

# Start the serverless handler
runpod.serverless.start({
    "handler": handler,
    "return_aggregate_stream": True
})