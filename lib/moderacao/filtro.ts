import type { FiltroStatus, ItemMidia, StatusMidia } from "./tipos";

// Ordem dos filtros na barra (PHF-042). "todos" primeiro; depois o ciclo natural
// de moderação. Fonte única para a UI e para os testes de contagem.
export const FILTROS_STATUS: FiltroStatus[] = [
  "todos",
  "pendente",
  "aprovado",
  "reprovado",
  "erro",
];

// Filtra a fila por status (PHF-042). "todos" devolve a lista intacta (mesma
// referência) — a ordenação já foi feita por ordenarFila, aqui só se recorta.
export function filtrarPorStatus(
  itens: ItemMidia[],
  filtro: FiltroStatus,
): ItemMidia[] {
  if (filtro === "todos") return itens;
  return itens.filter((item) => item.status === filtro);
}

// Contagem por status para os rótulos dos filtros (ex.: "Pendente 12"). "todos"
// recebe o total. Uma única passada pela lista.
export function contarPorStatus(
  itens: ItemMidia[],
): Record<FiltroStatus, number> {
  const contagem: Record<FiltroStatus, number> = {
    todos: itens.length,
    pendente: 0,
    aprovado: 0,
    reprovado: 0,
    erro: 0,
  };
  for (const item of itens) {
    contagem[item.status as StatusMidia] += 1;
  }
  return contagem;
}
