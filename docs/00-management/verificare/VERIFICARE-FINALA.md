# Verificarea finală a proiectului

> 07.10.2026, după livrarea Etapelor 0–16. Cererea proprietarului (06.10.2026): „după livrare și urcarea finală în GitHub, pentru rulare local și pe server, vreau să verifici orice fișier în parte, verificare finală completă, și să testezi totul”.

## Ce s-a verificat, fișier cu fișier
Depozitul are 1 499 de fișiere: 943 de cod și scripturi, 353 de documente, 174 de imagini și videouri, plus configurări. Fiecare categorie a trecut printr-o verificare automată care atinge **fiecare fișier**:

| Ce | Câte | Cum | Rezultat |
|---|---|---|---|
| Python (backend, bridge, motorul ligii, scripturi) | toate | ruff (regulile stricte din rădăcină), mypy strict, compilare, pytest cu acoperire | fără erori; acoperire ≥ 95% total, 100% pe ramuri la ligă, bani, ecrane, panou, evenimente, blog, conținut, feedback, planificator, notificări, AI, bridge, motorul ligii |
| TypeScript (site, panou, chioșcuri, ecrane, pachete) | toate | tsc strict, ESLint, Vitest | fără erori |
| Scripturi shell | 19 | ShellCheck (nivel „warning”) | toate curate |
| JSON și YAML | toate | citite cu un parser | toate valide |
| Documente Markdown | 226 | fiecare link relativ verificat | toate valide (linkurile textelor legale duc la pagini ale site-ului) |
| Imagini și videouri | 174 | fiecare căutată în cod și documente | toate folosite |
| Texte RO/EN | toate cheile | testul traducerilor; cele 228 de coduri de eroare au text în ambele limbi | complete |
| Secrete | tot depozitul | căutare de chei private, tokenuri, `.env`, `.pem` | niciunul |
| Componente | 13 | README, `.env.example`, Dockerfile unde e cazul, teste | complete |
| ADR-uri | 25 | fiecare în index | complete |

## Invariantele, verificate în cod
- **Rotunjirea LP:** niciun `round()` din Python pe LP sau bani. `round()` apare doar la valori afișate (probabilități, niveluri).
- **Timpul:** doar `jungle.core.clock`; singura excepție găsită (`wallet_check`) a fost reparată.
- **Banii:** niciun `float` în modulele de bani; registrul refuză altceva decât întregi.

## Ce a găsit verificarea și s-a reparat
1. **Site-ul complet nu pornea în stiva de producție.** Serverul site-ului citea API-ul prin internet. Acum îl citește prin proxy, în interior. Ar fi blocat ziua lansării.
2. **După ștergerea unui cont, notificările push puteau ajunge încă pe telefonul persoanei.** Acum ștergerea elimină abonările push, mesajele în așteptare și alegerile, iar canalul push refuză un cont închis. Testat.
3. **Jurnalele containerelor nu se roteau.** Pe server, ar fi umplut discul în timp. Acum: 5 × 10 MB pe serviciu, verificat automat.
4. **`rollback` anunța succesul fără să verifice.** Acum așteaptă backend-ul.
5. **Backend-ul avea 3 procese fixe.** Acum se dimensionează după procesorul serverului.
6. **Două vulnerabilități în dependențe** (`sharp`, `source-map-js`) reparate; auditul rulează acum la fiecare push.
7. **Lipseau registrul prelucrărilor (art. 30) și DPIA** promise în §12.2. Scrise acum, iar politica de confidențialitate a fost completată.
8. **`packages/ui`** rămăsese schelet din Etapa 0. Scos (ADR-0025), cu linkurile și documentația actualizate.

## Testat tot
- **`scripts/test-all`** (rulat la fiecare push de hook): verificările de cod, testele backend și JS, toate testele cap-coadă cu axe (site pe desktop și mobil, Chioșcul Ligii cu Hardware Bridge, Chioșcul de Plăți, afișajul cafenelei, ecranele, panoul cu 2FA).
- **`scripts/test-deploy`**, rulat local cu 500 de vizitatori și în CI la fiecare push:
  - auditul dependențelor;
  - proxy-ul pe un Caddy real;
  - ShellCheck;
  - instalarea serverului pe un Ubuntu 24.04 curat;
  - stiva de producție completă: backup, restaurare, încărcare, actualizare, revenire în timp, golirea dinainte de lansare.

## Ce nu se poate verifica de aici
Rămân pe lista de lansare, cu proprietarul:
- **pe hardware real:** serverul, aparatele, casa de marcat fiscală;
- **conturile clubului:** domeniul, emailul, Wallet, AI-ul, copia de backup din UE;
- **la oameni:** revizuirea juridică și fiscală a textelor.
