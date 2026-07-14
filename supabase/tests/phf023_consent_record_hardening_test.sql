-- pgTAP: endurecimento LGPD do consent_record (PHF-023). Roda com `supabase test db`.
-- Cobre as garantias de banco por trás do Gherkin de upload (02-spec.md §5) e §7 (gate LGPD).
begin;
select plan(5);

-- Fixtures: evento -> media_item.
insert into events (slug, nome, data_inicio)
  values ('lancamento-verao', 'Lançamento Verão', now());
insert into media_items (event_id, tipo, url_original)
  select id, 'foto', 'storage://orig/1.jpg' from events where slug = 'lancamento-verao';

-- 1. Aceite duplo válido é gravado.
insert into consent_record (media_id, aceite_termos, aceite_conteudo, ip_hash, versao_termos)
  select id, true, true, 'sha256:deadbeef', 'v1' from media_items limit 1;
select is((select count(*)::int from consent_record), 1,
  'consent_record com aceite duplo é gravado');

-- 2. CHECK rejeita registro sem aceite completo (sem aceite -> nenhum registro).
select throws_ok(
  $$ insert into consent_record (media_id, aceite_termos, aceite_conteudo, ip_hash, versao_termos)
     select id, true, false, 'sha256:x', 'v1' from media_items limit 1 $$,
  '23514', -- check_violation
  null,
  'consent_record rejeita aceite incompleto (check_violation)');

-- 3. Imutável: UPDATE é bloqueado pelo trigger.
select throws_ok(
  $$ update consent_record set versao_termos = 'v2' $$,
  'consent_record é imutável: UPDATE não é permitido (prova de consentimento LGPD).',
  'UPDATE em consent_record é bloqueado');

-- 4. Registro permanece intacto após a tentativa de UPDATE.
select is((select versao_termos from consent_record limit 1), 'v1',
  'consent_record permanece inalterado após UPDATE bloqueado');

-- 5. DELETE em cascade (direito de exclusão LGPD) continua funcionando.
delete from media_items;
select is((select count(*)::int from consent_record), 0,
  'consent_record é removido em cascade com o media_item (exclusão sob solicitação)');

select * from finish();
rollback;
