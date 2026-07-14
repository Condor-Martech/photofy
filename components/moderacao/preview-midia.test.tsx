import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ItemMidia } from "@/lib/moderacao/tipos";
import { PreviewMidia } from "./preview-midia";

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

describe("PreviewMidia (PHF-043)", () => {
  it("foto: mostra a imagem processada em tela cheia, com autor e mensagem", () => {
    render(
      <PreviewMidia
        item={item({
          id: "a",
          tipo: "foto",
          autor: "Ana",
          mensagem: "Muito bom!",
          url_processada: "https://cdn/proc.jpg",
          url_original: "https://cdn/orig.jpg",
        })}
        aoFechar={vi.fn()}
      />,
    );

    const foto = screen.getByRole("img", { name: /foto de ana/i });
    expect(foto).toHaveAttribute("src", "https://cdn/proc.jpg");
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("Muito bom!")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("foto: cai para url_original quando ainda não há url_processada", () => {
    render(
      <PreviewMidia
        item={item({ id: "a", url_processada: null, url_original: "https://cdn/orig.jpg" })}
        aoFechar={vi.fn()}
      />,
    );
    expect(screen.getByRole("img")).toHaveAttribute("src", "https://cdn/orig.jpg");
  });

  it("reel: renderiza um player de vídeo em vez de imagem", () => {
    render(
      <PreviewMidia
        item={item({
          id: "r",
          tipo: "reel",
          autor: "Beto",
          url_processada: "https://cdn/reel.mp4",
        })}
        aoFechar={vi.fn()}
      />,
    );

    const video = screen.getByLabelText("Reel de Beto");
    expect(video.tagName).toBe("VIDEO");
    expect(video).toHaveAttribute("src", "https://cdn/reel.mp4");
    expect(video).toHaveAttribute("controls");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("fecha ao clicar no botão de fechar", async () => {
    const aoFechar = vi.fn();
    render(<PreviewMidia item={item({ id: "a", autor: "Ana" })} aoFechar={aoFechar} />);

    await userEvent.click(screen.getByRole("button", { name: /fechar preview/i }));
    expect(aoFechar).toHaveBeenCalledTimes(1);
  });

  it("fecha ao clicar no fundo (backdrop), mas não ao clicar na mídia", async () => {
    const aoFechar = vi.fn();
    render(
      <PreviewMidia
        item={item({ id: "a", autor: "Ana", url_processada: "https://cdn/proc.jpg" })}
        aoFechar={aoFechar}
      />,
    );

    await userEvent.click(screen.getByRole("img", { name: /foto de ana/i }));
    expect(aoFechar).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("dialog"));
    expect(aoFechar).toHaveBeenCalledTimes(1);
  });

  it("fecha com a tecla Escape", async () => {
    const aoFechar = vi.fn();
    render(<PreviewMidia item={item({ id: "a" })} aoFechar={aoFechar} />);

    await userEvent.keyboard("{Escape}");
    expect(aoFechar).toHaveBeenCalledTimes(1);
  });
});
