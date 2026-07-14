import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { criarAplicarDecisaoLote } from "./aplicar-decisao-lote";

function fakeSupabase(resposta: { error: { message: string } | null }) {
  const rpc = vi.fn().mockResolvedValue(resposta);
  return { supabase: { rpc } as unknown as SupabaseClient, rpc };
}

describe("criarAplicarDecisaoLote (PHF-042)", () => {
  it("chama a RPC registrar_decisao_moderacao_lote com a lista de ids", async () => {
    const { supabase, rpc } = fakeSupabase({ error: null });
    const ids = Array.from({ length: 30 }, (_, n) => `m-${n}`);

    await criarAplicarDecisaoLote(supabase)({ mediaIds: ids, acao: "aprovar" });

    expect(rpc).toHaveBeenCalledWith("registrar_decisao_moderacao_lote", {
      p_media_ids: ids,
      p_acao: "aprovar",
      p_motivo: null,
    });
  });

  it("repassa o motivo quando informado (reprovação em lote)", async () => {
    const { supabase, rpc } = fakeSupabase({ error: null });

    await criarAplicarDecisaoLote(supabase)({
      mediaIds: ["m-1", "m-2"],
      acao: "reprovar",
      motivo: "conteúdo impróprio",
    });

    expect(rpc).toHaveBeenCalledWith("registrar_decisao_moderacao_lote", {
      p_media_ids: ["m-1", "m-2"],
      p_acao: "reprovar",
      p_motivo: "conteúdo impróprio",
    });
  });

  it("propaga erro da RPC (ex.: transição inválida derruba o lote atômico)", async () => {
    const { supabase } = fakeSupabase({ error: { message: "Transição inválida" } });
    await expect(
      criarAplicarDecisaoLote(supabase)({ mediaIds: ["m-1"], acao: "aprovar" }),
    ).rejects.toThrow(/inválida/i);
  });
});
