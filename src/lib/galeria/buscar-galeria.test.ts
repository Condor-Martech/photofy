import { describe, expect, it, vi } from "vitest";
import type { MediaItemBruto } from "./galeria";
import { montarResultadoGaleria } from "./buscar-galeria";

function bruto(id: string, over: Partial<MediaItemBruto> = {}): MediaItemBruto {
  return {
    id,
    tipo: "foto",
    status: "aprovado",
    autor: null,
    mensagem: null,
    url_processada: null,
    url_thumb: null,
    url_original: `https://s/${id}.jpg`,
    ...over,
  };
}

describe("montarResultadoGaleria", () => {
  // Gherkin §5: "somente os itens com status 'aprovado' são exibidos
  // E o contador de itens reflete apenas os aprovados".
  it("expõe só aprovados e o contador usa o total de aprovados da fonte", async () => {
    const buscar = vi.fn().mockResolvedValue({
      brutos: [
        bruto("a", { status: "aprovado" }),
        bruto("b", { status: "pendente" }), // não deve vazar mesmo se a fonte errar
        bruto("c", { status: "aprovado" }),
      ],
      total: 2, // fonte já conta apenas aprovados
    });

    const { itens, paginacao } = await montarResultadoGaleria(buscar, 1, 24);

    expect(itens.map((i) => i.id)).toEqual(["a", "c"]);
    expect(paginacao.total).toBe(2);
    expect(paginacao.totalPaginas).toBe(1);
  });

  it("pede o offset correto para a página solicitada", async () => {
    const buscar = vi.fn().mockResolvedValue({ brutos: [], total: 100 });
    const { paginacao } = await montarResultadoGaleria(buscar, 3, 24);
    expect(buscar).toHaveBeenCalledWith(48, 24);
    expect(paginacao).toMatchObject({ pagina: 3, offset: 48, temProxima: true });
  });

  it("normaliza página inválida para 1 antes de buscar", async () => {
    const buscar = vi.fn().mockResolvedValue({ brutos: [], total: 0 });
    await montarResultadoGaleria(buscar, -5 as unknown as number, 24);
    expect(buscar).toHaveBeenCalledWith(0, 24);
  });
});
