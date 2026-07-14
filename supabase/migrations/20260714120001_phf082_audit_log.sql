-- PHF-082 — Logs de acesso/auditoria e alertas de anomalia (Epic 8). Risco: medio.
-- Ver 02-spec.md secao 6 (Observabilidade: "Logs de moderacao, metricas de fila,
-- alertas de falha de processamento") e secao 7 (auditoria).
--
-- Depende de PHF-011 (RLS): reutiliza a funcao public.is_staff() ja definida la para
-- o modelo de acesso "staff cross-evento". A migracao 20260713130000 (PHF-011) roda
-- antes desta pelo timestamp, entao is_staff() ja existe quando as policies abaixo sao
-- avaliadas. NAO redefinimos is_staff() aqui para nao divergir da fonte unica.
--
-- Garantias de seguranca (defesa em profundidade):
--   * Trilha IMUTAVEL/append-only: RLS habilitado, apenas SELECT para staff. NAO ha
--     policy de UPDATE nem DELETE -> ninguem (fora service_role) altera/apaga um registro
--     de auditoria. Adulterar a trilha exigiria bypass de RLS (service_role), auditado
--     por sua vez no nivel de infra.
--   * Escrita server-side: os registros nascem de codigo server-side com service_role
--     (workers, API, middleware de acesso), que ignora RLS. Por isso NAO ha policy de
--     INSERT para anon/authenticated -> deny-by-default: nenhum cliente forja auditoria.
--   * PII (LGPD, 02-spec.md secao 6): `ip_hash` ja chega hasheado com salt (mesmo padrao
--     de consent_record.ip_hash e do rate limiter, PHF-080). IP em claro NUNCA e gravado.
--   * Isolamento por evento: `event_id` presente para recorte por evento; leitura e
--     restrita a staff (cross-evento por decisao de produto, igual as demais tabelas
--     sensiveis em PHF-011). event_id e nullable para eventos globais (ex.: falha de auth
--     sem evento associado, health do worker).

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete set null, -- nullable: eventos globais/sistema
  actor_id uuid references auth.users(id) on delete set null, -- nullable: acoes anonimas
  actor_type text not null default 'system', -- anon | staff | device | worker | system
  acao text not null,                        -- ex.: acesso.galeria | moderacao.reprovar | processamento.erro | auth.falha
  recurso_tipo text,                         -- ex.: media_item | device | deletion_request
  recurso_id uuid,                           -- id do recurso afetado, quando aplicavel
  ip_hash text,                              -- PII: JA hasheado com salt (nunca IP em claro)
  severidade text not null default 'info',   -- info | alerta | critico
  metadata jsonb not null default '{}',      -- contexto estruturado (sem PII em claro)
  criado_em timestamptz not null default now()
);

-- Indices para as consultas de deteccao de anomalia (janela recente por acao/evento/ip).
create index on audit_log (acao, criado_em desc);
create index on audit_log (event_id, criado_em desc);
create index on audit_log (ip_hash, criado_em desc) where ip_hash is not null;

comment on table audit_log is
  'PHF-082: trilha append-only de acesso/auditoria. Escrita via service_role; leitura so staff.';

-- Trilha imutavel: RLS ligado, so staff LE. Sem policy de INSERT/UPDATE/DELETE ->
-- clientes nao forjam, alteram nem apagam auditoria; escrita e exclusiva de service_role.
alter table audit_log enable row level security;

create policy "audit_log: staff le" on audit_log
  for select to authenticated
  using ( public.is_staff() );
