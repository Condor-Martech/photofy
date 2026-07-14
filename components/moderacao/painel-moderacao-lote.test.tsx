import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import type { AssinarFila, EventoFila, ItemMidia } from "@/lib/moderacao/tipos";
import { PainelModeracao } from "./painel-moderacao";

function item(over: Partial<ItemMidia> & Pick<ItemMidia, "id">): ItemMidia {
  return {
    event_id: "ev-1",
    tipo: "foto",
    autor: null,
    mensagem: null,
    status: "pendente",
    url_original: "orig.jpg",
    url_processada: null,
    url_thumb: null,
    exif_removido: false,
    criado_em: "2026-07-14T12:00:00.000Z",
    ...over,
  };
}

function fakeAssinatura() {
  let emitir: ((e: EventoFila) => void) | undefined;
  const assinar: AssinarFila = (aoReceber) => {
    emitir = aoReceber;
    return () => {};
  };
  return { assinar, emitir: (e: EventoFila) => act(() => emitir!(e)) };
}

function lista() {
  return screen.getByRole("list");
}

describe("PainelModeracao — filtros por status (PHF-042)", () => {
  it("filtra a fila pelo status escolhido e conta cada filtro", async () => {
    const canal = fakeAssinatura();
    render(
      <PainelModeracao
        eventId="ev-1"
        assinar={canal.assinar}
        itensIniciais={[
          item({ id: "a", autor: "Ana", status: "pendente" }),
          item({ id: "b", autor: "Beto", status: "aprovado" }),
          item({ id: "c", autor: "Cadu", status: "pendente" }),
        ]}
      />,
    );

    // Sem filtro: todos aparecem.
    expect(within(lista()).getByText("Ana")).toBeInTheDocument();
    expect(within(lista()).getByText("Beto")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /aprovados/i }));

    expect(within(lista()).getByText("Beto")).toBeInTheDocument();
    expect(within(lista()).queryByText("Ana")).not.toBeInTheDocument();
    expect(within(lista()).queryByText("Cadu")).not.toBeInTheDocument();
  });

  it("mostra aviso quando o filtro não tem itens, sem esconder o badge", async () => {
    const canal = fakeAssinatura();
    render(
      <PainelModeracao
        eventId="ev-1"
        assinar={canal.assinar}
        itensIniciais={[item({ id: "a", autor: "Ana", status: "pendente" })]}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /reprovados/i }));
    expect(screen.getByText(/nenhum item neste filtro/i)).toBeInTheDocument();
  });
});

describe("PainelModeracao — aprovação em lote (PHF-042, Gherkin)", () => {
  it("selecionar todos os pendentes e aprovar em lote chama a RPC com os 30 ids", async () => {
    const canal = fakeAssinatura();
    const aplicarDecisaoLote = vi.fn().mockResolvedValue(undefined);
    const trinta = Array.from({ length: 30 }, (_, n) =>
      item({ id: `m${n}`, autor: `P${n}`, status: "pendente" }),
    );
    render(
      <PainelModeracao
        eventId="ev-1"
        assinar={canal.assinar}
        aplicarDecisaoLote={aplicarDecisaoLote}
        itensIniciais={trinta}
      />,
    );

    await userEvent.click(
      screen.getByRole("checkbox", { name: /selecionar todos os itens visíveis/i }),
    );

    expect(screen.getByRole("toolbar", { name: /ações em lote/i })).toHaveTextContent(
      "30 selecionados",
    );

    await userEvent.click(
      within(screen.getByRole("toolbar")).getByRole("button", { name: "Aprovar" }),
    );

    expect(aplicarDecisaoLote).toHaveBeenCalledTimes(1);
    const chamada = aplicarDecisaoLote.mock.calls[0][0];
    expect(chamada.acao).toBe("aprovar");
    expect(chamada.mediaIds).toHaveLength(30);
    expect(new Set(chamada.mediaIds)).toEqual(new Set(trinta.map((i) => i.id)));
  });

  it("seleção mista (pendente + aprovado) não oferece ação comum", async () => {
    const canal = fakeAssinatura();
    render(
      <PainelModeracao
        eventId="ev-1"
        assinar={canal.assinar}
        aplicarDecisaoLote={vi.fn()}
        itensIniciais={[
          item({ id: "a", autor: "Ana", status: "pendente" }),
          item({ id: "b", autor: "Beto", status: "aprovado" }),
        ]}
      />,
    );

    await userEvent.click(
      screen.getByRole("checkbox", { name: /selecionar todos os itens visíveis/i }),
    );

    const toolbar = screen.getByRole("toolbar", { name: /ações em lote/i });
    expect(toolbar).toHaveTextContent("2 selecionados");
    expect(within(toolbar).getByText(/sem ação comum/i)).toBeInTheDocument();
  });

  it("após aprovar em lote a seleção é limpa e a barra some", async () => {
    const canal = fakeAssinatura();
    const aplicarDecisaoLote = vi.fn().mockResolvedValue(undefined);
    render(
      <PainelModeracao
        eventId="ev-1"
        assinar={canal.assinar}
        aplicarDecisaoLote={aplicarDecisaoLote}
        itensIniciais={[
          item({ id: "a", autor: "Ana", status: "pendente" }),
          item({ id: "b", autor: "Beto", status: "pendente" }),
        ]}
      />,
    );

    await userEvent.click(
      screen.getByRole("checkbox", { name: /selecionar todos os itens visíveis/i }),
    );
    await userEvent.click(
      within(screen.getByRole("toolbar")).getByRole("button", { name: "Aprovar" }),
    );

    expect(aplicarDecisaoLote).toHaveBeenCalled();
    expect(screen.queryByRole("toolbar", { name: /ações em lote/i })).not.toBeInTheDocument();
  });
});
