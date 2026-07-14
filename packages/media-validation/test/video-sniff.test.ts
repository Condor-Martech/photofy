import { describe, expect, it } from 'vitest';
import { assertVideoAllowed, type VideoProbe } from '../src/video-sniff.js';

const okProbe: VideoProbe = {
  containerFormat: 'mov,mp4,m4a,3gp,3g2,mj2',
  videoCodec: 'h264',
  width: 1080,
  height: 1920,
  durationSec: 9,
};

describe('assertVideoAllowed', () => {
  it('aceita reel h264 vertical dentro dos limites', () => {
    expect(() => assertVideoAllowed(okProbe, { maxDurationSec: 10 })).not.toThrow();
  });

  it('aceita hevc (iOS moderno)', () => {
    expect(() =>
      assertVideoAllowed({ ...okProbe, videoCodec: 'hevc' }, { maxDurationSec: 10 }),
    ).not.toThrow();
  });

  it('rejeita container fora da familia ISOBMFF', () => {
    expect(() =>
      assertVideoAllowed({ ...okProbe, containerFormat: 'matroska,webm' }, { maxDurationSec: 10 }),
    ).toThrowError(/CONTAINER_NOT_ALLOWED|nao e aceito/);
  });

  it('rejeita codec fora da allowlist', () => {
    try {
      assertVideoAllowed({ ...okProbe, videoCodec: 'vp9' }, { maxDurationSec: 10 });
      throw new Error('deveria ter lancado');
    } catch (err) {
      expect((err as { code?: string }).code).toBe('CODEC_NOT_ALLOWED');
    }
  });

  it('rejeita resolucao acima de 8K por frame como RESOLUTION_BOMB', () => {
    try {
      assertVideoAllowed({ ...okProbe, width: 8000, height: 8000 }, { maxDurationSec: 10 });
      throw new Error('deveria ter lancado');
    } catch (err) {
      expect((err as { code?: string }).code).toBe('RESOLUTION_BOMB');
    }
  });

  it('rejeita duracao acima do limite do evento', () => {
    try {
      assertVideoAllowed({ ...okProbe, durationSec: 14 }, { maxDurationSec: 10 });
      throw new Error('deveria ter lancado');
    } catch (err) {
      expect((err as { code?: string }).code).toBe('DURATION_EXCEEDED');
    }
  });
});
