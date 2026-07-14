import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Slideshow } from "./slideshow";
import type {
  AssinarSlideshow,
  EventoSlideshow,
  ItemMidia,
  SlideshowConfig,
} from "@/lib/slideshow/tipos";

const config: SlideshowConfig = {
  seg_por_slide: 6,
  ordem: "recentes",
  transicao: "fade",
  exibir_autor_mensagem: true,
  incluir_reels: true,
  duracao_reel_telao: "completo",
  loop: true,
  escurecimento_bg: 30,
};

const item = (over: Partial<ItemMidia> = {}): ItemMidia => ({
  id: "1",
  event_id: "ev",
  tipo: "foto",
  autor: null,
  mensagem: null,
  status: "aprovado",
  url_original: "orig.jpg",
  url_processada: "proc.jpg",
  url_thumb: "thumb.jpg",
  exif_removido: true,
  criado_em: "2026-07-14T10:00:00Z",
  ...over,
});

// Assinatura fake: captura o callback para o teste empurrar eventos de Realtime,
// simulando aprovações/exclusões sem Supabase real.
function assinaturaFake(): { assinar: AssinarSlideshow; emitir: (e: EventoSlideshow) => void } {
  let cb: ((e: EventoSlideshow) => void) | null = null;
  return {
    assinar: (aoReceber) => {
      cb = aoReceber;
      return () => {
        cb = null;
      };
    },
    emitir: (e) => act(() => cb?.(e)),
  };
}

describe("Slideshow", () => {
  it("mostra o estado vazio quando não há aprovados", () => {
    render(<Slideshow itensIniciais={[]} config={config} assinar={() => () => {}} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/Aguardando/i)).toBeInTheDocument();
  });

  it("renderiza o slide atual quando há aprovados", () => {
    render(
      <Slideshow
        itensIniciais={[item({ id: "1", mensagem: "Que festa!", autor: "Ana" })]}
        config={config}
        assinar={() => () => {}}
      />,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Que festa!" })).toHaveAttribute("src", "proc.jpg");
    expect(screen.getByText("— Ana")).toBeInTheDocument();
  });

  // Gherkin/PHF-051: aprovação reflete no telão via Realtime, sem reload.
  it("sai do estado vazio quando um aprovado chega por Realtime", () => {
    const { assinar, emitir } = assinaturaFake();
    render(<Slideshow itensIniciais={[]} config={config} assinar={assinar} />);

    expect(screen.getByRole("status")).toBeInTheDocument();

    emitir({ tipo: "insert", item: item({ id: "novo", mensagem: "oi" }) });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "oi" })).toBeInTheDocument();
  });

  it("volta ao estado vazio quando o último aprovado é excluído por Realtime", () => {
    const { assinar, emitir } = assinaturaFake();
    render(<Slideshow itensIniciais={[item({ id: "1" })]} config={config} assinar={assinar} />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    emitir({ tipo: "delete", id: "1" });
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("não exibe autor/mensagem quando exibir_autor_mensagem=false", () => {
    render(
      <Slideshow
        itensIniciais={[item({ id: "1", autor: "Ana", mensagem: "oi" })]}
        config={{ ...config, exibir_autor_mensagem: false }}
        assinar={() => () => {}}
      />,
    );
    expect(screen.queryByText("oi")).not.toBeInTheDocument();
  });
});

describe("Slideshow — avanço automático", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("avança para o próximo slide após seg_por_slide", () => {
    const itens = [
      item({ id: "novo", mensagem: "novo", criado_em: "2026-07-14T11:00:00Z" }),
      item({ id: "velho", mensagem: "velho", criado_em: "2026-07-14T09:00:00Z" }),
    ];
    render(<Slideshow itensIniciais={itens} config={config} assinar={() => () => {}} />);

    // ordem=recentes → começa no "novo".
    expect(screen.getByRole("img", { name: "novo" })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(screen.getByRole("img", { name: "velho" })).toBeInTheDocument();
  });
});
