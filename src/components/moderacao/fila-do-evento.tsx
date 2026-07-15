"use client";

import { useEffect, useState } from "react";
import type { AssinarFila } from "@/lib/moderacao/tipos";
import { criarClienteBrowser } from "@/lib/supabase/client";
import { PainelModeracao } from "./painel-moderacao";

// Resolve o event_id pelo slug e monta a fila de moderação ao vivo (PHF-040)
// daquele — e somente daquele — evento. O painel escopa o Realtime por event_id,
// então a fila nunca mistura envios de eventos diferentes (isolamento, 02-spec §5).
export type ResolverEventId = (slug: string) => Promise<string | null>;

async function resolverPorSlug(slug: string): Promise<string | null> {
  const { data } = await criarClienteBrowser()
    .from("events")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

interface Props {
  slug: string;
  // Injetáveis para teste; por padrão consultam events e ligam no Supabase Realtime.
  resolver?: ResolverEventId;
  assinar?: AssinarFila;
}

export function FilaDoEvento({ slug, resolver = resolverPorSlug, assinar }: Props) {
  const [eventId, setEventId] = useState<string | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let ativo = true;
    resolver(slug)
      .then((id) => {
        if (!ativo) return;
        if (id) setEventId(id);
        else setErro(true);
      })
      .catch(() => {
        if (ativo) setErro(true);
      });
    return () => {
      ativo = false;
    };
  }, [slug, resolver]);

  if (erro) return <p className="p-4 text-sm text-rose-600">Evento não encontrado.</p>;
  if (!eventId) return <p className="p-4 text-sm text-zinc-500">Carregando…</p>;

  return <PainelModeracao eventId={eventId} assinar={assinar} />;
}
