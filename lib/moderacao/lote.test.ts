import { describe, expect, it } from "vitest";
import { acoesLoteDisponiveis } from "./lote";
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

describe("acoesLoteDisponiveis (PHF-042)", () => {
  it("seleção vazia não oferece ações", () => {
    expect(acoesLoteDisponiveis([])).toEqual([]);
  });

  it("só pendentes: oferece aprovar e reprovar (Gherkin 'Aprovação em lote')", () => {
    const selecao = Array.from({ length: 30 }, (_, n) =>
      item({ id: `m${n}`, status: "pendente" }),
    );
    expect(acoesLoteDisponiveis(selecao)).toEqual(["aprovar", "reprovar"]);
  });

  it("só aprovados: oferece apenas reverter", () => {
    expect(
      acoesLoteDisponiveis([
        item({ id: "a", status: "aprovado" }),
        item({ id: "b", status: "aprovado" }),
      ]),
    ).toEqual(["reverter"]);
  });

  it("aprovados e reprovados juntos: reverter é comum aos dois", () => {
    expect(
      acoesLoteDisponiveis([
        item({ id: "a", status: "aprovado" }),
        item({ id: "b", status: "reprovado" }),
      ]),
    ).toEqual(["reverter"]);
  });

  it("mistura de pendente e aprovado não tem ação comum", () => {
    expect(
      acoesLoteDisponiveis([
        item({ id: "a", status: "pendente" }),
        item({ id: "b", status: "aprovado" }),
      ]),
    ).toEqual([]);
  });

  it("um item em erro na seleção zera as ações (erro não é moderável)", () => {
    expect(
      acoesLoteDisponiveis([
        item({ id: "a", status: "pendente" }),
        item({ id: "b", status: "erro" }),
      ]),
    ).toEqual([]);
  });
});
