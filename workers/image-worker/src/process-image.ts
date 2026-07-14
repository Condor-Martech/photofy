import sharp from 'sharp';
import { validateImage } from './validate.js';

// "versao telao": longest edge fits a 1080p telao without wasting bytes; the
// slideshow never needs more than this. Thumbnail feeds the moderation list.
export const TELAO_MAX_EDGE = 1920;
export const THUMB_MAX_EDGE = 400;
const TELAO_QUALITY = 82;
const THUMB_QUALITY = 70;

export interface ProcessedImage {
  telao: Buffer;
  thumbnail: Buffer;
  width: number;
  height: number;
  exifRemoved: true;
}

export async function processImage(input: Buffer): Promise<ProcessedImage> {
  // Guard before any heavy decode (pixel budget + magic bytes, PHF-004).
  await validateImage(input);

  // .rotate() with no args bakes the EXIF orientation into the pixels; sharp
  // drops all input metadata on output by default, so EXIF/GPS PII never
  // survives into url_processada or url_thumb.
  const oriented = sharp(input).rotate();

  const telao = await oriented
    .clone()
    .resize(TELAO_MAX_EDGE, TELAO_MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: TELAO_QUALITY })
    .toBuffer();

  const thumbnail = await oriented
    .clone()
    .resize(THUMB_MAX_EDGE, THUMB_MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: THUMB_QUALITY })
    .toBuffer();

  const meta = await sharp(telao).metadata();

  return {
    telao,
    thumbnail,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    exifRemoved: true,
  };
}
