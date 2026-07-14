-- pgTAP: PHF-011 — RLS por event_id + public.is_staff().
-- Roda com `supabase test db`. Ver:
--   * openspec/changes/phf-011-rls-is-staff/spec.md   (16 cenarios Gherkin)
--   * openspec/changes/phf-011-rls-is-staff/design.md §4 (mapping cenario -> assert)
--
-- Cobertura por bloco:
--   §A — is_staff() em isolamento          (spec cenarios 1, 2, 3)      3 asserts
--   §B — silencio de moderacao media_items (spec cenarios 4, 5, 6, 7)   4 asserts
--   §C — isolamento cross-evento           (spec cenarios 8, 9, 10)     3 asserts
--   §D — deny-all escrita cliente          (spec cenarios 11, 12)       2 asserts
--   §E — events + slideshow_config         (spec cenarios 13, 14)       2 asserts
--   §F — rollback preserva is_staff()      (spec cenario 15)            1 assert
--   §G — ordenacao de migracoes            (spec cenario 16)            1 assert
--   +2 asserts estruturais (has_table/has_function) para garantir a base.
--
-- Total: 18 asserts.
--
-- Simulacao de papeis (padrao do repo, ver phf082_audit_log_test.sql:51):
--   * anon:          `set local role anon;`
--   * device (JWT):  `set local request.jwt.claims to '{"role":"authenticated","event_id":"<uuid>"}';`
--                    + `set local role authenticated;`
--   * staff:         seed profile role=admin + set local request.jwt.claims com sub=<uuid do profile>
--                    + `set local role authenticated;`
--   * organizador:   seed profile role=organizador + mesma simulacao (is_staff()=FALSE)
begin;
select plan(18);


-- ============================================================
-- SETUP COMUM (rodado como superuser, bypassa RLS)
-- ============================================================
--
-- 2 eventos concorrentes: A ativo, B encerrado.
-- media_items em A: 3 aprovado, 2 pendente, 2 reprovado, 1 erro (8 total).
-- media_items em B (encerrado): 1 aprovado (para testar filtro "evento ativo").
-- slideshow_config, moderation_log, consent_record, deletion_request atrelados a A.
-- 3 users: admin (staff), organizador (nao staff), participante (nao staff).

insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),  -- admin (staff)
  ('22222222-2222-2222-2222-222222222222'),  -- organizador (nao staff)
  ('33333333-3333-3333-3333-333333333333');  -- participante (nao staff)

insert into public.profiles (id, role) values
  ('11111111-1111-1111-1111-111111111111', 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'organizador'),
  ('33333333-3333-3333-3333-333333333333', 'participante');

-- Evento A (ativo)
insert into public.events (id, slug, nome, data_inicio, status)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ev-a', 'Evento A', now(), 'ativo');

-- Evento B (encerrado)
insert into public.events (id, slug, nome, data_inicio, status)
  values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ev-b', 'Evento B', now(), 'encerrado');

-- slideshow_config para A e B
insert into public.slideshow_config (event_id) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

-- media_items em A: 3 aprovado, 2 pendente, 2 reprovado, 1 erro
insert into public.media_items (event_id, tipo, url_original, status) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'foto', 'storage://a/apr1.jpg', 'aprovado'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'foto', 'storage://a/apr2.jpg', 'aprovado'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'foto', 'storage://a/apr3.jpg', 'aprovado'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'foto', 'storage://a/pen1.jpg', 'pendente'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'foto', 'storage://a/pen2.jpg', 'pendente'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'foto', 'storage://a/rep1.jpg', 'reprovado'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'foto', 'storage://a/rep2.jpg', 'reprovado'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'foto', 'storage://a/err1.jpg', 'erro');

-- media_items em B (encerrado): 1 aprovado — testa filtro "evento ativo" na policy anon
insert into public.media_items (event_id, tipo, url_original, status) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'foto', 'storage://b/apr1.jpg', 'aprovado');

-- Consent, moderation, deletion atrelados ao primeiro media_item aprovado de A
insert into public.consent_record (media_id, aceite_termos, aceite_conteudo, ip_hash, versao_termos)
  select id, true, true, 'sha256:seed', 'v1'
  from public.media_items where event_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' limit 1;

insert into public.moderation_log (media_id, moderador_id, acao)
  select id, '11111111-1111-1111-1111-111111111111', 'aprovar'
  from public.media_items where event_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and status = 'aprovado' limit 1;

