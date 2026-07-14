"use client";

import { useCallback, useMemo } from "react";
import { criarAplicarDecisao } from "@/lib/moderacao/aplicar-decisao";
import { criarAssinaturaFila } from "@/lib/moderacao/canal-realtime";
import type { AplicarDecisao, AssinarFila, ItemMidia } from "@/lib/moderacao/tipos";
import { criarClienteBrowser } from "@/lib/supabase/client";
import { BadgePendentes } from "./badge-pendentes";
import { ItemFila } from "./item-fila";
import { useFilaModeracao } from "./use-fila-moderacao";

interface Props {
  eventId: string;
  itensIniciais?: ItemMidia[];
  // Injetáveis para testes; por padrão ligam em Supabase (Realtime + RPC).
  assinar?: AssinarFila;
  aplicarDecisao?: AplicarDecisao;
}

// Painel de moderação ao vivo (PHF-040) com ações de aprovar/reprovar/reverter
// (PHF-041). Só o moderador vê esta tela — nenhuma decisão é comunicada ao
// participante (regra dura de domínio, CLAUDE.md do repo).
export function PainelModeracao({
  eventId,
  itensIniciais = [],
  assinar,
  aplicarDecisao,
}: Props) {
  const assinatura = useMemo<AssinarFila>(
    () => assinar ?? criarAssinaturaFila(criarClienteBrowser(), eventId),
    [assinar, eventId],
  );
  // Cliente criado sob demanda (na 1ª decisão), não no render — assim o painel
  // monta em ambientes sem env de Supabase (ex.: testes que não moderam).
  const aplicar = useMemo<AplicarDecisao>(
    () =>
      aplicarDecisao ??
      ((entrada) => criarAplicarDecisao(criarClienteBrowser())(entrada)),
    [aplicarDecisao],
  );

  const { itens, pendentes } = useFilaModeracao(itensIniciais, assinatura);

  const decidir = useCallback(
    (mediaId: string) =>
      (acao: Parameters<AplicarDecisao>[0]["acao"], motivo?: string) =>
        aplicar({ mediaId, acao, motivo }),
    [aplicar],
  );

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
            <ItemFila key={item.id} item={item} aoDecidir={decidir(item.id)} />
          ))}
        </ul>
      )}
    </section>
  );
}
