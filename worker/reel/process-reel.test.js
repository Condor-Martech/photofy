import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { processReel, InvalidReelDurationError } from './process-reel.js';
import { probeDurationSec } from './probe.js';

const run = promisify(execFile);
const MB = 1024 * 1024;

let workDir;
let validReel;   // reel valido: vertical, 10s, alta entropia (pior caso de compressao)
let longReel;    // reel fora do limite: 14s

// Fixture sintetica com ruido (testsrc2 + noise), mesma estrategia do Spike PHF-002:
// alta entropia forca o encode a encher o bitrate alvo, reproduzindo o pior caso real.
function generateReel(outPath, { size, durationSec, entropy }) {
  const inputs = [
    '-f', 'lavfi', '-i', `testsrc2=size=${size}:rate=30:duration=${durationSec}`,
    '-f', 'lavfi', '-i', `anoisesrc=d=${durationSec}:c=pink:r=48000:a=0.5`,
  ];
  const filter = entropy ? ['-vf', 'noise=alls=25:allf=t+u'] : [];
  const bitrate = entropy ? ['-b:v', '40M', '-maxrate', '45M', '-bufsize', '20M'] : ['-b:v', '2M'];
  return run('ffmpeg', [
    '-y', ...inputs, ...filter,
    '-c:v', 'libx264', '-preset', 'veryfast', ...bitrate, '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', outPath,
  ]);
}

before(async () => {
  workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phf031-'));
  validReel = path.join(workDir, 'valid.mp4');
  longReel = path.join(workDir, 'long.mp4');
  await generateReel(validReel, { size: '1080x1920', durationSec: 10, entropy: true });
  await generateReel(longReel, { size: '720x1280', durationSec: 14, entropy: false });
});

after(() => {
  fs.rmSync(workDir, { recursive: true, force: true });
});

// Gherkin (02-spec.md §5) — Feature: Processamento assincrono de midia
//   Scenario: Reel e transcodificado para o padrao do telao
test('reel valido: transcodifica para MP4 H.264 vertical ~1080p, 10-12MB, <=10s', async () => {
  const outputPath = path.join(workDir, 'out.mp4');
  const result = await processReel({ inputPath: validReel, outputPath, maxDurationSec: 10 });

  // MP4 H.264 vertical ~1080p
  const { stdout } = await run('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=codec_name,width,height',
    '-of', 'default=noprint_wrappers=1:nokey=1', outputPath,
  ]);
  const [codec, width, height] = stdout.trim().split('\n');
  assert.equal(codec, 'h264');
  assert.equal(Number(width), 1080);
  assert.equal(Number(height), 1920);
  assert.ok(Number(height) > Number(width), 'saida deve ser vertical');

  // Tamanho entre 10 e 12MB (faixa alvo do SPEC; banda com folga p/ variacao de entropia)
  const outputMB = result.bytes / MB;
  assert.ok(outputMB >= 9 && outputMB <= 12, `tamanho ${outputMB.toFixed(2)}MB fora de 9-12MB`);

  // Duracao do resultado nao excede 10s (epsilon de arredondamento de container)
  assert.ok(result.outputDurationSec <= 10.1, `duracao ${result.outputDurationSec}s excede 10s`);
});

// Gate de duracao no servidor (titulo PHF-031: "validacao de duracao"): defesa em
// profundidade contra reel fora do limite que burle a validacao client-side (PHF-022).
test('reel fora do limite: rejeitado sem gastar encode e sem gerar saida', async () => {
  const outputPath = path.join(workDir, 'long-out.mp4');
  await assert.rejects(
    () => processReel({ inputPath: longReel, outputPath, maxDurationSec: 10 }),
    (err) => {
      assert.ok(err instanceof InvalidReelDurationError);
      assert.equal(err.code, 'INVALID_DURATION');
      assert.ok(err.durationSec > 10);
      return true;
    }
  );
  assert.equal(fs.existsSync(outputPath), false, 'nao deve gerar saida para reel invalido');
});

test('probeDurationSec le a duracao real do container', async () => {
  const seconds = await probeDurationSec(validReel);
  assert.ok(Math.abs(seconds - 10) < 0.2, `duracao ${seconds}s deveria ser ~10s`);
});
