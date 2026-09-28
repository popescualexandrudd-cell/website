# Exemplu de sezon — Etapa 6 (DATE DEMO)

> Generat pe 28.09.2026 de codul real al ligii, pe o bază de date de test. **Toate numele și rezultatele sunt demo** (numele din exemplul §8.5; „Jucător 3” … „Jucător 8” sunt fictivi). Nimic de aici nu e real. Pentru exemplu, minimul de meciuri pe sezon a fost coborât la 3 (implicit: 12).

## 1. Clasamentul de dublu după 13 meciuri (ce se vede pe site)
Doar câmpurile publice din R-012: nume, rang, nivel, LP, loc. După primele 5 meciuri („plasarea”), rangul pornește cel mult de la Platină IV.

| Loc | Jucător | Rang | Nivel | LP |
|---|---|---|---|---|
| 1 | Popescu Alexandru Daniel | Platină IV | 5.6 | 14 |
| 2 | Jucător 4 | Platină IV | 4.9 | 6 |
| 3 | Jucător 5 | Platină IV | 6.5 | 4 |
| 4 | Moșteanu Rareș | Aur I | 5.6 | 80 |
| 5 | Jucător 3 | Aur I | 3.9 | 72 |
| 6 | Jucător 6 | Aur IV | 3.3 | 75 |
| 7 | Jucător 7 | Aur IV | 3.1 | 75 |
| 8 | Jucător 8 | Argint II | 3.1 | 3 |

## 2. Un meci trecut prin Chioșcul Ligii, pas cu pas
Popescu și Moșteanu contra Jucător 3 și Jucător 4, pe Teren 4, 14:00–15:30. Scor: 6–4, 7–6 (7–5). Rezervarea s-a plătit abia la 16:10.

| Ora | Pas |
|---|---|
| 15:35 | Scor introdus la chioșc |
| 15:35 | Confirmat de toți (rezervare și scanări verificate din nou) |
| 15:35 | Așteaptă plata |
| 16:10 | Validat (rezervarea plătită integral) |
| 16:10 | Aplicat în ligă (MMR și LP calculate) |

Fiecare pas păstrează în jurnal ce s-a verificat (rezervarea, scanările la intrarea pe teren, plata, chioșcul).

## 3. Un turneu eliminatoriu (4 perechi, tragere după rang)
LP-ul meciurilor de turneu se înmulțește cu 1,5; la final se adaugă bonusul pe fază (DE_CONFIRMAT, Q28).

| Loc | Pereche | Bonus LP (fiecare) |
|---|---|---|
| 1 | Popescu Alexandru Daniel și Moșteanu Rareș | 30 |
| 2 | Jucător 3 și Jucător 4 | 20 |
| 3 | Jucător 5 și Jucător 6 | 10 |
| 3 | Jucător 7 și Jucător 8 | 10 |

## 4. Clasamentul final, la închiderea sezonului
Bonusul de turneu l-a promovat pe Moșteanu în Platină IV, unde a terminat al 4-lea în rang, deci fără premiu de top 3.

| Loc | Jucător | Rang | Nivel | LP |
|---|---|---|---|---|
| 1 | Popescu Alexandru Daniel | Platină IV | 5.6 | 44 |
| 2 | Jucător 4 | Platină IV | 4.9 | 26 |
| 3 | Jucător 5 | Platină IV | 6.5 | 14 |
| 4 | Moșteanu Rareș | Platină IV | 5.6 | 10 |
| 5 | Jucător 3 | Aur I | 3.9 | 92 |
| 6 | Jucător 6 | Aur IV | 3.3 | 85 |
| 7 | Jucător 7 | Aur IV | 3.1 | 85 |
| 8 | Jucător 8 | Argint II | 3.1 | 13 |

## 5. Recompensele (varianta implicită Q6)
Top 3 din fiecare rang primesc 5 vouchere: 15% la abonament și 4 × 15% la rezervări (valabile 31 de zile). În acest exemplu nu există Regi ai Junglei (nimeni nu a ajuns Maestru).

| Premiu | Jucător | Vouchere primite |
|---|---|---|
| Top 3 Platină, locul 1 | Popescu Alexandru Daniel | 5 |
| Top 3 Platină, locul 2 | Jucător 4 | 5 |
| Top 3 Platină, locul 3 | Jucător 5 | 5 |
| Top 3 Aur, locul 1 | Jucător 3 | 5 |
| Top 3 Aur, locul 2 | Jucător 6 | 5 |
| Top 3 Aur, locul 3 | Jucător 7 | 5 |
| Top 3 Argint, locul 1 | Jucător 8 | 5 |
