# Skill Registry — Photofy

Registro de skills disponíveis (user-level em `~/.claude/skills/`) e convenções do projeto. Este arquivo é infraestrutura mode-independent do SDD; o orchestrator o consulta uma vez por sessão para resolver caminhos de skills antes de delegar às sub-agents.

Skills SDD (`sdd-*`) e utilitários internos (`_shared`, `skill-registry`, `find-skills`) foram intencionalmente omitidos.

## Project conventions

| File | Path | Purpose |
|------|------|---------|
| CLAUDE.md | `/Users/al3jandro/project/condor/photofy/CLAUDE.md` | Convenções canônicas: branches, commits, PRs, regras de domínio inegociáveis, governança IA por risco, workflows CI. Fonte de verdade para qualquer agente que toque o repo. |
| AGENTS.md | `/Users/al3jandro/project/condor/photofy/AGENTS.md` | Index; aponta para CLAUDE.md. |
| 00-prd.md | `/Users/al3jandro/project/condor/photofy/00-prd.md` | PRD do produto. |
| 01-poc-spikes.md | `/Users/al3jandro/project/condor/photofy/01-poc-spikes.md` | Resultados de spikes técnicos. |
| 02-spec.md | `/Users/al3jandro/project/condor/photofy/02-spec.md` | Spec funcional; §5 contém cenários Gherkin (fonte para specs de mudança). |
| 03-tareas.md | `/Users/al3jandro/project/condor/photofy/03-tareas.md` | Backlog de issues PHF-N. |
| DESIGN_SYSTEM.md | `/Users/al3jandro/project/condor/photofy/DESIGN_SYSTEM.md` | Tokens, tipografia e componentes shadcn/ui. |
| PR template | `/Users/al3jandro/project/condor/photofy/.github/PULL_REQUEST_TEMPLATE.md` | Template obrigatório de PR (referência a PHF-N e cenário Gherkin coberto). |
| Secrets docs | `/Users/al3jandro/project/condor/photofy/docs/secrets-management.md` | Política de secrets (Swarm/.env.local/Actions Secrets). |

## Skills — user level (`~/.claude/skills/`)

