import { randomUUID } from 'node:crypto';
import { getTask, isTerminal, type SpicyTaskSnapshot } from './ai-providers/spicyapi';
import { getSupabaseAdmin } from './supabase-server';

// Tracks paid generations so results get saved and failures get refunded, even if the
// user leaves the page. Both the webhook and polling end up in finalizeTask, which is safe
// to run more than once.
//
// Results stay in generation_tasks rather than character_media, because character_media
// is readable by anyone and a user's private generations must not be listed there.

const BUCKET = 'generated-media';
const STALE_CLAIM_MS = 5 * 60 * 1000;

export interface GenerationTask {
  task_id: string;
  kind: 'image' | 'video';
  character_id: string | null;
  user_id: string | null;
  charged_moments: number;
  state: 'pending' | 'claimed' | 'succeeded' | 'failed';
  media_url: string | null;
  error: string | null;
}

export async function debitMoments(input: {
  userId: string;
  amount: number;
  type: string;
  ref?: string;
  description: string;
}): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin().rpc('debit_moments', {
    p_user_id: input.userId,
    p_amount: input.amount,
    p_type: input.type,
    p_ref: input.ref,
    p_desc: input.description,
  });
  if (error) throw new Error(`Moments debit failed: ${error.message}`);
  return Boolean(data?.[0]?.success);
}

export async function refundMoments(userId: string, amount: number, ref: string, description: string) {
  const { error } = await getSupabaseAdmin().rpc('credit_moments', {
    p_user_id: userId,
    p_amount: amount,
    p_type: 'generation_refund',
    p_ref: ref,
    p_desc: description,
  });
  if (error) throw new Error(`Moments refund failed: ${error.message}`);
}

export async function trackTask(input: {
  taskId: string;
  kind: 'image' | 'video';
  characterId: string | null;
  userId: string | null;
  chargedMoments: number;
  prompt: string;
}) {
  const { error } = await getSupabaseAdmin().from('generation_tasks').insert({
    task_id: input.taskId,
    provider: 'spicyapi',
    kind: input.kind,
    character_id: input.characterId,
    user_id: input.userId,
    charged_moments: input.chargedMoments,
    prompt: input.prompt,
  });
  if (error) throw new Error(`Could not record generation task: ${error.message}`);
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
};

