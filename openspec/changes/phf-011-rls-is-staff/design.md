# Design: PHF-011 — RLS por `event_id` + `public.is_staff()`

Referências obrigatórias antes de implementar:

- `openspec/changes/phf-011-rls-is-staff/proposal.md` (intent, scope, riscos)
- `openspec/changes/phf-011-rls-is-staff/explore.md` (assunções descobertas, gap phf082)
- `02-spec.md §5` (Gherkin de galeria pública, silêncio de moderação)
- `CLAUDE.md` (regras inegociáveis: silêncio total, RLS obrigatório, `SECURITY DEFINER + search_path = ''`)

Este design é **copy-paste ready** para `sdd-apply`.

---

## 1. Visão de arquitetura

Três caminhos distintos de leitura, cada um resolvido por uma policy dedicada por tabela. **Nenhuma policy de escrita para clientes** — INSERT/UPDATE/DELETE seguem exclusivos de `service_role` (bypassa RLS), consistente com `phf012`/`phf082`.

```mermaid
sequenceDiagram
    autonumber
    participant C as Cliente (Browser/Telão)
    participant PR as PostgREST
    participant PG as Postgres (RLS engine)
    participant P as public.profiles

    rect rgb(245,245,255)
    Note over C,PG: Caminho 1 — Anônimo (galeria pública)
    C->>PR: GET /media_items?event_id=eq.X&status=eq.aprovado
    PR->>PG: SET LOCAL role anon; SELECT ...
    PG->>PG: USING (status = 'aprovado' AND event_id IN (events ativos))
    PG-->>PR: rows onde status='aprovado' AND event ativo
    end

    rect rgb(245,255,245)
    Note over C,PG: Caminho 2 — Device pareado (JWT com claim event_id)
    C->>PR: GET /media_items com JWT { event_id: A, role: authenticated }
    PR->>PG: SET LOCAL role authenticated; claim event_id=A
    PG->>PG: USING ((auth.jwt() ->> 'event_id')::uuid = event_id)
    PG-->>PR: apenas rows do evento A
    end

    rect rgb(255,250,240)
    Note over C,PG,P: Caminho 3 — Staff (admin/moderador)
    C->>PR: GET /moderation_log com JWT { sub: staff_uid }
    PR->>PG: SET LOCAL role authenticated; auth.uid()=staff_uid
    PG->>P: is_staff() → SECURITY DEFINER lê profiles.role
    P-->>PG: TRUE (role IN admin,moderador)
    PG-->>PR: rows cross-evento
    end
```

---

## 2. Schema DDL completo

**Arquivo**: `supabase/migrations/20260713130000_phf011_rls_is_staff.sql`

Ordem obrigatória (dependências): (1) `profiles` → (2) `is_staff()` → (3) enable RLS em `events`/`slideshow_config` → (4) policies por tabela.

### 2.a Tabela `public.profiles`

```sql
-- PHF-011 — Perfis de usuários autenticados (staff, organizador, participante).
-- Base para public.is_staff() e para o futuro switch de lib/supabase/server.ts para SSR.
--
-- RLS deny-all: nenhuma policy para clientes. Escrita/leitura só via service_role.
-- Leitura autenticada do próprio perfil pode ser adicionada em issue separada quando
-- o SSR de fato ler profiles (hoje o servidor usa service_role, então nada quebra).

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','moderador','organizador','participante')),
  criado_em timestamptz not null default now()
);

comment on table public.profiles is
  'PHF-011: role do usuario autenticado. admin/moderador = staff (is_staff()=TRUE); '
  'organizador = decide deletion_request via endpoint (nao e staff); '
  'participante = default, sem privilegio cross-evento.';

comment on column public.profiles.role is
  'admin|moderador (staff cross-evento) | organizador | participante';

-- Deny-all: RLS ligado, sem policies para clientes.
alter table public.profiles enable row level security;
```

### 2.b Função `public.is_staff()`

