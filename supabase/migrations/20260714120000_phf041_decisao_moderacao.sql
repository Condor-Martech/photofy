-- PHF-041 — Ações de moderação (aprovar/reprovar/reverter) com auditoria atômica.
-- Cobre o Gherkin "Moderador aprova/reprova/reverte" (02-spec.md §5, Feature:
-- Moderação em tempo real). Depende do schema (PHF-010) e da RLS (PHF-011).
--
-- Por que uma função e não dois writes do cliente:
--   * Atomicidade: mudar media_items.status e gravar moderation_log é UMA transação;
--     é impossível aprovar sem deixar rastro na auditoria (ou vice-versa).
--   * Integridade da autoria: moderador_id é fixado como auth.uid() aqui dentro, então
--     o cliente NÃO pode forjar quem moderou — a policy de insert de PHF-011 só exige
--     is_staff(), não amarra o moderador_id; esta função fecha essa folga.
--   * Máquina de transições no servidor: espelha lib/moderacao/decisao.ts e rejeita
--     transições inválidas (ex.: aprovar um já aprovado), mantendo o log honesto.
--
-- SECURITY INVOKER: as policies de PHF-011 continuam valendo — só staff (is_staff)
-- atualiza media_items e insere em moderation_log; participante/anon não alcança.
--
-- Regra dura de domínio (CLAUDE.md): NENHUMA comunicação ao participante. A função
-- só toca media_items e moderation_log; não cria nada voltado a quem enviou a mídia.

create or replace function registrar_decisao_moderacao(
  p_media_id uuid,
  p_acao text,
  p_motivo text default null
) returns public.media_items
  language plpgsql
  security invoker
  set search_path = ''
as $$
declare
  v_item public.media_items%rowtype;
  v_novo_status text;
begin
  if (select auth.uid()) is null then
    raise exception 'Autenticação obrigatória para moderar.' using errcode = '42501';
  end if;

  -- Trava a linha para serializar decisões concorrentes sobre o mesmo item.
  select * into v_item from public.media_items where id = p_media_id for update;
  if not found then
    raise exception 'Item de mídia % não encontrado.', p_media_id using errcode = 'P0002';
  end if;

  v_novo_status := case p_acao
    when 'aprovar'  then case when v_item.status = 'pendente' then 'aprovado' end
    when 'reprovar' then case when v_item.status = 'pendente' then 'reprovado' end
    when 'reverter' then case when v_item.status in ('aprovado', 'reprovado') then 'pendente' end
    else null
  end;

  if v_novo_status is null then
    raise exception 'Transição inválida: não é possível % um item %.', p_acao, v_item.status
      using errcode = '22023';
  end if;

  update public.media_items
    set status = v_novo_status
    where id = p_media_id
    returning * into v_item;

  insert into public.moderation_log (media_id, moderador_id, acao, motivo)
    values (p_media_id, (select auth.uid()), p_acao, p_motivo);

  return v_item;
end;
$$;

-- Só o staff autenticado invoca; anon nunca (RLS ainda barraria, mas negamos cedo).
revoke all on function registrar_decisao_moderacao(uuid, text, text) from public, anon;
grant execute on function registrar_decisao_moderacao(uuid, text, text) to authenticated;
