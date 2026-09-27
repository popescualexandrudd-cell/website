# 6.7 Formatul scorului (confirmat: ca la padelul oficial)

> **Sursa:** `MEGA_PROMPT.md` §6.7 (versiunea 1.0, 26.09.2026). Text preluat integral în Etapa 0, fără modificări de conținut.
> De acum, acest fișier este referința de lucru pentru această secțiune. Orice modificare ulterioară se notează aici, cu data și sursa („confirmat de proprietar la data X”); `MEGA_PROMPT.md` rămâne neschimbat, ca referință istorică.

- Seturi până la 6 game-uri, **tie-break la 6–6** (până la 7 puncte, cu diferență de 2), **cele mai bune 2 din 3 seturi**.
- Regula la egalitate (40–40): **configurabilă** (Avantaj / Punct de aur / regula oficială în vigoare). **Verifică regulamentul oficial FIP / Premier Padel curent** înainte de a fixa valoarea implicită și documentează sursa.
- Al treilea set: set complet (implicit, ca în regulamentul oficial) sau super tie-break, configurabil per competiție.
- Validator de scor: acceptă doar scoruri posibile (6–0 … 6–4, 7–5, 7–6 cu tie-break valid; fără set 3 la 2–0; câștigătorul matematic corect). Pentru meciurile neterminate acceptă un set parțial (de exemplu 3–2) marcat explicit „neterminat”.

## Notă (Etapa 2, 27.09.2026): regula oficială la 40–40
- **Sursa verificată:** Federația Internațională de Padel (FIP), [„Between innovation and tradition: introducing the Star Point”](https://www.padelfip.com/2025/12/between-innovation-and-tradition-introducing-the-star-point-the-scoring-system-that-appeals-to-everyone/) (decembrie 2025). Regula a fost aprobată în unanimitate de Adunarea Generală FIP pe 28.11.2025 și se aplică din 2026 în Premier Padel, CUPRA FIP Tour, FIP Promises și în circuitul amator FIP Beyond.
- **„Star Point”:** de la prima egalitate se joacă cel mult două avantaje (egalitate 1 → avantaj 1 → egalitate 2 → avantaj 2 → egalitate 3); la a treia egalitate se joacă un singur punct decisiv. Perechea care primește alege partea din care primește; jucătorii nu își schimbă pozițiile pentru acest punct.
- **Valoarea implicită în motor:** `DeuceRule.STAR_POINT` (LG-072). Rămân disponibile „Punct de aur” și „Avantaj” clasic, configurabile per competiție.
- Setul 3 implicit: set complet, ca în regulamentul oficial (LG-073).