// Copies a short-lived result link into our storage and returns a lasting URL. The path
// is random, and the bucket has no listing policy, so files can't be enumerated.
export async function mirrorToStorage(sourceUrl: string, folder: string): Promise<string> {
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error(`Could not download generated media: HTTP ${response.status}`);

  const contentType = (response.headers.get('content-type') || '').split(';')[0].trim();
  const extension = EXTENSIONS[contentType];
  if (!extension) throw new Error(`Unexpected generated media type: ${contentType || 'unknown'}`);

  const supabase = getSupabaseAdmin();
  const path = `${folder}/${randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, await response.arrayBuffer(), { contentType });
  if (error) throw new Error(`Could not store generated media: ${error.message}`);

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export interface FinalizeOps {
  claim: (taskId: string) => Promise<GenerationTask | null>;
  release: (taskId: string) => Promise<void>;
  mirror: (url: string, task: GenerationTask) => Promise<string>;
  markSucceeded: (taskId: string, mediaUrl: string) => Promise<void>;
  markFailed: (taskId: string, message: string) => Promise<void>;
  // Returns false if this task was already refunded.
  claimRefund: (taskId: string) => Promise<boolean>;
  unclaimRefund: (taskId: string) => Promise<void>;
  refund: (task: GenerationTask) => Promise<void>;
}

// Returns false when another worker holds the claim, so the caller can try again later.
export async function runFinalize(
  ops: FinalizeOps,
  taskId: string,
  snapshot: SpicyTaskSnapshot
): Promise<boolean> {
  if (!isTerminal(snapshot.state)) return true;

  const task = await ops.claim(taskId);
  if (!task) return false;

  try {
    if (snapshot.state === 'succeeded') {
      if (!snapshot.asset?.url) throw new Error('Task succeeded without a result file');
      await ops.markSucceeded(taskId, await ops.mirror(snapshot.asset.url, task));
      return true;
    }

    // The refund is claimed first, so a crash can't pay it out twice.
    if (task.user_id && task.charged_moments > 0 && (await ops.claimRefund(taskId))) {
      try {
        await ops.refund(task);
      } catch (error) {
        await ops.unclaimRefund(taskId);
        throw error;
      }
    }
    await ops.markFailed(taskId, snapshot.errorMessage || snapshot.errorCode || snapshot.state);
    return true;
  } catch (error) {
    await ops.release(taskId);
    throw error;
  }
}

function databaseOps(): FinalizeOps {
  const supabase = getSupabaseAdmin();
  const update = async (taskId: string, values: Record<string, unknown>) => {
    const { error } = await supabase.from('generation_tasks').update(values).eq('task_id', taskId);
    if (error) throw new Error(`Could not update generation task: ${error.message}`);
  };

  return {
    claim: async (taskId) => {
      const staleBefore = new Date(Date.now() - STALE_CLAIM_MS).toISOString();
      const { data, error } = await supabase
        .from('generation_tasks')
        .update({ state: 'claimed', claimed_at: new Date().toISOString() })
        .eq('task_id', taskId)
        .or(`state.eq.pending,and(state.eq.claimed,claimed_at.lt."${staleBefore}")`)
        .select()
        .maybeSingle();
      if (error) throw new Error(`Could not claim generation task: ${error.message}`);
      return data as GenerationTask | null;
    },
    release: (taskId) => update(taskId, { state: 'pending', claimed_at: null }),
    mirror: (url, task) => mirrorToStorage(url, task.kind),
    markSucceeded: (taskId, mediaUrl) => update(taskId, { state: 'succeeded', media_url: mediaUrl, error: null }),
    markFailed: (taskId, message) => update(taskId, { state: 'failed', error: message }),
    claimRefund: async (taskId) => {
      const { data, error } = await supabase
        .from('generation_tasks')
        .update({ refunded_at: new Date().toISOString() })
        .eq('task_id', taskId)
        .is('refunded_at', null)
        .select('task_id')
        .maybeSingle();
      if (error) throw new Error(`Could not claim refund: ${error.message}`);
      return Boolean(data);
    },
    unclaimRefund: (taskId) => update(taskId, { refunded_at: null }),
    refund: (task) =>
      refundMoments(task.user_id as string, task.charged_moments, task.task_id, `Refund for failed ${task.kind} generation`),
  };
}

export async function getTrackedTask(taskId: string): Promise<GenerationTask | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('generation_tasks')
    .select('task_id, kind, character_id, user_id, charged_moments, state, media_url, error')
    .eq('task_id', taskId)
    .maybeSingle();
  if (error) throw new Error(`Could not read generation task: ${error.message}`);
  return data as GenerationTask | null;
}

// Brings a tracked task up to date with SpicyAPI. Returns null if the task isn't ours.
export async function syncTask(taskId: string): Promise<GenerationTask | null> {
  const task = await getTrackedTask(taskId);
  if (!task || task.state === 'succeeded' || task.state === 'failed') return task;

  const snapshot = await getTask(taskId);
  await runFinalize(databaseOps(), taskId, snapshot);
  return getTrackedTask(taskId);
}

// Waits briefly so that fast images can return in the same request.
export async function waitForTask(taskId: string, timeoutMs: number): Promise<GenerationTask | null> {
  const deadline = Date.now() + timeoutMs;
  let task = await syncTask(taskId);
  while (task && task.state !== 'succeeded' && task.state !== 'failed' && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    task = await syncTask(taskId);
  }
  return task;
}
