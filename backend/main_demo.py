from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
import uuid
from datetime import datetime

app = FastAPI(title="DreamForge API Demo", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock data for demo
MOCK_MODELS = [
    {
        "id": str(uuid.uuid4()),
        "name": "Realistic Portrait Generator",
        "description": "Generate photorealistic portraits with stunning detail",
        "category": "realistic",
        "thumbnail_url": "https://via.placeholder.com/400x400/4F46E5/ffffff?text=Realistic",
        "is_premium": False,
        "is_featured": True,
        "view_count": 1523,
        "like_count": 342,
        "tags": ["portrait", "realistic", "human"]
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Anime Art Master",
        "description": "Create beautiful anime-style artwork",
        "category": "anime",
        "thumbnail_url": "https://via.placeholder.com/400x400/EC4899/ffffff?text=Anime",
        "is_premium": True,
        "is_featured": False,
        "view_count": 2891,
        "like_count": 623,
        "tags": ["anime", "manga", "japanese"]
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Abstract Dreams",
        "description": "Generate abstract and surreal artwork",
        "category": "abstract",
        "thumbnail_url": "https://via.placeholder.com/400x400/10B981/ffffff?text=Abstract",
        "is_premium": False,
        "is_featured": True,
        "view_count": 987,
        "like_count": 234,
        "tags": ["abstract", "surreal", "artistic"]
    },
    {
        "id": str(uuid.uuid4()),
        "name": "3D Render Pro",
        "description": "Create professional 3D rendered images",
        "category": "3d",
        "thumbnail_url": "https://via.placeholder.com/400x400/F59E0B/ffffff?text=3D",
        "is_premium": True,
        "is_featured": False,
        "view_count": 1456,
        "like_count": 412,
        "tags": ["3d", "render", "cgi"]
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Fantasy Worlds",
        "description": "Generate epic fantasy landscapes and characters",
        "category": "artistic",
        "thumbnail_url": "https://via.placeholder.com/400x400/8B5CF6/ffffff?text=Fantasy",
        "is_premium": True,
        "is_featured": True,
        "view_count": 3214,
        "like_count": 892,
        "tags": ["fantasy", "landscape", "epic"]
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Cyberpunk City",
        "description": "Create futuristic cyberpunk cityscapes",
        "category": "artistic",
        "thumbnail_url": "https://via.placeholder.com/400x400/DC2626/ffffff?text=Cyberpunk",
        "is_premium": False,
        "is_featured": False,
        "view_count": 1789,
        "like_count": 445,
        "tags": ["cyberpunk", "futuristic", "neon"]
    }
]

@app.get("/")
async def root():
    return {"message": "DreamForge API Demo", "status": "active"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/api/models")
async def get_models(
    category: str = None,
    is_premium: bool = None,
    limit: int = 20,
    offset: int = 0
):
    """Get list of available AI models"""
    filtered_models = MOCK_MODELS

    if category and category != 'all':
        filtered_models = [m for m in filtered_models if m["category"] == category]

    if is_premium is not None:
        filtered_models = [m for m in filtered_models if m["is_premium"] == is_premium]

    return filtered_models[offset:offset+limit]

@app.get("/api/models/{model_id}/profile")
async def get_model_profile(model_id: str):
    """Get detailed model profile"""
    for model in MOCK_MODELS:
        if model["id"] == model_id:
            model["view_count"] += 1
            return model

    raise HTTPException(status_code=404, detail="Model not found")

@app.post("/api/generate")
async def generate_image(prompt: str, model_id: str = None):
    """Mock image generation endpoint"""
    return {
        "id": str(uuid.uuid4()),
        "image_url": f"https://via.placeholder.com/512x512/random/ffffff?text=Generated",
        "cached": False,
        "generation_time_ms": 2500,
        "width": 512,
        "height": 512
    }

@app.post("/api/auth/register")
async def register(email: str, password: str, full_name: str = None):
    """Mock registration"""
    return {
        "access_token": f"mock_token_{uuid.uuid4()}",
        "token_type": "bearer",
        "user_id": str(uuid.uuid4())
    }

@app.post("/api/auth/login")
async def login(email: str, password: str):
    """Mock login"""
    return {
        "access_token": f"mock_token_{uuid.uuid4()}",
        "token_type": "bearer",
        "user_id": str(uuid.uuid4())
    }

@app.get("/api/user/usage")
async def get_user_usage():
    """Mock user usage"""
    return {
        "current_tier": "free",
        "generations_this_month": 3,
        "max_generations": 5,
        "remaining_generations": 2
    }

@app.get("/api/subscription/tiers")
async def get_subscription_tiers():
    """Get subscription tiers"""
    return [
        {
            "name": "free",
            "display_name": "Free",
            "price_cents": 0,
            "max_generations_per_month": 5,
            "features": ["Basic models", "Limited generations"]
        },
        {
            "name": "basic",
            "display_name": "Basic",
            "price_cents": 999,
            "max_generations_per_month": 100,
            "features": ["All basic models", "Some premium models", "HD downloads"]
        },
        {
            "name": "premium",
            "display_name": "Premium",
            "price_cents": 2999,
            "max_generations_per_month": 500,
            "features": ["All models", "Priority queue", "API access", "Unlimited downloads"]
        }
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)