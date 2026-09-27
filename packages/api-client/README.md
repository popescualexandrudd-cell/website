# Clientul API (TypeScript, generat)

> **Stare:** construit în Etapa 1A (27.09.2026); se regenerează la fiecare schimbare de API.

## Ce face

Client TypeScript **generat automat** din schema OpenAPI a backend-ului. Nu se editează manual; se regenerează cu o comandă după orice schimbare de API.

## Specificații

- [API](../../docs/05-api/README.md)

## Decizii tehnice

[ADR-0003](../../docs/04-arhitectura/adr/0003-backend-django-ninja.md), [ADR-0007](../../docs/04-arhitectura/adr/0007-frontend-nextjs-vite.md)

## Rulare, testare, deploy

- `openapi.json` și `src/schema.d.ts` sunt **generate**: nu se editează manual. Regenerare: `scripts/generate-api-client`.
- Folosire: `import { createApiClient } from "@jungle/api-client"; const api = createApiClient("https://api.<domeniu>/");` — trimite cookie-ul de sesiune și tokenul CSRF automat.
- Verificări: `pnpm --filter @jungle/api-client typecheck` și `test`; `scripts/test-all` verifică și că clientul e la zi.
