import type { AcaoModeracao, StatusMidia } from "./tipos";

// Máquina de transições de moderação (PHF-041), espelhada pela função Postgres
// registrar_decisao_moderacao. Fonte única da verdade para o que a UI oferece e
// para o que o servidor aceita — cobre o Gherkin "Moderação em tempo real" (§5):
//   aprovar/reprovar partem de "pendente"; reverter desfaz uma decisão de volta a
//   "pendente". "erro" não é moderável (reprocessamento manual, PHF-033).
const TRANSICOES: Record<AcaoModeracao, { de: StatusMidia[]; para: StatusMidia }> = {
  aprovar: { de: ["pendente"], para: "aprovado" },
  reprovar: { de: ["pendente"], para: "reprovado" },
  reverter: { de: ["aprovado", "reprovado"], para: "pendente" },
};

export function transicaoValida(acao: AcaoModeracao, atual: StatusMidia): boolean {
  return TRANSICOES[acao].de.includes(atual);
}

export function statusApos(acao: AcaoModeracao, atual: StatusMidia): StatusMidia {
  if (!transicaoValida(acao, atual)) {
    throw new Error(`Transição inválida: não é possível ${acao} um item ${atual}.`);
  }
  return TRANSICOES[acao].para;
}

// Ações oferecidas para um item conforme seu status atual — dirige os botões da fila.
export function acoesDisponiveis(atual: StatusMidia): AcaoModeracao[] {
  return (Object.keys(TRANSICOES) as AcaoModeracao[]).filter((acao) =>
    transicaoValida(acao, atual),
  );
}
