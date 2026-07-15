import { describe, expect, it } from "vitest";
import { mapSolicitacao, type SolicitacaoRow } from "./solicitacoes";

const base: SolicitacaoRow = {
  id: "d1",
  solicitante: "ana@exemplo.com",
  motivo: "Quero remover minha foto",
  timestamp: "2026-07-14T10:00:00Z",
  media_items: {
    id: "m1",
    tipo: "foto",
    autor: "Ana",
    mensagem: "Muito bom!",
    url_thumb: "https://cdn/thumb.jpg",
  },
};

describe("mapSolicitacao", () => {
  it("normaliza a solicitação e o contexto da mídia", () => {
    expect(mapSolicitacao(base)).toEqual({
      id: "d1",
      solicitante: "ana@exemplo.com",
      motivo: "Quero remover minha foto",
      criadaEm: "2026-07-14T10:00:00Z",
      media: {
        id: "m1",
        tipo: "foto",
        autor: "Ana",
        mensagem: "Muito bom!",
        urlThumb: "https://cdn/thumb.jpg",
      },
    });
  });

  it("normaliza tipo: só 'reel' vira reel, qualquer outro vira foto", () => {
    expect(mapSolicitacao(base).media?.tipo).toBe("foto");
    const reel = { ...base, media_items: { ...base.media_items!, tipo: "reel" } };
    expect(mapSolicitacao(reel).media?.tipo).toBe("reel");
    const raro = { ...base, media_items: { ...base.media_items!, tipo: "xyz" } };
    expect(mapSolicitacao(raro).media?.tipo).toBe("foto");
  });

  it("motivo é opcional (null é preservado)", () => {
    expect(mapSolicitacao({ ...base, motivo: null }).motivo).toBeNull();
  });

  it("mídia ausente cai em null sem quebrar", () => {
    expect(mapSolicitacao({ ...base, media_items: null }).media).toBeNull();
  });
});
