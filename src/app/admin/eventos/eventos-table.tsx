import type { EventoResumo } from "../../../lib/admin/eventos";

// Apresentacional puro: recebe os eventos já resolvidos e só desenha.
// Mantém a busca (container) fora daqui para poder testar o render sem banco.

const STATUS_LABEL: Record<EventoResumo["status"], string> = {
  ativo: "Ativo",
  encerrado: "Encerrado",
};

function StatusBadge({ status }: { status: EventoResumo["status"] }) {
  const cor =
    status === "ativo"
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-600";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cor}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export default function EventosTable({ eventos }: { eventos: EventoResumo[] }) {
  if (eventos.length === 0) {
    return (
      <p className="p-6 text-center text-sm text-gray-500">
        Nenhum evento criado ainda.
      </p>
    );
  }

  return (
    // Mobile-first: cartões empilhados no celular, tabela a partir de sm (02-spec.md §1.1).
    <ul className="divide-y divide-gray-200">
      {eventos.map((e) => (
        <li
          key={e.id}
          className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-medium">{e.nome}</p>
            <p className="text-sm text-gray-500">/{e.slug}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={e.status} />
            <span className="text-sm text-gray-600">
              {e.totalItens} {e.totalItens === 1 ? "item" : "itens"}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
