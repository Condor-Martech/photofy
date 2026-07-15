import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { calcularPaginacao, type ItemGaleria } from "@/lib/galeria/galeria";
import GaleriaConteudo from "./galeria-conteudo";

function item(id: string, over: Partial<ItemGaleria> = {}): ItemGaleria {
  return {
    id,
    tipo: "foto",
    autor: null,
    mensagem: null,
    url: `https://s/${id}.jpg`,
    urlThumb: null,
    ...over,
  };
}

describe("GaleriaConteudo", () => {
  it("mostra estado vazio quando não há itens aprovados", () => {
    render(
      <GaleriaConteudo slug="lancamento-verao" itens={[]} paginacao={calcularPaginacao(0, 1)} />,
    );
    expect(screen.getByText(/ainda não há fotos ou reels/i)).toBeInTheDocument();
    expect(screen.getByText("0 itens aprovados")).toBeInTheDocument();
  });

  it("renderiza o grid e o contador refletindo apenas aprovados", () => {
    const itens = [
      item("a", { tipo: "foto", autor: "Ana", urlThumb: "https://s/a-t.jpg" }),
      item("b", { tipo: "reel", autor: "Bruno" }),
    ];
    render(
      <GaleriaConteudo slug="lancamento-verao" itens={itens} paginacao={calcularPaginacao(2, 1)} />,
    );
    expect(screen.getByText("2 itens aprovados")).toBeInTheDocument();
    expect(screen.getByAltText("Foto de Ana")).toHaveAttribute("src", "https://s/a-t.jpg");
    expect(screen.getByLabelText("Reel de Bruno")).toBeInTheDocument();
  });

  it("não mostra navegação quando cabe em uma página", () => {
    render(
      <GaleriaConteudo slug="e" itens={[item("a")]} paginacao={calcularPaginacao(1, 1)} />,
    );
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("liga a 'Próxima' e desabilita 'Anterior' na primeira página", () => {
    const paginacao = calcularPaginacao(50, 1, 24);
    render(<GaleriaConteudo slug="lancamento-verao" itens={[item("a")]} paginacao={paginacao} />);

    const proxima = screen.getByRole("link", { name: "Próxima" });
    expect(proxima).toHaveAttribute("href", "/evento/lancamento-verao/galeria?pagina=2");
    expect(screen.queryByRole("link", { name: "Anterior" })).not.toBeInTheDocument();
    expect(screen.getByText("Anterior")).toHaveAttribute("aria-disabled", "true");
  });
});
