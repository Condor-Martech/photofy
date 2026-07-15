# Multi-stage build para o app Next.js do Photofy.
# Pressupoe next.config.ts com `output: 'standalone'` (ver PHF-020 -- scaffold do projeto).
# Monorepo pnpm workspaces: contexto de build eh a raiz do repo.

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY packages/audit-log/package.json ./packages/audit-log/
COPY packages/media-validation/package.json ./packages/media-validation/
COPY packages/rate-limiting/package.json ./packages/rate-limiting/
COPY workers/image-worker/package.json ./workers/image-worker/
COPY worker/package.json ./worker/
RUN pnpm install --frozen-lockfile --filter=photofy...

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/workers ./workers
COPY --from=deps /app/worker ./worker
COPY . .
RUN pnpm --filter=photofy build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
