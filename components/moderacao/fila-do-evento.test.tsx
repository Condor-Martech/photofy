import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AssinarFila } from "@/lib/moderacao/tipos";
import { FilaDoEvento } from "./fila-do-evento";

// Sem Supabase real: assinatura no-op (o painel não emite nada) e resolver injetado.
const semAssinatura: AssinarFila = () => () => {};

describe("FilaDoEvento — acesso do organizador à fila de um evento (PHF-072)", () => {
  it("resolve o slug e monta a fila de moderação daquele evento", async () => {
    const resolver = vi.fn().mockResolvedValue("ev-verao");
    render(<FilaDoEvento slug="lancamento-verao" resolver={resolver} assinar={semAssinatura} />);

    expect(await screen.findByRole("heading", { name: /moderação/i })).toBeInTheDocument();
    // Isolamento (02-spec §5): a fila é montada para o evento do slug pedido, não outro.
    expect(resolver).toHaveBeenCalledWith("lancamento-verao");
  });

  it("mostra 'evento não encontrado' quando o slug não resolve", async () => {
    const resolver = vi.fn().mockResolvedValue(null);
    render(<FilaDoEvento slug="inexistente" resolver={resolver} assinar={semAssinatura} />);

    expect(await screen.findByText(/evento não encontrado/i)).toBeInTheDocument();
  });
});
