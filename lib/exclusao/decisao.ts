import {
  Decisao,
  MutacaoExclusao,
  SolicitacaoExclusao,
  STATUS_MIDIA_EXCLUIDO,
} from "./tipos";

// Só uma solicitação 'pendente' pode ser decidida. Reexecutar/renegar uma já
// resolvida é bloqueado — evita excluir mídia duas vezes ou reescrever auditoria
// (idempotência do lado do domínio; o banco reforça com a mesma checagem).
export class SolicitacaoNaoPendenteError extends Error {
  constructor(
    public readonly id: string,
    public readonly status: string,
  ) {
    super(`Solicitação ${id} não está pendente (status atual: ${status}).`);
    this.name = "SolicitacaoNaoPendenteError";
  }
}

function normalizarMotivo(motivo?: string | null): string | null {
  const t = motivo?.trim();
  return t ? t : null;
}

/**
 * Núcleo puro da decisão do organizador (PHF-063). Não toca I/O: recebe a
 * solicitação e devolve as mutações a aplicar atomicamente (ver executar.ts).
 *
 * Gherkin §5 "Organizador executa uma solicitação de exclusão":
 *   executar → mídia vira 'excluido' (some da galeria e do telão) e a solicitação
 *   vira 'executada', com registro de auditoria (moderation_log, acao='excluir').
 *   negar → a solicitação vira 'negada', a mídia permanece aprovada na galeria,
 *   e a negativa também é auditada (acao='negar_exclusao').
 */
export function decidirExclusao(
  solicitacao: SolicitacaoExclusao,
  decisao: Decisao,
  organizadorId: string,
  motivo?: string | null,
): MutacaoExclusao {
  if (solicitacao.status !== "pendente") {
    throw new SolicitacaoNaoPendenteError(solicitacao.id, solicitacao.status);
  }

  const motivoNorm = normalizarMotivo(motivo);
  const base = { solicitacao_id: solicitacao.id, media_id: solicitacao.media_id };

  if (decisao === "executar") {
    return {
      ...base,
      novo_status_solicitacao: "executada",
      novo_status_midia: STATUS_MIDIA_EXCLUIDO,
      auditoria: {
        media_id: solicitacao.media_id,
        moderador_id: organizadorId,
        acao: "excluir",
        motivo: motivoNorm,
      },
    };
  }

  return {
    ...base,
    novo_status_solicitacao: "negada",
    novo_status_midia: null,
    auditoria: {
      media_id: solicitacao.media_id,
      moderador_id: organizadorId,
      acao: "negar_exclusao",
      motivo: motivoNorm,
    },
  };
}
