"use client";

import { useCallback, useMemo, useState } from "react";
import { criarAplicarDecisao } from "@/lib/moderacao/aplicar-decisao";
import { criarAplicarDecisaoLote } from "@/lib/moderacao/aplicar-decisao-lote";
import { criarAssinaturaFila } from "@/lib/moderacao/canal-realtime";
import { contarPorStatus, filtrarPorStatus } from "@/lib/moderacao/filtro";
import { acoesLoteDisponiveis } from "@/lib/moderacao/lote";
import type {
  AplicarDecisao,
  AplicarDecisaoLote,
  AssinarFila,
  FiltroStatus,
  ItemMidia,
} from "@/lib/moderacao/tipos";
import { criarClienteBrowser } from "@/lib/supabase/client";
import { BadgePendentes } from "./badge-pendentes";
import { BarraLote } from "./barra-lote";
import { FiltroStatusBar } from "./filtro-status";
import { ItemFila } from "./item-fila";
import { PreviewMidia } from "./preview-midia";
import { useFilaModeracao } from "./use-fila-moderacao";

interface Props {
  eventId: string;
  itensIniciais?: ItemMidia[];
  // Injetáveis para testes; por padrão ligam em Supabase (Realtime + RPC).
  assinar?: AssinarFila;
  aplicarDecisao?: AplicarDecisao;
  aplicarDecisaoLote?: AplicarDecisaoLote;
}

// Painel de moderação ao vivo (PHF-040) com ações de aprovar/reprovar/reverter
// (PHF-041), filtros por status e ações em lote (PHF-042). Só o moderador vê esta
// tela — nenhuma decisão é comunicada ao participante (regra dura, CLAUDE.md).
export function PainelModeracao({
  eventId,
  itensIniciais = [],
  assinar,
  aplicarDecisao,
  aplicarDecisaoLote,
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
  const aplicarLote = useMemo<AplicarDecisaoLote>(
    () =>
      aplicarDecisaoLote ??
      ((entrada) => criarAplicarDecisaoLote(criarClienteBrowser())(entrada)),
    [aplicarDecisaoLote],
  );

  const { itens, pendentes } = useFilaModeracao(itensIniciais, assinatura);

  const [filtro, setFiltro] = useState<FiltroStatus>("todos");
  const [selecao, setSelecao] = useState<ReadonlySet<string>>(() => new Set());
  // Preview ampliado (PHF-043): um único overlay por vez, controlado aqui pelo id.
  // Resolvemos o item pela lista ao vivo para o preview refletir mudanças de status.
  const [idPreview, setIdPreview] = useState<string | null>(null);

  const contagem = useMemo(() => contarPorStatus(itens), [itens]);
  const itensVisiveis = useMemo(
    () => filtrarPorStatus(itens, filtro),
    [itens, filtro],
  );

  const itensSelecionados = useMemo(
    () => itens.filter((item) => selecao.has(item.id)),
    [itens, selecao],
  );
  const acoesLote = useMemo(
    () => acoesLoteDisponiveis(itensSelecionados),
    [itensSelecionados],
  );

  const decidir = useCallback(
    (mediaId: string) =>
      (acao: Parameters<AplicarDecisao>[0]["acao"], motivo?: string) =>
        aplicar({ mediaId, acao, motivo }),
    [aplicar],
  );

  const alternarSelecao = useCallback((id: string) => {
    setSelecao((atual) => {
      const proxima = new Set(atual);
      if (proxima.has(id)) proxima.delete(id);
      else proxima.add(id);
      return proxima;
    });
  }, []);

  const limparSelecao = useCallback(() => setSelecao(new Set()), []);

  const abrirPreview = useCallback((item: ItemMidia) => setIdPreview(item.id), []);
  const fecharPreview = useCallback(() => setIdPreview(null), []);
  const itemPreview = useMemo(
    () => (idPreview ? (itens.find((item) => item.id === idPreview) ?? null) : null),
    [itens, idPreview],
  );

  // Seleciona/limpa todos os itens atualmente visíveis (respeita o filtro ativo).
  const todosVisiveisSelecionados =
    itensVisiveis.length > 0 && itensVisiveis.every((item) => selecao.has(item.id));
  const alternarTodosVisiveis = useCallback(() => {
    setSelecao((atual) => {
      const proxima = new Set(atual);
      const marcarTodos = !itensVisiveis.every((item) => proxima.has(item.id));
      for (const item of itensVisiveis) {
        if (marcarTodos) proxima.add(item.id);
        else proxima.delete(item.id);
      }
      return proxima;
    });
  }, [itensVisiveis]);

  const aplicarEmLote = useCallback(
    async (acao: Parameters<AplicarDecisaoLote>[0]["acao"], motivo?: string) => {
      const mediaIds = itensSelecionados.map((item) => item.id);
      if (mediaIds.length === 0) return;
      await aplicarLote({ mediaIds, acao, motivo });
      limparSelecao();
    },
    [aplicarLote, itensSelecionados, limparSelecao],
  );

  return (
    <section className="mx-auto flex max-w-2xl flex-col">
      <header className="flex items-center gap-2 p-4 pb-2">
        <h1 className="text-lg font-semibold text-zinc-900">Moderação</h1>
        <BadgePendentes total={pendentes} />
      </header>

      <FiltroStatusBar atual={filtro} contagem={contagem} aoFiltrar={setFiltro} />

      <BarraLote
        total={itensSelecionados.length}
        acoes={acoesLote}
        aoAplicar={aplicarEmLote}
        aoLimpar={limparSelecao}
      />

      {itens.length === 0 ? (
        <p className="p-4 text-sm text-zinc-500">Nenhum envio na fila ainda.</p>
      ) : itensVisiveis.length === 0 ? (
        <p className="p-4 text-sm text-zinc-500">Nenhum item neste filtro.</p>
      ) : (
        <>
          <label className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-500">
            <input
              type="checkbox"
              checked={todosVisiveisSelecionados}
              onChange={alternarTodosVisiveis}
              aria-label="Selecionar todos os itens visíveis"
              className="h-4 w-4 rounded border-zinc-300"
            />
            Selecionar todos
          </label>
          <ul className="flex flex-col">
            {itensVisiveis.map((item) => (
              <ItemFila
                key={item.id}
                item={item}
                aoDecidir={decidir(item.id)}
                selecionado={selecao.has(item.id)}
                aoAlternarSelecao={alternarSelecao}
                aoAbrirPreview={abrirPreview}
              />
            ))}
          </ul>
        </>
      )}

      {itemPreview ? (
        <PreviewMidia item={itemPreview} aoFechar={fecharPreview} />
      ) : null}
    </section>
  );
}
