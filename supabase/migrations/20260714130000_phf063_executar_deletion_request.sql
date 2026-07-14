-- PHF-063 — Execução da exclusão pelo organizador, com auditoria (Epic 6). Risco: ALTO.
-- Ver 02-spec.md §4 (PATCH /api/solicitacoes-exclusao/:id) e §5 (Feature: Galeria
-- permanente e exclusão sob solicitação — "Organizador executa uma solicitação").
-- Gate de risco (CLAUDE.md §7): mutação sobre deletion_request/media_items exige
-- 2 aprovações humanas + QA manual em staging + feature flag.
--
-- Regra dura (CLAUDE.md): mídia só sai da galeria via este fluxo formal e auditado —
-- nunca expurgo automático. A exclusão é LÓGICA (media_items.status = 'excluido'),
-- não física: apagar a linha dispararia o `on delete cascade` de deletion_request e
-- moderation_log e DESTRUIRIA a própria auditoria. Galeria (PHF-060) e telão (PHF-051)
-- filtram status='aprovado', então 'excluido' some dos dois por construção.
--
-- Por que uma RPC e não 3 writes soltos do cliente: as três mutações (media_items,
-- deletion_request, insert em moderation_log) precisam ser ATÔMICAS — ou a mídia some
-- e a auditoria fica registrada juntas, ou nada muda. Uma função encapsula a transação.
-- SECURITY DEFINER: roda como owner (bypassa o RLS deny-all das tabelas de domínio);
-- a autorização do organizador acontece ANTES, no endpoint (resolverOrganizador).
-- A trava FOR UPDATE serializa decisões concorrentes sobre a mesma solicitação, então
-- a checagem de "pendente" é à prova de corrida (idempotência reforçada no banco).

create or replace function public.executar_deletion_request(
  p_solicitacao uuid,
  p_decisao text,
  p_organizador uuid,
  p_motivo text default null
) returns public.deletion_request
language plpgsql
security definer
set search_path = public
as $$
declare
  v_solicitacao public.deletion_request;
  v_motivo text := nullif(btrim(p_motivo), '');
begin
  if p_decisao not in ('executar', 'negar') then
    raise exception 'decisao invalida: %', p_decisao
      using errcode = '22023'; -- invalid_parameter_value
  end if;

  -- Trava a linha: serializa decisões concorrentes sobre a mesma solicitação.
  select * into v_solicitacao
  from public.deletion_request
  where id = p_solicitacao
  for update;

  if not found then
    raise exception 'solicitacao % nao encontrada', p_solicitacao
      using errcode = 'P0002'; -- no_data_found → endpoint responde 404
  end if;

  -- Só uma solicitação 'pendente' pode ser decidida: bloqueia reexecutar/renegar,
  -- evitando excluir mídia duas vezes ou reescrever auditoria (mesma guarda do domínio).
  if v_solicitacao.status <> 'pendente' then
    raise exception 'solicitacao % nao esta pendente (status atual: %)',
      p_solicitacao, v_solicitacao.status
      using errcode = 'P0001'; -- raise_exception → endpoint responde 409
  end if;

  if p_decisao = 'executar' then
    -- Exclusão lógica: some da galeria/telão sem destruir a linha nem a auditoria.
    update public.media_items
      set status = 'excluido'
      where id = v_solicitacao.media_id;

    update public.deletion_request
      set status = 'executada'
      where id = p_solicitacao
      returning * into v_solicitacao;

    insert into public.moderation_log (media_id, moderador_id, acao, motivo)
      values (v_solicitacao.media_id, p_organizador, 'excluir', v_motivo);
  else
    -- Negativa: a solicitação é auditada, a mídia permanece aprovada na galeria.
    update public.deletion_request
      set status = 'negada'
      where id = p_solicitacao
      returning * into v_solicitacao;

    insert into public.moderation_log (media_id, moderador_id, acao, motivo)
      values (v_solicitacao.media_id, p_organizador, 'negar_exclusao', v_motivo);
  end if;

  return v_solicitacao;
end;
$$;

comment on function public.executar_deletion_request(uuid, text, uuid, text) is
  'PHF-063: aplica atomicamente a decisão do organizador (executar|negar) sobre uma '
  'deletion_request pendente, com registro de auditoria em moderation_log. Exclusão é '
  'lógica (media_items.status=''excluido''). Somente service_role executa.';

-- Least-privilege: apenas o servidor (service_role, que roda o endpoint autenticado)
-- dispara a RPC. Nenhum cliente anon/authenticated aciona exclusão direto — a decisão
-- passa sempre pelo endpoint que resolve o organizador da sessão.
revoke all on function public.executar_deletion_request(uuid, text, uuid, text) from public;
grant execute on function public.executar_deletion_request(uuid, text, uuid, text) to service_role;
