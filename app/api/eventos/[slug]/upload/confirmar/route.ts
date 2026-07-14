import { NextResponse } from "next/server";
import { enqueueProcessing } from "@/lib/queue";
import { supabaseAdmin } from "@/lib/supabase-server";

// PHF-021 — POST /api/eventos/:slug/upload/confirmar
// O cliente avisa que terminou de subir o arquivo ao Storage; enfileiramos o processamento.
// ponytail: não verifica a existência do objeto no Storage — a fila/workers (PHF-013/Epic 3)
// ainda não existem, então um "ghost job" é inofensivo. Adicionar um head-check quando fizer diferença.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const { mediaId } = await req.json().catch(() => ({ mediaId: undefined }));
  if (!mediaId) return NextResponse.json({ erro: "mediaId é obrigatório." }, { status: 400 });

  const db = supabaseAdmin();

  const { data: evento } = await db
    .from("events")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!evento) return NextResponse.json({ erro: "Evento não encontrado." }, { status: 404 });

  const { data: item } = await db
    .from("media_items")
    .select("id, tipo, event_id")
    .eq("id", mediaId)
    .maybeSingle();
  // Isolamento por evento: o item tem de pertencer a ESTE evento.
  if (!item || item.event_id !== evento.id) {
    return NextResponse.json({ erro: "Mídia não encontrada." }, { status: 404 });
  }

  await enqueueProcessing(item.id, item.tipo);

  return NextResponse.json({ status: "enfileirado", mediaId: item.id });
}
