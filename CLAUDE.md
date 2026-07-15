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

## Design system

Guia de uso completo (tokens, componentes, quando usar cada um, mobile-first, como propor componente novo): [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md).

Os componentes estão em `src/components/ui/`, as stories em `src/stories/` e os tokens em `src/design-tokens/`.

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

- `ci.yml`: `pnpm install --frozen-lockfile`, lint, `pnpm test:all` (recursivo em todos os workspaces), `pnpm typecheck` (sub-packages), build do app, build do Storybook, e **dois** `docker build` de verificação (sem push) — um para o app raiz e outro para o orchestrator. Sem guards `hashFiles` — o scaffold já existe.
- `secret-scan.yml`: gitleaks em todo PR/push para `staging`/`main` — varre diff, árvore e histórico; falha se achar credencial. Sem guard de scaffold: roda sempre. Ver `docs/secrets-management.md` (PHF-081).
- `pr-review.yml`: agente revisor via **Gemini CLI** (`google-github-actions/run-gemini-cli@v0`, `GEMINI_CLI_TRUST_WORKSPACE=true`) — nunca `anthropics/claude-code-action`, pois este projeto não usa `ANTHROPIC_API_KEY` (Claude é por assinatura local). Lê `CLAUDE.md` + `02-spec.md` §5 (Gherkin) + diff do PR; sua aprovação é necessária mas não suficiente — revisão humana continua obrigatória.
- `docker-publish.yml`: builda e publica **duas imagens** em **GHCR** a cada push em `staging` ou `main` (após merge, nunca em PR):
  - App raiz: `ghcr.io/<owner>/<repo>:{staging|main}` + `:<branch>-<sha curto>`. `Dockerfile` na raiz, multi-stage, non-root, pressupõe `next.config.ts` com `output: 'standalone'`.
  - Orchestrator: `ghcr.io/<owner>/<repo>/orchestrator:{staging|main}` + `:<branch>-<sha curto>`. `workers/orchestrator/Dockerfile`, buildado a partir do contexto raiz.
  Login via `GITHUB_TOKEN` padrão (`packages: write`), sem secret adicional. Quando `workers/image-worker` for wireado em produção, soma terceira imagem `ghcr.io/<owner>/<repo>/image-worker`.
- `promote.yml`: `workflow_dispatch` manual, disparado só após a validação de QA em `staging` (ver Fluxo acima). Abre (ou reaproveita, se já existir) o PR `staging` → `main` via `gh pr create` — nunca faz merge. O merge em `main` continua exigindo aprovação humana + CI verde via branch protection; este workflow nunca automatiza o gate final de produção.

## Instalação e comandos

Monorepo **pnpm workspaces**. Pré-requisitos: Node 22, `corepack enable`.

```bash
pnpm install              # instala tudo (app + packages + workers, um único pnpm-lock.yaml)
pnpm dev                  # Next.js em localhost:3000
pnpm lint                 # ESLint no app
pnpm test                 # vitest só do app (rápido)
pnpm test:all             # vitest recursivo em todos os workspaces
pnpm typecheck            # tsc em cada sub-package (root está pendente de fix, ver deuda técnica em issue separada)
pnpm build                # Next.js production build (output: standalone)
pnpm build-storybook      # Storybook estático
pnpm storybook            # Storybook em localhost:6006
```

Rodar comando em um workspace específico:

```bash
pnpm --filter=@photofy/image-worker test
pnpm --filter=@photofy/orchestrator start
pnpm --filter=@photofy/media-validation typecheck
```

Adicionar dependência:

```bash
pnpm --filter=@photofy/image-worker add sharp     # dep runtime de um package
pnpm --filter=photofy add lucide-react            # dep runtime do app raiz
pnpm add -Dw typescript                            # dev dep compartilhada em toda a raiz (-w = workspace root)
```

## Layout do repositório

```text
photofy/
├── src/
│   ├── app/                   # Next.js App Router (rotas reais)
│   ├── components/            # UI shadcn + moderacao + telao
│   ├── lib/                   # Business logic do app (admin, consent, dispositivos, ...)
│   ├── stories/               # Storybook stories + tokens + assets
│   └── design-tokens/         # tokens.ts consumido por tailwind.config.ts
├── packages/                  # @photofy/* — libs compartilhadas (ainda não wireadas no app)
│   ├── audit-log/             # PHF-082
│   ├── media-validation/      # PHF-032
│   └── rate-limiting/         # PHF-080
├── workers/                   # Processos background (Docker Swarm)
│   ├── orchestrator/          # BullMQ + Redis (PHF-013, contém reel/ até PHF-031)
│   └── image-worker/          # PHF-030 (sharp, file-type)
├── supabase/                  # migrations + pgTAP tests
├── scripts/                   # backup.sh, restore-verify.sh
├── docs/                      # observability, secrets, storage, backup
├── .storybook/
├── .github/workflows/
├── Dockerfile                 # app Next.js standalone
├── pnpm-workspace.yaml
├── pnpm-lock.yaml             # ÚNICO lockfile do monorepo
├── .npmrc                     # node-linker=hoisted (compat Next.js standalone)
└── ...
```

## Como criar um package novo

1. `mkdir packages/<nome>`
2. `package.json` com `"name": "@photofy/<nome>"`, `"private": true`, `"type": "module"`, `"exports": { ".": "./src/index.ts" }`.
3. `tsconfig.json` estendendo do padrão (copiar de `packages/media-validation/`).
4. `vitest.config.ts` com `css: { postcss: { plugins: [] } }` inline (evita subir a árvore até o postcss root que exige Tailwind).
5. `pnpm install` na raiz — o pnpm detecta e linka via `pnpm-workspace.yaml`.
6. Consumir do app: `import { foo } from "@photofy/<nome>"` e adicionar em `dependencies` do app raiz: `"@photofy/<nome>": "workspace:*"`.
