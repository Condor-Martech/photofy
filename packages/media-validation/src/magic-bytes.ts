import { fileTypeFromBuffer } from 'file-type';
import { ValidationError } from './errors.js';

export type MediaKind = 'foto' | 'reel';

// MIMEs reais aceitos por tipo. Derivam de events.formatos_aceitos (default
// '{jpg,png,heic,mp4}') mais os formatos de celular validados no Spike PHF-004
// (heif/webp/avif de iOS/Android, mov de Live Photo/ProRes). A checagem e por
// magic bytes, nunca por extensao ou Content-Type declarado.
export const IMAGE_MIMES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
  'image/avif',
]);

export const VIDEO_MIMES: ReadonlySet<string> = new Set([
  'video/mp4',
  'video/quicktime',
]);

export interface DetectedType {
  mime: string;
  ext: string;
}

// Le apenas os primeiros ~262 bytes para identificar o MIME real do arquivo,
// antes de qualquer decode. Rejeita binarios disfarcados (ELF, PDF, script),
// buffers vazios/truncados e cross-type confusion (imagem enviada como reel).
export async function detectAndAssertType(
  buf: Buffer,
  expected: MediaKind,
): Promise<DetectedType> {
  const detected = await fileTypeFromBuffer(buf);
  if (!detected) {
    throw new ValidationError(
      'UNKNOWN_FORMAT',
      'Nao foi possivel identificar o formato do arquivo pelos magic bytes',
    );
  }

  const allowed = expected === 'foto' ? IMAGE_MIMES : VIDEO_MIMES;
  if (!allowed.has(detected.mime)) {
    const isCrossKind =
      (expected === 'foto' && VIDEO_MIMES.has(detected.mime)) ||
      (expected === 'reel' && IMAGE_MIMES.has(detected.mime));
    if (isCrossKind) {
      throw new ValidationError(
        'TYPE_MISMATCH',
        `Arquivo declarado como "${expected}" mas os magic bytes indicam "${detected.mime}"`,
        detected.mime,
      );
    }
    throw new ValidationError(
      'UNSUPPORTED_FORMAT',
      `Formato "${detected.mime}" nao e aceito para ${expected}`,
      detected.mime,
    );
  }

  return { mime: detected.mime, ext: detected.ext };
}
