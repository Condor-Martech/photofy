// PHF-060 — Acesso a dados da galeria pública.
// A montagem é orquestrada a partir de um fetcher injetável (BuscarBrutos),
// então a lógica é testável sem Supabase. A query real fica isolada e diferida.

import {
  ItemGaleria,
  MediaItemBruto,
  Paginacao,
  TAMANHO_PAGINA,
  apenasAprovados,
  calcularPaginacao,
  normalizarPagina,
  paraItemGaleria,
} from "./galeria";

export type ResultadoGaleria = {
  itens: ItemGaleria[];
  paginacao: Paginacao;
};

// Recorte cru de uma página + total de aprovados (para o contador).
export type PaginaBruta = { brutos: MediaItemBruto[]; total: number };

export type BuscarBrutos = (offset: number, limite: number) => Promise<PaginaBruta>;

export async function montarResultadoGaleria(
  buscar: BuscarBrutos,
  pagina: number,
  tamanho: number = TAMANHO_PAGINA,
): Promise<ResultadoGaleria> {
  const solicitada = normalizarPagina(pagina);
  const { brutos, total } = await buscar((solicitada - 1) * tamanho, tamanho);
  const paginacao = calcularPaginacao(total, solicitada, tamanho);
  const itens = apenasAprovados(brutos).map(paraItemGaleria);
  return { itens, paginacao };
}

export async function buscarGaleriaAprovada(
  slug: string,
  pagina: number,
): Promise<ResultadoGaleria> {
  return montarResultadoGaleria(
    (offset, limite) => buscarBrutosAprovados(slug, offset, limite),
    pagina,
  );
}

// ponytail: fonte real entra quando o Supabase estiver provisionado (PHF-010/012),
// mesmo padrão de deferimento do formulário de upload (PHF-021). O RLS de PHF-011 já
// garante que o cliente anônimo só enxerga status='aprovado' — mesmo assim filtramos
// explicitamente por defesa em profundidade. Query pretendida (cliente anon):
//   supabase
//     .from("media_items")
//     .select(
//       "id,tipo,status,autor,mensagem,url_processada,url_thumb,url_original",
//       { count: "exact" },
//     )
//     .eq("event_id", <id do evento resolvido pelo slug em `events`>)
//     .eq("status", "aprovado")
//     .order("criado_em", { ascending: false })
//     .range(offset, offset + limite - 1);
//   return { brutos: data ?? [], total: count ?? 0 };
async function buscarBrutosAprovados(
  _slug: string,
  _offset: number,
  _limite: number,
): Promise<PaginaBruta> {
  return { brutos: [], total: 0 };
}
