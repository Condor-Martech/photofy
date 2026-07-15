"use client";

import { useEffect, useState } from "react";

// Prévia do álbum embutida na tela de upload (PHF-061). Consome o mesmo contrato
// de GET /api/eventos/:slug/galeria (02-spec.md §4), que já devolve APENAS itens
// aprovados — o bloco nunca decide o que é público, só reflete o que a galeria expõe.
// A execução real do endpoint é PHF-060; aqui degradamos para o estado vazio quando
// ele ainda não existe, sem quebrar a tela de upload.

export const PREVIEW_MAX = 8;

export type AlbumItem = {
  id: string;
  tipo: "foto" | "reel";
  autor?: string | null;
  url_thumb?: string | null;
};

function extrairItens(data: unknown): AlbumItem[] {
  if (Array.isArray(data)) return data as AlbumItem[];
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: AlbumItem[] }).items;
  }
  return [];
}

export default function AlbumAoVivo({ slug }: { slug: string }) {
  const [itens, setItens] = useState<AlbumItem[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/eventos/${slug}/galeria`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setItens(extrairItens(data).slice(0, PREVIEW_MAX)))
      .catch(() => {
        // Endpoint ausente (PHF-060) ou rede instável: mantém o estado vazio.
      });
    return () => controller.abort();
  }, [slug]);

  return (
    <section aria-label="Álbum ao vivo" className="mx-auto max-w-md p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Álbum ao vivo</h2>
        <a href={`/evento/${slug}/galeria`} className="text-sm underline">
          Ver galeria completa
        </a>
      </div>

      {itens.length === 0 ? (
        <p className="text-sm text-neutral-500">
          As fotos e reels aprovados aparecem aqui assim que forem publicados.
        </p>
      ) : (
        <ul className="grid grid-cols-4 gap-2">
          {itens.map((item) => (
            <li key={item.id} className="aspect-square overflow-hidden rounded bg-neutral-100">
              {item.url_thumb ? (
                // eslint-disable-next-line @next/next/no-img-element -- next/image exige remotePatterns do bucket Supabase, que só é provisionado em PHF-010/012.
                <img
                  src={item.url_thumb}
                  alt={item.autor ? `Envio de ${item.autor}` : "Item do álbum"}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