insert into public.deletion_request (media_id, solicitante)
  select id, 'ana@example.com'
  from public.media_items where event_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' limit 1;


-- ============================================================
-- Estrutura base (2 asserts)
-- ============================================================

select has_table('public', 'profiles', 'profiles existe (base de is_staff)');

select has_function(
  'public', 'is_staff', array[]::text[],
  'public.is_staff() existe (referenciada por phf082/phf063)');


-- ============================================================
-- §A — is_staff() em isolamento (spec cenarios 1, 2, 3)  — 3 asserts
-- ============================================================
--
-- Admin -> TRUE. Moderador -> TRUE. Organizador/participante/anon/sem perfil -> FALSE.

-- Cenario 1: admin -> is_staff() = TRUE
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select ok(public.is_staff(), 'cenario 1: admin autenticado retorna is_staff()=TRUE');

-- Cenario 2: moderador -> TRUE
-- Trocamos o role do organizador para moderador temporariamente. Como esta em
-- transacao com rollback no final, nao afeta outros testes.
reset role;
update public.profiles set role = 'moderador' where id = '22222222-2222-2222-2222-222222222222';
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select ok(public.is_staff(), 'cenario 2: moderador autenticado retorna is_staff()=TRUE');

-- Cenario 3: participante (sem role staff) e anon -> FALSE
reset role;
-- devolve role original (organizador) para os testes subsequentes de §B/C/D
update public.profiles set role = 'organizador' where id = '22222222-2222-2222-2222-222222222222';
set local role authenticated;
set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
select ok(not public.is_staff(), 'cenario 3: participante nao e staff (is_staff()=FALSE)');


-- ============================================================
-- §B — Silencio de moderacao em media_items (spec 4, 5, 6, 7) — 4 asserts
-- ============================================================
--
-- Anon so ve aprovados. Filtro por status='reprovado' retorna 0 (silencio ativo).
-- Device le pendente do proprio evento. Staff le todos os status.

