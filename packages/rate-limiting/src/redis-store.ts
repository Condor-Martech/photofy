import type { HitInput, HitResult, RateLimitStore } from './store.js';

// Interface minima compativel com ioredis (o mesmo cliente do BullMQ, 02-spec.md §2).
// So precisamos de `eval` — injetavel para testar sem Redis real.
export interface RedisEvalClient {
  eval(script: string, numKeys: number, ...args: (string | number)[]): Promise<unknown>;
}

// Janela deslizante atomica via sorted set. Tudo num unico EVAL para nao haver
// janela de corrida entre contar e gravar:
//   1. ZREMRANGEBYSCORE — descarta tentativas mais velhas que a janela.
//   2. ZCARD           — conta o que sobrou.
//   3a. sob o limite -> ZADD a tentativa atual + PEXPIRE (auto-limpa a chave ociosa).
//   3b. no limite     -> NAO grava (evita que um abusador persistente empurre a
//       janela pra frente pra sempre) e calcula quando o slot mais antigo expira.
// Retorna { allowed(0|1), count, retryAfterMs }.
const SLIDING_WINDOW_LUA = `
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, now - window)
local count = redis.call('ZCARD', KEYS[1])
if count < limit then
  redis.call('ZADD', KEYS[1], now, member)
  redis.call('PEXPIRE', KEYS[1], window)
  return { 1, count + 1, 0 }
end
local earliest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
local retry = window
if earliest[2] then
  retry = (tonumber(earliest[2]) + window) - now
  if retry < 0 then retry = 0 end
end
return { 0, count, retry }
`;

export class RedisSlidingWindowStore implements RateLimitStore {
  constructor(private readonly client: RedisEvalClient) {}

  async hit(key: string, { now, windowMs, limit, member }: HitInput): Promise<HitResult> {
    const reply = (await this.client.eval(
      SLIDING_WINDOW_LUA,
      1,
      key,
      now,
      windowMs,
      limit,
      member,
    )) as [number, number, number];

    return {
      allowed: reply[0] === 1,
      count: reply[1],
      retryAfterMs: reply[2],
    };
  }
}
