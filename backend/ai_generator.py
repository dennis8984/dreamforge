import os
import hashlib
import json
import uuid
from typing import Dict, Optional, List
from io import BytesIO
import asyncio
from datetime import datetime
import boto3
from PIL import Image
import google.genai as genai
from google.genai import types
import redis
from dotenv import load_dotenv

load_dotenv()

class NanoBananaGenerator:
    def __init__(self):
        self.api_key = os.getenv("NANO_BANANA_API_KEY")
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None
        self.model = "gemini-2.5-flash-image-preview"
        self.redis_client = redis.Redis(
            host=os.getenv("REDIS_HOST", "localhost"),
            port=int(os.getenv("REDIS_PORT", 6379)),
            decode_responses=True
        )
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
            region_name=os.getenv("AWS_REGION", "us-west-2")
        )
        self.bucket_name = os.getenv("S3_BUCKET_NAME", "dreamforge-images")

    async def generate_from_text(self, prompt: str, user_id: str, parameters: Optional[Dict] = None):
        """Generate image from text prompt using Nano Banana SDK"""
        if not self.client:
            raise ValueError("Nano Banana API key not configured")

        prompt_hash = hashlib.md5(f"{prompt}{json.dumps(parameters or {})}".encode()).hexdigest()

        cached = await self.get_cached_result(prompt_hash)
        if cached:
            return {
                "status": "success",
                "image_url": cached,
                "cached": True,
                "generation_time_ms": 0
            }

        start_time = datetime.now()

        try:
            generation_config = types.GenerationConfig(
                temperature=parameters.get("temperature", 0.7) if parameters else 0.7,
                top_p=parameters.get("top_p", 0.95) if parameters else 0.95,
                max_output_tokens=parameters.get("max_tokens", 8192) if parameters else 8192,
            )

            response = self.client.models.generate_content(
                model=self.model,
                contents=[prompt],
                config=generation_config
            )

            for part in response.candidates[0].content.parts:
                if hasattr(part, 'inline_data') and part.inline_data is not None:
                    image_data = part.inline_data.data
                    image = Image.open(BytesIO(image_data))

                    image_url = await self.store_and_serve_image(image, user_id, prompt_hash)
                    generation_time = int((datetime.now() - start_time).total_seconds() * 1000)

                    await self.cache_result(prompt_hash, image_url)

                    return {
                        "status": "success",
                        "image_url": image_url,
                        "cached": False,
                        "generation_time_ms": generation_time,
                        "width": image.width,
                        "height": image.height
                    }

            return {
                "status": "error",
                "message": "No image generated from prompt"
            }

        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }

    async def modify_existing_image(self, base_image_path: str, modification_prompt: str, user_id: str):
        """Modify an existing image using image-to-text capabilities"""
        if not self.client:
            raise ValueError("Nano Banana API key not configured")

        try:
            with open(base_image_path, 'rb') as f:
                base_image_data = f.read()

            base_image = Image.open(BytesIO(base_image_data))

            prompt = [
                {"text": modification_prompt},
                {"inline_data": {"mime_type": "image/jpeg", "data": base_image_data}}
            ]

            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt
            )

            for part in response.candidates[0].content.parts:
                if hasattr(part, 'inline_data') and part.inline_data is not None:
                    modified_image_data = part.inline_data.data
                    modified_image = Image.open(BytesIO(modified_image_data))

                    image_hash = hashlib.md5(modified_image_data).hexdigest()
                    image_url = await self.store_and_serve_image(modified_image, user_id, image_hash)

                    return {
                        "status": "success",
                        "image_url": image_url,
                        "width": modified_image.width,
                        "height": modified_image.height
                    }

            return {
                "status": "error",
                "message": "No modified image generated"
            }

        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }

    async def store_and_serve_image(self, image: Image.Image, user_id: str, image_hash: str) -> str:
        """Store image to S3 and return URL"""
        image_buffer = BytesIO()
        image.save(image_buffer, format="PNG")
        image_buffer.seek(0)

        key = f"generations/{user_id}/{image_hash}.png"

        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=image_buffer.getvalue(),
                ContentType='image/png',
                ACL='public-read'
            )

            return f"https://{self.bucket_name}.s3.amazonaws.com/{key}"
        except Exception as e:
            print(f"Error uploading to S3: {e}")
            return f"/api/images/{image_hash}.png"

    async def get_cached_result(self, prompt_hash: str) -> Optional[str]:
        """Retrieve cached generation result"""
        try:
            cached = self.redis_client.get(f"generation:{prompt_hash}")
            if cached:
                return json.loads(cached).get("image_url")
        except:
            pass
        return None

    async def cache_result(self, prompt_hash: str, image_url: str, ttl: int = 7200):
        """Cache generation result for 2 hours"""
        try:
            self.redis_client.setex(
                f"generation:{prompt_hash}",
                ttl,
                json.dumps({"image_url": image_url, "timestamp": datetime.now().isoformat()})
            )
        except:
            pass

class ModelCache:
    def __init__(self):
        self.redis_client = redis.Redis(
            host=os.getenv("REDIS_HOST", "localhost"),
            port=int(os.getenv("REDIS_PORT", 6379)),
            decode_responses=True
        )

    def cache_model_metadata(self, model_id: str, metadata: Dict, ttl: int = 3600):
        """Cache model data with 1-hour TTL"""
        key = f"model:{model_id}"
        try:
            self.redis_client.setex(key, ttl, json.dumps(metadata))
        except:
            pass

    def get_model_metadata(self, model_id: str) -> Optional[Dict]:
        """Get cached model metadata"""
        try:
            cached = self.redis_client.get(f"model:{model_id}")
            if cached:
                return json.loads(cached)
        except:
            pass
        return None

    def invalidate_model_cache(self, model_id: str):
        """Remove model from cache"""
        try:
            self.redis_client.delete(f"model:{model_id}")
        except:
            pass