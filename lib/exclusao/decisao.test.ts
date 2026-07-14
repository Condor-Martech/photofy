// Cobre o cenário Gherkin de 02-spec.md §5 (Feature: Galeria permanente e
// exclusão sob solicitação) — "Organizador executa uma solicitação de exclusão"
// — além da negativa e da guarda de idempotência.
import { describe, expect, it } from "vitest";
import { decidirExclusao, SolicitacaoNaoPendenteError } from "./decisao";
import { SolicitacaoExclusao, STATUS_MIDIA_EXCLUIDO } from "./tipos";

const ORGANIZADOR = "org-1";

function solicitacao(over: Partial<SolicitacaoExclusao> = {}): SolicitacaoExclusao {
  return {
    id: "sol-1",
    media_id: "media-1",
    solicitante: "Ana",
    motivo: "Quero remover minha foto.",
    status: "pendente",
    timestamp: "2026-07-14T00:00:00Z",
    ...over,
  };
}

describe("decidirExclusao — executar", () => {
  // Given uma deletion_request com status "pendente"
  // When o organizador aprova e executa a exclusão
  // Then o media_item deixa de aparecer na galeria e no telão
  // And a deletion_request muda para status "executada" com registro de auditoria
  it("marca a solicitação como executada e a mídia como excluida", () => {
    const m = decidirExclusao(solicitacao(), "executar", ORGANIZADOR, "abuso");

    expect(m.solicitacao_id).toBe("sol-1");
    expect(m.novo_status_solicitacao).toBe("executada");
    expect(m.media_id).toBe("media-1");
    // 'excluido' != 'aprovado' → some da galeria (PHF-060) e do telão (PHF-051).
    expect(m.novo_status_midia).toBe(STATUS_MIDIA_EXCLUIDO);
  });

  it("gera registro de auditoria com organizador, ação e motivo", () => {
    const m = decidirExclusao(solicitacao(), "executar", ORGANIZADOR, "abuso");

    expect(m.auditoria).toEqual({
      media_id: "media-1",
      moderador_id: ORGANIZADOR,
      acao: "excluir",
      motivo: "abuso",
    });
  });

  it("normaliza motivo vazio/espacos para null", () => {
    expect(decidirExclusao(solicitacao(), "executar", ORGANIZADOR, "   ").auditoria.motivo).toBeNull();
    expect(decidirExclusao(solicitacao(), "executar", ORGANIZADOR).auditoria.motivo).toBeNull();
  });
});

describe("decidirExclusao — negar", () => {
  it("marca a solicitação como negada e NÃO mexe na mídia (segue na galeria)", () => {
    const m = decidirExclusao(solicitacao(), "negar", ORGANIZADOR, "sem base");

    expect(m.novo_status_solicitacao).toBe("negada");
    expect(m.novo_status_midia).toBeNull();
    expect(m.auditoria.acao).toBe("negar_exclusao");
    expect(m.auditoria.moderador_id).toBe(ORGANIZADOR);
  });
});

describe("decidirExclusao — guarda de estado", () => {
  it.each(["executada", "negada"] as const)(
    "recusa decidir uma solicitação já %s (não reexecuta nem reescreve auditoria)",
    (status) => {
      expect(() =>
        decidirExclusao(solicitacao({ status }), "executar", ORGANIZADOR),
      ).toThrow(SolicitacaoNaoPendenteError);
    },
  );
});
