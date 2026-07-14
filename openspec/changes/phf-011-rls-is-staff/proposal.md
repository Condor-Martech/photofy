# Proposal: PHF-011 — RLS por `event_id` + `public.is_staff()`

## Metadados

| Campo | Valor |
|---|---|
| Issue | **PHF-011** (`03-tareas.md` linha 15) |
| Risco IA | **ALTO** (RLS + segurança de isolamento entre eventos) |
| Aprovações | **2 humanas** + QA manual em staging + rollback SQL documentado |
| Feature flag | **Migração reversível** (`phf011_up` aplica, `phf011_down` remove só policies). Não é flag runtime. |
| Change name | `phf-011-rls-is-staff` |
| Branch | `feat/phf-011-rls-is-staff` |
| Referência | `explore.md` (mesma pasta) — leitura obrigatória antes de spec/design |

## Intent

Hoje as tabelas de domínio (`media_items`, `moderation_log`, `consent_record`, `deletion_request`, `devices`) estão com RLS habilitada **sem policies** (deny-all). `events` e `slideshow_config` estão sem RLS. A função `public.is_staff()` — já referenciada por `phf082_audit_log.sql:53` e usada por `phf063` — **não existe**, o que quebra `supabase test db` do zero e bloqueia toda leitura autenticada. PHF-011 preenche esse buraco.

Precisa acontecer **agora** porque é bloqueante para todas as epics de negócio (Epic 2+): sem policies, nenhuma tela funciona; sem `is_staff()`, o CI não passa. Além disso, `phf082` foi mergeada com a premissa de que PHF-011 rodaria antes — a dívida técnica precisa fechar.

**Não-objetivos**: (a) tabela `profile_events` para escopar staff por evento (fica em v2 se necessário); (b) RLS de `storage.objects` (ninguém lê direto hoje — só via URLs pré-assinadas com `service_role` — adiar a v2); (c) auth do device pareado (issue separada; policies **assumem** JWT com claim custom `event_id`); (d) migrar `lib/supabase/server.ts` para SSR + `profiles` (continua com `service_role`).

## Scope

### Dentro
- Criar tabela `public.profiles(id uuid PK ref auth.users, role text CHECK IN ('admin','moderador','organizador','participante'))` com RLS deny-all (escrita só via `service_role`).
- Criar função `public.is_staff() returns boolean` (`SECURITY DEFINER`, `STABLE`, `SET search_path = ''`) que retorna TRUE para `profiles.role IN ('admin','moderador')`. `organizador` **não** é staff.
- Habilitar RLS em `events` e `slideshow_config`.
- Escrever policies de SELECT para: `events`, `slideshow_config`, `media_items`, `moderation_log`, `consent_record`, `deletion_request`, `devices` (matriz papel × tabela em `sdd-design`).
- Validar (sem alterar) a policy existente de `audit_log` (phf082) contra a nova `is_staff()`.
- Renomear `20260714120000_phf082_audit_log.sql` → `20260714120001_phf082_audit_log.sql` para resolver colisão com `phf023` (mesmo PR de PHF-011; `phf023` não é tocada).
- Nova doc: `docs/feature-flags.md` documentando o mecanismo "migração reversível" + `phf011_down.sql` como rollback.
- Novo teste pgTAP `supabase/tests/phf011_rls_is_staff_test.sql` cobrindo matriz completa.

### Fora
- `storage.objects` RLS → v2.
- `profile_events` (escopo staff por evento) → v2.
- Auth do device pareado (JWT com claim `event_id`) → issue separada; PHF-011 **assume** a forma.
- Mudança de código TypeScript (`lib/supabase/server.ts` fica com `service_role`).
- Renumerar `phf023` (só `phf082` é renomeada — fix mínimo).

## Approach

Alto nível — SQL detalhado é responsabilidade de `sdd-design`.

