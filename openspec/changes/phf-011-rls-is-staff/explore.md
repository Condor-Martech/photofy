# Exploração — PHF-011: RLS por `event_id` + `public.is_staff()`

> Fase SDD: **explore** (não propõe solução, apenas cataloga o estado atual, dependências, riscos e perguntas abertas). Base para `sdd-propose`.

## 1. Contexto

`03-tareas.md` classifica **PHF-011 como risco alto** ("segurança/isolamento entre eventos"). O CLAUDE.md do projeto reforça:

- RLS por `event_id` é **obrigatório** em qualquer tabela nova de domínio — nunca confiar apenas em filtro de API.
- Governança IA por risco alto (PHF-011 se encaixa: mexe em RLS): **2 aprovações humanas + QA manual em staging + feature flag obrigatório**.
- Silêncio total de moderação: nenhum vetor de leitura pode revelar ao participante a existência de itens `reprovado`/`erro`/`excluido`.
- Galeria permanente: nenhuma policy pode permitir DELETE do participante — exclusão é só via `deletion_request` (PHF-062/063).

PHF-011 é bloqueante para todas as epics de negócio (Epic 2 em diante) porque, sem policies, as tabelas ficam em modo **deny-all** e nenhuma leitura autenticada funciona.

## 2. Estado atual do schema e das migrações

Migrações existentes em `supabase/migrations/` (ordem por timestamp):

| Timestamp | Arquivo | Efeito relevante para PHF-011 |
|---|---|---|
| `20260713120000` | `initial_schema.sql` | Cria `events`, `slideshow_config`, `media_items`, `moderation_log`, `consent_record`, `deletion_request`, `devices`. RLS **habilitada sem policies** (deny-all) em `media_items`, `moderation_log`, `consent_record`, `deletion_request`, `devices`. `events` e `slideshow_config` NÃO têm RLS habilitada. |
| `20260713203000` | `phf012_private_media_bucket.sql` | Bucket privado `media`; `storage.objects` fica com RLS ligada e sem policies (deny-all). Comentário delega policies de acesso direto por role à PHF-011. |
| `20260714120000` | `phf023_consent_record_hardening.sql` | Aceite duplo (CHECK) + trigger bloqueando UPDATE em `consent_record`. Não toca RLS. Comentário diz que "policies de leitura por event_id são responsabilidade de PHF-011". |
| `20260714120000` | `phf082_audit_log.sql` | Cria `audit_log` + policy `for select to authenticated using ( public.is_staff() )`. **Já referencia `public.is_staff()` sem que exista** — assume que PHF-011 rodou antes (comentário sugere timestamp `20260713130000`). |
| `20260714130000` | `phf063_executar_deletion_request.sql` | RPC `SECURITY DEFINER` (bypassa RLS), só `service_role` executa. Não define `is_staff()`. |

Testes pgTAP em `supabase/tests/` acompanham cada migração.

### Gap identificado (bloqueia `supabase test db` cross-migration)

`phf082_audit_log.sql:53` referencia `public.is_staff()` — **função inexistente**. A migração `phf082` foi mergeada assumindo que PHF-011 traria essa função com timestamp anterior (`20260713130000`, conforme o próprio comentário do phf082). Hoje:

- Aplicar as migrações do zero **quebra** em `phf082` porque `is_staff()` não existe.
- O test `phf082_audit_log_test.sql:34` já grava `insert into profiles (id, role) values (..., 'admin')` — assume que PHF-011 cria a tabela `profiles(id, role)` e uma função `is_staff()` que a consulta.

## 3. Assunções descobertas (lendo o código, não interpretando)

