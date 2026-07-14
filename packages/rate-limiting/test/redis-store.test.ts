import { describe, it, expect } from 'vitest';
import { RedisSlidingWindowStore, type RedisEvalClient } from '../src/redis-store.js';

// Fake client que grava os argumentos do EVAL e devolve uma reply canned. Valida a
// forma da chamada (numKeys, KEYS/ARGV) e o parse da resposta, sem Redis real. A
// SEMANTICA da janela (contar/deslizar/bloquear) e provada pela MemorySlidingWindowStore,
// que espelha o mesmo algoritmo do script Lua.
function fakeClient(reply: [number, number, number]) {
  const calls: { script: string; numKeys: number; args: (string | number)[] }[] = [];
  const client: RedisEvalClient = {
    eval: async (script, numKeys, ...args) => {
      calls.push({ script, numKeys, args });
      return reply;
    },
  };
  return { client, calls };
}

describe('RedisSlidingWindowStore', () => {
  it('chama EVAL com 1 KEY e ARGV = [now, windowMs, limit, member]', async () => {
    const { client, calls } = fakeClient([1, 1, 0]);
    const store = new RedisSlidingWindowStore(client);

    await store.hit('rl:ingest:event:ev1', {
      now: 1_000_000,
      windowMs: 60_000,
      limit: 600,
      member: '1000000-1',
    });

    expect(calls).toHaveLength(1);
    const call = calls[0]!;
    expect(call.numKeys).toBe(1);
    expect(call.args).toEqual(['rl:ingest:event:ev1', 1_000_000, 60_000, 600, '1000000-1']);
    expect(call.script).toContain('ZREMRANGEBYSCORE');
  });

  it('mapeia reply [1, count, 0] para allowed=true', async () => {
    const { client } = fakeClient([1, 4, 0]);
    const store = new RedisSlidingWindowStore(client);
    const r = await store.hit('k', { now: 0, windowMs: 1000, limit: 10, member: 'm' });
    expect(r).toEqual({ allowed: true, count: 4, retryAfterMs: 0 });
  });

  it('mapeia reply [0, count, retry] para allowed=false', async () => {
    const { client } = fakeClient([0, 10, 750]);
    const store = new RedisSlidingWindowStore(client);
    const r = await store.hit('k', { now: 0, windowMs: 1000, limit: 10, member: 'm' });
    expect(r).toEqual({ allowed: false, count: 10, retryAfterMs: 750 });
  });
});
