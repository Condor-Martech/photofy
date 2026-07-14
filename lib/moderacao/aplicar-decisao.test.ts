import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { criarAplicarDecisao } from "./aplicar-decisao";

function fakeSupabase(resposta: { error: { message: string } | null }) {
  const rpc = vi.fn().mockResolvedValue(resposta);
  return { supabase: { rpc } as unknown as SupabaseClient, rpc };
}

describe("criarAplicarDecisao (PHF-041)", () => {
  it("chama a RPC registrar_decisao_moderacao com os parâmetros da decisão", async () => {
    const { supabase, rpc } = fakeSupabase({ error: null });
    const aplicar = criarAplicarDecisao(supabase);

    await aplicar({ mediaId: "m-1", acao: "reprovar", motivo: "conteúdo impróprio" });

    expect(rpc).toHaveBeenCalledWith("registrar_decisao_moderacao", {
      p_media_id: "m-1",
      p_acao: "reprovar",
      p_motivo: "conteúdo impróprio",
    });
  });

  it("envia motivo null quando não informado", async () => {
    const { supabase, rpc } = fakeSupabase({ error: null });
    await criarAplicarDecisao(supabase)({ mediaId: "m-2", acao: "aprovar" });

    expect(rpc).toHaveBeenCalledWith("registrar_decisao_moderacao", {
      p_media_id: "m-2",
      p_acao: "aprovar",
      p_motivo: null,
    });
  });

  it("propaga erro da RPC (ex.: transição inválida ou RLS)", async () => {
    const { supabase } = fakeSupabase({ error: { message: "Transição inválida" } });
    await expect(
      criarAplicarDecisao(supabase)({ mediaId: "m-3", acao: "aprovar" }),
    ).rejects.toThrow(/inválida/i);
  });
});
