# 6.5 Ranguri (confirmat: Bronz → Diamant, cu trepte)

> **Sursa:** `MEGA_PROMPT.md` §6.5 (versiunea 1.0, 26.09.2026). Text preluat integral în Etapa 0, fără modificări de conținut.
> De acum, acest fișier este referința de lucru pentru această secțiune. Orice modificare ulterioară se notează aici, cu data și sursa („confirmat de proprietar la data X”); `MEGA_PROMPT.md` rămâne neschimbat, ca referință istorică.

- **Bronz, Argint, Aur, Platină, Diamant**, fiecare cu 4 trepte: **IV → III → II → I**; **100 LP pe treaptă**.
- Deasupra: **Maestru** (LP nelimitat) și titlul **Regele Junglei** = **top 10 Maeștri după LP**, dintre cei eligibili (6.10). Regele Junglei e un titlu calculat dinamic, nu o stare stocată.
- **LP total pentru ordonare**: `index_treaptă × 100 + LP` (Bronz IV = 0 … Diamant I = 1900); Maestru = `2000 + LP`.
- **Promovare**: LP ≥ 100 → treapta următoare, `LP = LP − 100` (surplusul se păstrează). Din Diamant I la 100 LP → Maestru cu 0 LP + surplus.
- **Protecție la promovare**: următoarele **3 meciuri** după o promovare nu pot produce retrogradare (LP nu coboară sub 0).
- **Retrogradare**: LP < 0 (fără protecție) → treapta anterioară, cu **LP = 75**. Bronz IV are podea la 0. Maestru cu LP < 0 → Diamant I, LP 75.
- **Departajare** (egalitate de LP total): nivel (μ) mai mare, apoi mai multe meciuri oficiale jucate în sezon, apoi cine a atins primul acel LP. Ordinea e deterministă și testată.

## Notă (Etapa 2, 27.09.2026)
- Un singur meci nu poate produce două promovări: sub Maestru, surplusul după promovare se plafonează la 99 LP (LG-058, DE_CONFIRMAT). Situația apare doar cu bonusuri mari de turneu.
- Ultima departajare, pentru o ordine complet deterministă, este ID-ul jucătorului (LG-057).
