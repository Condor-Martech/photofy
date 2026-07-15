// PHF-063 — Tipos do fluxo de execução de exclusão pelo organizador (Epic 6).
// Espelham deletion_request e media_items (02-spec.md §3 / initial_schema.sql).
//
// A auditoria da EXECUÇÃO reusa moderation_log (mesmo schema já existente) em vez
// de novos campos: o modelo de dados é fixo (CLAUDE.md — CRUD sobre o schema dado,
// não redesenhar). moderation_log carrega quem decidiu (moderador_id → auth.users),
// quando (timestamp default now()) e o motivo — exatamente o registro de auditoria
// exigido pela regra "exclusão só via deletion_request formal, com auditoria".

export type StatusSolicitacao = "pendente" | "executada" | "negada";

// Valor de status usado para tirar uma mídia da galeria/telão SEM apagar a linha.
// Apagar media_items dispararia o `on delete cascade` do deletion_request e
// destruiria a própria auditoria — por isso a exclusão é lógica, não física.
// Galeria (PHF-060) e telão (PHF-051) filtram status='aprovado', então 'excluido'
// some dos dois por construção. É terminal e só o fluxo de deletion_request o gera
// (não faz parte do vocabulário de moderação: pendente|aprovado|reprovado|erro).
export const STATUS_MIDIA_EXCLUIDO = "excluido" as const;

export interface SolicitacaoExclusao {
  id: string;
  media_id: string;
  solicitante: string;
  motivo: string | null;
  status: StatusSolicitacao;
  timestamp: string;
}

// Ação gravada em moderation_log. `acao` é texto livre no schema; 'excluir' e
// 'negar_exclusao' estendem o vocabulário de aprovar|reprovar|reverter.
export type AcaoAuditoria = "excluir" | "negar_exclusao";

export interface RegistroAuditoria {
  media_id: string;
  moderador_id: string; // organizador autenticado que decidiu (auth.users)
  acao: AcaoAuditoria;
  motivo: string | null;
  // timestamp: default now() no banco
}

export type Decisao = "executar" | "negar";

// Conjunto atômico de mutações a aplicar ao decidir uma solicitação pendente.
export interface MutacaoExclusao {
  solicitacao_id: string;
  novo_status_solicitacao: Extract<StatusSolicitacao, "executada" | "negada">;
  media_id: string;
  // 'excluido' quando executa; null quando nega (a mídia segue aprovada na galeria).
  novo_status_midia: typeof STATUS_MIDIA_EXCLUIDO | null;
  auditoria: RegistroAuditoria;
}
