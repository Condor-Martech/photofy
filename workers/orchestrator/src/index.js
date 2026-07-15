// Entrypoint do worker: sobe um Worker BullMQ por fila e liga o shutdown limpo.
// Epic 3 troca os processadores placeholder pelos reais — o resto do cableado fica.
import { QUEUE_NAMES, createWorker } from './queues.js';
import { createConnection, redisUrl } from './connection.js';
import { imageProcessor } from './processors/image.js';
import { reelProcessor } from './processors/reel.js';

const connection = createConnection();

const workers = [
  createWorker(QUEUE_NAMES.image, imageProcessor, connection),
  createWorker(QUEUE_NAMES.reel, reelProcessor, connection),
];

for (const w of workers) {
  w.on('completed', (job) => console.log(`[${w.name}] job ${job.id} concluído`));
  w.on('failed', (job, err) => console.error(`[${w.name}] job ${job?.id} falhou: ${err.message}`));
}

console.log(`photofy worker no ar — redis ${redisUrl()} — filas: ${Object.values(QUEUE_NAMES).join(', ')}`);

const shutdown = async () => {
  await Promise.all(workers.map((w) => w.close()));
  await connection.quit();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
