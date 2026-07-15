// PHF-022 — Validação client-side de tipo (MIME), tamanho e duração antes do upload.
//
// Objetivo: rejeitar no cliente o que o servidor rejeitaria de qualquer forma
// (ex.: reel acima de max_reel_seg), poupando uma ida à rede em conexão instável
// (02-spec.md §5, "Reel fora do limite é rejeitado no cliente").
//
// NÃO é a validação de segurança: magic bytes, sniff de container/codec e antivírus
// são server-side (PHF-032). Aqui é só UX — nunca confiar nisto no backend.

export type MediaTipo = "foto" | "reel";

/** Limites por evento — mesmos campos da tabela `events` (02-spec.md §3). */
export interface EventoLimites {
  formatos_aceitos: string[]; // ex.: ["jpg","png","heic","mp4"]
  max_foto_mb: number;
  max_reel_mb: number;
  max_reel_seg: number;
}

/** Subconjunto de `File`/`Blob` de que precisamos — permite testar sem DOM. */
export interface ArquivoCandidato {
  type: string; // MIME (ex.: "image/jpeg"); pode vir vazio p/ HEIC em alguns browsers
  size: number; // bytes
  name?: string; // fallback p/ extensão quando `type` vem vazio
}

export type ResultadoValidacao =
  | { ok: true; tipo: MediaTipo }
  | { ok: false; erro: string };

// MIME conhecido -> extensão usada em `formatos_aceitos`.
const MIME_PARA_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
  "image/heif": "heic",
  "video/mp4": "mp4",
};

// Extensões tratadas como reel (vídeo). O resto dos formatos aceitos é foto.
// ponytail: só mp4 hoje; se `formatos_aceitos` ganhar outro vídeo, some aqui.
const EXT_REEL = new Set(["mp4"]);

function extensao(arquivo: ArquivoCandidato): string | null {
  const porMime = MIME_PARA_EXT[arquivo.type?.toLowerCase()];
  if (porMime) return porMime;
  // Fallback pelo nome: alguns browsers não setam MIME p/ HEIC de iPhone.
  const ext = arquivo.name?.split(".").pop()?.toLowerCase();
  if (ext === "jpeg") return "jpg";
  return ext ?? null;
}

/**
 * Valida um candidato a upload contra os limites do evento.
 * `duracaoSeg` só é usado p/ reel; passe `undefined` quando não for legível
 * (o servidor valida a duração de forma autoritativa — PHF-031).
 */
export function validarUpload(
  arquivo: ArquivoCandidato,
  limites: EventoLimites,
  duracaoSeg?: number,
): ResultadoValidacao {
  const ext = extensao(arquivo);
  const aceitos = limites.formatos_aceitos.map((f) => f.toLowerCase());

  if (!ext || !aceitos.includes(ext)) {
    return { ok: false, erro: `Formato não suportado. Aceitos: ${aceitos.join(", ")}.` };
  }

  const tipo: MediaTipo = EXT_REEL.has(ext) ? "reel" : "foto";
  const maxMb = tipo === "reel" ? limites.max_reel_mb : limites.max_foto_mb;

  if (arquivo.size > maxMb * 1024 * 1024) {
    const mb = (arquivo.size / (1024 * 1024)).toFixed(1);
    return { ok: false, erro: `Arquivo muito grande (${mb} MB). Limite: ${maxMb} MB.` };
  }

  if (tipo === "reel" && duracaoSeg != null && Number.isFinite(duracaoSeg)) {
    // ponytail: arredonda p/ baixo — um reel "de 10s" que reporta 10,02s (metadados
    // não são exatos) passa; o worker corta em max_reel_seg de qualquer forma (§5).
    if (Math.floor(duracaoSeg) > limites.max_reel_seg) {
      return {
        ok: false,
        erro: `Reel muito longo (${Math.round(duracaoSeg)}s). Limite: ${limites.max_reel_seg} segundos.`,
      };
    }
  }

  return { ok: true, tipo };
}

/**
 * Lê a duração (segundos) de um vídeo no browser sem fazer upload.
 * `<video preload="metadata">` baixa só o cabeçalho, não o arquivo inteiro.
 */
export function lerDuracaoVideo(file: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a duração do vídeo."));
    };
    video.src = url;
  });
}

/** Entrada usada pelo formulário (PHF-020): lê a duração p/ vídeo e valida tudo. */
export async function validarArquivo(
  file: File,
  limites: EventoLimites,
): Promise<ResultadoValidacao> {
  let duracaoSeg: number | undefined;
  if (file.type.startsWith("video/")) {
    try {
      duracaoSeg = await lerDuracaoVideo(file);
    } catch {
      duracaoSeg = undefined; // sem metadados legíveis: o servidor decide (PHF-031)
    }
  }
  return validarUpload(file, limites, duracaoSeg);
}
