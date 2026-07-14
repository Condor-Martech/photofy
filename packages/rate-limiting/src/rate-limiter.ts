import type { RateLimitStore } from './store.js';

export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterMs: number;
}

// 'open'   -> se o store falhar, PERMITE a requisicao (default).
// 'closed' -> se o store falhar, BLOQUEIA.
//
// Default 'open' e deliberado: rate limiting protege DISPONIBILIDADE. Num evento ao
// vivo, um blip no Redis nao pode derrubar toda a ingestao — o custo de deixar
// passar alguns uploads a mais e muito menor que barrar todos os participantes no
// "momento do brinde" (02-spec.md §6, "Absorver picos de upload sem degradar").
// Isso e o OPOSTO do antivirus (PHF-032), que e fail-CLOSED porque protege
// integridade, nao disponibilidade. Toda vez que o fail-open dispara, logamos para
// o alerta de anomalia do PHF-082 detectar Redis degradado.
export type FailMode = 'open' | 'closed';

export interface RateLimiterOptions {
  failMode?: FailMode;
  onStoreError?: (key: string, error: unknown) => void;
}

export class RateLimiter {
  private readonly failMode: FailMode;
  private readonly onStoreError?: (key: string, error: unknown) => void;
  private seq = 0;

  constructor(
    private readonly store: RateLimitStore,
    options: RateLimiterOptions = {},
  ) {
    this.failMode = options.failMode ?? 'open';
    this.onStoreError = options.onStoreError;
  }

  async check(key: string, rule: RateLimitRule, now: number = Date.now()): Promise<RateLimitResult> {
    // member unico por tentativa: sob rajada varias caem no mesmo `now` (ms), e um
    // sorted set descartaria as duplicatas de score+member iguais, subcontando.
    const member = `${now}-${(this.seq = (this.seq + 1) % Number.MAX_SAFE_INTEGER)}`;

    try {
      const { allowed, count, retryAfterMs } = await this.store.hit(key, {
        now,
        windowMs: rule.windowMs,
        limit: rule.limit,
        member,
      });
      return {
        allowed,
        limit: rule.limit,
        remaining: Math.max(0, rule.limit - count),
        retryAfterMs,
      };
    } catch (error) {
      this.onStoreError?.(key, error);
      if (this.failMode === 'closed') {
        return { allowed: false, limit: rule.limit, remaining: 0, retryAfterMs: rule.windowMs };
      }
      return { allowed: true, limit: rule.limit, remaining: rule.limit, retryAfterMs: 0 };
    }
  }
}
