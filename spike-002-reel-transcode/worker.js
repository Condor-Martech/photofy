import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import path from 'node:path';
import fs from 'node:fs';
import { transcodeReel } from './transcode.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY || 2);
const OUT_DIR = process.env.OUT_DIR || 'fixtures/out';

fs.mkdirSync(OUT_DIR, { recursive: true });

const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

const worker = new Worker(
  'reel-transcode',
  async (job) => {
    const startedAt = Date.now();
    const outputPath = path.join(OUT_DIR, `${job.id}.mp4`);
    await transcodeReel(job.data.inputPath, outputPath);
    const finishedAt = Date.now();
    const stat = fs.statSync(outputPath);
    return {
      queuedAt: job.data.enqueuedAt,
      startedAt,
      finishedAt,
      waitMs: startedAt - job.data.enqueuedAt,
      processMs: finishedAt - startedAt,
      totalMs: finishedAt - job.data.enqueuedAt,
      outputBytes: stat.size,
    };
  },
  { connection, concurrency: CONCURRENCY }
);

worker.on('failed', (job, err) => {
  console.error(`job ${job?.id} failed:`, err.message);
});

console.log(`worker up | concurrency=${CONCURRENCY} | redis=${REDIS_URL}`);

process.on('SIGTERM', async () => { await worker.close(); process.exit(0); });
process.on('SIGINT', async () => { await worker.close(); process.exit(0); });
