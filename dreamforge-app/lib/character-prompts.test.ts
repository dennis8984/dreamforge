import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCharacterPhotoPrompt, buildShootPhotoPrompt } from './character-prompts';

test('character images use a plain backdrop and name no location', () => {
  const prompt = buildCharacterPhotoPrompt('full body, standing.  ');
  assert.match(prompt, /^full body, standing\. Plain seamless neutral gray studio backdrop/);
  assert.match(prompt, /Canon EOS 5D Mark II/);
  assert.match(prompt, /visible pores/);
  assert.doesNotMatch(prompt, /beach|bikini|Punta Cana|telephone|coconut|location/i);
});

test('the age and the reference rule are only added when they apply', () => {
  const plain = buildCharacterPhotoPrompt('portrait');
  assert.doesNotMatch(plain, /years old/);
  assert.doesNotMatch(plain, /tattoos/);
  assert.match(plain, /true to the age described/);
  assert.doesNotMatch(plain, /uneven tone/);

  const full = buildCharacterPhotoPrompt('portrait', { age: 28, hasReferences: true });
  assert.match(full, /^The subject is an adult, 28 years old\. portrait\./);
  assert.match(full, /add no new ones/);
});

test('shoot prompts leave the location to the background', () => {
  const prompt = buildShootPhotoPrompt('sitting on a chair, laughing', { age: 30 });
  assert.match(prompt, /^The subject is an adult, 30 years old\. sitting on a chair, laughing\./);
  assert.match(prompt, /light of the location/);
  assert.doesNotMatch(prompt, /backdrop/);
  assert.match(prompt, /add no new ones/);
});
