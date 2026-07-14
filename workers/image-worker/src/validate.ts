import sharp, { type Metadata } from 'sharp';
import { fileTypeFromBuffer } from 'file-type';

// 100MP covers any current phone camera (iPhone 48MP, Android 108MP full-res
// already exceeds max_foto_mb=25) while blocking decompression bombs before
// sharp allocates a single byte for the decoded image. Validated in PHF-004.
export const IMAGE_MAX_PIXELS = 100_000_000;

const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
  'image/avif',
]);

export type ValidationCode =
  | 'UNKNOWN_FORMAT'
  | 'UNSUPPORTED_FORMAT'
  | 'PIXEL_BOMB'
  | 'DECODE_ERROR';

export class ValidationError extends Error {
  readonly code: ValidationCode;
  constructor(code: ValidationCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'ValidationError';
  }
}

export interface ImageProbe {
  mime: string;
  format: string;
  width: number;
  height: number;
  pixels: number;
}

export async function validateImage(
  buf: Buffer,
  pixelLimit: number = IMAGE_MAX_PIXELS,
): Promise<ImageProbe> {
  // Layer 1: magic bytes (first ~262 bytes) — real MIME regardless of extension.
  const detected = await fileTypeFromBuffer(buf);
  if (!detected) {
    throw new ValidationError('UNKNOWN_FORMAT', 'Could not detect file format from magic bytes');
  }
  if (!ALLOWED_IMAGE_MIMES.has(detected.mime)) {
    throw new ValidationError(
      'UNSUPPORTED_FORMAT',
      `Format "${detected.mime}" is not accepted (allowed: jpeg, png, heic, heif, webp, avif)`,
    );
  }

  // Layer 2: pixel budget — sharp reads only headers here; over the limit it
  // throws before decoding, so a bomb never gets memory allocated for it.
  let meta: Metadata;
  try {
    meta = await sharp(buf, { limitInputPixels: pixelLimit }).metadata();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('Input image exceeds pixel limit')) {
      throw new ValidationError(
        'PIXEL_BOMB',
        `Image exceeds ${(pixelLimit / 1_000_000).toFixed(0)}MP pixel budget (decompression bomb rejected)`,
      );
    }
    throw new ValidationError('DECODE_ERROR', `Could not read image metadata: ${message}`);
  }

  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  return {
    mime: detected.mime,
    format: meta.format ?? 'unknown',
    width,
    height,
    pixels: width * height,
  };
}
