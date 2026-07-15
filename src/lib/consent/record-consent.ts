// PHF-023 — Registro de consent_record (aceite duplo, versionado). Risco: ALTO (LGPD).
//
// Este é o ÚNICO ponto que grava a prova de consentimento do participante. Ele será
// chamado no fluxo de confirmação de upload (PHF-021), depois que o media_item existe.
//
// Regras de domínio inegociáveis (base legal do produto — não "simplificar"):
//   1. Aceite DUPLO obrigatório: sem `aceite_termos` E `aceite_conteudo`, NENHUM registro
//      é criado (02-spec.md §5, "Botão de envio bloqueado sem aceite"). Enforce no servidor,
//      não confiar no cliente.
//   2. IP nunca é persistido cru — só o hash salgado (`ip_hash`). Sem o salt, falha fechado.
//   3. Consentimento VERSIONADO: `versao_termos` é obrigatório para saber a que termos o
//      titular consentiu.
// A imutabilidade do registro (sem UPDATE) é garantida no banco — ver
// supabase/migrations/*_phf023_consent_record_hardening.sql.

import { createHash } from "node:crypto";

export interface ConsentInput {
  mediaId: string;
  aceiteTermos: boolean;
  aceiteConteudo: boolean;
  ip: string; // IP cru — hasheado antes de gravar, NUNCA persistido
  userAgent?: string;
  versaoTermos: string;
}

/** Linha exatamente como gravada em `consent_record` (snake_case, 02-spec.md §3). */
export interface ConsentRow {
  media_id: string;
  aceite_termos: true;
  aceite_conteudo: true;
  ip_hash: string;
  user_agent: string | null;
  versao_termos: string;
}

/** Escritor injetável — desacopla a regra do driver do banco (testável sem DB). */
export interface ConsentWriter {
  insert(row: ConsentRow): Promise<{ id: string }>;
}

export type ConsentResult =
  | { ok: true; id: string }
  | { ok: false; erro: string };

/** Hash salgado do IP. Prefixo `sha256:` deixa o algoritmo explícito na coluna. */
function hashIp(ip: string, salt: string): string {
  return "sha256:" + createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/**
 * Registra a prova de consentimento de um upload. Retorna erro (sem gravar) quando o
 * aceite duplo não está completo ou a versão dos termos falta. Lança quando o salt do
 * hash de IP não está configurado (fail-closed — não gravar consentimento sem prova).
 */
export async function registrarConsentimento(
  input: ConsentInput,
  writer: ConsentWriter,
  salt: string | undefined = process.env.CONSENT_IP_HASH_SALT,
): Promise<ConsentResult> {
  if (!input.aceiteTermos || !input.aceiteConteudo) {
    return {
      ok: false,
      erro: "Consentimento duplo obrigatório: aceite de termos e de conteúdo impróprio.",
    };
  }
  if (!input.versaoTermos?.trim()) {
    return { ok: false, erro: "versao_termos é obrigatória (consentimento versionado)." };
  }
  if (!salt) {
    // Sem salt não há como anonimizar o IP; não gravar prova com IP cru nem sem IP.
    throw new Error("CONSENT_IP_HASH_SALT não configurado — impossível registrar consentimento.");
  }

  const { id } = await writer.insert({
    media_id: input.mediaId,
    aceite_termos: true,
    aceite_conteudo: true,
    ip_hash: hashIp(input.ip, salt),
    user_agent: input.userAgent ?? null,
    versao_termos: input.versaoTermos.trim(),
  });
  return { ok: true, id };
}

/** Cliente mínimo do Supabase de que precisamos — evita depender de @supabase/supabase-js aqui. */
export interface SupabaseLike {
  from(table: string): {
    insert(row: ConsentRow): {
      select(cols: string): { single(): Promise<{ data: { id: string } | null; error: { message: string } | null }> };
    };
  };
}

/**
 * Escritor real: grava em `consent_record` via service_role (que ignora a RLS deny-all,
 * mesmo padrão de PHF-012). A rota de upload (PHF-021) monta o client e injeta aqui.
 */
export function supabaseConsentWriter(supabase: SupabaseLike): ConsentWriter {
  return {
    async insert(row) {
      const { data, error } = await supabase
        .from("consent_record")
        .insert(row)
        .select("id")
        .single();
      if (error || !data) {
        throw new Error(`Falha ao gravar consent_record: ${error?.message ?? "sem dados"}`);
      }
      return { id: data.id };
    },
  };
}
