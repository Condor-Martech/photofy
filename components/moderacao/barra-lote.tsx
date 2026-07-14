"use client";

import { useState } from "react";
import type { AcaoModeracao } from "@/lib/moderacao/tipos";

const ROTULO_ACAO: Record<AcaoModeracao, string> = {
  aprovar: "Aprovar",
  reprovar: "Reprovar",
  reverter: "Reverter",
};

const COR_ACAO: Record<AcaoModeracao, string> = {
  aprovar: "bg-emerald-600 hover:bg-emerald-700",
  reprovar: "bg-rose-600 hover:bg-rose-700",
  reverter: "bg-zinc-600 hover:bg-zinc-700",
};

type Props = {
  total: number;
  acoes: AcaoModeracao[];
  aoAplicar: (acao: AcaoModeracao, motivo?: string) => void | Promise<void>;
  aoLimpar: () => void;
};

// Barra de ações em lote (PHF-042). Aparece quando há itens selecionados; oferece
// só as ações comuns a TODA a seleção (acoesLoteDisponiveis) e aplica a mesma
// decisão a todos de uma vez. Reprovar pede um motivo único para a auditoria,
// igual ao fluxo unitário. A mudança de status volta pelo Realtime, não local.
export function BarraLote({ total, acoes, aoAplicar, aoLimpar }: Props) {
  const [processando, setProcessando] = useState(false);
  if (total === 0) return null;

  async function aplicar(acao: AcaoModeracao) {
    if (processando) return;
    let motivo: string | undefined;
    if (acao === "reprovar") {
      const resposta = window.prompt(`Motivo da reprovação de ${total} itens (opcional):`);
      if (resposta === null) return;
      motivo = resposta.trim() || undefined;
    }
    setProcessando(true);
    try {
      await aoAplicar(acao, motivo);
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div
      role="toolbar"
      aria-label="Ações em lote"
      className="sticky top-0 z-10 flex items-center gap-2 border-b border-zinc-200 bg-white/95 px-4 py-2 backdrop-blur"
    >
      <span className="text-sm font-medium text-zinc-700">{total} selecionados</span>
      <div className="ml-auto flex gap-2">
        {acoes.length === 0 ? (
          <span className="text-xs text-zinc-400">Sem ação comum à seleção</span>
        ) : (
          acoes.map((acao) => (
            <button
              key={acao}
              type="button"
              disabled={processando}
              onClick={() => aplicar(acao)}
              className={`rounded px-3 py-1 text-xs font-medium text-white disabled:opacity-50 ${COR_ACAO[acao]}`}
            >
              {ROTULO_ACAO[acao]}
            </button>
          ))
        )}
        <button
          type="button"
          onClick={aoLimpar}
          disabled={processando}
          className="rounded px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
        >
          Limpar
        </button>
      </div>
    </div>
  );
}
