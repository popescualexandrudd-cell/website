# Backend central (Django)

> **Stare:** fundația construită în Etapa 1A (27.09.2026); rezervările, prețurile și prezențele în Etapa 3 (27.09.2026). **Următoarele module:** Etapele 4, 5, 6, 12.

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

Din rădăcina repository-ului:

| Ce | Comandă |
|---|---|
| Pregătire (dependențe, migrații, date demo) | `scripts/setup` |
| Pornire locală | `scripts/dev` → `http://localhost:8000/api/v1/docs`, `http://localhost:8000/django-admin/` |
| Toate verificările | `scripts/test-all` |
| Doar testele backend | `cd apps/backend && uv run pytest --cov` |
| Primul admin (2FA inclusă) | `JUNGLE_ADMIN_PASSWORD=... uv run python apps/backend/manage.py bootstrap_admin --email ... --first-name ... --last-name ...` |
| Resetarea 2FA (telefon pierdut) | `uv run python apps/backend/manage.py reset_mfa --email ... --reason "..."` |
| Date inițiale | `uv run python apps/backend/manage.py seed_initial [--demo]` |
| Schema OpenAPI + client TS | `scripts/generate-api-client` |
| Publicarea unui text legal (din `docs/07-securitate-gdpr-legal/texte/`) | `uv run python apps/backend/manage.py publish_legal_document --kind waitlist_notice --language ro --file …` |
| Ștergerea înscrierilor neconfirmate (zilnic) | `uv run python apps/backend/manage.py purge_waitlist` |
| Neprezentări, rezervări încheiate, blocări (la 5 minute) | `uv run python apps/backend/manage.py process_no_shows` |

Baza de date: PostgreSQL (`DATABASE_URL`; implicit `postgres://jungle:jungle@localhost:5432/jungle`), de exemplu cu `docker compose -f deploy/compose/dev/compose.yaml up -d db redis`.
Variabilele de mediu sunt descrise în [`.env.example`](.env.example). Imaginea Docker: [`Dockerfile`](Dockerfile) (se construiește din rădăcina repository-ului).

### Structura codului
| Folder | Ce conține |
|---|---|
| `jungle/core` | erori cu coduri stabile, ceas (`Europe/Bucharest`), roluri și acțiuni, criptare, limitări, admin de urgență, health |
| `jungle/accounts` | utilizatori, roluri, 2FA, înregistrare, parole, invitați, copii |
| `jungle/locations` | locații și resurse |
| `jungle/audit` | jurnalul de audit (doar-adăugare) |
| `jungle/configuration` | feature flags, configurare versionată, „ce mai trebuie confirmat” |
| `jungle/legal` | documente legale versionate, acorduri (doar-adăugare) |
| `jungle/devices` | dispozitivele clubului |
| `jungle/notifications` | emailuri RO/EN |
| `jungle/waitlist` | lista de așteptare (Etapa 1B): dublă confirmare, dezabonare cu ștergerea datelor, export CSV |
| `jungle/pricing` | tarife pe 30 de minute (bandă, sezon, tip client, produs), oferta unei rezervări (Etapa 3) |
| `jungle/bookings` | rezervări, anulări, lista de așteptare pe interval, clase de pilates, sala de evenimente (Etapa 3); suprapunerile sunt refuzate de PostgreSQL (btree_gist) |
| `jungle/attendance` | scanări și prezențe, neprezentări, blocări și notificări pentru personal (Etapa 3) |
