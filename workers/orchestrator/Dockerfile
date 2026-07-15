# Orquestrador BullMQ (Docker Swarm) -- separado do app Next.js da raiz.
# Monorepo pnpm workspaces: build a partir do contexto raiz do repo.
# Uso: docker build -f workers/orchestrator/Dockerfile -t photofy-orchestrator .

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json ./
COPY workers/orchestrator/package.json ./workers/orchestrator/
COPY packages/audit-log/package.json ./packages/audit-log/
COPY packages/media-validation/package.json ./packages/media-validation/
COPY packages/rate-limiting/package.json ./packages/rate-limiting/
COPY workers/image-worker/package.json ./workers/image-worker/
RUN pnpm install --frozen-lockfile --filter=@photofy/orchestrator... --prod

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 orchestrator

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/workers ./workers
COPY --chown=orchestrator:nodejs workers/orchestrator/package.json ./workers/orchestrator/
COPY --chown=orchestrator:nodejs workers/orchestrator/src ./workers/orchestrator/src

USER orchestrator
WORKDIR /app/workers/orchestrator
CMD ["node", "src/index.js"]
