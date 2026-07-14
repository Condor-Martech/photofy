import { buscarGaleriaAprovada } from "@/lib/galeria/buscar-galeria";
import { normalizarPagina } from "@/lib/galeria/galeria";
import GaleriaConteudo from "./galeria-conteudo";

// PHF-060 — Galeria pública paginada, apenas itens aprovados (02-spec.md §5).
// Rota pública sem login: a leitura anônima de aprovados é garantida pelo RLS (PHF-011).
export default async function GaleriaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ pagina?: string | string[] }>;
}) {
  const { slug } = await params;
  const pagina = normalizarPagina((await searchParams).pagina);
  const { itens, paginacao } = await buscarGaleriaAprovada(slug, pagina);

  return <GaleriaConteudo slug={slug} itens={itens} paginacao={paginacao} />;
}
