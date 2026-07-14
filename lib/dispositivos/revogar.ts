// PHF-053 — Revogação individual de dispositivo pareado.
//
// Regra dura inegociável (CLAUDE.md / 02-spec.md §5): revogar UMA tela nunca
// pode afetar as demais pareadas ao mesmo evento.
//
// A garantia mora no escopo da operação: revogar é um UPDATE de UMA linha por
// chave primária (`.eq("id", id)`). Não existe caminho neste módulo que altere
// o status de um device diferente do alvo — logo, por construção, "salao" segue
// intacto quando "entrada" é revogado. Os testes provam o cenário Gherkin.
//
// Wiring HTTP (`POST /api/dispositivos/:id/revogar`, 02-spec.md §4) fica trivial
// quando o client Supabase (PHF-010) e as policies RLS de `devices` (PHF-011,
// hoje deny-all) chegarem: `return revogarNoSupabase(await createClient(), id)`.

export type DeviceStatus = "aguardando" | "pareado" | "revogado" | "expirado";

/** Subconjunto de uma linha de `devices` (02-spec.md §3) que nos interessa. */
export interface Device {
  id: string;
  event_id: string | null;
  status: DeviceStatus;
}

/**
 * Autorização de leitura da tela pareada: só um device 'pareado' tem token
 * válido. Ao revogar, o status vira 'revogado' e esta checagem passa a barrar
 * SÓ aquela tela — as demais seguem 'pareado' e válidas. É o gate que o telão
 * (PHF-050/051) consulta em cada leitura via Realtime.
 */
export function tokenValido(device: Pick<Device, "status"> | null | undefined): boolean {
  return !!device && device.status === "pareado";
}

export type ResultadoRevogacao =
  | { revogado: true; device: Device }
  | { revogado: false; motivo: "nao_encontrado" };

/**
 * Invariante puro da revogação, sobre uma coleção em memória — a mesma que o
 * adaptador Supabase abaixo executa com `.eq("id", id)`. Idempotente. Muta
 * exclusivamente o device alvo; qualquer outro na coleção fica intocado.
 */
export function revogarEmMemoria(devices: Device[], deviceId: string): ResultadoRevogacao {
  const alvo = devices.find((d) => d.id === deviceId);
  if (!alvo) return { revogado: false, motivo: "nao_encontrado" };
  alvo.status = "revogado";
  return { revogado: true, device: alvo };
}

/** Client Supabase reduzido ao encadeamento que usamos — permite testar sem a lib. */
export interface DevicesRevokeClient {
  from(table: "devices"): {
    update(patch: { status: "revogado" }): {
      eq(
        col: "id",
        id: string,
      ): {
        select(cols: string): {
          maybeSingle(): Promise<{ data: Device | null; error: unknown }>;
        };
      };
    };
  };
}

/**
 * Executa a revogação no Postgres via Supabase. O `.eq("id", id)` é o
 * isolamento: um único registro por PK, estruturalmente incapaz de tocar outro
 * device do mesmo evento. RLS por event_id (PHF-011) é camada adicional, não a
 * fonte desta garantia.
 */
export async function revogarNoSupabase(
  supabase: DevicesRevokeClient,
  deviceId: string,
): Promise<ResultadoRevogacao> {
  const { data, error } = await supabase
    .from("devices")
    .update({ status: "revogado" })
    .eq("id", deviceId)
    .select("id, event_id, status")
    .maybeSingle();

  if (error) throw error;
  if (!data) return { revogado: false, motivo: "nao_encontrado" };
  return { revogado: true, device: data };
}
