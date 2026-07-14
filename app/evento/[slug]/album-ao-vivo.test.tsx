import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AlbumAoVivo from "./album-ao-vivo";

// Cobre o cenário Gherkin (02-spec.md §5): "Galeria pública lista apenas conteúdo
// aprovado" — o bloco reflete estritamente o que o endpoint de galeria devolve
// (que já é apenas aprovado, contrato §4), e sempre oferece o link direto à galeria.
describe("AlbumAoVivo — prévia do álbum na tela de upload", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sempre oferece link direto para a galeria completa do evento", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) }));
    render(<AlbumAoVivo slug="lancamento-verao" />);

    expect(screen.getByRole("link", { name: /galeria completa/i })).toHaveAttribute(
      "href",
      "/evento/lancamento-verao/galeria",
    );
    await waitFor(() => expect(screen.getByText(/aparecem aqui assim que/i)).toBeInTheDocument());
  });

  it("exibe as miniaturas dos itens aprovados devolvidos pela galeria", async () => {
    const items = [
      { id: "1", tipo: "foto", autor: "Ana", url_thumb: "https://cdn/t1.jpg" },
      { id: "2", tipo: "foto", autor: null, url_thumb: "https://cdn/t2.jpg" },
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items }) }));

    render(<AlbumAoVivo slug="lancamento-verao" />);

    expect(await screen.findByAltText(/envio de ana/i)).toHaveAttribute("src", "https://cdn/t1.jpg");
    expect(screen.getByAltText(/item do álbum/i)).toBeInTheDocument();
    expect(screen.queryByText(/aparecem aqui assim que/i)).not.toBeInTheDocument();
  });

  it("mostra estado vazio quando o endpoint de galeria ainda não existe", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    render(<AlbumAoVivo slug="lancamento-verao" />);

    await waitFor(() =>
      expect(screen.getByText(/aparecem aqui assim que forem publicados/i)).toBeInTheDocument(),
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("limita a prévia a PREVIEW_MAX miniaturas", async () => {
    const items = Array.from({ length: 12 }, (_, i) => ({
      id: String(i),
      tipo: "foto",
      autor: `P${i}`,
      url_thumb: `https://cdn/${i}.jpg`,
    }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => items }));

    render(<AlbumAoVivo slug="lancamento-verao" />);

    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(8));
  });
});
