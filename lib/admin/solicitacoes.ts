// PHF-073 — Fila de deletion_request pendentes de um evento (painel do organizador).
//
// deletion_request não tem event_id próprio (02-spec.md §3): ele referencia media_id,
// e é media_items.event_id que amarra ao evento. Por isso o escopo por evento vem de um
// inner join deletion_request -> media_items -> events e um filtro pelo slug — uma única
// ida ao banco, sem N+1.
//
// ponytail: esta tela é só a FILA (listar pendentes). Executar/negar a solicitação é
// PHF-063 — mutação de risco alto (LGPD, exige 2 aprovações + feature flag, ver CLAUDE.md),
// fora do escopo de PHF-073. Não expurgar mídia aqui.

import { createServerClient } from "../supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Linha crua do PostgREST: media_items é um embed to-one (objeto, não array). */
export interface SolicitacaoRow {
  id: string;
  solicitante: string;
  motivo: string | null;
  timestamp: string;
  media_items: {
    id: string;
    tipo: string;
    autor: string | null;
    mensagem: string | null;
    url_thumb: string | null;
  } | null;
}

/** View model consumido pela lista da fila. */
export interface SolicitacaoPendente {
  id: string;
  solicitante: string;
  motivo: string | null;
  criadaEm: string;
  media: {
    id: string;
    tipo: "foto" | "reel";
    autor: string | null;
    mensagem: string | null;
    urlThumb: string | null;
  } | null;
}

// Campos da solicitação + contexto mínimo da mídia alvo, amarrando o slug do evento.
const SELECT =
  "id,solicitante,motivo,timestamp,media_items!inner(id,tipo,autor,mensagem,url_thumb,events!inner(slug))";

/** Normaliza uma linha crua no view model. Mídia ausente cai em null (defensivo). */
export function mapSolicitacao(row: SolicitacaoRow): SolicitacaoPendente {
  const m = row.media_items;
  return {
    id: row.id,
    solicitante: row.solicitante,
    motivo: row.motivo,
    criadaEm: row.timestamp,
    media: m
      ? {
          id: m.id,
          // tipo vem como text livre no schema; só "reel" vira reel, resto é foto.
          tipo: m.tipo === "reel" ? "reel" : "foto",
          autor: m.autor,
          mensagem: m.mensagem,
          urlThumb: m.url_thumb,
        }
      : null,
  };
}

/**
 * Lista as deletion_request com status "pendente" de um evento, mais antigas primeiro
 * (FIFO — o titular que solicitou há mais tempo é atendido antes).
 * `client` é injetável para teste; por padrão usa o client de servidor (service_role).
 */
export async function listarSolicitacoesPendentes(
  slug: string,
  client: SupabaseClient = createServerClient(),
): Promise<SolicitacaoPendente[]> {
  const { data, error } = await client
    .from("deletion_request")
    .select(SELECT)
    .eq("status", "pendente")
    .eq("media_items.events.slug", slug)
    .order("timestamp", { ascending: true });

  if (error) throw new Error(`Falha ao listar solicitações: ${error.message}`);
  return (data as unknown as SolicitacaoRow[]).map(mapSolicitacao);
}
