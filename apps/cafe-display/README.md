# Afișajul cafenelei

> **Stare:** construit în Etapa 8 (29.09.2026), în curs de aprobare.

## Ce face (§8.7)

- Coada comenzilor plătite azi, **în timp real** (reîmprospătare la 3 secunde): numărul comenzii, produsele, ora.
- Trei coloane: **Noi → În preparare → Gata**. Barul atinge comanda ca s-o mute mai departe; „Ridicată” o scoate de pe ecran. Numărul comenzii gata ajunge pe ecranele din lobby (Etapa 9).
- **Semnal sonor** la fiecare comandă nouă (două tonuri generate în pagină, fără fișiere de la terți). Browserul permite sunetul după prima atingere („Pornește sunetul”); pe aparat, politica Chromium îl permite de la pornire.
- RO / EN; banda „Legătura cu serverul s-a întrerupt” și reîncercare automată.

## Cum se leagă de restul sistemului

| Cu cine | Cum |
|---|---|
| Hardware Bridge al aparatului | Doar pentru configurare: `hello` dă adresa API-ului și tokenul (tokenul stă numai în `.env`-ul aparatului, niciodată în fișierele publicate). Nu are scanner sau numerar. |
| API `/api/v1/device/cafe/*` | `GET /queue`, `POST /orders/{id}/advance`; doar cu `X-Device-Token`, doar un afișaj de cafenea activ, din rețeaua clubului (altfel refuz + jurnal). |

## Rulare locală

```bash
uv run python manage.py payments_demo --output /tmp/plati.json     # creează și afișajul DEMO („display”)
# bridge-ul afișajului cu device_id / device_token „display”, BRIDGE_ALLOWED_ORIGINS=http://localhost:5176,
# sau, fără bridge: VITE_API_URL=http://localhost:8000/api/v1 VITE_DEVICE_TOKEN=<token> (doar `pnpm dev`)
pnpm --filter @jungle/cafe-display dev                             # http://localhost:5176
```

## Teste

`pnpm --filter @jungle/cafe-display test` (coada, sunetul, clientul API, ecranul) și partea „cafea → afișaj” din `E2E_ONLY=payments scripts/test-e2e`.

## Deploy

Fișiere statice (`pnpm --filter @jungle/cafe-display build`) pe `afisaj-cafenea.<domeniu>`; pe aparat, Chromium în mod kiosk (`deploy/kiosk-os/`).

## Specificații

[§8.7](../../docs/04-arhitectura/aplicatii/07-afisaj-cafenea.md), [ADR-0012](../../docs/04-arhitectura/adr/0012-autentificare-dispozitive.md), [ADR-0014](../../docs/04-arhitectura/adr/0014-chioscuri-ecrane-kiosk-os.md).
