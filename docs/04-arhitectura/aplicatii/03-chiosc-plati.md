# 8.3 Chioșcul de Plăți (aparat 2) — numerar cu rest la lansare

> **Sursa:** `MEGA_PROMPT.md` §8.3 (versiunea 1.0, 26.09.2026). Text preluat integral în Etapa 0, fără modificări de conținut.
> De acum, acest fișier este referința de lucru pentru această secțiune. Orice modificare ulterioară se notează aici, cu data și sursa („confirmat de proprietar la data X”); `MEGA_PROMPT.md` rămâne neschimbat, ca referință istorică.

- **Ecran de repaus**: ofertele zilei, meniul cafenelei, „Scanează cardul”.
- **Fluxuri**:
  1. **Check-in** la sosire.
  2. **Plătește rezervarea**, integral sau **„Împarte ora”**: se aleg participanții (prin scanarea cardurilor), sistemul calculează părțile (R-061), fiecare își plătește partea. Se vede în timp real cât mai e de plătit.
  3. **Plătește datorii** (anulări tardive, neprezentări).
  4. **Cumpără abonament** (configuratorul în 3 pași, R-081), înghețare (R-086).
  5. **Cafenea**: meniu, coș, plată → comanda apare pe afișajul cafenelei + bon cu număr de comandă.
  6. **Vouchere și sold**: aplicare voucher, folosirea creditului din cont.
  7. **Bon fiscal** pentru orice încasare (R-066).
- **Numerar**: acceptă bancnote (și monede, dacă aparatul permite), calculează și **dă rest**. Dacă nu are rest suficient, avertizează ÎNAINTE de introducerea banilor („Momentan acceptăm doar suma exactă” sau oferă restul ca credit în cont, doar cu acordul explicit al clientului).
- **Siguranța tranzacției**: fiecare bancnotă acceptată e jurnalizată local înainte de orice alt pas; dacă pica curentul sau conexiunea în mijlocul tranzacției, la repornire tranzacția se reia sau se reconciliază automat; niciun leu nu se pierde fără urmă. Fără conexiune la server, chioșcul **nu începe tranzacții noi** (afișează „temporar indisponibil”).
- **Mod personal (PIN + card de angajat)**: alimentare rest, golire casetă, numărare, reconciliere, rapoarte de închidere de zi (inclusiv raportul Z al casei de marcat), alerte „rest scăzut”, „casetă plină”, „blocaj bancnotă”.
- POS cu card: adaptor pregătit, dezactivat (R-062).
