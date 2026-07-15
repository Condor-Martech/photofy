import { interpretarCorpoDecisao } from "./corpo";
import { SolicitacaoNaoPendenteError } from "./decisao";
import {
  PortaExclusao,
  processarDecisao,
  SolicitacaoNaoEncontradaError,
} from "./executar";
import { MutacaoExclusao } from "./tipos";

export interface RespostaDecisao {
  status: number;
  corpo: Record<string, unknown>;
}

export interface DepsDecisao {
  porta: PortaExclusao;
  // Resolve o organizador autenticado a partir da sessão (Supabase Auth).
  // NUNCA confiar em id vindo do corpo da requisição. null = não autenticado.
  resolverOrganizador: () => Promise<string | null>;
}

// Lógica do endpoint independente do framework (Request/Response), para ser
// testável com uma porta falsa. route.ts só adapta Request <-> isto.
export async function responderDecisao(
  deps: DepsDecisao,
  solicitacaoId: string,
  corpoBruto: unknown,
): Promise<RespostaDecisao> {
  const parsed = interpretarCorpoDecisao(corpoBruto);
  if (!parsed.ok) return { status: 400, corpo: { erro: parsed.erro } };

  const organizadorId = await deps.resolverOrganizador();
  if (!organizadorId) {
    return { status: 401, corpo: { erro: "Organizador não autenticado." } };
  }

  try {
    const mutacao = await processarDecisao(
      deps.porta,
      solicitacaoId,
      parsed.decisao,
      organizadorId,
      parsed.motivo,
    );
    return { status: 200, corpo: resumo(mutacao) };
  } catch (e) {
    if (e instanceof SolicitacaoNaoEncontradaError) {
      return { status: 404, corpo: { erro: e.message } };
    }
    if (e instanceof SolicitacaoNaoPendenteError) {
      return { status: 409, corpo: { erro: e.message } };
    }
    throw e;
  }
}

function resumo(m: MutacaoExclusao): Record<string, unknown> {
  return {
    solicitacao_id: m.solicitacao_id,
    status: m.novo_status_solicitacao,
    media_id: m.media_id,
    media_removida: m.novo_status_midia !== null,
    acao_auditoria: m.auditoria.acao,
  };
}
