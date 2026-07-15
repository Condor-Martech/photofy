import type { SolicitacaoPendente } from "../../../../../lib/admin/solicitacoes";

// Apresentacional puro: recebe as solicitações já resolvidas e só desenha.
// A busca (container) fica na page para poder testar o render sem banco.

export default function SolicitacoesList({
  solicitacoes,
}: {
  solicitacoes: SolicitacaoPendente[];
}) {
  if (solicitacoes.length === 0) {
    return (
      <p className="p-6 text-center text-sm text-gray-500">
        Nenhuma solicitação de exclusão pendente.
      </p>
    );
  }

  return (
    // Mobile-first: cartões empilhados no celular, linha a partir de sm (02-spec.md §1.1).
    <ul className="divide-y divide-gray-200">
      {solicitacoes.map((s) => (
        <li key={s.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:gap-4">
          {s.media?.urlThumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={s.media.urlThumb}
              alt=""
              className="h-16 w-16 shrink-0 rounded object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-gray-100 text-xs text-gray-400">
              {s.media?.tipo ?? "—"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              {s.media?.autor || "Autor anônimo"}
              {s.media?.mensagem ? (
                <span className="text-gray-500"> — {s.media.mensagem}</span>
              ) : null}
            </p>
            <p className="text-sm text-gray-600">Solicitado por {s.solicitante}</p>
            {s.motivo ? (
              <p className="text-sm text-gray-500">Motivo: {s.motivo}</p>
            ) : null}
          </div>
          <span className="shrink-0 self-start rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            Pendente
          </span>
        </li>
      ))}
    </ul>
  );
}
