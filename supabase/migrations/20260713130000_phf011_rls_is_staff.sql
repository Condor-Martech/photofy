-- PHF-011 — RLS por event_id + public.is_staff() + tabela public.profiles.
-- Risco IA: ALTO (isolamento entre eventos + silencio de moderacao). Ver:
--   * openspec/changes/phf-011-rls-is-staff/spec.md  (16 cenarios Gherkin)
--   * openspec/changes/phf-011-rls-is-staff/design.md (matriz papel x tabela + rationale)
--   * openspec/changes/phf-011-rls-is-staff/proposal.md
--   * CLAUDE.md secao "Regras de dominio inegociaveis" (silencio total, RLS obrigatorio)
--
-- Ordem obrigatoria (dependencias): profiles -> is_staff() -> enable RLS em
-- events/slideshow_config -> policies por tabela. Este arquivo deve rodar ANTES
-- de 20260714120001_phf082_audit_log.sql (que referencia is_staff()) e do phf063.
--
-- Escopo do arquivo:
--   BLOCO A: tabela public.profiles (deny-all RLS, escrita/leitura via service_role).
--   BLOCO B: funcao public.is_staff() (SECURITY DEFINER, STABLE, search_path='').
--   BLOCO C: alter table ... enable row level security em events e slideshow_config.
--   BLOCO D: policies de SELECT em ordem — events -> slideshow_config -> media_items
--            -> moderation_log -> consent_record -> deletion_request -> devices.
--
-- Regras inegociaveis reforcadas por este arquivo:
--   * NENHUMA policy de INSERT/UPDATE/DELETE para clientes. Escrita = service_role.
--   * Policy publica de media_items EXIGE status='aprovado' (silencio de moderacao).
--   * Isolamento cross-evento via (auth.jwt() ->> 'event_id')::uuid = event_id.
--
-- Rollback: docs/feature-flags.md contem o snippet SQL phf011_down (apenas drop policy;
-- NUNCA dropa is_staff() nem profiles — phf082/phf063 dependem da funcao).

-- ============================================================
-- BLOCO A — public.profiles (perfis de usuarios autenticados)
-- ============================================================
--
-- Base para public.is_staff() e para o futuro switch de lib/supabase/server.ts para
-- SSR + leitura de profiles. RLS deny-all: nenhuma policy para clientes. Escrita e
-- leitura ocorrem exclusivamente via service_role.
--
-- Papeis (check constraint):
--   * admin       -> staff cross-evento (is_staff() = TRUE)
--   * moderador   -> staff cross-evento (is_staff() = TRUE)
--   * organizador -> NAO e staff. Decide deletion_request via endpoint (phf063).
--   * participante -> default. Sem privilegio cross-evento.
--
-- Leitura autenticada do proprio perfil (policy authenticated: id = auth.uid()) fica
-- para issue separada quando o SSR de fato ler profiles direto (hoje usa service_role).

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

-- Deny-all: RLS ligado, sem policies para clientes. service_role bypassa RLS.
alter table public.profiles enable row level security;


-- ============================================================
-- BLOCO B — public.is_staff() (funcao classificadora de papel)
-- ============================================================
--
-- Retorna TRUE se auth.uid() aponta para profiles com role IN (admin, moderador).
-- Reutilizada por phf082 (audit_log) e phf063 (autorizacao server-side).
--
-- Decisao 1 (design.md §5.1): SECURITY DEFINER + STABLE + SET search_path = ''.
--   * SECURITY DEFINER: PRECISA bypassar o RLS deny-all de profiles. Sem definer,
--     seria always-FALSE porque o caller nao tem policy que leia profiles.
--   * STABLE: mesma entrada (auth.uid()) -> mesmo resultado dentro da query.
--     Permite ao planner cachear em vez de reavaliar por linha (critico para
--     galeria publica hot).
--   * SET search_path = '': padrao obrigatorio do repo (ver phf023, phf063).
--     Anti search_path injection: funcao com DEFINER NUNCA pode herdar search_path
--     do caller (senao caller malicioso poderia envenenar a resolucao de "profiles").
--   * organizador NAO e staff: decide deletion_request via endpoint (phf063), com
--     auth resolvida no server, nao via RLS. Manter escopo minimo evita escalada.

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

-- Least-privilege: authenticated e anon podem executar (a propria funcao decide se
-- retorna TRUE); service_role nao precisa (bypassa RLS de qualquer jeito).
revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to anon, authenticated;


-- ============================================================
-- BLOCO C — Habilitar RLS em events e slideshow_config
-- ============================================================
--
-- initial_schema (PHF-010) deixou events e slideshow_config sem RLS porque as
-- policies dependiam do modelo de acesso definido por PHF-011. Agora habilitamos
-- e definimos policies na secao seguinte. Defesa em profundidade: sem RLS, qualquer
-- cliente lista todos os eventos (rascunho, encerrado, moderacao_on=false).

alter table public.events           enable row level security;
alter table public.slideshow_config enable row level security;


-- ============================================================
-- BLOCO D — Policies de SELECT (uma tabela por vez, em ordem)
-- ============================================================
--
-- INSERT/UPDATE/DELETE: sem policy em nenhuma tabela = deny-all para clientes.
-- Consistente com phf012 (bucket privado), phf082 (audit_log append-only) e phf063
-- (RPC com definer). Escrita passa por service_role (bypassa RLS), que centraliza
-- autorizacao no server (organizador resolvido no endpoint) e mantem auditoria
-- confiavel. Zero risco de forjar registro via PostgREST.

