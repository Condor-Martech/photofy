# Spec — PHF-011: RLS por `event_id` + `public.is_staff()`

> Fase SDD: **spec** (delta). Cenários Given/When/Then em portugues, palavras-chave RFC 2119. Base: `proposal.md` + `explore.md` desta pasta. Estilo consistente com `02-spec.md §5`.

## Escopo desta spec

Delta ao domínio `security/rls`. NÃO existe spec anterior nesta pasta — este documento é a spec canônica de RLS para PHF-011.

**Cobertura**: `public.is_staff()`, RLS de `events`, `slideshow_config`, `media_items`, `moderation_log`, `consent_record`, `deletion_request`, `devices`. Escrita continua exclusiva de `service_role` (deny-all para clientes).

**Papéis (roles do Supabase)**:
- `anon` — cliente sem sessão (rota pública `/evento/[slug]`).
- `authenticated` — usuário logado. Subdivide-se por `profiles.role`:
  - `admin` ou `moderador` → `is_staff() = TRUE`.
  - `organizador` ou `participante` ou sem entrada em `profiles` → `is_staff() = FALSE`.
- `device` — JWT emitido para telão pareado, com claim custom `event_id` (`auth.jwt() ->> 'event_id'`). Não tem entrada em `profiles`. Issue de auth do device é separada; policies DEVEM assumir esta forma.
- `service_role` — bypassa RLS (usado por servidor Next.js e workers).

**Regras inegociáveis reforçadas**:
- Silêncio total de moderação: policies públicas DEVEM filtrar `status = 'aprovado'` em `media_items`. Filtro no lado cliente NÃO é permitido — RLS é a única fonte de verdade.
- Galeria permanente: NÃO DEVE existir policy de DELETE para clientes.
- Escrita cliente: NÃO DEVE existir policy de INSERT/UPDATE em nenhuma tabela desta spec — só `service_role` escreve.

---

## ADDED Requirements

### Requirement: Função `public.is_staff()` classifica papel do usuário autenticado

O sistema DEVE prover uma função `public.is_staff()` que retorna `TRUE` se e somente se o usuário autenticado (`auth.uid()`) possui entrada em `public.profiles` com `role IN ('admin', 'moderador')`. A função NÃO DEVE considerar `organizador` nem `participante` como staff. Para chamadores anônimos ou sem entrada em `profiles`, a função DEVE retornar `FALSE`.

#### 1. Admin é classificado como staff

**Dado que** existe uma linha em `public.profiles` com `id = auth.uid()` e `role = 'admin'`
**Quando** o usuário autenticado invoca `select public.is_staff()`
**Então** o sistema DEVE retornar `TRUE`

Referência: proposal.md §Scope; explore.md §4 pergunta 1
Risco mitigado: cross-check de papel na base para todas as policies de staff

#### 2. Moderador é classificado como staff

**Dado que** existe uma linha em `public.profiles` com `id = auth.uid()` e `role = 'moderador'`
**Quando** o usuário autenticado invoca `select public.is_staff()`
**Então** o sistema DEVE retornar `TRUE`

Referência: proposal.md §Scope
Risco mitigado: idem cenário 1

#### 3. Organizador, participante ou perfil ausente NÃO são staff

**Dado que** o usuário autenticado tem `role = 'participante'` OU `role = 'organizador'` OU nenhuma linha em `public.profiles` com `id = auth.uid()`
**E que** também para chamadores `anon` (sem `auth.uid()`)
**Quando** invoca `select public.is_staff()`
**Então** o sistema DEVE retornar `FALSE`

Referência: proposal.md §Scope; explore.md §3 assunção 2
Risco mitigado: prevenir vazamento cross-evento a organizador local sem papel de staff

---

### Requirement: Silêncio de moderação em `media_items` para clientes públicos

O sistema DEVE garantir que policies de SELECT em `media_items` para `anon` e para `device` retornem exclusivamente rows com `status = 'aprovado'`. O sistema NÃO DEVE aceitar filtros de query que revelem a existência de rows com `status IN ('pendente', 'reprovado', 'erro')` para esses papéis. Filtro por query string do PostgREST DEVE ser silenciosamente reduzido a zero rows quando o predicado do cliente contradiz o predicado da policy.

