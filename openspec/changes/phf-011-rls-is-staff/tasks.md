# Tasks: PHF-011 — RLS por `event_id` + `public.is_staff()`

> Risco IA: **ALTO** (RLS + isolamento entre eventos). Requer 2 aprovações humanas + QA staging + rollback SQL documentado.
> Fonte: `spec.md` (16 cenários Gherkin), `design.md` (DDL/policies/pgTAP), `proposal.md` (intent/rollback).
> Legenda: **[S]** = estimativa em sessões (~30-60 min). **Dep:** = bloqueada por.

---

## FASE 1 — Schema + Migração `phf011`

- [ ] 1.1 Criar `supabase/migrations/20260713130000_phf011_rls_is_staff.sql` com header (autor, PHF-011, referências a `spec.md` / `design.md`) e seções placeholder (profiles → is_staff → enable RLS → policies). **[0.5S]** — design §2
- [ ] 1.2 Escrever DDL de `public.profiles` (tabela + `comment on`, `enable row level security` sem policies = deny-all). **[0.5S]** — design §2.a. Dep: 1.1
- [ ] 1.3 Escrever `public.is_staff()` (`SECURITY DEFINER` + `STABLE` + `SET search_path = ''` + `revoke all` + `grant execute to anon, authenticated`). **[0.5S]** — design §2.b, spec cenários 1-3. Dep: 1.2
- [ ] 1.4 `alter table public.events enable row level security;` e mesma para `public.slideshow_config`. **[0.5S]** — design §2.d cabeçalho. Dep: 1.3
- [ ] 1.5a Policies de `events` (3: `anon le ativos`, `device le proprio evento`, `staff le tudo`) e `slideshow_config` (2: device, staff). **[1S]** — design §2.d, spec cenários 13-14. Dep: 1.4
- [ ] 1.5b Policies de `media_items` (3: `anon le aprovado de evento ativo`, `device le proprio evento`, `staff le tudo`). **[1S]** — design §2.d, spec cenários 4-7. Dep: 1.4
- [ ] 1.5c Policies de `moderation_log`, `consent_record`, `deletion_request` (1 policy staff por tabela, todas com `public.is_staff()`). **[0.5S]** — design §2.d. Dep: 1.4
- [ ] 1.5d Policies de `devices` (2: `proprio device le a si mesmo` via `nullif(auth.jwt() ->> 'device_id','')::uuid` e `staff le tudo`). **[0.5S]** — design §2.d. Dep: 1.4
- [ ] 1.6 Adicionar comentários inline com rationale (por que `SECURITY DEFINER`, por que subquery em `events` ativos vs denormalização, por que claim JWT vs join a `devices`). **[0.5S]** — design §5 decisões 1, 3, 4. Dep: 1.5a-d

---

## FASE 2 — Rename `phf082` (resolve colisão de timestamp)

- [ ] 2.1 `git mv supabase/migrations/20260714120000_phf082_audit_log.sql supabase/migrations/20260714120001_phf082_audit_log.sql`. **[0.25S]** — design §6, proposal §Approach.7. Dep: FASE 1 completa
- [ ] 2.2 Rodar `rg 20260714120000_phf082` para confirmar zero referências ao path antigo em docs/scripts. **[0.25S]**. Dep: 2.1
- [ ] 2.3 Rodar `supabase db reset` local — confirmar que aplica sem erro (phf011 antes de phf082, `is_staff()` existe quando phf082 referencia). **[0.5S]** — spec cenário 16. Dep: 2.2

---

## FASE 3 — Testes pgTAP (`supabase/tests/phf011_rls_is_staff_test.sql`)

