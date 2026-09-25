# syntax=docker/dockerfile:1.7
# Production image: Next.js standalone server (with only the modules it uses), the worker/seed/admin
# bundles and the Prisma CLI for migrations, running as a non-root user.
# Build:  docker compose build     (see DEPLOY.md)

ARG NODE_IMAGE=node:22-alpine

FROM ${NODE_IMAGE} AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# ── 1. All dependencies (including build tools) ──────────────────────────────
FROM base AS deps
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

# ── 2. Build: images, Next.js, worker/seed/admin tools ──────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate \
 && npm run images \
 && npx next build \
 && npm run build:tools

# ── 3. Prisma CLI only, for `migrate deploy` at start (the server itself needs no CLI) ─
FROM base AS migrate
WORKDIR /app/migrate
COPY package.json /tmp/package.json
RUN node -e "const p=require('/tmp/package.json');require('fs').writeFileSync('package.json',JSON.stringify({private:true,type:'module',dependencies:{prisma:p.dependencies.prisma,dotenv:p.dependencies.dotenv},overrides:p.overrides},null,2))" \
 && npm install --omit=dev --legacy-peer-deps --no-audit --no-fund \
 && npm cache clean --force
COPY prisma.config.ts ./
COPY prisma/schema.prisma ./prisma/schema.prisma
COPY prisma/migrations ./prisma/migrations

# ── 4. Runtime image ─────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    MEDIA_DIR=/app/storage/media
# ffmpeg converts the videos uploaded from the admin (lib/video.ts).
RUN apk add --no-cache ffmpeg \
 && addgroup -S -g 1001 app && adduser -S -u 1001 -G app -h /app app
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/config ./config
COPY --from=migrate --chown=app:app /app/migrate ./migrate
COPY --chmod=755 docker/app/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN mkdir -p /app/storage/media && chown -R app:app /app/storage
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "server.js"]
