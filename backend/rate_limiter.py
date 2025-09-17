import redis
import time
import os
from typing import Dict
from dotenv import load_dotenv

load_dotenv()

class RateLimiter:
    RATE_LIMITS = {
        'free': {
            'requests_per_hour': 10,
            'generations_per_day': 5,
            'modifications_per_day': 3
        },
        'basic': {
            'requests_per_hour': 100,
            'generations_per_day': 100,
            'modifications_per_day': 50
        },
        'premium': {
            'requests_per_hour': 1000,
            'generations_per_day': 500,
            'modifications_per_day': 250
        }
    }

    def __init__(self):
        self.redis = redis.Redis(
            host=os.getenv("REDIS_HOST", "localhost"),
            port=int(os.getenv("REDIS_PORT", 6379)),
            decode_responses=True
        )

    async def check_rate_limit(self, user_id: str, tier: str, action: str = 'generation') -> bool:
        """Check if user has exceeded rate limits"""
        limits = self.RATE_LIMITS.get(tier, self.RATE_LIMITS['free'])

        if action == 'generation':
            key = f"rate_limit:{user_id}:generations:day:{int(time.time() // 86400)}"
            limit = limits['generations_per_day']
            ttl = 86400
        elif action == 'modification':
            key = f"rate_limit:{user_id}:modifications:day:{int(time.time() // 86400)}"
            limit = limits['modifications_per_day']
            ttl = 86400
        else:
            key = f"rate_limit:{user_id}:requests:hour:{int(time.time() // 3600)}"
            limit = limits['requests_per_hour']
            ttl = 3600

        try:
            current = self.redis.get(key)

            if current is None:
                self.redis.setex(key, ttl, 1)
                return True
            elif int(current) < limit:
                self.redis.incr(key)
                return True
            else:
                return False
        except Exception as e:
            print(f"Rate limiter error: {e}")
            return True

    async def get_remaining_quota(self, user_id: str, tier: str, action: str = 'generation') -> Dict:
        """Get remaining quota for user"""
        limits = self.RATE_LIMITS.get(tier, self.RATE_LIMITS['free'])

        if action == 'generation':
            key = f"rate_limit:{user_id}:generations:day:{int(time.time() // 86400)}"
            limit = limits['generations_per_day']
            period = "day"
        elif action == 'modification':
            key = f"rate_limit:{user_id}:modifications:day:{int(time.time() // 86400)}"
            limit = limits['modifications_per_day']
            period = "day"
        else:
            key = f"rate_limit:{user_id}:requests:hour:{int(time.time() // 3600)}"
            limit = limits['requests_per_hour']
            period = "hour"

        try:
            current = self.redis.get(key)
            used = int(current) if current else 0
            remaining = max(0, limit - used)

            return {
                "action": action,
                "period": period,
                "limit": limit,
                "used": used,
                "remaining": remaining
            }
        except Exception as e:
            print(f"Rate limiter error: {e}")
            return {
                "action": action,
                "period": period,
                "limit": limit,
                "used": 0,
                "remaining": limit
            }

    def reset_user_limits(self, user_id: str):
        """Reset all rate limits for a user (admin function)"""
        patterns = [
            f"rate_limit:{user_id}:*"
        ]

        for pattern in patterns:
            for key in self.redis.scan_iter(pattern):
                self.redis.delete(key)