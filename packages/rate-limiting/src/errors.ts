// Erro tecnico de excesso de requisicoes na ingestao (PHF-080). Como o
// ValidationError do PHF-032, NAO carrega semantica de moderacao: e uma falha
// tecnica de "muitas requisicoes" (HTTP 429), nunca um "aprovado/reprovado"
// (regra de silencio de moderacao do CLAUDE.md). O chamador deve traduzir para
// 429 com header `Retry-After: ceil(retryAfterMs / 1000)`.
//
// `scope` diz qual limite estourou (ip | event) para observabilidade (PHF-082),
// nunca para exibir ao participante.
export type RateLimitScope = 'ip' | 'event';

export class RateLimitError extends Error {
  readonly code = 'RATE_LIMITED' as const;
  readonly scope: RateLimitScope;
  readonly retryAfterMs: number;

  constructor(scope: RateLimitScope, retryAfterMs: number) {
    super(`Limite de ingestao excedido (${scope})`);
    this.scope = scope;
    this.retryAfterMs = retryAfterMs;
    this.name = 'RateLimitError';
  }
}