- [ ] 3.1 Criar arquivo com header (`begin; select plan(18); ...; select * from finish(); rollback;`) padrão `phf082_audit_log_test.sql`. **[0.5S]** — design §4. Dep: 2.3
- [ ] 3.2 Escrever fixtures reutilizáveis: helper para criar `auth.users` + `profiles` (staff/organizador/participante), seed eventos A (ativo) e B (encerrado), `media_items` em todos os 4 status por evento, `consent/deletion/moderation_log`. **[1S]** — design §4 setup comum. Dep: 3.1
- [ ] 3.3 Cenários A (spec §Requirement `is_staff()` isolado, 3 testes): `test_is_staff_admin_true`, `test_is_staff_moderador_true`, `test_is_staff_organizador_participante_anon_false`. **[0.5S]** — spec cenários 1, 2, 3. Dep: 3.2
- [ ] 3.4 Cenários B (silêncio de moderação em `media_items`, 4 testes): `test_anon_media_items_only_aprovado`, `test_anon_nao_ve_reprovado`, `test_device_le_pendente_proprio_evento`, `test_staff_le_todos_status`. **[1S]** — spec cenários 4, 5, 6, 7. Dep: 3.2
- [ ] 3.5 Cenários C (isolamento cross-evento, 3 testes): `test_device_cross_event_isolation_media_items`, `test_device_cross_event_isolation_slideshow_config`, `test_staff_admin_cross_event`. **[1S]** — spec cenários 8, 9, 10. Dep: 3.2
- [ ] 3.6 Cenários D (deny-all escrita cliente, 2 testes com `throws_ok` SQLSTATE 42501): `test_anon_nao_escreve_media_items`, `test_participante_nao_atualiza_media_items`. **[0.5S]** — spec cenários 11, 12. Dep: 3.2
- [ ] 3.7 Cenários E (`events` + `slideshow_config`, 2 testes): `test_anon_events_apenas_ativos`, `test_device_le_slideshow_proprio_e_nao_outro`. **[0.5S]** — spec cenários 13, 14. Dep: 3.2
- [ ] 3.8 Cenários F+G (rollback safety + ordenação, 2 testes): `test_profiles_deny_authenticated` (smoke deny-all) e `test_anon_slideshow_config_deny`. Cenário 15 (rollback preserva `is_staff()`) e cenário 16 (ordenação) validados manualmente em FASE 6.1-6.2. **[0.5S]** — spec cenários 15, 16. Dep: 3.2
- [ ] 3.9 Rodar `supabase test db` — todos os 18 asserts passam verde. **[0.5S]** — spec §Success Criteria. Dep: 3.3-3.8, 2.3

---

## FASE 4 — Feature flag / Rollback documentado

- [ ] 4.1 Criar `docs/feature-flags.md` (proposal §Rollback, design §3): explica que PHF-011 usa **migração reversível** como flag (não runtime flag) e por que. **[0.5S]** — proposal §Feature flag
- [ ] 4.2 Colar snippet SQL exato de `phf011_down.sql` inline no doc (drops em ordem inversa: devices → deletion_request → consent_record → moderation_log → media_items → slideshow_config → events; **NÃO dropar** `is_staff()` nem `profiles` nem `disable RLS`). **[0.5S]** — design §3 snippet. Dep: 4.1
- [ ] 4.3 Documentar 3 gatilhos de rollback: (a) data leak cross-evento detectado; (b) quebra de silêncio de moderação em prod/staging; (c) falha crítica de performance em galeria pública. **[0.25S]** — proposal §Rollback Plan.3. Dep: 4.1
- [ ] 4.4 Documentar governança de rollback em prod (2 aprovações: 1 tech + 1 produto/segurança, per CLAUDE.md governança alta); citar rollback do rename via `git revert` do PR. **[0.25S]** — CLAUDE.md §Governança IA por risco. Dep: 4.1

---

## FASE 5 — Documentação técnica

- [ ] 5.1 `rg is_staff docs/` — se houver referência em `docs/observability.md` ou outros, atualizar apontando para migração PHF-011 como fonte canônica. **[0.25S]** — proposal §Affected Areas
- [ ] 5.2 Marcar PHF-011 como "em progresso" em `03-tareas.md` linha 15 (opcional; muitos repos preferem só via issue tracker). **[0.25S]** — proposal §Metadados
- [ ] 5.3 Confirmar que `02-spec.md` §5 não precisa update (cenários já cobertos por este `spec.md` delta; documentar em comentário no PR). **[0.25S]** — spec §Notas de rastreabilidade

---

## FASE 6 — Verificação local pré-PR

- [ ] 6.1 `supabase db reset` — confirma migração aplica do zero sem erro `function public.is_staff() does not exist`. **[0.25S]** — spec cenário 16. Dep: FASES 1-4
- [ ] 6.2 `supabase test db` — confirma 18 asserts pgTAP passam verde. **[0.25S]** — spec §Success Criteria. Dep: 6.1
- [ ] 6.3 `vitest run --project=app` — confirma que nenhum teste de app quebrou (PHF-011 não toca TS; deve passar sem mudança). **[0.25S]** — config.yaml `verify.test_command`. Dep: 6.1
- [ ] 6.4 `gitleaks detect --source .` — confirma que `secret-scan.yml` CI não vai bloquear (nenhum segredo em migrações/testes/docs). **[0.25S]** — CLAUDE.md §CI `secret-scan.yml`. Dep: 6.1
- [ ] 6.5 Revisar diff final (`git diff staging...HEAD --stat`) — só migrações, testes SQL e docs; nenhum arquivo TS ou config fora do escopo. **[0.25S]** — proposal §Scope Fora. Dep: 6.1-6.4

---

