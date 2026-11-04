import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import {
  SpicyApiError,
  buildImageRequest,
  buildVideoRequest,
  closestAspectRatio,
  createTask,
  getTask,
  imageModelFor,
  prepareImageInput,
  webhookUrl,
  withImageReferences,
} from './spicyapi';
import { verifySpicyWebhook } from './spicyapi-webhook';
import { runFinalize, type FinalizeOps, type GenerationTask } from '../generation-tasks';

const realFetch = globalThis.fetch;
const lora = (scale = 1) => ({ path: 'https://example.com/a.safetensors', scale });

function envelope(data: unknown, code = 200, status = 200) {
  return new Response(JSON.stringify({ code, msg: code === 200 ? 'success' : 'nope', data, request_id: 'req_1' }), { status });
}

beforeEach(() => {
  process.env.SPICY_API_KEY = 'sk-spicy-test';
});
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.SPICY_API_KEY;
  delete process.env.SPICY_WEBHOOK_SECRET;
  delete process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.SPICY_REFERENCE_IMAGE_MODEL;
});

test('picks the closest supported aspect ratio', () => {
  const ratios = ['1:1', '16:9', '9:16', '4:3', '3:4'];
  assert.equal(closestAspectRatio(1024, 1024, ratios), '1:1');
  assert.equal(closestAspectRatio(768, 1024, ratios), '3:4');
  assert.equal(closestAspectRatio(1920, 1080, ratios), '16:9');
});

test('builds an H3 text-to-image request with LoRAs', () => {
  const request = buildImageRequest({
    modelKey: 'minimax-h3-image',
    prompt: 'p',
    width: 768,
    height: 1024,
    seed: 42,
    loras: [lora()],
    resolution: '2k',
  });
  assert.deepEqual(request, {
    model: 'minimax/h3-image-lora/text-to-image',
    input: { prompt: 'p', seed: 42, loras: [lora()], aspect_ratio: '3:4', resolution: '2k' },
  });
});

test('models without a resolution field never receive one', () => {
  const { input } = buildImageRequest({ modelKey: 'qwen-image-2512', prompt: 'p', resolution: '2k' });
  assert.equal('resolution' in input, false);
});

test('edit requests use the field each model expects', () => {
  const h3 = buildImageRequest({ modelKey: 'minimax-h3-image', prompt: 'p', sourceImage: 'https://x/a.png' });
  assert.equal(h3.model, 'minimax/h3-image-lora/edit');
  assert.deepEqual(h3.input.image_urls, ['https://x/a.png']);

  const zImage = buildImageRequest({ modelKey: 'z-image-turbo', prompt: 'p', sourceImage: 'https://x/a.png', strength: 0.6 });
  assert.equal(zImage.input.image_url, 'https://x/a.png');
  assert.equal(zImage.input.strength, 0.6);

  const h3Strength = buildImageRequest({ modelKey: 'minimax-h3-image', prompt: 'p', sourceImage: 'https://x/a.png', strength: 0.6 });
  assert.equal('strength' in h3Strength.input, false);
});

test('reference images use each model limit and field', () => {
  const images = ['https://x/1.png', 'https://x/2.png', 'https://x/3.png', 'https://x/4.png'];

  const qwen = buildImageRequest({ modelKey: 'qwen-image-2512', prompt: 'p', referenceImages: images, width: 768, height: 1024 });
  assert.equal(qwen.model, 'alibaba/qwen-image-2512-lora/edit');
  assert.deepEqual(qwen.input.image_urls, images.slice(0, 3));
  assert.equal(qwen.input.aspect_ratio, '3:4');

  const zImage = buildImageRequest({ modelKey: 'z-image-turbo', prompt: 'p', referenceImages: images, width: 768, height: 1024 });
  assert.equal(zImage.input.image_url, images[0]);
  assert.equal('aspect_ratio' in zImage.input, false);
});

