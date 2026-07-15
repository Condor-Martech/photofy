"use client";

import { useEffect, useMemo, useState } from "react";
import { aplicarEvento, contarPendentes, ordenarFila } from "@/lib/moderacao/fila";
import type { AssinarFila, ItemMidia } from "@/lib/moderacao/tipos";

// Estado ao vivo da fila de moderação (PHF-040). Recebe a assinatura por injeção
// para permanecer testável com um fake — a ligação real com Supabase Realtime
// vem de criarAssinaturaFila (canal-realtime.ts).
export function useFilaModeracao(itensIniciais: ItemMidia[], assinar: AssinarFila) {
  const [itens, setItens] = useState<ItemMidia[]>(() => ordenarFila(itensIniciais));

  useEffect(() => {
    const cancelar = assinar((evento) => {
      setItens((atual) => aplicarEvento(atual, evento));
    });
    return cancelar;
  }, [assinar]);

  const pendentes = useMemo(() => contarPendentes(itens), [itens]);

  return { itens, pendentes };
}
