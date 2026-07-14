-- Spike PHF-003: schema minimo para medir fanout do Supabase Realtime
-- sob aprovacao em lote. Espelha o essencial de 02-spec.md SS3 (events,
-- media_items) -- sem RLS/auth, que nao e o risco deste spike (ja coberto
-- pelo PHF-001).

create table events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  criado_em timestamptz not null default now()
);

create table media_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  status text not null default 'pendente', -- pendente | aprovado | reprovado
  criado_em timestamptz not null default now(),
  aprovado_em timestamptz
);
create index on media_items (event_id, status);

-- fanout: telao + galeria + painel assinam via postgres_changes filtrado
-- por event_id (ver 02-spec.md linha 26-27). Precisa estar na publication.
alter publication supabase_realtime add table media_items;
