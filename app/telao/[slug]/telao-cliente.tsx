"use client";

import { useEffect, useMemo, useState } from "react";
import { Slideshow } from "@/components/telao/slideshow";
import { criarClienteBrowser } from "@/lib/supabase/client";
import { criarAssinaturaSlideshow } from "@/lib/slideshow/canal-realtime";
import type { ItemMidia, SlideshowConfig } from "@/lib/slideshow/tipos";

const CONFIG_PADRAO: SlideshowConfig = {
  seg_por_slide: 6,
  ordem: "recentes",
  transicao: "fade",
  exibir_autor_mensagem: true,
  incluir_reels: true,
  duracao_reel_telao: "completo",
  loop: true,
  escurecimento_bg: 30,
};

interface Props {
  slug: string;
}

interface DadosTelao {
  eventId: string;
  itens: ItemMidia[];
  config: SlideshowConfig;
  backgroundUrl: string | null;
}

// Wrapper de cliente do telão (PHF-051): resolve o evento pelo slug, carrega os
// aprovados + config e liga o Slideshow ao Supabase Realtime.
// ponytail: a carga inicial usa o cliente anônimo direto; PHF-050 (Device
// Authorization Flow) substitui isto por fetch escopado ao token do device na
// server component, sem tocar no Slideshow (que só depende da porta `assinar`).
export function TelaoCliente({ slug }: Props) {
  const supabase = useMemo(() => criarClienteBrowser(), []);
  const [dados, setDados] = useState<DadosTelao | null>(null);

  // Assinatura estável por evento — evita re-subscribe a cada render do hook.
  const assinar = useMemo(
    () => (dados ? criarAssinaturaSlideshow(supabase, dados.eventId) : null),
    [supabase, dados],
  );

  useEffect(() => {
    let ativo = true;
    void (async () => {
      const evento = await supabase
        .from("events")
        .select("id, background_url")
        .eq("slug", slug)
        .maybeSingle();
      if (!ativo || !evento.data) return;

      const eventId = evento.data.id as string;
      const [midia, cfg] = await Promise.all([
        supabase
          .from("media_items")
          .select("*")
          .eq("event_id", eventId)
          .eq("status", "aprovado"),
        supabase.from("slideshow_config").select("*").eq("event_id", eventId).maybeSingle(),
      ]);
      if (!ativo) return;

      setDados({
        eventId,
        itens: (midia.data as ItemMidia[]) ?? [],
        config: cfg.data
          ? { ...CONFIG_PADRAO, ...(cfg.data as Partial<SlideshowConfig>) }
          : CONFIG_PADRAO,
        backgroundUrl: (evento.data.background_url as string | null) ?? null,
      });
    })();
    return () => {
      ativo = false;
    };
  }, [supabase, slug]);

  if (dados === null || assinar === null) {
    return <div className="h-screen w-screen bg-black" />;
  }

  return (
    <Slideshow
      itensIniciais={dados.itens}
      config={dados.config}
      assinar={assinar}
      backgroundUrl={dados.backgroundUrl}
    />
  );
}
