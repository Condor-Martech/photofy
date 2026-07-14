import { describe, expect, it } from "vitest";
import {
  MediaItemBruto,
  apenasAprovados,
  calcularPaginacao,
  normalizarPagina,
  paraItemGaleria,
} from "./galeria";

function bruto(over: Partial<MediaItemBruto> = {}): MediaItemBruto {
  return {
    id: "1",
    tipo: "foto",
    status: "aprovado",
    autor: null,
    mensagem: null,
    url_processada: null,
    url_thumb: null,
    url_original: "https://s/orig.jpg",
    ...over,
  };
}

describe("apenasAprovados", () => {
  // Gherkin §5: "Galeria pública lista apenas conteúdo aprovado".
  it("mantém só os itens aprovados, descartando pendente/reprovado/erro", () => {
    const itens = [
      bruto({ id: "a", status: "aprovado" }),
      bruto({ id: "b", status: "pendente" }),
      bruto({ id: "c", status: "reprovado" }),
      bruto({ id: "d", status: "erro" }),
      bruto({ id: "e", status: "aprovado" }),
    ];
    expect(apenasAprovados(itens).map((m) => m.id)).toEqual(["a", "e"]);
  });
});

describe("paraItemGaleria", () => {
  it("prefere url_processada e não vaza status nem campos de moderação", () => {
    const item = paraItemGaleria(
      bruto({ url_processada: "https://s/proc.jpg", url_thumb: "https://s/t.jpg" }),
    );
    expect(item.url).toBe("https://s/proc.jpg");
    expect(item.urlThumb).toBe("https://s/t.jpg");
    expect(item).not.toHaveProperty("status");
  });

  it("cai para url_original quando não há versão processada", () => {
    expect(paraItemGaleria(bruto({ url_processada: null })).url).toBe(
      "https://s/orig.jpg",
    );
  });
});

describe("normalizarPagina", () => {
  it.each([
    [undefined, 1],
    ["0", 1],
    ["-3", 1],
    ["abc", 1],
    ["2", 2],
    [["4", "9"], 4],
  ])("normaliza %s -> %i", (entrada, esperado) => {
    expect(normalizarPagina(entrada)).toBe(esperado);
  });
});

describe("calcularPaginacao", () => {
  it("calcula total de páginas e offset por tamanho", () => {
    const p = calcularPaginacao(50, 2, 24);
    expect(p).toMatchObject({
      pagina: 2,
      totalPaginas: 3,
      temAnterior: true,
      temProxima: true,
      offset: 24,
    });
  });

  it("clampa página acima do máximo para a última", () => {
    const p = calcularPaginacao(10, 9, 24);
    expect(p).toMatchObject({ pagina: 1, totalPaginas: 1, temProxima: false });
  });

  it("galeria vazia continua com 1 página e sem navegação", () => {
    const p = calcularPaginacao(0, 1, 24);
    expect(p).toMatchObject({
      total: 0,
      totalPaginas: 1,
      temAnterior: false,
      temProxima: false,
      offset: 0,
    });
  });
});
