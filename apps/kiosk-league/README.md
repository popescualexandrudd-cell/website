# Chioșcul de Ligă (aparatul 1)

> **Stare:** construit în Etapa 7 (28.09.2026). Rulează cu Hardware Bridge și simulatoarele lui până la alegerea aparatelor (Q23).

## Ce face

Singurul loc unde se introduc și se confirmă scorurile ligii (§4.1, §8.2, invariantul 1).

- **Ecran de repaus:** clasament live (se schimbă la 10 secunde între Dublu / Simplu / Perechi), Meciul zilei (teren și oră, Q49), Regii Junglei, provocările zilei, „Scanează cardul”; clasamentele complete, cu căutare.
- **După scanarea cardului:** o sesiune scurtă (ieșire automată după **30 de secunde** fără atingere, cu numărătoare inversă în ultimele 10). Se văd doar datele private minime (nume, rang, LP, nivel, loc, meciuri jucate față de minim) și ce are jucătorul de făcut.
- **Acțiuni:** înscriere în ligă (acordul GDPR complet, bifă obligatorie, doar de la 18 ani), introducerea scorului set cu set (echipe, tie-break, super tie-break, „meci neterminat”), confirmare sau contestare, provocări (răspuns și provocare nouă; partenerul își scanează cardul), check-in, clasamente cu tastatură pe ecran, meciuri de turneu (marcat „terminat”, apoi scorul).
- **Mesaje de eroare prietenoase**, traduse din codurile API-ului (de exemplu „Scorul se poate introduce între 11:00 și 11:30”). Ora e mereu ora clubului (`Europe/Bucharest`).
- **RO / EN** (buton în colț; sesiunea pornește în limba jucătorului). Textele stau în `packages/i18n/messages/{ro,en}.json`, sub `kiosk.*`.
- **Fără server:** banda „Serviciu temporar indisponibil” și reîncercare automată. **Fără Hardware Bridge:** avertisment pentru recepție.

## Cum se leagă de restul sistemului

| Cu cine | Cum |
|---|---|
| Hardware Bridge (`services/hardware-bridge`) | WebSocket pe `ws://127.0.0.1:8765`. Mesajul `hello` dă adresa API-ului și tokenul aparatului; fiecare card scanat vine **semnat** de bridge și se trimite serverului exact așa. |
| API (`/api/v1/kiosk/league/*`) | Doar cu antetul `X-Device-Token` (și certificat client în producție, ADR-0012). Serverul verifică la fiecare acțiune: Chioșc de Ligă activ, al clubului, din rețeaua clubului. Prima scanare deschide o sesiune de 60 de secunde pe server, legată de aparat; acțiunile următoare o folosesc. |

Tokenul aparatului **nu** intră niciodată în fișierele publicate: vine de la bridge (din `.env`-ul aparatului). Doar în modul de dezvoltare (`pnpm dev`) se poate lua din `VITE_DEVICE_TOKEN`.

## Rulare locală

```bash
scripts/setup                                        # o dată: baza de date și datele demo
cd apps/backend && KIOSK_ALLOW_LOOPBACK=true uv run python manage.py runserver   # backend
uv run python manage.py kiosk_demo --public-key "$(BRIDGE_DEVICE_ID=00000000-0000-0000-0000-000000000000 BRIDGE_ALLOWED_ORIGINS=http://localhost:5174 BRIDGE_DATA_DIR=/tmp/bridge uv run jungle-bridge public-key)" --output /tmp/kiosk.json
# pornește bridge-ul cu device_id și device_token din /tmp/kiosk.json (vezi services/hardware-bridge/README.md),
# cu BRIDGE_SIMULATOR_CONTROL=1, apoi:
pnpm --filter @jungle/kiosk-league dev               # http://localhost:5174
```

Cu simulatorul pornit, jos apare caseta **SIMULATOR**: se scrie codul unui card din `/tmp/kiosk.json` și se apasă „Scan”. La club simulatorul e oprit (`BRIDGE_SIMULATOR_CONTROL=0`), iar caseta nu apare.

## Teste

- `pnpm --filter @jungle/kiosk-league test`: teste unitare (texte, erori, ora clubului, scanerul-tastatură, scorul, clientul API, legătura cu bridge-ul, ecranele).
- `E2E_ONLY=kiosk scripts/test-e2e`: cap-coadă, cu backendul real, **Hardware Bridge real** (simulatoare, scanări semnate) și build-ul de producție: repaus, card necunoscut, înscriere GDPR, scor introdus și confirmat de ceilalți trei, check-in, căutare, ieșire automată după 30 s; plus verificare de accesibilitate (axe). Cu `E2E_SCREENSHOTS=<folder>` salvează capturile de ecran.

## Deploy

Fișiere statice (`pnpm --filter @jungle/kiosk-league build` → `dist/`), servite de Caddy pe `kiosk-liga.<domeniu>`, doar pentru aparatele înregistrate (§4.6). Nu are Dockerfile propriu. Pe aparat, Chromium în mod kiosk o deschide la pornire (`deploy/kiosk-os/`, ADR-0014).

## Specificații și decizii

[§8.2](../../docs/04-arhitectura/aplicatii/02-chiosc-liga.md), [§6.9](../../docs/03-liga/09-fluxul-de-validare.md), [ADR-0007](../../docs/04-arhitectura/adr/0007-frontend-nextjs-vite.md), [ADR-0012](../../docs/04-arhitectura/adr/0012-autentificare-dispozitive.md), [ADR-0013](../../docs/04-arhitectura/adr/0013-hardware-bridge.md), [ADR-0014](../../docs/04-arhitectura/adr/0014-chioscuri-ecrane-kiosk-os.md).
