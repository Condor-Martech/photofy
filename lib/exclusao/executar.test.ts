import { describe, expect, it, vi } from "vitest";
import {
  PortaExclusao,
  processarDecisao,
  SolicitacaoNaoEncontradaError,
} from "./executar";
import { SolicitacaoNaoPendenteError } from "./decisao";
import { MutacaoExclusao, SolicitacaoExclusao } from "./tipos";

function pendente(): SolicitacaoExclusao {
  return {
    id: "sol-1",
    media_id: "media-1",
    solicitante: "Ana",
    motivo: null,
    status: "pendente",
    timestamp: "2026-07-14T00:00:00Z",
  };
}

function portaFake(
  solicitacao: SolicitacaoExclusao | null,
): { porta: PortaExclusao; aplicadas: MutacaoExclusao[] } {
  const aplicadas: MutacaoExclusao[] = [];
  return {
    aplicadas,
    porta: {
      buscarSolicitacao: async () => solicitacao,
      aplicar: async (m) => {
        aplicadas.push(m);
      },
    },
  };
}

describe("processarDecisao", () => {
  it("aplica a mutação de execução e a devolve", async () => {
    const { porta, aplicadas } = portaFake(pendente());

    const m = await processarDecisao(porta, "sol-1", "executar", "org-1", "abuso");

    expect(aplicadas).toHaveLength(1);
    expect(aplicadas[0]).toBe(m);
    expect(m.novo_status_solicitacao).toBe("executada");
    expect(m.novo_status_midia).toBe("excluido");
  });

  it("lança SolicitacaoNaoEncontradaError e NÃO aplica nada quando não existe", async () => {
    const { porta, aplicadas } = portaFake(null);
    const aplicar = vi.spyOn(porta, "aplicar");

    await expect(
      processarDecisao(porta, "inexistente", "executar", "org-1"),
    ).rejects.toBeInstanceOf(SolicitacaoNaoEncontradaError);
    expect(aplicar).not.toHaveBeenCalled();
    expect(aplicadas).toHaveLength(0);
  });

  it("propaga SolicitacaoNaoPendenteError sem aplicar quando já resolvida", async () => {
    const { porta, aplicadas } = portaFake({ ...pendente(), status: "executada" });

    await expect(
      processarDecisao(porta, "sol-1", "executar", "org-1"),
    ).rejects.toBeInstanceOf(SolicitacaoNaoPendenteError);
    expect(aplicadas).toHaveLength(0);
  });
});