1. **Tabela `profiles(id, role)` é esperada** — o test do PHF-082 já a usa (`id` = `auth.users.id`, `role text` com valor `'admin'`). `lib/supabase/server.ts:11` também referencia "@supabase/ssr + RLS de `profiles`".
2. **Modelo de staff cross-evento** — o comentário do phf082 é explícito: `"Staff (linha em profiles) le a trilha inteira (cross-evento, igual PHF-011)"`. Logo, staff **não é restrito por evento** — vê todos os eventos.
3. **`events` é a raiz** — comentário do `initial_schema.sql:100`: "events fica sem RLS aqui pois é a raiz e suas policies dependem do modelo de acesso definido na 011". PHF-011 precisa decidir se `events` (e `slideshow_config`) ganham RLS ou permanecem sem.
4. **`deletion_request` não tem `event_id` próprio** — `lib/admin/solicitacoes.ts:6` confirma: escopo por evento vem do join `deletion_request → media_items.event_id`. RLS por `event_id` precisa desse caminho indireto.
5. **`moderation_log` idem** — só tem `media_id` e `moderador_id`; escopo por evento vem via `media_items`.
6. **Escrita continua server-side** — `phf012` e `phf082` documentam que escrita passa por `service_role` (bypassa RLS). PHF-011 não precisa criar policies de INSERT/UPDATE para clientes; foco é LEITURA.
7. **Silêncio de moderação em SELECT** — o Gherkin §5 "Slideshow exibe apenas conteúdo aprovado" e "Galeria pública paginada, apenas itens aprovados" exigem que policies **públicas** (anon) filtrem `status = 'aprovado'`. Caso contrário, um curioso lista `status=reprovado` via PostgREST.
8. **`devices` tem `event_id` nullable** — antes do pareamento, o `event_id` é `null`. Policy precisa cobrir esse estado (o pareamento inicial acontece via `service_role`, mas leituras autenticadas precisam de regra explícita).
9. **`storage.objects` também precisa de RLS por `event_id`** — objetos são gravados sob prefixo `<event_id>/...`; se algum dia uma policy for concedida, deve casar `bucket_id = 'media' AND (storage.foldername(name))[1] = event_id::text`. PHF-012 delega isso à PHF-011.
10. **Convenção de teste**: cada migração tem seu pgTAP em `supabase/tests/`. PHF-011 vai precisar de teste próprio cobrindo matriz papel × tabela × operação.

## 4. Perguntas abertas (bloqueadoras para `sdd-propose`)

1. **Modelo de roles em `profiles.role`** — quais valores exatos contam como "staff"?
   - Opções vistas: `admin` (usado no test), `moderador`, `organizador` (usado no spec §5).
   - `is_staff()` retorna `true` para quais? Todos os três? Só `admin`? Precisa de granularidade (`is_admin()`, `is_moderador()`)?

2. **Escopo cross-evento vs. por-evento de staff**:
   - Assumindo cross-evento (como o phf082 documenta): staff vê **todos** os eventos.
   - Alternativa: tabela `profile_events(profile_id, event_id, role)` para escopar staff a eventos específicos. Isso muda tudo — PHF-011 fica muito mais complexo.
   - Precisa confirmação: v1 é cross-evento simples?

3. **Feature flag obrigatório** (CLAUDE.md exige para risco alto):
   - Nome, mecanismo e escopo? Opções:
     - Env var (`PHF_011_RLS_ENABLED`) lida no server e usada num `alter policy` condicional? (Feio: RLS não desliga por env em runtime.)
     - Tabela `feature_flags(name, enabled)` consultada pelas policies? (Custa performance em toda query.)
     - Toggle via migração reversível: PHF-011 sobe policies, PHF-011-rollback as remove? (Padrão do repo, mas não é "flag" real.)
   - Sem essa definição não dá para cumprir a governança de risco alto.

4. **`events` e `slideshow_config` — habilitar RLS?**
   - `events`: rota pública `/evento/[slug]` precisa ler `events` sem autenticação → policy `for select to anon using (status = 'ativo')`.
   - `slideshow_config`: só telão pareado ou staff lêem → policy vinculada a device token ou staff.
   - PHF-011 decide isso ou fica fora do escopo?

5. **Identificação do device na policy** — telão pareado recebe token opaco (spec §4). Como a policy de `media_items` reconhece "este JWT é de um device pareado ao event X"?
   - Via claim custom no JWT (`event_id`)?
   - Via tabela `devices` + join na policy (custo)?
   - Via role Postgres custom (`device_role`)?

6. **`storage.objects` — escopo desta mudança?**
   - PHF-012 delegou a PHF-011. Mas hoje ninguém lê `storage.objects` direto (só via URL pré-assinada com `service_role`). Adicionar policy agora ou adiar?

7. **Migração dos timestamps colidentes** (`20260714120000` × 2):
   - `phf023` e `phf082` compartilham timestamp. Ordem alfabética resolve hoje, mas frágil.
   - PHF-011 (novo timestamp sugerido `20260713130000`) resolve o gap do `is_staff()`, mas convém aproveitar a mudança e renumerar as duas colidentes? (Fora do escopo estrito de PHF-011, mas correlato.)

8. **Rollback SQL**:
   - Se `alter table ... disable row level security` for o rollback, ficamos com deny-all restaurado (situação atual) — OK.
   - Se o rollback for `drop function is_staff()`, isso quebra `phf082` retroativamente. Rollback precisa ser cuidadosamente sequenciado.

## 5. Riscos técnicos

