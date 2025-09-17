from fastapi import FastAPI, HTTPException, Depends, File, UploadFile, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import uuid
import os
from dotenv import load_dotenv

from database import get_db, init_db, User, AIModel, GeneratedImage, SubscriptionTier, UsageTracking
from ai_generator import NanoBananaGenerator, ModelCache
from auth import create_access_token, get_current_user, get_password_hash, verify_password
from rate_limiter import RateLimiter
from payment_service import PaymentService

load_dotenv()

app = FastAPI(title="DreamForge API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", os.getenv("DOMAIN", "*")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

generator = NanoBananaGenerator()
model_cache = ModelCache()
rate_limiter = RateLimiter()
payment_service = PaymentService()

@app.on_event("startup")
async def startup_event():
    try:
        init_db()
    except Exception as e:
        print(f"Database initialization failed: {e}")
        print("Running without database - some features may not work")

@app.get("/")
async def root():
    return {"message": "DreamForge API", "status": "active"}

@app.post("/api/auth/register")
async def register(email: str, password: str, full_name: Optional[str] = None, db: Session = Depends(get_db)):
    """Register a new user"""
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = get_password_hash(password)
    user = User(
        email=email,
        hashed_password=hashed_password,
        full_name=full_name,
        subscription_tier="free"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    stripe_customer = await payment_service.create_customer(email, full_name)
    user.stripe_customer_id = stripe_customer["id"]
    db.commit()

    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer", "user_id": str(user.id)}

@app.post("/api/auth/login")
async def login(email: str, password: str, db: Session = Depends(get_db)):
    """User login"""
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer", "user_id": str(user.id)}

@app.get("/api/models", response_model=List[Dict])
async def get_models(
    category: Optional[str] = None,
    is_premium: Optional[bool] = None,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get list of available AI models"""
    query = db.query(AIModel)

    if category:
        query = query.filter(AIModel.category == category)
    if is_premium is not None:
        query = query.filter(AIModel.is_premium == is_premium)

    models = query.order_by(AIModel.created_at.desc()).offset(offset).limit(limit).all()

    return [
        {
            "id": str(model.id),
            "name": model.name,
            "description": model.description,
            "category": model.category,
            "thumbnail_url": model.thumbnail_url,
            "is_premium": model.is_premium,
            "is_featured": model.is_featured,
            "view_count": model.view_count,
            "like_count": model.like_count,
            "tags": model.tags
        }
        for model in models
    ]

@app.get("/api/models/{model_id}/profile")
async def get_model_profile(
    model_id: str,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed model profile with paywall check"""
    model = db.query(AIModel).filter(AIModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    model.view_count += 1
    db.commit()

    cached_data = model_cache.get_model_metadata(model_id)
    if cached_data:
        base_data = cached_data
    else:
        base_data = {
            "id": str(model.id),
            "name": model.name,
            "description": model.description,
            "category": model.category,
            "thumbnail_url": model.thumbnail_url,
            "is_premium": model.is_premium,
            "view_count": model.view_count,
            "like_count": model.like_count
        }
        model_cache.cache_model_metadata(model_id, base_data)

    if not current_user or current_user.subscription_tier == "free":
        if model.is_premium:
            return {
                **base_data,
                "paywall_active": True,
                "upgrade_message": "Upgrade to Premium to access this model",
                "upgrade_url": "/api/payment/checkout?tier=premium"
            }

    base_data.update({
        "file_path": model.file_path,
        "parameters": model.parameters,
        "tags": model.tags,
        "creator_id": str(model.creator_id) if model.creator_id else None,
        "created_at": model.created_at.isoformat() if model.created_at else None
    })

    return base_data

@app.post("/api/generate")
async def generate_image(
    prompt: str,
    model_id: Optional[str] = None,
    parameters: Optional[Dict] = None,
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db)
):
    """Generate an AI image"""
    if not await rate_limiter.check_rate_limit(
        str(current_user.id),
        current_user.subscription_tier,
        'generation'
    ):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Upgrade for more generations."
        )

    if model_id:
        model = db.query(AIModel).filter(AIModel.id == model_id).first()
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")

        if model.is_premium and current_user.subscription_tier == "free":
            raise HTTPException(
                status_code=403,
                detail="Premium model requires subscription"
            )

    result = await generator.generate_from_text(prompt, str(current_user.id), parameters)

    if result["status"] == "success":
        generated_image = GeneratedImage(
            user_id=current_user.id,
            model_id=uuid.UUID(model_id) if model_id else None,
            prompt=prompt,
            parameters=parameters,
            image_url=result["image_url"],
            width=result.get("width"),
            height=result.get("height"),
            generation_time_ms=result.get("generation_time_ms")
        )
        db.add(generated_image)

        usage = UsageTracking(
            user_id=current_user.id,
            action_type="generation",
            model_id=uuid.UUID(model_id) if model_id else None,
            credits_used=1,
            usage_metadata={"prompt": prompt[:100]}
        )
        db.add(usage)

        db.commit()

        return {
            "id": str(generated_image.id),
            "image_url": result["image_url"],
            "cached": result.get("cached", False),
            "generation_time_ms": result.get("generation_time_ms"),
            "width": result.get("width"),
            "height": result.get("height")
        }
    else:
        raise HTTPException(status_code=500, detail=result.get("message", "Generation failed"))

@app.post("/api/models/{model_id}/modify")
async def modify_image(
    model_id: str,
    modification_prompt: str,
    base_image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Modify an existing image with text prompt"""
    if not await rate_limiter.check_rate_limit(
        str(current_user.id),
        current_user.subscription_tier,
        'generation'
    ):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Upgrade for more modifications."
        )

    temp_path = f"/tmp/{uuid.uuid4()}_{base_image.filename}"
    with open(temp_path, "wb") as f:
        f.write(await base_image.read())

    result = await generator.modify_existing_image(
        temp_path,
        modification_prompt,
        str(current_user.id)
    )

    os.remove(temp_path)

    if result["status"] == "success":
        generated_image = GeneratedImage(
            user_id=current_user.id,
            model_id=uuid.UUID(model_id),
            prompt=f"Modified: {modification_prompt}",
            image_url=result["image_url"],
            width=result.get("width"),
            height=result.get("height")
        )
        db.add(generated_image)
        db.commit()

        return {
            "id": str(generated_image.id),
            "image_url": result["image_url"],
            "width": result.get("width"),
            "height": result.get("height")
        }
    else:
        raise HTTPException(status_code=500, detail=result.get("message", "Modification failed"))

@app.get("/api/user/gallery")
async def get_user_gallery(
    current_user: User = Depends(get_current_user),
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get user's generated images"""
    images = db.query(GeneratedImage).filter(
        GeneratedImage.user_id == current_user.id
    ).order_by(
        GeneratedImage.created_at.desc()
    ).offset(offset).limit(limit).all()

    return [
        {
            "id": str(image.id),
            "image_url": image.image_url,
            "thumbnail_url": image.thumbnail_url,
            "prompt": image.prompt,
            "created_at": image.created_at.isoformat(),
            "width": image.width,
            "height": image.height,
            "is_public": image.is_public
        }
        for image in images
    ]

@app.get("/api/subscription/tiers")
async def get_subscription_tiers(db: Session = Depends(get_db)):
    """Get available subscription tiers"""
    tiers = db.query(SubscriptionTier).all()
    return [
        {
            "name": tier.name,
            "display_name": tier.display_name,
            "price_cents": tier.price_cents,
            "max_generations_per_month": tier.max_generations_per_month,
            "features": tier.features,
            "stripe_price_id": tier.stripe_price_id
        }
        for tier in tiers
    ]

@app.get("/api/user/usage")
async def get_user_usage(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's current month usage statistics"""
    start_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    usage = db.query(UsageTracking).filter(
        UsageTracking.user_id == current_user.id,
        UsageTracking.timestamp >= start_of_month
    ).all()

    generations = len([u for u in usage if u.action_type == "generation"])

    tier = db.query(SubscriptionTier).filter(
        SubscriptionTier.name == current_user.subscription_tier
    ).first()

    return {
        "current_tier": current_user.subscription_tier,
        "generations_this_month": generations,
        "max_generations": tier.max_generations_per_month if tier else 5,
        "remaining_generations": max(0, (tier.max_generations_per_month if tier else 5) - generations)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)