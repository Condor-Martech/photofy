import IORedis from 'ioredis';

export const redisUrl = () => process.env.REDIS_URL ?? 'redis://localhost:6379';

// ponytail: uma conexão compartilhada por todas as filas/workers; separar por-fila só se uma saturar o pool.
// maxRetriesPerRequest: null é exigido pelo BullMQ para o worker sobreviver a reconexões.
export const createConnection = () =>
  new IORedis(redisUrl(), { maxRetriesPerRequest: null });
