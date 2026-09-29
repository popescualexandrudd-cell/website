# Ecranele de la terenuri și din lobby / cafenea / mezanin

> **Stare:** construit în Etapa 9 (29.09.2026), în așteptarea aprobării proprietarului.

## Ce face (§8.5)

- **Ecranul unui teren** (aparatul are terenul setat la înrolare):
  - în timpul unei sesiuni, ca în exemplul din specificație: `TEREN 4 · 14:00–15:30 · 90 MIN · MECI OFICIAL DE LIGĂ`;
  - jucătorii cu **doar câmpurile publice din R-012**: nume, rang, LP, nivel. Cine nu e public apare ca „Jucător” (Q55);
  - „vs” între echipe, timpul rămas (`00:47`), următoarea rezervare, eticheta „Meciul zilei”, codul QR spre liga de pe site.
  - Cât terenul e liber: vizualul „jungle” animat (nemișcat dacă sistemul cere mișcare redusă), ce urmează, clasamentul, evenimentele și anunțurile clubului.
- **Ecranul din lobby / cafenea / mezanin** (aparat fără teren): starea tuturor terenurilor, Meciul zilei, clasamentele, Regii Junglei, evenimentele, numerele comenzilor de la cafenea gata de ridicat.
- **Rezistență:**
  - datele vin din API (`GET /api/v1/device/screen/state`);
  - WebSocket-ul (`/ws/screens/`, deschis cu un bilet de o singură folosință) anunță doar „s-a schimbat ceva”;
  - reconectare automată, cu pauze crescătoare;
  - ultima stare păstrată în memorie și în browser: fără ecrane goale;
  - un indicator discret de conexiune: un punct verde în colț, cu text doar când legătura e întreruptă;
  - reîncărcare la finalul și la începutul fiecărei sesiuni, și o dată pe minut, ca plasă de siguranță.
- Română implicit; `?lang=en` pentru engleză.

## Configurare

La club, adresa API-ului și tokenul ecranului vin de la Hardware Bridge-ul de pe calculatorul ecranului (mesajul „hello”, ADR-0013); ecranul nu are scaner, deci bridge-ul rulează fără simulatoare. Ecranul se înrolează din API (`POST /api/v1/staff/devices` cu `kind: "screen"` și, pentru un teren, `resource_id`). În dezvoltare, fără bridge: `VITE_API_URL` și `VITE_DEVICE_TOKEN` (vezi `.env.example`). Un build de producție refuză să pornească dacă tokenul e setat în mediu.

## Rulare, testare

```bash
pnpm --filter @jungle/court-screens dev        # http://localhost:5177
pnpm --filter @jungle/court-screens test       # teste unitare (Vitest)
pnpm --filter @jungle/court-screens build      # build de producție
E2E_ONLY=screens scripts/test-e2e              # cap-coadă: backend + Redis + două Hardware Bridge + build-uri
```

Date demo cu exemplul din §8.5: `uv run python apps/backend/manage.py screens_demo` (după `seed_initial --demo`). Afișează tokenurile ecranului de teren și ale celui de lobby. `screens_demo --rental "Teren 1"` face o închiriere DEMO chiar acum, ca schimbarea să se vadă live pe ecrane.

## Deploy

Pagină statică servită de serverul clubului, deschisă pe tot ecranul de Chromium în mod kiosk (ADR-0014, `deploy/kiosk-os`). WebSocket-ul trece prin proxy la procesul ASGI (`deploy/proxy/README.md`).

## Specificații și decizii

- [8.5 Ecranele de la terenuri și cele de lobby/cafenea/mezanin](../../docs/04-arhitectura/aplicatii/05-ecrane-teren-si-lobby.md), [R-012](../../docs/02-reguli-business/02-liga-si-gdpr-la-inscriere.md), [Q55](../../docs/00-management/INTREBARI_DESCHISE.md#q55)
- [ADR-0005](../../docs/04-arhitectura/adr/0005-timp-real-channels.md), [ADR-0007](../../docs/04-arhitectura/adr/0007-frontend-nextjs-vite.md), [ADR-0012](../../docs/04-arhitectura/adr/0012-autentificare-dispozitive.md), [ADR-0013](../../docs/04-arhitectura/adr/0013-hardware-bridge.md), [ADR-0014](../../docs/04-arhitectura/adr/0014-chioscuri-ecrane-kiosk-os.md)
