"use client";

import { useSlideshow } from "./use-slideshow";
import type {
  AssinarSlideshow,
  ItemMidia,
  SlideshowConfig,
} from "@/lib/slideshow/tipos";

interface SlideshowProps {
  itensIniciais: ItemMidia[];
  config: SlideshowConfig;
  assinar: AssinarSlideshow;
  backgroundUrl?: string | null;
}

// URL de exibição preferida: versão processada para o telão, senão thumb, senão
// o original. url_processada é a versão gerada pelo worker (PHF-030).
function urlExibicao(item: ItemMidia): string {
  return item.url_processada ?? item.url_thumb ?? item.url_original;
}

// Tela do slideshow (PHF-051). Fundo do evento sempre presente (com camada de
// escurecimento configurável); sobre ele, o estado vazio ou o slide atual.
// Toda mudança de conteúdo vem por Realtime via useSlideshow — sem reload.
export function Slideshow({
  itensIniciais,
  config,
  assinar,
  backgroundUrl,
}: SlideshowProps) {
  const { atual, vazio } = useSlideshow(itensIniciais, config, assinar);

  const escurecimento = Math.min(80, Math.max(0, config.escurecimento_bg)) / 100;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {backgroundUrl && (
        <img
          src={backgroundUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div
        aria-hidden
        className="absolute inset-0 bg-black"
        style={{ opacity: escurecimento }}
      />

      {vazio ? (
        <div
          role="status"
          className="relative flex h-full w-full items-center justify-center px-8 text-center"
        >
          <p className="text-2xl font-light text-white/80">
            Aguardando as primeiras fotos do evento…
          </p>
        </div>
      ) : (
        atual && (
          <figure
            key={atual.id}
            className="relative flex h-full w-full items-center justify-center animate-[fade_600ms_ease]"
          >
            <img
              src={urlExibicao(atual)}
              alt={atual.mensagem ?? atual.autor ?? "Foto do evento"}
              className="max-h-full max-w-full object-contain"
            />
            {config.exibir_autor_mensagem && (atual.autor || atual.mensagem) && (
              <figcaption className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-8 text-white">
                {atual.mensagem && <p className="text-xl">{atual.mensagem}</p>}
                {atual.autor && <p className="text-sm opacity-80">— {atual.autor}</p>}
              </figcaption>
            )}
          </figure>
        )
      )}
    </div>
  );
}
