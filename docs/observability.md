# Observabilidade — Logs de acesso/auditoria e alertas de anomalia (PHF-082)

Cobre o não-funcional **Observabilidade** de `02-spec.md` §6 — "Logs de moderação, métricas de
fila, alertas de falha de processamento" — e o requisito de auditoria de §7. Escopo: Epic 8.

Três peças, todas server-side:

1. **Trilha de auditoria append-only** — tabela `audit_log` (migration
   `20260714120000_phf082_audit_log.sql`).
2. **Emissão estruturada** — pacote `@photofy/audit-log` (`packages/audit-log`).
3. **Detecção de anomalia + alertas** — detectores puros no mesmo pacote, avaliados por um job
   periódico que lê a janela recente da trilha.

## Trilha de auditoria (`audit_log`)

Registro imutável de eventos de acesso e ações sensíveis: acesso à galeria/moderação, decisões de
moderação, pareamento/revogação de dispositivo, execução de exclusão, falha de processamento e falha
de autenticação.

Garantias (ver comentários da migration):

- **Append-only**: RLS ligado, única policy é `SELECT` para staff. Sem `INSERT`/`UPDATE`/`DELETE` para
  clientes → ninguém forja, altera ou apaga auditoria. A escrita é exclusiva de `service_role`
  (workers, API, middleware de acesso), que bypassa RLS por design.
- **PII (LGPD, §6)**: `ip_hash` já chega hasheado com salt (mesmo padrão de `consent_record.ip_hash` e
  do rate limiter PHF-080). **IP em claro nunca é persistido.** O salt vem do secrets manager (PHF-081).
- **Isolamento por evento**: `event_id` presente para recorte; leitura restrita a staff (cross-evento,
  igual às demais tabelas sensíveis de PHF-011). `event_id` nullable para eventos globais (ex.: falha
  de auth sem evento, health de worker).
- **Dependência**: reutiliza `public.is_staff()` de PHF-011 — não redefine (fonte única).

## Emissão (`@photofy/audit-log`)

```ts
import { AuditLogger, StdoutAuditSink, createSupabaseSink } from '@photofy/audit-log';

const logger = new AuditLogger({
  sink: createSupabaseSink(serviceRoleClient), // ou StdoutAuditSink p/ agregação de logs
  ipSalt: process.env.IP_HASH_SALT!,           // PHF-081, nunca no repo
});

await logger.record({
  actorType: 'staff',
  actorId: moderadorId,
  acao: 'moderacao.reprovar',
  recursoTipo: 'media_item',
  recursoId: mediaId,
  eventId,
  ip: req.ip, // hasheado antes de persistir; o domínio nunca lida com ip_hash na mão
});
```

- **Fail-open**: `record()` nunca lança para o chamador. Auditoria é best-effort no caminho da request —
  um sink indisponível não pode derrubar upload/moderação. A falha vai para `onError` (default: stderr
  estruturado) para o próprio pipeline de observabilidade tratar.
- **Sinks**: `MemoryAuditSink` (testes), `StdoutAuditSink` (linha JSON por registro → coletor do host
  no Docker Swarm), `createSupabaseSink` (tabela `audit_log`, mapeia camelCase → colunas snake_case).

## Detecção de anomalia e alertas

Detectores puros sobre uma janela deslizante da trilha (`evaluateAnomalies`), pensados para rodar num
job periódico (lê `audit_log` recente → avalia → despacha alertas ao canal de operações).

| Regra | Gatilho | Severidade |
|---|---|---|
| `processamento.erro.pico` | N falhas de processamento por evento na janela | crítico |
| `auth.falha.brute_force` | N falhas de auth do mesmo `ip_hash` | alerta |
| `moderacao.reprovar.massa` | N reprovações pelo mesmo moderador (conta comprometida?) | alerta |

Limiares e janela são configuráveis (`DEFAULT_ANOMALY_CONFIG`).

### Invariante inegociável: alertas nunca vão ao participante

Todo `AnomalyAlert` tem `audiencia: 'operadores'` como **literal de tipo fixo** — é impossível, por
construção, um detector emitir alerta endereçado ao participante. Isso encoda a regra de **silêncio de
moderação** do `CLAUDE.md` e cobre o Gherkin *"Falha de processamento não expõe erro ao participante"*
(`02-spec.md` §5): quando o worker esgota o retry e marca o item como `erro`, a trilha levanta um alerta
de **reprocessamento manual para operadores** — nunca uma notificação ao participante que enviou o item.

## Testes

- `packages/audit-log` — vitest (`npm test` no pacote): hash LGPD, fail-open do logger, mapeamento do
  sink Supabase, cada detector e o cenário Gherkin de falha de processamento (20 testes).
- `supabase/tests/phf082_audit_log_test.sql` — pgTAP (`supabase test db`): existência, RLS, append-only
  (única policy é `SELECT`), escrita negada a `anon`, leitura de staff.
