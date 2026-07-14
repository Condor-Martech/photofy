import { describe, expect, it, vi } from 'vitest';
import { AuditLogger } from '../src/logger.js';
import { MemoryAuditSink, type AuditSink } from '../src/sinks.js';
import { hashIp } from '../src/hash-ip.js';
import type { AuditEntry } from '../src/events.js';

const T0 = new Date('2026-07-14T12:00:00.000Z');

function makeLogger(sink: AuditSink, salt = 'salt-x') {
  return new AuditLogger({ sink, ipSalt: salt, now: () => T0 });
}

describe('AuditLogger', () => {
  it('persiste a forma canonica com defaults e timestamp injetado', async () => {
    const sink = new MemoryAuditSink();
    const entry = await makeLogger(sink).record({
      actorType: 'staff',
      acao: 'moderacao.reprovar',
      actorId: 'mod-1',
      recursoTipo: 'media_item',
      recursoId: 'm-1',
    });

    expect(entry.criadoEm).toBe(T0.toISOString());
    expect(entry.severidade).toBe('info');
    expect(entry.metadata).toEqual({});
    expect(entry.eventId).toBeNull();
    expect(sink.entries).toHaveLength(1);
    expect(sink.entries[0]).toEqual(entry);
  });

  it('hasheia o IP (LGPD) e NUNCA persiste o IP em claro', async () => {
    const sink = new MemoryAuditSink();
    const ip = '203.0.113.7';
    const entry = await makeLogger(sink, 'salt-x').record({
      actorType: 'anon',
      acao: 'acesso.galeria',
      ip,
    });

    expect(entry.ipHash).toBe(hashIp(ip, 'salt-x'));
    const persisted = JSON.stringify(sink.entries[0]);
    expect(persisted).not.toContain(ip);
  });

  it('sem IP, ipHash e null (nao inventa PII)', async () => {
    const sink = new MemoryAuditSink();
    const entry = await makeLogger(sink).record({ actorType: 'worker', acao: 'processamento.erro' });
    expect(entry.ipHash).toBeNull();
  });

  it('fail-open: falha do sink nao propaga para o chamador (nao derruba a request)', async () => {
    const boom: AuditSink = {
      write: () => Promise.reject(new Error('sink indisponivel')),
    };
    const onError = vi.fn();
    const logger = new AuditLogger({ sink: boom, ipSalt: 'salt-x', now: () => T0, onError });

    const entry = await logger.record({ actorType: 'anon', acao: 'acesso.galeria' });

    expect(onError).toHaveBeenCalledOnce();
    expect((onError.mock.calls[0]?.[1] as AuditEntry).acao).toBe('acesso.galeria');
    expect(entry.acao).toBe('acesso.galeria'); // ainda devolve a entry ao chamador
  });
});
