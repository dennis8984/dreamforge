'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MOMENTS_COSTS } from '@/lib/moments-config';

interface Special {
  id: string;
  label: string;
  moments: number;
}

interface Status {
  name: string;
  online: boolean;
  busy: boolean;
  idleUrls: string[];
  costs: { minute: number; special: number };
  specials: Special[];
}

interface NarrationChunk {
  index: number;
  video_url?: string | null;
  text?: string;
}

function authHeaders() {
  const token = readToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function readToken() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('sb-access-token');
  if (raw) return raw;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || '');
        return parsed?.access_token || null;
      } catch {
        continue;
      }
    }
  }
  return localStorage.getItem('access_token');
}

function encodeWav(buffers: Float32Array[], sampleRate: number) {
  const length = buffers.reduce((sum, chunk) => sum + chunk.length, 0);
  const pcm = new Int16Array(length);
  let offset = 0;
  for (const chunk of buffers) {
    for (let i = 0; i < chunk.length; i++) {
      const sample = Math.max(-1, Math.min(1, chunk[i]));
      pcm[offset++] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }
  }
  const wav = new ArrayBuffer(44 + pcm.length * 2);
  const view = new DataView(wav);
  const write = (pos: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(pos + i, text.charCodeAt(i));
  };
  write(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length * 2, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, pcm.length * 2, true);
  let pos = 44;
  for (let i = 0; i < pcm.length; i++, pos += 2) view.setInt16(pos, pcm[i], true);
  const bytes = new Uint8Array(wav);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export default function GreeterHero({
  isAuthenticated,
  userTier,
}: {
  isAuthenticated: boolean;
  userTier: string;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [idleIndex, setIdleIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'connecting' | 'live' | 'ending'>('idle');
  const [notice, setNotice] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [draft, setDraft] = useState('');
  const [recording, setRecording] = useState(false);
  const [liveSrc, setLiveSrc] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const sessionRef = useRef<string | null>(null);
  const playedRef = useRef<Set<number>>(new Set());
  const queueRef = useRef<number[]>([]);
  const playingRef = useRef(false);
  const recordRef = useRef<{
    chunks: Float32Array[];
    sampleRate: number;
    stop: () => void;
  } | null>(null);

  const premium = userTier === 'premium' || userTier === 'ultimate';
  const idleUrls = status?.idleUrls || [];
  const minuteCost = status?.costs.minute ?? MOMENTS_COSTS.GREETER_MINUTE;
  const name = status?.name || 'Lila';

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/greeter/status');
      if (!res.ok) return;
      setStatus(await res.json());
    } catch {
      // keep the last status
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
    const timer = setInterval(() => {
      if (!sessionRef.current) void refreshStatus();
    }, 20000);
    return () => clearInterval(timer);
  }, [refreshStatus]);

  const playNext = useCallback(async (currentSession: string) => {
    if (playingRef.current) return;
    const index = queueRef.current.shift();
    if (index === undefined) {
      setLiveSrc((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      return;
    }
    playingRef.current = true;
    let url: string | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await fetch(
        `/api/greeter/media?sessionId=${encodeURIComponent(currentSession)}&kind=chunk&index=${index}`,
        { headers: authHeaders() },
      );
      if (res.ok) {
        url = URL.createObjectURL(await res.blob());
        break;
      }
      if (res.status !== 404) break;
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    if (!url || sessionRef.current !== currentSession) {
      playingRef.current = false;
      if (url) URL.revokeObjectURL(url);
      return;
    }
    setLiveSrc((current) => {
      if (current) URL.revokeObjectURL(current);
      return url;
    });
  }, []);

  const enqueueChunks = useCallback((chunks: NarrationChunk[], currentSession: string) => {
    for (const chunk of chunks) {
      if (!chunk.video_url || playedRef.current.has(chunk.index) || queueRef.current.includes(chunk.index)) continue;
      playedRef.current.add(chunk.index);
      queueRef.current.push(chunk.index);
    }
    void playNext(currentSession);
  }, [playNext]);

  useEffect(() => {
    if (!sessionId) return;
    const abort = new AbortController();
    const run = async () => {
      const res = await fetch(`/api/greeter/events?sessionId=${encodeURIComponent(sessionId)}`, {
        headers: authHeaders(),
        signal: abort.signal,
      });
      if (!res.ok || !res.body) {
        if (!abort.signal.aborted) setNotice('The live connection stopped.');
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let reply = '';
      while (!abort.signal.aborted) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() || '';
        for (const block of blocks) {
          const data = block
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trim())
            .join('\n');
          if (!data) continue;
          let event: { channel?: string; payload?: Record<string, unknown>; message?: string };
          try {
            event = JSON.parse(data);
          } catch {
            continue;
          }
          if (event.channel === 'error') {
            setNotice(event.message || 'The live connection stopped.');
          }
          if (event.channel === 'conversation' && event.payload) {
            if (event.payload.type === 'reply_delta' && typeof event.payload.text === 'string') {
              reply += event.payload.text;
              setCaption(reply);
            }
            if (event.payload.type === 'reply_done' && typeof event.payload.text === 'string') {
              reply = '';
              setCaption(event.payload.text);
            }
            if (event.payload.type === 'error' && typeof event.payload.message === 'string') {
              setNotice(event.payload.message);
            }
          }
          if (event.channel === 'narration' && event.payload && Array.isArray(event.payload.chunks)) {
            enqueueChunks(event.payload.chunks as NarrationChunk[], sessionId);
            if (typeof event.payload.assistant_text === 'string' && event.payload.assistant_text) {
              setCaption(event.payload.assistant_text);
            }
          }
        }
      }
    };
    void run().catch((error) => {
      if (!abort.signal.aborted) {
        console.error(error);
        setNotice('The live connection stopped.');
      }
    });
    return () => abort.abort();
  }, [sessionId, enqueueChunks]);

  const onLiveEnded = () => {
    playingRef.current = false;
    if (sessionRef.current) void playNext(sessionRef.current);
  };

  const start = async () => {
    setNotice(null);
    setPhase('connecting');
    try {
      const res = await fetch('/api/greeter/session', { method: 'POST', headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) {
        setNotice(data.error || "She can't come to the camera right now.");
        setPhase('idle');
        return;
      }
      playedRef.current = new Set();
      queueRef.current = [];
      playingRef.current = false;
      sessionRef.current = data.sessionId;
      setSessionId(data.sessionId);
      setPhase('live');
      setCaption('');
    } catch {
      setNotice('The studio is offline.');
      setPhase('idle');
    }
  };

  const hangUp = async () => {
    const current = sessionRef.current;
    if (!current) return;
    setPhase('ending');
    sessionRef.current = null;
    setSessionId(null);
    playingRef.current = false;
    queueRef.current = [];
    setLiveSrc((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
    try {
      const res = await fetch('/api/greeter/session', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ sessionId: current }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotice(
          data.paid
            ? `That was ${data.minutes} min · ${data.momentsCharged} Moments.`
            : 'The call ended. Moments could not be charged.',
        );
      } else {
        setNotice(data.error || 'The call ended.');
      }
    } catch {
      setNotice('The call ended.');
    }
    setPhase('idle');
    void refreshStatus();
  };

  const sendText = async () => {
    const current = sessionRef.current;
    const text = draft.trim();
    if (!current || !text || sending) return;
    setSending(true);
    setNotice(null);
    try {
      const res = await fetch('/api/greeter/turn', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ sessionId: current, text }),
      });
      const data = await res.json();
      if (!res.ok) setNotice(data.error || 'She missed that.');
      else setDraft('');
    } catch {
      setNotice('The studio is offline.');
    } finally {
      setSending(false);
    }
  };

  const toggleRecord = async () => {
    if (recording && recordRef.current) {
      const captured = recordRef.current;
      captured.stop();
      recordRef.current = null;
      setRecording(false);
      const current = sessionRef.current;
      if (!current || captured.chunks.length === 0) return;
      setSending(true);
      try {
        const res = await fetch('/api/greeter/turn', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            sessionId: current,
            audioBase64: encodeWav(captured.chunks, captured.sampleRate),
            format: 'wav',
          }),
        });
        const data = await res.json();
        if (!res.ok) setNotice(data.error || 'She missed that.');
      } catch {
        setNotice('The studio is offline.');
      } finally {
        setSending(false);
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      const silent = context.createGain();
      silent.gain.value = 0;
      const chunks: Float32Array[] = [];
      processor.onaudioprocess = (event) => {
        chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      };
      source.connect(processor);
      processor.connect(silent);
      silent.connect(context.destination);
      recordRef.current = {
        chunks,
        sampleRate: context.sampleRate,
        stop: () => {
          processor.disconnect();
          source.disconnect();
          silent.disconnect();
          stream.getTracks().forEach((track) => track.stop());
          void context.close();
        },
      };
      setRecording(true);
    } catch {
      setNotice('Microphone access is blocked.');
    }
  };

  const requestSpecial = async (requestId: string) => {
    const current = sessionRef.current;
    if (!current || sending) return;
    setSending(true);
    setNotice(null);
    try {
      const res = await fetch('/api/greeter/special', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ sessionId: current, requestId }),
      });
      const data = await res.json();
      if (!res.ok) setNotice(data.error || 'That special did not start.');
    } catch {
      setNotice('The studio is offline.');
    } finally {
      setSending(false);
    }
  };

  const away = status !== null && !status.online;
  const busy = status?.busy && phase === 'idle';
  const idleSrc = idleUrls[idleIndex] || '';

  return (
    <section className="px-6 pt-8 max-w-7xl mx-auto">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr] items-stretch">
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-gray-800 bg-gradient-to-b from-purple-950/80 to-black">
          {liveSrc ? (
            <video
              key={liveSrc}
              src={liveSrc}
              autoPlay
              playsInline
              onEnded={onLiveEnded}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : idleSrc ? (
            <video
              key={idleSrc}
              src={idleSrc}
              autoPlay
              muted
              playsInline
              loop={idleUrls.length === 1}
              onEnded={() => setIdleIndex((index) => (index + 1) % idleUrls.length)}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-end p-6">
              <p className="text-sm text-purple-200/80">Her idle clips play here once they are uploaded.</p>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-pink-300">Greeting</p>
            <h1 className="text-3xl font-semibold text-white">{name}</h1>
            <p className="text-sm text-gray-300" aria-live="polite">
              {caption || `${minuteCost} Moments a minute · specials ${status?.costs.special ?? MOMENTS_COSTS.GREETER_SPECIAL}`}
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center rounded-2xl border border-gray-800 bg-gray-900/40 p-6">
          <h2 className="text-2xl font-semibold text-white">She is here when you arrive.</h2>
          <p className="mt-2 max-w-xl text-gray-400">
            The loop is free to watch. Talking is {minuteCost} Moments a minute. A special request is{' '}
            {status?.costs.special ?? MOMENTS_COSTS.GREETER_SPECIAL} Moments, and only after it is paid.
          </p>

          {status === null && <p className="mt-4 text-sm text-gray-300">Checking the studio…</p>}
          {notice && <p className="mt-4 text-sm text-pink-200">{notice}</p>}
          {away && <p className="mt-4 text-sm text-gray-300">She&apos;s away. The idle loop stays up.</p>}
          {busy && <p className="mt-4 text-sm text-gray-300">She&apos;s with someone. You can still watch.</p>}

          {phase !== 'live' ? (
            <div className="mt-6">
              {!isAuthenticated ? (
                <Link
                  href="/auth"
                  className="inline-flex rounded-lg bg-pink-600 px-5 py-3 font-semibold text-white hover:bg-pink-500"
                >
                  Sign in to talk
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={start}
                  disabled={status === null || phase === 'connecting' || phase === 'ending' || away || Boolean(busy)}
                  className="rounded-lg bg-pink-600 px-5 py-3 font-semibold text-white hover:bg-pink-500 disabled:cursor-not-allowed disabled:bg-gray-700"
                >
                  {phase === 'connecting' ? 'Calling her…' : 'Start'}
                </button>
              )}
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={toggleRecord}
                  className={`rounded-lg px-4 py-2 font-medium ${recording ? 'bg-red-600 text-white' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                >
                  {recording ? 'Send recording' : 'Record'}
                </button>
                <button
                  type="button"
                  onClick={hangUp}
                  className="rounded-lg border border-gray-600 px-4 py-2 text-gray-200 hover:bg-gray-800"
                >
                  Hang up
                </button>
              </div>
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendText();
                }}
              >
                <label className="sr-only" htmlFor="greeter-draft">Message</label>
                <input
                  id="greeter-draft"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Say something"
                  className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-white outline-none focus:border-pink-500"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="rounded-lg bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-500 disabled:bg-gray-700"
                >
                  Send
                </button>
              </form>
              <div>
                <p className="mb-2 text-sm text-gray-400">Special requests</p>
                <div className="flex flex-wrap gap-2">
                  {(status?.specials || []).map((special) => (
                    <button
                      key={special.id}
                      type="button"
                      disabled={!premium || sending}
                      onClick={() => requestSpecial(special.id)}
                      className="rounded-full border border-pink-500/40 px-3 py-1.5 text-sm text-pink-100 hover:bg-pink-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {special.label} · {special.moments}
                    </button>
                  ))}
                </div>
                {!premium && (
                  <p className="mt-2 text-sm text-gray-400">
                    Specials are for Premium and Ultimate.{' '}
                    <Link href="/pricing" className="text-pink-300 hover:text-pink-200">Upgrade</Link>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