#### 4. Anon lista `media_items` do evento e recebe só aprovados

**Dado que** existe um evento X com 3 `media_items` `aprovado`, 2 `pendente`, 2 `reprovado` e 1 `erro`
**Quando** um cliente `anon` faz `select * from media_items where event_id = X`
**Então** o sistema DEVE retornar exatamente 3 rows (todas com `status = 'aprovado'`)
**E** o retorno NÃO DEVE conter nenhuma row com `status` diferente de `'aprovado'`

Referência: 02-spec.md §5 "Galeria pública lista apenas conteúdo aprovado"; proposal.md §Approach.5
Risco mitigado: quebra do silêncio de moderação via listagem pública

#### 5. Anon com filtro `status=reprovado` recebe 0 rows (silêncio ativo)

**Dado que** existem `media_items` com `status = 'reprovado'` no evento X
**Quando** um cliente `anon` faz `select * from media_items where event_id = X and status = 'reprovado'` (equivalente ao PostgREST `?status=eq.reprovado`)
**Então** o sistema DEVE retornar 0 rows
**E** NÃO DEVE emitir erro nem revelar a existência dessas rows

Referência: proposal.md §Cenários Gherkin candidatos; CLAUDE.md "silêncio de moderação"
Risco mitigado: enumeração de rows reprovadas via query direta ao PostgREST

#### 6. Device pareado ao evento X lista `media_items` só aprovados do evento X

**Dado que** existe um JWT de `device` com claim `event_id = X`
**E que** existem `media_items` no evento X com todos os status
**Quando** o device faz `select * from media_items` (sem filtro adicional)
**Então** o sistema DEVE retornar apenas rows com `event_id = X AND status = 'aprovado'`
**E** NÃO DEVE retornar nenhuma row de outros eventos nem com outros status

Referência: 02-spec.md §5 "Slideshow exibe apenas conteúdo aprovado"; proposal.md §Approach.5
Risco mitigado: telão exibir conteúdo pendente/reprovado por bug de RLS

#### 7. Staff lista `media_items` do evento X e recebe TODAS as rows

**Dado que** o usuário autenticado satisfaz `public.is_staff() = TRUE`
**E que** existem no evento X: 3 `aprovado`, 2 `pendente`, 2 `reprovado`, 1 `erro`
**Quando** faz `select * from media_items where event_id = X`
**Então** o sistema DEVE retornar exatamente 8 rows
**E** o resultado DEVE incluir rows de todos os quatro status

Referência: proposal.md §Approach.5; explore.md §3 assunção 2
Risco mitigado: staff sem acesso à fila de moderação (falso negativo bloqueia trabalho)

---

### Requirement: Isolamento cross-evento por `event_id` para device e clientes não-staff

O sistema DEVE isolar leitura de `media_items`, `slideshow_config`, `moderation_log`, `consent_record`, `deletion_request` e `devices` por `event_id`, de forma que um `device` pareado ao evento A NÃO DEVE conseguir ler nenhuma row de eventos diferentes de A. Staff (`is_staff() = TRUE`) DEVE ter leitura cross-evento sem restrição por `event_id`.

#### 8. Device do evento A não lê `media_items` do evento B

**Dado que** existe um JWT de `device` com claim `event_id = A`
**E que** existem `media_items` com `status = 'aprovado'` no evento B
**Quando** o device faz `select * from media_items where event_id = B`
**Então** o sistema DEVE retornar 0 rows
**E** NÃO DEVE emitir erro

Referência: 02-spec.md §5 "Múltiplos eventos ativos simultaneamente e isolados"; proposal.md §Risks
Risco mitigado: **data leak cross-evento** (risco Alto do explore.md §5)

#### 9. Device do evento A não lê `slideshow_config` do evento B

**Dado que** existe um JWT de `device` com claim `event_id = A`
**E que** existe uma linha em `slideshow_config` para o evento B
**Quando** o device faz `select * from slideshow_config where event_id = B`
**Então** o sistema DEVE retornar 0 rows

