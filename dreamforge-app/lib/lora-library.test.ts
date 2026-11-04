import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignmentError,
  loraGroupName,
  newLoraError,
  normalizeLoraLink,
  pairedName,
  pairedTarget,
  testSlot,
} from './lora-library';

const linkOf = (input: unknown) => {
  const result = normalizeLoraLink(input);
  return 'link' in result ? result.link : null;
};

test('Civitai links become version download links on either domain', () => {
  const expected = 'https://civitai.com/api/download/models/2073605';
  assert.equal(linkOf('https://civitai.com/api/download/models/2073605'), expected);
  assert.equal(linkOf('https://civitai.com/api/download/models/2073605?type=Model&format=SafeTensor'), expected);
  assert.equal(linkOf('https://civitai.com/models/1307155/wan-general?modelVersionId=2073605'), expected);
  assert.equal(linkOf('https://civitai.red/models/1307155?modelVersionId=2073605'), expected);
});

test('Civitai pages that do not name a file are refused with a reason', () => {
  for (const input of ['https://civitai.com/models/1307155', 'https://civitai.red/images/101542796', 'https://civitai.com/user/someone']) {
    assert.ok('error' in normalizeLoraLink(input), input);
  }
  assert.match((normalizeLoraLink('https://civitai.red/images/101542796') as { error: string }).error, /image page/);
});

test('a Civitai account token is never stored', () => {
  assert.match(
    (normalizeLoraLink('https://civitai.com/api/download/models/1?token=secret') as { error: string }).error,
    /token/
  );
});

test('Hugging Face file links use resolve, and repo pages are refused', () => {
  const expected = 'https://huggingface.co/ostris/orbit/resolve/main/orbit_high.safetensors';
  assert.equal(linkOf('https://huggingface.co/ostris/orbit/blob/main/orbit_high.safetensors'), expected);
  assert.equal(linkOf(`${expected}?download=true`), expected);
  assert.equal(linkOf('https://huggingface.co/ostris/orbit'), null);
});

test('other hosts must be public https links to safetensors, keeping any signature', () => {
  const signed = 'https://bucket.example/lora.safetensors?X-Signature=abc';
  assert.equal(linkOf(signed), signed);
  for (const input of [
    'http://bucket.example/lora.safetensors',
    'https://bucket.example/lora.ckpt',
    'https://bucket.example/lora.pt',
    'https://localhost/lora.safetensors',
    'https://10.0.0.5/lora.safetensors',
    'not a link',
    '',
    null,
  ]) {
    assert.equal(linkOf(input), null, String(input));
  }
});

test('pair names round-trip to their noise slots', () => {
  const high = pairedName('WAN General', 'high');
  const low = pairedName('WAN General', 'low');
  assert.equal(pairedTarget(high), 'video_high_noise');
  assert.equal(pairedTarget(low), 'video_low_noise');
  assert.equal(pairedTarget('WAN General'), null);
  assert.equal(loraGroupName(high), 'WAN General');
  assert.equal(loraGroupName(low), loraGroupName(high));
});

const validLora = {
  name: 'Film grain',
  kind: 'style',
  base_model: 'wan-2.2',
  default_strength: 1,
  licence: 'Apache 2.0',
  confirmed_licence: true,
  confirmed_people: true,
};

test('a new LoRA needs a license and both confirmations', () => {
  assert.equal(newLoraError(validLora), null);
  assert.match(newLoraError({ ...validLora, licence: ' ' }) as string, /license/);
  assert.match(newLoraError({ ...validLora, confirmed_licence: false }) as string, /license/);
  assert.match(newLoraError({ ...validLora, confirmed_people: false }) as string, /real person/);
});

test('a new LoRA is refused on an unknown family, an out-of-range strength or a pair suffix', () => {
  assert.ok(newLoraError({ ...validLora, base_model: 'seedream-5.0-pro' }));
  assert.ok(newLoraError({ ...validLora, default_strength: 2.5 }));
  assert.ok(newLoraError({ ...validLora, default_strength: -1 }));
  assert.ok(newLoraError({ ...validLora, name: 'Film grain (high)' }));
});

const readyWan = { name: 'Pack (high)', base_model: 'wan-2.2', status: 'ready' };

test('assignments keep files in the right slot', () => {
  assert.equal(assignmentError(readyWan, 'video_high_noise', 0.8, 0), null);
  assert.ok(assignmentError(readyWan, 'video_low_noise', 0.8, 0));
  assert.ok(assignmentError(readyWan, 'image', 0.8, 0));
  assert.equal(assignmentError({ name: 'Single', base_model: 'wan-2.2', status: 'ready' }, 'video', 1, 0), null);
  assert.ok(assignmentError({ name: 'Still', base_model: 'qwen-image-2512', status: 'ready' }, 'video', 1, 0));
});

test('assignments need an enabled LoRA, a valid strength and a free slot', () => {
  assert.ok(assignmentError({ ...readyWan, status: 'pending' }, 'video_high_noise', 1, 0));
  assert.ok(assignmentError({ ...readyWan, status: 'disabled' }, 'video_high_noise', 1, 0));
  assert.ok(assignmentError(readyWan, 'video_high_noise', 3, 0));
  assert.ok(assignmentError(readyWan, 'video_high_noise', 1, 3));
  assert.equal(assignmentError(readyWan, 'video_high_noise', 1, 2), null);
});

test('test runs put each file in the slot a real generation would use', () => {
  assert.equal(testSlot(readyWan), 'video_high_noise');
  assert.equal(testSlot({ name: 'Single', base_model: 'wan-2.2' }), 'video');
  assert.equal(testSlot({ name: 'H3', base_model: 'minimax-h3' }), 'video');
  assert.equal(testSlot({ name: 'Still', base_model: 'qwen-image-2512' }), 'image');
});
