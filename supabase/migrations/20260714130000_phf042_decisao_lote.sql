-- PHF-042 — Ações em lote de moderação. Aplica a MESMA decisão a vários itens de
-- uma vez, cobrindo o Gherkin "Aprovação em lote" (02-spec.md §5, Feature:
-- Moderação em tempo real): 30 pendentes selecionados → aprovar em lote → os 30
-- viram "aprovado" E 30 registros são criados em moderation_log.
--
-- Por que uma função dedicada em vez de N chamadas do cliente:
--   * Atomicidade: o corpo da função roda em UMA transação. Ou todos os itens mudam
--     de status + geram auditoria, ou nenhum — sem lotes meio-aplicados se um item
--     tiver transição inválida (ex.: já aprovado). A auditoria nunca fica torta.
--   * Reuso: delega a cada item a registrar_decisao_moderacao (PHF-041), então a
--     máquina de transições, a trava de linha (for update), o moderador_id =
--     auth.uid() e a checagem de RLS são exatamente os mesmos do fluxo unitário.
--
-- SECURITY INVOKER: as policies de PHF-011 continuam valendo — só staff (is_staff)
-- modera. Regra dura de domínio (CLAUDE.md): NENHUMA comunicação ao participante;
-- a função só toca media_items e moderation_log (via a função unitária).

create or replace function registrar_decisao_moderacao_lote(
  p_media_ids uuid[],
  p_acao text,
  p_motivo text default null
) returns setof public.media_items
  language plpgsql
  security invoker
  set search_path = ''
as $$
declare
  v_media_id uuid;
begin
  if p_media_ids is null or array_length(p_media_ids, 1) is null then
    raise exception 'Nenhum item selecionado para a ação em lote.' using errcode = '22023';
  end if;

  -- Uma decisão por id, reusando a função unitária (mesma transação → atômico).
  -- distinct evita processar o mesmo id duas vezes se a seleção vier duplicada.
  foreach v_media_id in array (select array_agg(distinct id) from unnest(p_media_ids) as id)
  loop
    return next registrar_decisao_moderacao(v_media_id, p_acao, p_motivo);
  end loop;
end;
$$;

-- Só o staff autenticado invoca; anon nunca (RLS ainda barraria, mas negamos cedo).
revoke all on function registrar_decisao_moderacao_lote(uuid[], text, text) from public, anon;
grant execute on function registrar_decisao_moderacao_lote(uuid[], text, text) to authenticated;
