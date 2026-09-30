# Deciziile de arhitectură (ADR)

Fiecare decizie tehnică importantă are un fișier propriu (vezi [ADR-0001](0001-inregistrarea-deciziilor.md) pentru reguli).
Toate ADR-urile de mai jos au fost propuse în **Etapa 0 (26.09.2026)** și au fost acceptate la aprobarea Etapei 0 (26.09.2026).

| ADR | Decizie | Stare |
|---|---|---|
| [0001](0001-inregistrarea-deciziilor.md) | Deciziile tehnice se înregistrează ca ADR-uri | Acceptat |
| [0002](0002-monorepo-pnpm-uv.md) | Monorepo cu workspace-uri pnpm (TypeScript) și uv (Python) | Acceptat |
| [0003](0003-backend-django-ninja.md) | Backend Django 5.2 LTS + Django Ninja (justificare față de DRF) | Acceptat |
| [0004](0004-postgresql-integritate.md) | PostgreSQL, integritatea garantată în baza de date | Acceptat |
| [0005](0005-timp-real-channels.md) | Timp real cu Django Channels și Redis | Acceptat |
| [0006](0006-sarcini-celery.md) | Sarcini programate cu Celery și Celery Beat | Acceptat |
| [0007](0007-frontend-nextjs-vite.md) | Next.js pentru website, React + Vite pentru restul, client API generat | Acceptat |
| [0008](0008-motorul-ligii.md) | Motorul ligii: Python pur, Weng-Lin (Thurstone–Mosteller) propriu | Acceptat |
| [0009](0009-bani-registru-contabil.md) | Bani în bani întregi, registru cu dublă înregistrare, idempotență | Acceptat |
| [0010](0010-timp-fus-orar.md) | Fusul orar `Europe/Bucharest`, trecerile de oră testate | Acceptat |
| [0011](0011-autentificare-utilizatori-personal.md) | Autentificarea utilizatorilor și a personalului (2FA, RBAC) | Acceptat |
| [0012](0012-autentificare-dispozitive.md) | Autentificarea dispozitivelor (mTLS, rețea, rol); scor doar de la Chioșcul Ligă | Acceptat |
| [0013](0013-hardware-bridge.md) | Hardware Bridge: semnături Ed25519, jurnal de numerar pe disc, simulatoare | Acceptat |
| [0014](0014-chioscuri-ecrane-kiosk-os.md) | Chioșcuri și ecrane: Linux + Chromium în mod kiosk | Acceptat |
| [0015](0015-infrastructura-docker-caddy.md) | Docker Compose pe serverul propriu, Caddy ca proxy | Acceptat |
| [0016](0016-backup-recuperare.md) | Backup cu pgBackRest, criptat, off-site, test lunar de restaurare | Acceptat |
| [0017](0017-observabilitate-analytics.md) | Uptime Kuma, GlitchTip, Umami (fără cookie-uri) | Acceptat |
| [0018](0018-internationalizare.md) | Internaționalizare: cataloage ICU comune, coduri de eroare | Acceptat |
| [0019](0019-ai-adaptor-si-unelte.md) | AI: adaptor de furnizor, unelte cu permisiuni, interdicții impuse tehnic | Acceptat |
| [0020](0020-design-tokens.md) | Design tokens: identitate vizuală dintr-un singur loc | Acceptat |
| [0021](0021-calitate-teste-ci.md) | Calitate: unelte, teste, `scripts/test-all` | Acceptat |
| [0022](0022-feature-flags-configurare-versionata.md) | Feature flags și configurare versionată, valori `DE_CONFIRMAT` vizibile | Acceptat |
| [0023](0023-sistemul-de-efecte-al-site-ului.md) | Sistemul de efecte al site-ului: video de prezentare, apariții la scroll, interactivitate | Propus |
