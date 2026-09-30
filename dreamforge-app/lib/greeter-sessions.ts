import { getSupabaseAdmin } from '@/lib/supabase-server';
import { MOMENTS_COSTS } from '@/lib/moments-config';
import {
  cancelGreeterNarration,
  greeterConfigured,
  GreeterRequestError,
  openGreeterConversation,
  restoreGreeterPreset,
} from '@/lib/greeter-client';

const STALE_MS = 3 * 60 * 1000;

export interface GreeterSessionRow {
  id: string;
  user_id: string;
  status: 'active' | 'ending' | 'ended';
  rnv_session_id: string;
  conversation_id: string;
  duration_seconds: number;
  moments_charged: number;
  created_at: string;
  last_seen_at: string;
  ended_at: string | null;
}

function firstRow<T>(data: T | T[] | null): T | null {
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

function missingTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === '42P01' || (error.message || '').includes('greeter_sessions');
}

export async function debitMoments(userId: string, amount: number, type: string, description: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc('debit_moments', {
    p_user_id: userId,
    p_amount: amount,
    p_type: type,
    p_desc: description,
  });
  if (error) throw new Error(error.message);
  const row = firstRow(data as { success?: boolean; new_balance?: number } | { success?: boolean; new_balance?: number }[] | null);
  return { success: Boolean(row?.success), balance: row?.new_balance ?? 0 };
}

export async function creditMoments(userId: string, amount: number, type: string, description: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.rpc('credit_moments', {
    p_user_id: userId,
    p_amount: amount,
    p_type: type,
    p_desc: description,
  });
  if (error) throw new Error(error.message);
}

export async function greeterIsBusy() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('greeter_sessions')
    .select('id')
    .eq('status', 'active')
    .limit(1);
  if (missingTable(error)) return false;
  if (error) throw new Error(error.message);
  return (data || []).length > 0;
}

export async function touchGreeterSession(sessionId: string, userId: string) {
  const supabase = getSupabaseAdmin();
  await supabase
    .from('greeter_sessions')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('user_id', userId)
    .eq('status', 'active');
}

export async function getOwnedGreeterSession(sessionId: string, userId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('greeter_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();
  if (missingTable(error)) return null;
  if (error) throw new Error(error.message);
  return (data as GreeterSessionRow | null) ?? null;
}

export async function endGreeterSession(sessionId: string, userId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('greeter_sessions')
    .update({ status: 'ending' })
    .eq('id', sessionId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .select('*')
    .maybeSingle();
  if (error) throw new Error(error.message);
  const session = data as GreeterSessionRow | null;
  if (!session) return null;

  if (session.rnv_session_id) {
    await cancelGreeterNarration(session.rnv_session_id);
  }

  const started = new Date(session.created_at).getTime();
  const seconds = Math.max(1, Math.ceil((Date.now() - started) / 1000));
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  const amount = minutes * MOMENTS_COSTS.GREETER_MINUTE;
  let charged = 0;
  let balance = 0;
  let paid = false;
  try {
    const debit = await debitMoments(userId, amount, 'greeter_minute', `Live greeting (${minutes} min)`);
    paid = debit.success;
    balance = debit.balance;
    charged = debit.success ? amount : 0;
  } catch (debitError) {
    console.error('Greeter minute debit failed', debitError);
  }

  await supabase
    .from('greeter_sessions')
    .update({
      status: 'ended',
      ended_at: new Date().toISOString(),
      duration_seconds: seconds,
      moments_charged: charged,
    })
    .eq('id', sessionId);

  return { minutes, momentsCharged: charged, balance, paid };
}

async function sweepStaleSessions() {
  const supabase = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - STALE_MS).toISOString();
  const { data, error } = await supabase
    .from('greeter_sessions')
    .select('id, user_id')
    .eq('status', 'active')
    .lt('last_seen_at', cutoff);
  if (error) {
    if (missingTable(error)) throw new GreeterRequestError('Greeter sessions are not set up yet.', 503);
    throw new Error(error.message);
  }
  for (const row of data || []) {
    await endGreeterSession(row.id, row.user_id);
  }
}

export async function startGreeterSession(userId: string) {
  if (!greeterConfigured()) {
    throw new GreeterRequestError('The studio is offline.', 503);
  }
  const supabase = getSupabaseAdmin();
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('moments_balance')
    .eq('id', userId)
    .single();
  if (profileError) throw new Error(profileError.message);
  if ((profile?.moments_balance || 0) < MOMENTS_COSTS.GREETER_MINUTE) {
    throw new GreeterRequestError(
      `You need ${MOMENTS_COSTS.GREETER_MINUTE} Moments to start. Talk is ${MOMENTS_COSTS.GREETER_MINUTE} per minute.`,
      402,
    );
  }

  await sweepStaleSessions();

  const { data: active, error: activeError } = await supabase
    .from('greeter_sessions')
    .select('*')
    .eq('status', 'active')
    .maybeSingle();
  if (activeError) {
    if (missingTable(activeError)) throw new GreeterRequestError('Greeter sessions are not set up yet.', 503);
    throw new Error(activeError.message);
  }
  if (active) {
    if (active.user_id === userId) {
      return { session: active as GreeterSessionRow, resumed: true };
    }
    throw new GreeterRequestError("She's with someone right now.", 409);
  }

  const preset = await restoreGreeterPreset();
  let conversationId = '';
  try {
    conversationId = await openGreeterConversation(preset.id);
  } catch (error) {
    await cancelGreeterNarration(preset.id);
    throw error;
  }

  const { data: created, error: insertError } = await supabase
    .from('greeter_sessions')
    .insert({
      user_id: userId,
      status: 'active',
      rnv_session_id: preset.id,
      conversation_id: conversationId,
    })
    .select('*')
    .single();

  if (insertError || !created) {
    await cancelGreeterNarration(preset.id);
    if (insertError?.code === '23505') {
      throw new GreeterRequestError("She's with someone right now.", 409);
    }
    if (missingTable(insertError)) {
      throw new GreeterRequestError('Greeter sessions are not set up yet.', 503);
    }
    throw new Error(insertError?.message || 'Failed to start the greeting');
  }

  return { session: created as GreeterSessionRow, resumed: false };
}