Referência: proposal.md §Approach.6
Risco mitigado: configuração de telão de outro evento vazada

#### 10. Staff cross-evento lê `media_items` de A e B na mesma query

**Dado que** o usuário autenticado satisfaz `public.is_staff() = TRUE`
**E que** existem `media_items` nos eventos A e B
**Quando** faz `select event_id, count(*) from media_items where event_id in (A, B) group by event_id`
**Então** o sistema DEVE retornar duas rows (uma por evento)
**E** as contagens DEVEM refletir todos os status de ambos os eventos

Referência: explore.md §3 assunção 2 ("staff cross-evento"); proposal.md §Approach.5
Risco mitigado: staff bloqueado de operar em múltiplos eventos concorrentes

---

### Requirement: Deny-all para escrita cliente em tabelas de domínio

O sistema NÃO DEVE prover policies de INSERT, UPDATE ou DELETE para os papéis `anon`, `authenticated` (independente de `is_staff()`) ou `device` nas tabelas `events`, `slideshow_config`, `media_items`, `moderation_log`, `consent_record`, `deletion_request` e `devices`. Toda escrita DEVE ocorrer via `service_role` (que bypassa RLS) por meio de rotas server-side do Next.js ou dos workers. Tentativa de escrita cliente DEVE ser rejeitada por RLS.

#### 11. Anon não consegue inserir em `media_items`

**Dado que** o cliente atua com role `anon`
**Quando** tenta `insert into media_items (event_id, tipo, url_original, status) values (...)` diretamente
**Então** o sistema DEVE rejeitar a operação com erro de RLS (`new row violates row-level security policy`)
**E** NÃO DEVE persistir a row

Referência: proposal.md §Approach.5; explore.md §3 assunção 6
Risco mitigado: upload direto contornando `/api/eventos/:slug/upload/confirmar`

#### 12. Participante autenticado sem role staff não consegue atualizar `media_items`

**Dado que** existe um usuário autenticado sem entrada em `profiles` (ou com `role = 'participante'`)
**E que** existe uma row em `media_items` com `status = 'pendente'`
**Quando** o usuário tenta `update media_items set status = 'aprovado' where id = ...`
**Então** o sistema DEVE rejeitar a operação com erro de RLS
**E** o `status` da row NÃO DEVE mudar

Referência: proposal.md §Approach.5
Risco mitigado: escalada de privilégio via UPDATE direto ao PostgREST

---

### Requirement: RLS de `events` e `slideshow_config` cobre visibilidade pública e pareada

O sistema DEVE habilitar RLS em `events` e `slideshow_config`. Para `events`, `anon` DEVE ler rows com `status = 'ativo'` e nada mais; staff DEVE ler tudo. Para `slideshow_config`, o `device` cujo JWT tem claim `event_id = X` DEVE ler apenas a row do evento X; staff DEVE ler tudo; `anon` NÃO DEVE ler nada.

#### 13. Anon lê `events` ativos e não vê os encerrados

**Dado que** existem os eventos A (`status = 'ativo'`) e B (`status = 'encerrado'`)
**Quando** um cliente `anon` faz `select id, slug, status from events`
**Então** o sistema DEVE retornar apenas a row do evento A
**E** NÃO DEVE incluir o evento B

Referência: explore.md §4 pergunta 4; 02-spec.md §3 (`events.status`)
Risco mitigado: rota pública `/evento/[slug]` expor eventos encerrados

#### 14. Device do evento X lê `slideshow_config` do evento X mas não do Y

**Dado que** existe um JWT de `device` com claim `event_id = X`
**E que** existem linhas em `slideshow_config` para os eventos X e Y
**Quando** o device faz `select * from slideshow_config`
**Então** o sistema DEVE retornar exatamente 1 row, a do evento X
**E** um `select * from slideshow_config where event_id = Y` pelo mesmo device DEVE retornar 0 rows

Referência: proposal.md §Approach.6; 02-spec.md §5 "Slideshow exibe apenas conteúdo aprovado"
Risco mitigado: parametrização de telão de outro evento vazada

---

