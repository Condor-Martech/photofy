import type { AuditEntry, Severity } from './events.js';
import { AuditAction } from './events.js';

// Alerta de anomalia. INVARIANTE DE PRODUTO (CLAUDE.md, regra de silencio de
// moderacao): `audiencia` e SEMPRE 'operadores' — nenhum alerta jamais vai ao
// participante. E por isso um literal fixo, nao um parametro: o tipo torna
// impossivel um detector emitir alerta com destino ao participante. Cobre o
// Gherkin "Falha de processamento nao expoe erro ao participante" (02-spec.md secao 5).
export interface AnomalyAlert {
  readonly audiencia: 'operadores';
  regra: string;
  severidade: Severity;
  resumo: string; // texto operacional, nunca exibido ao participante
  contagem: number;
  janelaMs: number;
  chave: string | null; // agrupador que estourou (ip_hash, moderador, evento)
  eventId: string | null;
}

export interface AnomalyConfig {
  janelaMs: number; // janela deslizante avaliada
  falhaProcessamento: number; // N de processamento.erro -> alerta de operacao
  falhaAuthPorIp: number; // N de auth.falha do mesmo ip_hash -> brute-force
  reprovacaoPorModerador: number; // N de moderacao.reprovar do mesmo staff -> possivel abuso
}

export const DEFAULT_ANOMALY_CONFIG: AnomalyConfig = {
  janelaMs: 5 * 60 * 1000, // 5 min
  falhaProcessamento: 5,
  falhaAuthPorIp: 5,
  reprovacaoPorModerador: 50,
};

function dentroDaJanela(entries: AuditEntry[], janelaMs: number, now: number): AuditEntry[] {
  const limite = now - janelaMs;
  return entries.filter((e) => Date.parse(e.criadoEm) >= limite);
}

function agrupar(entries: AuditEntry[], chave: (e: AuditEntry) => string | null): Map<string, AuditEntry[]> {
  const grupos = new Map<string, AuditEntry[]>();
  for (const e of entries) {
    const k = chave(e);
    if (k === null) continue;
    let bucket = grupos.get(k);
    if (!bucket) {
      bucket = [];
      grupos.set(k, bucket);
    }
    bucket.push(e);
  }
  return grupos;
}

// Pico de falha de processamento: workers esgotaram retry e marcaram itens como
// "erro" (02-spec.md secao 5, Feature "Processamento assincrono"). O alerta vai
// aos OPERADORES para reprocessamento manual — jamais ao participante.
export function detectProcessingFailureSpike(
  entries: AuditEntry[],
  config: AnomalyConfig,
): AnomalyAlert[] {
  const grupos = agrupar(
    entries.filter((e) => e.acao === AuditAction.PROCESSAMENTO_ERRO),
    (e) => e.eventId ?? 'sem-evento',
  );
  const alertas: AnomalyAlert[] = [];
  for (const [chave, itens] of grupos) {
    if (itens.length >= config.falhaProcessamento) {
      alertas.push({
        audiencia: 'operadores',
        regra: 'processamento.erro.pico',
        severidade: 'critico',
        resumo: `${itens.length} falhas de processamento na janela — reprocessamento manual necessario`,
        contagem: itens.length,
        janelaMs: config.janelaMs,
        chave,
        eventId: chave === 'sem-evento' ? null : chave,
      });
    }
  }
  return alertas;
}

// Rajada de falhas de autenticacao do mesmo ip_hash: indicio de brute-force no
// login de moderador/admin. Alerta de seguranca para operadores.
export function detectAuthFailureSpike(
  entries: AuditEntry[],
  config: AnomalyConfig,
): AnomalyAlert[] {
  const grupos = agrupar(
    entries.filter((e) => e.acao === AuditAction.AUTH_FALHA),
    (e) => e.ipHash,
  );
  const alertas: AnomalyAlert[] = [];
  for (const [chave, itens] of grupos) {
    if (itens.length >= config.falhaAuthPorIp) {
      alertas.push({
        audiencia: 'operadores',
        regra: 'auth.falha.brute_force',
        severidade: 'alerta',
        resumo: `${itens.length} falhas de auth do mesmo IP na janela — possivel brute-force`,
        contagem: itens.length,
        janelaMs: config.janelaMs,
        chave,
        eventId: null,
      });
    }
  }
  return alertas;
}

// Reprovacao em massa por um unico moderador: pode ser conta comprometida ou erro
// de operacao. Nao ha comunicacao a nenhum participante — so alerta ao operador.
export function detectMassRejection(
  entries: AuditEntry[],
  config: AnomalyConfig,
): AnomalyAlert[] {
  const grupos = agrupar(
    entries.filter((e) => e.acao === AuditAction.MODERACAO_REPROVAR),
    (e) => e.actorId,
  );
  const alertas: AnomalyAlert[] = [];
  for (const [chave, itens] of grupos) {
    if (itens.length >= config.reprovacaoPorModerador) {
      alertas.push({
        audiencia: 'operadores',
        regra: 'moderacao.reprovar.massa',
        severidade: 'alerta',
        resumo: `${itens.length} reprovacoes pelo mesmo moderador na janela — verificar conta/operacao`,
        contagem: itens.length,
        janelaMs: config.janelaMs,
        chave,
        eventId: null,
      });
    }
  }
  return alertas;
}

// Roda todos os detectores sobre a janela recente. Ponto de entrada unico chamado
// pelo job de observabilidade (le audit_log recente -> avalia -> despacha alertas).
export function evaluateAnomalies(
  entries: AuditEntry[],
  config: AnomalyConfig = DEFAULT_ANOMALY_CONFIG,
  now: number = Date.now(),
): AnomalyAlert[] {
  const janela = dentroDaJanela(entries, config.janelaMs, now);
  return [
    ...detectProcessingFailureSpike(janela, config),
    ...detectAuthFailureSpike(janela, config),
    ...detectMassRejection(janela, config),
  ];
}
