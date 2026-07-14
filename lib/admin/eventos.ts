// PHF-070 — Listagem de eventos do painel do organizador (status + contagem de itens).
//
// Cobre o dado que a tela /admin/eventos precisa: cada evento com seu status e quantos
// media_items ele acumulou. A contagem vem embutida na própria query (PostgREST agrega
// `media_items(count)` em uma ida ao banco) em vez de um N+1 por evento.

import { createServerClient } from "../supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type EventoStatus = "ativo" | "encerrado";

/** Linha crua como o PostgREST devolve: a contagem embutida chega como `[{ count }]`. */
export interface EventoRow {
  id: string;
  slug: string;
  nome: string;
  status: string;
  data_inicio: string;
  media_items: { count: number }[] | null;
}

/** View model consumido pela tabela do painel. */
export interface EventoResumo {
  id: string;
  slug: string;
  nome: string;
  status: EventoStatus;
  dataInicio: string;
  totalItens: number;
}

// Colunas mínimas da listagem + agregação de contagem embutida (02-spec.md §3).
const SELECT = "id,slug,nome,status,data_inicio,media_items(count)";

/** Normaliza uma linha crua no view model, extraindo a contagem agregada. */
export function mapEventoResumo(row: EventoRow): EventoResumo {
  return {
    id: row.id,
    slug: row.slug,
    nome: row.nome,
    // status vem como text livre no schema; qualquer valor fora do previsto cai em "encerrado".
    status: row.status === "ativo" ? "ativo" : "encerrado",
    dataInicio: row.data_inicio,
    totalItens: row.media_items?.[0]?.count ?? 0,
  };
}

/**
 * Lista todos os eventos com status e contagem de itens, mais recentes primeiro.
 * `client` é injetável para teste; por padrão usa o client de servidor (service_role).
 */
export async function listarEventos(
  client: SupabaseClient = createServerClient(),
): Promise<EventoResumo[]> {
  const { data, error } = await client
    .from("events")
    .select(SELECT)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Falha ao listar eventos: ${error.message}`);
  return (data as unknown as EventoRow[]).map(mapEventoResumo);
}
