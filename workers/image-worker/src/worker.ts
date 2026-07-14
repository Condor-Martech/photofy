import { Worker } from 'bullmq';
import { handleImageJob, type ImageJobData, type ImageJobDeps } from './job-handler.js';

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

  // Retry/backoff and the isolated "erro" status are PHF-033; here we only
  // surface the failure so the queue's default retry policy can act on it.
  worker.on('failed', (job, err) => {
    console.error(`image job ${job?.id ?? '?'} failed: ${err.message}`);
  });

  return worker;
}
