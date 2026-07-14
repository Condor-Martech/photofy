-- PHF-012 — Bucket privado de midia + politica de acesso por URL pre-assinada de curto prazo
-- Epic 1 (infra). Risco: ALTO. Ver 02-spec.md secao 3 (Storage privado) e secao 6 (Seguranca).
--
-- Garantia de seguranca (defesa em profundidade):
--   * o bucket `media` e PRIVADO (public=false) -> nenhum acesso publico direto.
--   * storage.objects mantem RLS habilitado SEM politicas permissivas -> deny-by-default:
--     roles anon/authenticated nao leem nem escrevem objetos diretamente.
--   * O UNICO caminho de leitura e uma URL pre-assinada gerada NO SERVIDOR com service_role
--     (que ignora RLS) e expiracao curta -- ver docs/storage.md (MEDIA_SIGNED_URL_TTL_SECONDS).
--   * Escopo por evento: objetos sao gravados sob o prefixo `<event_id>/...`, isolando a
--     midia de cada evento no path. RLS por event_id em storage.objects (caso alguma politica
--     de acesso direto por role venha a ser concedida) e responsabilidade de PHF-011.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  false,
  78643200, -- 75 MiB = maior limite do dominio (max_reel_mb). Limite fino por tipo em PHF-021/022.
  array['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'video/mp4']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- RLS ja vem habilitado em storage.objects no Supabase; reforcamos por seguranca (idempotente).
alter table storage.objects enable row level security;

-- Deny-by-default proposital: NENHUMA politica permissiva para anon/authenticated aqui.
-- Upload do original e gravacao de processados ocorrem via service_role (backend/worker);
-- leitura ocorre somente por URL pre-assinada de curta duracao. Qualquer politica de acesso
-- direto por role (moderador/admin) fica a cargo de PHF-011 + tabela profiles.
