import { describe, expect, it, vi } from 'vitest';
import { validateUpload, type EventLimits } from '../src/validate-upload.js';
import type { VideoProbe } from '../src/video-sniff.js';
import { makeJpeg, EICAR } from './helpers.js';

const EVENT: EventLimits = { max_foto_mb: 25, max_reel_mb: 75, max_reel_seg: 10 };

const clean = async () => ({ clean: true as const });

const reelProbe: VideoProbe = {
  containerFormat: 'mov,mp4,m4a,3gp,3g2,mj2',
  videoCodec: 'h264',
  width: 1080,
  height: 1920,
  durationSec: 9,
};

describe('validateUpload — gate pre-enqueue', () => {
  // Gherkin §5: "Envio de foto valida" — a foto legitima passa no gate e pode
  // seguir para media_items (status pendente) e enfileiramento.
  it('aprova uma foto legitima dentro dos limites', async () => {
    const jpeg = await makeJpeg(1200, 900);
    const result = await validateUpload(
      { buffer: jpeg, tipo: 'foto', event: EVENT },
      { scan: clean },
    );
    expect(result).toMatchObject({ tipo: 'foto', mime: 'image/jpeg' });
  });

  // Gherkin §5: "Reel dentro do limite e aceito para processamento" — reel h264
  // vertical de 9s passa e seria enfileirado para transcodificacao.
  it('aprova um reel h264 vertical dentro do limite de duracao', async () => {
    const fakeReel = Buffer.concat([
      Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]), // ftyp box
      Buffer.from('mp42'),
      Buffer.alloc(64),
    ]);
    const result = await validateUpload(
      { buffer: fakeReel, tipo: 'reel', event: EVENT },
      { scan: clean, probeVideo: async () => reelProbe },
    );
    expect(result).toMatchObject({ tipo: 'reel', mime: 'video/mp4' });
  });

  it('barra malware antes de qualquer sniff pesado (MALWARE_FOUND)', async () => {
    const jpeg = await makeJpeg(800, 600);
    const infected = Buffer.concat([jpeg, Buffer.from(EICAR)]);
    const probeSpy = vi.fn(async () => reelProbe);
    await expect(
      validateUpload(
        { buffer: infected, tipo: 'foto', event: EVENT },
        { scan: async () => ({ clean: false, signature: 'Eicar-Test-Signature' }) },
      ),
    ).rejects.toMatchObject({ code: 'MALWARE_FOUND' });
    expect(probeSpy).not.toHaveBeenCalled();
  });

  it('rejeita imagem enviada como reel (TYPE_MISMATCH) sem chamar antivirus', async () => {
    const jpeg = await makeJpeg(640, 480);
    const scanSpy = vi.fn(clean);
    await expect(
      validateUpload({ buffer: jpeg, tipo: 'reel', event: EVENT }, { scan: scanSpy }),
    ).rejects.toMatchObject({ code: 'TYPE_MISMATCH' });
    expect(scanSpy).not.toHaveBeenCalled();
  });

  it('rejeita arquivo acima do limite de MB do evento (FILE_TOO_LARGE)', async () => {
    const jpeg = await makeJpeg(400, 400);
    await expect(
      validateUpload(
        { buffer: jpeg, tipo: 'foto', event: { ...EVENT, max_foto_mb: 0 } },
        { scan: clean },
      ),
    ).rejects.toMatchObject({ code: 'FILE_TOO_LARGE' });
  });
});
