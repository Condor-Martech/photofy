import net from 'node:net';
import { ValidationError } from './errors.js';

export interface ClamdOptions {
  host?: string;
  port?: number;
  timeoutMs?: number;
  // Maior chunk enviado por vez no INSTREAM. Precisa ficar abaixo do
  // StreamMaxLength do clamd (default 25MB); 64KB e conservador e seguro.
  chunkSize?: number;
}

export interface ScanResult {
  clean: boolean;
  signature?: string;
}

// Assina INSTREAM do clamd. Fail-closed por design (risco alto): se o clamd
// estiver inacessivel, lanca ANTIVIRUS_UNAVAILABLE para o chamador barrar o
// upload — nunca deixa passar um arquivo nao escaneado.
export type ScanFn = (buf: Buffer) => Promise<ScanResult>;

function clamdConfig(opts: ClamdOptions = {}): Required<ClamdOptions> {
  return {
    host: opts.host ?? process.env.CLAMD_HOST ?? 'clamav',
    port: opts.port ?? Number(process.env.CLAMD_PORT ?? 3310),
    timeoutMs: opts.timeoutMs ?? Number(process.env.CLAMD_TIMEOUT_MS ?? 15_000),
    chunkSize: opts.chunkSize ?? 64 * 1024,
  };
}

// Protocolo INSTREAM: "zINSTREAM\0" seguido de <len BE 4 bytes><dados> por chunk
// e um length zero (0x00000000) para encerrar. Resposta: "stream: OK" ou
// "stream: <assinatura> FOUND".
export function scanBuffer(buf: Buffer, opts: ClamdOptions = {}): Promise<ScanResult> {
  const cfg = clamdConfig(opts);

  return new Promise<ScanResult>((resolve, reject) => {
    const socket = net.createConnection({ host: cfg.host, port: cfg.port });
    const chunks: Buffer[] = [];
    let settled = false;

    const fail = (message: string, detail?: string) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(new ValidationError('ANTIVIRUS_UNAVAILABLE', message, detail));
    };

    socket.setTimeout(cfg.timeoutMs);
    socket.on('timeout', () => fail('Timeout ao falar com o clamd'));
    socket.on('error', (err) => fail(`Falha de conexao com o clamd: ${err.message}`));

    socket.on('connect', () => {
      socket.write('zINSTREAM\0');
      for (let offset = 0; offset < buf.length; offset += cfg.chunkSize) {
        const slice = buf.subarray(offset, offset + cfg.chunkSize);
        const header = Buffer.alloc(4);
        header.writeUInt32BE(slice.length, 0);
        socket.write(header);
        socket.write(slice);
      }
      const terminator = Buffer.alloc(4);
      terminator.writeUInt32BE(0, 0);
      socket.write(terminator);
    });

    socket.on('data', (data) => chunks.push(data));

    socket.on('end', () => {
      if (settled) return;
      settled = true;
      const reply = Buffer.concat(chunks).toString('utf8').replace(/\0/g, '').trim();
      if (/\bOK$/.test(reply)) {
        resolve({ clean: true });
        return;
      }
      const found = reply.match(/^stream:\s+(.*)\s+FOUND$/);
      if (found) {
        resolve({ clean: false, signature: found[1] });
        return;
      }
      // Resposta ERROR ou desconhecida: fail-closed.
      reject(new ValidationError('ANTIVIRUS_UNAVAILABLE', `Resposta inesperada do clamd: "${reply}"`));
    });
  });
}

// Aplica o resultado do scan como gate. Malware -> MALWARE_FOUND (barra o upload,
// registra assinatura no detail para observabilidade, nunca expoe ao participante).
export async function assertClean(buf: Buffer, scan: ScanFn = scanBuffer): Promise<void> {
  const result = await scan(buf);
  if (!result.clean) {
    throw new ValidationError(
      'MALWARE_FOUND',
      'Arquivo reprovado no scan antivirus',
      result.signature,
    );
  }
}
