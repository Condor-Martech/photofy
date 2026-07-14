// PHF-021 — validação e helpers do upload de mídia (foto/reel).
// Lógica pura, sem I/O, para ser testável direto contra os cenários Gherkin de 02-spec.md §5.

export type Tipo = "foto" | "reel";

// MIME aceitos por tipo — casa com o allowlist do bucket privado (PHF-012, docs/storage.md).
export const MIME_POR_TIPO: Record<Tipo, readonly string[]> = {
  foto: ["image/jpeg", "image/png", "image/heic", "image/heif"],
  reel: ["video/mp4"],
};

export const AUTOR_MAX = 50;
export const MENSAGEM_MAX = 200;

const MIB = 1024 * 1024;

const EXT_POR_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
  "image/heif": "heif",
  "video/mp4": "mp4",
};

export type UploadInput = {
  tipo: Tipo;
  autor?: string;
  mensagem?: string;
  aceiteTermos: boolean;
  aceiteConteudo: boolean;
  mimeType: string;
  tamanhoBytes: number;
};

export type EventoLimites = { max_foto_mb: number; max_reel_mb: number };

export type Validacao = { ok: true } | { ok: false; erro: string; status: number };

export function extDoMime(mime: string): string | null {
  return EXT_POR_MIME[mime] ?? null;
}

export function caminhoOriginal(eventId: string, mediaId: string, ext: string): string {
  // Escopo por evento no path (PHF-012): <event_id>/<media_id>/original.<ext>
  return `${eventId}/${mediaId}/original.${ext}`;
}

export function validarUpload(input: UploadInput, evento: EventoLimites): Validacao {
  // Gherkin "Botão de envio bloqueado sem aceite": aceite duplo é obrigatório no servidor também.
  if (input.aceiteTermos !== true || input.aceiteConteudo !== true) {
    return { ok: false, erro: "Aceite de termos e de conteúdo é obrigatório.", status: 422 };
  }
  if (input.tipo !== "foto" && input.tipo !== "reel") {
    return { ok: false, erro: "Tipo inválido (use 'foto' ou 'reel').", status: 422 };
  }
  if (!MIME_POR_TIPO[input.tipo].includes(input.mimeType)) {
    return { ok: false, erro: `Formato não aceito para ${input.tipo}.`, status: 422 };
  }
  if ((input.autor?.length ?? 0) > AUTOR_MAX) {
    return { ok: false, erro: `Autor excede ${AUTOR_MAX} caracteres.`, status: 422 };
  }
  if ((input.mensagem?.length ?? 0) > MENSAGEM_MAX) {
    return { ok: false, erro: `Mensagem excede ${MENSAGEM_MAX} caracteres.`, status: 422 };
  }
  const limiteMb = input.tipo === "foto" ? evento.max_foto_mb : evento.max_reel_mb;
  if (!(input.tamanhoBytes > 0)) {
    return { ok: false, erro: "Arquivo vazio.", status: 422 };
  }
  if (input.tamanhoBytes > limiteMb * MIB) {
    return { ok: false, erro: `Arquivo excede o limite de ${limiteMb} MB.`, status: 422 };
  }
  return { ok: true };
}
