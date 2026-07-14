import sharp, { type Metadata } from 'sharp';
import { ValidationError } from './errors.js';

// 100MP cobre qualquer camera de celular atual (iPhone 48MP; o modo 108MP do
// Android ja passa de max_foto_mb=25 e e barrado antes) enquanto bloqueia
// decompression bombs antes do sharp alocar um unico byte de imagem decodificada.
// Validado no Spike PHF-004.
export const IMAGE_MAX_PIXELS = 100_000_000;

export interface ImageProbe {
  format: string;
  width: number;
  height: number;
  pixels: number;
}

// Le apenas os headers (limitInputPixels faz o sharp abortar antes de decodificar
// se width x height ultrapassar o teto), entao uma bomb nunca ganha memoria.
export async function sniffImage(
  buf: Buffer,
  pixelLimit: number = IMAGE_MAX_PIXELS,
): Promise<ImageProbe> {
  let meta: Metadata;
  try {
    meta = await sharp(buf, { limitInputPixels: pixelLimit }).metadata();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('Input image exceeds pixel limit')) {
      throw new ValidationError(
        'PIXEL_BOMB',
        `Imagem excede o orcamento de ${(pixelLimit / 1_000_000).toFixed(0)}MP (decompression bomb rejeitada)`,
      );
    }
    throw new ValidationError('DECODE_ERROR', `Nao foi possivel ler os metadados da imagem: ${message}`);
  }

  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  return {
    format: meta.format ?? 'unknown',
    width,
    height,
    pixels: width * height,
  };
}
