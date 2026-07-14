import { describe, expect, it } from "vitest";
import { acoesDisponiveis, statusApos, transicaoValida } from "./decisao";

describe("transições de moderação (PHF-041)", () => {
  it("aprovar leva um pendente para aprovado", () => {
    expect(statusApos("aprovar", "pendente")).toBe("aprovado");
  });

  it("reprovar leva um pendente para reprovado", () => {
    expect(statusApos("reprovar", "pendente")).toBe("reprovado");
  });

  it("reverter devolve um aprovado para pendente", () => {
    expect(statusApos("reverter", "aprovado")).toBe("pendente");
  });

  it("reverter também desfaz um reprovado", () => {
    expect(statusApos("reverter", "reprovado")).toBe("pendente");
  });

  it("recusa aprovar um item já aprovado", () => {
    expect(transicaoValida("aprovar", "aprovado")).toBe(false);
    expect(() => statusApos("aprovar", "aprovado")).toThrow(/inválida/i);
  });

  it("recusa reverter um item pendente", () => {
    expect(transicaoValida("reverter", "pendente")).toBe(false);
  });

  it("não modera item em erro", () => {
    expect(acoesDisponiveis("erro")).toEqual([]);
  });
});

describe("ações disponíveis por status", () => {
  it("pendente oferece aprovar e reprovar", () => {
    expect(acoesDisponiveis("pendente")).toEqual(["aprovar", "reprovar"]);
  });

  it("aprovado oferece apenas reverter", () => {
    expect(acoesDisponiveis("aprovado")).toEqual(["reverter"]);
  });

  it("reprovado oferece apenas reverter", () => {
    expect(acoesDisponiveis("reprovado")).toEqual(["reverter"]);
  });
});
