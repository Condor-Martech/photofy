import Link from "next/link";
import type { ItemGaleria, Paginacao } from "@/lib/galeria/galeria";

// Apresentacional e síncrono (sem fetch) para ser testável direto com testing-library.
// Mobile-first (CLAUDE.md / SPEC §1.1): grid arranca em 2 colunas no menor breakpoint.
export default function GaleriaConteudo({
  slug,
  itens,
  paginacao,
}: {
  slug: string;
  itens: ItemGaleria[];
  paginacao: Paginacao;
}) {
  const { total, pagina, totalPaginas, temAnterior, temProxima } = paginacao;

  return (
    <main className="mx-auto max-w-5xl p-4">
      <header className="mb-4 flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Galeria do evento</h1>
        <p className="text-sm text-neutral-500" aria-live="polite">
          {total} {total === 1 ? "item aprovado" : "itens aprovados"}
        </p>
      </header>

      {total === 0 ? (
        <p className="py-16 text-center text-neutral-500">
          Ainda não há fotos ou reels publicados neste evento.
        </p>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {itens.map((item) => (
              <li key={item.id} className="overflow-hidden rounded bg-neutral-100">
                <figure className="m-0">
                  {item.tipo === "reel" ? (
                    <video
                      src={item.url}
                      poster={item.urlThumb ?? undefined}
                      controls
                      playsInline
                      preload="none"
                      className="aspect-square w-full object-cover"
                      aria-label={rotulo("Reel", item.autor)}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.urlThumb ?? item.url}
                      alt={rotulo("Foto", item.autor)}
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                  )}
                  {(item.autor || item.mensagem) && (
                    <figcaption className="p-2 text-xs text-neutral-600">
                      {item.autor && <span className="font-medium">{item.autor}</span>}
                      {item.autor && item.mensagem && " — "}
                      {item.mensagem}
                    </figcaption>
                  )}
                </figure>
              </li>
            ))}
          </ul>

          {totalPaginas > 1 && (
            <nav
              className="mt-6 flex items-center justify-between"
              aria-label="Paginação da galeria"
            >
              <ControlePagina
                slug={slug}
                pagina={pagina - 1}
                habilitado={temAnterior}
                rotulo="Anterior"
              />
              <span className="text-sm text-neutral-500">
                Página {pagina} de {totalPaginas}
              </span>
              <ControlePagina
                slug={slug}
                pagina={pagina + 1}
                habilitado={temProxima}
                rotulo="Próxima"
              />
            </nav>
          )}
        </>
      )}
    </main>
  );
}

function rotulo(tipo: string, autor: string | null): string {
  return autor ? `${tipo} de ${autor}` : `${tipo} do evento`;
}

function ControlePagina({
  slug,
  pagina,
  habilitado,
  rotulo,
}: {
  slug: string;
  pagina: number;
  habilitado: boolean;
  rotulo: string;
}) {
  const classe = "rounded border px-3 py-2 text-sm";
  if (!habilitado) {
    return (
      <span className={`${classe} text-neutral-300`} aria-disabled="true">
        {rotulo}
      </span>
    );
  }
  return (
    <Link className={classe} href={`/evento/${slug}/galeria?pagina=${pagina}`}>
      {rotulo}
    </Link>
  );
}
