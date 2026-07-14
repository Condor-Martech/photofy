-- pgTAP: RLS por event_id (PHF-011). Roda com `supabase test db`.
-- Trava as fronteiras de segurança de risco alto: participante (anon) NUNCA vê
-- pendente/reprovado nem PII (consent/moderation/deletion) e NÃO pode se auto-aprovar;
-- staff (linha em profiles) vê tudo. Cobre o Gherkin "Múltiplos eventos ativos
-- isolados" no nível da fronteira pública-vs-staff (§5).
begin;
select plan(21);

-- RLS habilitado em todas as tabelas de domínio
select is(relrowsecurity, true, 'RLS habilitado: ' || relname)
  from pg_class
  where oid in ('public.events'::regclass, 'public.slideshow_config'::regclass,
                'public.media_items'::regclass, 'public.moderation_log'::regclass,
                'public.consent_record'::regclass, 'public.deletion_request'::regclass,
                'public.devices'::regclass, 'public.profiles'::regclass);

-- Seed como superuser (bypassa RLS)
insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111');
insert into profiles (id, role) values ('11111111-1111-1111-1111-111111111111', 'admin');

insert into events (id, slug, nome, data_inicio)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ev-a', 'Evento A', now());

insert into media_items (id, event_id, tipo, status, url_original) values
  ('dddddddd-dddd-dddd-dddd-ddddddddddd1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'foto', 'pendente', 's://p'),
  ('dddddddd-dddd-dddd-dddd-ddddddddddd2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'foto', 'aprovado', 's://a');

insert into consent_record (media_id, aceite_termos, aceite_conteudo, ip_hash, versao_termos)
  values ('dddddddd-dddd-dddd-dddd-ddddddddddd1', true, true, 'sha256:pii', 'v1');
insert into moderation_log (media_id, moderador_id, acao)
  values ('dddddddd-dddd-dddd-dddd-ddddddddddd2', '11111111-1111-1111-1111-111111111111', 'aprovar');
insert into deletion_request (media_id, solicitante)
  values ('dddddddd-dddd-dddd-dddd-ddddddddddd2', 'titular@ex.com');

-- ===== Participante anônimo =====
set local role anon;

select is((select count(*)::int from media_items), 1, 'anon vê só o aprovado (1 de 2)');
select is((select count(*)::int from media_items where status = 'pendente'), 0, 'anon não vê pendente');
select is((select count(*)::int from consent_record), 0, 'anon não vê PII de consentimento');
select is((select count(*)::int from moderation_log), 0, 'anon não vê auditoria de moderação');
select is((select count(*)::int from deletion_request), 0, 'anon não vê solicitações de exclusão');
select is((select count(*)::int from events), 1, 'anon lê eventos (galeria/upload público)');

select lives_ok(
  $$ insert into media_items (event_id, tipo, status, url_original)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'foto', 'pendente', 's://novo') $$,
  'anon envia media_item pendente');
select throws_ok(
  $$ insert into media_items (event_id, tipo, status, url_original)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'foto', 'aprovado', 's://hack') $$,
  '42501', null, 'anon NÃO pode se auto-aprovar (WITH CHECK bloqueia)');
select throws_ok(
  $$ insert into events (slug, nome, data_inicio) values ('ev-x', 'X', now()) $$,
  '42501', null, 'anon NÃO cria evento');

reset role;

-- ===== Staff autenticado (profile admin) =====
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is((select count(*)::int from media_items where id = 'dddddddd-dddd-dddd-dddd-ddddddddddd1'), 1, 'staff vê o pendente semeado');
select is((select count(*)::int from consent_record), 1, 'staff lê consentimento');
select is((select count(*)::int from moderation_log), 1, 'staff lê auditoria');
select is((select count(*)::int from deletion_request), 1, 'staff lê solicitações de exclusão');

reset role;

select * from finish();
rollback;
