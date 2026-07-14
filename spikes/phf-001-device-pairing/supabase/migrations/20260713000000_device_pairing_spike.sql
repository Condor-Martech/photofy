-- Spike PHF-001: schema minimo para testar Device Authorization Flow
-- Espelha 02-spec.md §3 (apenas as tabelas relevantes ao pareamento de tela)

create table events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nome text not null
);

create table devices (
  id uuid primary key default gen_random_uuid(),
  pairing_code text unique not null,
  event_id uuid references events(id) on delete cascade,
  status text not null default 'aguardando', -- aguardando | pareado | revogado | expirado
  paired_at timestamptz,
  last_seen_at timestamptz,
  code_expires_at timestamptz not null default (now() + interval '10 minutes')
);

create table media_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  status text not null default 'pendente',
  autor text,
  created_at timestamptz not null default now()
);

alter table events enable row level security;
alter table devices enable row level security;
alter table media_items enable row level security;

-- Claim customizada no JWT do device: device_id (uuid). Setada na emissao do token
-- pelo backend no momento do pareamento (vinculo pairing_code -> event_id).
-- A policy RE-CONSULTA a tabela devices a cada request (nao confia so no claim
-- do token) para que revogacao tenha efeito imediato sem esperar o token expirar.
create function device_is_active(claim_device_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from devices
    where id = claim_device_id
      and status = 'pareado'
  );
$$;

create function device_event_id(claim_device_id uuid)
returns uuid
language sql
stable
as $$
  select event_id from devices where id = claim_device_id and status = 'pareado';
$$;

-- devices: uma tela so enxerga o proprio registro (para poder fazer polling
-- do proprio status/expiracao), nunca os demais dispositivos do evento.
create policy device_self_select on devices
  for select
  using (id = (current_setting('request.jwt.claims', true)::json->>'device_id')::uuid);

-- media_items: leitura somente para dispositivo pareado e ativo, escopado ao
-- event_id do proprio device — nunca por filtro de API.
create policy media_items_device_read on media_items
  for select
  using (
    device_is_active((current_setting('request.jwt.claims', true)::json->>'device_id')::uuid)
    and event_id = device_event_id((current_setting('request.jwt.claims', true)::json->>'device_id')::uuid)
  );

-- service_role (usado pelo backend/admin) ignora RLS por padrao no Supabase.

alter publication supabase_realtime add table media_items;
