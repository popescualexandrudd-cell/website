# 8.4 Hardware Bridge (serviciu local pe fiecare aparat)

> **Sursa:** `MEGA_PROMPT.md` §8.4 (versiunea 1.0, 26.09.2026). Text preluat integral în Etapa 0, fără modificări de conținut.
> De acum, acest fișier este referința de lucru pentru această secțiune. Orice modificare ulterioară se notează aici, cu data și sursa („confirmat de proprietar la data X”); `MEGA_PROMPT.md` rămâne neschimbat, ca referință istorică.

- Interfețe (clase abstracte) cu **drivere de simulare** complete pentru dezvoltare și teste, plus drivere reale adăugate când se cunosc modelele (Q23):
  - `Scanner`: cititor QR (de obicei USB „tastatură”, HID, sau serial).
  - `CashDevice`: acceptor + reciclator cu rest (protocoale uzuale în industrie: SSP, ccTalk, MDB; nu presupune, verifică modelul cumpărat).
  - `FiscalPrinter`: casă de marcat fiscală (driverul producătorului ales).
  - `ReceiptPrinter`: bonuri nefiscale (ESC/POS).
  - `Display` / `Health`: stare, temperatură, spațiu.
- Comunicare cu aplicația din browser: WebSocket pe localhost, mesaje semnate, cu nonce și anti-replay. Jurnal local append-only (SQLite) pentru evenimentele de numerar, sincronizat și reconciliat cu serverul.
- Scripturi în `deploy/kiosk-os/`: instalare, pornire automată, mod kiosk, watchdog, actualizări, blocarea accesului la sistemul de operare.
