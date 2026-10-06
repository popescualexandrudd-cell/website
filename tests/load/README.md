# Teste de încărcare (k6)

> **Stare:** construit în Etapa 15 (06.10.2026). Seara cea mai aglomerată a clubului (§13.3): 500 de vizitatori pe site, plus ecranele și chioșcurile care își reîmprospătează datele.

## Ce face `club.js`
- **Vizitatorii** (500 implicit, urcați în 30 de secunde, ținuți 2 minute): o pagină a site-ului complet, apoi API-ul pe care îl cere ea (clasamentul ligii, terenurile libere azi, uneori clasele și calendarul), apoi 10–20 secunde de citit, ca un om.
- **Ecranele** (12): rezultatele ligii și terenurile, la fiecare 10 secunde (cele reale o fac la „changed” și o dată pe minut).
- **Pragurile** (testul pică peste ele): sub 1% cereri eșuate, 95% din răspunsurile API sub 800 ms, 95% din pagini sub 1,5 s.

## Cum se rulează
- **Automat:** `scripts/test-deploy` (CI, jobul `deploy`) îl rulează pe stiva de producție pornită local, cu site-ul complet pornit și un sezon de ligă deschis: 50 de vizitatori, 30 de secunde. Raportul etapei: `LOAD_VISITORS=500 LOAD_HOLD=2m scripts/test-deploy`.
- **Pe serverul real, înainte de lansare:** `DOMAIN=<domeniu> RESOLVE=<IP-ul serverului> k6 run tests/load/club.js`, cu clubul închis.

Rezultatele: `docs/00-management/verificare/etapa-15/RAPORT.md`.

## Specificații

- [13. TESTARE ȘI CALITATE (Definition of Done pentru orice livrare)](../../docs/00-management/DEFINITION_OF_DONE.md)

## Decizii tehnice

[ADR-0021](../../docs/04-arhitectura/adr/0021-calitate-teste-ci.md)
