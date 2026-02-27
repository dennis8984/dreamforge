import { getSupabaseAdmin } from './supabase-server';
import type { RateLimitStatus } from '@/types/chat';

const TIER_LIMITS: Record<string, number> = {
  free: 20,
  lite: 100,
  premium: -1, // unlimited
  ultimate: -1,
};

export async function checkRateLimit(userId: string, tier: string): Promise<RateLimitStatus> {
  const limit = TIER_LIMITS[tier] ?? TIER_LIMITS.free;

  // Unlimited tiers
  if (limit === -1) {
    return { used: 0, limit: -1, remaining: -1, resetsAt: '' };
  }

  const supabase = getSupabaseAdmin();
  const today = new Date().toISOString().split('T')[0];

  const { data } = await supabase
    .from('chat_rate_limits')
    .select('message_count')
    .eq('user_id', userId)
    .eq('period_date', today)
    .single();

  const used = data?.message_count || 0;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    resetsAt: tomorrow.toISOString(),
  };
}

export async function incrementRateLimit(userId: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.rpc('increment_chat_rate_limit', { p_user_id: userId });
  return data?.[0]?.current_count || 1;
}

export function isRateLimited(status: RateLimitStatus): boolean {
  if (status.limit === -1) return false;
  return status.used >= status.limit;
}
