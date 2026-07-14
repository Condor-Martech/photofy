import { assertClean, scanBuffer, type ScanFn } from './antivirus.js';
import { ValidationError } from './errors.js';
import { sniffImage, IMAGE_MAX_PIXELS, type ImageProbe } from './image-sniff.js';
import { detectAndAssertType, type MediaKind } from './magic-bytes.js';
import {
  assertVideoAllowed,
  probeVideoBuffer,
  VIDEO_MAX_PIXELS,
  type VideoProbe,
} from './video-sniff.js';

// Subconjunto de events relevante para o gate. Espelha as colunas de `events`
// (02-spec.md secao 3): limites de tamanho e duracao por evento.
export interface EventLimits {
  max_foto_mb: number;
  max_reel_mb: number;
  max_reel_seg: number;
}

export interface ValidateUploadInput {
  buffer: Buffer;
  tipo: MediaKind;
  event: EventLimits;
}

// Injecao de dependencias de I/O para testes herme­ticos (sem clamd/ffprobe reais)
// e para o chamador poder plugar limites customizados.
export interface ValidateUploadDeps {
  scan?: ScanFn;
  probeVideo?: (buf: Buffer) => Promise<VideoProbe>;
  imagePixelLimit?: number;
  videoPixelLimit?: number;
}

export interface ValidatedImage {
  tipo: 'foto';
  mime: string;
  probe: ImageProbe;
}

export interface ValidatedVideo {
  tipo: 'reel';
  mime: string;
  probe: VideoProbe;
}

export type ValidatedMedia = ValidatedImage | ValidatedVideo;

const MB = 1024 * 1024;

// Gate server-side pre-enqueue do PHF-032. Roda depois do upload ao Storage e
// ANTES de criar o job no BullMQ: se qualquer camada reprovar, o arquivo nunca
// vira job. Ordem: barato -> caro. Todas as camadas sao defense-in-depth sobre o
// gate client-side (PHF-022) e as revalidacoes dos workers (PHF-030/031).
//
//   1. Tamanho          — trava barata contra limite por evento.
//   2. Magic bytes      — MIME real; barra binario disfarcado e cross-type.
//   3. Antivirus        — clamd INSTREAM; fail-closed (risco alto).
//   4a. foto -> pixel budget (sharp, header-only) contra decompression bomb.
//   4b. reel -> ffprobe container/codec/resolucao/duracao.
export async function validateUpload(
  input: ValidateUploadInput,
  deps: ValidateUploadDeps = {},
): Promise<ValidatedMedia> {
  const { buffer, tipo, event } = input;

  const maxBytes = (tipo === 'foto' ? event.max_foto_mb : event.max_reel_mb) * MB;
  if (buffer.length > maxBytes) {
    throw new ValidationError(
      'FILE_TOO_LARGE',
      `Arquivo de ${(buffer.length / MB).toFixed(1)}MB excede o limite de ${tipo === 'foto' ? event.max_foto_mb : event.max_reel_mb}MB`,
    );
  }

  const { mime } = await detectAndAssertType(buffer, tipo);

  await assertClean(buffer, deps.scan ?? scanBuffer);

  if (tipo === 'foto') {
    const probe = await sniffImage(buffer, deps.imagePixelLimit ?? IMAGE_MAX_PIXELS);
    return { tipo, mime, probe };
  }

  const probe = await (deps.probeVideo ?? probeVideoBuffer)(buffer);
  assertVideoAllowed(probe, {
    maxDurationSec: event.max_reel_seg,
    pixelLimit: deps.videoPixelLimit ?? VIDEO_MAX_PIXELS,
  });
  return { tipo, mime, probe };
}
