import { MutacaoExclusao, SolicitacaoExclusao } from "./tipos";
import { PortaExclusao } from "./executar";

// PHF-063 — Adaptador real da PortaExclusao + resolução do organizador.
// Diferido até o Supabase estar provisionado/wire-up (mesmo deferimento da
// galeria PHF-060 e do upload PHF-021). Enquanto não implementado, o endpoint
// falha seguro: resolverOrganizador() devolve null → 401 e nenhuma exclusão
// acontece. A regra é dura: mídia só sai da galeria via este fluxo auditado.
//
// A aplicação PRECISA ser atômica — mídia, solicitação e auditoria mudam juntas
// ou nada muda. Daí uma RPC (função SQL security definer) e não 3 writes soltos
// do cliente. Migração pertence ao dono do painel do organizador (Epic 7 / PHF-073).
//
// RPC pretendida:
//   create function executar_deletion_request(
//     p_solicitacao uuid, p_decisao text, p_organizador uuid, p_motivo text
//   ) returns void language plpgsql security definer as $$
//   begin
//     if p_decisao = 'executar' then
//       update media_items set status = 'excluido'
//         where id = (select media_id from deletion_request where id = p_solicitacao);
//       update deletion_request set status = 'executada' where id = p_solicitacao;
//       insert into moderation_log (media_id, moderador_id, acao, motivo)
//         select media_id, p_organizador, 'excluir', p_motivo
//         from deletion_request where id = p_solicitacao;
//     else
//       update deletion_request set status = 'negada' where id = p_solicitacao;
//       insert into moderation_log (media_id, moderador_id, acao, motivo)
//         select media_id, p_organizador, 'negar_exclusao', p_motivo
//         from deletion_request where id = p_solicitacao;
//     end if;
//   end $$;

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
