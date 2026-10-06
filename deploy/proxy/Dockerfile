# The proxy image (ADR-0015): Caddy with the club's single-page apps inside (the panel, the two
# kiosks, the screens, the café display). Build from the repository root:
#   docker build -f deploy/proxy/Dockerfile -t jungle-proxy .
# NODE_IMAGE: another base only for a build behind a filtering proxy (its CA inside).
ARG NODE_IMAGE=node:22-slim
ARG CADDY_IMAGE=caddy:2
FROM ${NODE_IMAGE} AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages packages
COPY apps/admin apps/admin
COPY apps/kiosk-league apps/kiosk-league
COPY apps/kiosk-payments apps/kiosk-payments
COPY apps/court-screens apps/court-screens
COPY apps/cafe-display apps/cafe-display
RUN pnpm install --frozen-lockfile \
      --filter @jungle/admin... --filter @jungle/kiosk-league... --filter @jungle/kiosk-payments... \
      --filter @jungle/court-screens... --filter @jungle/cafe-display...
RUN for app in admin kiosk-league kiosk-payments court-screens cafe-display; do \
      pnpm --filter "@jungle/$app" build || exit 1; \
    done

FROM ${CADDY_IMAGE}
COPY deploy/proxy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /repo/apps/admin/dist /srv/admin
COPY --from=build /repo/apps/kiosk-league/dist /srv/kiosk-league
COPY --from=build /repo/apps/kiosk-payments/dist /srv/kiosk-payments
COPY --from=build /repo/apps/court-screens/dist /srv/court-screens
COPY --from=build /repo/apps/cafe-display/dist /srv/cafe-display
