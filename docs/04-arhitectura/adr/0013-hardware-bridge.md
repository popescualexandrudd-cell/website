# ADR-0013: Hardware Bridge — serviciu local, mesaje semnate, jurnal de numerar pe disc

- **Stare:** Propus (Etapa 0)
- **Data:** 2026-09-26
- **Legat de:** §4.2 punctul 9, §4.3, §8.3, §8.4, §13.4

## Context
Chioșcurile rulează aplicația în browser, dar aparatele fizice (scanner QR, acceptor și reciclator de numerar, casă de marcat fiscală, imprimantă de bonuri) se controlează local. Niciun leu nu are voie să se piardă fără urmă, inclusiv la căderea curentului sau a internetului. Modelele de aparate nu sunt încă alese (Q23).

## Decizie
1. `services/hardware-bridge`: **Python asyncio**, rulează pe fiecare aparat ca serviciu de sistem (systemd), expune un WebSocket **doar pe `127.0.0.1`**.
2. **Drivere interschimbabile** prin interfețe: `Scanner`, `CashDevice`, `FiscalPrinter`, `ReceiptPrinter`, `Health` (§8.4). Pentru fiecare există un **simulator complet** (inclusiv defecte: blocaj de bancnotă, rest insuficient, casetă plină, cădere de curent), ca tot sistemul să fie testabil fără hardware real (§13.4). Driverele reale se scriu după alegerea modelelor.
3. **Semnături (protecție chiar dacă browserul ar fi compromis):**
   - Fiecare bridge are o pereche de chei **Ed25519**; cheia privată nu părăsește aparatul și nu ajunge niciodată în browser.
   - Evenimentele de bani (bancnotă acceptată, rest dat) sunt **semnate de bridge**; serverul creditează numerarul **doar** pe baza evenimentelor cu semnătură validă, indiferent dacă sunt transmise prin browser sau direct.
   - Comenzile sensibile către aparat (de exemplu „dă rest 12 lei pentru tranzacția X”) sunt **semnate de server**; bridge-ul le verifică înainte de execuție.
   - Toate mesajele au nonce, marcă de timp și fereastră anti-replay; conexiunile de pe alte origini sunt refuzate.
4. **Jurnal local de numerar:** SQLite doar-adăugare (mod WAL, `synchronous=FULL`). Fiecare bancnotă acceptată se scrie pe disc **înainte** de orice alt pas. La repornire, tranzacțiile neterminate se reiau sau se reconciliază automat cu serverul (fiecare eveniment are un ID unic, deci sincronizarea este idempotentă).
5. **Fără conexiune la server, chioșcul nu începe tranzacții noi** și afișează „temporar indisponibil” (§8.3).
6. Starea aparatului (rest disponibil, casetă, temperatură, spațiu) se raportează periodic serverului (semnal de viață).

## Alternative analizate
- **Browserul vorbește direct cu aparatele (WebUSB/WebSerial):** suport limitat la protocoalele de numerar și fără jurnal sigur pe disc. Respins.
- **HMAC cu cheie partajată între bridge și browser:** cheia ar exista în browser, deci ar putea fi copiată. Respins în favoarea semnăturilor Ed25519.

## Consecințe
- Procedura de înrolare a aparatului înregistrează cheia publică a bridge-ului pe server (ADR-0012).
- Testele de „întrerupere de curent” rulează pe simulator (§13.2).