-- ----------------------------------------------------------------
-- events — 3 policies (anon ativos / device proprio / staff tudo)
-- ----------------------------------------------------------------

-- Anon le apenas eventos ativos (rota publica /evento/[slug]).
-- Filtro simples em coluna com index de PK; sem impacto de perf.
create policy "events: anon le ativos" on public.events
  for select to anon
  using ( status = 'ativo' );

-- Device pareado le o proprio evento (via claim event_id no JWT emitido por
-- Device Authorization Flow — issue separada emite o token com { event_id, device_id }).
-- Decisao 4 (design.md §5.4): usar claim JWT em vez de join a devices reduz custo em
-- query hot e desacopla RLS da modelagem de devices. Revogacao futura invalida o
-- token (TTL curto), sem exigir mudanca de RLS.
create policy "events: device le proprio evento" on public.events
  for select to authenticated
  using ( id = (auth.jwt() ->> 'event_id')::uuid );

-- Staff (admin/moderador) le cross-evento (dashboard, moderacao).
create policy "events: staff le tudo" on public.events
  for select to authenticated
  using ( public.is_staff() );


-- ----------------------------------------------------------------
-- slideshow_config — 2 policies (device proprio / staff tudo)
-- ----------------------------------------------------------------
--
-- anon nao le slideshow_config: telao publico e config interna (parametros que
-- so o proprio evento pareado precisa consumir).

create policy "slideshow_config: device le proprio evento" on public.slideshow_config
  for select to authenticated
  using ( event_id = (auth.jwt() ->> 'event_id')::uuid );

create policy "slideshow_config: staff le tudo" on public.slideshow_config
  for select to authenticated
  using ( public.is_staff() );


-- ----------------------------------------------------------------
-- media_items — 3 policies (anon aprovado / device proprio / staff tudo)
-- ----------------------------------------------------------------
--
-- SILENCIO DE MODERACAO (regra INEGOCIAVEL do CLAUDE.md): a policy anon EXIGE
-- status='aprovado' em conjuncao. Participante NUNCA descobre a existencia de
-- rows com status IN (pendente, reprovado, erro). Filtro por status na query do
-- cliente e silenciosamente reduzido a zero rows quando contradiz a policy.
--
-- Decisao 3 (design.md §5.3): filtro por evento ativo via subquery em vez de
-- coluna denormalizada. Subquery e cacheavel pelo planner (index events.id PK +
-- index composto media_items(event_id, status)). Denormalizar exigiria trigger
-- de sincronizacao — fonte extra de bug de consistencia.

create policy "media_items: anon le aprovado de evento ativo" on public.media_items
  for select to anon
  using (
    status = 'aprovado'
    and event_id in (select id from public.events where status = 'ativo')
  );

-- Device pareado le TUDO do proprio evento (telao precisa ver pendente/aprovado
-- para renderizar pipeline de moderacao; a UI decide o que exibir).
create policy "media_items: device le proprio evento" on public.media_items
  for select to authenticated
  using ( event_id = (auth.jwt() ->> 'event_id')::uuid );

-- Staff le cross-evento (moderacao, dashboard).
create policy "media_items: staff le tudo" on public.media_items
  for select to authenticated
  using ( public.is_staff() );


-- ----------------------------------------------------------------
-- moderation_log — 1 policy (so staff, cross-evento)
-- ----------------------------------------------------------------
--
-- Nao ha acesso publico nem por device. Historico de decisoes de moderacao e
-- ferramenta interna. Organizador autenticado (nao staff) tambem recebe deny.

create policy "moderation_log: staff le tudo" on public.moderation_log
  for select to authenticated
  using ( public.is_staff() );


-- ----------------------------------------------------------------
-- consent_record — 1 policy (so staff, cross-evento — LGPD)
-- ----------------------------------------------------------------
--
-- Prova de consentimento LGPD. So staff le. Escrita continua exclusiva de
-- service_role (fluxo de upload persiste consent_record no endpoint).

create policy "consent_record: staff le tudo" on public.consent_record
  for select to authenticated
  using ( public.is_staff() );


-- ----------------------------------------------------------------
-- deletion_request — 1 policy (so staff, cross-evento — auditoria)
-- ----------------------------------------------------------------
--
-- Solicitacoes formais de exclusao de galeria permanente. So staff le; execucao
-- e via phf063 (RPC com service_role apos autorizacao server-side).

create policy "deletion_request: staff le tudo" on public.deletion_request
  for select to authenticated
  using ( public.is_staff() );


-- ----------------------------------------------------------------
-- devices — 2 policies (proprio device / staff tudo)
-- ----------------------------------------------------------------
--
-- Device se identifica via claim custom device_id no JWT (issue separada de
-- Device Authorization Flow emite token com { event_id, device_id }). Sem esse
-- claim (nullif trata string vazia como NULL), o cast falha e a policy deny.
-- Staff le todos os devices (dashboard de pareamento/revogacao).

create policy "devices: proprio device le a si mesmo" on public.devices
  for select to authenticated
  using ( id = nullif(auth.jwt() ->> 'device_id', '')::uuid );

create policy "devices: staff le tudo" on public.devices
  for select to authenticated
  using ( public.is_staff() );

-- Nota sobre audit_log: a policy "audit_log: staff le" foi criada em phf082 e
-- referencia public.is_staff(). Com esta migracao rodando ANTES de phf082 (novo
-- timestamp 20260714120001), a funcao ja existe quando aquela policy for avaliada.
-- Nao redefinimos audit_log aqui — fonte unica em phf082.
