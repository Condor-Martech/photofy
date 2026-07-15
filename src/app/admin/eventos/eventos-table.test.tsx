import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { EventoResumo } from "../../../lib/admin/eventos";
import EventosTable from "./eventos-table";

const eventos: EventoResumo[] = [
  {
    id: "e1",
    slug: "lancamento-verao",
    nome: "Lançamento Verão",
    status: "ativo",
    dataInicio: "2026-07-14T00:00:00Z",
    totalItens: 12,
  },
  {
    id: "e2",
    slug: "feira-inverno",
    nome: "Feira Inverno",
    status: "encerrado",
    dataInicio: "2026-06-01T00:00:00Z",
    totalItens: 1,
  },
];

describe("EventosTable", () => {
  it("lista cada evento com nome, status e contagem de itens", () => {
    render(<EventosTable eventos={eventos} />);

    expect(screen.getByText("Lançamento Verão")).toBeInTheDocument();
    expect(screen.getByText("Ativo")).toBeInTheDocument();
    expect(screen.getByText("12 itens")).toBeInTheDocument();

    expect(screen.getByText("Feira Inverno")).toBeInTheDocument();
    expect(screen.getByText("Encerrado")).toBeInTheDocument();
    // singular quando há exatamente 1 item
    expect(screen.getByText("1 item")).toBeInTheDocument();
  });

  it("mostra estado vazio quando não há eventos", () => {
    render(<EventosTable eventos={[]} />);
    expect(screen.getByText(/nenhum evento criado ainda/i)).toBeInTheDocument();
  });
});
