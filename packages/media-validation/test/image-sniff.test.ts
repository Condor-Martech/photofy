import { describe, expect, it } from 'vitest';
import { sniffImage } from '../src/image-sniff.js';
import { makeJpeg } from './helpers.js';

describe('sniffImage', () => {
  it('le dimensoes de uma foto legitima dentro do budget', async () => {
    const jpeg = await makeJpeg(1600, 1200);
    const probe = await sniffImage(jpeg);
    expect(probe.width).toBe(1600);
    expect(probe.height).toBe(1200);
    expect(probe.pixels).toBe(1600 * 1200);
    expect(probe.format).toBe('jpeg');
  });

  it('rejeita imagem acima do pixel budget como PIXEL_BOMB antes de decodificar', async () => {
    // 2000x2000 = 4MP; com limite artificial de 1MP a sniff deve abortar sem decode.
    const jpeg = await makeJpeg(2000, 2000);
    await expect(sniffImage(jpeg, 1_000_000)).rejects.toMatchObject({
      code: 'PIXEL_BOMB',
    });
  });

  it('rejeita bytes que nao sao imagem decodificavel como DECODE_ERROR', async () => {
    const garbage = Buffer.from('nao sou uma imagem de verdade');
    await expect(sniffImage(garbage)).rejects.toMatchObject({ code: 'DECODE_ERROR' });
  });
});
