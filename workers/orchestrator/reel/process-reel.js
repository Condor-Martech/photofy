import fs from 'node:fs';
import { probeDurationSec } from './probe.js';
import { transcodeReel } from './transcode.js';

// Gate de duracao no servidor: a validacao client-side (PHF-022) pode ser burlada,
// entao o worker reconfere a duracao real do arquivo antes de gastar CPU de encode.
export class InvalidReelDurationError extends Error {
  constructor(durationSec, maxDurationSec) {
    super(`reel duration ${durationSec}s exceeds max ${maxDurationSec}s`);
    this.name = 'InvalidReelDurationError';
    this.code = 'INVALID_DURATION';
    this.durationSec = durationSec;
    this.maxDurationSec = maxDurationSec;
  }
}

// O cliente ja limita em max_reel_seg; este gate e defesa em profundidade contra
// violacoes grosseiras, nao precisao sub-segundo. A tolerancia absorve arredondamento
// de container/probe de um reel gravado "exatamente" no limite.
const DURATION_TOLERANCE_SEC = 0.5;

// Processa um reel: valida duracao e transcodifica para o padrao do telao.
// Queue-agnostico de proposito -- o worker BullMQ (PHF-013) mapeia job.data -> estes
// argumentos e o resultado -> media_items (url_processada, status). Contrato de erro:
// - InvalidReelDurationError  -> media_items.status = 'erro' (isolado p/ reprocesso
//   manual; NUNCA notificar o participante, regra de dominio do CLAUDE.md).
// - qualquer erro de transcode -> propagado; o retry/backoff e status 'erro' sao
//   responsabilidade do PHF-033.
export async function processReel({ inputPath, outputPath, maxDurationSec }) {
  const inputDurationSec = await probeDurationSec(inputPath);
  if (inputDurationSec > maxDurationSec + DURATION_TOLERANCE_SEC) {
    throw new InvalidReelDurationError(inputDurationSec, maxDurationSec);
  }

  await transcodeReel(inputPath, outputPath);

  const { size: bytes } = fs.statSync(outputPath);
  const outputDurationSec = await probeDurationSec(outputPath);
  return { outputPath, inputDurationSec, outputDurationSec, bytes };
}
