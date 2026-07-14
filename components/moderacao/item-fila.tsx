"use client";

import { useState } from "react";
import { acoesDisponiveis } from "@/lib/moderacao/decisao";
import type {
  AcaoModeracao,
  ItemMidia,
  StatusMidia,
  TipoMidia,
} from "@/lib/moderacao/tipos";

const ROTULO_STATUS: Record<StatusMidia, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  erro: "Erro",
};

const COR_STATUS: Record<StatusMidia, string> = {
  pendente: "bg-amber-100 text-amber-800",
  aprovado: "bg-emerald-100 text-emerald-800",
  reprovado: "bg-rose-100 text-rose-800",
  erro: "bg-zinc-200 text-zinc-700",
};

const ROTULO_TIPO: Record<TipoMidia, string> = { foto: "Foto", reel: "Reel" };

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

function horario(criadoEm: string): string {
  return new Date(criadoEm).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

// Callback opcional de decisão (PHF-041). Ausente = painel só-leitura (ex.: PHF-040).
// Seleção (PHF-042) também é opcional: sem aoAlternarSelecao não há checkbox.
// Preview ampliado (PHF-043) também é opcional: sem aoAbrirPreview a thumbnail não
// é clicável — quem monta o overlay é o painel, para haver só um preview por vez.
type Props = {
  item: ItemMidia;
  aoDecidir?: (acao: AcaoModeracao, motivo?: string) => void | Promise<void>;
  selecionado?: boolean;
  aoAlternarSelecao?: (id: string) => void;
  aoAbrirPreview?: (item: ItemMidia) => void;
};

// Linha da fila de moderação (PHF-040) com ações de aprovar/reprovar/reverter
// (PHF-041) e seleção para ações em lote (PHF-042). As ações oferecidas dependem
// do status atual (decisao.ts) — o Realtime reflete a mudança de status, então não
// mantemos status otimista local aqui.
export function ItemFila({
  item,
  aoDecidir,
  selecionado,
  aoAlternarSelecao,
  aoAbrirPreview,
}: Props) {
  const [processando, setProcessando] = useState(false);
  const acoes = aoDecidir ? acoesDisponiveis(item.status) : [];

  async function decidir(acao: AcaoModeracao) {
    if (!aoDecidir || processando) return;
    // Reprovar pede um motivo para a auditoria (moderation_log.motivo); cancelar aborta.
    let motivo: string | undefined;
    if (acao === "reprovar") {
      const resposta = window.prompt("Motivo da reprovação (opcional):");
      if (resposta === null) return;
      motivo = resposta.trim() || undefined;
    }
    setProcessando(true);
    try {
      await aoDecidir(acao, motivo);
    } finally {
      setProcessando(false);
    }
  }

  return (
    <li className="flex items-start gap-3 border-b border-zinc-100 p-3">
      {aoAlternarSelecao ? (
        <input
          type="checkbox"
          checked={selecionado ?? false}
          onChange={() => aoAlternarSelecao(item.id)}
          aria-label={`Selecionar envio de ${item.autor?.trim() || "Anônimo"}`}
          className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300"
        />
      ) : null}

      {(() => {
        const miniatura = item.url_thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url_thumb}
            alt={item.autor ? `Envio de ${item.autor}` : "Envio sem autor"}
            className="h-16 w-16 rounded object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="flex h-16 w-16 items-center justify-center rounded bg-zinc-100 text-xs text-zinc-400"
          >
            {ROTULO_TIPO[item.tipo]}
          </div>
        );

        return aoAbrirPreview ? (
          <button
            type="button"
            onClick={() => aoAbrirPreview(item)}
            aria-label={`Ampliar preview de ${item.autor?.trim() || "Anônimo"}`}
            className="shrink-0 overflow-hidden rounded focus:outline-none focus:ring-2 focus:ring-zinc-500"
          >
            {miniatura}
          </button>
        ) : (
          <div className="shrink-0">{miniatura}</div>
        );
      })()}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-zinc-900">
            {item.autor?.trim() || "Anônimo"}
          </span>
          <span className="text-xs uppercase tracking-wide text-zinc-400">
            {ROTULO_TIPO[item.tipo]}
          </span>
          <time dateTime={item.criado_em} className="ml-auto text-xs text-zinc-400">
            {horario(item.criado_em)}
          </time>
        </div>
        {item.mensagem ? (
          <p className="mt-0.5 line-clamp-2 text-sm text-zinc-600">{item.mensagem}</p>
        ) : null}

        {acoes.length > 0 ? (
          <div className="mt-2 flex gap-2">
            {acoes.map((acao) => (
              <button
                key={acao}
                type="button"
                disabled={processando}
                onClick={() => decidir(acao)}
                className={`rounded px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50 ${COR_ACAO[acao]}`}
              >
                {ROTULO_ACAO[acao]}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <span
        className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${COR_STATUS[item.status]}`}
      >
        {ROTULO_STATUS[item.status]}
      </span>
    </li>
  );
}
