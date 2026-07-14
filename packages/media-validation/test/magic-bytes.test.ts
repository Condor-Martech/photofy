import { describe, expect, it } from 'vitest';
import { detectAndAssertType } from '../src/magic-bytes.js';
import { ValidationError } from '../src/errors.js';
import { makeJpeg } from './helpers.js';

describe('detectAndAssertType', () => {
  it('aceita um JPEG legitimo declarado como foto', async () => {
    const jpeg = await makeJpeg(1200, 800);
    const detected = await detectAndAssertType(jpeg, 'foto');
    expect(detected.mime).toBe('image/jpeg');
  });

  it('rejeita binario disfarcado de imagem (ELF): detectado mas nao aceito', async () => {
    // Header ELF (0x7f 'E' 'L' 'F') + lixo. file-type reconhece o MIME real
    // (application/x-elf); como nao esta na allowlist de imagem, e barrado.
    const elf = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00, 0x00]);
    await expect(detectAndAssertType(elf, 'foto')).rejects.toMatchObject({
      code: 'UNSUPPORTED_FORMAT',
    });
  });

  it('rejeita buffer vazio como UNKNOWN_FORMAT', async () => {
    await expect(detectAndAssertType(Buffer.alloc(0), 'foto')).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('rejeita imagem enviada como reel com TYPE_MISMATCH', async () => {
    const jpeg = await makeJpeg(640, 480);
    await expect(detectAndAssertType(jpeg, 'reel')).rejects.toMatchObject({
      code: 'TYPE_MISMATCH',
      detail: 'image/jpeg',
    });
  });
});
