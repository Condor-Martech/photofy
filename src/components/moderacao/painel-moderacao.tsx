"use client";

import { useMemo } from "react";
import { criarAssinaturaFila } from "@/lib/moderacao/canal-realtime";
import type { AssinarFila, ItemMidia } from "@/lib/moderacao/tipos";
import { criarClienteBrowser } from "@/lib/supabase/client";
import { BadgePendentes } from "./badge-pendentes";
import { ItemFila } from "./item-fila";
import { useFilaModeracao } from "./use-fila-moderacao";

interface Props {
  eventId: string;
  itensIniciais?: ItemMidia[];
  // Injetável para testes; por padrão liga em Supabase Realtime.
  assinar?: AssinarFila;
}

// Painel de moderação ao vivo (PHF-040): lista em tempo real com badge de
// pendentes. Só o moderador vê esta tela — nenhuma decisão é comunicada ao
// participante (regra dura de domínio, CLAUDE.md do repo).
export function PainelModeracao({ eventId, itensIniciais = [], assinar }: Props) {
  const assinatura = useMemo<AssinarFila>(
    () => assinar ?? criarAssinaturaFila(criarClienteBrowser(), eventId),
    [assinar, eventId],
  );

  const { itens, pendentes } = useFilaModeracao(itensIniciais, assinatura);

  return (
    <section className="mx-auto flex max-w-2xl flex-col">
      <header className="flex items-center gap-2 p-4">
        <h1 className="text-lg font-semibold text-zinc-900">Moderação</h1>
        <BadgePendentes total={pendentes} />
      </header>

      {itens.length === 0 ? (
        <p className="p-4 text-sm text-zinc-500">Nenhum envio na fila ainda.</p>
      ) : (
        <ul className="flex flex-col">
          {itens.map((item) => (
            <ItemFila key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}
