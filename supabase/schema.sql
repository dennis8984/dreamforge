-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    subscription_tier VARCHAR(20) DEFAULT 'free',
    subscription_active BOOLEAN DEFAULT FALSE,
    subscription_end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- AI Models table
CREATE TABLE public.ai_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    model_type VARCHAR(50),
    thumbnail_url TEXT,
    file_path TEXT NOT NULL,
    is_premium BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    tags JSONB,
    parameters JSONB,
    creator_id UUID REFERENCES public.users(id),
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Generated Images table
CREATE TABLE public.generated_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    model_id UUID REFERENCES public.ai_models(id),
    prompt TEXT NOT NULL,
    negative_prompt TEXT,
    parameters JSONB,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    width INTEGER,
    height INTEGER,
    generation_time_ms INTEGER,
    is_public BOOLEAN DEFAULT FALSE,
    is_nsfw BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Subscription Tiers table
CREATE TABLE public.subscription_tiers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    max_generations_per_month INTEGER,
    max_models_per_month INTEGER,
    can_view_full_profiles BOOLEAN DEFAULT FALSE,
    can_download_hd BOOLEAN DEFAULT FALSE,
    can_use_premium_models BOOLEAN DEFAULT FALSE,
    priority_queue BOOLEAN DEFAULT FALSE,
    price_cents INTEGER DEFAULT 0,
    stripe_price_id VARCHAR(255),
    features JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Usage Tracking table
CREATE TABLE public.usage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    action_type VARCHAR(50),
    model_id UUID REFERENCES public.ai_models(id),
    credits_used INTEGER DEFAULT 1,
    timestamp TIMESTAMP DEFAULT NOW(),
    usage_metadata JSONB
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_subscription ON public.users(subscription_tier);
CREATE INDEX idx_models_category ON public.ai_models(category);
CREATE INDEX idx_models_premium ON public.ai_models(is_premium);
CREATE INDEX idx_generated_user ON public.generated_images(user_id);
CREATE INDEX idx_generated_model ON public.generated_images(model_id);
CREATE INDEX idx_usage_user ON public.usage_tracking(user_id);
CREATE INDEX idx_usage_timestamp ON public.usage_tracking(timestamp);

-- Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own profile
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Everyone can view public models
CREATE POLICY "Public model access" ON public.ai_models
    FOR SELECT USING (true);

-- Users can view their own generated images
CREATE POLICY "Users view own images" ON public.generated_images
    FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users create own images" ON public.generated_images
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view their own usage
CREATE POLICY "Users view own usage" ON public.usage_tracking
    FOR SELECT USING (auth.uid() = user_id);

-- Functions for automatic timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_models_updated_at BEFORE UPDATE ON public.ai_models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default subscription tiers
INSERT INTO public.subscription_tiers (name, display_name, max_generations_per_month, price_cents, features) VALUES
('free', 'Free', 5, 0, '{"basic_models": true, "watermark": true}'),
('basic', 'Basic', 100, 999, '{"premium_models": true, "hd_download": true, "no_watermark": true}'),
('premium', 'Premium', 500, 2999, '{"all_models": true, "priority_queue": true, "api_access": true, "commercial_license": true}');

-- Insert sample AI models
INSERT INTO public.ai_models (name, description, category, thumbnail_url, file_path, is_premium, is_featured, tags) VALUES
('Realistic Portrait Generator', 'Generate photorealistic portraits with stunning detail', 'realistic', 'https://via.placeholder.com/400x400/4F46E5/ffffff?text=Realistic', '/models/realistic-portrait', false, true, '["portrait", "realistic", "human"]'),
('Anime Art Master', 'Create beautiful anime-style artwork', 'anime', 'https://via.placeholder.com/400x400/EC4899/ffffff?text=Anime', '/models/anime-master', true, false, '["anime", "manga", "japanese"]'),
('Abstract Dreams', 'Generate abstract and surreal artwork', 'abstract', 'https://via.placeholder.com/400x400/10B981/ffffff?text=Abstract', '/models/abstract-dreams', false, true, '["abstract", "surreal", "artistic"]'),
('3D Render Pro', 'Create professional 3D rendered images', '3d', 'https://via.placeholder.com/400x400/F59E0B/ffffff?text=3D', '/models/3d-render', true, false, '["3d", "render", "cgi"]'),
('Fantasy Worlds', 'Generate epic fantasy landscapes and characters', 'artistic', 'https://via.placeholder.com/400x400/8B5CF6/ffffff?text=Fantasy', '/models/fantasy-worlds', true, true, '["fantasy", "landscape", "epic"]'),
('Cyberpunk City', 'Create futuristic cyberpunk cityscapes', 'artistic', 'https://via.placeholder.com/400x400/DC2626/ffffff?text=Cyberpunk', '/models/cyberpunk', false, false, '["cyberpunk", "futuristic", "neon"]');