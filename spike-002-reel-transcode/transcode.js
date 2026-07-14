import { spawn } from 'node:child_process';

// Cenario SPEC: reel bruto ate 75MB, ate 10s, vertical 9:16 -> MP4 H.264 vertical
// ~1080p, alvo 10-12MB. bitrate = tamanho_alvo_bits / duracao.
// 11MB * 8 / 10s ~= 8.8Mbps video; reserva 128kbps pra audio -> ~8.6Mbps video.
export const TARGET_VIDEO_BITRATE_KBPS = 8600;
export const TARGET_AUDIO_BITRATE_KBPS = 128;

// -threads limita cada processo ffmpeg a N threads -- sem isso, cada job tenta
// usar todos os cores da maquina/container, o que faz N jobs concorrentes se
// disputarem CPU de forma imprevisivel (nao reflete um container com CPU limit
// real do Swarm, onde o kernel throttla, nao redistribui threads de graca).
const FFMPEG_THREADS = Number(process.env.FFMPEG_THREADS || 0); // 0 = ffmpeg decide

export function transcodeReel(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-i', inputPath,
      '-vf', "scale=-2:1920:force_original_aspect_ratio=decrease",
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      ...(FFMPEG_THREADS > 0 ? ['-threads', String(FFMPEG_THREADS)] : []),
      '-b:v', `${TARGET_VIDEO_BITRATE_KBPS}k`,
      '-maxrate', `${Math.round(TARGET_VIDEO_BITRATE_KBPS * 1.2)}k`,
      '-bufsize', `${TARGET_VIDEO_BITRATE_KBPS * 2}k`,
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', `${TARGET_AUDIO_BITRATE_KBPS}k`,
      '-movflags', '+faststart',
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
