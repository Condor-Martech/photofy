import { describe, expect, it } from "vitest";
import { DepsDecisao, responderDecisao } from "./handler";
import { PortaExclusao } from "./executar";
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

function deps(
  over: {
    solicitacao?: SolicitacaoExclusao | null;
    organizador?: string | null;
  } = {},
): { deps: DepsDecisao; aplicadas: MutacaoExclusao[] } {
  const aplicadas: MutacaoExclusao[] = [];
  const porta: PortaExclusao = {
    buscarSolicitacao: async () =>
      "solicitacao" in over ? over.solicitacao ?? null : pendente(),
    aplicar: async (m) => {
      aplicadas.push(m);
    },
  };
  return {
    aplicadas,
    deps: {
      porta,
      resolverOrganizador: async () =>
        "organizador" in over ? over.organizador ?? null : "org-1",
    },
  };
}

describe("responderDecisao", () => {
  it("200 ao executar: aplica e resume a mutação", async () => {
    const { deps: d, aplicadas } = deps();

    const r = await responderDecisao(d, "sol-1", { decisao: "executar", motivo: "abuso" });

    expect(r.status).toBe(200);
    expect(r.corpo).toMatchObject({
      solicitacao_id: "sol-1",
      status: "executada",
      media_removida: true,
      acao_auditoria: "excluir",
    });
    expect(aplicadas).toHaveLength(1);
  });

  it("400 quando o corpo é inválido", async () => {
    const { deps: d, aplicadas } = deps();
    const r = await responderDecisao(d, "sol-1", { decisao: "apagar" });
    expect(r.status).toBe(400);
    expect(aplicadas).toHaveLength(0);
  });

  it("401 quando não há organizador autenticado (nenhuma exclusão ocorre)", async () => {
    const { deps: d, aplicadas } = deps({ organizador: null });
    const r = await responderDecisao(d, "sol-1", { decisao: "executar" });
    expect(r.status).toBe(401);
    expect(aplicadas).toHaveLength(0);
  });

  it("404 quando a solicitação não existe", async () => {
    const { deps: d } = deps({ solicitacao: null });
    const r = await responderDecisao(d, "sumida", { decisao: "executar" });
    expect(r.status).toBe(404);
  });

  it("409 quando a solicitação já foi resolvida", async () => {
    const { deps: d } = deps({ solicitacao: { ...pendente(), status: "executada" } });
    const r = await responderDecisao(d, "sol-1", { decisao: "executar" });
    expect(r.status).toBe(409);
  });
});