test('Seedream requests leave out the fields its endpoints reject', () => {
  const edit = buildImageRequest({
    modelKey: 'seedream-5-pro',
    prompt: 'p',
    referenceImages: ['https://x/1.png', 'https://x/2.png', 'https://x/3.png', 'https://x/4.png'],
    width: 1536,
    height: 1024,
    seed: 42,
    loras: [lora()],
    strength: 0.6,
    resolution: '2k',
  });
  assert.deepEqual(edit, {
    model: 'bytedance/seedream-5.0-pro/edit',
    input: {
      prompt: 'p',
      enable_thinking: false,
      image_urls: ['https://x/1.png', 'https://x/2.png', 'https://x/3.png'],
      aspect_ratio: '3:2',
      resolution: '2k',
    },
  });

  const text = buildImageRequest({ modelKey: 'seedream-5-pro', prompt: 'p', seed: 42, loras: [lora()] });
  assert.equal(text.model, 'bytedance/seedream-5.0-pro/text-to-image');
  assert.equal('seed' in text.input, false);
  assert.equal('loras' in text.input, false);
});

test('a background goes after the capped references and the prompt labels it', () => {
  const references = ['https://x/1.png', 'https://x/2.png', 'https://x/3.png', 'https://x/4.png'];
  const { input } = buildImageRequest({
    modelKey: 'seedream-5-pro',
    prompt: 'p',
    referenceImages: references,
    backgroundImage: 'https://x/bg.png',
  });
  assert.deepEqual(input.image_urls, [...references.slice(0, 3), 'https://x/bg.png']);

  const prompt = withImageReferences('seedream-5-pro', 4, 'standing', { hasBackground: true });
  assert.match(prompt, /^Image 1, Image 2 and Image 3 all show the same person\./);
  assert.match(prompt, /Image 4 shows the location\./);
  assert.match(prompt, /New image: standing$/);
  assert.doesNotMatch(withImageReferences('seedream-5-pro', 1, 'x'), /location/);
});

test('a background needs a capable model and a person to place in it', () => {
  assert.throws(
    () => buildImageRequest({ modelKey: 'qwen-image-2512', prompt: 'p', referenceImages: ['https://x/1.png'], backgroundImage: 'https://x/bg.png' }),
    /can't use a background/
  );
  assert.throws(
    () => buildImageRequest({ modelKey: 'seedream-5-pro', prompt: 'p', backgroundImage: 'https://x/bg.png' }),
    /needs a reference/
  );
});

test('references go to Seedream unless the request carries LoRAs', () => {
  assert.equal(imageModelFor({ hasReferences: true, hasLoras: false }), 'seedream-5-pro');
  assert.equal(imageModelFor({ hasReferences: true, hasLoras: true }), 'qwen-image-2512');
  assert.equal(imageModelFor({ hasReferences: false, hasLoras: false }), 'qwen-image-2512');

  process.env.SPICY_REFERENCE_IMAGE_MODEL = 'minimax-h3-image';
  assert.equal(imageModelFor({ hasReferences: true, hasLoras: false }), 'minimax-h3-image');

  process.env.SPICY_REFERENCE_IMAGE_MODEL = 'nope';
  assert.throws(() => imageModelFor({ hasReferences: true, hasLoras: false }), /Unknown SPICY_REFERENCE_IMAGE_MODEL "nope"/);
});

test('reference prompts name each picture the way the model expects', () => {
  const qwen = withImageReferences('qwen-image-2512', 5, 'at the beach');
  assert.match(qwen, /^Picture 1, Picture 2 and Picture 3 all show the same person\./);
  assert.match(qwen, /New image: at the beach$/);

  assert.match(withImageReferences('minimax-h3-image', 2, 'x'), /^<Picture 1> and <Picture 2> all show/);
  assert.match(withImageReferences('z-image-turbo', 3, 'x'), /^The source image shows the person to use\./);
});

