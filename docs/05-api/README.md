# API

Documentația API-ului central (`/api/v1/`).

## Ghidul API (Etapa 1A)
- **Adresă:** `https://api.<domeniu>/api/v1/`; documentație interactivă la `/api/v1/docs` (doar în dezvoltare); schema: [`packages/api-client/openapi.json`](../../packages/api-client/openapi.json).
- **Erori:** mereu `{"error": {"code": "<cod stabil>", "params": {...}}}`; textele sunt în `packages/i18n` (`errors.<cod>`). Validare: `validation.invalid` (422) cu lista câmpurilor.
- **Autentificare utilizatori:** sesiune pe cookie (`POST /auth/login`), CSRF prin header `X-CSRFToken` (cookie-ul `csrftoken`, obținut cu `GET /auth/csrf`). Personalul are nevoie de 2FA (`auth.mfa_required` până la verificare).
- **Zone:** `/auth`, `/me` (contul propriu), `/locations`, `/config/flags`, `/legal` (publice), `/staff/...` (personal, pe roluri).
- **Dispozitive:** token + certificat client (mTLS) pe `device.<domeniu>` (ADR-0012, Etapa 7); `auth=device_auth`.
- **Plăți:** antetul `Idempotency-Key` pe orice plată (R-067, ADR-0009).
- **Clientul TypeScript:** `packages/api-client`, generat cu `scripts/generate-api-client` după orice schimbare de API.
