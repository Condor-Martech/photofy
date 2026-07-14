import net from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { assertClean, scanBuffer } from '../src/antivirus.js';
import { EICAR } from './helpers.js';

// clamd falso: implementa o minimo do protocolo INSTREAM para exercitar o
// framing real do nosso cliente (comando terminado em \0, chunks <len BE><dados>,
// terminador zero). Se o payload acumulado contiver a string EICAR, responde
// FOUND; caso contrario, OK.
function startFakeClamd(): Promise<{ port: number; close: () => Promise<void> }> {
  const server = net.createServer((socket) => {
    let buffer = Buffer.alloc(0);
    let phase: 'cmd' | 'stream' = 'cmd';
    const payload: Buffer[] = [];

    const parse = () => {
      if (phase === 'cmd') {
        const nul = buffer.indexOf(0);
        if (nul < 0) return;
        buffer = buffer.subarray(nul + 1);
        phase = 'stream';
      }
      while (phase === 'stream') {
        if (buffer.length < 4) return;
        const len = buffer.readUInt32BE(0);
        if (len === 0) {
          const data = Buffer.concat(payload);
          const infected = data.includes(Buffer.from(EICAR));
          socket.end(infected ? 'stream: Eicar-Test-Signature FOUND\0' : 'stream: OK\0');
          return;
        }
        if (buffer.length < 4 + len) return;
        payload.push(buffer.subarray(4, 4 + len));
        buffer = buffer.subarray(4 + len);
      }
    };

    socket.on('data', (d) => {
      buffer = Buffer.concat([buffer, d]);
      parse();
    });
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as net.AddressInfo;
      resolve({
        port: address.port,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

let running: { port: number; close: () => Promise<void> } | undefined;

afterEach(async () => {
  if (running) {
    await running.close();
    running = undefined;
  }
});

describe('scanBuffer (INSTREAM)', () => {
  it('reporta clean para conteudo inofensivo', async () => {
    running = await startFakeClamd();
    const result = await scanBuffer(Buffer.from('uma foto qualquer'), {
      host: '127.0.0.1',
      port: running.port,
    });
    expect(result.clean).toBe(true);
  });

  it('detecta a assinatura EICAR e reporta signature', async () => {
    running = await startFakeClamd();
    const result = await scanBuffer(Buffer.from(EICAR), {
      host: '127.0.0.1',
      port: running.port,
    });
    expect(result.clean).toBe(false);
    expect(result.signature).toContain('Eicar');
  });

  it('fail-closed: clamd inacessivel lanca ANTIVIRUS_UNAVAILABLE', async () => {
    // Porta sem listener -> ECONNREFUSED.
    await expect(
      scanBuffer(Buffer.from('x'), { host: '127.0.0.1', port: 1, timeoutMs: 1000 }),
    ).rejects.toMatchObject({ code: 'ANTIVIRUS_UNAVAILABLE' });
  });
});

describe('assertClean', () => {
  it('barra malware com MALWARE_FOUND carregando a assinatura no detail', async () => {
    await expect(
      assertClean(Buffer.from('x'), async () => ({ clean: false, signature: 'Win.Test.EICAR' })),
    ).rejects.toMatchObject({ code: 'MALWARE_FOUND', detail: 'Win.Test.EICAR' });
  });

  it('passa quando o scan retorna clean', async () => {
    await expect(assertClean(Buffer.from('x'), async () => ({ clean: true }))).resolves.toBeUndefined();
  });
});
