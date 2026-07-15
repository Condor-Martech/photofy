import { describe, expect, it } from "vitest";
import { aplicarEvento, contarPendentes, ordenarFila } from "./fila";
import type { ItemMidia } from "./tipos";

function item(over: Partial<ItemMidia> & Pick<ItemMidia, "id">): ItemMidia {
  return {
    event_id: "ev-1",
    tipo: "foto",
    autor: null,
    mensagem: null,
    status: "pendente",
    url_original: "orig.jpg",
    url_processada: null,
    url_thumb: null,
    exif_removido: false,
    criado_em: "2026-07-14T00:00:00.000Z",
    ...over,
  };
}

describe("contarPendentes — badge de pendentes (PHF-040)", () => {
  it("conta apenas itens com status pendente", () => {
    const itens = [
      item({ id: "a", status: "pendente" }),
      item({ id: "b", status: "aprovado" }),
      item({ id: "c", status: "pendente" }),
      item({ id: "d", status: "reprovado" }),
      item({ id: "e", status: "erro" }),
    ];
    expect(contarPendentes(itens)).toBe(2);
  });

  it("é zero quando não há pendentes", () => {
    expect(contarPendentes([item({ id: "a", status: "aprovado" })])).toBe(0);
    expect(contarPendentes([])).toBe(0);
  });
});

describe("ordenarFila", () => {
  it("põe pendentes primeiro e, dentro do grupo, os mais recentes no topo", () => {
    const itens = [
      item({ id: "aprovado-novo", status: "aprovado", criado_em: "2026-07-14T10:00:00Z" }),
      item({ id: "pend-antigo", status: "pendente", criado_em: "2026-07-14T08:00:00Z" }),
      item({ id: "pend-novo", status: "pendente", criado_em: "2026-07-14T09:00:00Z" }),
    ];
    expect(ordenarFila(itens).map((i) => i.id)).toEqual([
      "pend-novo",
      "pend-antigo",
      "aprovado-novo",
    ]);
  });
});

describe("aplicarEvento — reducer de Realtime (Feature: Moderação em tempo real)", () => {
  it("insert de um pendente faz o item aparecer e incrementa o badge", () => {
    const antes: ItemMidia[] = [];
    const depois = aplicarEvento(antes, { tipo: "insert", item: item({ id: "novo" }) });
    expect(depois).toHaveLength(1);
    expect(contarPendentes(depois)).toBe(1);
  });

  it("insert repetido do mesmo id não duplica (idempotente)", () => {
    let itens = aplicarEvento([], { tipo: "insert", item: item({ id: "x" }) });
    itens = aplicarEvento(itens, { tipo: "insert", item: item({ id: "x" }) });
    expect(itens).toHaveLength(1);
  });

  it("update para aprovado (moderador aprova) tira o item dos pendentes do badge", () => {
    const inicial = [item({ id: "x", status: "pendente" })];
    const depois = aplicarEvento(inicial, {
      tipo: "update",
      item: item({ id: "x", status: "aprovado" }),
    });
    expect(contarPendentes(depois)).toBe(0);
    expect(depois.find((i) => i.id === "x")?.status).toBe("aprovado");
  });

  it("update de aprovado para pendente (reversão) volta a contar no badge", () => {
    const inicial = [item({ id: "x", status: "aprovado" })];
    const depois = aplicarEvento(inicial, {
      tipo: "update",
      item: item({ id: "x", status: "pendente" }),
    });
    expect(contarPendentes(depois)).toBe(1);
  });

  it("delete remove o item da fila", () => {
    const inicial = [item({ id: "x" }), item({ id: "y" })];
    const depois = aplicarEvento(inicial, { tipo: "delete", id: "x" });
    expect(depois.map((i) => i.id)).toEqual(["y"]);
  });

  it("aprovação em lote: N updates zeram o badge dos itens afetados", () => {
    let itens = ordenarFila(
      Array.from({ length: 30 }, (_, n) => item({ id: `m${n}`, status: "pendente" })),
    );
    expect(contarPendentes(itens)).toBe(30);
    for (let n = 0; n < 30; n++) {
      itens = aplicarEvento(itens, {
        tipo: "update",
        item: item({ id: `m${n}`, status: "aprovado" }),
      });
    }
    expect(contarPendentes(itens)).toBe(0);
    expect(itens).toHaveLength(30);
  });
});
