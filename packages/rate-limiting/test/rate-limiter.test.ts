import { describe, it, expect } from 'vitest';
import { RateLimiter } from '../src/rate-limiter.js';
import { MemorySlidingWindowStore, type RateLimitStore } from '../src/store.js';

const RULE = { limit: 3, windowMs: 1000 };

describe('RateLimiter (janela deslizante)', () => {
  it('permite ate o limite e bloqueia a proxima', async () => {
    const rl = new RateLimiter(new MemorySlidingWindowStore());
    const now = 1_000_000;

    for (let i = 0; i < 3; i++) {
      const r = await rl.check('k', RULE, now);
      expect(r.allowed).toBe(true);
      expect(r.remaining).toBe(3 - (i + 1));
    }

    const blocked = await rl.check('k', RULE, now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
    expect(blocked.retryAfterMs).toBeLessThanOrEqual(1000);
  });

  it('libera conforme a janela desliza', async () => {
    const rl = new RateLimiter(new MemorySlidingWindowStore());
    const start = 1_000_000;

    for (let i = 0; i < 3; i++) await rl.check('k', RULE, start);
    expect((await rl.check('k', RULE, start)).allowed).toBe(false);

    // depois da janela inteira, tudo expira
    expect((await rl.check('k', RULE, start + 1001)).allowed).toBe(true);
  });

  it('isola contadores por chave', async () => {
    const rl = new RateLimiter(new MemorySlidingWindowStore());
    const now = 1_000_000;

    for (let i = 0; i < 3; i++) await rl.check('a', RULE, now);
    expect((await rl.check('a', RULE, now)).allowed).toBe(false);
    // outra chave comeca do zero
    expect((await rl.check('b', RULE, now)).allowed).toBe(true);
  });

  it('nao subconta rajada no mesmo milissegundo (members unicos)', async () => {
    const rl = new RateLimiter(new MemorySlidingWindowStore());
    const now = 1_000_000;
    // 5 chamadas concorrentes no MESMO now
    const results = await Promise.all(
      Array.from({ length: 5 }, () => rl.check('k', RULE, now)),
    );
    expect(results.filter((r) => r.allowed)).toHaveLength(3);
    expect(results.filter((r) => !r.allowed)).toHaveLength(2);
  });

  const explodingStore: RateLimitStore = {
    hit: async () => {
      throw new Error('redis down');
    },
  };

  it('fail-open (default): store caido -> permite, e reporta o erro', async () => {
    const errors: string[] = [];
    const rl = new RateLimiter(explodingStore, {
      onStoreError: (key) => errors.push(key),
    });
    const r = await rl.check('k', RULE, 1_000_000);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(3);
    expect(errors).toEqual(['k']);
  });

  it('fail-closed (opt-in): store caido -> bloqueia', async () => {
    const rl = new RateLimiter(explodingStore, { failMode: 'closed' });
    const r = await rl.check('k', RULE, 1_000_000);
    expect(r.allowed).toBe(false);
    expect(r.retryAfterMs).toBe(RULE.windowMs);
  });
});
