# 8.5 Ecranele de la terenuri și cele de lobby/cafenea/mezanin

> **Sursa:** `MEGA_PROMPT.md` §8.5 (versiunea 1.0, 26.09.2026). Text preluat integral în Etapa 0, fără modificări de conținut.
> De acum, acest fișier este referința de lucru pentru această secțiune. Orice modificare ulterioară se notează aici, cu data și sursa („confirmat de proprietar la data X”); `MEGA_PROMPT.md` rămâne neschimbat, ca referință istorică.

- **Ecranul fiecărui teren** afișează live:
  - teren, interval orar, durata (60/90/120/150/180), **tipul sesiunii** (meci oficial de ligă, antrenament, lecție, turneu, provocare, închiriere);
  - pentru fiecare jucător: **nume și prenume, rang (de exemplu Diamant II), LP, nivel** (doar câmpurile publice din R-012);
  - timp rămas, următoarea rezervare, eticheta „Meciul zilei” când e cazul;
  - un cod QR spre pagina publică a terenului sau a ligii (doar vizualizare).
- Exemplu (date demo, folosește exact aceste nume în seed):
```
TEREN 4 · 14:00–15:30 · 90 min · MECI OFICIAL DE LIGĂ
Popescu Alexandru Daniel   Diamant II · 67 LP · Nivel 5.2
Moșteanu Rareș             Diamant III · 12 LP · Nivel 5.0
                    vs
[Jucător 3]                Platină I · 88 LP · Nivel 4.8
[Jucător 4]                Diamant IV · 40 LP · Nivel 4.9
Timp rămas: 00:47 · Următorul: 15:30 Antrenament
```
- În repaus: vizual „jungle” animat, clasamente, evenimente, reclame interne.
- **Ecranele de lobby/cafenea/mezanin**: starea tuturor terenurilor, Meciul zilei, clasamente, Regii Junglei, evenimente, numerele comenzilor de cafenea gata de ridicat.
- Rezistență: reconectare automată, ultima stare păstrată, indicator discret de conexiune, fără ecrane goale.
