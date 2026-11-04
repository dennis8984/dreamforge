/**
 * Confirms a SpicyAPI key works and the default image and video requests are accepted.
 * Uses the free quote endpoint, so it costs nothing and generates nothing.
 *
 * Run: SPICY_API_KEY=... npx tsx scripts/spicyapi-smoke.ts
 */

import {
  IMAGE_MODELS,
  VIDEO_MODELS,
  buildImageRequest,
  buildVideoRequest,
  quoteTask,
  type ImageModelKey,
  type VideoModelKey,
} from '../lib/ai-providers/spicyapi';

const SAMPLE_IMAGE = 'https://cdn.spicyapi.ai/models/examples/inputs/a45f8f82cb3a15e7.jpeg';

async function check(label: string, run: () => Promise<{ estimatedCost?: string }>) {
  try {
    const quote = await run();
    console.log(`ok    ${label}: estimated $${quote.estimatedCost ?? 'unknown'}`);
    return true;
  } catch (error) {
    console.error(`FAIL  ${label}: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function main() {
  const results: boolean[] = [];

  for (const modelKey of Object.keys(IMAGE_MODELS) as ImageModelKey[]) {
    const request = buildImageRequest({ modelKey, prompt: 'portrait photo', width: 768, height: 1024 });
    results.push(await check(`image ${modelKey}`, () => quoteTask(request)));
  }

  for (const modelKey of Object.keys(VIDEO_MODELS) as VideoModelKey[]) {
    const request = buildVideoRequest({ modelKey, prompt: 'she turns and smiles', imageUrl: SAMPLE_IMAGE });
    results.push(await check(`video ${modelKey}`, () => quoteTask(request)));
  }

  process.exit(results.every(Boolean) ? 0 : 1);
}

main();
