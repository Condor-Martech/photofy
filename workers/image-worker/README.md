# @photofy/image-worker — PHF-030

Worker de processamento assíncrono de **imagem** (Epic 3).

Pipeline por foto: auto-orientação → remoção de EXIF/PII → resize "versão telão"
(≤1920px) + thumbnail (≤400px), com **pixel budget** (100MP) e checagem de magic
bytes como guarda anti *image bomb* antes de qualquer decode pesado (achado do
Spike PHF-004).

## Módulos

- `src/validate.ts` — magic bytes (`file-type`) + pixel budget (`sharp limitInputPixels`).
- `src/process-image.ts` — pipeline puro `processImage(buffer)`; testável sem infra.
- `src/job-handler.ts` — `handleImageJob(data, deps)` orquestra download → processo →
  upload → update. `status` **permanece `pendente`** (nunca antecipa a moderação humana).
  As portas `StoragePort` / `MediaRepo` são injetadas pelo esqueleto de filas (PHF-013).
- `src/worker.ts` — `startImageWorker(deps)`: bootstrap BullMQ da fila `image-processing`.

Retry/backoff e status `erro` isolado são escopo do **PHF-033**, não deste worker.

## Scripts

```bash
npm test        # vitest — cobre o cenário Gherkin de 02-spec.md §5
npm run typecheck
```
