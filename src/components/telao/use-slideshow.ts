"use client";

import { useEffect, useMemo, useState } from "react";
import {
  aplicarEvento,
  construirRotacao,
  proximoIndice,
} from "@/lib/slideshow/rotacao";
import type {
  AssinarSlideshow,
  ItemMidia,
  SlideshowConfig,
} from "@/lib/slideshow/tipos";

// Estado ao vivo do telão (PHF-051). Recebe a assinatura por injeção para
// permanecer testável com um fake — a ligação real com Supabase Realtime vem de
// criarAssinaturaSlideshow (canal-realtime.ts). Nunca faz reload: aprovações,
// reprovações e exclusões chegam por Realtime e mutam a rotação em memória.
export function useSlideshow(
  itensIniciais: ItemMidia[],
  config: SlideshowConfig,
  assinar: AssinarSlideshow,
) {
  const [itens, setItens] = useState<ItemMidia[]>(itensIniciais);
  const [indice, setIndice] = useState(0);

  // Rotação derivada do estado bruto — refeita a cada evento de Realtime.
  const rotacao = useMemo(() => construirRotacao(itens, config), [itens, config]);

  useEffect(() => {
    const cancelar = assinar((evento) => {
      setItens((atual) => aplicarEvento(atual, evento));
    });
    return cancelar;
  }, [assinar]);

  // Índice pode ficar fora do range quando a rotação encolhe (item removido).
  const indiceSeguro = rotacao.length === 0 ? 0 : indice % rotacao.length;
  const atual = rotacao[indiceSeguro] ?? null;

  // Avança um slide a cada seg_por_slide. O timer reinicia quando o tamanho da
  // rotação muda, evitando um slide fantasma logo após uma mudança.
  useEffect(() => {
    if (rotacao.length <= 1) return;
    const ms = Math.max(1, config.seg_por_slide) * 1000;
    const timer = setInterval(() => {
      setIndice((i) => proximoIndice(i % rotacao.length, rotacao.length, config.loop));
    }, ms);
    return () => clearInterval(timer);
  }, [rotacao.length, config.seg_por_slide, config.loop]);

  return { rotacao, atual, indice: indiceSeguro, vazio: rotacao.length === 0 };
}
