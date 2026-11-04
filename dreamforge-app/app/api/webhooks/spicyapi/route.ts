import { NextRequest, NextResponse } from 'next/server';
import { verifySpicyWebhook } from '@/lib/ai-providers/spicyapi-webhook';
import { syncTask } from '@/lib/generation-tasks';

// POST /api/webhooks/spicyapi
// Any non-2xx response makes SpicyAPI retry, up to 8 attempts.
export async function POST(request: NextRequest) {
  const secret = process.env.SPICY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });

  const rawBody = await request.text();

  let taskId: string | undefined;
  try {
    const payload = JSON.parse(rawBody);
    taskId = payload?.data?.taskId ?? payload?.task_id;
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  if (typeof taskId !== 'string' || !taskId) {
    return NextResponse.json({ error: 'Missing task ID' }, { status: 400 });
  }

  const verified = verifySpicyWebhook({
    rawBody,
    taskId,
    timestamp: request.headers.get('x-webhook-timestamp'),
    signature: request.headers.get('x-webhook-signature'),
    secret,
  });
  if (!verified) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

  try {
    // Re-reads the task from SpicyAPI, so the body only serves as a signed notification.
    // A 404 is retried, which covers a callback that beats our own task insert.
    const task = await syncTask(taskId);
    if (!task) return NextResponse.json({ error: 'Unknown task' }, { status: 404 });
    if (task.state === 'pending' || task.state === 'claimed') {
      return NextResponse.json({ error: 'Task still being processed' }, { status: 409 });
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('SpicyAPI webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
