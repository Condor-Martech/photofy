// Tipos do painel de moderação (Epic 4 / PHF-040). Espelham a tabela media_items
// do schema (02-spec.md §3 / supabase/migrations/..._initial_schema.sql).

export type StatusMidia = "pendente" | "aprovado" | "reprovado" | "erro";
export type TipoMidia = "foto" | "reel";

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
