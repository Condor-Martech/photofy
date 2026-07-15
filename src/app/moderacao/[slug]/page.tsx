"use client";

import { use, useEffect, useState } from "react";
import { PainelModeracao } from "@/components/moderacao/painel-moderacao";
import { criarClienteBrowser } from "@/lib/supabase/client";

// Rota do painel de moderação (PHF-040). Resolve o event_id pelo slug (consulta
// pública em events, igual ao fluxo de upload/galeria) e monta o painel ao vivo.
// A carga inicial dos pendentes já existentes é o endpoint autenticado
// /api/moderacao/:slug/fila (PHF-041 / Epic 7); aqui o Realtime popula a partir
// da montagem e o painel aceita itensIniciais quando esse fetch for ligado.
export default function ModeracaoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [eventId, setEventId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    criarClienteBrowser()
      .from("events")
      .select("id")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!ativo) return;
        if (error || !data) setErro("Evento não encontrado.");
        else setEventId(data.id as string);
      });
    return () => {
      ativo = false;
    };
  }, [slug]);

  if (erro) return <p className="p-4 text-sm text-rose-600">{erro}</p>;
  if (!eventId) return <p className="p-4 text-sm text-zinc-500">Carregando…</p>;

  return <PainelModeracao eventId={eventId} />;
}
