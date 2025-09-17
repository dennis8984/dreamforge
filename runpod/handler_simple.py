import runpod
import os
import hashlib
import json
import base64
from io import BytesIO
from PIL import Image
import google.genai as genai
from datetime import datetime

# Initialize Gemini client
genai_client = genai.Client(api_key=os.environ.get("NANO_BANANA_API_KEY"))
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

def image_to_base64(image):
    """Convert PIL Image to base64 string"""
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    buffer.seek(0)
    return base64.b64encode(buffer.getvalue()).decode('utf-8')

def handler(job):
    """
    Simplified handler for Runpod serverless endpoint
    Returns base64 encoded image directly

    Expected input:
    {
        "input": {
            "prompt": "A beautiful sunset over mountains",
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
        parameters = input_data.get("parameters", {})

        # Start timing
        start_time = datetime.now()

        # Generate image
        image = generate_image(prompt, parameters)

        # Convert to base64
        image_base64 = image_to_base64(image)

        # Calculate generation time
        generation_time = int((datetime.now() - start_time).total_seconds() * 1000)

        # Return result
        return {
            "status": "success",
            "image_base64": image_base64,
            "generation_time_ms": generation_time,
            "width": image.width,
            "height": image.height,
            "format": "png"
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

# Start the serverless handler
if __name__ == "__main__":
    runpod.serverless.start({
        "handler": handler,
        "return_aggregate_stream": True
    })