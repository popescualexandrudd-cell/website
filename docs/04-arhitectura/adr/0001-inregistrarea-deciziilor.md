# ADR-0001: Înregistrăm deciziile tehnice ca ADR-uri

- **Stare:** Acceptat (26.09.2026, odată cu aprobarea Etapei 0 de către proprietar)
- **Data:** 2026-09-26
- **Legat de:** §1 (mentenanța pe termen lung), §4.3, §4.5

## Context
Proprietarul nu are programator. Sistemul este construit și întreținut în sesiuni succesive (de Claude Code sau, ulterior, de un programator angajat). Fără o evidență scrisă a deciziilor, fiecare sesiune ar putea redeschide sau contrazice decizii deja luate.

## Decizie
1. Fiecare decizie tehnică semnificativă se scrie ca fișier `docs/04-arhitectura/adr/NNNN-titlu-scurt.md`, cu secțiunile: Stare, Data, Legat de, Context, Decizie, Alternative analizate, Consecințe.
2. Stări posibile: `Propus` → `Acceptat` → (`Înlocuit de ADR-XXXX` sau `Retras`).
3. Un ADR acceptat nu se rescrie. O schimbare de decizie = un ADR nou care îl înlocuiește; cel vechi primește starea „Înlocuit de ADR-XXXX”.
4. Deciziile de business (prețuri, reguli, durate) NU sunt ADR-uri: ele sunt reguli `R-xxx` în `docs/02-reguli-business/` (sau reguli de ligă în `docs/03-liga/`), cu data și sursa confirmării.
5. Indexul tuturor ADR-urilor este în `docs/04-arhitectura/adr/README.md`, iar `CLAUDE.md` rezumă deciziile în vigoare.

## Alternative analizate
- Decizii notate doar în mesajele de commit sau în conversații: se pierd; respins.
- Un singur document mare de arhitectură: greu de urmărit ce s-a schimbat și când; respins.

## Consecințe
- Orice sesiune viitoare citește indexul ADR înainte de a schimba stack-ul sau structura.
- Costul este mic: un fișier scurt pe decizie.
