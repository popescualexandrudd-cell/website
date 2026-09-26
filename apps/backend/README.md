# Backend central (Django)

> **Stare:** neînceput (schelet creat în Etapa 0, 26.09.2026). **Se construiește în Etapa:** 1A (fundația), apoi 3, 4, 5, 6, 12.

## Ce face

API-ul central și logica de business: **singura sursă de adevăr** a sistemului (§4.1). Conturi, rezervări, prețuri, plăți și registru contabil, abonamente, antrenori, pilates, prezențe, ligă, turnee, evenimente, cafenea, recompense, notificări, AI, conținut, traduceri, dispozitive, audit, feature flags (§4.2). Servește și WebSockets (date live), sarcinile programate și adminul tehnic Django („mod de urgență”, doar pentru rolul Admin).

## Specificații

- [8.1 Backend central](../../docs/04-arhitectura/aplicatii/01-backend-central.md)
- [Reguli de business](../../docs/02-reguli-business/README.md)
- [7. MODELUL DE DATE (orientativ; detaliază în `docs/06-date/`)](../../docs/06-date/01-model-de-date-orientativ.md)
- [10. INTELIGENȚA ARTIFICIALĂ (integrată în tot sistemul)](../../docs/04-arhitectura/03-inteligenta-artificiala.md)
- [11. NOTIFICĂRI (email + telefon; fără WhatsApp la lansare)](../../docs/04-arhitectura/aplicatii/11-notificari.md)

## Decizii tehnice

[ADR-0003](../../docs/04-arhitectura/adr/0003-backend-django-ninja.md), [ADR-0004](../../docs/04-arhitectura/adr/0004-postgresql-integritate.md), [ADR-0005](../../docs/04-arhitectura/adr/0005-timp-real-channels.md), [ADR-0006](../../docs/04-arhitectura/adr/0006-sarcini-celery.md), [ADR-0009](../../docs/04-arhitectura/adr/0009-bani-registru-contabil.md), [ADR-0010](../../docs/04-arhitectura/adr/0010-timp-fus-orar.md), [ADR-0011](../../docs/04-arhitectura/adr/0011-autentificare-utilizatori-personal.md), [ADR-0012](../../docs/04-arhitectura/adr/0012-autentificare-dispozitive.md), [ADR-0018](../../docs/04-arhitectura/adr/0018-internationalizare.md), [ADR-0019](../../docs/04-arhitectura/adr/0019-ai-adaptor-si-unelte.md), [ADR-0022](../../docs/04-arhitectura/adr/0022-feature-flags-configurare-versionata.md)

## Unde rulează

Subdomeniu: `api.<domeniu>` (§4.6). Poate fi rulată și publicată separat.

## Variabile de mediu planificate

Valorile reale stau doar în `.env` pe server, niciodată în git.

- DATABASE_URL
- REDIS_URL
- DJANGO_SECRET_KEY
- DJANGO_ALLOWED_HOSTS
- EMAIL_PROVIDER + cheile furnizorului (Q24)
- AI_PROVIDER, AI_MODEL, AI_MONTHLY_BUDGET (ADR-0019)
- setările pentru Apple/Google Wallet (Etapa 5)

## Rulare, testare, deploy

Etapa 0 nu conține cod. `.env.example`, `Dockerfile` (unde e cazul) și testele se adaugă în etapa care construiește componenta, împreună cu instrucțiunile de rulare, testare și deploy.
