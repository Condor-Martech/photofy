// PHF-060 — Domínio da galeria pública (02-spec.md §5 "Galeria permanente e exclusão").
// Puro: sem React nem Supabase, para ser testável de forma determinística.

export type TipoMedia = "foto" | "reel";
export type StatusMedia = "pendente" | "aprovado" | "reprovado" | "erro";

// Linha crua de media_items relevante para a galeria pública.
export type MediaItemBruto = {
  id: string;
  tipo: TipoMedia;
  status: StatusMedia;
  autor: string | null;
  mensagem: string | null;
  url_processada: string | null;
  url_thumb: string | null;
  url_original: string;
};

// Item já saneado para exibição pública — sem status nem PII de moderação.
export type ItemGaleria = {
  id: string;
  tipo: TipoMedia;
  autor: string | null;
  mensagem: string | null;
  url: string;
  urlThumb: string | null;
};

export type Paginacao = {
  pagina: number;
  tamanho: number;
  total: number;
  totalPaginas: number;
  temAnterior: boolean;
  temProxima: boolean;
  offset: number;
};

export const TAMANHO_PAGINA = 24;

// Regra de domínio inegociável (CLAUDE.md): a galeria pública só expõe 'aprovado'.
// Reforço em app-layer além do RLS de PHF-011 (defesa em profundidade).
export function apenasAprovados(brutos: MediaItemBruto[]): MediaItemBruto[] {
  return brutos.filter((m) => m.status === "aprovado");
}

export function paraItemGaleria(bruto: MediaItemBruto): ItemGaleria {
  return {
    id: bruto.id,
    tipo: bruto.tipo,
    autor: bruto.autor,
    mensagem: bruto.mensagem,
    url: bruto.url_processada ?? bruto.url_original,
    urlThumb: bruto.url_thumb,
  };
}

export function normalizarPagina(valor: unknown): number {
  const n = Number(Array.isArray(valor) ? valor[0] : valor);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

export function calcularPaginacao(
  total: number,
  pagina: number,
  tamanho: number = TAMANHO_PAGINA,
): Paginacao {
  const totalSeguro = Math.max(0, Math.floor(total));
  const tam = Math.max(1, Math.floor(tamanho));
  const totalPaginas = Math.max(1, Math.ceil(totalSeguro / tam));
  const paginaClamp = Math.min(Math.max(1, Math.floor(pagina)), totalPaginas);
  return {
    pagina: paginaClamp,
    tamanho: tam,
    total: totalSeguro,
    totalPaginas,
    temAnterior: paginaClamp > 1,
    temProxima: paginaClamp < totalPaginas,
    offset: (paginaClamp - 1) * tam,
  };
}
