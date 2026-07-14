-- PHF-010 — Schema inicial do Photofy (02-spec.md §3).
-- Tabelas de domínio em português (convenção do repo, ver CLAUDE.md / §7).
-- gen_random_uuid() é nativo no Postgres 13+ (Supabase roda PG15), sem extensão.
--
-- RLS: habilitado em modo deny-all (sem policies) em todas as tabelas de domínio
-- como default seguro — nenhum dado vaza via API antes das policies existirem.
-- As policies por event_id são responsabilidade da PHF-011 (risco alto, 2 aprovações).

-- events: um evento de marca do Condor; múltiplos podem estar ativos ao mesmo tempo
create table events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nome text not null,
  data_inicio timestamptz not null,
  data_fim timestamptz,
  status text not null default 'ativo', -- ativo | encerrado
  timezone text not null default 'America/Sao_Paulo',
  moderacao_on boolean not null default true,
  formatos_aceitos text[] not null default '{jpg,png,heic,mp4}',
  max_foto_mb int not null default 25,
  max_reel_mb int not null default 75,
  max_reel_seg int not null default 10,
  termos_url text,
  background_url text,
  created_at timestamptz not null default now()
);

-- slideshow_config: parametros configuraveis por evento
create table slideshow_config (
  event_id uuid primary key references events(id) on delete cascade,
  seg_por_slide int not null default 6,        -- 3 a 30
  ordem text not null default 'recentes',      -- cronologica | recentes | aleatoria
  transicao text not null default 'fade',      -- fade | slide | nenhuma
  exibir_autor_mensagem boolean not null default true,
  incluir_reels boolean not null default true,
  duracao_reel_telao text not null default 'completo', -- completo | limitado
  loop boolean not null default true,
  escurecimento_bg int not null default 30     -- 0 a 80 (%)
);

-- media_items: fotos e reels enviados
create table media_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  tipo text not null,                       -- foto | reel
  autor text,                               -- 0-50 chars, opcional
  mensagem text,                            -- 0-200 chars, opcional
  status text not null default 'pendente',  -- pendente | aprovado | reprovado | erro
  url_original text not null,
  url_processada text,
  url_thumb text,
  exif_removido boolean not null default false,
  criado_em timestamptz not null default now()
);
create index on media_items (event_id, status);

-- moderation_log: auditoria de decisoes de moderacao
create table moderation_log (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references media_items(id) on delete cascade,
  moderador_id uuid not null references auth.users(id),
  acao text not null,                       -- aprovar | reprovar | reverter
  motivo text,
  timestamp timestamptz not null default now()
);

-- consent_record: prova de consentimento (LGPD)
create table consent_record (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references media_items(id) on delete cascade,
  aceite_termos boolean not null,
  aceite_conteudo boolean not null,         -- responsabilizacao por conteudo improprio
  ip_hash text not null,
  user_agent text,
  versao_termos text not null,
  timestamp timestamptz not null default now()
);

-- deletion_request: solicitacao formal de exclusao de um item da galeria permanente
create table deletion_request (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references media_items(id) on delete cascade,
  solicitante text not null,
  motivo text,
  status text not null default 'pendente',  -- pendente | executada | negada
  timestamp timestamptz not null default now()
);

-- devices: telas pareadas por evento (Device Authorization Flow)
create table devices (
  id uuid primary key default gen_random_uuid(),
  pairing_code text unique not null,
  event_id uuid references events(id) on delete cascade,
  status text not null default 'aguardando', -- aguardando | pareado | revogado | expirado
  paired_at timestamptz,
  last_seen_at timestamptz
);

-- Default seguro: RLS habilitado (deny-all) nas tabelas de domínio com event_id.
-- Policies por event_id chegam na PHF-010 sucessora PHF-011. events fica sem RLS
-- aqui pois é a raiz e suas policies dependem do modelo de acesso definido na 011.
alter table media_items     enable row level security;
alter table moderation_log  enable row level security;
alter table consent_record  enable row level security;
alter table deletion_request enable row level security;
alter table devices         enable row level security;
