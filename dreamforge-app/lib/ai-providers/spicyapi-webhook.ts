import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const REPLAY_WINDOW_SECONDS = 300;

// Signature = base64(HMAC-SHA256(secret, "<task_id>.<timestamp>.<sha256_hex(raw_body)>")).
// The hash must be over the raw bytes received, not re-serialized JSON.
export function verifySpicyWebhook(input: {
  rawBody: string;
  taskId: string;
  timestamp: string | null;
  signature: string | null;
  secret: string;
  nowSeconds?: number;
}): boolean {
  const { rawBody, taskId, timestamp, signature, secret } = input;
  if (!timestamp || !signature || !secret) return false;

  const sentAt = Number(timestamp);
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (!Number.isFinite(sentAt) || Math.abs(now - sentAt) > REPLAY_WINDOW_SECONDS) return false;

  const bodyHash = createHash('sha256').update(rawBody).digest('hex');
  const expected = createHmac('sha256', secret).update(`${taskId}.${timestamp}.${bodyHash}`).digest();
  const received = Buffer.from(signature, 'base64');

  return received.length === expected.length && timingSafeEqual(received, expected);
}
