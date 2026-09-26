# 6.9 Fluxul de validare (mașină de stări, pe server)

> **Sursa:** `MEGA_PROMPT.md` §6.9 (versiunea 1.0, 26.09.2026). Text preluat integral în Etapa 0, fără modificări de conținut.
> De acum, acest fișier este referința de lucru pentru această secțiune. Orice modificare ulterioară se notează aici, cu data și sursa („confirmat de proprietar la data X”); `MEGA_PROMPT.md` rămâne neschimbat, ca referință istorică.

Stări: `PROGRAMAT → ÎN_DESFĂȘURARE → FEREASTRĂ_SCOR_DESCHISĂ → SCOR_PROPUS → CONFIRMAT_DE_TOȚI → (AȘTEAPTĂ_PLATA) → VALIDAT → APLICAT`, plus stările terminale `DISPUTAT`, `EXPIRAT`, `ANULAT`, `CONVERTIT_ANTRENAMENT`.

1. **Rezervarea există** pentru acel teren și interval, e de tip meci oficial (sau provocare/turneu) și e plătită sau în curs de plată. **Nu se pot introduce meciuri jucate în altă parte.** Se poate juca doar la baza clubului.
2. **Toți jucătorii (4 la dublu, 2 la simplu) au scanat cardul la intrarea pe teren** pentru acea rezervare (R-031).
3. **Fereastra de scor se deschide DOAR după ora de final a rezervării** și rămâne deschisă **30 de minute**. Înainte sau în timpul sesiunii, chioșcul refuză, cu mesaj clar („Scorul se poate introduce între 15:30 și 16:00”). La turnee: fereastra se deschide când meciul e marcat terminat (de jucători sau de directorul turneului) și se închide după 30 de minute (Q28).
4. **Un jucător scanează cardul și introduce scorul.** Ceilalți **scanează fiecare cardul și confirmă** (sau contestă) scorul afișat. **Toți trebuie să confirme**, altfel scorul nu se validează.
5. Orice contestare → `DISPUTAT` → apare în admin pentru soluționare (cu jurnal complet). Neconfirmat de toți până la închiderea ferestrei → `EXPIRAT` (nu contează; adminul poate interveni doar cu motiv scris, auditat).
6. **Validarea scorului se face doar în baza plății:** dacă rezervarea e plătită integral (inclusiv toate părțile din „Împarte ora”) → `VALIDAT`. Altfel → `AȘTEAPTĂ_PLATA` până la termenul configurabil (implicit 24 de ore, Q11), apoi `EXPIRAT`. Plata făcută ulterior la chioșcul de plăți validează automat.
7. `APLICAT`: se calculează MMR și LP, se actualizează rangurile, cardurile Wallet, ecranele, site-ul și chioșcurile în timp real și se trimit notificările.
8. **Validări multiple între sisteme**: fiecare tranziție verifică independent rezervarea (sistemul de rezervări), scanările (sistemul de prezențe), plata (registrul contabil) și dispozitivul (doar chioșcul de ligă înregistrat). Toate verificările sunt logate.
