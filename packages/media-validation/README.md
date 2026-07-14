# @photofy/media-validation (PHF-032)

Gate **server-side** de validacao que roda **antes de enfileirar** o job de
processamento (BullMQ). Defesa em profundidade sobre o gate client-side (PHF-022)
e as revalidacoes dos workers (PHF-030/031): se qualquer camada reprovar, o
arquivo nunca vira job.

## Camadas (na ordem, barato → caro)

1. **Tamanho** — contra `events.max_foto_mb` / `max_reel_mb`.
2. **Magic bytes** (`file-type`) — MIME real independente de extensao/Content-Type;
   barra binario disfarcado (ELF, PDF, script) e cross-type (imagem enviada como reel).
3. **Antivirus** (`clamd` INSTREAM) — **fail-closed**: clamd inacessivel barra o upload.
4. **foto** → pixel budget (`sharp`, header-only) contra decompression bomb (100MP).
   **reel** → `ffprobe` de container ISOBMFF, codec (h264/hevc), resolucao (≤ 8K/frame)
   e duracao (≤ `max_reel_seg`).

Fundamentos medidos no Spike PHF-004 (`spike/phf-004-validation/findings.md`):
0% falso negativo em bombs, 0% falso positivo em conteudo real de celular.

## Uso (endpoint de confirmacao de upload — PHF-021)

```ts
import { validateUpload, ValidationError } from '@photofy/media-validation';

// depois do upload ao Storage, ANTES de enfileirar no BullMQ:
const buffer = await downloadFromStorage(objectPath);
try {
  await validateUpload({ buffer, tipo, event });
} catch (err) {
  if (err instanceof ValidationError) {
    // falha TECNICA de upload (nao e decisao de moderacao). Nao enfileira.
    // NUNCA carrega semantica de aprovado/reprovado (silencio de moderacao).
    return httpError(422, 'arquivo_invalido');
  }
  throw err;
}
await queue.add('processar', { mediaId }); // so chega aqui se passou no gate
```

## Config

| Env | Default | Uso |
|---|---|---|
| `CLAMD_HOST` | `clamav` | Host do daemon clamd (nome do servico no Swarm) |
| `CLAMD_PORT` | `3310` | Porta INSTREAM do clamd |
| `CLAMD_TIMEOUT_MS` | `15000` | Timeout do scan |

## Testes

`npm test` — magic bytes, pixel budget, sniff de video (logica pura),
antivirus (clamd falso via INSTREAM, deteccao EICAR + fail-closed) e o
orquestrador. `ffprobe`/`clamd` reais sao injetaveis (`ValidateUploadDeps`) para
manter os testes herme­ticos no CI.
