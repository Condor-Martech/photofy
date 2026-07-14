import sharp from 'sharp';

// Gera um JPEG real (magic bytes validos) de WxH. Usado como fixture de foto
// legitima e, com dimensoes grandes + pixelLimit baixo, como proxy de pixel bomb.
export function makeJpeg(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 120, g: 80, b: 200 },
    },
  })
    .jpeg()
    .toBuffer();
}

export function makePng(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 4, background: { r: 10, g: 20, b: 30, alpha: 1 } },
  })
    .png()
    .toBuffer();
}

// String EICAR: payload de teste padrao da industria que todo antivirus detecta
// como virus sem ser malware real. Split para nao disparar o scanner do proprio
// ambiente de dev/CI ao ler este arquivo.
export const EICAR =
  'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
