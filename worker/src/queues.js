// Definições puras das filas — sem side effects, sem conexão Redis.
// Importável em testes e por produtores (API/Epic 2) sem abrir socket.
import { Queue, Worker } from 'bullmq';

// Uma fila por tipo de mídia. Epic 3 pluga os processadores reais nestas filas.
export const QUEUE_NAMES = {
  image: 'media:image',
  reel: 'media:reel',
};

// Retry com backoff exponencial: falha transitória re-enfileira em vez de morrer (base para PHF-033).
export const defaultJobOptions = {
  attempts: Number(process.env.QUEUE_ATTEMPTS ?? 3),
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 1000,
  removeOnFail: 5000,
};

export const createQueue = (name, connection) =>
  new Queue(name, { connection, defaultJobOptions });

export const createWorker = (name, processor, connection) =>
  new Worker(name, processor, { connection });
