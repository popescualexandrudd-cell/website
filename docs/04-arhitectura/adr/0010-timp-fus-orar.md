# ADR-0010: Timp și fus orar — `Europe/Bucharest`, cu trecerile de oră testate

- **Stare:** Propus (Etapa 0)
- **Data:** 2026-09-26
- **Legat de:** §1.1 punctul 8, R-041, R-050, R-052, §6.9

## Context
Rezervările, benzile orare, ferestrele de scor, sezoanele și notificările depind de ora locală. România trece la ora de vară și înapoi de două ori pe an; **deschiderea clubului cade în luna trecerii la ora de vară (28 martie 2027)**.

## Decizie
1. Baza de date stochează momente absolute (`timestamptz`, UTC). Django: `USE_TZ = True`, `TIME_ZONE = "Europe/Bucharest"`.
2. Regulile de business (grila de 30 de minute, benzile orare, zilele, sezoanele, ferestrele de scor) se calculează în ora locală `Europe/Bucharest`, cu `zoneinfo`.
3. Duratele rezervărilor sunt minute reale scurse (o rezervare de 60 de minute durează 60 de minute reale și în noaptea schimbării orei).
4. Generarea intervalelor pe grilă merge în ora locală: sare peste orele care nu există (la trecerea la ora de vară) și tratează explicit orele care apar de două ori (la trecerea la ora de iarnă).
5. Prețul pe segmente de 30 de minute (R-052) folosește ora locală de început a fiecărui segment.
6. **Teste obligatorii** cu ceas controlat în jurul datelor: 25.10.2026 (ora de iarnă), 28.03.2027 (ora de vară, luna deschiderii), 31.10.2027 (ora de iarnă), plus schimbarea de zi, de lună și de an.
7. Afișarea: format românesc (`26.09.2026`, `14:00`) și englezesc, prin `Intl`, mereu în ora clubului.

## Alternative analizate
- **Stocarea orei locale fără fus orar:** ambiguă la trecerea la ora de iarnă. Respins.
- **Totul în UTC, inclusiv regulile:** benzile orare „15:00–22:00” s-ar muta cu o oră de două ori pe an. Respins.

## Consecințe
- Toate funcțiile de timp primesc ceasul ca parametru sau folosesc un serviciu de timp înlocuibil în teste.
