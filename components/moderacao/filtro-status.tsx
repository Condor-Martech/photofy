"use client";

import { FILTROS_STATUS } from "@/lib/moderacao/filtro";
import type { FiltroStatus } from "@/lib/moderacao/tipos";

const ROTULO_FILTRO: Record<FiltroStatus, string> = {
  todos: "Todos",
  pendente: "Pendentes",
  aprovado: "Aprovados",
  reprovado: "Reprovados",
  erro: "Erro",
};

type Props = {
  atual: FiltroStatus;
  contagem: Record<FiltroStatus, number>;
  aoFiltrar: (filtro: FiltroStatus) => void;
};

// Barra de filtros por status da fila de moderação (PHF-042). Recorta a lista ao
// vivo no cliente — o Realtime já entrega todos os status do evento. Cada filtro
// mostra a contagem para o moderador priorizar (ex.: "Pendentes 12").
export function FiltroStatusBar({ atual, contagem, aoFiltrar }: Props) {
  return (
    <div role="group" aria-label="Filtrar por status" className="flex flex-wrap gap-2 px-4 pb-2">
      {FILTROS_STATUS.map((filtro) => {
        const ativo = filtro === atual;
        return (
          <button
            key={filtro}
            type="button"
            aria-pressed={ativo}
            onClick={() => aoFiltrar(filtro)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              ativo
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {ROTULO_FILTRO[filtro]}
            <span className={`ml-1.5 ${ativo ? "text-zinc-300" : "text-zinc-400"}`}>
              {contagem[filtro]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
