# Photofy — Convenções do Repositório

Sistema de fotos e reels ao vivo para eventos de marca do Clube Condor (single tenant, multi-evento). Ver `00-prd.md`, `01-poc-spikes.md`, `02-spec.md` e `03-tareas.md` na raiz do repositório para contexto completo antes de qualquer alteração.

## Branches

- `main` e `staging` são permanentes e protegidas — sem push direto, apenas via PR.
- Trabalho novo parte de `staging` em `feat/<nome>`, `fix/<nome>` ou `chore/<nome>`.
- `spike/<nome>` é descartável: nunca é mergeada, serve só para extrair o achado para `01-poc-spikes.md` / `02-spec.md`.

## Fluxo

`feat|fix|chore` → PR → `staging` (1 aprovação + CI verde) → validação de QA → PR → `main` (aprovação manual).

## Commits

Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, ...). Commits com uso relevante de IA levam a tag `[ai-assisted: <modelo>]` no corpo da mensagem.

## Pull Requests

Use o template em `.github/PULL_REQUEST_TEMPLATE.md`. Todo PR referencia a issue que fecha (ex.: `PHO-N`) e cobre com teste o(s) cenário(s) Gherkin correspondente(s) de `02-spec.md` §5.

## Regras de domínio inegociáveis (não "simplificar" mesmo se parecer redundante)

- **Silêncio de moderação por design**: o sistema NUNCA comunica ao participante nenhuma decisão de moderação (aprovado/reprovado), em nenhum fluxo, em nenhuma tela.
- **Galeria permanente**: nada é apagado automaticamente. Exclusão de um item específico ocorre apenas via `deletion_request` formal, com auditoria — proibido expurgo automático por tempo/policy no v1.
- **RLS por `event_id`** é obrigatório em qualquer tabela nova que armazene dado de evento — nunca confiar apenas em filtro de API.
- **Revogação de dispositivo pareado** nunca pode afetar outras telas pareadas ao mesmo evento.
- **Nenhuma credencial no código/repositório** — chaves, tokens e senhas vêm sempre do secrets manager (Swarm secrets em prod, `.env.local` em dev, Actions Secrets em CI). Ver `docs/secrets-management.md`. O gate `secret-scan.yml` (gitleaks) barra o PR se encontrar segredo. Nunca prefixe segredo com `NEXT_PUBLIC_`.

## Governança de IA por risco (ver `metodologia.cndr.me`)

- Baixo risco (docs, boilerplate, config de CI): agente revisor + 1 aprovação humana.
- Risco médio (features de negócio, endpoints não críticos): agente + 1 aprovação + testes E2E se tocar fluxos compartilhados.
- Risco alto (RLS, `consent_record`, `deletion_request`, migrações de dados, Device Authorization Flow de produção): agente + **2 aprovações humanas** + QA manual em staging + feature flag obrigatório.

## CI

- `ci.yml`: lint, testes unitários, build (guard por `hashFiles('package-lock.json')` até o scaffold do projeto ser mergeado).
- `secret-scan.yml`: gitleaks em todo PR/push para `staging`/`main` — varre diff, árvore e histórico; falha se achar credencial. Sem guard de scaffold: roda sempre. Ver `docs/secrets-management.md` (PHF-081).
- `pr-review.yml`: agente revisor via **Gemini CLI** (`google-github-actions/run-gemini-cli@v0`, `GEMINI_CLI_TRUST_WORKSPACE=true`) — nunca `anthropics/claude-code-action`, pois este projeto não usa `ANTHROPIC_API_KEY` (Claude é por assinatura local). Lê `CLAUDE.md` + `02-spec.md` §5 (Gherkin) + diff do PR; sua aprovação é necessária mas não suficiente — revisão humana continua obrigatória.
