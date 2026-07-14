-- PHF-023 — Endurecimento LGPD do consent_record (aceite duplo, versionado, imutável).
-- Epic 2. Risco: ALTO (base legal do produto inteiro). Ver 02-spec.md §5 (Gherkin de upload)
-- e §7 (gate de risco: consent_record exige 2 aprovações + QA em staging).
--
-- A tabela e a RLS deny-all já vêm de PHF-010. Aqui adicionamos as garantias que tornam
-- o registro uma PROVA de consentimento confiável, no banco (não só na aplicação):
--
--   1. Aceite duplo por construção: só existe consent_record com termos E conteúdo aceitos.
--      Assim, "sem aceite -> nenhum registro" (§5) é garantido mesmo se a aplicação errar.
--   2. Imutabilidade: consentimento é prova — nunca pode ser ALTERADO após gravado
--      (backdating, virar um "não" em "sim"). UPDATE é bloqueado. INSERT e DELETE seguem
--      permitidos: DELETE só ocorre em cascade com o media_item (direito de exclusão LGPD
--      via deletion_request), o que é legítimo.
--
-- RLS não é tocada: a gravação ocorre via service_role (ignora RLS), mesmo padrão de PHF-012.
-- Policies de LEITURA por event_id são responsabilidade de PHF-011.

-- 1. Aceite duplo obrigatório (o registro só existe se ambos forem true).
alter table consent_record
  add constraint consent_record_aceite_duplo
  check (aceite_termos and aceite_conteudo);

-- 2. Imutabilidade: bloqueia qualquer UPDATE. security definer para valer p/ todas as roles.
create or replace function bloquear_update_consent_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'consent_record é imutável: UPDATE não é permitido (prova de consentimento LGPD).';
end;
$$;

create trigger consent_record_no_update
  before update on consent_record
  for each row execute function bloquear_update_consent_record();
