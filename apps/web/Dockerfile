# Website image (ADR-0015). Build from the repository root:
#   docker build -f apps/web/Dockerfile -t jungle-web --build-arg NEXT_PUBLIC_API_URL=https://api.<domain> \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://www.<domain> --build-arg SITE_INDEXABLE=true .
# NODE_IMAGE: another base only for a build behind a filtering proxy (its CA inside).
ARG NODE_IMAGE=node:22-slim
FROM ${NODE_IMAGE} AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/api-client/package.json packages/api-client/
COPY packages/design-tokens/package.json packages/design-tokens/
COPY packages/i18n/package.json packages/i18n/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @jungle/web...
COPY packages packages
COPY apps/web apps/web
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG SITE_INDEXABLE=false
ARG NEXT_PUBLIC_UMAMI_SRC=""
ARG NEXT_PUBLIC_UMAMI_WEBSITE_ID=""
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL SITE_INDEXABLE=$SITE_INDEXABLE \
    NEXT_PUBLIC_UMAMI_SRC=$NEXT_PUBLIC_UMAMI_SRC NEXT_PUBLIC_UMAMI_WEBSITE_ID=$NEXT_PUBLIC_UMAMI_WEBSITE_ID
RUN pnpm --filter @jungle/web build

FROM node:22-slim
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
RUN useradd --system --uid 10001 jungle
COPY --from=build --chown=jungle /repo/apps/web/.next/standalone ./
COPY --from=build --chown=jungle /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=jungle /repo/apps/web/public ./apps/web/public
USER jungle
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
