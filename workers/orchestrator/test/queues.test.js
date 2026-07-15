import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUEUE_NAMES, defaultJobOptions, createQueue, createWorker } from '../src/queues.js';

// Smoke test do esqueleto: roda sem Redis (só toca as definições puras).
test('filas cobrem os pipelines de imagem e reel', () => {
  assert.equal(QUEUE_NAMES.image, 'media:image');
  assert.equal(QUEUE_NAMES.reel, 'media:reel');
});

test('default job options fazem retry com backoff (base PHF-033)', () => {
  assert.ok(defaultJobOptions.attempts >= 1);
  assert.equal(defaultJobOptions.backoff.type, 'exponential');
  assert.ok(defaultJobOptions.backoff.delay > 0);
});

test('factories existem para produtores e workers plugarem depois', () => {
  assert.equal(typeof createQueue, 'function');
  assert.equal(typeof createWorker, 'function');
});
