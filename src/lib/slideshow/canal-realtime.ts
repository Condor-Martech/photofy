import type {
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from "@supabase/supabase-js";
import type { AssinarSlideshow, ItemMidia } from "./tipos";

// Adaptador de Supabase Realtime → porta AssinarSlideshow. Escuta postgres_changes
// de media_items filtrado por event_id (RLS garante o isolamento de fato; o
// token do device é escopado a este evento — 02-spec.md §5). Fino de propósito:
// toda a lógica de rotação vive em rotacao.ts, testada sem Supabase real.
export function criarAssinaturaSlideshow(
  supabase: SupabaseClient,
  eventId: string,
): AssinarSlideshow {
  return (aoReceber) => {
    const canal = supabase
      .channel(`telao:${eventId}`)
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
