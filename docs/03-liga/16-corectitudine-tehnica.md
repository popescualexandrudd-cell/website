# 6.16 Corectitudine tehnică (obligatoriu)

> **Sursa:** `MEGA_PROMPT.md` §6.16 (versiunea 1.0, 26.09.2026). Text preluat integral în Etapa 0, fără modificări de conținut.
> De acum, acest fișier este referința de lucru pentru această secțiune. Orice modificare ulterioară se notează aici, cu data și sursa („confirmat de proprietar la data X”); `MEGA_PROMPT.md` rămâne neschimbat, ca referință istorică.

- **Event sourcing pentru rating**: fiecare meci aplicat produce un eveniment imutabil (valori înainte/după pentru fiecare jucător și pereche). Aplicarea e idempotentă și în ordinea cronologică a finalului de meci.
- Dacă un meci validat e anulat de admin (cu motiv), sistemul **recalculează determinist** întregul sezon de la acel punct (replay) și rezultatul trebuie să fie identic cu o recalculare de la zero (test).
- Concurență: două confirmări simultane nu pot aplica meciul de două ori (blocare pe rândul meciului + cheie de idempotență).
