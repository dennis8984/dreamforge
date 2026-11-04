import test from 'node:test';
import assert from 'node:assert/strict';
import { hasUnderAgeTerms, moderateText } from './moderation';
import { isAtLeast21 } from './character-age';

// Adult prompts must never trip the local check.
const allowed = [
  'nude woman, explicit, photorealistic',
  'naked adult couple in bed, nsfw, explicit sex scene',
  '25 years old, adult woman, long dark hair',
  '21-year-old woman, lingerie, bedroom',
  'age 30, topless on the beach',
  'minor scar on her shoulder, nude',
  'young woman, 26 years old, explicit',
  'she was kidding around, nude portrait',
  'childhood home in the background, adult woman',
  'petite adult woman, 28 yo, explicit',
];

// Anything placing a person under 21 must always be caught.
const blocked = [
  'a teen girl',
  'teenager in a bedroom',
  'nude 17 year old',
  '19-year-old woman',
  '20 yo model',
  'aged 16',
  'age: 15',
  'underage',
  'schoolgirl outfit',
  'high school classroom',
  'a minor',
  'loli',
  'CHILD',
];

for (const prompt of allowed) {
  test(`allows: ${prompt}`, () => assert.equal(hasUnderAgeTerms(prompt), false));
}
for (const prompt of blocked) {
  test(`blocks: ${prompt}`, () => assert.equal(hasUnderAgeTerms(prompt), true));
}

test('local under-age check works with no classifier key', async () => {
  delete process.env.SPICY_API_KEY;
  const result = await moderateText('nude 17 year old');
  assert.deepEqual(result.flags, ['minor']);
  assert.equal(result.approved, false);
});

test('adult prompt with no classifier key reports checker_unavailable, not a content flag', async () => {
  delete process.env.SPICY_API_KEY;
  const result = await moderateText('nude adult woman, explicit');
  assert.deepEqual(result.flags, ['checker_unavailable']);
});

// Replays one response per classifier call and records which model each call asked for.
function stubClassifier(replies: Array<{ status: number; body: unknown }>) {
  const realFetch = globalThis.fetch;
  const models: string[] = [];
  process.env.SPICY_API_KEY = 'test-key';
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    models.push(JSON.parse(String(init?.body)).model);
    const reply = replies.shift();
    if (!reply) throw new Error('unexpected classifier call');
    return new Response(JSON.stringify(reply.body), { status: reply.status });
  }) as typeof fetch;
  return {
    models,
    restore() {
      globalThis.fetch = realFetch;
      delete process.env.SPICY_API_KEY;
    },
  };
}

const verdict = (json: string) => ({ status: 200, body: { choices: [{ message: { content: json } }] } });

test('a model that errors hands over to the next one', async () => {
  const stub = stubClassifier([
    { status: 503, body: { error: { code: 'upstream_failed' } } },
    verdict('{"approved": true, "flags": [], "confidence": 0.9}'),
  ]);
  try {
    const result = await moderateText('adult woman, smiling');
    assert.equal(result.approved, true);
    assert.equal(stub.models.length, 2);
    assert.notEqual(stub.models[0], stub.models[1]);
  } finally {
    stub.restore();
  }
});

test('a reply that is not the expected JSON fails closed once every model has been tried', async () => {
  const stub = stubClassifier([verdict('I cannot help with that.'), verdict('Still no.')]);
  try {
    assert.deepEqual((await moderateText('adult woman, smiling')).flags, ['checker_unavailable']);
  } finally {
    stub.restore();
  }
});

test('the provider refusing the content is a rejection, not an outage', async () => {
  const stub = stubClassifier([{ status: 400, body: { error: { code: 'content_rejected', message: 'rejected' } } }]);
  try {
    const result = await moderateText('adult woman, smiling');
    assert.equal(result.approved, false);
    assert.deepEqual(result.flags, ['classifier_refused']);
    assert.equal(stub.models.length, 1);
  } finally {
    stub.restore();
  }
});

test('a minor flag rejects even when the model says approved', async () => {
  const stub = stubClassifier([verdict('{"approved": true, "flags": ["minor"], "confidence": 0.9}')]);
  try {
    assert.equal((await moderateText('adult woman, smiling')).approved, false);
  } finally {
    stub.restore();
  }
});

test('age helper', () => {
  assert.equal(isAtLeast21({ age: '19' }), false);
  assert.equal(isAtLeast21({ age: '20' }), false);
  assert.equal(isAtLeast21({ age: '21' }), true);
  assert.equal(isAtLeast21({ age: null }), true);
  assert.equal(isAtLeast21({}), true);
});
