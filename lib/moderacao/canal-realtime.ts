import type {
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from "@supabase/supabase-js";
import type { AssinarFila, ItemMidia } from "./tipos";

// Adaptador de Supabase Realtime → porta AssinarFila. Escuta postgres_changes de
// media_items filtrado por event_id (RLS garante o isolamento de fato). Fino de
// propósito: toda a lógica de estado vive em fila.ts, testada sem Supabase real.
export function criarAssinaturaFila(
  supabase: SupabaseClient,
  eventId: string,
): AssinarFila {
  return (aoReceber) => {
    const canal = supabase
      .channel(`moderacao:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "media_items",
          filter: `event_id=eq.${eventId}`,
        },
        (payload: RealtimePostgresChangesPayload<ItemMidia>) => {
          if (payload.eventType === "INSERT") {
            aoReceber({ tipo: "insert", item: payload.new });
          } else if (payload.eventType === "UPDATE") {
            aoReceber({ tipo: "update", item: payload.new });
          } else if (payload.eventType === "DELETE" && payload.old.id) {
            aoReceber({ tipo: "delete", id: payload.old.id });
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  };
}
