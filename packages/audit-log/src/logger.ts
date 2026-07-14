import type { AuditEntry, AuditEvent } from './events.js';
import { hashIp } from './hash-ip.js';
import type { AuditSink } from './sinks.js';

export interface AuditLoggerOptions {
  sink: AuditSink;
  ipSalt: string; // salt LGPD para hashear IP (PHF-081). Obrigatorio se algum evento trouxer ip.
  now?: () => Date; // injetavel para testes deterministicos
  // Chamado quando a escrita no sink falha. A auditoria e best-effort no caminho da
  // request: um sink indisponivel NAO pode derrubar o upload/moderacao. Default: stderr.
  onError?: (err: unknown, entry: AuditEntry) => void;
}

// Escreve registros append-only. `record` NUNCA lanca para o chamador (fail-open):
// perder um log e ruim, mas quebrar o fluxo de negocio por causa da auditoria e pior.
// A falha e reportada via onError para o proprio pipeline de observabilidade tratar.
export class AuditLogger {
  private readonly sink: AuditSink;
  private readonly ipSalt: string;
  private readonly now: () => Date;
  private readonly onError: (err: unknown, entry: AuditEntry) => void;

  constructor(opts: AuditLoggerOptions) {
    this.sink = opts.sink;
    this.ipSalt = opts.ipSalt;
    this.now = opts.now ?? (() => new Date());
    this.onError =
      opts.onError ??
      ((err, entry) =>
        console.error(
          JSON.stringify({ tipo: 'audit-erro', acao: entry.acao, erro: String(err) }),
        ));
  }

  // Normaliza o evento de dominio na forma canonica: hasheia o IP (LGPD),
  // carimba o timestamp e preenche defaults. Nunca persiste PII crua.
  toEntry(event: AuditEvent): AuditEntry {
    return {
      eventId: event.eventId ?? null,
      actorId: event.actorId ?? null,
      actorType: event.actorType,
      acao: event.acao,
      recursoTipo: event.recursoTipo ?? null,
      recursoId: event.recursoId ?? null,
      ipHash: event.ip ? hashIp(event.ip, this.ipSalt) : null,
      severidade: event.severidade ?? 'info',
      metadata: event.metadata ?? {},
      criadoEm: this.now().toISOString(),
    };
  }

  async record(event: AuditEvent): Promise<AuditEntry> {
    const entry = this.toEntry(event);
    try {
      await this.sink.write(entry);
    } catch (err) {
      this.onError(err, entry);
    }
    return entry;
  }
}
