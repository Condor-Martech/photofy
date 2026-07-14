import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { ValidationError } from './errors.js';

const execFileAsync = promisify(execFile);

// 8K por frame (7680x4320). Reels reais de celular vao ate 4K; acima de 8K e
// sinal de video-bomb ou arquivo forjado. Spike PHF-004 recomenda esse teto.
export const VIDEO_MAX_PIXELS = 7680 * 4320;

// Codecs de video aceitos: h264 (universal) e hevc/h265 (iOS moderno). O reel de
// saida e sempre H.264 (PHF-031), mas o container de entrada de celular costuma
// vir em HEVC — aceitamos para nao gerar falso positivo.
export const ALLOWED_VIDEO_CODECS: ReadonlySet<string> = new Set(['h264', 'hevc']);

// Containers ISOBMFF aceitos. ffprobe reporta "mov,mp4,m4a,3gp,3g2,mj2" como um
// unico format_name para toda a familia ISOBMFF; basta um dos tokens bater.
export const ALLOWED_CONTAINER_TOKENS: ReadonlySet<string> = new Set([
  'mp4',
  'mov',
  'm4a',
  '3gp',
]);

export interface VideoProbe {
  containerFormat: string;
  videoCodec: string;
  width: number;
  height: number;
  durationSec: number;
}

export interface VideoLimits {
  maxDurationSec: number;
  pixelLimit?: number;
}

// Decisao pura sobre um probe ja obtido — testavel sem ffprobe. Aplica as tres
// travas: container ISOBMFF, codec na allowlist e resolucao por frame <= 8K.
export function assertVideoAllowed(probe: VideoProbe, limits: VideoLimits): void {
  const tokens = probe.containerFormat.split(',').map((t) => t.trim());
  if (!tokens.some((t) => ALLOWED_CONTAINER_TOKENS.has(t))) {
    throw new ValidationError(
      'CONTAINER_NOT_ALLOWED',
      `Container "${probe.containerFormat}" nao e aceito (esperado mp4/mov)`,
      probe.containerFormat,
    );
  }

  if (!ALLOWED_VIDEO_CODECS.has(probe.videoCodec)) {
    throw new ValidationError(
      'CODEC_NOT_ALLOWED',
      `Codec de video "${probe.videoCodec}" nao e aceito (esperado h264/hevc)`,
      probe.videoCodec,
    );
  }

  const pixelLimit = limits.pixelLimit ?? VIDEO_MAX_PIXELS;
  if (probe.width * probe.height > pixelLimit) {
    throw new ValidationError(
      'RESOLUTION_BOMB',
      `Video de ${probe.width}x${probe.height} excede o teto de ${pixelLimit} pixels por frame`,
    );
  }

  if (probe.durationSec > limits.maxDurationSec) {
    throw new ValidationError(
      'DURATION_EXCEEDED',
      `Duracao de ${probe.durationSec}s excede o limite de ${limits.maxDurationSec}s`,
    );
  }
}

interface FfprobeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
}

interface FfprobeOutput {
  streams?: FfprobeStream[];
  format?: { format_name?: string; duration?: string };
}

// I/O: escreve o buffer num arquivo temporario (MP4/MOV precisam de input
// seekable — nao funciona confiavelmente por pipe) e roda ffprobe -show_format
// -show_streams em JSON. Limpa o temp no finally.
export async function probeVideoBuffer(buf: Buffer): Promise<VideoProbe> {
  const dir = await mkdtemp(join(tmpdir(), 'phf032-'));
  const path = join(dir, 'input');
  try {
    await writeFile(path, buf);
    let stdout: string;
    try {
      ({ stdout } = await execFileAsync('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=format_name,duration:stream=codec_type,codec_name,width,height',
        '-of', 'json',
        path,
      ]));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ValidationError('PROBE_ERROR', `ffprobe falhou ao ler o video: ${message}`);
    }

    const parsed = JSON.parse(stdout) as FfprobeOutput;
    const video = parsed.streams?.find((s) => s.codec_type === 'video');
    if (!video) {
      throw new ValidationError('PROBE_ERROR', 'Nenhum stream de video encontrado no arquivo');
    }

    const durationSec = Number.parseFloat(parsed.format?.duration ?? '');
    if (!Number.isFinite(durationSec)) {
      throw new ValidationError('PROBE_ERROR', 'ffprobe nao retornou duracao do container');
    }

    return {
      containerFormat: parsed.format?.format_name ?? 'unknown',
      videoCodec: video.codec_name ?? 'unknown',
      width: video.width ?? 0,
      height: video.height ?? 0,
      durationSec,
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
