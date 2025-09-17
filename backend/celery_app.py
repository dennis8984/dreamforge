from celery import Celery, chain, group
from celery.result import AsyncResult
import os
from dotenv import load_dotenv
import time
import uuid
import json
from ai_generator import NanoBananaGenerator
from database import SessionLocal, GeneratedImage, UsageTracking

load_dotenv()

app = Celery('dreamforge')
app.conf.update(
    broker_url=f'redis://{os.getenv("REDIS_HOST", "localhost")}:{os.getenv("REDIS_PORT", 6379)}/0',
    result_backend=f'redis://{os.getenv("REDIS_HOST", "localhost")}:{os.getenv("REDIS_PORT", 6379)}/0',
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_routes={
        'generate_image_premium': {'queue': 'premium_gpu'},
        'generate_image_free': {'queue': 'free_gpu'},
        'process_modification': {'queue': 'premium_gpu'},
    },
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

generator = NanoBananaGenerator()

@app.task(bind=True, max_retries=3)
def generate_image(self, user_id, model_id, prompt, parameters, tier='free'):
    """Async image generation task"""
    try:
        result = generator.generate_from_text(prompt, user_id, parameters)

        if result['status'] == 'success':
            db = SessionLocal()
            try:
                generated_image = GeneratedImage(
                    user_id=uuid.UUID(user_id),
                    model_id=uuid.UUID(model_id) if model_id else None,
                    prompt=prompt,
                    parameters=parameters,
                    image_url=result['image_url'],
                    width=result.get('width'),
                    height=result.get('height'),
                    generation_time_ms=result.get('generation_time_ms')
                )
                db.add(generated_image)

                usage = UsageTracking(
                    user_id=uuid.UUID(user_id),
                    action_type="generation",
                    model_id=uuid.UUID(model_id) if model_id else None,
                    credits_used=1,
                    usage_metadata={"prompt": prompt[:100]}
                )
                db.add(usage)

                db.commit()

                return {
                    'status': 'success',
                    'image_id': str(generated_image.id),
                    'image_url': result['image_url']
                }
            finally:
                db.close()
        else:
            raise Exception(result.get('message', 'Generation failed'))

    except Exception as e:
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))

@app.task(bind=True)
def process_modification(self, user_id, base_image_path, modification_prompt):
    """Process image modification request"""
    try:
        result = generator.modify_existing_image(
            base_image_path,
            modification_prompt,
            user_id
        )

        if result['status'] == 'success':
            return {
                'status': 'success',
                'image_url': result['image_url'],
                'width': result.get('width'),
                'height': result.get('height')
            }
        else:
            raise Exception(result.get('message', 'Modification failed'))

    except Exception as e:
        raise self.retry(exc=e, countdown=30)

@app.task
def cleanup_old_generations(days_old=30):
    """Clean up old generation records and files"""
    from datetime import datetime, timedelta

    db = SessionLocal()
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        old_generations = db.query(GeneratedImage).filter(
            GeneratedImage.created_at < cutoff_date,
            GeneratedImage.is_public == False
        ).all()

        for generation in old_generations:
            # Delete from S3 or local storage
            # This would be implemented based on your storage backend
            pass

        # Delete database records
        db.query(GeneratedImage).filter(
            GeneratedImage.created_at < cutoff_date,
            GeneratedImage.is_public == False
        ).delete()

        db.commit()

        return f"Cleaned up {len(old_generations)} old generations"
    finally:
        db.close()

@app.task
def batch_generate_variations(user_id, base_prompt, num_variations=4):
    """Generate multiple variations of a prompt"""
    tasks = []
    for i in range(num_variations):
        variation_prompt = f"{base_prompt} variation {i+1}"
        tasks.append(generate_image.s(user_id, None, variation_prompt, {}, 'premium'))

    workflow = group(tasks)
    return workflow.apply_async()

# Scheduled tasks
app.conf.beat_schedule = {
    'cleanup-old-generations': {
        'task': 'celery_app.cleanup_old_generations',
        'schedule': 86400.0,  # Daily
    },
}

def get_task_status(task_id):
    """Get the status of a celery task"""
    result = AsyncResult(task_id, app=app)
    return {
        'task_id': task_id,
        'status': result.status,
        'result': result.result if result.ready() else None,
        'ready': result.ready(),
        'successful': result.successful() if result.ready() else None
    }