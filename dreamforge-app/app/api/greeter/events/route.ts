import { NextRequest } from 'next/server';
import { requireAuth, isAuthUser } from '@/lib/auth-helpers';
import {
  greeterConfigured,
  greeterConversationEventsUrl,
  greeterNarrationEventsUrl,
  greeterUpstreamHeaders,
} from '@/lib/greeter-client';
import { getOwnedGreeterSession, touchGreeterSession } from '@/lib/greeter-sessions';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  if (!greeterConfigured()) {
    return new Response(JSON.stringify({ error: 'The studio is offline.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const sessionId = request.nextUrl.searchParams.get('sessionId') || '';
  const session = await getOwnedGreeterSession(sessionId, auth.id);
  if (!session || session.status !== 'active') {
    return new Response(JSON.stringify({ error: 'Session not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const upstream = new AbortController();
  const onAbort = () => upstream.abort();
  request.signal.addEventListener('abort', onAbort);

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      const beat = setInterval(() => {
        void touchGreeterSession(session.id, auth.id);
        send({ channel: 'ping' });
      }, 15000);
      void touchGreeterSession(session.id, auth.id);

      const pump = async (url: string, channel: 'narration' | 'conversation') => {
        const response = await fetch(url, {
          headers: {
            ...greeterUpstreamHeaders(),
            Accept: 'text/event-stream',
          },
          signal: upstream.signal,
          cache: 'no-store',
        });
        if (!response.ok || !response.body) {
          send({ channel: 'error', message: 'The studio dropped the live connection.' });
          return;
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!upstream.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split('\n\n');
          buffer = blocks.pop() || '';
          for (const block of blocks) {
            if (!block.trim() || block.startsWith(':')) continue;
            const data = block
              .split('\n')
              .filter((line) => line.startsWith('data:'))
              .map((line) => line.slice(5).trim())
              .join('\n');
            if (!data) continue;
            try {
              send({ channel, payload: JSON.parse(data) });
            } catch {
              send({ channel, payload: { raw: data } });
            }
          }
        }
      };

      try {
        await Promise.all([
          pump(greeterNarrationEventsUrl(session.rnv_session_id), 'narration'),
          pump(greeterConversationEventsUrl(session.conversation_id), 'conversation'),
        ]);
      } catch (error) {
        if (!upstream.signal.aborted) {
          console.error('Greeter event stream failed', error);
          send({ channel: 'error', message: 'The live connection stopped.' });
        }
      } finally {
        clearInterval(beat);
        closed = true;
        request.signal.removeEventListener('abort', onAbort);
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
    cancel() {
      upstream.abort();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
