# 5.6 Intervale orare și prețuri

> **Sursa:** `MEGA_PROMPT.md` §5.6 (versiunea 1.0, 26.09.2026). Text preluat integral în Etapa 0, fără modificări de conținut.
> De acum, acest fișier este referința de lucru pentru această secțiune. Orice modificare ulterioară se notează aici, cu data și sursa („confirmat de proprietar la data X”); `MEGA_PROMPT.md` rămâne neschimbat, ca referință istorică.

- **R-050** Benzi orare confirmate: **08:00–12:00 semi-vârf**; **12:00–13:00 în afara vârfului**; **15:00–22:00 vârf**. Nedefinite încă: 13:00–15:00, după 22:00, programul de funcționare și weekendul (Q3). Varianta implicită până la confirmare: 13:00–15:00 și 22:00–închidere = în afara vârfului; weekendul identic cu zilele lucrătoare.
- **R-051** **Motor de prețuri configurabil din admin** pe: locație × resursă/sport × sezon (vară/iarnă, cu datele de schimbare configurabile) × bandă orară × durată × tip client (abonat/neabonat, corporate) × tip sesiune (închiriere, lecție, clasă). Prețuri cunoscute: tenis 120 RON/oră închiriere; ~240 RON/oră tenis interior iarna; vara mai ieftin. **Padelul, pilatesul, lecțiile, sala de evenimente și cafeneaua nu au prețuri stabilite:** configurabile, cu valori demo marcate `DE_STABILIT` (Q21).
- **R-052** O rezervare care traversează mai multe benzi se taxează proporțional pe fiecare segment de 30 de minute. Testează trecerile de oră (DST).
- **R-053** Regulile de vârf și de abonament sunt **afișate clar în regulament** (pe site și la recepție) și la momentul cumpărării.
