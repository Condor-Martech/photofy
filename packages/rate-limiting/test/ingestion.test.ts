import { describe, it, expect } from 'vitest';
import { RateLimiter } from '../src/rate-limiter.js';
import { MemorySlidingWindowStore } from '../src/store.js';
import {
  checkIngestionLimit,
  assertIngestionAllowed,
  DEFAULT_INGESTION_LIMITS,
  type IngestionLimits,
} from '../src/ingestion.js';
import { RateLimitError } from '../src/errors.js';

const now = 1_000_000;

function makeLimiter() {
  return new RateLimiter(new MemorySlidingWindowStore());
}

describe('checkIngestionLimit — anti-abuso na ingestao (PHF-080)', () => {
  it('bloqueia UM abusador por IP sem punir os demais participantes', async () => {
    const limiter = makeLimiter();
    const limits: IngestionLimits = {
      perIp: { limit: 3, windowMs: 60_000 },
      perEvent: { limit: 1000, windowMs: 60_000 },
    };

    const abuser = { eventId: 'ev1', ipHash: 'hash-abuser' };
    for (let i = 0; i < 3; i++) {
      expect((await checkIngestionLimit(limiter, abuser, limits, now)).allowed).toBe(true);
    }
    const blocked = await checkIngestionLimit(limiter, abuser, limits, now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.scope).toBe('ip');

    // outro participante (outro IP) no MESMO evento segue passando
    const other = { eventId: 'ev1', ipHash: 'hash-other' };
    expect((await checkIngestionLimit(limiter, other, limits, now)).allowed).toBe(true);
  });

  it('NAO throttla a multidao legitima do "brinde" (02-spec.md §6)', async () => {
    // 200 participantes distintos, 2 uploads cada = 400 req dentro do teto de evento
    const limiter = makeLimiter();
    const limits: IngestionLimits = {
      perIp: { limit: 5, windowMs: 60_000 },
      perEvent: { limit: 600, windowMs: 60_000 },
    };

    let allowed = 0;
    for (let p = 0; p < 200; p++) {
      for (let u = 0; u < 2; u++) {
        const d = await checkIngestionLimit(
          limiter,
          { eventId: 'ev1', ipHash: `guest-${p}` },
          limits,
          now,
        );
        if (d.allowed) allowed++;
      }
    }
    expect(allowed).toBe(400); // ninguem legitimo foi barrado
  });

  it('aplica o teto do evento contra flood distribuido', async () => {
    const limiter = makeLimiter();
    const limits: IngestionLimits = {
      perIp: { limit: 1000, windowMs: 60_000 },
      perEvent: { limit: 5, windowMs: 60_000 },
    };

    for (let i = 0; i < 5; i++) {
      expect(
        (await checkIngestionLimit(limiter, { eventId: 'ev1', ipHash: `ip-${i}` }, limits, now))
          .allowed,
      ).toBe(true);
    }
    const over = await checkIngestionLimit(limiter, { eventId: 'ev1', ipHash: 'ip-x' }, limits, now);
    expect(over.allowed).toBe(false);
    expect(over.scope).toBe('event');
  });

  it('isola contadores entre eventos distintos (02-spec.md §5, multi-evento)', async () => {
    const limiter = makeLimiter();
    const limits: IngestionLimits = {
      perIp: { limit: 2, windowMs: 60_000 },
      perEvent: { limit: 1000, windowMs: 60_000 },
    };
    const ipHash = 'same-ip';

    for (let i = 0; i < 2; i++) await checkIngestionLimit(limiter, { eventId: 'A', ipHash }, limits, now);
    expect((await checkIngestionLimit(limiter, { eventId: 'A', ipHash }, limits, now)).allowed).toBe(false);
    // mesmo IP, outro evento -> contador zerado
    expect((await checkIngestionLimit(limiter, { eventId: 'B', ipHash }, limits, now)).allowed).toBe(true);
  });

  it('usa defaults conservadores quando nenhum limite e passado', async () => {
    const limiter = makeLimiter();
    const d = await checkIngestionLimit(limiter, { eventId: 'ev1', ipHash: 'h' });
    expect(d.allowed).toBe(true);
    expect(d.limit).toBe(DEFAULT_INGESTION_LIMITS.perEvent.limit);
  });
});

describe('assertIngestionAllowed', () => {
  it('lanca RateLimitError com scope e retryAfter ao estourar', async () => {
    const limiter = makeLimiter();
    const limits: IngestionLimits = {
      perIp: { limit: 1, windowMs: 60_000 },
      perEvent: { limit: 1000, windowMs: 60_000 },
    };
    const subject = { eventId: 'ev1', ipHash: 'h' };

    await assertIngestionAllowed(limiter, subject, limits, now);
    await expect(assertIngestionAllowed(limiter, subject, limits, now)).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      scope: 'ip',
    });
    await expect(assertIngestionAllowed(limiter, subject, limits, now)).rejects.toBeInstanceOf(
      RateLimitError,
    );
  });
});
