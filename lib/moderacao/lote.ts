import { acoesDisponiveis } from "./decisao";
import type { AcaoModeracao, ItemMidia } from "./tipos";

// Ações oferecidas para uma seleção em lote (PHF-042). Uma ação só é ofertada se
// for válida para TODOS os itens selecionados — assim o moderador nunca dispara
// uma ação que silenciosamente pula parte da seleção (a RPC de lote é atômica:
// uma transição inválida derrubaria o lote inteiro). Seleção vazia = nenhuma ação.
//
// Ex.: só pendentes selecionados → ["aprovar", "reprovar"]; só aprovados →
// ["reverter"]; mistura de pendente + aprovado → [] (sem ação comum).
export function acoesLoteDisponiveis(selecionados: ItemMidia[]): AcaoModeracao[] {
  if (selecionados.length === 0) return [];
  return selecionados
    .map((item) => acoesDisponiveis(item.status))
    .reduce((comuns, acoes) => comuns.filter((acao) => acoes.includes(acao)));
}
