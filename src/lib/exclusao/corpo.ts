import { Decisao } from "./tipos";

export type CorpoDecisao =
  | { ok: true; decisao: Decisao; motivo: string | null }
  | { ok: false; erro: string };

const DECISOES = new Set<string>(["executar", "negar"]);

// Valida o corpo do PATCH /api/solicitacoes-exclusao/:id sem framework, para ser
// testável direto. Fronteira do sistema: aqui, sim, validamos entrada externa.
export function interpretarCorpoDecisao(bruto: unknown): CorpoDecisao {
  if (typeof bruto !== "object" || bruto === null) {
    return { ok: false, erro: "Corpo inválido: objeto JSON esperado." };
  }
  const obj = bruto as Record<string, unknown>;

  const decisao = obj.decisao;
  if (typeof decisao !== "string" || !DECISOES.has(decisao)) {
    return { ok: false, erro: "Campo 'decisao' deve ser 'executar' ou 'negar'." };
  }

  const motivoRaw = obj.motivo;
  if (motivoRaw != null && typeof motivoRaw !== "string") {
    return { ok: false, erro: "Campo 'motivo' deve ser texto." };
  }

  return {
    ok: true,
    decisao: decisao as Decisao,
    motivo: (motivoRaw as string | undefined) ?? null,
  };
}
