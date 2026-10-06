# Monitorizare

> **Stare:** construit în Etapa 14C (06.10.2026). Decizia: [ADR-0017](../../docs/04-arhitectura/adr/0017-observabilitate-analytics.md). Ghidul proprietarului: [docs/08-deploy-si-mentenanta/05-ghid-monitorizare.md](../../docs/08-deploy-si-mentenanta/05-ghid-monitorizare.md).

## Ce rulează
Serviciile pornesc cu `docker compose … --profile monitoring up -d`, din fișierul de producție (`deploy/compose/prod/compose.yaml`). Toate sunt ale clubului; nimic nu e la un terț.

| Serviciu | Imagine | Adresă | Rol |
|---|---|---|---|
| `status` | `louislam/uptime-kuma:1` | `status.<domeniu>` | dacă fiecare adresă răspunde; semnalele de viață ale planificatorului și ale backup-ului |
| `errors` | `glitchtip/glitchtip:v5` | `erori.<domeniu>` | erorile backend-ului (`SENTRY_DSN`) și cele raportate de browsere și aparate |
| `stats` | `umamisoftware/umami:postgresql-v2` | `statistici.<domeniu>` | vizitele site-ului, fără cookie-uri, doar după acord |
| `monitoring-db` | `postgres:17` | — | bazele GlitchTip și Umami, separate de datele clubului ([`initdb/`](initdb/)) |

## Ce urmărește aplicația singură (planificatorul, ADR-0024)
- **`watch_devices`**, la 5 minute: un chioșc, un ecran sau afișajul cafenelei care nu a chemat API-ul de 10 minute, cât clubul e deschis, înseamnă un mesaj pentru managerii locației (`staff.device_offline`), o dată pe pauză.
- **`check_disk`**, la oră: discul serverului peste 85% (`DISK_ALERT_PERCENT`) înseamnă un mesaj pentru manageri (`staff.disk_low`), o dată pe zi.
- **`check_backups`**, zilnic: un backup care lipsește (14B).

## Jurnalele și erorile
- **Jurnalele:** în producție, fiecare linie e în JSON (`LOG_FORMAT=json`) și poartă ID-ul cererii (`X-Request-ID`).
- **Erorile site-ului:** paginile care cad (pe server sau în browser) le trimit backend-ului: `POST /api/v1/client-errors`, cel mult 30 pe oră de la o adresă.
- **Erorile panoului și ale aparatelor:** le raportează la fel (`watchErrors` din `@jungle/kiosk-kit`).
- **Mai departe:** backend-ul le scrie în jurnal și, dacă `SENTRY_DSN` e completat, le trimite în GlitchTip.

## Verificat
- `deploy/proxy/test-proxy`: rutele `status`, `erori` și `statistici`.
- Pornirea celor trei servicii, testată local la 06.10.2026: GlitchTip răspunde la `/_health/`, Umami la `/api/heartbeat`, iar Uptime Kuma redirecționează spre configurare.
- Umami își descarcă la prima pornire o componentă (Prisma): serverul are nevoie de internet în acel moment.
