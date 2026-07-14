import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { MEDIA_BUCKET, supabaseAdmin } from "@/lib/supabase-server";
import { caminhoOriginal, extDoMime, validarUpload, type UploadInput } from "@/lib/upload";

// PHF-021 — POST /api/eventos/:slug/upload
// Recebe metadata + aceite, valida, cria o media_item (status "pendente") e devolve uma
// URL pré-assinada de upload (uso único) para o cliente subir o arquivo direto ao Storage.
// NÃO grava consent_record: isso é PHF-023 (risco alto, LGPD) — plugado depois neste fluxo.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  let body: UploadInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: evento, error: evErr } = await db
    .from("events")
    .select("id, status, max_foto_mb, max_reel_mb")
    .eq("slug", slug)
    .maybeSingle();

  if (evErr) return NextResponse.json({ erro: "Falha ao carregar evento." }, { status: 500 });
  if (!evento) return NextResponse.json({ erro: "Evento não encontrado." }, { status: 404 });
  if (evento.status !== "ativo") {
    return NextResponse.json({ erro: "Evento encerrado." }, { status: 409 });
  }

  const v = validarUpload(body, evento);
  if (!v.ok) return NextResponse.json({ erro: v.erro }, { status: v.status });

  const ext = extDoMime(body.mimeType);
  if (!ext) return NextResponse.json({ erro: "Formato não aceito." }, { status: 422 });

  const mediaId = randomUUID();
  const path = caminhoOriginal(evento.id, mediaId, ext);

  // URL de upload primeiro: se o insert falhar depois, o slot fica só não usado (inofensivo),
  // em vez de um media_item órfão sem arquivo.
  const { data: signed, error: sErr } = await db.storage
    .from(MEDIA_BUCKET)
    .createSignedUploadUrl(path);
  if (sErr || !signed) {
    return NextResponse.json({ erro: "Falha ao gerar URL de upload." }, { status: 500 });
  }

  const { error: insErr } = await db.from("media_items").insert({
    id: mediaId,
    event_id: evento.id,
    tipo: body.tipo,
    autor: body.autor?.trim() || null,
    mensagem: body.mensagem?.trim() || null,
    status: "pendente",
    url_original: path,
  });
  if (insErr) return NextResponse.json({ erro: "Falha ao registrar mídia." }, { status: 500 });

  return NextResponse.json(
    { mediaId, path, uploadUrl: signed.signedUrl, token: signed.token },
    { status: 201 },
  );
}
