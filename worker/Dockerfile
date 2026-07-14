# Worker dedicado (Docker Swarm) — separado do app Next.js da raiz.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 worker

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=worker:nodejs package.json ./
COPY --chown=worker:nodejs src ./src

USER worker
CMD ["node", "src/index.js"]