test('reference video uses the reference endpoint on MiniMax only', () => {
  const images = ['https://x/1.png', 'https://x/2.png', 'https://x/3.png', 'https://x/4.png'];

  const h3 = buildVideoRequest({ modelKey: 'minimax-h3', prompt: 'she smiles', referenceImages: images });
  assert.equal(h3.model, 'minimax/h3-lora/reference-to-video');
  assert.deepEqual(h3.input.reference_image_urls, images.slice(0, 3));
  assert.equal('image_url' in h3.input, false);
  assert.match(h3.input.prompt as string, /^<Picture 1>, <Picture 2> and <Picture 3> all show.*she smiles$/);

  const wan = buildVideoRequest({ modelKey: 'wan-2.2', prompt: 'p', imageUrl: 'https://x/a.png', referenceImages: images });
  assert.equal(wan.model, 'alibaba/wan-2.2-lora/image-to-video');
  assert.equal('reference_image_urls' in wan.input, false);

  assert.throws(() => buildVideoRequest({ modelKey: 'wan-2.2', prompt: 'p', referenceImages: images }), /starting image/);
});

test('limits LoRAs to 3 per slot and clamps scale to the model range', () => {
  const { input } = buildImageRequest({
    modelKey: 'qwen-image-2512',
    prompt: 'p',
    sourceImage: 'https://x/a.png',
    loras: [lora(3), lora(-1), lora(1), lora(1)],
  });
  assert.deepEqual((input.loras as { scale: number }[]).map((l) => l.scale), [2, 0, 1]);
});

test('out-of-range seeds are dropped', () => {
  assert.equal('seed' in buildImageRequest({ modelKey: 'z-image-turbo', prompt: 'p', seed: 2_147_483_648 }).input, false);
  assert.equal('seed' in buildImageRequest({ modelKey: 'z-image-turbo', prompt: 'p', seed: -1 }).input, false);
});

test('only Wan 2.2 video requests get noise slots', () => {
  const wan = buildVideoRequest({
    modelKey: 'wan-2.2',
    prompt: 'p',
    imageUrl: 'https://x/a.png',
    highNoiseLoras: [lora()],
    lowNoiseLoras: [lora()],
  });
  assert.equal(wan.model, 'alibaba/wan-2.2-lora/image-to-video');
  assert.equal(wan.input.resolution, '720p');
  assert.equal((wan.input.high_noise_loras as unknown[]).length, 1);

  const h3 = buildVideoRequest({ modelKey: 'minimax-h3', prompt: 'p', imageUrl: 'https://x/a.png', highNoiseLoras: [lora()] });
  assert.equal(h3.input.resolution, '768p');
  assert.equal('high_noise_loras' in h3.input, false);
});

test('rejects video settings a model does not support', () => {
  assert.throws(() => buildVideoRequest({ modelKey: 'wan-2.2', prompt: 'p', imageUrl: 'u', durationSeconds: 6 }), /5 or 8/);
  assert.throws(() => buildVideoRequest({ modelKey: 'minimax-h3', prompt: 'p', imageUrl: 'u', durationSeconds: 16 }), /3 to 15/);
  assert.throws(() => buildVideoRequest({ modelKey: 'wan-2.2', prompt: 'p', imageUrl: 'u', resolution: '1080p' }), /resolutions/);
});

test('createTask sends auth, idempotency and callback, and accepts HTTP 202', async () => {
  let seen: RequestInit | undefined;
  let url = '';
  globalThis.fetch = (async (input: string, init: RequestInit) => {
    url = input;
    seen = init;
    return envelope({ taskId: 'job_1', state: 'queued' }, 200, 202);
  }) as typeof fetch;

  const task = await createTask({ model: 'm', input: { prompt: 'p' } }, { idempotencyKey: 'key-1', callBackUrl: 'https://a/b' });
  const headers = seen?.headers as Record<string, string>;

  assert.equal(task.taskId, 'job_1');
  assert.equal(url, 'https://api.spicyapi.ai/api/v1/jobs/createTask');
  assert.equal(headers.Authorization, 'Bearer sk-spicy-test');
  assert.equal(headers['Idempotency-Key'], 'key-1');
  assert.deepEqual(JSON.parse(seen?.body as string), { model: 'm', input: { prompt: 'p' }, callBackUrl: 'https://a/b' });
});

