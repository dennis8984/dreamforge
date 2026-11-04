import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_UPLOADS, mergeUploads, uploadFileProblem, uploadStatus } from './upload-selection';

test('photos picked in separate selections add up, in order', () => {
  const first = mergeUploads([], ['a', 'b']);
  const second = mergeUploads(first.images, ['c', 'd']);
  assert.deepEqual(second.images, ['a', 'b', 'c', 'd']);
});

test('the same photo only counts once, so a set of four is four different images', () => {
  const merged = mergeUploads(['a', 'b', 'c'], ['a']);
  assert.deepEqual(merged.images, ['a', 'b', 'c']);
  assert.equal(merged.duplicates, 1);
});

test('images past the limit are counted and left out', () => {
  const full = Array.from({ length: MAX_UPLOADS - 1 }, (_, i) => `image-${i}`);
  const merged = mergeUploads(full, ['x', 'y', 'z']);
  assert.equal(merged.images.length, MAX_UPLOADS);
  assert.equal(merged.images.at(-1), 'x');
  assert.equal(merged.overLimit, 2);
});

test('only files the server accepts pass', () => {
  assert.equal(uploadFileProblem({ name: 'a.jpg', type: 'image/jpeg', size: 1000 }), null);
  assert.match(uploadFileProblem({ name: 'b.heic', type: 'image/heic', size: 1000 }) || '', /b\.heic/);
  assert.match(uploadFileProblem({ name: 'c.heic', type: '', size: 1000 }) || '', /c\.heic/);
  assert.match(uploadFileProblem({ name: 'd.png', type: 'image/png', size: 11 * 1024 * 1024 }) || '', /over 10 MB/);
});

test('the status says how many more are needed', () => {
  assert.match(uploadStatus(1), /Add 3 more/);
  assert.equal(uploadStatus(4), '4 images selected.');
});
