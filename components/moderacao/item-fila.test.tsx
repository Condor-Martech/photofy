import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("sem aoDecidir não mostra nenhuma ação (painel só-leitura)", () => {
    render(
      <ul>
        <ItemFila item={item({ id: "c", status: "pendente" })} />
      </ul>,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("ItemFila — ações de moderação (PHF-041)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("pendente oferece Aprovar e Reprovar; aprovar chama aoDecidir sem motivo", async () => {
    const aoDecidir = vi.fn().mockResolvedValue(undefined);
    render(
      <ul>
        <ItemFila item={item({ id: "a", status: "pendente" })} aoDecidir={aoDecidir} />
      </ul>,
    );

    expect(screen.getByRole("button", { name: "Reprovar" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Aprovar" }));

    expect(aoDecidir).toHaveBeenCalledWith("aprovar", undefined);
  });

  it("reprovar pede motivo e o repassa; cancelar aborta", async () => {
    const aoDecidir = vi.fn().mockResolvedValue(undefined);
    const prompt = vi.spyOn(window, "prompt");
    render(
      <ul>
        <ItemFila item={item({ id: "a", status: "pendente" })} aoDecidir={aoDecidir} />
      </ul>,
    );

    prompt.mockReturnValueOnce("conteúdo impróprio");
    await userEvent.click(screen.getByRole("button", { name: "Reprovar" }));
    expect(aoDecidir).toHaveBeenCalledWith("reprovar", "conteúdo impróprio");

    prompt.mockReturnValueOnce(null);
    await userEvent.click(screen.getByRole("button", { name: "Reprovar" }));
    expect(aoDecidir).toHaveBeenCalledTimes(1);
  });

  it("aprovado oferece apenas Reverter", async () => {
    const aoDecidir = vi.fn().mockResolvedValue(undefined);
    render(
      <ul>
        <ItemFila item={item({ id: "a", status: "aprovado" })} aoDecidir={aoDecidir} />
      </ul>,
    );

    expect(screen.queryByRole("button", { name: "Aprovar" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reverter" }));
    expect(aoDecidir).toHaveBeenCalledWith("reverter", undefined);
  });

  it("item em erro não oferece ações", () => {
    render(
      <ul>
        <ItemFila
          item={item({ id: "a", status: "erro" })}
          aoDecidir={vi.fn()}
        />
      </ul>,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("ItemFila — seleção para lote (PHF-042)", () => {
  it("sem aoAlternarSelecao não mostra checkbox (só-leitura / sem lote)", () => {
    render(
      <ul>
        <ItemFila item={item({ id: "a", autor: "Ana" })} />
      </ul>,
    );
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("com aoAlternarSelecao mostra checkbox e alterna pelo id do item", async () => {
    const aoAlternarSelecao = vi.fn();
    render(
      <ul>
        <ItemFila
          item={item({ id: "a", autor: "Ana" })}
          aoAlternarSelecao={aoAlternarSelecao}
        />
      </ul>,
    );

    const checkbox = screen.getByRole("checkbox", { name: /selecionar envio de ana/i });
    expect(checkbox).not.toBeChecked();
    await userEvent.click(checkbox);
    expect(aoAlternarSelecao).toHaveBeenCalledWith("a");
  });

  it("reflete o estado selecionado", () => {
    render(
      <ul>
        <ItemFila
          item={item({ id: "a", autor: "Ana" })}
          selecionado
          aoAlternarSelecao={vi.fn()}
        />
      </ul>,
    );
    expect(screen.getByRole("checkbox", { name: /selecionar envio de ana/i })).toBeChecked();
  });
});

describe("ItemFila — abrir preview ampliado (PHF-043)", () => {
  it("sem aoAbrirPreview a thumbnail não é um botão clicável", () => {
    render(
      <ul>
        <ItemFila item={item({ id: "a", autor: "Ana", url_thumb: "https://cdn/t.jpg" })} />
      </ul>,
    );
    expect(
      screen.queryByRole("button", { name: /ampliar preview/i }),
    ).not.toBeInTheDocument();
  });

  it("com aoAbrirPreview a thumbnail vira botão e repassa o item", async () => {
    const aoAbrirPreview = vi.fn();
    const midia = item({ id: "a", autor: "Ana", url_thumb: "https://cdn/t.jpg" });
    render(
      <ul>
        <ItemFila item={midia} aoAbrirPreview={aoAbrirPreview} />
      </ul>,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /ampliar preview de ana/i }),
    );
    expect(aoAbrirPreview).toHaveBeenCalledWith(midia);
  });

  it("abre o preview mesmo sem thumbnail (placeholder por tipo)", async () => {
    const aoAbrirPreview = vi.fn();
    render(
      <ul>
        <ItemFila
          item={item({ id: "a", autor: null, tipo: "reel", url_thumb: null })}
          aoAbrirPreview={aoAbrirPreview}
        />
      </ul>,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /ampliar preview de anônimo/i }),
    );
    expect(aoAbrirPreview).toHaveBeenCalledTimes(1);
  });
});
