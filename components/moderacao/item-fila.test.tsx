import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ItemMidia } from "@/lib/moderacao/tipos";
import { ItemFila } from "./item-fila";

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

describe("ItemFila", () => {
  it("mostra thumbnail, autor, mensagem, tipo e status", () => {
    render(
      <ul>
        <ItemFila
          item={item({
            id: "a",
            autor: "Ana",
            mensagem: "Muito bom!",
            tipo: "foto",
            status: "pendente",
            url_thumb: "https://cdn/thumb.jpg",
          })}
        />
      </ul>,
    );

    const thumb = screen.getByRole("img", { name: /envio de ana/i });
    expect(thumb).toHaveAttribute("src", "https://cdn/thumb.jpg");
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("Muito bom!")).toBeInTheDocument();
    expect(screen.getByText("Foto")).toBeInTheDocument();
    expect(screen.getByText("Pendente")).toBeInTheDocument();
  });

  it("usa 'Anônimo' e um placeholder quando não há autor nem thumbnail", () => {
    render(
      <ul>
        <ItemFila item={item({ id: "b", tipo: "reel", url_thumb: null })} />
      </ul>,
    );
    expect(screen.getByText("Anônimo")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
