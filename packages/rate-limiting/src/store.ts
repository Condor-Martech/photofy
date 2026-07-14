// Contrato de armazenamento do rate limiter. UMA operacao atomica: registra uma
// tentativa e devolve a decisao. A atomicidade e obrigatoria — sob rajada (o
// "momento do brinde", 02-spec.md §6) varias requisicoes da mesma origem chegam
// concorrentes; um ciclo read-modify-write nao-atomico deixaria passar mais que o
// limite. Por isso a decisao (`allowed`) e calculada DENTRO da operacao, nao no
// chamador.
export interface HitInput {
  now: number; // epoch ms — injetado para testes determinísticos
  windowMs: number; // tamanho da janela deslizante
  limit: number; // maximo de tentativas permitidas na janela
  member: string; // identificador unico da tentativa (evita colisao no mesmo ms)
}

export interface HitResult {
  allowed: boolean;
  count: number; // tentativas na janela apos esta (inclui a atual se permitida)
  retryAfterMs: number; // 0 quando permitida; senao, ms ate liberar um slot
}

export interface RateLimitStore {
  hit(key: string, input: HitInput): Promise<HitResult>;
}

// Janela deslizante em memoria. Usada em testes hermeticos e em dev/single-node.
// NAO serve para produçao multi-replica (cada pod teria sua propria contagem) —
// ali usa-se RedisSlidingWindowStore. A logica de decisao aqui espelha byte a byte
// o script Lua de redis-store.ts: se divergirem, os testes desta store deixam de
// valer como prova do comportamento em produçao.
export class MemorySlidingWindowStore implements RateLimitStore {
  private readonly hits = new Map<string, number[]>();

  async hit(key: string, { now, windowMs, limit, member: _member }: HitInput): Promise<HitResult> {
    const cutoff = now - windowMs;
    const timestamps = (this.hits.get(key) ?? []).filter((ts) => ts > cutoff);

    if (timestamps.length < limit) {
      timestamps.push(now);
      this.hits.set(key, timestamps);
      return { allowed: true, count: timestamps.length, retryAfterMs: 0 };
    }

    this.hits.set(key, timestamps);
    const earliest = timestamps[0] ?? now;
    const retryAfterMs = Math.max(0, earliest + windowMs - now);
    return { allowed: false, count: timestamps.length, retryAfterMs };
  }
}
