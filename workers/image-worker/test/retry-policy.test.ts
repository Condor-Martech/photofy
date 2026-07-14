import { describe, it, expect, vi } from 'vitest';
import {
  isolateFailedMedia,
  retriesExhausted,
  mediaJobOptions,
  type FailureContext,
} from '../src/retry-policy.js';
import type { MediaRepo } from '../src/job-handler.js';

// A repo fake que registra QUALQUER metodo chamado — usado para provar que o
// unico efeito colateral do isolamento e media.update, nunca um aviso ao
// participante (nao existe metodo de notificacao no contrato, por design).
function spyRepo() {
  const update = vi.fn(async (_id: string, _patch: Partial<import('../src/job-handler.js').MediaItem>) => {});
  const media: Pick<MediaRepo, 'update'> = { update };
  return { media, update };
}

describe('retriesExhausted', () => {
  it('is false while attempts remain', () => {
    expect(retriesExhausted({ attemptsMade: 1, maxAttempts: 3 })).toBe(false);
    expect(retriesExhausted({ attemptsMade: 2, maxAttempts: 3 })).toBe(false);
  });

  it('is true once attempts are used up', () => {
    expect(retriesExhausted({ attemptsMade: 3, maxAttempts: 3 })).toBe(true);
    expect(retriesExhausted({ attemptsMade: 4, maxAttempts: 3 })).toBe(true);
  });
});

// Feature: Processamento assincrono de midia — 02-spec.md §5
//   Scenario: Falha de processamento nao expoe erro ao participante
describe('isolateFailedMedia — Gherkin: falha nao expoe erro ao participante', () => {
  it('does nothing while retries remain (queue will try again)', async () => {
    // Given um media_item cujo processamento falhou, mas ainda ha tentativas
    const { media, update } = spyRepo();
    const ctx: FailureContext = { mediaId: 'm1', attemptsMade: 1, maxAttempts: 3 };

    // When o worker falha numa tentativa intermediaria
    const result = await isolateFailedMedia(ctx, media);

    // Then nada e isolado ainda; a fila fara retry
    expect(result).toBe('will-retry');
    expect(update).not.toHaveBeenCalled();
  });

  it('isolates the item as "erro" once retries are exhausted, with no participant notification', async () => {
    // Given um media_item cujo processamento falha apos as tentativas de retry configuradas
    const { media, update } = spyRepo();
    const ctx: FailureContext = { mediaId: 'm1', attemptsMade: 3, maxAttempts: 3 };

    // When o worker esgota as tentativas
    const result = await isolateFailedMedia(ctx, media);

    // Then o item recebe status "erro", isolado para reprocessamento manual
    expect(result).toBe('isolated');
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith('m1', { status: 'erro' });

    // And nenhuma notificacao e exibida ao participante: o unico efeito colateral
    // foi media.update. O contrato nao expoe canal de notificacao algum.
    const patch = update.mock.calls[0]![1];
    expect(Object.keys(patch)).toEqual(['status']);
  });
});

describe('mediaJobOptions — politica de retry/backoff (PHF-033)', () => {
  it('retries with exponential backoff and keeps failed jobs for manual reprocess', () => {
    expect(mediaJobOptions.attempts).toBeGreaterThanOrEqual(1);
    expect(mediaJobOptions.backoff.type).toBe('exponential');
    expect(mediaJobOptions.backoff.delay).toBeGreaterThan(0);
    // removeOnFail=false mantem o job isolado na fila para inspecao manual.
    expect(mediaJobOptions.removeOnFail).toBe(false);
  });
});
