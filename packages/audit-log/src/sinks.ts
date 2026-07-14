import type { AuditEntry } from './events.js';

// Destino de escrita da trilha. Implementacoes: memoria (testes), stdout (agregacao
// de logs em prod via Docker/Loki), e um adaptador Supabase estrutural (audit_log).
export interface AuditSink {
  write(entry: AuditEntry): Promise<void>;
}

// Acumula em memoria — usado nos testes e como buffer de janela para os detectores.
export class MemoryAuditSink implements AuditSink {
  readonly entries: AuditEntry[] = [];

  async write(entry: AuditEntry): Promise<void> {
    this.entries.push(entry);
  }
}

// Emite uma linha JSON estruturada por registro. O coletor de logs do host
// (Docker Swarm -> agregador) indexa o stdout; nenhum acoplamento a vendor.
export class StdoutAuditSink implements AuditSink {
  constructor(private readonly out: (line: string) => void = (l) => console.log(l)) {}

  async write(entry: AuditEntry): Promise<void> {
    this.out(JSON.stringify({ tipo: 'audit', ...entry }));
  }
}

// Cliente Supabase minimo (tipagem estrutural): evita depender do pacote
// @supabase/supabase-js aqui. Espelha o `.from('audit_log').insert(row)`.
export interface SupabaseInsertClient {
  from(table: string): {
    insert(row: Record<string, unknown>): Promise<{ error: { message: string } | null }>;
  };
}

// Adaptador para a tabela append-only `audit_log`. Escreve com o client server-side
// (service_role, que bypassa RLS — ver migration). Mapeia camelCase -> colunas snake.
export function createSupabaseSink(client: SupabaseInsertClient): AuditSink {
  return {
    async write(entry: AuditEntry): Promise<void> {
      const { error } = await client.from('audit_log').insert({
        event_id: entry.eventId,
        actor_id: entry.actorId,
        actor_type: entry.actorType,
        acao: entry.acao,
        recurso_tipo: entry.recursoTipo,
        recurso_id: entry.recursoId,
        ip_hash: entry.ipHash,
        severidade: entry.severidade,
        metadata: entry.metadata,
        criado_em: entry.criadoEm,
      });
      if (error) {
        throw new Error(`audit_log insert falhou: ${error.message}`);
      }
    },
  };
}
