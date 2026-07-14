import type { MediaRepo } from './job-handler.js';

// PHF-033 — Tratamento de erro/retry com backoff; status "erro" isolado.
// Queue-agnostico de proposito: tanto o worker de imagem (PHF-030) quanto o de
// reel (PHF-031) consomem estas mesmas politicas. Nao existe canal de
// notificacao ao participante por design — silencio de moderacao (CLAUDE.md).

export const MEDIA_JOB_ATTEMPTS = Number(process.env.MEDIA_JOB_ATTEMPTS ?? 3);
export const MEDIA_JOB_BACKOFF_MS = Number(process.env.MEDIA_JOB_BACKOFF_MS ?? 5000);

// Opcoes que o produtor (enqueue de PHF-021) espalha em queue.add(): retry com
// backoff exponencial. removeOnFail=false mantem o job falho na fila para
// inspecao/reprocesso manual, alinhado ao "isolado para reprocessamento manual".
export const mediaJobOptions = {
  attempts: MEDIA_JOB_ATTEMPTS,
  backoff: { type: 'exponential', delay: MEDIA_JOB_BACKOFF_MS },
  removeOnComplete: true,
  removeOnFail: false,
} as const;

export interface FailureContext {
  mediaId: string;
  attemptsMade: number;
  maxAttempts: number;
}

// BullMQ emite "failed" a cada tentativa, nao so na ultima. So isolamos quando o
// retry realmente esgotou; do contrario a fila ainda vai tentar de novo.
export function retriesExhausted(ctx: {
  attemptsMade: number;
  maxAttempts: number;
}): boolean {
  return ctx.attemptsMade >= ctx.maxAttempts;
}

// Isola o item em "erro" quando o retry acaba. O UNICO efeito colateral e
// media.update({ status: 'erro' }) — nenhuma notificacao ao participante.
export async function isolateFailedMedia(
  ctx: FailureContext,
  media: Pick<MediaRepo, 'update'>,
): Promise<'isolated' | 'will-retry'> {
  if (!retriesExhausted({ attemptsMade: ctx.attemptsMade, maxAttempts: ctx.maxAttempts })) {
    return 'will-retry';
  }
  await media.update(ctx.mediaId, { status: 'erro' });
  return 'isolated';
}
