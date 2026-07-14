-- pgTAP: executar_deletion_request (PHF-063). Roda com `supabase test db`.
-- Trava o cenário Gherkin de 02-spec.md §5 (Feature: Galeria permanente e exclusão) —
-- "Organizador executa uma solicitação de exclusão" — mais a negativa, a idempotência
-- (não reexecutar), solicitação inexistente, decisão inválida e a barreira de privilégio
-- (só service_role dispara a RPC). Auditoria obrigatória em moderation_log.
begin;
select plan(14);

-- Estrutura da RPC
select has_function(
  'public', 'executar_deletion_request',
  ARRAY['uuid','text','uuid','text'],
  'executar_deletion_request(uuid,text,uuid,text) existe');
select is_definer(
  'public', 'executar_deletion_request',
  ARRAY['uuid','text','uuid','text'],
  'a RPC é SECURITY DEFINER (bypassa RLS deny-all das tabelas de domínio)');

-- Seed como superuser (bypassa RLS, simula escrita server-side com service_role).
insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111');
insert into events (id, slug, nome, data_inicio)
  values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'ev-excl', 'Evento Exclusão', now());
-- media1 será excluída; media2 terá a solicitação negada (permanece aprovada).
insert into media_items (id, event_id, tipo, status, url_original)
  values
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'foto', 'aprovado', 's3://o1'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'foto', 'aprovado', 's3://o2');
insert into deletion_request (id, media_id, solicitante, status)
  values
    ('dddddddd-dddd-dddd-dddd-ddddddddddd1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Ana', 'pendente'),
    ('dddddddd-dddd-dddd-dddd-ddddddddddd2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Bruno', 'pendente');

-- Given uma deletion_request pendente / When o organizador executa a exclusão
select lives_ok(
  $$ select public.executar_deletion_request(
       'dddddddd-dddd-dddd-dddd-ddddddddddd1', 'executar',
       '11111111-1111-1111-1111-111111111111', 'abuso') $$,
  'organizador executa uma solicitação pendente');

-- Then a deletion_request muda para "executada" e a mídia some da galeria/telão
select is(
  (select status from deletion_request where id = 'dddddddd-dddd-dddd-dddd-ddddddddddd1'),
  'executada', 'solicitação vira executada');
select is(
  (select status from media_items where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'),
  'excluido', 'mídia vira excluido (some da galeria e do telão)');
-- And com registro de auditoria (moderation_log, acao='excluir', organizador correto)
select is(
  (select count(*)::int from moderation_log
     where media_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
       and moderador_id = '11111111-1111-1111-1111-111111111111'
       and acao = 'excluir' and motivo = 'abuso'),
  1, 'auditoria de exclusão registrada em moderation_log');

-- Idempotência: reexecutar uma solicitação já executada é bloqueado (não exclui 2x).
select throws_ok(
  $$ select public.executar_deletion_request(
       'dddddddd-dddd-dddd-dddd-ddddddddddd1', 'executar',
       '11111111-1111-1111-1111-111111111111', null) $$,
  'P0001', null,
  'reexecutar solicitação já resolvida falha (idempotência)');

-- Negar: a solicitação é auditada mas a mídia permanece aprovada na galeria.
select lives_ok(
  $$ select public.executar_deletion_request(
       'dddddddd-dddd-dddd-dddd-ddddddddddd2', 'negar',
       '11111111-1111-1111-1111-111111111111', 'sem base') $$,
  'organizador nega uma solicitação pendente');
select is(
  (select status from deletion_request where id = 'dddddddd-dddd-dddd-dddd-ddddddddddd2'),
  'negada', 'solicitação vira negada');
select is(
  (select status from media_items where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'),
  'aprovado', 'mídia negada permanece aprovada (segue na galeria)');
select is(
  (select count(*)::int from moderation_log
     where media_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2' and acao = 'negar_exclusao'),
  1, 'auditoria da negativa registrada em moderation_log');

-- Solicitação inexistente → erro (endpoint mapeia para 404).
select throws_ok(
  $$ select public.executar_deletion_request(
       '00000000-0000-0000-0000-000000000000', 'executar',
       '11111111-1111-1111-1111-111111111111', null) $$,
  'P0002', null, 'solicitação inexistente falha');

-- Decisão inválida → erro (endpoint já barra em 400, defesa em profundidade no banco).
select throws_ok(
  $$ select public.executar_deletion_request(
       'dddddddd-dddd-dddd-dddd-ddddddddddd1', 'apagar',
       '11111111-1111-1111-1111-111111111111', null) $$,
  '22023', null, 'decisão inválida falha');

-- Barreira de privilégio: participante anônimo NUNCA dispara a RPC (só service_role).
set local role anon;
select throws_ok(
  $$ select public.executar_deletion_request(
       'dddddddd-dddd-dddd-dddd-ddddddddddd2', 'executar',
       '11111111-1111-1111-1111-111111111111', null) $$,
  '42501', null, 'anon não tem privilégio para executar a RPC');

select * from finish();
rollback;
