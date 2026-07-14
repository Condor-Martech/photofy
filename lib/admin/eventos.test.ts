import { describe, expect, it } from "vitest";
import { mapEventoResumo, type EventoRow } from "./eventos";

const base: EventoRow = {
  id: "e1",
  slug: "lancamento-verao",
  nome: "Lançamento Verão",
  status: "ativo",
  data_inicio: "2026-07-14T00:00:00Z",
  media_items: [{ count: 12 }],
};

describe("mapEventoResumo", () => {
  it("extrai a contagem agregada embutida", () => {
    expect(mapEventoResumo(base).totalItens).toBe(12);
  });

  it("conta zero quando não há itens (array vazio ou null)", () => {
    expect(mapEventoResumo({ ...base, media_items: [] }).totalItens).toBe(0);
    expect(mapEventoResumo({ ...base, media_items: null }).totalItens).toBe(0);
  });

  it("normaliza status: 'ativo' se mantém, qualquer outro vira 'encerrado'", () => {
    expect(mapEventoResumo({ ...base, status: "ativo" }).status).toBe("ativo");
    expect(mapEventoResumo({ ...base, status: "encerrado" }).status).toBe("encerrado");
    expect(mapEventoResumo({ ...base, status: "qualquer" }).status).toBe("encerrado");
  });

  it("preserva identidade do evento", () => {
    const r = mapEventoResumo(base);
    expect(r).toMatchObject({ id: "e1", slug: "lancamento-verao", nome: "Lançamento Verão" });
  });
});
