import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

describe("PainelModeracao — preview ampliado (PHF-043)", () => {
  it("clicar na thumbnail abre o overlay e fechar remove-o", async () => {
    const canal = fakeAssinatura();
    render(
      <PainelModeracao
        eventId="ev-1"
        assinar={canal.assinar}
        itensIniciais={[
          item({ id: "a", autor: "Ana", url_thumb: "https://cdn/t.jpg" }),
        ]}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: /ampliar preview de ana/i }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /fechar preview/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("o overlay reflete a mudança de status vinda do Realtime", async () => {
    const canal = fakeAssinatura();
    render(
      <PainelModeracao
        eventId="ev-1"
        assinar={canal.assinar}
        itensIniciais={[
          item({ id: "a", autor: "Ana", status: "pendente", url_thumb: "https://cdn/t.jpg" }),
        ]}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /ampliar preview de ana/i }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Aprovado em outra sessão: o item continua na lista, então o preview segue aberto.
    canal.emitir({
      tipo: "update",
      item: item({ id: "a", autor: "Ana", status: "aprovado", url_thumb: "https://cdn/t.jpg" }),
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Se o item sai da lista (delete), o overlay fecha sozinho.
    canal.emitir({ tipo: "delete", id: "a" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