test('createTask retries overloads with the same idempotency key', async () => {
  const keys: string[] = [];
  globalThis.fetch = (async (_: string, init: RequestInit) => {
    keys.push((init.headers as Record<string, string>)['Idempotency-Key']);
    return keys.length < 3 ? envelope(undefined, 50301, 503) : envelope({ taskId: 'job_2', state: 'queued' }, 200, 202);
  }) as typeof fetch;

  const task = await createTask({ model: 'm', input: {} }, { idempotencyKey: 'key-2', retryDelayMs: 1 });
  assert.equal(task.taskId, 'job_2');
  assert.deepEqual(keys, ['key-2', 'key-2', 'key-2']);
});

test('createTask does not retry a balance failure or a key conflict', async () => {
  for (const code of [40201, 409]) {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return envelope(undefined, code, code === 40201 ? 402 : 409);
    }) as typeof fetch;

    await assert.rejects(
      createTask({ model: 'm', input: {} }, { idempotencyKey: 'k', retryDelayMs: 1 }),
      (error: SpicyApiError) => error.code === code && error.requestId === 'req_1'
    );
    assert.equal(calls, 1);
  }
});

test('getTask reads the first asset, and failures carry their reason', async () => {
  globalThis.fetch = (async () =>
    envelope({
      taskId: 'job_3',
      state: 'succeeded',
      cost: '0.04',
      output: { assets: [{ url: 'https://r2/x.png', mime: 'image/png', expiresAt: 'soon' }] },
    })) as typeof fetch;
  const done = await getTask('job_3');
  assert.equal(done.state, 'succeeded');
  assert.equal(done.asset?.url, 'https://r2/x.png');

  globalThis.fetch = (async () =>
    envelope({ taskId: 'job_4', state: 'failed', errorCode: 'content_rejected', errorMessage: 'refused' })) as typeof fetch;
  const failed = await getTask('job_4');
  assert.equal(failed.errorCode, 'content_rejected');
  assert.equal(failed.asset, undefined);
});

test('prepareImageInput passes URLs through and rejects anything else', async () => {
  assert.equal(await prepareImageInput('https://x/a.png'), 'https://x/a.png');
  assert.equal(await prepareImageInput('spicy://f/abc'), 'spicy://f/abc');
  await assert.rejects(prepareImageInput('http://x/a.png'), /HTTPS/);
  await assert.rejects(prepareImageInput('data:image/svg+xml;base64,AAAA'), /Unsupported/);
});

test('prepareImageInput uploads data URLs, with no API key sent to storage', async () => {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, headers: (init.headers || {}) as Record<string, string> });
    if (url.endsWith('/common/upload-url')) {
      assert.deepEqual(JSON.parse(init.body as string), { contentType: 'image/png', bytes: 3 });
      return envelope({ fileId: 'f1', uploadUrl: 'https://storage/put', method: 'PUT', headers: { 'Content-Type': 'image/png' } });
    }
    if (url === 'https://storage/put') return new Response(null, { status: 200 });
    return envelope({ status: 'ready', uri: 'spicy://f/f1' });
  }) as typeof fetch;

  const uri = await prepareImageInput(`data:image/png;base64,${Buffer.from('abc').toString('base64')}`);

  assert.equal(uri, 'spicy://f/f1');
  assert.equal(calls[1].url, 'https://storage/put');
  assert.equal(calls[1].headers.Authorization, undefined);
  assert.equal(calls[2].url, 'https://api.spicyapi.ai/api/v1/files/f1/commit');
});

test('webhook URL requires a signing secret and an HTTPS app URL', () => {
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.example/';
  assert.equal(webhookUrl(), undefined);
  process.env.SPICY_WEBHOOK_SECRET = 'secret';
  assert.equal(webhookUrl(), 'https://app.example/api/webhooks/spicyapi');
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  assert.equal(webhookUrl(), undefined);
});

function sign(rawBody: string, taskId: string, timestamp: string, secret: string) {
  const hash = createHash('sha256').update(rawBody).digest('hex');
  return createHmac('sha256', secret).update(`${taskId}.${timestamp}.${hash}`).digest('base64');
}

