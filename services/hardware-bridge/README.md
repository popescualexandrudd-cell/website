# Hardware Bridge (serviciu local pe fiecare aparat)

> **Stare:** neînceput (schelet creat în Etapa 0, 26.09.2026). **Se construiește în Etapa:** 7 (cu simulatoare), 14 (drivere reale, după Q23).

## Ce face

Leagă aplicația din browser a chioșcului de aparatele fizice: scanner QR, acceptor și reciclator de numerar cu rest, casă de marcat fiscală, imprimantă de bonuri (§8.4). Drivere interschimbabile și **simulatoare complete** pentru dezvoltare și teste. Mesaje semnate, jurnal local de numerar pe disc (niciun leu pierdut fără urmă).

## Specificații

- [8.4 Hardware Bridge (serviciu local pe fiecare aparat)](../../docs/09-hardware/01-hardware-bridge.md)
- [Criterii de achiziție hardware (propunere)](../../docs/09-hardware/02-criterii-achizitie-hardware.md)

## Decizii tehnice

[ADR-0013](../../docs/04-arhitectura/adr/0013-hardware-bridge.md), [ADR-0012](../../docs/04-arhitectura/adr/0012-autentificare-dispozitive.md), [ADR-0014](../../docs/04-arhitectura/adr/0014-chioscuri-ecrane-kiosk-os.md)

## Variabile de mediu planificate

Valorile reale stau doar în `.env` pe server, niciodată în git.

- identificatorul aparatului
- calea către cheile aparatului
- URL-ul API-ului
- driverele active (simulator sau real)

## Rulare, testare, deploy

Etapa 0 nu conține cod. `.env.example`, `Dockerfile` (unde e cazul) și testele se adaugă în etapa care construiește componenta, împreună cu instrucțiunile de rulare, testare și deploy.
