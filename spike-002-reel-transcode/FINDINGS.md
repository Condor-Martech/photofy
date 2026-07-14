# Spike 2 — Achado: pipeline de transcodificação de reel sob rajada

**Issue:** PHO-2 / PHF-002 · **Branch descartável:** `spike/phf-002-transcode-load-test` (nunca mergeada)
**Pergunta fechada (01-poc-spikes.md):** o worker (BullMQ+Redis, ffmpeg) transcodifica reels de até 75MB
para MP4 H.264 vertical ~1080p (~10-12MB) em tempo aceitável sob rajada de dezenas de envios simultâneos,
sem esgotar o worker (Docker Swarm)?

## Veredito: **NO-GO** no critério literal, com fallback recomendado

95% dos reels **não** ficam prontos em <60s sob rajada de 50 envios verdadeiramente simultâneos, a menos
que o worker tenha ~24 vCPU dedicados — alocação improvável num Swarm self-hosted compartilhado com
Hipermais/VideoFlow. Ver seção "Recomendação" abaixo para o caminho prático.

## Metodologia

Sem acesso a reels reais de eventos do Condor nem às specs de hardware do Swarm atual (a mesma incerteza
que motivou o spike). Trabalhado com:

1. **Fixture sintética**: vídeo vertical 2160×3840@30fps, 10s, ~80MB (`testsrc2` + ruído para entropia alta,
   bitrate ~58Mbps — comparável a uma gravação 4K30 de iPhone). Gerada com `generate-fixture.sh`.
2. **Worker real**: BullMQ + Redis + `ffmpeg` (`worker.js`/`transcode.js`), rodando em container Docker
   (`Dockerfile.worker`) com `--cpus`/`--memory` explícitos para simular limites reais de um serviço no Swarm
   (o dev host não é o host de produção — ceiling do spike, ver "Limitações").
3. **Comando de transcode**: downscale para 1080p vertical, `libx264 -preset veryfast`, bitrate alvo
   8.6Mbps (calculado para ~11MB em 10s) + áudio AAC 128kbps, `-threads` configurável por job.
4. **Carga**: `load-test.js` enfileira N jobs de uma vez (burst real, todos com o mesmo `enqueuedAt`) e mede
   `waitMs` (fila) + `processMs` (ffmpeg) por job via BullMQ `QueueEvents`.
5. **Memória/CPU**: `docker stats` amostrado durante rajadas reais no container.

Host de teste: Mac, 6 cores físicos, 64GB RAM — usado como proxy, não é o host de produção Swarm.

## Dado 1 — tempo de transcode por job (single job, sem contenção)

| vCPU alocado | threads ffmpeg | tempo |
|---|---|---|
| 1 | 1 | 24.9s |
| 2 | 2 | 13.5s |
| 4 | 4 | 7.5s |

Retorno decrescente do multi-threading interno do libx264 (2 vCPU não é 2x mais rápido que 1 vCPU
com a mesma proporção que 4 vCPU é vs 2). **Achado prático**: para N jobs concorrentes, empacotar
`concorrência = nº de cores, 1 thread/job` rende mais throughput agregado do que poucos jobs
fortemente multi-threaded (throughput ≈ `cores/25s` no primeiro modelo vs `cores/30s` no segundo).
`worker.js` usa essa estratégia (`FFMPEG_THREADS=1`, `WORKER_CONCURRENCY=nº de cores`).

## Dado 2 — rajada real (burst), concorrência = nº de cores do container

| vCPU | N (burst) | espera p50 | espera p95 | total p50 | total p95 | total max | % < 60s |
|---|---|---|---|---|---|---|---|
| 2 | 8 | 68.5s | 93.6s | 93.5s | 118.5s | 118.5s | 25% |
| 6 | 12 | 31.8s | 34.4s | 62.1s | 64.3s | 64.3s | 50% |
| **6** | **50** | **137.2s** | **240.6s** | **172.3s** | **270.9s** | **283.0s (4.7min)** | **12%** |

A linha em negrito é o teste literal do critério go/no-go do spike (N=50 simultâneos) na maior
concorrência que o host de dev suporta de verdade (6 cores). Resultado: **12% dos reels em <60s**, p95
de 4 minutos — muito longe da meta de 95% em <60s.

Sob contenção real (vários processos ffmpeg disputando os mesmos cores), cada "lote" de N=cores jobs
leva ~30-32s (vs. 24.9s isolado) — o modelo `batches = ceil(N/cores)` bate com o wall-clock medido em
todos os 3 testes (ex.: 9 lotes × 31.4s ≈ 283s = exatamente o medido em N=50/6vCPU).

## Dado 3 — memória

