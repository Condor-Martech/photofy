import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { processImage, TELAO_MAX_EDGE, THUMB_MAX_EDGE } from '../src/process-image.js';
import { validateImage, ValidationError } from '../src/validate.js';

// A photo carrying EXIF orientation + PII-ish tags, oversized so resize kicks in.
async function makePhotoWithExif(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 120, g: 80, b: 200 } },
  })
    .withMetadata({ orientation: 6, exif: { IFD0: { Copyright: 'Ana', Artist: 'participant' } } })
    .jpeg()
    .toBuffer();
}

describe('processImage', () => {
  it('removes EXIF and normalizes orientation', async () => {
    const input = await makePhotoWithExif(3000, 2000);

    const result = await processImage(input);
    expect(result.exifRemoved).toBe(true);

    const telaoMeta = await sharp(result.telao).metadata();
    expect(telaoMeta.exif).toBeUndefined();
    expect(telaoMeta.orientation ?? 1).toBe(1);
    expect(telaoMeta.format).toBe('jpeg');
  });

  it('resizes the telao version within the 1920px budget without enlarging', async () => {
    const input = await makePhotoWithExif(3000, 2000);
    const { telao } = await processImage(input);
    const meta = await sharp(telao).metadata();
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(TELAO_MAX_EDGE);
  });

  it('produces a small thumbnail', async () => {
    const input = await makePhotoWithExif(3000, 2000);
    const { thumbnail } = await processImage(input);
    const meta = await sharp(thumbnail).metadata();
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(THUMB_MAX_EDGE);
  });

  it('does not enlarge a photo smaller than the thumbnail budget', async () => {
    const small = await sharp({
      create: { width: 200, height: 150, channels: 3, background: { r: 10, g: 10, b: 10 } },
    })
      .jpeg()
      .toBuffer();
    const { thumbnail } = await processImage(small);
    const meta = await sharp(thumbnail).metadata();
    expect(meta.width).toBe(200);
    expect(meta.height).toBe(150);
  });
});

describe('validateImage (pixel budget + magic bytes)', () => {
  it('rejects an image over the pixel budget as a bomb', async () => {
    const img = await sharp({
      create: { width: 2000, height: 2000, channels: 3, background: { r: 1, g: 1, b: 1 } },
    })
      .png()
      .toBuffer();
    await expect(validateImage(img, 1_000_000)).rejects.toMatchObject({ code: 'PIXEL_BOMB' });
  });

  it('rejects a non-image buffer via magic bytes', async () => {
    const notImage = Buffer.from('this is plain text pretending to be an image, no magic bytes here');
    await expect(validateImage(notImage)).rejects.toBeInstanceOf(ValidationError);
  });
});
