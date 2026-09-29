# Chioșcul de Plăți (aparatul 2)

> **Stare:** construit în Etapa 8 (29.09.2026), în curs de aprobare. Rulează cu Hardware Bridge și simulatoarele lui (acceptor de bancnote cu rest, casă de marcat, imprimantă de bonuri) până la alegerea aparatelor (Q23).

## Ce face (§8.3)

- **Repaus:** „Scanează cardul”, meniul cafenelei și ofertele de abonament, cu prețurile orientative marcate (Q21); butonul discret „Personal”.
- **După scanarea cardului** (ieșire automată după **60 de secunde** fără atingere, **niciodată cât timp sunt bani în aparat**):
  1. **Check-in** (R-030).
  2. **Plata unei rezervări**, întreagă sau **„Împarte ora”**: jucătorii își scanează cardurile, sistemul calculează părțile (R-060, R-061), fiecare își plătește partea; „mai sunt de plătit” se actualizează la 3 secunde.
  3. **Datorii** (anulări tardive, neprezentări), primele în listă, marcate.
  4. **Abonament:** configuratorul în 3 pași (sporturi, intensitate, perioadă; R-081), prețul calculat de server; **înghețare** (R-086).
  5. **Cafenea:** meniu, cantități, coș; după plată, comanda apare pe afișajul cafenelei și se tipărește un bon cu numărul comenzii.
  6. **Vouchere și credit:** voucherele clientului sau un cod tastat pe ecran (R-121); plata din creditul contului, cu cheie de idempotență (R-067).
  7. **Bon fiscal** pentru orice încasare cu numerar (R-066), tipărit de casa de marcat prin bridge.
- **Numerar cu rest:** ÎNAINTE de introducerea banilor, chioșcul întreabă aparatul dacă poate da rest. Dacă nu: „Momentan acceptăm doar suma exactă” (o bancnotă care ar cere rest e înapoiată) sau restul ca **credit în cont, doar cu bifa explicită a clientului**.
- **Anulare:** banii introduși se dau înapoi; ce nu poate da aparatul devine credit în cont (și managerul e anunțat). Dacă plata se oprește cu bani în aparat, singura ieșire de pe ecran e „Anulez și primesc banii înapoi”.
- **Siguranță (ADR-0013):** fiecare bancnotă e scrisă întâi pe discul bridge-ului, semnată, apoi trimisă imediat serverului; serverul confirmă semnat (`journal.ack`). La pornire și la 5 minute, chioșcul trimite serverului tot ce bridge-ul are neconfirmat (după o cădere de curent sau de rețea) și alertele aparatului („rest scăzut”, „casetă plină”). Fără server, chioșcul **nu începe plăți noi**.
- **Mod personal (Q54):** cardul angajatului + PIN de 6 cifre (setat de angajat din cont, cu 2FA; blocare după greșeli repetate): alimentare rest (din seif), golire casetă (în seif), numărare (comparată cu registrul; diferența ajunge la manager, R-064), închidere de zi cu raportul Z; starea aparatului.

## Cum se leagă de restul sistemului

| Cu cine | Cum |
|---|---|
| Hardware Bridge | `ws://127.0.0.1:8765` (în testele cap-coadă: 8766). `hello` dă adresa API-ului și tokenul aparatului; cardurile și banii vin semnați de bridge; comenzile de numerar, bon și închidere vin semnate de server, iar bridge-ul le verifică. |
| API `/api/v1/kiosk/payments/*` | Doar cu `X-Device-Token` (și certificat client în producție, ADR-0012); serverul verifică la fiecare apel: Chioșc de Plăți activ, al clubului, din rețeaua clubului. |
| API public `/api/v1/subscriptions/options` și `/quote` | Configuratorul de abonamente. |

## Rulare locală

```bash
scripts/setup
cd apps/backend && KIOSK_ALLOW_LOOPBACK=true uv run python manage.py runserver
KEY=$(BRIDGE_DEVICE_ID=00000000-0000-0000-0000-000000000000 BRIDGE_ALLOWED_ORIGINS=http://localhost:5175 BRIDGE_DATA_DIR=/tmp/bridge-plati uv run jungle-bridge public-key)
uv run python manage.py payments_demo --public-key "$KEY" --output /tmp/plati.json
# bridge-ul: device_id / device_token din /tmp/plati.json („kiosk”), BRIDGE_DATA_DIR=/tmp/bridge-plati,
# BRIDGE_SIMULATOR_CONTROL=1, BRIDGE_SERVER_PUBLIC_KEY=$(uv run python manage.py device_command_key)
pnpm --filter @jungle/kiosk-payments dev          # http://localhost:5175
```

Caseta **SIMULATOR** (doar cu simulatorul pornit) scanează un card din `/tmp/plati.json`, introduce bancnote (+1 … +200 lei) și provoacă defecte (blocaj, fără hârtie). Recepționerul DEMO are PIN-ul din același fișier.

## Teste

- `pnpm --filter @jungle/kiosk-payments test`: coșul, plata cu numerar pas cu pas (rest, suma exactă, credit cu acord, anulare, blocaj, fără conexiune, bancnotă ratată recuperată din jurnal, imprimantă fără hârtie), creditul, zilele în ora clubului, textele RO/EN, ecranele.
- `E2E_ONLY=payments scripts/test-e2e`: cap-coadă cu backendul real, **două Hardware Bridge reale** (chioșcul și afișajul) și build-urile de producție: repaus, voucher + numerar cu rest și bon fiscal, cafea plătită din credit care apare pe afișajul cafenelei, configuratorul de abonament și anularea, modul personal (numărare, raport Z), PIN greșit; plus accesibilitate (axe).

## Deploy

Fișiere statice (`pnpm --filter @jungle/kiosk-payments build`), servite de Caddy pe `kiosk-plati.<domeniu>`, doar pentru aparatele înregistrate; pe aparat, Chromium în mod kiosk (`deploy/kiosk-os/`, ADR-0014), ca la Chioșcul de Ligă ([runbook](../../docs/09-hardware/03-instalare-chiosc-si-inrolare.md)).

## Specificații

[§8.3](../../docs/04-arhitectura/aplicatii/03-chiosc-plati.md), [ADR-0009](../../docs/04-arhitectura/adr/0009-bani-registru-contabil.md), [ADR-0012](../../docs/04-arhitectura/adr/0012-autentificare-dispozitive.md), [ADR-0013](../../docs/04-arhitectura/adr/0013-hardware-bridge.md).