Pico medido via `docker stats` durante rajada com 6 jobs 100% concorrentes: **2.6GB / 3.5GB (74%)** —
sem OOM, ~430-480MB por job ativo (confirmado tanto num job de 2 threads isolado quanto em 6 jobs de
1 thread simultâneos). Memória escala ~linear com a concorrência, não é o gargalo — **CPU é**.

## Dado 4 — conformidade de tamanho/formato de saída

100% dos outputs (~70 transcodes ao longo dos testes) ficaram em **1080×1920, 10.95MB, 10s** —
dentro da faixa alvo do SPEC (10-12MB). O bitrate-target (8.6Mbps vídeo + 128kbps áudio) é confiável e
não precisa de segunda passada (2-pass) para acertar o tamanho.

## Extrapolação: quantos cores para bater a meta?

Para 95% dos 50 jobs (o 48º em ordem de conclusão) terminar em <60s com lotes de ~31s, ele precisa
cair no máximo no 2º lote → `2 × cores ≥ 48` → **cores ≥ 24**. Memória escala junto: 24 × ~450MB ≈
**10.8GB dedicados** só para este worker. Isso é consistente com os 3 pontos de dado real (C=2, C=6/N=12,
C=6/N=50) — não é só teoria, o modelo bate com o medido nos 3 casos.

24 vCPU + 11GB dedicados a um único serviço worker é uma alocação grande para um Swarm self-hosted que
também roda Hipermais e VideoFlow — não há indicação em nenhum documento do projeto de que esse
hardware exista hoje.

## Limitações do spike (ceiling do achado)

- Fixture sintética (`testsrc2` + ruído), não reels reais de evento — entropia pode diferir de vídeo
  de celular real (rostos, movimento, baixa luz costumam comprimir de forma diferente de padrão de teste).
- Host de dev (6 cores) usado como proxy do Swarm de produção — números absolutos (tempo/job) variam
  com a CPU real; a *forma* do resultado (contenção linear, ~24 cores necessários) deve generalizar,
  mas o valor exato não.
- Não testado: encode acelerado por hardware (VAAPI/QSV/NVENC) — pode mudar o resultado radicalmente
  se o host Swarm tiver GPU/iGPU compatível, mas isso é desconhecido (mesma incerteza que motivou o spike).
- "50 simultâneos" testado é o pior caso matemático (todos no mesmo instante). Tráfego real de upload
  tende a se espalhar por alguns segundos (tempo de rede variável por participante) — não temos dado
  real de evento do Condor para validar o quão espalhado isso é de fato.

## Recomendação (fallback do próprio spike, ajustado ao dado coletado)

1. **Não prometer SLA de latência rígido no telão/moderação.** Adotar o fallback já previsto no spike:
   fila com indicador visual de "processando" no painel de moderação em vez de garantia de <60s. Rajada
   extrema (momento do brinde) processa em minutos, não segundos — aceitável se comunicado na UI.
2. **Provisionar o worker com o máximo de CPU dedicado que o Swarm realmente puder ceder** (mesmo que
   não sejam os ~24 cores ideais) — cada core adicional reduz o tempo de fila proporcionalmente
   (ver Dado 2). Escalar horizontalmente (mais réplicas) ajuda apenas se resultar em mais cores totais
   dedicados à fila `reel-transcode` — não é mágica, é o mesmo total de CPU necessário, só distribuído.
3. **Reduzir o teto de 75MB para 50MB tem efeito limitado** neste achado: o custo de encode é dominado
   pela *resolução* do source (decode+scale+encode de pixels), não pelo tamanho do arquivo em MB. Um
   reel de 50MB ainda pode ser 4K. Se a meta for reduzir tempo de encode, o lever real é **limitar a
   resolução de entrada** (ex. recusar/pré-reduzir source >1080p no cliente antes do upload) — não
   testado neste spike, recomendo como spike de acompanhamento rápido antes de descartar a ideia.
4. **Investigar hardware accel (VAAPI/QSV/NVENC)** se o host Swarm tiver GPU/iGPU — pode reduzir a
   necessidade de 24 cores para algo muito menor. Requer saber o hardware real do Swarm (pergunta em
   aberto, fora do escopo deste spike).
5. Manter a estratégia de empacotamento **1 thread por job, concorrência = nº de cores** (Dado 1) — já
   é o padrão mais eficiente por core testado.

## Artefatos deste spike (branch `spike/phf-002-transcode-load-test`, nunca mergeada)

- `generate-fixture.sh` — gera a fixture sintética
- `transcode.js` / `worker.js` — worker BullMQ+ffmpeg descartável
- `load-test.js` — dispara rajada de N jobs simultâneos e mede fila+processamento
- `Dockerfile.worker` — imagem descartável para os testes com limite de CPU/memória
- `results/*.json` — dados brutos de cada rodada (percentis, tamanhos de output)
