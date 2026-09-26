# 8.1 Backend central

> **Sursa:** `MEGA_PROMPT.md` §8.1 (versiunea 1.0, 26.09.2026). Text preluat integral în Etapa 0, fără modificări de conținut.
> De acum, acest fișier este referința de lucru pentru această secțiune. Orice modificare ulterioară se notează aici, cu data și sursa („confirmat de proprietar la data X”); `MEGA_PROMPT.md` rămâne neschimbat, ca referință istorică.

- API REST versionat (`/api/v1/`) + WebSockets pe canale (clasament, terenuri, ecrane, chioșcuri, cafenea).
- Roluri și permisiuni (RBAC): **Admin** (tot), **Manager** (rapoarte, prețuri, evenimente, sezoane), **Recepție** (rezervări, carduri, asistență la chioșc), **Antrenor/Instructor** (program propriu, clienți, prezențe, deblocări după neprezentări), **Jucător/Client**, **Dispozitiv** (chioșc ligă, chioșc plăți, ecran, cafenea; fiecare cu drepturi minime).
- Sarcini programate: remindere, deschiderea și închiderea ferestrelor de scor, expirări, detectarea neprezentărilor, decay, închiderea sezonului, emiterea recompenselor, rapoarte, jurnale AI, backup-trigger, sănătatea dispozitivelor.
- Jurnal de audit pentru orice modificare a banilor, scorurilor, ligii, datelor personale, prețurilor și configurării.
