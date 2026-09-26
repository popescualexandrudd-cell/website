# 12.1 Securitate

> **Sursa:** `MEGA_PROMPT.md` §12.1 (versiunea 1.0, 26.09.2026). Text preluat integral în Etapa 0, fără modificări de conținut.
> De acum, acest fișier este referința de lucru pentru această secțiune. Orice modificare ulterioară se notează aici, cu data și sursa („confirmat de proprietar la data X”); `MEGA_PROMPT.md` rămâne neschimbat, ca referință istorică.

- **Scorurile se acceptă EXCLUSIV de la chioșcul de ligă înregistrat**: dispozitiv autentificat cu cheie unică (ideal certificat client / mTLS) + restricție de rețea (rețeaua clubului) + rol „Dispozitiv Ligă”. Orice altă sursă primește refuz, logat.
- Plățile din chioșc: doar de la dispozitivul „Plăți”, prin bridge-ul semnat.
- OWASP Top 10 acoperit: CSRF, XSS, SQLi, SSRF, rate limiting, blocare după încercări eșuate, CSP strict, headere de securitate, validarea tuturor intrărilor, secrete doar în variabile de mediu (niciodată în git), dependențe scanate.
- 2FA pentru toate conturile de personal; principiul privilegiului minim; jurnal de audit imutabil.
- Backup-uri criptate; test de restaurare automat, lunar.