```sql
-- PHF-011 — is_staff(): TRUE se auth.uid() aponta para profile com role staff.
--
-- SECURITY DEFINER: precisa BYPASSAR o RLS deny-all de profiles para que as policies
--   das outras tabelas consigam consultá-la. Sem definer, seria always-FALSE.
-- STABLE: mesma entrada (auth.uid()) => mesmo resultado dentro da query, permitindo
--   o planner cachear o resultado em vez de reavaliar por linha (crítico p/ galeria).
-- SET search_path = '': padrao obrigatorio do repo (ver phf023, phf063). Anti
--   search_path injection — funcao com definer NUNCA pode herdar search_path do caller.
-- organizador NAO e staff: decide deletion_request via endpoint (phf063), com auth
--   resolvida no server, nao via RLS.

create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin','moderador')
  );
$$;

comment on function public.is_staff() is
  'PHF-011: TRUE para profiles.role IN (admin, moderador). SECURITY DEFINER para '
  'bypassar RLS deny-all de profiles. STABLE para cache do planner. Reutilizada por '
  'phf082 (audit_log) e phf063 (autorizacao server-side).';

-- Least-privilege: authenticated e anon podem executar (a funcao decide se retorna
-- TRUE); service_role nao precisa (bypassa RLS de qualquer jeito).
revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to anon, authenticated;
```

### 2.c Matriz papel × tabela × operação

**LEITURA (SELECT):**

| Tabela | anon | device (JWT com claim `event_id`) | staff (`is_staff()`) | authenticated s/ staff |
|---|---|---|---|---|
| `events` | `status='ativo'` | `event_id = claim` | TUDO | deny |
| `slideshow_config` | deny | `event_id = claim` | TUDO | deny |
| `media_items` | `status='aprovado' AND event ativo` | `event_id = claim` | TUDO | deny |
| `moderation_log` | deny | deny | TUDO (via join `media_items`) | deny |
| `consent_record` | deny | deny | TUDO (via join `media_items`) | deny |
| `deletion_request` | deny | deny | TUDO (via join `media_items`) | deny |
| `devices` | deny | próprio device (`id = (claim device_id)::uuid`) | TUDO | deny |
| `audit_log` | deny | deny | TUDO (policy já criada em phf082) | deny |
| `profiles` | deny | deny | deny (só `service_role`) | deny |

**ESCRITA (INSERT/UPDATE/DELETE):** deny para todos os clientes em todas as tabelas — `service_role` bypassa RLS. Consistente com `phf012`/`phf082`/`phf063`.

### 2.d Policies SQL (por tabela, na ordem da migração)

