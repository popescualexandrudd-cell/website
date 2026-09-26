# 6.6 Calculul LP pentru un meci oficial

> **Sursa:** `MEGA_PROMPT.md` §6.6 (versiunea 1.0, 26.09.2026). Text preluat integral în Etapa 0, fără modificări de conținut.
> De acum, acest fișier este referința de lucru pentru această secțiune. Orice modificare ulterioară se notează aici, cu data și sursa („confirmat de proprietar la data X”); `MEGA_PROMPT.md` rămâne neschimbat, ca referință istorică.

Pentru fiecare jucător `j` din echipa `A`:
```
S       = 1 (victorie) | 0 (înfrângere) | 0.5 (egalitate, posibilă doar la meci neterminat)
p       = probabilitatea de câștig a echipei A (6.2), calculată ÎNAINTE de actualizare
ΔLP_raw = K × (S − p)                      K = 40  → egal: +20 / −20
D       = LP_total_așteptat(Nivel_j) − LP_total_curent_j
          LP_total_așteptat = (Nivel − 1.0)/6.0 × 2000   (se calibrează prin simulare)
g       = victorie: clamp(1 + D/1000, 0.75, 1.5)
          înfrângere: clamp(1 − D/1000, 0.75, 1.5)       (MMR peste rang → urci mai repede, pierzi mai puțin)
m_tip   = oficial 1.0 | turneu 1.5 | provocare 1.0 (+ bonus 6.11)
w       = factorul de completare (6.8): 1.0 | 0.75 | 0.5
m_rep   = anti-farming (6.10): 1.0 | 0.5 | 0.25
ΔLP     = rotunjire_standard(ΔLP_raw × g × m_tip × w × m_rep) + bonusuri
clamp:    victorie ∈ [+3, +60]; înfrângere ∈ [−60, −3]; egalitate ∈ [−20, +20]
```
- Rotunjire: la cel mai apropiat întreg, cu .5 departe de zero. O victorie nu poate da niciodată LP negativ, o înfrângere nu poate da niciodată LP pozitiv (test de proprietate).
- Exemple de verificat în teste (K = 40, g = 1, m = 1): echipe egale → ±20; echipa mai slabă (p = 0.24) bate echipa mai bună → +30 / −30; echipa mai bună (p = 0.76) bate echipa mai slabă → +10 / −10.
- În simplu, aceeași formulă. În clasamentul pe perechi, `j` e perechea.
- În meciurile de plasare, LP nu se aplică (doar MMR).
