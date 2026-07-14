-- pgTAP: audit_log (PHF-082). Roda com `supabase test db`.
-- Trava as garantias da trilha de auditoria: existe, RLS ligado, append-only
-- (sem UPDATE/DELETE), leitura so staff e escrita negada a anon/authenticated
-- (so service_role escreve). Ver 02-spec.md secao 6 (Observabilidade) e secao 7.
begin;
select plan(11);

-- Estrutura
select has_table('public', 'audit_log', 'audit_log existe');
select has_column('public', 'audit_log', 'event_id', 'tem event_id (recorte por evento)');
select has_column('public', 'audit_log', 'ip_hash', 'tem ip_hash (PII hasheada, nunca IP em claro)');
select has_column('public', 'audit_log', 'severidade', 'tem severidade (info|alerta|critico)');
select has_column('public', 'audit_log', 'metadata', 'tem metadata jsonb');

-- RLS habilitado
select is(relrowsecurity, true, 'audit_log com RLS habilitado')
  from pg_class where oid = 'public.audit_log'::regclass;

-- Append-only: a UNICA policy e de SELECT (nenhuma de INSERT/UPDATE/DELETE).
-- service_role escreve por bypass de RLS; clientes nunca forjam/alteram/apagam.
select is(
  (select count(*)::int from pg_policies
     where schemaname = 'public' and tablename = 'audit_log'),
  1,
  'audit_log tem exatamente 1 policy (so leitura de staff)');
select is(
  (select cmd from pg_policies
     where schemaname = 'public' and tablename = 'audit_log' limit 1),
  'SELECT',
  'a unica policy de audit_log e de SELECT (append-only)');

-- Seed como superuser (bypassa RLS, simula service_role server-side)
insert into auth.users (id) values ('22222222-2222-2222-2222-222222222222');
insert into profiles (id, role) values ('22222222-2222-2222-2222-222222222222', 'admin');
insert into events (id, slug, nome, data_inicio)
  values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ev-audit', 'Evento Audit', now());
insert into audit_log (event_id, actor_type, acao, ip_hash, severidade)
  values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'worker', 'processamento.erro', 'sha256:pii', 'alerta');

-- Participante anonimo NUNCA le a trilha nem consegue forjar registro
set local role anon;
select is((select count(*)::int from audit_log), 0, 'anon nao le a trilha de auditoria');
select throws_ok(
  $$ insert into audit_log (actor_type, acao) values ('anon', 'forjado') $$,
  '42501',
  null,
  'anon nao consegue inserir na trilha (escrita so service_role)');

-- Staff (linha em profiles) le a trilha inteira (cross-evento, igual PHF-011)
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select is((select count(*)::int from audit_log), 1, 'staff le a trilha de auditoria');

select * from finish();
rollback;
