import { spawn } from 'node:child_process';

// Parametros confirmados pelo Spike PHF-002 (spike-002-reel-transcode/FINDINGS.md):
// reel bruto ate 75MB / ate 10s / vertical -> MP4 H.264 vertical ~1080p, alvo 10-12MB.
// bitrate = tamanho_alvo_bits / duracao: 11MB * 8 / 10s ~= 8.8Mbps; reserva 128kbps
// de audio -> ~8.6Mbps de video. O spike mediu 100% dos outputs em 1080x1920, ~10.95MB,
// 10s -- sem necessidade de 2-pass.
export const TARGET_VIDEO_BITRATE_KBPS = Number(process.env.REEL_VIDEO_BITRATE_KBPS || 8600);
export const TARGET_AUDIO_BITRATE_KBPS = Number(process.env.REEL_AUDIO_BITRATE_KBPS || 128);

// Spike Dado 1: throughput agregado maximo com 1 thread por job e concorrencia = nº
// de cores do container, em vez de poucos jobs fortemente multi-threaded. A concorrencia
// e responsabilidade do worker (PHF-013); aqui fixamos 1 thread por processo ffmpeg.
const FFMPEG_THREADS = Number(process.env.REEL_FFMPEG_THREADS || 1);

export function transcodeReel(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-i', inputPath,
      '-vf', 'scale=-2:1920:force_original_aspect_ratio=decrease',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-threads', String(FFMPEG_THREADS),
      '-b:v', `${TARGET_VIDEO_BITRATE_KBPS}k`,
      '-maxrate', `${Math.round(TARGET_VIDEO_BITRATE_KBPS * 1.2)}k`,
      '-bufsize', `${TARGET_VIDEO_BITRATE_KBPS * 2}k`,
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', `${TARGET_AUDIO_BITRATE_KBPS}k`,
      '-movflags', '+faststart',
      // Privacidade/LGPD: re-encode ja descarta a maior parte, mas -map_metadata -1
      // garante que geolocalizacao/modelo de dispositivo do source nao vaze para a saida.
      '-map_metadata', '-1',
      outputPath,
    ];

    const proc = spawn('ffmpeg', args);
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve({ outputPath });
      else reject(new Error(`ffmpeg exit ${code}\n${stderr.slice(-2000)}`));
    });
  });
}
