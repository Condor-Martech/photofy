// Tipos da trilha de auditoria (PHF-082). Espelham a tabela `audit_log`
// (migration 20260714120001_phf082_audit_log.sql): a forma persistida e a mesma
// que os detectores de anomalia consomem, entao ha uma unica fonte de verdade.

export type ActorType = 'anon' | 'staff' | 'device' | 'worker' | 'system';

export type Severity = 'info' | 'alerta' | 'critico';

// Acoes conhecidas — string aberta de proposito (novas superficies registram sem
// exigir mudanca de schema), mas as constantes evitam typo nas mais usadas e
// mantem os detectores de anomalia acoplados a nomes estaveis.
export const AuditAction = {
  ACESSO_GALERIA: 'acesso.galeria',
  ACESSO_MODERACAO: 'acesso.moderacao',
  MODERACAO_APROVAR: 'moderacao.aprovar',
  MODERACAO_REPROVAR: 'moderacao.reprovar',
  MODERACAO_REVERTER: 'moderacao.reverter',
  PROCESSAMENTO_ERRO: 'processamento.erro',
  AUTH_FALHA: 'auth.falha',
  DEVICE_PAREAR: 'device.parear',
  DEVICE_REVOGAR: 'device.revogar',
  EXCLUSAO_EXECUTAR: 'exclusao.executar',
} as const;

export type AuditActionValue = (typeof AuditAction)[keyof typeof AuditAction];

// Evento como o codigo de dominio o emite. `ip` chega em claro e o logger o hasheia
// (LGPD) antes de persistir — o dominio nunca lida com ip_hash na mao.
export interface AuditEvent {
  eventId?: string | null;
  actorId?: string | null;
  actorType: ActorType;
  acao: string;
  recursoTipo?: string | null;
  recursoId?: string | null;
  ip?: string | null; // IP em claro; sera hasheado. NUNCA e persistido cru.
  severidade?: Severity;
  metadata?: Record<string, unknown>;
}

// Forma canonica persistida (== colunas de audit_log). ip_hash ja hasheado; sem PII crua.
export interface AuditEntry {
  eventId: string | null;
  actorId: string | null;
  actorType: ActorType;
  acao: string;
  recursoTipo: string | null;
  recursoId: string | null;
  ipHash: string | null;
  severidade: Severity;
  metadata: Record<string, unknown>;
  criadoEm: string; // ISO 8601 UTC
}
