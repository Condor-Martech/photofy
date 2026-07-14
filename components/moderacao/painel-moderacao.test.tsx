import { render, screen } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it } from "vitest";
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
