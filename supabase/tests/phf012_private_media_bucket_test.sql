-- PHF-012 — verificacao do bucket privado de midia (pgTAP).
-- Roda com `supabase test db` (requer o stack local do Supabase provisionado em PHF-010).
-- Cobre a garantia nao-funcional de 02-spec.md secao 6 (Seguranca: bucket privado / isolamento).

begin;
select plan(4);

select isnt_empty(
  $$ select 1 from storage.buckets where id = 'media' $$,
  'bucket media existe'
);

select is(
  (select public from storage.buckets where id = 'media'),
  false,
  'bucket media e privado (public = false)'
);

select is(
  (select file_size_limit from storage.buckets where id = 'media'),
  78643200::bigint,
  'file_size_limit = 75 MiB'
);

select is(
  (select relrowsecurity from pg_class where oid = 'storage.objects'::regclass),
  true,
  'RLS habilitado em storage.objects'
);

select finish();
rollback;
