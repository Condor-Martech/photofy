import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import fs from 'node:fs';
import path from 'node:path';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const N = Number(process.env.BURST_N || 50);
// Caminho como o WORKER o enxerga (container montado ou host) -- nao resolvido
// aqui pois o load-test roda no host mas o worker pode rodar em outro
// filesystem (container Docker).
const FIXTURE = process.env.FIXTURE || path.resolve('fixtures/raw-reel-75mb.mp4');
const LABEL = process.env.LABEL || 'run';

const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
const queue = new Queue('reel-transcode', { connection });
const queueEvents = new QueueEvents('reel-transcode', { connection });

async function main() {
  await queue.obliterate({ force: true }).catch(() => {});

  const enqueuedAt = Date.now();
  const jobs = await queue.addBulk(
    Array.from({ length: N }, (_, i) => ({
      name: 'transcode',
      data: { inputPath: FIXTURE, enqueuedAt },
      opts: { jobId: `${LABEL}-${i}`, attempts: 1 },
    }))
  );
  console.log(`enqueued ${jobs.length} jobs at t=0 (burst)`);

  const results = [];
  await new Promise((resolve, reject) => {
    let done = 0;
    queueEvents.on('completed', async ({ jobId, returnvalue }) => {
      done++;
      results.push(typeof returnvalue === 'string' ? JSON.parse(returnvalue) : returnvalue);
      if (done === N) resolve();
    });
    queueEvents.on('failed', ({ jobId, failedReason }) => {
      console.error(`FAILED ${jobId}: ${failedReason}`);
      done++;
      if (done === N) resolve();
    });
    setTimeout(() => reject(new Error('load-test timeout after 10min')), 10 * 60 * 1000);
  });

  const waits = results.map((r) => r.waitMs).sort((a, b) => a - b);
  const totals = results.map((r) => r.totalMs).sort((a, b) => a - b);
  const sizes = results.map((r) => r.outputBytes);
  const pct = (arr, p) => arr[Math.min(arr.length - 1, Math.floor((p / 100) * arr.length))];

  const summary = {
    label: LABEL,
    n: N,
    completed: results.length,
    wallClockMs: Date.now() - enqueuedAt,
    waitMs: { p50: pct(waits, 50), p95: pct(waits, 95), max: waits[waits.length - 1] },
    totalMs: { p50: pct(totals, 50), p95: pct(totals, 95), max: totals[totals.length - 1] },
    under60s: results.filter((r) => r.totalMs < 60000).length,
    under60sPct: (results.filter((r) => r.totalMs < 60000).length / results.length) * 100,
    outputSizeMB: {
      min: Math.min(...sizes) / 1e6,
      max: Math.max(...sizes) / 1e6,
      avg: sizes.reduce((a, b) => a + b, 0) / sizes.length / 1e6,
    },
  };

  fs.mkdirSync('results', { recursive: true });
  fs.writeFileSync(`results/${LABEL}.json`, JSON.stringify({ summary, results }, null, 2));
  console.log(JSON.stringify(summary, null, 2));

  await queueEvents.close();
  await queue.close();
  await connection.quit();
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