### Requirement: Rollback via `phf011_down.sql` preserva `is_staff()` e `phf082_audit_log`

O procedimento de rollback documentado em `docs/feature-flags.md` DEVE apenas remover policies e dropar `public.profiles`, sem dropar `public.is_staff()`. Após o rollback, `public.is_staff()` DEVE continuar existindo e retornando `FALSE` para todos os chamadores (por ausência da tabela `profiles`, o próprio SELECT interno retorna 0 rows). A policy de SELECT em `phf082_audit_log` (que depende de `is_staff()`) DEVE continuar funcional, retornando 0 rows para não-staff sem gerar erro.

#### 15. Após rollback, `is_staff()` persiste e `audit_log` continua consultável por staff

**Dado que** as migrações `phf011` e `phf082_audit_log` foram aplicadas
**E que** o operador aplica o snippet SQL `phf011_down.sql` (apenas `drop policy ...` e `drop table public.profiles`, sem `drop function is_staff`)
**Quando** um usuário autenticado qualquer faz `select public.is_staff()`
**Então** o sistema DEVE retornar `FALSE` sem gerar erro
**E** um `select count(*) from audit_log` por esse mesmo usuário DEVE retornar 0 rows sem erro
**E** a função `public.is_staff` DEVE permanecer registrada no schema `public`

Referência: proposal.md §Rollback Plan; explore.md §4 pergunta 8; §5 risco "Rollback deixa phf082/phf063 órfãos"
Risco mitigado: rollback destrutivo quebrar CI e telas dependentes de `phf082`/`phf063`

---

### Requirement: Ordenação de migrações permite `supabase test db` do zero

O timestamp da migração `phf011_rls_is_staff.sql` DEVE ser anterior ao timestamp de `phf082_audit_log.sql` (renomeada para `20260714120001`), garantindo que `public.is_staff()` exista antes de qualquer referência. A execução de `supabase test db` a partir de um banco vazio DEVE aplicar todas as migrações na ordem correta e passar sem erros de função inexistente.

#### 16. `supabase test db` do zero passa após todas as migrações

**Dado que** o repositório contém as migrações `phf011_rls_is_staff` (timestamp `20260713130000`), `phf023_consent_record_hardening` (`20260714120000`) e `phf082_audit_log` (`20260714120001`, renomeada)
**Quando** o operador executa `supabase db reset` seguido de `supabase test db` em ambiente limpo
**Então** o sistema DEVE aplicar todas as migrações sem erro
**E** DEVE executar todos os testes pgTAP existentes com status verde
**E** NÃO DEVE emitir erro `function public.is_staff() does not exist`

Referência: proposal.md §Approach.1, §Success Criteria; explore.md §2 "Gap identificado"
Risco mitigado: CI quebrada em `phf082` (situação atual)

---

## Notas de rastreabilidade

| Cenário | Cobertura da matriz papel × tabela × operação |
|---|---|
| 1, 2, 3 | `is_staff()` em isolamento (A) |
| 4, 5, 6, 7 | Silêncio de moderação em `media_items` (B) |
| 8, 9, 10 | Isolamento cross-evento (C) |
| 11, 12 | Deny-all escrita cliente (D) |
| 13, 14 | `events` + `slideshow_config` RLS (E) |
| 15 | Rollback seguro (F) |
| 16 | Ordenação de migrações e `supabase test db` (G) |

**Total: 16 cenários**, cobrindo os 4 papéis do sistema (`anon`, `authenticated`/`is_staff`, `authenticated`/não-staff, `device`) contra 5 tabelas-chave (`events`, `slideshow_config`, `media_items`, `moderation_log` via join, `audit_log` no rollback) e as 4 operações (SELECT positivo, SELECT negativo/silêncio, INSERT deny, UPDATE deny). Cenários de `moderation_log`, `consent_record`, `deletion_request` e `devices` são cobertos derivativamente por (D) — o padrão de escrita deny-all + SELECT via join a `media_items.event_id` é homogêneo e será tratado uniformemente no `sdd-design` (matriz SQL completa) e no `sdd-tasks` (pgTAP correspondentes).
