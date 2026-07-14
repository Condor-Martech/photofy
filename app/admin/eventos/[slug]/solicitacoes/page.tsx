import { listarSolicitacoesPendentes } from "../../../../../lib/admin/solicitacoes";
import SolicitacoesList from "./solicitacoes-list";

// PHF-073 — /admin/eventos/[slug]/solicitacoes: fila de deletion_request pendentes.
// Server Component: busca no servidor (service_role) e passa para o apresentacional.
// ponytail: sem guarda de auth ainda — a rota /admin precisa de middleware de organizador
// quando o login do admin existir (ver lib/supabase/server.ts). Executar/negar a
// solicitação é PHF-063 (risco alto LGPD), não entra aqui.
export const dynamic = "force-dynamic";

export default async function SolicitacoesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const solicitacoes = await listarSolicitacoesPendentes(slug);

  return (
    <main className="mx-auto max-w-2xl">
      <h1 className="p-4 text-xl font-semibold">Solicitações de exclusão</h1>
      <SolicitacoesList solicitacoes={solicitacoes} />
    </main>
  );
}
