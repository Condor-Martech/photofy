import { render, screen } from "@testing-library/react";
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

describe("PainelModeracao — lista em tempo real com badge (PHF-040)", () => {
  it("renderiza itens iniciais e o badge com a contagem de pendentes", () => {
    const canal = fakeAssinatura();
    render(
      <PainelModeracao
        eventId="ev-1"
        assinar={canal.assinar}
        itensIniciais={[
          item({ id: "a", autor: "Ana", status: "pendente" }),
          item({ id: "b", autor: "Beto", status: "aprovado" }),
        ]}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("1");
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("Beto")).toBeInTheDocument();
  });

  it("um envio novo via Realtime aparece na lista e o badge sobe", () => {
    const canal = fakeAssinatura();
    render(<PainelModeracao eventId="ev-1" assinar={canal.assinar} />);

    expect(screen.getByText(/nenhum envio na fila/i)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("0");

    canal.emitir({ tipo: "insert", item: item({ id: "novo", autor: "Carla" }) });

    expect(screen.getByText("Carla")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("1");
  });
});

describe("PainelModeracao — decisões de moderação (PHF-041)", () => {
  it("aprovar um pendente chama a decisão e o Realtime reflete o novo status", async () => {
    const canal = fakeAssinatura();
    const aplicarDecisao = vi.fn().mockResolvedValue(undefined);
    render(
      <PainelModeracao
        eventId="ev-1"
        assinar={canal.assinar}
        aplicarDecisao={aplicarDecisao}
        itensIniciais={[item({ id: "a", autor: "Ana", status: "pendente" })]}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("1");
    await userEvent.click(screen.getByRole("button", { name: "Aprovar" }));
    expect(aplicarDecisao).toHaveBeenCalledWith({
      mediaId: "a",
      acao: "aprovar",
      motivo: undefined,
    });

    // O painel não muda o status por conta própria: quem reflete é o Realtime.
    canal.emitir({ tipo: "update", item: item({ id: "a", autor: "Ana", status: "aprovado" }) });
    expect(screen.getByRole("status")).toHaveTextContent("0");
    expect(screen.getByRole("button", { name: "Reverter" })).toBeInTheDocument();
  });

  it("reverter um aprovado envia a ação com o media_id correto", async () => {
    const canal = fakeAssinatura();
    const aplicarDecisao = vi.fn().mockResolvedValue(undefined);
    render(
      <PainelModeracao
        eventId="ev-1"
        assinar={canal.assinar}
        aplicarDecisao={aplicarDecisao}
        itensIniciais={[item({ id: "z", autor: "Zeca", status: "aprovado" })]}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Reverter" }));
    expect(aplicarDecisao).toHaveBeenCalledWith({
      mediaId: "z",
      acao: "reverter",
      motivo: undefined,
    });
  });
});