| Skill | Path | Trigger |
|-------|------|---------|
| agents-sdk | `/Users/al3jandro/.claude/skills/agents-sdk/SKILL.md` | Build AI agents on Cloudflare Workers using the Agents SDK. Load when creating stateful agents, durable workflows, real-time WebSocket apps, scheduled tasks, MCP servers, chat applications, voice agents, or browser automation. |
| caveman | `/Users/al3jandro/.claude/skills/caveman/SKILL.md` | Ultra-compressed communication mode. Use when user says "caveman mode", "talk like caveman", "use caveman", "less tokens", "be brief", or invokes /caveman. |
| cloudflare | `/Users/al3jandro/.claude/skills/cloudflare/SKILL.md` | Comprehensive Cloudflare platform skill (Workers, Pages, KV, D1, R2, Workers AI, WAF, Terraform/Pulumi). Use for any Cloudflare development task. |
| cloudflare-email-service | `/Users/al3jandro/.claude/skills/cloudflare-email-service/SKILL.md` | Send and receive transactional emails with Cloudflare Email Service. Use when building email sending, routing, or integrating email into any app. |
| copywriting | `/Users/al3jandro/.claude/skills/copywriting/SKILL.md` | Write, rewrite, or improve marketing copy for any page (homepage, landing, pricing, features). Triggers on "write copy for", "improve this copy", "headline help", "CTA copy", etc. |
| durable-objects | `/Users/al3jandro/.claude/skills/durable-objects/SKILL.md` | Create and review Cloudflare Durable Objects. Use when building stateful coordination (chat rooms, multiplayer, booking), RPC methods, SQLite storage, alarms, WebSockets. |
| expo-best-practices | `/Users/al3jandro/.claude/skills/expo-best-practices/SKILL.md` | Expo and React Native done right — Expo Router, EAS Build, native modules, platform-specific patterns, navigation. |
| expo-tailwind-setup | `/Users/al3jandro/.claude/skills/expo-tailwind-setup/SKILL.md` | Set up Tailwind CSS v4 in Expo with react-native-css and NativeWind v5 for universal styling. |
| fastify-typescript | `/Users/al3jandro/.claude/skills/fastify-typescript/SKILL.md` | Patterns for Fastify + TypeScript: plugin decorators, route schemas with TypeBox, SSE endpoints, multipart CSV upload, error handling. |
| flutterflow | `/Users/al3jandro/.claude/skills/flutterflow/SKILL.md` | Patterns for FlutterFlow-generated Flutter projects with custom code layers. Triggers when editing Flutter/Dart in a FlutterFlow project. |
| frontend-design | `/Users/al3jandro/.claude/skills/frontend-design/SKILL.md` | Create distinctive, production-grade frontend interfaces. Use when asked to build web components, pages, artifacts, dashboards, React components, or beautify web UI. |
| frontend-design-system | `/Users/al3jandro/.claude/skills/frontend-design-system/SKILL.md` | Produce production-grade UI designs using clear design tokens, layout rules, motion guidance, and a11y checks. |
| go-testing | `/Users/al3jandro/.claude/skills/go-testing/SKILL.md` | Go testing patterns including Bubbletea TUI testing. Trigger when writing Go tests, using teatest, or adding coverage. |
| html-to-image | `/Users/al3jandro/.claude/skills/html-to-image/SKILL.md` | Generate crisp images with perfect typography and precise layouts using HTML/CSS. Use for social cards, diagrams, certificates, UI mockups, code screenshots. |
| maplibre-deckgl | `/Users/al3jandro/.claude/skills/maplibre-deckgl/SKILL.md` | MapLibre GL JS + Deck.gl integration: shared WebGL context, MVTLayer from PostGIS/Martin, overlay lifecycle, click events, flyTo. |
| mobile-app-ui-design | `/Users/al3jandro/.claude/skills/mobile-app-ui-design/SKILL.md` | Design high-quality mobile app UI/UX screens, flows, components. Trigger for mobile UI/UX, screen design, app mockups, wireframes. |
| mobile-developer | `/Users/al3jandro/.claude/skills/mobile-developer/SKILL.md` | Expert in React Native, Expo, and cross-platform mobile development. |
| postgis-etl | `/Users/al3jandro/.claude/skills/postgis-etl/SKILL.md` | ETL patterns for PostGIS: COPY streams, geometry normalization to SRID 4326, GIST/GIN indexes, dynamic DDL with nanoid, ST_MakePoint/ST_GeomFromText. |
| remotion-best-practices | `/Users/al3jandro/.claude/skills/remotion-best-practices/SKILL.md` | Best practices for Remotion — video creation in React. |
| rupies-platform | `/Users/al3jandro/.claude/skills/rupies-platform/SKILL.md` | Domain knowledge for the Rupies B2B marketplace platform (Brazil, credit-based subscriptions). Trigger only for Rupies apps — NOT relevant for Photofy. |
| sandbox-sdk | `/Users/al3jandro/.claude/skills/sandbox-sdk/SKILL.md` | Build sandboxed apps for secure code execution (AI code interpreters, CI/CD, dev environments, untrusted code). |
| skill-creator | `/Users/al3jandro/.claude/skills/skill-creator/SKILL.md` | Create new AI agent skills following the Agent Skills spec. Trigger when user asks to create/add a skill or document patterns for AI. |
| supabase | `/Users/al3jandro/.claude/skills/supabase/SKILL.md` | Use for ANY task involving Supabase (Database, Auth, Edge Functions, Realtime, Storage, RLS, SSR with supabase-js/@supabase/ssr, migrations, CLI, MCP). |
| supabase-postgres-best-practices | `/Users/al3jandro/.claude/skills/supabase-postgres-best-practices/SKILL.md` | Postgres performance and best practices from Supabase. Use when writing, reviewing, or optimizing Postgres queries, schema, or configs. |
| typescript-best-practices | `/Users/al3jandro/.claude/skills/typescript-best-practices/SKILL.md` | Use when reading or writing TypeScript or JavaScript (.ts, .tsx, .js, tsconfig.json). |
| web-perf | `/Users/al3jandro/.claude/skills/web-perf/SKILL.md` | Analyze web performance using Chrome DevTools MCP (LCP, INP, CLS, FCP, TBT, render-blocking, layout shifts, a11y). Use to audit/profile/optimize page load. |
| workers-best-practices | `/Users/al3jandro/.claude/skills/workers-best-practices/SKILL.md` | Reviews/authors Cloudflare Workers code against production best practices. Load when writing/reviewing Workers, configuring wrangler.jsonc, or checking common anti-patterns. |
| wrangler | `/Users/al3jandro/.claude/skills/wrangler/SKILL.md` | Cloudflare Workers CLI (deploy, dev, KV, R2, D1, Vectorize, Hyperdrive, Workers AI, Containers, Queues, Workflows, Pipelines, Secrets). Load before running wrangler commands. |

## Skills — project level (`.claude/skills/`)

Nenhum skill de nível de projeto configurado. Diretório `.claude/skills/` não existe.

## Notas de relevância para Photofy

Skills com maior probabilidade de uso neste repo (baseado em stack detectado):

- `supabase`, `supabase-postgres-best-practices` — RLS, migrations, auth, SSR.
- `typescript-best-practices` — TypeScript strict em todo o código.
- `frontend-design`, `frontend-design-system` — telas shadcn/ui + tokens do DESIGN_SYSTEM.md.
- `web-perf` — para telas de galeria / feed com muitas imagens.
- `html-to-image` — se precisar gerar OG images ou cards estáticos.

Skills claramente **não** aplicáveis: `rupies-platform` (outro produto), `flutterflow`, `expo-*`, `mobile-*`, `go-testing`, `remotion-best-practices`, `maplibre-deckgl`, `postgis-etl`, `fastify-typescript`, `agents-sdk`, `durable-objects`, `wrangler`, `workers-best-practices`, `cloudflare*`, `sandbox-sdk` — mantidos no registro para descoberta futura, mas evitar delegação por padrão.
