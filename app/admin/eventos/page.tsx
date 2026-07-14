import { listarEventos } from "../../../lib/admin/eventos";
import EventosTable from "./eventos-table";

// PHF-070 — /admin/eventos: listagem com status e contagem de itens.
// Server Component: busca no servidor (service_role) e passa para o apresentacional.
// ponytail: sem guarda de auth ainda — a rota /admin precisa de middleware de organizador
// quando o login do admin existir (ver lib/supabase/server.ts).
export const dynamic = "force-dynamic";

export default async function EventosAdminPage() {
  const eventos = await listarEventos();

  return (
    <main className="mx-auto max-w-2xl">
      <h1 className="p-4 text-xl font-semibold">Eventos</h1>
      <EventosTable eventos={eventos} />
    </main>
  );
}
