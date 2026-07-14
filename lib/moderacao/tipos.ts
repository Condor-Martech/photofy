// Tipos do painel de moderação (Epic 4 / PHF-040). Espelham a tabela media_items
// do schema (02-spec.md §3 / supabase/migrations/..._initial_schema.sql).

export type StatusMidia = "pendente" | "aprovado" | "reprovado" | "erro";
export type TipoMidia = "foto" | "reel";

// Ações de moderação (PHF-041). Espelham o enum acao de moderation_log
// (02-spec.md §3) e os cenários Gherkin de "Moderação em tempo real" (§5).
export type AcaoModeracao = "aprovar" | "reprovar" | "reverter";

// Porta para aplicar uma decisão: registra a mudança de status + moderation_log de
// forma atômica (a implementação real chama a função Postgres via RPC). Injetável
// para manter o painel testável sem Supabase — mesmo padrão de AssinarFila.
export type AplicarDecisao = (entrada: {
  mediaId: string;
  acao: AcaoModeracao;
  motivo?: string;
}) => Promise<void>;

// Porta para aplicar a MESMA decisão a vários itens de uma vez (PHF-042). A
// implementação real chama registrar_decisao_moderacao_lote numa única transação,
// então ou todos mudam de status + geram moderation_log, ou nenhum (atomicidade —
// cobre o Gherkin "Aprovação em lote"). Injetável, igual a AplicarDecisao.
export type AplicarDecisaoLote = (entrada: {
  mediaIds: string[];
  acao: AcaoModeracao;
  motivo?: string;
}) => Promise<void>;

// Filtro da fila por status (PHF-042). "todos" não filtra; os demais espelham
// StatusMidia. Aplicado sobre a lista ao vivo já ordenada por ordenarFila.
export type FiltroStatus = "todos" | StatusMidia;

export interface ItemMidia {
  id: string;
  event_id: string;
  tipo: TipoMidia;
  autor: string | null;
  mensagem: string | null;
  status: StatusMidia;
  url_original: string;
  url_processada: string | null;
  url_thumb: string | null;
  exif_removido: boolean;
  criado_em: string;
}

// Evento de Realtime já normalizado (o adaptador de Supabase converte o payload
// de postgres_changes nisto — ver canal-realtime.ts).
export type EventoFila =
  | { tipo: "insert"; item: ItemMidia }
  | { tipo: "update"; item: ItemMidia }
  | { tipo: "delete"; id: string };

// Porta de assinatura: recebe um callback por evento e devolve o cancelamento.
// A inversão de dependência mantém a lista/hook testáveis sem Supabase real.
export type AssinarFila = (aoReceber: (evento: EventoFila) => void) => () => void;
