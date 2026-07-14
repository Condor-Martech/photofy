import type {
  EventoSlideshow,
  ItemMidia,
  OrdemSlideshow,
  SlideshowConfig,
} from "./tipos";

// Núcleo do slideshow (PHF-051), puro e testável sem Supabase. Decide o que
// entra na rotação (só aprovados, respeitando incluir_reels) e em que ordem.

// Um item só entra no telão se está aprovado — regra de moderação: nada
// pendente/reprovado aparece (02-spec.md §5, "exibe apenas conteúdo aprovado").
function elegivel(item: ItemMidia, config: SlideshowConfig): boolean {
  if (item.status !== "aprovado") return false;
  if (item.tipo === "reel" && !config.incluir_reels) return false;
  return true;
}

function ordenar(itens: ItemMidia[], ordem: OrdemSlideshow): ItemMidia[] {
  const copia = [...itens];
  switch (ordem) {
    case "cronologica":
      return copia.sort((a, b) => a.criado_em.localeCompare(b.criado_em));
    case "recentes":
      return copia.sort((a, b) => b.criado_em.localeCompare(a.criado_em));
    case "aleatoria":
      // Fisher-Yates. ponytail: Math.random basta para embaralhar o telão;
      // trocar por PRNG seedado só se QA precisar de ordem reproduzível.
      for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
      }
      return copia;
  }
}

// Constrói a rotação a partir do estado bruto de media_items + config.
export function construirRotacao(
  itens: ItemMidia[],
  config: SlideshowConfig,
): ItemMidia[] {
  return ordenar(
    itens.filter((item) => elegivel(item, config)),
    config.ordem,
  );
}

// Reducer de Realtime: aplica um evento à lista BRUTA de itens e devolve a nova
// lista bruta. A rotação (filtro + ordem) é derivada com construirRotacao — assim
// um item que passa de pendente→aprovado (update) entra na rotação sem reload, e
// um delete/reprovação some. insert/update por id são idempotentes.
export function aplicarEvento(
  itens: ItemMidia[],
  evento: EventoSlideshow,
): ItemMidia[] {
  switch (evento.tipo) {
    case "delete":
      return itens.filter((item) => item.id !== evento.id);
    case "insert":
    case "update": {
      const existe = itens.some((item) => item.id === evento.item.id);
      return existe
        ? itens.map((item) => (item.id === evento.item.id ? evento.item : item))
        : [...itens, evento.item];
    }
  }
}

// Próximo índice da rotação. Com loop, dá a volta; sem loop, trava no último.
// Chamado a cada seg_por_slide (o timer vive no hook, não aqui).
export function proximoIndice(
  indiceAtual: number,
  total: number,
  loop: boolean,
): number {
  if (total === 0) return 0;
  const proximo = indiceAtual + 1;
  if (proximo < total) return proximo;
  return loop ? 0 : total - 1;
}
