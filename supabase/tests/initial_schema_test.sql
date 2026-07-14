-- pgTAP: schema inicial (PHF-010). Roda com `supabase test db`.
-- Cobre as garantias de schema por trás do Gherkin de upload (02-spec.md §5,
-- "Envio de foto válida com aceite marcado"): media_items nasce "pendente" e
-- um consent_record vinculado registra o aceite duplo.
begin;
select plan(11);

-- Tabelas de domínio existem
select has_table('public', 'events', 'events existe');
select has_table('public', 'slideshow_config', 'slideshow_config existe');
select has_table('public', 'media_items', 'media_items existe');
select has_table('public', 'moderation_log', 'moderation_log existe');
select has_table('public', 'consent_record', 'consent_record existe');
select has_table('public', 'deletion_request', 'deletion_request existe');
select has_table('public', 'devices', 'devices existe');

-- RLS habilitado (deny-all) nas tabelas de domínio com event_id
select is(relrowsecurity, true, 'media_items com RLS habilitado')
  from pg_class where oid = 'public.media_items'::regclass;

-- Fluxo Gherkin: evento -> media_item pendente -> consent_record com aceite duplo
insert into events (slug, nome, data_inicio)
  values ('lancamento-verao', 'Lançamento Verão', now());

with m as (
  insert into media_items (event_id, tipo, autor, mensagem, url_original)
    select id, 'foto', 'Ana', 'Muito bom!', 'storage://orig/1.jpg' from events
    where slug = 'lancamento-verao'
    returning id, status
)
select is((select status from m), 'pendente',
  'media_item novo nasce com status pendente');

insert into consent_record (media_id, aceite_termos, aceite_conteudo, ip_hash, versao_termos)
  select id, true, true, 'sha256:deadbeef', 'v1' from media_items limit 1;

select is(
  (select aceite_termos and aceite_conteudo from consent_record limit 1),
  true,
  'consent_record grava aceite de termos e de conteúdo');

-- Cascade: apagar o media_item apaga o consent_record vinculado (galeria/LGPD)
delete from media_items;
select is((select count(*)::int from consent_record), 0,
  'consent_record é removido em cascade com o media_item');

select * from finish();
rollback;
