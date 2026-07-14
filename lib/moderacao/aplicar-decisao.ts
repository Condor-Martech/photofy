import type { SupabaseClient } from "@supabase/supabase-js";
import type { AplicarDecisao } from "./tipos";

// Adaptador → função Postgres registrar_decisao_moderacao (PHF-041). A função é
// atômica: muda media_items.status e grava moderation_log no mesmo passo, com
// moderador_id = auth.uid() fixado no servidor (o cliente não forja a autoria).
// RLS (PHF-011) garante que só staff modera. Fino de propósito: a lógica de
// transição vive em decisao.ts, testada sem Supabase real.
export function criarAplicarDecisao(supabase: SupabaseClient): AplicarDecisao {
  return async ({ mediaId, acao, motivo }) => {
    const { error } = await supabase.rpc("registrar_decisao_moderacao", {
      p_media_id: mediaId,
      p_acao: acao,
      p_motivo: motivo ?? null,
    });
    if (error) throw new Error(error.message);
  };
}
