-- PHF-011 — RLS por event_id em todas as tabelas de domínio (02-spec.md §3, §6, §7).
-- RISCO ALTO: falha aqui vaza dados entre eventos/clientes ou expõe PII (ip_hash,
-- consentimento, auditoria de moderação). Cobre o Gherkin "Múltiplos eventos ativos
-- simultaneamente e isolados" (§5) e o não-funcional "isolamento por evento via RLS".
--
-- Modelo de acesso (02-spec.md: "nenhuma role acessa dados de um evento que não seja o
-- seu, exceto admin/organizador (role em profiles)"):
--   * anon (participante, sem login): envia mídia + consentimento; lê SÓ o aprovado
--     (galeria/telão são superfícies públicas por design); nunca vê pendente/reprovado
--     nem PII (consent_record, moderation_log, deletion_request).
--   * authenticated staff (linha em profiles): acesso total a todos os eventos — a
--     exceção que o spec autoriza.
--   * service_role (workers, API server-side): bypassa RLS por design.
--
-- Isolamento por evento: para dados sensíveis/não-aprovados a fronteira é "só staff",
-- e staff é cross-evento por decisão de produto — logo nenhuma role de participante
-- alcança dado de outro evento. Conteúdo aprovado é público (galeria pública), então
-- não é isolado por RLS; o recorte por evento na galeria/telão é filtro de query.
--
-- Boas práticas Supabase: TO explícito por role; (select auth.uid()) p/ cache de
-- initplan; UPDATE com USING + WITH CHECK; is_staff() é STABLE SECURITY INVOKER e só
-- é chamada em policies TO authenticated (nunca sob anon, evitando qualquer
-- dependência de grant em profiles no caminho anônimo).

-- profiles: identifica o staff. Pré-requisito que o schema PHF-010 não criou; a criação
-- de staff é feita via service_role/dashboard (enable_signup=false).
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'moderador',   -- admin | organizador | moderador
  nome text,
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;

create policy "profiles: usuário lê o próprio" on profiles
  for select to authenticated
  using ( (select auth.uid()) = id );

-- Helper: o chamador atual é staff? SECURITY INVOKER (usa a policy de self-read acima,
-- sem bypassar RLS). STABLE p/ o planner cachear dentro do statement.
create or replace function is_staff() returns boolean
  language sql stable security invoker set search_path = ''
as $$ select exists (select 1 from public.profiles where id = (select auth.uid())) $$;

-- ===== events (raiz) — sem RLS na PHF-010; policies definidas aqui =====
alter table events enable row level security;
create policy "events: leitura pública" on events
  for select to anon, authenticated using ( true );
create policy "events: staff gerencia" on events
  for all to authenticated using ( is_staff() ) with check ( is_staff() );

-- ===== slideshow_config — config de exibição, lida pelo telão/galeria =====
alter table slideshow_config enable row level security;
create policy "slideshow_config: leitura pública" on slideshow_config
  for select to anon, authenticated using ( true );
create policy "slideshow_config: staff gerencia" on slideshow_config
  for all to authenticated using ( is_staff() ) with check ( is_staff() );

-- ===== media_items — fronteira de segurança central =====
-- Público vê SÓ aprovado (galeria/telão); staff vê tudo.
create policy "media_items: anon lê aprovados" on media_items
  for select to anon using ( status = 'aprovado' );
create policy "media_items: authenticated lê aprovados ou staff vê tudo" on media_items
  for select to authenticated using ( status = 'aprovado' or is_staff() );
-- Participante envia; RLS obriga nascer 'pendente' (não pode auto-aprovar).
create policy "media_items: participante envia pendente" on media_items
  for insert to anon, authenticated with check ( status = 'pendente' );
-- Só staff modera (muda status). Workers usam service_role (bypass).
create policy "media_items: staff atualiza" on media_items
  for update to authenticated using ( is_staff() ) with check ( is_staff() );
create policy "media_items: staff remove" on media_items
  for delete to authenticated using ( is_staff() );

-- ===== consent_record — PII (ip_hash): nunca legível por participante =====
create policy "consent_record: participante grava aceite" on consent_record
  for insert to anon, authenticated with check ( true );
create policy "consent_record: só staff lê" on consent_record
  for select to authenticated using ( is_staff() );

-- ===== moderation_log — auditoria: só staff =====
create policy "moderation_log: staff registra" on moderation_log
  for insert to authenticated with check ( is_staff() );
create policy "moderation_log: staff lê" on moderation_log
  for select to authenticated using ( is_staff() );

-- ===== deletion_request — titular solicita; só staff lê/executa =====
create policy "deletion_request: titular solicita" on deletion_request
  for insert to anon, authenticated with check ( status = 'pendente' );
create policy "deletion_request: staff lê" on deletion_request
  for select to authenticated using ( is_staff() );
create policy "deletion_request: staff executa" on deletion_request
  for update to authenticated using ( is_staff() ) with check ( is_staff() );

-- ===== devices — pareamento/telas: acesso direto só staff =====
-- (polling de pareamento e emissão de token são server-side via service_role)
create policy "devices: staff gerencia" on devices
  for all to authenticated using ( is_staff() ) with check ( is_staff() );
