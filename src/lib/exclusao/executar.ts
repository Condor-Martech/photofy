import { decidirExclusao } from "./decisao";
import { Decisao, MutacaoExclusao, SolicitacaoExclusao } from "./tipos";

export class SolicitacaoNaoEncontradaError extends Error {
  constructor(public readonly id: string) {
    super(`Solicitação de exclusão ${id} não encontrada.`);
    this.name = "SolicitacaoNaoEncontradaError";
  }
}

// Porta de persistência (inversão de dependência): mantém a orquestração
// testável sem Supabase real. O adaptador concreto fica em supabase-porta.ts
// (diferido, mesmo padrão da galeria PHF-060 e do upload PHF-021).
export interface PortaExclusao {
  buscarSolicitacao(id: string): Promise<SolicitacaoExclusao | null>;
  // Aplica media_items.status, deletion_request.status e o insert em
  // moderation_log de forma ATÔMICA (uma transação/RPC no adaptador real):
  // ou a mídia some e a auditoria fica registrada juntas, ou nada muda.
  aplicar(mutacao: MutacaoExclusao): Promise<void>;
}

export async function processarDecisao(
  porta: PortaExclusao,
  solicitacaoId: string,
  decisao: Decisao,
  organizadorId: string,
  motivo?: string | null,
): Promise<MutacaoExclusao> {
  const solicitacao = await porta.buscarSolicitacao(solicitacaoId);
  if (!solicitacao) throw new SolicitacaoNaoEncontradaError(solicitacaoId);

  const mutacao = decidirExclusao(solicitacao, decisao, organizadorId, motivo);
  await porta.aplicar(mutacao);
  return mutacao;
}
