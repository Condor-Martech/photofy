import type { EventoFila, ItemMidia } from "./tipos";

// Badge de pendentes (PHF-040): quantos itens aguardam decisão do moderador.
export function contarPendentes(itens: ItemMidia[]): number {
  return itens.reduce((total, item) => total + (item.status === "pendente" ? 1 : 0), 0);
}

// Ordem da fila: pendentes primeiro (prioridade de moderação), depois mais recentes.
export function ordenarFila(itens: ItemMidia[]): ItemMidia[] {
  return [...itens].sort((a, b) => {
    const prioA = a.status === "pendente" ? 0 : 1;
    const prioB = b.status === "pendente" ? 0 : 1;
    if (prioA !== prioB) return prioA - prioB;
    return b.criado_em.localeCompare(a.criado_em);
  });
}

// Reducer de Realtime: aplica um evento à lista e devolve uma nova lista ordenada.
// insert/update por id são idempotentes (o mesmo evento reentregue não duplica).
export function aplicarEvento(itens: ItemMidia[], evento: EventoFila): ItemMidia[] {
  switch (evento.tipo) {
    case "delete":
      return ordenarFila(itens.filter((item) => item.id !== evento.id));
    case "insert":
    case "update": {
      const existe = itens.some((item) => item.id === evento.item.id);
      const proximos = existe
        ? itens.map((item) => (item.id === evento.item.id ? evento.item : item))
        : [...itens, evento.item];
      return ordenarFila(proximos);
    }
  }
}
