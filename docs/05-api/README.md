# API

Documentația API-ului central (`/api/v1/`).

## Urmează

- Etapa 1A: schema OpenAPI generată automat din backend (ADR-0003).
- Etapa 1A: ghidul API-ului: versionare, autentificare (utilizatori și dispozitive), coduri de eroare stabile (ADR-0018), paginare, idempotență (R-067).

## Ghidul API (Etapa 1A)
- **Adresă:** `https://api.<domeniu>/api/v1/`; documentație interactivă la `/api/v1/docs` (doar în dezvoltare); schema: [`packages/api-client/openapi.json`](../../packages/api-client/openapi.json).
- **Erori:** mereu `{"error": {"code": "<cod stabil>", "params": {...}}}`; textele sunt în `packages/i18n` (`errors.<cod>`). Validare: `validation.invalid` (422) cu lista câmpurilor.
- **Autentificare utilizatori:** sesiune pe cookie (`POST /auth/login`), CSRF prin header `X-CSRFToken` (cookie-ul `csrftoken`, obținut cu `GET /auth/csrf`). Personalul are nevoie de 2FA (`auth.mfa_required` până la verificare).
- **Zone:** `/auth`, `/me` (contul propriu), `/locations`, `/config/flags`, `/legal` (publice), `/staff/...` (personal, pe roluri).
- **Dispozitive:** autentificarea lor (mTLS) vine în Etapa 7 (ADR-0012).
