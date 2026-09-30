import { GREETER_ROLE } from '@/lib/greeter';

export class GreeterRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'GreeterRequestError';
  }
}

function bases() {
  return {
    conversation: (process.env.GREETER_CONVERSATION_URL || '').replace(/\/$/, ''),
    narration: (process.env.GREETER_NARRATION_URL || '').replace(/\/$/, ''),
    presetId: (process.env.GREETER_PRESET_ID || '').trim(),
    token: (process.env.GREETER_API_TOKEN || '').trim(),
  };
}

export function greeterConfigured() {
  const { conversation, narration, presetId, token } = bases();
  return Boolean(conversation && narration && /^[0-9a-f]{32}$/.test(presetId) && token);
}

function headers(extra?: HeadersInit) {
  const { token } = bases();
  return {
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}

async function pod(pathBase: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${pathBase}${path}`, {
    ...init,
    headers: headers(init.headers),
    cache: 'no-store',
  });
  return response;
}

function busyOrOffline(response: Response) {
  if (response.status === 409) {
    throw new GreeterRequestError("She's with someone right now.", 409);
  }
  throw new GreeterRequestError('The studio is offline.', 503);
}

export async function greeterHealth() {
  if (!greeterConfigured()) return false;
  try {
    const { narration } = bases();
    const response = await pod(narration, '/healthz', { signal: AbortSignal.timeout(4000) });
    if (!response.ok) return false;
    const body = await response.json();
    return body?.app === 'ok';
  } catch {
    return false;
  }
}

export async function restoreGreeterPreset() {
  const { narration, presetId } = bases();
  const response = await pod(narration, `/api/presets/${presetId}/restore`, { method: 'POST' });
  if (!response.ok) {
    console.error('Greeter preset restore failed', response.status);
    busyOrOffline(response);
  }
  const data = await response.json();
  if (!data?.id) throw new GreeterRequestError('The studio is offline.', 503);
  return {
    id: String(data.id),
    idleVideos: Array.isArray(data.idle_videos) ? data.idle_videos.map(String) : [],
  };
}

export async function openGreeterConversation(rnvSessionId: string) {
  const { conversation, presetId } = bases();
  const response = await pod(conversation, '/api/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      preset_id: presetId,
      rnv_session_id: rnvSessionId,
      role: GREETER_ROLE,
    }),
  });
  if (!response.ok) {
    console.error('Greeter conversation open failed', response.status);
    busyOrOffline(response);
  }
  const data = await response.json();
  if (!data?.id) throw new GreeterRequestError('The studio is offline.', 503);
  return String(data.id);
}

export async function cancelGreeterNarration(rnvSessionId: string) {
  if (!rnvSessionId || !greeterConfigured()) return;
  const { narration } = bases();
  await pod(narration, `/api/sessions/${rnvSessionId}`, { method: 'DELETE' }).catch((error) => {
    console.error('Greeter narration cancel failed', error);
  });
}

export async function sendGreeterText(conversationId: string, text: string) {
  const { conversation } = bases();
  const response = await pod(conversation, `/api/conversations/${conversationId}/text-turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (response.status === 409) {
    throw new GreeterRequestError("She's still answering. Wait for this one to finish.", 409);
  }
  if (!response.ok) {
    console.error('Greeter text turn failed', response.status);
    throw new GreeterRequestError('The studio is offline.', 503);
  }
}

export async function sendGreeterAudio(conversationId: string, audioBase64: string, format: string) {
  const { conversation } = bases();
  const response = await pod(conversation, `/api/conversations/${conversationId}/audio-turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio_b64: audioBase64, format }),
  });
  if (response.status === 409) {
    throw new GreeterRequestError("She's still answering. Wait for this one to finish.", 409);
  }
  if (!response.ok) {
    console.error('Greeter audio turn failed', response.status);
    throw new GreeterRequestError('The studio is offline.', 503);
  }
}

export async function sendGreeterNarration(rnvSessionId: string, text: string) {
  const { narration } = bases();
  const response = await pod(narration, `/api/sessions/${rnvSessionId}/narrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (response.status === 409) {
    throw new GreeterRequestError("She's still answering. Wait for this one to finish.", 409);
  }
  if (!response.ok) {
    console.error('Greeter narration failed', response.status);
    throw new GreeterRequestError('The studio is offline.', 503);
  }
}

export function greeterUpstreamHeaders() {
  return headers();
}

export function greeterNarrationEventsUrl(rnvSessionId: string) {
  return `${bases().narration}/api/sessions/${rnvSessionId}/events`;
}

export function greeterConversationEventsUrl(conversationId: string) {
  return `${bases().conversation}/api/conversations/${conversationId}/events`;
}

export function greeterMediaPath(rnvSessionId: string, kind: 'chunk' | 'idle', index: number) {
  if (kind === 'idle') return `/api/sessions/${rnvSessionId}/idle-video/${index}`;
  return `/api/sessions/${rnvSessionId}/chunks/${index}/video`;
}

export async function fetchGreeterMedia(rnvSessionId: string, kind: 'chunk' | 'idle', index: number) {
  const { narration } = bases();
  return pod(narration, greeterMediaPath(rnvSessionId, kind, index));
}
