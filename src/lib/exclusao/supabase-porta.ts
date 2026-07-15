import { MutacaoExclusao, SolicitacaoExclusao } from "./tipos";
import { PortaExclusao } from "./executar";

// PHF-063 — Adaptador real da PortaExclusao + resolução do organizador.
// Diferido até o Supabase estar provisionado/wire-up (mesmo deferimento da
// galeria PHF-060 e do upload PHF-021). Enquanto não implementado, o endpoint
// falha seguro: resolverOrganizador() devolve null → 401 e nenhuma exclusão
// acontece. A regra é dura: mídia só sai da galeria via este fluxo auditado.
//
// A aplicação PRECISA ser atômica — mídia, solicitação e auditoria mudam juntas
// ou nada muda. A RPC (função SQL security definer) que garante isso já está
// commitada: supabase/migrations/20260714130000_phf063_executar_deletion_request.sql
// (com trava FOR UPDATE, guarda de "pendente" e least-privilege para service_role).
//
// Wire-up pendente (aguarda provisionamento do Supabase, mesmo deferimento da galeria
// PHF-060 e do upload PHF-021): buscarSolicitacao faz um select em deletion_request e
// aplicar chama client.rpc('executar_deletion_request', { p_solicitacao, p_decisao,
// p_organizador, p_motivo }) — 'executar' quando novo_status_midia != null, senão 'negar'.

const NAO_IMPLEMENTADA =
  "PortaExclusao Supabase não implementada (PHF-063 aguarda wire-up do Supabase).";

export function criarPortaSupabase(): PortaExclusao {
  return {
    async buscarSolicitacao(_id: string): Promise<SolicitacaoExclusao | null> {
      throw new Error(NAO_IMPLEMENTADA);
    },
    async aplicar(_mutacao: MutacaoExclusao): Promise<void> {
      throw new Error(NAO_IMPLEMENTADA);
    },
  };
}

// Resolve o organizador da sessão Supabase Auth (server-side). Diferido: por ora
// devolve null (401), garantindo que nenhuma exclusão ocorra sem o wire-up de auth.
export async function resolverOrganizador(): Promise<string | null> {
  return null;
}
