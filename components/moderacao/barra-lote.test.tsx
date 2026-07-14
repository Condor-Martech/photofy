import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BarraLote } from "./barra-lote";

describe("BarraLote — ações em lote (PHF-042)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("não renderiza nada quando não há seleção", () => {
    const { container } = render(
      <BarraLote total={0} acoes={["aprovar"]} aoAplicar={vi.fn()} aoLimpar={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("mostra a contagem e as ações comuns; aprovar em lote aplica sem motivo", async () => {
    const aoAplicar = vi.fn().mockResolvedValue(undefined);
    render(
      <BarraLote
        total={30}
        acoes={["aprovar", "reprovar"]}
        aoAplicar={aoAplicar}
        aoLimpar={vi.fn()}
      />,
    );

    expect(screen.getByRole("toolbar", { name: /ações em lote/i })).toHaveTextContent(
      "30 selecionados",
    );
    await userEvent.click(screen.getByRole("button", { name: "Aprovar" }));
    expect(aoAplicar).toHaveBeenCalledWith("aprovar", undefined);
  });

  it("reprovar em lote pede um motivo único e o repassa; cancelar aborta", async () => {
    const aoAplicar = vi.fn().mockResolvedValue(undefined);
    const prompt = vi.spyOn(window, "prompt");
    render(
      <BarraLote total={3} acoes={["reprovar"]} aoAplicar={aoAplicar} aoLimpar={vi.fn()} />,
    );

    prompt.mockReturnValueOnce("conteúdo impróprio");
    await userEvent.click(screen.getByRole("button", { name: "Reprovar" }));
    expect(aoAplicar).toHaveBeenCalledWith("reprovar", "conteúdo impróprio");

    prompt.mockReturnValueOnce(null);
    await userEvent.click(screen.getByRole("button", { name: "Reprovar" }));
    expect(aoAplicar).toHaveBeenCalledTimes(1);
  });

  it("sem ação comum à seleção mostra aviso, mas ainda permite limpar", async () => {
    const aoLimpar = vi.fn();
    render(<BarraLote total={2} acoes={[]} aoAplicar={vi.fn()} aoLimpar={aoLimpar} />);

    expect(screen.getByText(/sem ação comum/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /limpar/i }));
    expect(aoLimpar).toHaveBeenCalled();
  });
});
