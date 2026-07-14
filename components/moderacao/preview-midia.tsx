"use client";

import { useEffect } from "react";
import type { ItemMidia, TipoMidia } from "@/lib/moderacao/tipos";

const ROTULO_TIPO: Record<TipoMidia, string> = { foto: "Foto", reel: "Reel" };

type Props = {
  item: ItemMidia;
  aoFechar: () => void;
};

// Preview ampliado (PHF-043): foto em tela cheia, reel no player de vídeo. É uma
// ferramenta só do moderador — não comunica nenhuma decisão ao participante (regra
// dura, CLAUDE.md). Prefere a versão processada (EXIF removido / reel transcodado)
// e cai para o original quando o processamento ainda não gerou url_processada.
export function PreviewMidia({ item, aoFechar }: Props) {
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") aoFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aoFechar]);

  const fonte = item.url_processada ?? item.url_original;
  const autor = item.autor?.trim() || "Anônimo";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ampliado — ${ROTULO_TIPO[item.tipo]} de ${autor}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={(evento) => {
        // Só o clique direto no fundo fecha; cliques na mídia/legenda passam batido.
        if (evento.target === evento.currentTarget) aoFechar();
      }}
    >
      <button
        type="button"
        onClick={aoFechar}
        aria-label="Fechar preview"
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl leading-none text-white hover:bg-white/20"
      >
        &times;
      </button>

      <figure className="flex max-h-full max-w-3xl flex-col items-center gap-3">
        {item.tipo === "reel" ? (
          <video
            src={fonte}
            controls
            autoPlay
            playsInline
            aria-label={`Reel de ${autor}`}
            className="max-h-[80vh] w-auto rounded-lg bg-black"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fonte}
            alt={item.autor ? `Foto de ${item.autor}` : "Foto sem autor"}
            className="max-h-[80vh] w-auto rounded-lg object-contain"
          />
        )}

        {item.autor?.trim() || item.mensagem?.trim() ? (
          <figcaption className="max-w-full text-center text-sm text-white">
            <span className="font-medium">{autor}</span>
            {item.mensagem?.trim() ? (
              <span className="mt-1 block text-white/80">{item.mensagem}</span>
            ) : null}
          </figcaption>
        ) : null}
      </figure>
    </div>
  );
}
