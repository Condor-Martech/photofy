import type { ItemMidia, StatusMidia, TipoMidia } from "@/lib/moderacao/tipos";

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

function horario(criadoEm: string): string {
  return new Date(criadoEm).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

// Linha da fila de moderação (PHF-040): thumbnail, autor, mensagem, tipo, horário
// e status. Ações de aprovar/reprovar/reverter são PHF-041; preview é PHF-043.
export function ItemFila({ item }: { item: ItemMidia }) {
  return (
    <li className="flex items-start gap-3 border-b border-zinc-100 p-3">
      {item.url_thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.url_thumb}
          alt={item.autor ? `Envio de ${item.autor}` : "Envio sem autor"}
          className="h-16 w-16 shrink-0 rounded object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-zinc-100 text-xs text-zinc-400"
        >
          {ROTULO_TIPO[item.tipo]}
        </div>
      )}

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
      </div>

      <span
        className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${COR_STATUS[item.status]}`}
      >
        {ROTULO_STATUS[item.status]}
      </span>
    </li>
  );
}
