import { execFile } from 'node:child_process';

// ffprobe le a duracao real do container em segundos (float). Usado tanto para
// validar o reel de entrada (gate de duracao) quanto para conferir a saida.
export function probeDurationSec(inputPath) {
  return new Promise((resolve, reject) => {
    execFile(
      'ffprobe',
      [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        inputPath,
      ],
      (err, stdout) => {
        if (err) return reject(err);
        const seconds = Number.parseFloat(stdout.trim());
        if (!Number.isFinite(seconds)) {
          return reject(new Error(`ffprobe returned no duration for ${inputPath}`));
        }
        resolve(seconds);
      }
    );
  });
}
