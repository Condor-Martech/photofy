# POC / Spikes de risco técnico — Photofy (Fotos e Reels para Eventos)

> Cada spike abaixo corresponde a uma incerteza técnica real (não incluída "por completude"). Código de spike vive em branch `spike/*` e é descartado ao final — só o achado vira decisão registrada no SPEC (`02-spec.md`).

## Spike 1 — Pareamento de telas por dispositivo (Device Authorization Flow)

**Pergunta fechada:** É viável parear uma tela física (TV/tablet, sem teclado) via código temporário (expira em 10 min), com múltiplas telas simultâneas por evento e revogação individual, mantendo a sessão da tela válida por toda a duração de um evento típico (4-8h) sem exigir repareamento manual?

**Por que é incerto:** o padrão é inspirado no OAuth Device Authorization Flow, mas adaptado a um cenário de tela pública sem input — nunca testado nesta combinação (Supabase Realtime + RLS por token de dispositivo). Não sabemos se um token de leitura de longa duração se sustenta por horas sem refresh manual, nem como revogar um dispositivo sem derrubar os demais pareados ao mesmo evento.

**Alcance do spike (timebox 2 dias):** protótipo mínimo — tela solicita código, admin insere no painel para vincular, tela recebe token somente leitura escopado por RLS àquele evento, conecta via Supabase Realtime e permanece recebendo atualizações por > 4h contínuas sem intervenção manual. Testar revogação de um dispositivo sem afetar outro pareado simultaneamente.

**Critério go/no-go:**
- GO se o token/sessão permanece válido (ou se renova automaticamente via heartbeat) por 4-8h sem exigir novo pareamento, e a revogação de um dispositivo não afeta os demais.
- NO-GO → fallback: implementar renovação automática via refresh token de longa duração com heartbeat que renova antes de expirar; se o isolamento por RLS por dispositivo não escalar, usar um canal Realtime único por evento com filtro client-side (menos granular, mas funcional).

## Spike 2 — Pipeline de transcodificação de reel sob rajada

**Pergunta fechada:** O worker (BullMQ + Redis, ffmpeg) consegue transcodificar reels de até 75MB brutos para MP4 H.264 vertical ~1080p (~10-12MB) dentro de um tempo aceitável, mesmo sob rajada de dezenas de reels simultâneos (ex. momento do brinde), sem esgotar os recursos do worker no ambiente self-hosted (Docker Swarm)?

**Por que é incerto:** transcodificação de vídeo é CPU-intensiva; não há dado real de quantos participantes enviam ao mesmo tempo em um evento do Condor, nem de quanto hardware o Swarm atual comporta. Sem teste de carga, não sabemos se a fila atrasa a ponto do reel demorar minutos para aparecer no telão — o que quebraria a experiência de "quase tempo real".

**Alcance do spike (timebox 3 dias):** montar o worker com ffmpeg, rodar teste de carga simulando N reels de ~75MB enfileirados simultaneamente (começar em N=50, ajustar conforme resultado), medir tempo de fila + processamento e uso de CPU/memória do worker.

**Critério go/no-go:**
- GO se 95% dos reels são processados em < 60s mesmo sob rajada de 50 envios simultâneos, sem esgotar a memória do worker.
- NO-GO → fallback: escalar workers horizontalmente (mais réplicas no Swarm), reduzir o teto de entrada (ex. 50MB em vez de 75MB), ou aceitar fila com indicador visual de "processando" na moderação em vez de exigir latência mínima garantida.

## Spike 3 — Propagação em tempo real sob picos de aprovação

**Pergunta fechada:** o Supabase Realtime entrega atualizações de `status = aprovado` para múltiplas telas + galeria + painel de moderação simultaneamente, em poucos segundos, quando dezenas de itens são aprovados em lote pelo moderador?

**Por que é incerto:** ainda não testamos Realtime sob esse padrão de fanout (múltiplos assinantes por evento, múltiplos eventos ativos simultâneos, aprovações em lote) nesta stack. Existe risco de lag perceptível ou perda de mensagens sob carga, o que quebraria a promessa de "aprovação reflete em telão e galeria em segundos".

**Alcance do spike (timebox 2 dias):** protótipo com N assinantes simulados (telão, galeria, painel) recebendo um lote de aprovações disparado por script, medindo latência ponta a ponta em diferentes tamanhos de lote (10, 30, 50 itens).

**Critério go/no-go:**
- GO se a latência de propagação fica abaixo de 3s em 95% dos casos, mesmo com lote de até 50 aprovações.
- NO-GO → fallback: complementar o Realtime com polling curto (2-5s) no cliente, ou aplicar debouncing/paginação nas atualizações para reduzir a carga de eventos por assinante.

## Spike 4 — Validação de conteúdo contra "image bombs" e formatos variados de celular

**Pergunta fechada:** é possível implementar um limite de pixel budget + validação real de magic bytes/container que rejeite de forma confiável arquivos maliciosos (decompression bombs) antes do processamento pesado, sem gerar falsos positivos em fotos/reels legítimos de celular — incluindo formatos HEIC, HDR e 4K?

**Por que é incerto:** formatos de celular modernos variam bastante entre fabricantes (HEIC, ProRes, HDR); ainda não validamos qual biblioteca candidata (ex. sharp/libvips para imagem, ffprobe para vídeo) protege contra decompression bombs sem rejeitar conteúdo real e legítimo enviado por participantes.

**Alcance do spike (timebox 2 dias):** testar a biblioteca candidata contra dois conjuntos: (a) amostra real de fotos/reels de celulares variados (iOS e Android, incluindo HDR/4K), (b) arquivos de teste conhecidos de decompression bomb. Medir taxa de falso positivo e falso negativo.

**Critério go/no-go:**
- GO se 0 bombas conhecidas passam pela validação e a taxa de falso positivo em conteúdo real fica abaixo de 2%.
- NO-GO → fallback: adicionar um limite de dimensão mais conservador + timeout agressivo no worker como camada extra de proteção, aceitando revisão manual dos casos limítrofes sinalizados.
