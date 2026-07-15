import { describe, expect, it } from "vitest";
import { interpretarCorpoDecisao } from "./corpo";

describe("interpretarCorpoDecisao", () => {
  it("aceita executar sem motivo", () => {
    expect(interpretarCorpoDecisao({ decisao: "executar" })).toEqual({
      ok: true,
      decisao: "executar",
      motivo: null,
    });
  });

  it("aceita negar com motivo", () => {
    expect(interpretarCorpoDecisao({ decisao: "negar", motivo: "sem base" })).toEqual({
      ok: true,
      decisao: "negar",
      motivo: "sem base",
    });
  });

  it("rejeita decisao ausente ou inválida", () => {
    expect(interpretarCorpoDecisao({}).ok).toBe(false);
    expect(interpretarCorpoDecisao({ decisao: "apagar" }).ok).toBe(false);
  });

  it("rejeita corpo não-objeto", () => {
    expect(interpretarCorpoDecisao(null).ok).toBe(false);
    expect(interpretarCorpoDecisao("executar").ok).toBe(false);
  });

  it("rejeita motivo de tipo errado", () => {
    expect(interpretarCorpoDecisao({ decisao: "negar", motivo: 42 }).ok).toBe(false);
  });
});
