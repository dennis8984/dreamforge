from sqlalchemy import create_engine, Column, String, Integer, Boolean, DateTime, Float, ForeignKey, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/dreamforge")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    stripe_customer_id = Column(String(255))
    subscription_tier = Column(String(20), default="free")
    subscription_active = Column(Boolean, default=False)
    subscription_end_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    ai_models = relationship("AIModel", back_populates="creator")
    generated_images = relationship("GeneratedImage", back_populates="user")

class AIModel(Base):
    __tablename__ = "ai_models"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    category = Column(String(100))
    model_type = Column(String(50))
    thumbnail_url = Column(Text)
    file_path = Column(Text, nullable=False)
    is_premium = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)
    tags = Column(JSON)
    parameters = Column(JSON)
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    view_count = Column(Integer, default=0)
    like_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    creator = relationship("User", back_populates="ai_models")
    generated_images = relationship("GeneratedImage", back_populates="model")

class GeneratedImage(Base):
    __tablename__ = "generated_images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    model_id = Column(UUID(as_uuid=True), ForeignKey("ai_models.id"))
    prompt = Column(Text, nullable=False)
    negative_prompt = Column(Text)
    parameters = Column(JSON)
    image_url = Column(Text, nullable=False)
    thumbnail_url = Column(Text)
    width = Column(Integer)
    height = Column(Integer)
    generation_time_ms = Column(Integer)
    is_public = Column(Boolean, default=False)
    is_nsfw = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="generated_images")
    model = relationship("AIModel", back_populates="generated_images")

class SubscriptionTier(Base):
    __tablename__ = "subscription_tiers"

    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)
    display_name = Column(String(100))
    max_generations_per_month = Column(Integer)
    max_models_per_month = Column(Integer)
    can_view_full_profiles = Column(Boolean, default=False)
    can_download_hd = Column(Boolean, default=False)
    can_use_premium_models = Column(Boolean, default=False)
    priority_queue = Column(Boolean, default=False)
    price_cents = Column(Integer, default=0)
    stripe_price_id = Column(String(255))
    features = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

class UsageTracking(Base):
    __tablename__ = "usage_tracking"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    action_type = Column(String(50))
    model_id = Column(UUID(as_uuid=True), ForeignKey("ai_models.id"), nullable=True)
    credits_used = Column(Integer, default=1)
    timestamp = Column(DateTime, default=datetime.utcnow)
    usage_metadata = Column(JSON)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()