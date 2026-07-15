import { describe, expect, it } from "vitest";
import {
  aplicarEvento,
  construirRotacao,
  proximoIndice,
} from "./rotacao";
import type { ItemMidia, SlideshowConfig } from "./tipos";

const config = (over: Partial<SlideshowConfig> = {}): SlideshowConfig => ({
  seg_por_slide: 6,
  ordem: "recentes",
  transicao: "fade",
  exibir_autor_mensagem: true,
  incluir_reels: true,
  duracao_reel_telao: "completo",
  loop: true,
  escurecimento_bg: 30,
  ...over,
});

const item = (over: Partial<ItemMidia> = {}): ItemMidia => ({
  id: over.id ?? "1",
  event_id: "ev",
  tipo: "foto",
  autor: null,
  mensagem: null,
  status: "aprovado",
  url_original: "orig",
  url_processada: "proc",
  url_thumb: "thumb",
  exif_removido: true,
  criado_em: "2026-07-14T10:00:00Z",
  ...over,
});

describe("construirRotacao", () => {
  // Gherkin: 5 aprovados e 2 pendentes → só os 5 aprovados entram na rotação.
  it("inclui apenas media_items aprovados", () => {
    const itens = [
      ...Array.from({ length: 5 }, (_, i) =>
        item({ id: `a${i}`, status: "aprovado" }),
      ),
      item({ id: "p0", status: "pendente" }),
      item({ id: "p1", status: "pendente" }),
    ];

    const rotacao = construirRotacao(itens, config());

    expect(rotacao).toHaveLength(5);
    expect(rotacao.every((i) => i.status === "aprovado")).toBe(true);
  });

  it("exclui reprovados e itens em erro", () => {
    const itens = [
      item({ id: "ok", status: "aprovado" }),
      item({ id: "no", status: "reprovado" }),
      item({ id: "err", status: "erro" }),
    ];
    expect(construirRotacao(itens, config()).map((i) => i.id)).toEqual(["ok"]);
  });

  it("respeita incluir_reels=false removendo reels aprovados", () => {
    const itens = [
      item({ id: "foto", tipo: "foto" }),
      item({ id: "reel", tipo: "reel" }),
    ];
    const rotacao = construirRotacao(itens, config({ incluir_reels: false }));
    expect(rotacao.map((i) => i.id)).toEqual(["foto"]);
  });

  it("mantém reels quando incluir_reels=true", () => {
    const itens = [
      item({ id: "foto", tipo: "foto" }),
      item({ id: "reel", tipo: "reel" }),
    ];
    expect(construirRotacao(itens, config({ incluir_reels: true }))).toHaveLength(2);
  });

  it("ordem=recentes coloca o mais novo primeiro", () => {
    const itens = [
      item({ id: "velho", criado_em: "2026-07-14T09:00:00Z" }),
      item({ id: "novo", criado_em: "2026-07-14T11:00:00Z" }),
    ];
    expect(construirRotacao(itens, config({ ordem: "recentes" })).map((i) => i.id)).toEqual([
      "novo",
      "velho",
    ]);
  });

  it("ordem=cronologica coloca o mais antigo primeiro", () => {
    const itens = [
      item({ id: "novo", criado_em: "2026-07-14T11:00:00Z" }),
      item({ id: "velho", criado_em: "2026-07-14T09:00:00Z" }),
    ];
    expect(
      construirRotacao(itens, config({ ordem: "cronologica" })).map((i) => i.id),
    ).toEqual(["velho", "novo"]);
  });

  it("ordem=aleatoria preserva o conjunto de aprovados", () => {
    const itens = Array.from({ length: 6 }, (_, i) => item({ id: `x${i}` }));
    const ids = construirRotacao(itens, config({ ordem: "aleatoria" }))
      .map((i) => i.id)
      .sort();
    expect(ids).toEqual(["x0", "x1", "x2", "x3", "x4", "x5"]);
  });
});

describe("aplicarEvento (rotação sem reload)", () => {
  it("aprovação (update pendente→aprovado) entra na rotação sem reload", () => {
    const pendente = item({ id: "1", status: "pendente" });
    let itens = [pendente];
    expect(construirRotacao(itens, config())).toHaveLength(0);

    itens = aplicarEvento(itens, {
      tipo: "update",
      item: { ...pendente, status: "aprovado" },
    });
    expect(construirRotacao(itens, config()).map((i) => i.id)).toEqual(["1"]);
  });

  it("insert de aprovado aparece na rotação", () => {
    const itens = aplicarEvento([], { tipo: "insert", item: item({ id: "novo" }) });
    expect(construirRotacao(itens, config()).map((i) => i.id)).toEqual(["novo"]);
  });

  it("reprovação (update) some da rotação", () => {
    const aprovado = item({ id: "1", status: "aprovado" });
    const itens = aplicarEvento([aprovado], {
      tipo: "update",
      item: { ...aprovado, status: "reprovado" },
    });
    expect(construirRotacao(itens, config())).toHaveLength(0);
  });

  it("delete (exclusão sob solicitação) some da rotação", () => {
    const itens = aplicarEvento([item({ id: "1" })], { tipo: "delete", id: "1" });
    expect(itens).toHaveLength(0);
  });

  it("é idempotente: o mesmo insert reentregue não duplica", () => {
    let itens = aplicarEvento([], { tipo: "insert", item: item({ id: "1" }) });
    itens = aplicarEvento(itens, { tipo: "insert", item: item({ id: "1" }) });
    expect(itens).toHaveLength(1);
  });
});

describe("proximoIndice", () => {
  it("avança e dá a volta quando loop=true", () => {
    expect(proximoIndice(0, 3, true)).toBe(1);
    expect(proximoIndice(2, 3, true)).toBe(0);
  });

  it("trava no último quando loop=false", () => {
    expect(proximoIndice(2, 3, false)).toBe(2);
  });

  it("é seguro com rotação vazia", () => {
    expect(proximoIndice(0, 0, true)).toBe(0);
  });
});
