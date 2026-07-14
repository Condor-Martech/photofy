-- pgTAP: ações de moderação (PHF-041). Roda com `supabase test db`.
-- Cobre o Gherkin "Moderação em tempo real" (02-spec.md §5): aprovar/reprovar/reverter
-- mudam o status E gravam moderation_log de forma atômica, com moderador_id correto;
-- transições inválidas são recusadas; não-staff não modera (RLS de PHF-011).
begin;
select plan(14);

-- ===== Seed como superuser (bypassa RLS) =====
insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),  -- staff (moderador)
  ('22222222-2222-2222-2222-222222222222');  -- authenticated sem profile (não-staff)
insert into profiles (id, role) values ('11111111-1111-1111-1111-111111111111', 'moderador');

insert into events (id, slug, nome, data_inicio)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ev-a', 'Evento A', now());

insert into media_items (id, event_id, tipo, status, url_original) values
  ('dddddddd-dddd-dddd-dddd-ddddddddddd1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'foto', 'pendente', 's://p1'),
  ('dddddddd-dddd-dddd-dddd-ddddddddddd2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'foto', 'pendente', 's://p2'),
  ('dddddddd-dddd-dddd-dddd-ddddddddddd3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'reel', 'aprovado', 's://a3');

-- ===== Staff autenticado modera =====
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- Cenário: "Moderador aprova um item pendente"
select lives_ok(
  $$ select registrar_decisao_moderacao('dddddddd-dddd-dddd-dddd-ddddddddddd1', 'aprovar') $$,
  'staff aprova um pendente');
select is(
  (select status from media_items where id = 'dddddddd-dddd-dddd-dddd-ddddddddddd1'),
  'aprovado', 'status vira aprovado');
select is(
  (select count(*)::int from moderation_log
     where media_id = 'dddddddd-dddd-dddd-dddd-ddddddddddd1' and acao = 'aprovar'
       and moderador_id = '11111111-1111-1111-1111-111111111111'),
  1, 'moderation_log registra acao=aprovar com o moderador_id correto');

-- Cenário: "Moderador reprova um item com motivo"
select lives_ok(
  $$ select registrar_decisao_moderacao('dddddddd-dddd-dddd-dddd-ddddddddddd2', 'reprovar', 'conteúdo impróprio') $$,
  'staff reprova com motivo');
select is(
  (select status from media_items where id = 'dddddddd-dddd-dddd-dddd-ddddddddddd2'),
  'reprovado', 'status vira reprovado');
select is(
  (select motivo from moderation_log
     where media_id = 'dddddddd-dddd-dddd-dddd-ddddddddddd2' and acao = 'reprovar'),
  'conteúdo impróprio', 'motivo é gravado na auditoria');

-- Cenário: "Reversão de decisão"
select lives_ok(
  $$ select registrar_decisao_moderacao('dddddddd-dddd-dddd-dddd-ddddddddddd3', 'reverter') $$,
  'staff reverte um aprovado');
select is(
  (select status from media_items where id = 'dddddddd-dddd-dddd-dddd-ddddddddddd3'),
  'pendente', 'reverter devolve para pendente');
select is(
  (select count(*)::int from moderation_log where acao = 'reverter'),
  1, 'reversão também é auditada');

-- Auditoria acumula uma linha por decisão (3 até aqui)
select is((select count(*)::int from moderation_log), 3, 'uma linha de auditoria por decisão');

-- Transição inválida: aprovar um item já aprovado (agora todos os pendentes mudaram)
select throws_ok(
  $$ select registrar_decisao_moderacao('dddddddd-dddd-dddd-dddd-ddddddddddd1', 'aprovar') $$,
  '22023', null, 'recusa aprovar um item já aprovado');
-- Ação desconhecida
select throws_ok(
  $$ select registrar_decisao_moderacao('dddddddd-dddd-dddd-dddd-ddddddddddd1', 'apagar') $$,
  '22023', null, 'recusa ação desconhecida');

reset role;

-- ===== Não-staff autenticado NÃO modera (RLS bloqueia o update de media_items) =====
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select throws_ok(
  $$ select registrar_decisao_moderacao('dddddddd-dddd-dddd-dddd-ddddddddddd1', 'reverter') $$,
  null, null, 'não-staff não consegue moderar');
reset role;

-- Auditoria não cresceu com a tentativa do não-staff
select is((select count(*)::int from moderation_log), 3, 'tentativa de não-staff não deixa rastro');

select * from finish();
rollback;