```sql
-- ============================================================
-- events — habilitar RLS + policies
-- ============================================================
alter table public.events enable row level security;

-- Anon lê apenas eventos ativos (galeria pública, rota /evento/[slug]).
create policy "events: anon le ativos" on public.events
  for select to anon
  using ( status = 'ativo' );

-- Device pareado lê o próprio evento (via claim event_id no JWT).
create policy "events: device le proprio evento" on public.events
  for select to authenticated
  using ( id = (auth.jwt() ->> 'event_id')::uuid );

-- Staff lê cross-evento.
create policy "events: staff le tudo" on public.events
  for select to authenticated
  using ( public.is_staff() );

-- ============================================================
-- slideshow_config — habilitar RLS + policies
-- ============================================================
alter table public.slideshow_config enable row level security;

-- Device pareado lê a config do próprio evento (telão).
create policy "slideshow_config: device le proprio evento" on public.slideshow_config
  for select to authenticated
  using ( event_id = (auth.jwt() ->> 'event_id')::uuid );

-- Staff lê cross-evento.
create policy "slideshow_config: staff le tudo" on public.slideshow_config
  for select to authenticated
  using ( public.is_staff() );

-- ============================================================
-- media_items — policies (RLS ja habilitado no initial_schema)
-- ============================================================
-- SILENCIO DE MODERACAO (regra inegociavel CLAUDE.md): a policy anon EXIGE
-- status='aprovado' — participante NUNCA descobre status reprovado/erro/excluido.
-- Filtro por evento ativo evita vazar midia de evento encerrado sem passar por staff.
create policy "media_items: anon le aprovado de evento ativo" on public.media_items
  for select to anon
  using (
    status = 'aprovado'
    and event_id in (select id from public.events where status = 'ativo')
  );

-- Device pareado lê tudo do próprio evento (telão precisa ver pendente/aprovado
-- para renderizar pipeline de moderação; a UI decide o que exibir).
create policy "media_items: device le proprio evento" on public.media_items
  for select to authenticated
  using ( event_id = (auth.jwt() ->> 'event_id')::uuid );

-- Staff lê cross-evento (moderação, dashboard).
create policy "media_items: staff le tudo" on public.media_items
  for select to authenticated
  using ( public.is_staff() );

-- ============================================================
-- moderation_log — só staff, cross-evento
-- ============================================================
create policy "moderation_log: staff le tudo" on public.moderation_log
  for select to authenticated
  using ( public.is_staff() );

-- ============================================================
-- consent_record — só staff, cross-evento (LGPD: prova de consentimento)
-- ============================================================
create policy "consent_record: staff le tudo" on public.consent_record
  for select to authenticated
  using ( public.is_staff() );

-- ============================================================
-- deletion_request — só staff, cross-evento (auditoria de exclusao)
-- ============================================================
create policy "deletion_request: staff le tudo" on public.deletion_request
  for select to authenticated
  using ( public.is_staff() );

-- ============================================================
-- devices — device le a si mesmo; staff le tudo
-- ============================================================
-- Device se identifica via claim custom device_id no JWT (issue separada de auth
-- do device emite o token com { event_id, device_id }). Sem esse claim, deny.
create policy "devices: proprio device le a si mesmo" on public.devices
  for select to authenticated
  using ( id = nullif(auth.jwt() ->> 'device_id', '')::uuid );

create policy "devices: staff le tudo" on public.devices
  for select to authenticated
  using ( public.is_staff() );
```

**Nota sobre `audit_log`**: a policy `for select to authenticated using (public.is_staff())` já existe em `phf082`. Após esta migração rodar antes (novo timestamp), a função existe e a policy do `phf082` fica funcional pela primeira vez desde o merge daquela PR.

**Nota sobre `profiles`**: RLS ligado sem policies = deny-all. Correto por design — o SSR ainda usa `service_role`, então o servidor consulta `profiles` bypassando RLS.

---

## 3. Rollback (documentado, NÃO migrado)

**Local**: `docs/feature-flags.md` §"PHF-011 — rollback". Snippet SQL exato, **não** é migração real (mecanismo "migração reversível" do repo).

**Ordem inversa** (drops de policies antes de tabelas/funções):

```sql
-- PHF-011 rollback — aplicar via psql/Studio como service_role.
-- ATENCAO: NAO dropa is_staff() nem profiles (phf082/phf063 dependem).
-- NAO desabilita RLS das tabelas (fica deny-all — situacao segura, pre-011).

-- devices
drop policy if exists "devices: staff le tudo" on public.devices;
drop policy if exists "devices: proprio device le a si mesmo" on public.devices;

-- deletion_request
drop policy if exists "deletion_request: staff le tudo" on public.deletion_request;

-- consent_record
drop policy if exists "consent_record: staff le tudo" on public.consent_record;

-- moderation_log
drop policy if exists "moderation_log: staff le tudo" on public.moderation_log;

-- media_items
drop policy if exists "media_items: staff le tudo" on public.media_items;
drop policy if exists "media_items: device le proprio evento" on public.media_items;
drop policy if exists "media_items: anon le aprovado de evento ativo" on public.media_items;

-- slideshow_config (mantém RLS ligada — deny-all pós-drop)
drop policy if exists "slideshow_config: staff le tudo" on public.slideshow_config;
drop policy if exists "slideshow_config: device le proprio evento" on public.slideshow_config;

-- events (mantém RLS ligada — deny-all pós-drop; rota publica quebra ate reaplicar)
drop policy if exists "events: staff le tudo" on public.events;
drop policy if exists "events: device le proprio evento" on public.events;
drop policy if exists "events: anon le ativos" on public.events;

-- NAO dropar: public.is_staff() (phf082 policy depende)
-- NAO dropar: public.profiles (rollback nao destroi dados de staff cadastrados)
-- NAO desabilitar RLS: manter deny-all e mais seguro que abrir tabelas
```

