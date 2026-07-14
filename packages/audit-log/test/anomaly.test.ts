import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ANOMALY_CONFIG,
  evaluateAnomalies,
  detectProcessingFailureSpike,
  detectAuthFailureSpike,
  detectMassRejection,
} from '../src/anomaly.js';
import { AuditAction, type AuditEntry } from '../src/events.js';

const NOW = Date.parse('2026-07-14T12:00:00.000Z');

function entry(over: Partial<AuditEntry> & Pick<AuditEntry, 'acao'>): AuditEntry {
  return {
    eventId: null,
    actorId: null,
    actorType: 'system',
    recursoTipo: null,
    recursoId: null,
    ipHash: null,
    severidade: 'info',
    metadata: {},
    criadoEm: new Date(NOW).toISOString(),
    ...over,
  };
}

function repeat(n: number, over: Partial<AuditEntry> & Pick<AuditEntry, 'acao'>): AuditEntry[] {
  return Array.from({ length: n }, () => entry(over));
}

describe('detectProcessingFailureSpike', () => {
  it('dispara ao atingir o limiar, agrupado por evento', () => {
    const alerts = detectProcessingFailureSpike(
      repeat(5, { acao: AuditAction.PROCESSAMENTO_ERRO, eventId: 'ev-1' }),
      DEFAULT_ANOMALY_CONFIG,
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.regra).toBe('processamento.erro.pico');
    expect(alerts[0]?.eventId).toBe('ev-1');
    expect(alerts[0]?.contagem).toBe(5);
  });

  it('nao dispara abaixo do limiar', () => {
    const alerts = detectProcessingFailureSpike(
      repeat(4, { acao: AuditAction.PROCESSAMENTO_ERRO, eventId: 'ev-1' }),
      DEFAULT_ANOMALY_CONFIG,
    );
    expect(alerts).toHaveLength(0);
  });
});

describe('detectAuthFailureSpike', () => {
  it('agrupa por ip_hash (brute-force)', () => {
    const alerts = detectAuthFailureSpike(
      [
        ...repeat(5, { acao: AuditAction.AUTH_FALHA, ipHash: 'h-atacante' }),
        ...repeat(2, { acao: AuditAction.AUTH_FALHA, ipHash: 'h-legitimo' }),
      ],
      DEFAULT_ANOMALY_CONFIG,
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.chave).toBe('h-atacante');
    expect(alerts[0]?.regra).toBe('auth.falha.brute_force');
  });

  it('ignora falhas sem ip_hash (nao ha como agrupar)', () => {
    const alerts = detectAuthFailureSpike(
      repeat(9, { acao: AuditAction.AUTH_FALHA, ipHash: null }),
      DEFAULT_ANOMALY_CONFIG,
    );
    expect(alerts).toHaveLength(0);
  });
});

describe('detectMassRejection', () => {
  it('agrupa reprovacoes por moderador', () => {
    const alerts = detectMassRejection(
      repeat(50, { acao: AuditAction.MODERACAO_REPROVAR, actorId: 'mod-1' }),
      DEFAULT_ANOMALY_CONFIG,
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.chave).toBe('mod-1');
  });
});

describe('evaluateAnomalies (janela deslizante)', () => {
  it('descarta eventos fora da janela', () => {
    const antigos = repeat(5, {
      acao: AuditAction.PROCESSAMENTO_ERRO,
      eventId: 'ev-1',
      criadoEm: new Date(NOW - 10 * 60 * 1000).toISOString(), // 10 min atras (janela=5min)
    });
    expect(evaluateAnomalies(antigos, DEFAULT_ANOMALY_CONFIG, NOW)).toHaveLength(0);
  });

  it('roda todos os detectores juntos', () => {
    const alerts = evaluateAnomalies(
      [
        ...repeat(5, { acao: AuditAction.PROCESSAMENTO_ERRO, eventId: 'ev-1' }),
        ...repeat(5, { acao: AuditAction.AUTH_FALHA, ipHash: 'h-atacante' }),
      ],
      DEFAULT_ANOMALY_CONFIG,
      NOW,
    );
    expect(alerts.map((a) => a.regra).sort()).toEqual([
      'auth.falha.brute_force',
      'processamento.erro.pico',
    ]);
  });
});

// ===== Cobertura Gherkin (02-spec.md secao 5) =====
// Feature: Processamento assincrono de midia
//   Scenario: Falha de processamento nao expoe erro ao participante
//     Given um media_item cujo processamento falha apos as tentativas de retry
//     When o worker esgota as tentativas
//     Then o item recebe status "erro", isolado para reprocessamento manual
//     And nenhuma notificacao e exibida ao participante que enviou o item
//
// A trilha PHF-082 reage a esse cenario levantando um alerta de operacao para
// reprocessamento manual — e o tipo garante que esse alerta NUNCA vai ao participante.
describe('Gherkin: falha de processamento nao expoe erro ao participante', () => {
  it('esgotado o retry, gera alerta de operacao para reprocessamento manual', () => {
    const falhas = repeat(5, {
      acao: AuditAction.PROCESSAMENTO_ERRO,
      actorType: 'worker',
      eventId: 'lancamento-verao',
      severidade: 'alerta',
    });

    const alerts = evaluateAnomalies(falhas, DEFAULT_ANOMALY_CONFIG, NOW);

    expect(alerts).toHaveLength(1);
    const alerta = alerts[0]!;
    expect(alerta.regra).toBe('processamento.erro.pico');
    expect(alerta.resumo).toContain('reprocessamento manual');
  });

  it('o alerta e SEMPRE endereçado a operadores, nunca ao participante', () => {
    const alerts = evaluateAnomalies(
      repeat(6, { acao: AuditAction.PROCESSAMENTO_ERRO, eventId: 'ev-1' }),
      DEFAULT_ANOMALY_CONFIG,
      NOW,
    );
    // Silencio de moderacao (CLAUDE.md): NENHUM alerta pode ter destino diferente
    // de 'operadores'. Nada no fluxo notifica o participante.
    expect(alerts.every((a) => a.audiencia === 'operadores')).toBe(true);
    const serialized = JSON.stringify(alerts);
    expect(serialized).not.toMatch(/participante/i);
  });
});
