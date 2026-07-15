import { responderDecisao } from "@/lib/exclusao/handler";
import {
  criarPortaSupabase,
  resolverOrganizador,
} from "@/lib/exclusao/supabase-porta";

// PHF-063 — PATCH /api/solicitacoes-exclusao/:id (02-spec.md §4).
// Organizador executa ('executar') ou nega ('negar') uma deletion_request,
// com registro de auditoria. Corpo: { decisao: 'executar'|'negar', motivo?: string }.
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  let corpo: unknown = null;
  try {
    corpo = await req.json();
  } catch {
    corpo = null; // corpo ausente/ inválido → handler responde 400
  }

  const resposta = await responderDecisao(
    { porta: criarPortaSupabase(), resolverOrganizador },
    id,
    corpo,
  );

  return Response.json(resposta.corpo, { status: resposta.status });
}
