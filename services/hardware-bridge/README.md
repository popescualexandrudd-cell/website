# Hardware Bridge (serviciu local pe fiecare aparat)

> **Stare:** construit în Etapa 7 (28.09.2026), cu **simulatoare** pentru toate aparatele. Driverele reale se scriu în Etapa 14, după alegerea modelelor (Q23).

## Ce face

Leagă aplicația din browser a chioșcului de aparatele fizice: scanner QR, acceptor și reciclator de numerar cu rest, casă de marcat fiscală, imprimantă de bonuri (§8.4, ADR-0013).

- **WebSocket doar pe `127.0.0.1`**, doar pentru originea aplicației chioșcului (`BRIDGE_ALLOWED_ORIGINS`); orice altă pagină e refuzată la conectare. Mesaje de cel mult 64 KB.
- **Cheie Ed25519 proprie** (`bridge-key.pem`, creată la prima pornire, drepturi 600). Cheia privată nu iese de pe aparat și nu ajunge în browser.
- **Scanările sunt semnate** de bridge: pagina le trimite serverului exact cum le-a primit, iar serverul le acceptă o singură dată, într-o fereastră de 2 minute (`jungle.devices.bridge.verify`). Un browser compromis nu poate inventa o scanare.
- **Numerarul se mișcă doar la comenzi semnate de server** (`cash.accept`, `cash.dispense`, `cash.stop`, `cash.close`), fiecare executată o singură dată (nonce-ul se păstrează pe disc, deci și după o repornire).
- **Jurnal de numerar pe disc**: SQLite doar-adăugare (WAL, `synchronous=FULL`, triggere care refuză modificarea sau ștergerea). Fiecare bancnotă se scrie, semnată, **înainte** ca pagina să afle de ea. La pornire, tranzacțiile rămase deschise după o cădere de curent se închid cu un eveniment `cash.interrupted` (suma introdusă și restul dat), pentru reconciliere.
- **Simulatoare complete**, cu defecte: bancnotă blocată, rest insuficient, casetă plină, cădere de curent, fără hârtie, imprimantă deconectată.

## Structura

| Fișier | Rol |
|---|---|
| `src/jungle_bridge/drivers/base.py` | interfețele `Scanner`, `CashDevice`, `FiscalPrinter`, `ReceiptPrinter`, `Health` |
| `src/jungle_bridge/drivers/simulator.py` | simulatoarele (restul se calculează cu cele mai puține bancnote disponibile) |
| `src/jungle_bridge/signing.py` | cheia, semnarea mesajelor, verificarea comenzilor serverului |
| `src/jungle_bridge/journal.py` | jurnalul de numerar și recuperarea după cădere |
| `src/jungle_bridge/reconcile.py` | trimiterea jurnalului la server (serverul îl primește din Etapa 8) |
| `src/jungle_bridge/bridge.py` | mesajele de la pagină și evenimentele trimise paginii |
| `src/jungle_bridge/server.py` | WebSocket-ul |

## Mesaje

De la pagină (JSON, cu `id` opțional, întors în răspuns): `hello`, `health`, `receipt.print`, `cash.check` (se poate da restul? — întrebat **înainte** de plată, §8.3), `cash.accept` / `cash.dispense` / `cash.stop` / `cash.close` (doar cu `command` semnat de server), `sim.scan` / `sim.insert` / `sim.fault` (doar cu `BRIDGE_SIMULATOR_CONTROL=1`).

Către pagină: `scan` (codul, semnat), `cash.accepted` (fiecare bancnotă, semnată, deja pe disc), `cash.complete`, `fault` (aparatul și codul defectului).

Erorile au coduri stabile (`bad_json`, `unknown_op`, `invalid`, `signature` + `reason`, `busy`, `txn_used`, `txn_unknown`, `not_simulator` sau codul defectului aparatului), traduse în aplicația chioșcului.

## Rulare

```bash
cp services/hardware-bridge/.env.example .env.bridge     # completați valorile
set -a; . ./.env.bridge; set +a
uv run jungle-bridge public-key   # cheia publică: se lipește în admin la înrolare
uv run jungle-bridge run          # pornește serviciul (ws://127.0.0.1:8765)
```

La club rulează ca serviciu systemd (`deploy/kiosk-os/`), cu fișierul de mediu `/etc/jungle-bridge/bridge.env`. Nu are Dockerfile: rulează direct pe aparat, lângă aparatele USB/seriale.

## Teste

```bash
cd services/hardware-bridge && uv run pytest --cov   # 100% acoperire pe ramuri
uv run mypy src tests
```

Testul de contract din backend (`jungle/devices/tests/test_device_auth.py`) verifică faptul că o scanare semnată de acest cod e acceptată de server.

## Decizii tehnice

[ADR-0013](../../docs/04-arhitectura/adr/0013-hardware-bridge.md), [ADR-0012](../../docs/04-arhitectura/adr/0012-autentificare-dispozitive.md), [ADR-0014](../../docs/04-arhitectura/adr/0014-chioscuri-ecrane-kiosk-os.md). Specificații: [§8.4](../../docs/09-hardware/01-hardware-bridge.md), [criterii de achiziție](../../docs/09-hardware/02-criterii-achizitie-hardware.md).