**Efeito**: tabelas de domínio voltam ao estado deny-all pré-PHF-011. `is_staff()` continua existindo retornando FALSE para todos (ninguém está em `profiles` que satisfaça o `EXISTS` se a tabela for esvaziada; se mantida, staff cadastrado continua staff — não quebra `phf082`).

**Rollback do rename de `phf082`**: `git revert` do PR de PHF-011.

---

## 4. Design dos testes pgTAP

**Arquivo**: `supabase/tests/phf011_rls_is_staff_test.sql`. Padrão: `begin; select plan(N); ...; select * from finish(); rollback;` (ver `phf082_audit_log_test.sql`).

**Setup comum** (por teste): inserir `auth.users`, `profiles` (staff/organizador), 2 eventos concorrentes (A ativo, B encerrado), media_items de status variados em cada evento, consent/deletion/moderation atrelados.

| # | Cenário Gherkin (spec.md §5) | Função pgTAP | Setup | Assert |
|---|---|---|---|---|
| 1 | Anon lê apenas mídia aprovada do evento X | `test_anon_media_items_only_aprovado` | evento A ativo, 3 medias (aprovado, pendente, reprovado) | `SET LOCAL role anon; SELECT count(*) FROM media_items WHERE event_id=A` = 1 |
| 2 | Anon não vê status=reprovado (silêncio) | `test_anon_nao_ve_reprovado` | idem | `SET LOCAL role anon; SELECT count(*) FROM media_items WHERE status='reprovado'` = 0 |
| 3 | Anon não vê mídia de evento encerrado | `test_anon_nao_ve_evento_encerrado` | evento B encerrado com media aprovada | `SET LOCAL role anon; SELECT count(*) FROM media_items WHERE event_id=B` = 0 |
| 4 | Anon lê events ativos, não os encerrados | `test_anon_events_apenas_ativos` | eventos A ativo, B encerrado | `SET LOCAL role anon; SELECT count(*) FROM events` = 1 |
| 5 | Anon não lê slideshow_config | `test_anon_slideshow_config_deny` | slideshow_config existe p/ A | `SET LOCAL role anon; SELECT count(*) FROM slideshow_config` = 0 |
| 6 | Device pareado ao evento A lê apenas eventos/media de A | `test_device_cross_event_isolation` | JWT claim event_id=A; medias em A e B | claim=A → `SELECT count(*) FROM media_items WHERE event_id=B` = 0 |
| 7 | Device lê slideshow_config do próprio evento | `test_device_le_slideshow_proprio` | JWT claim event_id=A | `SELECT count(*) FROM slideshow_config WHERE event_id=A` = 1 |
| 8 | Device lê tudo do próprio evento (inclusive pendente) | `test_device_le_pendente_proprio_evento` | claim=A, media pendente em A | count(pendente)=1 |
| 9 | Device NÃO lê moderation_log (só staff) | `test_device_deny_moderation_log` | claim=A, moderation_log em A | count = 0 |
| 10 | Staff (admin) lê media_items cross-evento | `test_staff_admin_cross_event` | profile admin; medias em A e B | count(*) medias >= 2 |
| 11 | Staff (moderador) lê consent_record cross-evento | `test_staff_moderador_le_consent` | profile moderador; consent em A e B | count(consent) >= 2 |
| 12 | Staff lê deletion_request e moderation_log | `test_staff_le_deletion_e_moderation` | profile admin | count > 0 em ambas |
| 13 | Organizador autenticado (não staff) obtém deny em moderation_log | `test_organizador_nao_e_staff` | profile organizador | count(moderation_log)=0 |
| 14 | Participante autenticado (não staff) obtém deny em consent_record | `test_participante_deny_consent` | profile participante | count(consent_record)=0 |
| 15 | `is_staff()` retorna FALSE para organizador/participante | `test_is_staff_boolean` | 2 users diferentes | admin→TRUE, organizador→FALSE, participante→FALSE |
| 16 | Rollback safety — `is_staff()` persiste, `audit_log` phf082 continua acessível a staff | `test_rollback_preserva_audit_log` | (opcional smoke após drop policies phf011) | staff ainda lê audit_log |
| 17 | `profiles` é deny-all para authenticated (SSR usa service_role) | `test_profiles_deny_authenticated` | profile admin | `SET LOCAL role authenticated; SELECT count(*) FROM profiles` = 0 |
| 18 | Anon não consegue INSERT em media_items (deny-all escrita) | `test_anon_nao_escreve_media_items` | — | `throws_ok` com SQLSTATE 42501 |