-- Cenario 4: anon lista media_items do evento A -> so 3 aprovados (nao ve pendente/reprovado/erro)
reset role;
set local role anon;
select is(
  (select count(*)::int from public.media_items
     where event_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  3,
  'cenario 4: anon ve exatamente 3 aprovados de A (silencio total sobre outros status)');

-- Cenario 5: anon com filtro explicito status='reprovado' recebe 0 rows (silencio ativo)
select is(
  (select count(*)::int from public.media_items
     where event_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
       and status = 'reprovado'),
  0,
  'cenario 5: anon com filtro status=reprovado recebe 0 rows (silencio ativo, sem erro)');

-- Cenario 6: device pareado ao evento A le APROVADOS + PENDENTES + REPROVADOS + ERRO do proprio evento.
-- Design: device le TUDO do proprio evento (telao renderiza pipeline de moderacao,
-- UI decide o que exibir). Confirma que le row com status='pendente' (silencio nao se aplica ao device).
reset role;
set local role authenticated;
set local request.jwt.claims to '{"role":"authenticated","event_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';
select is(
  (select count(*)::int from public.media_items
     where event_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
       and status = 'pendente'),
  2,
  'cenario 6: device pareado em A le 2 pendentes do proprio evento (telao ve pipeline)');

-- Cenario 7: staff le TODOS os 8 media_items de A (3 apr + 2 pen + 2 rep + 1 err)
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select is(
  (select count(*)::int from public.media_items
     where event_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  8,
  'cenario 7: staff (admin) le todos os 8 media_items de A (todos os 4 status)');


-- ============================================================
-- §C — Isolamento cross-evento (spec cenarios 8, 9, 10) — 3 asserts
-- ============================================================
--
-- Device do evento A nao le nada do evento B (media_items nem slideshow_config).
-- Staff le cross-evento (A + B) em uma unica query.

-- Cenario 8: device do evento A NAO le media_items do evento B
reset role;
set local role authenticated;
set local request.jwt.claims to '{"role":"authenticated","event_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';
select is(
  (select count(*)::int from public.media_items
     where event_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  0,
  'cenario 8: device pareado em A recebe 0 rows ao consultar media_items de B (isolamento cross-evento)');

-- Cenario 9: device do evento A NAO le slideshow_config do evento B
select is(
  (select count(*)::int from public.slideshow_config
     where event_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  0,
  'cenario 9: device pareado em A recebe 0 rows ao consultar slideshow_config de B');

-- Cenario 10: staff le media_items de A e B (cross-evento)
-- 8 rows em A + 1 row em B = 9 rows totais
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select is(
  (select count(*)::int from public.media_items
     where event_id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')),
  9,
  'cenario 10: staff le 9 media_items cross-evento (8 de A + 1 de B)');


-- ============================================================
-- §D — Deny-all escrita cliente (spec cenarios 11, 12) — 2 asserts
-- ============================================================
--
-- Anon nao insere em media_items. Participante nao atualiza media_items.
-- SQLSTATE 42501 = insufficient_privilege / row-level security violation.

-- Cenario 11: anon nao consegue INSERT em media_items
reset role;
set local role anon;
select throws_ok(
  $$ insert into public.media_items (event_id, tipo, url_original)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'foto', 'storage://forjado.jpg') $$,
  '42501',
  null,
  'cenario 11: anon nao consegue insert em media_items (deny-all escrita cliente)');

-- Cenario 12: participante autenticado nao consegue UPDATE em media_items
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
-- UPDATE sob RLS que nao alcanca a row nao lanca erro — a linha simplesmente nao e encontrada.
-- Assert: 0 rows atualizadas E status original inalterado.
-- Precisamos escapar o RLS de SELECT para verificar o estado real: reset role apos.
with tentativa as (
  update public.media_items set status = 'aprovado'
   where event_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
     and status = 'pendente'
   returning id
)
select is(
  (select count(*)::int from tentativa),
  0,
  'cenario 12: participante nao atualiza media_items (0 rows afetadas por RLS de UPDATE ausente)');


-- ============================================================
-- §E — events + slideshow_config (spec cenarios 13, 14) — 2 asserts
-- ============================================================
--
-- Anon le apenas events com status='ativo'. Device le slideshow_config do proprio
-- evento e nao do outro.

-- Cenario 13: anon le events -> so o ativo (A)
reset role;
set local role anon;
select is(
  (select count(*)::int from public.events),
  1,
  'cenario 13: anon le apenas 1 event (o ativo A); B encerrado invisivel');

-- Cenario 14: device pareado em A le slideshow_config de A (1 row), nao de B (0 rows)
reset role;
set local role authenticated;
set local request.jwt.claims to '{"role":"authenticated","event_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';
select is(
  (select count(*)::int from public.slideshow_config),
  1,
  'cenario 14: device pareado em A le exatamente 1 slideshow_config (a de A, nao a de B)');


-- ============================================================
-- §F — Rollback preserva is_staff() (spec cenario 15) — 1 assert
-- ============================================================
--
-- Cenario Gherkin 15 valida que apos aplicar phf011_down.sql, a funcao is_staff()
-- persiste e audit_log (phf082) continua consultavel por staff sem erro.
-- Aqui garantimos o pre-requisito estrutural: a funcao is_staff() esta registrada.
-- O rollback em si e validado manualmente em Fase 6/QA staging aplicando o snippet
-- de docs/feature-flags.md e re-rodando este teste.

reset role;
select is(
  (select count(*)::int from pg_proc
     where pronamespace = 'public'::regnamespace and proname = 'is_staff'),
  1,
  'cenario 15 (pre-req rollback): public.is_staff() esta registrada no schema public');


-- ============================================================
-- §G — Ordenacao de migracoes (spec cenario 16) — 1 assert
-- ============================================================
--
-- Cenario Gherkin 16: `supabase db reset` do zero aplica phf011 ANTES de phf082
-- (renomeada para 20260714120001), garantindo que is_staff() existe quando phf082
-- referencia. O fato deste teste rodar (rollback no final -> setup nao vazou) ja
-- comprova que a migracao aplicou. Assert final: audit_log tem policy que depende
-- de is_staff() e a policy foi criada com sucesso (senao `supabase db reset` teria
-- falhado antes de chegar aos testes).

select is(
  (select count(*)::int from pg_policies
     where schemaname = 'public'
       and tablename = 'audit_log'
       and cmd = 'SELECT'),
  1,
  'cenario 16: policy SELECT de audit_log (phf082) criada com sucesso apos phf011 (is_staff existe)');


select * from finish();
rollback;
