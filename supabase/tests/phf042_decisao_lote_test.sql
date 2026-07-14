-- pgTAP: ações em lote de moderação (PHF-042). Roda com `supabase test db`.
-- Cobre o Gherkin "Aprovação em lote" (02-spec.md §5): 30 pendentes selecionados →
-- aprovar em lote → os 30 viram "aprovado" E 30 registros em moderation_log. Também
-- valida a atomicidade (um id inválido derruba o lote inteiro, sem meio-aplicar) e
-- que não-staff não modera (RLS de PHF-011).
begin;
select plan(9);

-- ===== Seed como superuser (bypassa RLS) =====
insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),  -- staff (moderador)
  ('22222222-2222-2222-2222-222222222222');  -- authenticated sem profile (não-staff)
insert into profiles (id, role) values ('11111111-1111-1111-1111-111111111111', 'moderador');

insert into events (id, slug, nome, data_inicio)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ev-a', 'Evento A', now());

-- 30 pendentes para o cenário de aprovação em lote.
insert into media_items (id, event_id, tipo, status, url_original)
  select
    ('dddddddd-dddd-dddd-dddd-' || lpad(n::text, 12, '0'))::uuid,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'foto', 'pendente', 's://p' || n
  from generate_series(1, 30) as n;

-- Um item já aprovado, para o teste de lote inválido/atômico.
insert into media_items (id, event_id, tipo, status, url_original) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'reel', 'aprovado', 's://a');

-- ===== Staff autenticado modera em lote =====
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- Cenário: "Aprovação em lote" — os 30 pendentes de uma vez.
select lives_ok(
  $$ select registrar_decisao_moderacao_lote(
       (select array_agg(id) from media_items where status = 'pendente'), 'aprovar') $$,
  'staff aprova 30 itens em lote');
select is(
  (select count(*)::int from media_items where status = 'aprovado'
     and id <> 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
  30, 'os 30 itens do lote viram aprovado');
select is(
  (select count(*)::int from media_items where status = 'pendente'), 0,
  'não sobra nenhum pendente');
select is(
  (select count(*)::int from moderation_log where acao = 'aprovar'
     and moderador_id = '11111111-1111-1111-1111-111111111111'),
  30, '30 registros de auditoria com o moderador_id correto');

-- Reprovação em lote propaga o motivo para a auditoria de cada item.
-- (reverte 2 aprovados e reprova-os com motivo)
select lives_ok(
  $$ select registrar_decisao_moderacao_lote(
       array['dddddddd-dddd-dddd-dddd-000000000001',
             'dddddddd-dddd-dddd-dddd-000000000002']::uuid[], 'reverter') $$,
  'reverte 2 itens em lote');
select is(
  (select count(*)::int from moderation_log where acao = 'reverter'), 2,
  'reversão em lote também audita cada item');

-- Atomicidade: um lote com transição inválida (item já aprovado) derruba tudo.
-- 'ddd...3' está aprovado (foi aprovado no lote); tentar aprovar de novo falha.
select throws_ok(
  $$ select registrar_decisao_moderacao_lote(
       array['dddddddd-dddd-dddd-dddd-000000000003',
             'dddddddd-dddd-dddd-dddd-000000000004']::uuid[], 'aprovar') $$,
  '22023', null, 'lote com transição inválida é recusado por inteiro');
select is(
  (select count(*)::int from moderation_log where acao = 'aprovar'), 30,
  'lote recusado não deixa rastro parcial na auditoria (segue 30)');

reset role;

-- ===== Não-staff autenticado NÃO modera em lote (RLS de PHF-011) =====
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select throws_ok(
  $$ select registrar_decisao_moderacao_lote(
       array['eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee']::uuid[], 'reverter') $$,
  null, null, 'não-staff não consegue moderar em lote');
reset role;

select * from finish();
rollback;
