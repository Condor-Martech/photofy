# Spike PHF-003 — Propagação Realtime sob aprovação em lote

**Timebox:** 2 dias · **Branch:** `spike/phf-003-realtime-batch-approval` (descartável, nunca mergeada)

## Pergunta fechada

O Supabase Realtime entrega atualizações de `status = aprovado` para múltiplas
telas + galeria + painel simultaneamente, em poucos segundos, quando dezenas
de itens são aprovados em lote pelo moderador?

## O que foi construído

- `supabase/migrations/20260713000000_realtime_batch_spike.sql` — schema
  mínimo (`events`, `media_items`, índice `(event_id, status)`) com a tabela
  publicada em `supabase_realtime`, espelhando o fanout de `02-spec.md`
  linhas 26-27 (telão + galeria + painel assinam `postgres_changes` filtrado
  por `event_id`). RLS fica fora de escopo — já coberto pelo PHF-001.
- `measure.mjs` — 4 assinantes simulados (`telao-entrada`, `telao-salao`,
  `galeria`, `painel-moderacao`) conectam **uma única vez por evento** via
  `supabase-js` (`postgres_changes`, filtro `event_id=eq.<id>`) e permanecem
  conectados recebendo 3 ondas de aprovação em lote (10, 30, 50 itens), do
  jeito que telão/galeria/painel reais ficam conectados a duração inteira do
  evento — não reconectam a cada lote que o moderador aprova.
- `measure-concurrent-events.mjs` — cobre o outro fator de incerteza citado em
  `01-poc-spikes.md` ("múltiplos eventos ativos simultâneos"): 5 eventos
  concorrentes, 4 assinantes cada (20 conexões Realtime simultâneas), todos
  disparando lote de 50 ao mesmo tempo — pior caso realista (dois eventos do
  Condor no mesmo dia, ambos no "momento do brinde").
- Latência medida = `timestamp de recebimento no cliente − aprovado_em`, onde
  `aprovado_em` é gravado pelo próprio Postgres via `clock_timestamp()` no
  momento do commit do `UPDATE`. Usar o clock do servidor como origem remove
  a incerteza de round-trip do disparo do `UPDATE` do lado do script,
  isolando exatamente o trecho que o spike quer medir: commit → fanout
  Realtime → cliente.
- Ambiente: **Supabase local real via `supabase start`** (Postgres + Realtime
  em Docker, não simulado) — Docker estava disponível neste sandbox, ao
  contrário do PHF-001. Isso permitiu medir o Realtime de verdade, não só a
  lógica de RLS.

## Achados por critério

| # | Critério (01-poc-spikes.md) | Evidência | Status |
|---|---|---|---|
| 1 | Lote de 10 propaga para todos os assinantes | 3 execuções, 120/120 entregas, p95 = 108,5ms | **PASS** (medido) |
| 2 | Lote de 30 propaga para todos os assinantes | 3 execuções, 360/360 entregas, p95 = 152,5ms | **PASS** (medido) |
| 3 | Lote de 50 propaga para todos os assinantes | 3 execuções, 600/600 entregas, p95 = 261,5ms | **PASS** (medido) |
| 4 | Latência < 3s em 95% dos casos até lote de 50 | Pior p95 observado (lote 50) = 261,5ms — **11x** abaixo do limite | **PASS** (medido) |
| 5 | Múltiplos eventos ativos simultâneos (fator de incerteza extra do spike) | 5 eventos × lote 50 × 4 assinantes concorrentes = 1000 entregas, 0 perdidas, p95 = 622ms | **PASS** (medido) |

### Achado colateral (metodológico, não é risco de produção)

Uma primeira versão do script recriava os 4 clientes Realtime a cada rodada
de lote (reconectando do zero a cada aprovação). Nesse desenho, uma rodada
perdeu 60/120 eventos — não por perda de mensagem do Realtime, e sim por
esgotar o rate limit de `joins` do Realtime local (visível em
`Realtime.RateCounter for: {:channel, :joins, ...}` nos logs do container)
sob reconexão rápida e repetida. Ao corrigir o script para manter os
assinantes conectados uma única vez por evento — o que reflete o
comportamento real de telão/galeria/painel, que não reconectam a cada
aprovação — a perda desapareceu (0 em 1080 entregas nas duas suítes). Achado
registrado aqui para não ser redescoberto: **testes de carga do Realtime
devem manter conexões persistentes**, reconectar a cada evento simulado
gera um falso positivo de perda de mensagem.

## Recomendação: **GO**

A pergunta fechada tem resposta direta e medida (não projetada): com
conexões persistentes — o padrão real de uso — o Supabase Realtime entregou
100% das atualizações de aprovação em lote (10, 30 e 50 itens, e também sob 5
eventos concorrentes) com p95 de 108ms a 622ms, muito abaixo do limite de 3s
do critério go/no-go. Não há indício de perda de mensagem nem de lag
perceptível no padrão de fanout descrito em `02-spec.md` (múltiplos
assinantes por evento, múltiplos eventos ativos, aprovação em lote).

Diferença notável em relação ao ADR referenciado em `02-spec.md` linha 40
("Polling puro — mantido como fallback do Spike 3"): a medição não encontrou
motivo para acionar esse fallback em v1. Manter a linha de fallback no
`02-spec.md` como mitigação de risco residual (ex. degradação de rede em
staging/produção real, não coberta por este ambiente local), mas não é
necessário implementá-lo de saída.

## Limitação de ambiente

Medição feita em Supabase local (Docker, mesma máquina que gera a carga),
não em staging real com latência de rede entre continentes/datacenters nem
com volume real de usuários simultâneos na galeria pública (que usa a mesma
tabela mas normalmente via polling/SSR, não Realtime direto — fora do escopo
deste spike). Números absolutos de latência tendem a piorar em rede real; a
margem observada (11x abaixo do limite no pior caso) dá folga considerável,
mas o ideal é 1 medição real em staging antes de fechar o risco por
completo — mesmo racional do PHF-001.

## Próximo passo (fora do escopo deste agente)

1. Rodar `measure.mjs` (ajustando `URL`/`ANON_KEY` para o projeto de
   staging) uma vez contra Supabase real, para confirmar a margem sob rede
   real.
2. Registrar o achado GO em `02-spec.md` (a linha 40 já cita este spike como
   pendente — só falta o achado formal).
3. Implementação de produção (endpoint `decisao-lote`, assinaturas reais de
   telão/galeria/painel) fica para outro agente (backend-core ou
   moderation-realtime), não para este spike.

## Como reproduzir

```bash
cd spikes/phf-003-realtime-batch-approval
npm install
supabase start
node measure.mjs                     # lotes 10/30/50, evento por evento
node measure-concurrent-events.mjs   # 5 eventos concorrentes x lote 50
supabase stop
```