1. **Timestamp da migração**: `20260713130000_phf011_rls_is_staff.sql` — anterior a `phf023` (`20260714120000`) e `phf082` (renomeada para `20260714120001`). Garante que `is_staff()` existe antes de qualquer referência.
2. **Tabela `profiles`**: criada com FK a `auth.users(id) on delete cascade`, `role text not null check (...)`, `created_at timestamptz default now()`. RLS habilitada, **sem policies** para clientes (só `service_role` escreve/lê; leitura autenticada do próprio perfil pode ser adicionada em issue separada quando o SSR migrar).
3. **`public.is_staff()`**: `SECURITY DEFINER` para bypassar RLS da tabela `profiles`; `STABLE` para permitir cache do planner na mesma query; `SET search_path = ''` (padrão do repo — evita `search_path` injection); consulta `public.profiles WHERE id = auth.uid() AND role IN ('admin','moderador')`.
4. **Habilitar RLS** em `events` e `slideshow_config` (hoje sem RLS).
5. **Policies de SELECT** (matriz completa em `sdd-design`; aqui a intenção):
   - **`anon`**: lê `events` onde `status = 'ativo'`; lê `media_items` onde `status = 'aprovado'` (galeria pública — respeita silêncio de moderação).
   - **`device` (JWT com claim `event_id`)**: lê `media_items` e `slideshow_config` do próprio `event_id` via `(auth.jwt() ->> 'event_id')::uuid = <tabela>.event_id`. Zero join.
   - **`staff` (is_staff() = TRUE)**: lê **tudo cross-evento** — `events`, `slideshow_config`, `media_items`, `moderation_log` (via join a `media_items`), `consent_record` (via join a `media_items`), `deletion_request` (via join a `media_items`), `devices`.
   - **`participante autenticado sem role staff`**: deny-all (sem policy que o alcance).
   - **INSERT/UPDATE/DELETE**: **sem policy** — escrita continua exclusiva do `service_role` (bypassa RLS). Consistente com `phf012`/`phf082`.
6. **`slideshow_config`**: policy `for select using ((auth.jwt() ->> 'event_id')::uuid = event_id OR public.is_staff())` — telão pareado + staff, anon não.
7. **Rename de `phf082`**: `git mv 20260714120000_phf082_audit_log.sql 20260714120001_phf082_audit_log.sql`. `supabase test db` do zero passa a rodar (era o gap principal).
8. **Feature flag como migração reversível**: `docs/feature-flags.md` documenta `phf011_down.sql` como snippet SQL de rollback — `drop policy` para cada policy criada, `drop table profiles`, **NUNCA `drop function is_staff()`** (senão quebra `phf082`/`phf063`).

## Affected Areas

| Área | Impacto | Descrição |
|---|---|---|
| `supabase/migrations/20260713130000_phf011_rls_is_staff.sql` | **Novo** | `profiles` + `is_staff()` + policies + RLS enable |
| `supabase/migrations/20260714120001_phf082_audit_log.sql` | **Rename** (de `20260714120000_phf082_audit_log.sql`) | Resolve colisão com `phf023` |
| `supabase/tests/phf011_rls_is_staff_test.sql` | **Novo** | Matriz papel × tabela × operação (≥ 12 cenários) |
| `docs/feature-flags.md` | **Novo** | Documenta o mecanismo "migração reversível" + snippet `phf011_down.sql` |
| `docs/observability.md` | **Modificar** (se referenciar `is_staff()`) | Atualização de referência apenas |
| `lib/supabase/server.ts` | **Nenhum** | Fica com `service_role` — switch SSR é fora do escopo |
| CI (`ci.yml`) | **Nenhum código novo**, mas `supabase test db` do zero passa a funcionar (hoje quebra em `phf082`) |

## Risks

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Policy errada → **data leak cross-evento** | Média | Teste pgTAP com cenário explícito "evento A não lê evento B"; QA manual staging com 2 eventos concorrentes |
| Policy errada → **quebra silêncio de moderação** (anon vê `reprovado`) | Média | Policy pública EXIGE `status = 'aprovado'`; teste "anon com filtro `status=reprovado` retorna 0 linhas" |
| Rollback dropa `is_staff()` por engano → quebra `phf082`/`phf063` | Média-Alta | `docs/feature-flags.md` documenta sequência exata: só `drop policy`, **jamais** `drop function` |
| `is_staff()` sem `SECURITY DEFINER` + `search_path = ''` → RLS bypass via injection | Baixa (mitigado no design) | Padrão obrigatório do repo (`SET search_path = ''`); revisor humano valida |
| RLS pesada em query hot (galeria pública) | Média | `is_staff()` `STABLE` + índices em `events.status` e `media_items.event_id`; medir com `explain analyze` em QA |
| Rename de `phf082` conflita com migrações já rodadas em ambientes locais dos devs | Baixa | Comunicar no PR: devs precisam `supabase db reset` local após merge |