| Risco | Impacto | Mitigação candidata (para propose) |
|---|---|---|
| Policy escrita errada → **data leak entre eventos** | Alto (vaza mídia/consent de eventos concorrentes) | Testes pgTAP cobrindo matriz papel × tabela × operação; teste explícito "evento A não vê evento B" |
| Policy escrita errada → **quebra silêncio de moderação** | Alto (participante descobre reprovação) | Policy pública **exige** `status = 'aprovado'`; teste "anon lista com status=reprovado retorna 0 linhas" |
| Sem `is_staff()`, `phf082` já quebra `supabase test db` do zero | Alto (CI falha ao reaplicar do zero) | Timestamp da PHF-011 **deve** ser anterior a `20260714120000` |
| `is_staff()` sem `security definer` + `search_path` fixo → `search_path` injection | Alto (bypass RLS) | Função `security definer set search_path = ''`, padrão dos outros functions do repo |
| Feature flag frágil (env var no client) → não desliga RLS de verdade | Médio | Definir o mecanismo antes de propor; usar migração reversível como rollback |
| Rollback deixa `phf082`/`phf063` órfãos referenciando `is_staff()` | Alto | Rollback SQL **não** dropa `is_staff()`; só remove policies |
| RLS pesada em query hot (galeria pública) | Médio | `is_staff()` em `STABLE`; join a `events` por index; medir com `explain analyze` |
| Colisão de timestamp (`20260714120000` × 2) piora com outra migração no meio | Baixo/Médio | Escolher timestamp distinto (`20260713130000`) e documentar |
| Telão pareado sem estratégia de auth → policy de `media_items` não sabe reconhecer device | Alto | Definir na pergunta 5 antes de escrever policies |

## 6. Referências (paths absolutos lidos)

**Docs de domínio:**
- `/Users/al3jandro/project/condor/photofy/00-prd.md`
- `/Users/al3jandro/project/condor/photofy/02-spec.md` (§3 modelo de dados, §4 API, §5 Gherkin, §6 não-funcionais, §7 gate de risco)
- `/Users/al3jandro/project/condor/photofy/03-tareas.md` (linha 15: PHF-011)
- `/Users/al3jandro/project/condor/photofy/CLAUDE.md` (regras inegociáveis + governança IA)

**Migrações:**
- `/Users/al3jandro/project/condor/photofy/supabase/migrations/20260713120000_initial_schema.sql`
- `/Users/al3jandro/project/condor/photofy/supabase/migrations/20260713203000_phf012_private_media_bucket.sql`
- `/Users/al3jandro/project/condor/photofy/supabase/migrations/20260714120000_phf023_consent_record_hardening.sql`
- `/Users/al3jandro/project/condor/photofy/supabase/migrations/20260714120000_phf082_audit_log.sql` (usa `is_staff()`)
- `/Users/al3jandro/project/condor/photofy/supabase/migrations/20260714130000_phf063_executar_deletion_request.sql`

**Testes pgTAP:**
- `/Users/al3jandro/project/condor/photofy/supabase/tests/initial_schema_test.sql`
- `/Users/al3jandro/project/condor/photofy/supabase/tests/phf012_private_media_bucket_test.sql`
- `/Users/al3jandro/project/condor/photofy/supabase/tests/phf023_consent_record_hardening_test.sql`
- `/Users/al3jandro/project/condor/photofy/supabase/tests/phf082_audit_log_test.sql` (usa `profiles(id, role)`)
- `/Users/al3jandro/project/condor/photofy/supabase/tests/phf063_executar_deletion_request_test.sql`

**Código app:**
- `/Users/al3jandro/project/condor/photofy/lib/supabase/server.ts` (ponto de futuro switch para SSR com `profiles`)
- `/Users/al3jandro/project/condor/photofy/lib/admin/solicitacoes.ts` (padrão de join para escopar via `media_items.event_id`)

**Config SDD:**
- `/Users/al3jandro/project/condor/photofy/openspec/config.yaml` (regras de proposal/specs/design/tasks para PHF-011)

## 7. Áreas afetadas (para o propose)

- **Nova migração**: `supabase/migrations/20260713130000_phf011_rls_is_staff.sql` (timestamp anterior às demais colidentes, resolve dependência do phf082).
- **Novo teste pgTAP**: `supabase/tests/phf011_rls_is_staff_test.sql` (matriz papel × tabela × operação).
- **Documentação de rollback**: `.sql` reverso ou seção em `docs/` (padrão do repo).
- **Feature flag**: mecanismo a definir (pergunta 3) — potencialmente `docs/feature-flags.md` novo.
- **Sem impacto no código TypeScript** (por enquanto): `lib/supabase/server.ts` continua com `service_role`; o switch para SSR + `profiles` é ponytail explícito (fora do escopo de PHF-011).

## 8. Pronto para proposal?

**Não ainda.** É preciso o humano responder as **perguntas 1, 2, 3 e 5** (roles concretas, escopo cross-evento, mecanismo de feature flag, estratégia de auth do device). Perguntas 4, 6, 7 e 8 podem ser resolvidas no próprio `sdd-propose` com uma recomendação técnica; as outras 4 dependem de decisão de produto/segurança.
