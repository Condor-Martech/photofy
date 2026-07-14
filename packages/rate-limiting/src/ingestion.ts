import { RateLimitError } from './errors.js';
import type { RateLimiter, RateLimitResult, RateLimitRule } from './rate-limiter.js';

// Politica anti-abuso da ingestao (PHF-080). Dois limites complementares:
//
//  - perIp:    barra UM abusador martelando o endpoint (script, bot) sem punir a
//              multidao legitima. 20/min por IP+evento e folgado pra uma pessoa
//              real (algumas fotos), apertado pra automacao.
//  - perEvent: teto de seguranca contra DoS/flood distribuido no evento inteiro.
//              600/min absorve uma multidao real no "momento do brinde"
//              (02-spec.md §6) e ainda corta uma enxurrada catastrofica.
//
// Sao DEFAULTS conservadores em favor da disponibilidade — sao por-evento e devem
// virar coluna configuravel de `events` quando o produto tiver telemetria de carga
// real. Erra-se pro lado de deixar passar, nunca pro lado de barrar participante.
export interface IngestionLimits {
  perIp: RateLimitRule;
  perEvent: RateLimitRule;
}

export const DEFAULT_INGESTION_LIMITS: IngestionLimits = {
  perIp: { limit: 20, windowMs: 60_000 },
  perEvent: { limit: 600, windowMs: 60_000 },
};

export interface IngestionSubject {
  eventId: string;
  ipHash: string; // ja hasheado (LGPD) — ver hashIp()
}

export interface IngestionDecision extends RateLimitResult {
  scope: 'ip' | 'event' | null; // qual limite bloqueou; null quando permitido
}

// Checa IP primeiro (corta o abusador barato, antes de tocar no contador do evento)
// e so entao o teto do evento. Nao lanca — devolve a decisao pro chamador montar o
// 429. Use assertIngestionAllowed() quando preferir excecao.
export async function checkIngestionLimit(
  limiter: RateLimiter,
  subject: IngestionSubject,
  limits: IngestionLimits = DEFAULT_INGESTION_LIMITS,
  now: number = Date.now(),
): Promise<IngestionDecision> {
  const ip = await limiter.check(
    `rl:ingest:ip:${subject.eventId}:${subject.ipHash}`,
    limits.perIp,
    now,
  );
  if (!ip.allowed) {
    return { ...ip, scope: 'ip' };
  }

  const event = await limiter.check(`rl:ingest:event:${subject.eventId}`, limits.perEvent, now);
  if (!event.allowed) {
    return { ...event, scope: 'event' };
  }

  return { ...event, scope: null };
}

export async function assertIngestionAllowed(
  limiter: RateLimiter,
  subject: IngestionSubject,
  limits: IngestionLimits = DEFAULT_INGESTION_LIMITS,
  now: number = Date.now(),
): Promise<IngestionDecision> {
  const decision = await checkIngestionLimit(limiter, subject, limits, now);
  if (!decision.allowed && decision.scope) {
    throw new RateLimitError(decision.scope, decision.retryAfterMs);
  }
  return decision;
}
