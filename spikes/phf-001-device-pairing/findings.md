# Spike PHF-001 — Pareamento de tela por dispositivo (Device Authorization Flow)

**Timebox:** 2 dias · **Branch:** `spike/phf-001-device-pairing` (descartável, nunca mergeada)

## Pergunta fechada

É viável parear uma tela sem teclado via código temporário (expira 10 min), com
múltiplas telas simultâneas por evento, revogação individual, e sessão válida
por 4-8h sem repareamento manual?

## O que foi construído

- `supabase/migrations/20260713000000_device_pairing_spike.sql` — schema mínimo
  (`events`, `devices`, `media_items`) + RLS espelhando `02-spec.md` §3, com uma
  decisão de design central: a policy **reconsulta `devices.status` a cada
  request** via `device_is_active()`/`device_event_id()`, em vez de confiar
  apenas na claim `device_id` do JWT. Isso significa que revogação é imediata —
  não depende de o token expirar ou de round-trip de refresh.
- `test-rls.mjs` — executa esse schema (tabelas + funções reais da migration)
  contra Postgres in-memory (`pg-mem`) e valida os 4 pontos da pergunta com
  SQL de verdade, não com lógica reimplementada em JS. **6/6 checks OK.**

## Limitação de ambiente (importante, leia antes do go/no-go)

Este sandbox não tem daemon Docker acessível (`docker info` trava sem
responder) nem credenciais de projeto Supabase — não foi possível rodar
`supabase start` nem testar o Realtime de verdade. Duas consequências:

1. **RLS em si não foi exercitado** — `pg-mem` não implementa `ENABLE ROW LEVEL
   SECURITY` / `CREATE POLICY` (limitação conhecida da lib). O teste aplica
   manualmente o mesmo predicado SQL da policy, usando as funções reais da
   migration. Isso valida a *lógica de autorização* com SQL real, mas não o
   encanamento nativo do RLS do Postgres — que é feature madura e amplamente
   testada da própria engine, não o risco deste spike.
2. **Sem soak test de 4-8h contínuas** — não dá para medir isso num sandbox de
   execução curta. A conclusão sobre duração de sessão vem de análise de
   protocolo (abaixo), não de medição empírica.

Isso não invalida o achado, mas rebaixa a confiança de "medido" para "projetado
e logicamente verificado" nos itens 3 e 4. Recomendo 1 soak test real em
staging (usar esta mesma migration) antes de fechar o risco por completo —
ver "Próximo passo" no final.

## Achados por critério

| # | Critério (01-poc-spikes.md) | Evidência | Status |
|---|---|---|---|
| 1 | Código temporário expira em 10 min | `devices.code_expires_at default now() + interval '10 minutes'` — checagem de expiração é uma comparação de timestamp simples, sem parte incerta | Verificado (schema) |
| 2 | Múltiplas telas simultâneas por evento | Teste: 2 devices (`entrada`, `salao-principal`) pareados ao mesmo `event_id`, ambos leem `media_items` do evento independentemente | **PASS** (SQL real) |
| 3 | Revogação individual sem afetar as demais | Teste: revogar `entrada` → perde acesso imediatamente; `salao-principal` continua com acesso total | **PASS** (SQL real) |
| 4 | Sessão válida 4-8h sem repareamento manual | JWT HS256 assinado com `exp = iat + 8h`; testado que um device revogado com token *ainda dentro do exp* continua bloqueado — a policy nunca olha para o `exp` do token, só para `devices.status` no banco. Duração real do socket Realtime por 4-8h **não foi medida** (ver limitação acima) | Projetado + verificado por lógica; **não medido em runtime real** |

## Recomendação: **GO condicional**

O desenho responde à pergunta fechada: revogação individual funciona porque a
autorização é sempre live (reconsulta `devices` a cada leitura), não presa ao
ciclo de vida do JWT — logo um token de 8h não é um risco de "não consigo
revogar". Isso é o ponto que mais preocupava no `01-poc-spikes.md` ("como
revogar um dispositivo sem derrubar os demais") e está resolvido por
construção, não por sorte de teste.

Condição para fechar o risco por completo: rodar esta mesma migration em um
Supabase real (local via `supabase start` com Docker, ou projeto de staging) e
confirmar que uma conexão Realtime com este token de 8h sobrevive à janela
completa de um evento sem exigir reconexão manual — o heartbeat do
`supabase-js` (~30s) deveria bastar, mas isso depende de timeouts de
infraestrutura (proxy/load balancer) que só um teste real revela.

## Próximo passo (fora do escopo deste agente)

1. Rodar `test-rls.mjs` + um teste de Realtime real em staging (ambiente com
   Docker/projeto Supabase disponível) por >4h contínuas.
2. Se confirmado, registrar a decisão em `02-spec.md` (ADR já referencia esse
   desenho na linha 11 — só falta o achado formal do spike).
3. Implementação de produção fica para outro agente (backend-core), não para
   este spike.