test('webhook verification follows the documented signature scheme', () => {
  const rawBody = '{"data":{"taskId":"job_5"}}';
  const base = { rawBody, taskId: 'job_5', secret: 's', timestamp: '1000', nowSeconds: 1000 };
  const signature = sign(rawBody, 'job_5', '1000', 's');

  assert.equal(verifySpicyWebhook({ ...base, signature }), true);
  assert.equal(verifySpicyWebhook({ ...base, signature, rawBody: `${rawBody} ` }), false);
  assert.equal(verifySpicyWebhook({ ...base, signature, taskId: 'job_6' }), false);
  assert.equal(verifySpicyWebhook({ ...base, signature, secret: 'other' }), false);
  assert.equal(verifySpicyWebhook({ ...base, signature, nowSeconds: 1301 }), false);
  assert.equal(verifySpicyWebhook({ ...base, signature: null }), false);
  assert.equal(verifySpicyWebhook({ ...base, signature: 'bm90IHZhbGlk' }), false);
});

function fakeOps(overrides: Partial<FinalizeOps> = {}) {
  const log: string[] = [];
  const task: GenerationTask = {
    task_id: 't',
    kind: 'image',
    character_id: null,
    user_id: 'u',
    charged_moments: 50,
    state: 'claimed',
    media_url: null,
    error: null,
  };
  const ops: FinalizeOps = {
    claim: async () => (log.push('claim'), task),
    release: async () => void log.push('release'),
    mirror: async () => (log.push('mirror'), 'https://store/a.png'),
    markSucceeded: async (_, url) => void log.push(`succeeded:${url}`),
    markFailed: async (_, message) => void log.push(`failed:${message}`),
    claimRefund: async () => (log.push('claimRefund'), true),
    unclaimRefund: async () => void log.push('unclaimRefund'),
    refund: async () => void log.push('refund'),
    ...overrides,
  };
  return { ops, log };
}

test('a successful task is saved and not refunded', async () => {
  const { ops, log } = fakeOps();
  await runFinalize(ops, 't', { taskId: 't', state: 'succeeded', asset: { url: 'https://r2/a.png' } });
  assert.deepEqual(log, ['claim', 'mirror', 'succeeded:https://store/a.png']);
});

test('a failed task is refunded and marked failed', async () => {
  const { ops, log } = fakeOps();
  await runFinalize(ops, 't', { taskId: 't', state: 'failed', errorMessage: 'refused' });
  assert.deepEqual(log, ['claim', 'claimRefund', 'refund', 'failed:refused']);
});

test('expired tasks are refunded too', async () => {
  const { ops, log } = fakeOps();
  await runFinalize(ops, 't', { taskId: 't', state: 'expired' });
  assert.ok(log.includes('refund'));
});

test('a task that was already refunded is not paid out twice', async () => {
  const { ops, log } = fakeOps({ claimRefund: async () => false });
  await runFinalize(ops, 't', { taskId: 't', state: 'failed' });
  assert.equal(log.includes('refund'), false);
  assert.deepEqual(log, ['claim', 'failed:failed']);
});

test('a task another worker holds does nothing', async () => {
  const { ops, log } = fakeOps({ claim: async () => null });
  assert.equal(await runFinalize(ops, 't', { taskId: 't', state: 'failed' }), false);
  assert.deepEqual(log, []);
});

test('a task still running is left alone', async () => {
  const { ops, log } = fakeOps();
  await runFinalize(ops, 't', { taskId: 't', state: 'running' });
  assert.deepEqual(log, []);
});

test('a failed save releases the task so a retry can finish it', async () => {
  const { ops, log } = fakeOps({
    mirror: async () => {
      throw new Error('storage down');
    },
  });
  await assert.rejects(runFinalize(ops, 't', { taskId: 't', state: 'succeeded', asset: { url: 'u' } }), /storage down/);
  assert.deepEqual(log, ['claim', 'release']);
});

test('a failed refund can be retried rather than lost', async () => {
  const { ops, log } = fakeOps({
    refund: async () => {
      throw new Error('rpc down');
    },
  });
  await assert.rejects(runFinalize(ops, 't', { taskId: 't', state: 'failed' }), /rpc down/);
  assert.deepEqual(log, ['claim', 'claimRefund', 'unclaimRefund', 'release']);
});