## Rollback Plan

**Novo arquivo `docs/feature-flags.md`** documenta:

1. **Como reverter**: aplicar `phf011_down.sql` (snippet SQL colado na doc, não é migração real):
   - `drop policy` para cada policy criada em `events`, `slideshow_config`, `media_items`, `moderation_log`, `consent_record`, `deletion_request`, `devices`.
   - `alter table events disable row level security;` e `alter table slideshow_config disable row level security;`.
   - `drop table public.profiles;`
   - **NÃO** dropar `public.is_staff()` — `phf082` e `phf063` dependem dela.
2. **Efeito do rollback**: tabelas de domínio voltam ao estado deny-all para autenticados (situação pré-PHF-011); `phf082`/`phf063` continuam funcionando porque `is_staff()` persiste retornando FALSE para todos (tabela `profiles` inexistente → SELECT retorna 0 linhas → função retorna FALSE).
3. **Quando reverter**: detecção de data leak entre eventos, quebra do silêncio de moderação em staging/prod, ou falha crítica de performance.
4. **Rollback do rename de `phf082`**: `git revert` do PR de PHF-011.

## Dependencies

- Nenhuma técnica bloqueante. PHF-011 é ele mesmo o desbloqueador.
- **Premissa** (não bloqueante para PHF-011, mas necessária antes que device pareado consiga ler): issue separada de auth de device precisa emitir JWT com claim custom `event_id`. As policies de PHF-011 já assumem essa forma.

## Success Criteria

- [ ] Migration `20260713130000_phf011_rls_is_staff.sql` + rename de `phf082` para `20260714120001` mergeados em `staging`.
- [ ] `supabase test db` do zero passa em CI (hoje quebra em `phf082`).
- [ ] `supabase/tests/phf011_rls_is_staff_test.sql` cobre matriz mínima de **12 cenários** (4 papéis × 3 tabelas-chave), todos passando.
- [ ] QA manual em staging com **2 eventos concorrentes**: 2 revisores confirmam isolamento (evento A não vê evento B) e silêncio de moderação (anon não vê `reprovado`).
- [ ] `docs/feature-flags.md` criado com snippet `phf011_down.sql` documentado.
- [ ] PR mergeado com **2 aprovações humanas** + agente revisor (Gemini CLI) verde.
- [ ] Nenhuma referência a `is_staff()` em `phf082`/`phf063` quebrada por rollback documentado.

## Cenários Gherkin candidatos

A escrever/atualizar em `02-spec.md §5` (detalhamento Given/When/Then em `sdd-spec`):

- "Anon lê apenas mídia aprovada do evento X" *(alinha com "Galeria pública paginada" existente)*
- "Anon não vê status=reprovado (silêncio de moderação)" *(novo — reforça regra inegociável)*
- "Device pareado ao evento A não lê `media_items` do evento B" *(novo — isolamento entre eventos)*
- "Staff (admin/moderador) lê `media_items` de todos os eventos (cross-evento)" *(novo)*
- "Organizador autenticado sem role staff obtém deny-all em `moderation_log`" *(novo — confirma que `organizador` não é staff)*
- "Reverter policies (`phf011_down`) mantém `is_staff()` e não quebra leitura de `audit_log` (phf082)" *(novo — rollback safety)*

## Perguntas remanescentes

**Nenhuma.** Todas as decisões bloqueadoras do `explore.md` (roles staff, escopo cross-evento, mecanismo de feature flag, auth do device) foram tomadas pelo humano. As perguntas secundárias (storage.objects, colisão de timestamps, rollback, slideshow_config) foram resolvidas nesta proposal. **Pronto para `sdd-spec` e `sdd-design` em paralelo.**
