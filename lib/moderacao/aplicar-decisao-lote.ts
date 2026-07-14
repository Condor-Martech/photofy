import type { SupabaseClient } from "@supabase/supabase-js";
import type { AplicarDecisaoLote } from "./tipos";

// Adaptador → função Postgres registrar_decisao_moderacao_lote (PHF-042). A função
// aplica a MESMA decisão a todos os ids numa única transação: ou todos mudam de
// status + geram moderation_log, ou nenhum. moderador_id = auth.uid() fixado no
// servidor (o cliente não forja autoria), RLS de PHF-011 garante que só staff
// modera. Fino de propósito: a lógica de elegibilidade vive em lote.ts/decisao.ts.
export function criarAplicarDecisaoLote(supabase: SupabaseClient): AplicarDecisaoLote {
  return async ({ mediaIds, acao, motivo }) => {
    const { error } = await supabase.rpc("registrar_decisao_moderacao_lote", {
      p_media_ids: mediaIds,
      p_acao: acao,
      p_motivo: motivo ?? null,
    });
    if (error) throw new Error(error.message);
  };
}
