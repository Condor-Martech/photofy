import { Worker } from 'bullmq';
import { handleImageJob, type ImageJobData, type ImageJobDeps } from './job-handler.js';
import { isolateFailedMedia } from './retry-policy.js';

export const IMAGE_QUEUE = 'image-processing';

// Let BullMQ own the Redis connection from a plain options object — avoids the
// dual-ioredis package hazard and keeps this worker with one fewer dependency.
export function startImageWorker(deps: ImageJobDeps): Worker<ImageJobData> {
  const url = new URL(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379');
  const concurrency = Number(process.env.IMAGE_WORKER_CONCURRENCY ?? 2);

  const worker = new Worker<ImageJobData>(
    IMAGE_QUEUE,
    (job) => handleImageJob(job.data, deps),
    {
      connection: {
        host: url.hostname,
        port: Number(url.port || 6379),
        password: url.password || undefined,
        maxRetriesPerRequest: null,
      },
      concurrency,
    },
  );

  // PHF-033: o retry/backoff vem das mediaJobOptions aplicadas no enqueue; aqui,
  // quando as tentativas esgotam, isolamos o item em status "erro" para reprocesso
  // manual. Nunca ha aviso ao participante (silencio de moderacao, CLAUDE.md).
  worker.on('failed', (job, err) => {
    console.error(`image job ${job?.id ?? '?'} failed: ${err.message}`);
    if (!job) return;
    void isolateFailedMedia(
      {
        mediaId: job.data.mediaId,
        attemptsMade: job.attemptsMade,
        maxAttempts: job.opts.attempts ?? 1,
      },
      deps.media,
    ).catch((e) => console.error(`failed to isolate media ${job.data.mediaId}: ${e}`));
  });

  return worker;
}
