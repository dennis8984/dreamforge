import test from 'node:test';
import assert from 'node:assert/strict';
import { backgroundForShot, isBackgroundSlot } from './shoot-backgrounds';

test('one background is used for every shot, and two take turns', () => {
  assert.deepEqual([0, 1, 2].map((shot) => backgroundForShot(['a'], shot)), ['a', 'a', 'a']);
  assert.deepEqual([0, 1, 2, 3].map((shot) => backgroundForShot(['a', 'b'], shot)), ['a', 'b', 'a', 'b']);
});

test('only slots 1 and 2 exist', () => {
  assert.equal(isBackgroundSlot(1), true);
  assert.equal(isBackgroundSlot(2), true);
  assert.equal(isBackgroundSlot(3), false);
  assert.equal(isBackgroundSlot('1'), false);
});