## FASE 7 — PR + aprovações (risco ALTO)

- [ ] 7.1 `git add` dos arquivos do scope e commit(s) conventional: sugestão 3 commits semanticamente separados — (a) `feat(db): add phf-011 rls + is_staff + rename phf082`, (b) `test(db): add phf-011 pgtap 18 asserts`, (c) `docs: add feature-flags.md with phf011 rollback`. Adicionar `[ai-assisted: <modelo>]` no corpo. **[0.5S]** — CLAUDE.md §Commits. Dep: 6.5
- [ ] 7.2 `git push -u origin feat/phf-011-rls-is-staff`. **[0.25S]**. Dep: 7.1
- [ ] 7.3 `gh pr create --base staging` com template `.github/PULL_REQUEST_TEMPLATE.md` preenchido: referência PHF-011, checklist de 16 cenários Gherkin cobertos, risco ALTO, feature flag reversível documentada, bloco `> [!IMPORTANT]` com instrução `supabase db reset` para devs pós-merge. **[0.5S]** — CLAUDE.md §Pull Requests, design §6 nota. Dep: 7.2
- [ ] 7.4 Aguardar CI verde: `ci.yml` (lint/test/build/docker), `secret-scan.yml` (gitleaks), `pr-review.yml` (Gemini CLI lê `CLAUDE.md` + `02-spec.md §5` + diff). **[0.5S]** — CLAUDE.md §CI. Dep: 7.3
- [ ] 7.5 Solicitar 2 aprovações humanas nomeando revisores no comentário (1 tech: senior backend/DB; 1 produto/segurança). **[0.25S]** — CLAUDE.md §Governança IA risco alto. Dep: 7.4
- [ ] 7.6 Após merge em `staging`: QA manual em staging com **2 eventos concorrentes** (A e B ativos) — 2 revisores confirmam matriz papel × tabela × evento (anon só vê A aprovado; device pareado em A não vê B; staff vê tudo; participante autenticado recebe deny em moderation_log). **[1S]** — spec §Notas rastreabilidade, proposal §Success Criteria. Dep: 7.5

---

## Bloqueios explícitos entre fases

```
FASE 1 ──► FASE 2 ──► FASE 3.9 (pgTAP roda)
                 └──► FASE 6 ──► FASE 7
FASE 4 (paralelizável com FASE 3)
FASE 5 (paralelizável com FASE 3-4)
```

- **FASE 2** bloqueada por **FASE 1 completa** (rename só faz sentido com a nova migração escrita).
- **FASE 3.9** bloqueada por **FASE 1.6 + FASE 2.3** (só roda `supabase test db` com schema aplicado e phf082 renomeada).
- **FASE 6** bloqueada por **FASES 1-5** (verificação local integral).
- **FASE 7** bloqueada por **FASE 6** (não abrir PR sem CI local verde).

**Paralelização possível**: FASE 4 (docs feature-flags) e FASE 5 (docs técnicas) podem ser feitas em paralelo com FASE 3 (testes pgTAP) — não há dependência técnica.

---

## Estimativa total

| Fase | Tasks | Sessões |
|---|---|---|
| 1 — Schema + Migração | 9 | 5.5 |
| 2 — Rename phf082 | 3 | 1.0 |
| 3 — Testes pgTAP | 9 | 6.0 |
| 4 — Feature flag / Rollback | 4 | 1.5 |
| 5 — Docs técnicas | 3 | 0.75 |
| 6 — Verificação local | 5 | 1.25 |
| 7 — PR + aprovações | 6 | 3.0 |
| **Total** | **39** | **~19 sessões (~10-12h focused work)** |

Com FASE 4+5 paralelas à FASE 3: economia de ~2.25 sessões (~1h). Total prático: **~17 sessões**.

---

## Não-tarefas (fora do escopo — v2 ou issues separadas)

- **Emissão de JWT com claim `event_id` / `device_id`** para device pareado — issue separada de Device Authorization Flow. As policies desta PHF assumem a forma do JWT mas não emitem.
- **RLS de `storage.objects`** (bucket `media` casando prefixo path com `event_id::text`) — v2. Hoje ninguém lê storage direto, só via URLs pré-assinadas com `service_role`.
- **Tabela `profile_events`** (staff escopado por evento em vez de cross-evento global) — v2 se necessário.
- **Mudança em `lib/supabase/server.ts`** — continua com `service_role`. Switch para SSR + leitura de `profiles` é issue futura.
- **Renumerar `phf023`** — só `phf082` é renomeada (fix mínimo).
- **Leitura autenticada do próprio perfil em `public.profiles`** (policy `authenticated: id = auth.uid()`) — issue separada quando o SSR começar a ler `profiles` direto.
