# 6.10 Anti-abuz și eligibilitate

> **Sursa:** `MEGA_PROMPT.md` §6.10 (versiunea 1.0, 26.09.2026). Text preluat integral în Etapa 0, fără modificări de conținut.
> De acum, acest fișier este referința de lucru pentru această secțiune. Orice modificare ulterioară se notează aici, cu data și sursa („confirmat de proprietar la data X”); `MEGA_PROMPT.md` rămâne neschimbat, ca referință istorică.

- **Minimum de meciuri** (confirmat: cel puțin unul pe săptămână): pentru clasamentul final și recompense sunt necesare **12 meciuri oficiale pe sezon** (configurabil). Nimeni nu poate veni o singură dată, să-l bată pe cel mai bun și să apară între primii.
- Eligibilitate live pentru top (inclusiv Regele Junglei): `meciuri_oficiale ≥ min(12, săptămâni_complete_scurse_din_sezon)`. Cei sub prag apar marcați „sub minimul de meciuri” și sunt excluși din clasamentul final.
- **Randament descrescător**: în ultimele 7 zile, aceiași jucători exacți (aceiași 4 la dublu sau aceiași 2 la simplu): meciurile 1–2 contează 100%, al 3-lea 50%, al 4-lea și următoarele 25%.
- Maximum de meciuri oficiale pe zi per jucător (implicit 3).
- **Limita de diferență de nivel**: proprietarul nu a înțeles propunerea; explică-i simplu (Q5). Implicit DEZACTIVATĂ: orice meci contează, iar formula dă oricum foarte puține puncte când un favorit clar câștigă.
- **Decay (inactivitate)** pentru Diamant și Maestru: după 14 zile fără meci oficial, de la ziua 15: −5 LP/zi în Diamant, −10 LP/zi în Maestru; poate retrograda, dar nu sub Diamant IV. Notificare cu 3 zile înainte.
- **Detecție de anomalii** (AI + reguli statistice): rezultate alternante suspecte între aceleași grupuri, scoruri extreme repetate, conturi care joacă doar între ele. Semnalează în admin; nu modifică nimic automat.
- Minori excluși (R-006). Fără acord GDPR, nu intri în ligă (R-010).
