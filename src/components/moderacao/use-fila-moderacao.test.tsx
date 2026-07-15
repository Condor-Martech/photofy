import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AssinarFila, EventoFila, ItemMidia } from "@/lib/moderacao/tipos";
import { useFilaModeracao } from "./use-fila-moderacao";

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
    criado_em: "2026-07-14T00:00:00.000Z",
    ...over,
  };
}

// Fake da porta: captura o callback para o teste empurrar eventos manualmente,
// e expõe o cancelamento para verificar cleanup.
function fakeAssinatura() {
  const cancelar = vi.fn();
  let emitir: ((e: EventoFila) => void) | undefined;
  const assinar: AssinarFila = (aoReceber) => {
    emitir = aoReceber;
    return cancelar;
  };
  return {
    assinar,
    cancelar,
    emitir: (e: EventoFila) => act(() => emitir!(e)),
  };
}

describe("useFilaModeracao — lista em tempo real (PHF-040)", () => {
  it("um insert em tempo real faz o item aparecer e sobe o badge de pendentes", () => {
    const canal = fakeAssinatura();
    const { result } = renderHook(() => useFilaModeracao([], canal.assinar));

    expect(result.current.itens).toHaveLength(0);
    expect(result.current.pendentes).toBe(0);

    canal.emitir({ tipo: "insert", item: item({ id: "novo" }) });

    expect(result.current.itens).toHaveLength(1);
    expect(result.current.pendentes).toBe(1);
  });

  it("aprovar (update para aprovado) reflete na hora e zera o badge", () => {
    const canal = fakeAssinatura();
    const { result } = renderHook(() =>
      useFilaModeracao([item({ id: "x", status: "pendente" })], canal.assinar),
    );
    expect(result.current.pendentes).toBe(1);

    canal.emitir({ tipo: "update", item: item({ id: "x", status: "aprovado" }) });

    expect(result.current.pendentes).toBe(0);
    expect(result.current.itens[0].status).toBe("aprovado");
  });

  it("cancela a assinatura ao desmontar", () => {
    const canal = fakeAssinatura();
    const { unmount } = renderHook(() => useFilaModeracao([], canal.assinar));
    unmount();
    expect(canal.cancelar).toHaveBeenCalledOnce();
  });
});
