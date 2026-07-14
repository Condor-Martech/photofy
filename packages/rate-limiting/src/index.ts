export { RateLimitError } from './errors.js';
export type { RateLimitScope } from './errors.js';

export { hashIp } from './hash-ip.js';

export { MemorySlidingWindowStore } from './store.js';
export type { RateLimitStore, HitInput, HitResult } from './store.js';

export { RedisSlidingWindowStore } from './redis-store.js';
export type { RedisEvalClient } from './redis-store.js';

export { RateLimiter } from './rate-limiter.js';
export type {
  RateLimitRule,
  RateLimitResult,
  RateLimiterOptions,
  FailMode,
} from './rate-limiter.js';

export {
  checkIngestionLimit,
  assertIngestionAllowed,
  DEFAULT_INGESTION_LIMITS,
} from './ingestion.js';
export type { IngestionLimits, IngestionSubject, IngestionDecision } from './ingestion.js';
