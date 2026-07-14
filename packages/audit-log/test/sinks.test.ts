import { describe, expect, it, vi } from 'vitest';
import {
  StdoutAuditSink,
  createSupabaseSink,
  type SupabaseInsertClient,
} from '../src/sinks.js';
import type { AuditEntry } from '../src/events.js';

const entry: AuditEntry = {
  eventId: 'ev-1',
  actorId: 'mod-1',
  actorType: 'staff',
  acao: 'moderacao.reprovar',
  recursoTipo: 'media_item',
  recursoId: 'm-1',
  ipHash: 'h-1',
  severidade: 'info',
  metadata: { motivo: 'conteudo improprio' },
  criadoEm: '2026-07-14T12:00:00.000Z',
};

describe('StdoutAuditSink', () => {
  it('emite uma linha JSON estruturada marcada como audit', async () => {
    const lines: string[] = [];
    await new StdoutAuditSink((l) => lines.push(l)).write(entry);
    const parsed = JSON.parse(lines[0]!);
    expect(parsed.tipo).toBe('audit');
    expect(parsed.acao).toBe('moderacao.reprovar');
  });
});

describe('createSupabaseSink', () => {
  it('mapeia camelCase -> colunas snake_case de audit_log', async () => {
    const insert = vi.fn(async () => ({ error: null }));
    const client: SupabaseInsertClient = { from: () => ({ insert }) };

    await createSupabaseSink(client).write(entry);

    expect(insert).toHaveBeenCalledWith({
      event_id: 'ev-1',
      actor_id: 'mod-1',
      actor_type: 'staff',
      acao: 'moderacao.reprovar',
      recurso_tipo: 'media_item',
      recurso_id: 'm-1',
      ip_hash: 'h-1',
      severidade: 'info',
      metadata: { motivo: 'conteudo improprio' },
      criado_em: '2026-07-14T12:00:00.000Z',
    });
  });

  it('propaga erro de insert (o logger fara fail-open por cima)', async () => {
    const client: SupabaseInsertClient = {
      from: () => ({ insert: async () => ({ error: { message: 'rls' } }) }),
    };
    await expect(createSupabaseSink(client).write(entry)).rejects.toThrow(/audit_log insert falhou/);
  });
});
