import { describe, expect, it } from "vitest";
import { contarPorStatus, filtrarPorStatus } from "./filtro";
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

const amostra: ItemMidia[] = [
  item({ id: "a", status: "pendente" }),
  item({ id: "b", status: "aprovado" }),
  item({ id: "c", status: "pendente" }),
  item({ id: "d", status: "reprovado" }),
  item({ id: "e", status: "erro" }),
];

describe("filtrarPorStatus (PHF-042)", () => {
  it("'todos' devolve a lista intacta (mesma referência, sem recorte)", () => {
    expect(filtrarPorStatus(amostra, "todos")).toBe(amostra);
  });

  it("recorta a fila para um único status", () => {
    expect(filtrarPorStatus(amostra, "pendente").map((i) => i.id)).toEqual(["a", "c"]);
    expect(filtrarPorStatus(amostra, "aprovado").map((i) => i.id)).toEqual(["b"]);
    expect(filtrarPorStatus(amostra, "erro").map((i) => i.id)).toEqual(["e"]);
  });

  it("preserva a ordem da lista recebida", () => {
    const ordenada = [
      item({ id: "novo", status: "pendente", criado_em: "2026-07-14T09:00:00Z" }),
      item({ id: "antigo", status: "pendente", criado_em: "2026-07-14T08:00:00Z" }),
    ];
    expect(filtrarPorStatus(ordenada, "pendente").map((i) => i.id)).toEqual([
      "novo",
      "antigo",
    ]);
  });

  it("devolve vazio quando nenhum item bate o filtro", () => {
    expect(filtrarPorStatus([item({ id: "a", status: "aprovado" })], "erro")).toEqual([]);
  });
});

describe("contarPorStatus — rótulos dos filtros (PHF-042)", () => {
  it("conta cada status e usa o total em 'todos'", () => {
    expect(contarPorStatus(amostra)).toEqual({
      todos: 5,
      pendente: 2,
      aprovado: 1,
      reprovado: 1,
      erro: 1,
    });
  });

  it("zera todas as contagens numa lista vazia", () => {
    expect(contarPorStatus([])).toEqual({
      todos: 0,
      pendente: 0,
      aprovado: 0,
      reprovado: 0,
      erro: 0,
    });
  });
});
