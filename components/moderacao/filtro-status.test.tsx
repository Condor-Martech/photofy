import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { FiltroStatus } from "@/lib/moderacao/tipos";
import { FiltroStatusBar } from "./filtro-status";

const contagem: Record<FiltroStatus, number> = {
  todos: 5,
  pendente: 2,
  aprovado: 1,
  reprovado: 1,
  erro: 1,
};

describe("FiltroStatusBar (PHF-042)", () => {
  it("marca o filtro atual com aria-pressed e mostra as contagens", () => {
    render(<FiltroStatusBar atual="pendente" contagem={contagem} aoFiltrar={vi.fn()} />);

    const pendentes = screen.getByRole("button", { name: /pendentes/i });
    expect(pendentes).toHaveAttribute("aria-pressed", "true");
    expect(pendentes).toHaveTextContent("2");
    expect(screen.getByRole("button", { name: /todos/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("clicar num filtro chama aoFiltrar com o status escolhido", async () => {
    const aoFiltrar = vi.fn();
    render(<FiltroStatusBar atual="todos" contagem={contagem} aoFiltrar={aoFiltrar} />);

    await userEvent.click(screen.getByRole("button", { name: /aprovados/i }));
    expect(aoFiltrar).toHaveBeenCalledWith("aprovado");
  });
});
