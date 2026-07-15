# Agents

Ponto de entrada para agentes de IA que operam neste repositório (Claude Code local, Gemini CLI no CI, futuros agentes).

## Contexto obrigatório antes de qualquer mudança

Ler nesta ordem:

1. [`CLAUDE.md`](./CLAUDE.md) — convenções de branches/commits/PRs, governança de IA por risco, comandos do monorepo, layout, CI.
2. [`00-prd.md`](./00-prd.md) — PRD (o que Photofy resolve e para quem).
3. [`02-spec.md`](./02-spec.md) — spec técnico (arquitetura, modelo de dados, RLS, API, cenários Gherkin §5 que todo PR deve cobrir).
4. [`03-tareas.md`](./03-tareas.md) — desglose de tarefas ativas (prefixo `PHF-N`).
5. [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) — só se a mudança tocar UI.
6. [`docs/`](./docs/) — `observability.md`, `secrets-management.md`, `storage.md`, `backup-and-recovery.md` — quando a mudança tocar estes domínios.

## Comandos base

```bash
pnpm install
pnpm test:all       # vitest recursivo em todos os workspaces
pnpm lint
pnpm typecheck      # sub-packages (root pendente de fix, ver CLAUDE.md)
pnpm build          # Next.js standalone
```

Rodar antes de propor PR. Se algum quebrar, corrigir antes de abrir.

## Restrições inegociáveis (extraídas de CLAUDE.md — releia sempre)

- **Silêncio de moderação**: nenhum código pode comunicar decisão de moderação (aprovado/reprovado) ao participante, em nenhum fluxo, em nenhuma tela.
- **Galeria permanente**: nada é apagado automaticamente. Exclusão só via `deletion_request` formal com auditoria — proibido expurgo automático por tempo/policy no v1.
- **RLS por `event_id`** obrigatório em qualquer tabela nova que armazene dado de evento — nunca confiar apenas em filtro de API.
- **Revogação de dispositivo pareado** nunca pode afetar outras telas pareadas ao mesmo evento.
- **Segredos**: nunca no código. Sempre via secrets manager (Swarm em prod, `.env.local` em dev, Actions Secrets em CI). Nunca prefixar segredo com `NEXT_PUBLIC_`. O gate `secret-scan.yml` (gitleaks) barra o PR se detectar.
- **Nomenclatura em português** para tabelas/campos de domínio: `media_items`, `moderation_log`, `consent_record`, `deletion_request`, `devices`, `slideshow_config`, `events`, etc. Não traduzir parcialmente.
- **Stack técnico** definido em `02-spec.md §2` é fechado para v1: Next.js + Supabase (Postgres + Storage + Realtime + Auth) + BullMQ/Redis + ffmpeg + Docker Swarm. Não introduzir alternativas.

## Governança de IA por risco

Ver `CLAUDE.md > Governança de IA por risco` para detalhe.

- **Baixo risco** (docs, boilerplate, config de CI): agente revisor + 1 aprovação humana.
- **Risco médio** (features de negócio, endpoints não críticos): agente + 1 aprovação + testes E2E se tocar fluxos compartilhados.
- **Risco alto** (RLS, `consent_record`, `deletion_request`, migrações de dados, Device Authorization Flow, **reestruturação de repo**): agente + **2 aprovações humanas** + QA manual em staging + feature flag obrigatório quando aplicável.

## PRs

- Base branch: sempre `staging`. Nunca push direto em `main` (nem em `staging`).
- Toda PR referencia issue `PHF-N` do workspace `photofy` no [Multica](https://agency.guria.lat/).
- Toda PR cobre com teste o(s) cenário(s) Gherkin correspondente(s) de `02-spec.md §5`.
- Commits que usaram IA de forma relevante levam tag `[ai-assisted: <modelo>]` no corpo (ex.: `[ai-assisted: claude-opus-4-7]`, `[ai-assisted: gemini-2.0-flash]`).
- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, ...).
- **Revisor CI**: Gemini CLI (`.github/workflows/pr-review.yml`). Nunca configurar `anthropics/claude-code-action` — este projeto não usa `ANTHROPIC_API_KEY`, o Claude é local por assinatura.

## Layout do repositório

Ver `CLAUDE.md > Layout do repositório`. Resumo: `src/` para o app Next.js, `packages/@photofy/*` para libs compartilhadas, `workers/*` para processos background (Docker Swarm), `supabase/` para migrations + tests pgTAP.

## Tooling

- **Package manager**: `pnpm@10.28.0` (via corepack, campo `packageManager` em `package.json`).
- **Node**: 22.
- **Testes**: `vitest` (app + sub-packages TypeScript), `node --test` (orchestrator Node puro).
- **Lint**: `eslint.config.mjs` (flat config) via `next lint` (deprecated em Next 16 — migração pendente para ESLint CLI).
- **Design system**: `tailwind@3.4.17` + shadcn/ui em `src/components/ui/`.