Total: **18 asserts** cobrindo matriz mínima da Success Criteria (≥ 12).

**Simulação de JWT no pgTAP** (padrão observado no `phf082_audit_log_test.sql:51`):
```sql
set local request.jwt.claims to
  '{"sub":"22222222-...","role":"authenticated","event_id":"aaaa-..."}';
set local role authenticated;
```

---

## 5. Decisões técnicas com rationale

### Decisão 1: `is_staff()` — `SECURITY DEFINER + STABLE + SET search_path = ''`

**Escolha**: definer + stable + search_path vazio.
**Alternativas descartadas**:
- `SECURITY INVOKER`: policy sempre retornaria FALSE (invoker não passa por RLS deny-all de `profiles`).
- `IMMUTABLE`: mente para o planner — `auth.uid()` varia por sessão.
- Sem `SET search_path = ''`: aberto a search-path injection (função definer herdaria search_path do caller).

**Rationale**: definer é obrigatório para consultar `profiles` (deny-all); STABLE permite cache do planner na mesma query (crítico para galeria hot); `search_path=''` é padrão obrigatório do repo (ver `phf023`, `phf063`) e trava a superfície de ataque.

### Decisão 2: Policy por operação separada, ninguém escreve como cliente

**Escolha**: apenas `for select` — INSERT/UPDATE/DELETE sem policy.
**Alternativa descartada**: `for all using (...)` com WITH CHECK — permitiria escrita autenticada.
**Rationale**: consistente com `phf012` (bucket privado), `phf082` (audit_log append-only), `phf063` (RPC com definer). Toda escrita passa por `service_role` server-side, o que centraliza autorização (organizador resolvido no endpoint) e mantém auditoria confiável. Sem policy de escrita = zero risco de forjar registro.

### Decisão 3: Filtro "evento ativo" via subquery em `media_items` anon, não coluna denormalizada

**Escolha**: `event_id IN (SELECT id FROM events WHERE status='ativo')`.
**Alternativa descartada**: replicar `event_status` em `media_items` para evitar subquery.
**Rationale**: denormalização exigiria trigger de sincronização (fonte extra de bug de consistência). Subquery é cacheável pelo planner com index em `events.id` (PK) e index composto `media_items (event_id, status)` já existente. Custo aceitável para o benefício de fonte única de verdade.

### Decisão 4: Device se identifica via claim JWT `event_id` (e `device_id` para `devices`), não join a `devices`

**Escolha**: `(auth.jwt() ->> 'event_id')::uuid = event_id`.
**Alternativa descartada**: join `devices` na policy: `event_id IN (SELECT event_id FROM devices WHERE id = auth.uid() AND status='pareado')`.
**Rationale**: (a) zero join = zero custo em query hot; (b) desacopla policy da modelagem de `devices` (revogação futura só invalida o token, não muda RLS); (c) claim é imutável no lifetime do JWT (perf previsível); (d) segurança do claim é responsabilidade do emissor (issue separada de auth do device) — princípio de separation of concerns. Trade-off: revogação de token exige TTL curto ou lista de revogação server-side (fora do escopo PHF-011).

### Decisão 5: Renomear `phf082` para `20260714120001` (não `phf023` para `20260714119999`)

**Escolha**: `git mv phf082 → 20260714120001_phf082_audit_log.sql`.
**Alternativa descartada**: renumerar `phf023` para timestamp anterior.
**Rationale**: `phf082` é a que já **quebra** hoje (`is_staff()` inexistente) — ela é a fonte do gap. Renumerá-la para *depois* de `phf023` mantém a semântica original ("phf082 vem depois") e reduz superfície de rebase. `phf023` está funcional e não deve ser tocada.

### Decisão 6: `events` e `slideshow_config` recebem RLS (não ficam abertas)

**Escolha**: `alter table events enable row level security` + policies explícitas.
**Alternativa descartada**: deixar `events` sem RLS (raiz aberta a leitura por PostgREST).
**Rationale**: sem RLS, qualquer cliente lista todos os eventos (inclusive rascunho, encerrado, com `moderacao_on=false`). Com RLS + policy `anon: status='ativo'`, a rota pública `/evento/[slug]` continua funcionando, mas eventos internos ficam invisíveis. Custo mínimo, ganho de defesa em profundidade.

### Decisão 7: `storage.objects` RLS fica para v2

**Escolha**: adiar policies de `storage.objects` mesmo com PHF-012 delegando.
**Alternativa descartada**: adicionar policies casando `bucket_id='media' AND (storage.foldername(name))[1] = event_id::text` agora.
**Rationale**: hoje ninguém lê `storage.objects` direto (apenas via URLs pré-assinadas geradas com `service_role`). Adicionar policy hoje é código não exercitado (risco de false-positive em teste). Postergar para quando houver caso de uso real reduz superfície de manutenção. Documentar como débito em `docs/feature-flags.md`.

---

## 6. Rename de `phf082` — instruções concretas

```bash
# 1. Renomear a migração
git mv supabase/migrations/20260714120000_phf082_audit_log.sql \
       supabase/migrations/20260714120001_phf082_audit_log.sql

# 2. Test NÃO muda de nome (o test não depende do timestamp da migração)
# supabase/tests/phf082_audit_log_test.sql permanece inalterado.

# 3. Após pull, devs com DB local precisam:
supabase db reset
```

**No PR (descrição)**: incluir alerta em bloco `> [!IMPORTANT]` — devs com stack local desatualizada precisam `supabase db reset` (não é destrutivo em prod, mas o rename semanticamente cria novo estado ordenado).

---

## 7. Impacto em CI e devs

| Item | Impacto |
|---|---|
| `supabase test db` do zero | **Passa** pela primeira vez (hoje quebra em `phf082` por falta de `is_staff()`) |
| DB local dos devs | Precisa `supabase db reset` após pull (comunicar no PR) |
| `ci.yml` | Nenhum código novo; `supabase test db` na pipeline (se já roda) passa a validar as 18 asserts do PHF-011 |
| `secret-scan.yml` | Sem impacto |
| `pr-review.yml` (Gemini CLI) | Lê `02-spec.md §5` + este design.md — Gherkin de silêncio de moderação e isolamento cross-evento cobertos |
| `docs/feature-flags.md` | **Novo arquivo** (sdd-tasks lista como task): documenta mecanismo "migração reversível" + snippet exato de `phf011_down.sql` |
| `lib/supabase/server.ts` | **Sem mudança** — continua com `service_role`. Switch para SSR + leitura de `profiles` é fora do escopo (issue futura). |
| Rota pública `/evento/[slug]` | Continua funcionando via anon (policy `events: anon le ativos` + `media_items: anon le aprovado de evento ativo`) |

---

## Open Questions

Nenhuma bloqueadora para `sdd-tasks`. Duas notas de acompanhamento (não bloqueiam):

- [ ] Issue separada: emissão de JWT com claims `event_id` e `device_id` para device pareado (assumido por este design; policies já estão prontas mas leitura só funciona quando o emissor existir).
- [ ] Issue futura v2: RLS de `storage.objects` casando prefixo de path com `event_id::text`.
