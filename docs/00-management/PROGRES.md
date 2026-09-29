# Progresul proiectului

> Actualizat la fiecare sesiune de lucru. Prima secțiune spune mereu **unde suntem acum**.

## Unde suntem acum
- **Etapa curentă:** Etapa 11 (website-ul complet, secțiune cu secțiune, fiecare aprobată separat). **Secțiunea 1 (antetul fix) + fundația site-ului complet:** livrată pe 29.09.2026, așteaptă aprobarea. Site-ul complet stă ascuns în spatele comutatorului `full_site` (Q57) până îl porniți. Raport: [verificare/etapa-11/RAPORT.md](verificare/etapa-11/RAPORT.md).
- **Etapa 10 (panoul de admin):** aprobată de proprietar pe 29.09.2026 (merge în `main`, tag local `etapa-10`). Q56 rămâne deschisă, cu varianta implicită (rapoartele doar admin + manager). Raport: [verificare/etapa-10/RAPORT.md](verificare/etapa-10/RAPORT.md).
- **Etapa 9 (ecranele de teren și lobby):** aprobată de proprietar pe 29.09.2026 (merge în `main`, tag local `etapa-9`). Q55 rezolvată (toți pe nume, insigna „Ligă”, echipele alese la Chioșcul Ligii). Raport: [verificare/etapa-9/RAPORT.md](verificare/etapa-9/RAPORT.md).
- **Etapa 8 (Chioșcul de Plăți + afișajul cafenelei):** aprobată de proprietar pe 29.09.2026 (merge în `main`, tag local `etapa-8`). Q53 și Q54 rămân deschise, cu variantele implicite. Raport: [verificare/etapa-8/RAPORT.md](verificare/etapa-8/RAPORT.md).
- **Etapa 7 (Hardware Bridge + Chioșcul Ligii):** aprobată de proprietar pe 28.09.2026 (merge în `main`, tag local `etapa-7`), cu Q51 și Q52 confirmate. Raport: [verificare/etapa-7/RAPORT.md](verificare/etapa-7/RAPORT.md).
- **Etapa 6 (integrarea ligii):** aprobată de proprietar pe 28.09.2026 (merge în `main`), cu Q6 schimbat (alegere între 15% la abonament și 4 × 20% la rezervări), Q49 (teren, oră, rezultate și istoric publice; R-012 și acordul ligii v2) și Q11, Q27, Q28, Q47, Q48, Q50 confirmate. Raport: [verificare/etapa-6/RAPORT.md](verificare/etapa-6/RAPORT.md).
- **Etapa 5 (carduri, Apple Wallet și Google Wallet, GDPR):** aprobată de proprietar pe 27.09.2026 (merge în `main`). Raport: [verificare/etapa-5/RAPORT.md](verificare/etapa-5/RAPORT.md).
- **Etapa 4 (bani, abonamente, corporate, vouchere, cafenea):** aprobată de proprietar pe 27.09.2026 (merge în `main`), împreună cu răspunsurile la Q9 (doar numerar), Q13, Q21 (prețuri orientative), Q35 (un pachet de firmă, 20%). Raport: [verificare/etapa-4/RAPORT.md](verificare/etapa-4/RAPORT.md).
- **Etapa 3 (rezervări, prețuri, anulări, prezențe):** aprobată de proprietar pe 27.09.2026 (merge în `main`), împreună cu răspunsurile la Q2, Q3, Q15, Q16. Raport: [verificare/etapa-3/RAPORT.md](verificare/etapa-3/RAPORT.md).
- **Etapa 2 (motorul ligii + simulări):** aprobată de proprietar pe 27.09.2026 (merge în `main`). Raport: [verificare/etapa-2/RAPORT.md](verificare/etapa-2/RAPORT.md).
- **Etapa 1B (pagina de pre-lansare, revizia 3 „Noapte și alamă”):** aprobată de proprietar pe 27.09.2026 (merge în `main`). Raport: [verificare/etapa-1b/RAPORT.md](verificare/etapa-1b/RAPORT.md).
- **Etapa 1A:** aprobată de proprietar pe 27.09.2026 (merge în `main`). Raport: [verificare/etapa-1a/RAPORT.md](verificare/etapa-1a/RAPORT.md).
- **Etapa 0:** aprobată de proprietar pe 26.09.2026 (tag `etapa-0`, branch `main`).
- **Următoarea etapă:** 12 (AI + notificări), după aprobarea tuturor secțiunilor Etapei 11.
- **Întrebări încă deschise care contează curând:** Q57 (când apare site-ul complet), Q26 (datele firmei: subsol și texte legale), Q39 (domeniu, marcă), Q24 (furnizor de email), Q23 (modelele de hardware), Q44 (randări sau fotografii ale spațiilor), Q45 (valorile implicite ale ligii), Q46 (un text neclar din schiță); Q21 (prețurile: tarifele rămân DEMO, `DE_STABILIT`); Q24 (conturile Apple Developer și Google Wallet ale firmei — ghid în `docs/08-deploy-si-mentenanta/02-ghid-apple-google-wallet.md`); Q1 (emblemele cardului Diamant); Q30 (rezultatele publice ale meciurilor); pentru Etapa 8: Q53 (numerar, rest, credit, fiscal), Q54 (modul personal), Q10 (plăți), Q33 (cafenea), contabilul (fiscalul) — vezi [INTREBARI_DESCHISE.md](INTREBARI_DESCHISE.md).
- **Branch de lucru:** `claude/hopeful-euler-rguibn` (repository `popescualexandrudd-cell/website`).

## Starea etapelor

| Etapă | Conținut | Orientativ | Stare |
|---|---|---|---|
| 0 | Documentație, structură, ADR-uri, întrebări, plan | oct. 2026 | **Aprobată 26.09.2026** |
| 1A | Fundația backend | oct. 2026 | **Aprobată 27.09.2026** |
| 1B | Pagina de pre-lansare | oct.–nov. 2026 | **Aprobată 27.09.2026** |
| 2 | Motorul ligii + simulări | nov. 2026 | **Aprobată 27.09.2026** |
| 3 | Rezervări, prețuri, anulări, prezențe | nov. 2026 | **Aprobată 27.09.2026** |
| 4 | Bani, abonamente, corporate, vouchere, cafenea | nov.–dec. 2026 | **Aprobată 27.09.2026** |
| 5 | Carduri, Wallet, GDPR | dec. 2026 | **Aprobată 27.09.2026** |
| 6 | Integrarea ligii | dec. 2026 | **Aprobată 28.09.2026** |
| 7 | Hardware Bridge + Chioșcul de Ligă | dec. 2026–ian. 2027 | **Aprobată 28.09.2026** |
| 8 | Chioșcul de Plăți + afișajul cafenelei | ian. 2027 | **Aprobată 29.09.2026** |
| 9 | Ecranele | ian. 2027 | **Aprobată 29.09.2026** |
| 10 | Panoul de admin complet | ian. 2027 | **Aprobată 29.09.2026** |
| 11 | Website-ul „simulator” | ian.–feb. 2027 | În lucru: secțiunea 1 livrată 29.09.2026, așteaptă aprobarea |
| 12 | AI + notificări | feb. 2027 | Neîncepută |
| 13 | SEO, marketing, branding, vânzări | în paralel, feb. 2027 | Neîncepută |
| 14 | Deploy, securitate, backup, hardware real | feb. 2027 | Neîncepută |
| 15 | Beta, încărcare, instruire | feb.–mar. 2027 | Neîncepută |
| 16 | Inaugurare și go-live | mar. 2027 | Neîncepută |

## Etapa 6 — cum verifici (click cu click)
1. Deschide [verificare/etapa-6/RAPORT.md](verificare/etapa-6/RAPORT.md) (ce s-a construit, rezultate, ce e de confirmat).
2. Deschide [verificare/etapa-6/EXEMPLU.md](verificare/etapa-6/EXEMPLU.md): un sezon demo produs de codul real (clasament, un meci pas cu pas la chioșc, un turneu, recompense).
3. Citește Q47–Q50 din [INTREBARI_DESCHISE.md](INTREBARI_DESCHISE.md) și răspunde unde nu ești de acord.

## Etapa 5 — cum verifici (click cu click)
1. Pe GitHub, branch-ul `claude/hopeful-euler-rguibn`, deschide `docs/00-management/verificare/etapa-5/RAPORT.md`.
2. Deschide `card-membru.png` și `card-diamant.png` din același folder: așa arată cardul tipărit.
3. Citește acordul ligii: `docs/07-securitate-gdpr-legal/texte/formular-gdpr-liga.ro.md`.
4. Pentru Wallet: `docs/08-deploy-si-mentenanta/02-ghid-apple-google-wallet.md` (începe cu numărul D-U-N-S).

## Etapa 4 — cum verifici (click cu click)
1. Pe GitHub, branch-ul `claude/hopeful-euler-rguibn`, deschide `docs/00-management/verificare/etapa-4/RAPORT.md`: ce s-a construit, rezultatele, ce s-a reparat, ce e de confirmat.
2. Răspunde, dacă poți, la Q21 (prețuri), Q35 (corporate) și Q9 (plata online) în `docs/00-management/INTREBARI_DESCHISE.md`.
3. Opțional, local: `scripts/setup`, `scripts/dev`, apoi `http://localhost:8000/api/v1/docs` (secțiunile „subscriptions”, „account”, „cafe”).

## Etapa 3 — cum verifici (click cu click)
1. Pe GitHub, branch-ul `claude/hopeful-euler-rguibn`, deschide `docs/00-management/verificare/etapa-3/RAPORT.md`: ce s-a construit, rezultatele, ce s-a reparat la revizuire, ce e de confirmat.
2. Răspunde, dacă poți, la Q2, Q3, Q15, Q16 și Q21 în `docs/00-management/INTREBARI_DESCHISE.md`.
3. Opțional, local: `scripts/setup`, `scripts/dev`, apoi `http://localhost:8000/api/v1/docs` (secțiunile „bookings”, „classes”, „events”, „pricing”).

## Etapa 2 — cum verifici (click cu click)
1. Pe GitHub, branch-ul `claude/hopeful-euler-rguibn`, deschide `docs/00-management/verificare/etapa-2/RAPORT.md`.
2. Deschide `docs/03-liga/simulari/CALIBRARE.md`: ce a arătat simularea și ce am calibrat (GitHub desenează graficele din rapoarte).
3. Deschide `docs/03-liga/NIVELURI.md`: ce înseamnă fiecare nivel 1.0–7.0.
4. Opțional: `docs/03-liga/ID-URI-REGULI.md` — fiecare regulă a ligii, cu ID-ul ei și unde e implementată.

## Etapa 1B — cum verifici (click cu click)
1. Pe GitHub, branch-ul `claude/hopeful-euler-rguibn`, deschide `docs/00-management/verificare/etapa-1b/RAPORT.md`.
2. Deschide capturile de ecran din același folder: `ro-desktop-00-banner-cookies.png`, `ro-desktop-01-hero.png` și următoarele; `ro-mobil-…` pentru telefon, `en-…` pentru engleză.
3. Citește textele legale din `docs/07-securitate-gdpr-legal/texte/`: termeni, confidențialitate, rambursare, cookies, nota de informare.
4. Identitatea vizuală: `docs/12-branding/05-identitate-provizorie-noapte-si-alama.md`.

## Etapa 1A — cum verifici (click cu click)
1. Pe GitHub, branch-ul `claude/hopeful-euler-rguibn`, deschide `docs/00-management/verificare/etapa-1a/RAPORT.md`: ce s-a construit, rezultatele testelor, ce s-a reparat la revizuire.
2. Deschide capturile de ecran din același folder (click pe fiecare `.png`).
3. Opțional, rulare locală (necesită Docker Desktop): `docker compose -f deploy/compose/dev/compose.yaml up -d db redis`, apoi `scripts/setup`, apoi `scripts/dev`; adminul de urgență e la `http://localhost:8000/django-admin/`.

## Etapa 0 — ce s-a făcut
- [x] Citirea integrală a `MEGA_PROMPT.md`; a doua trecere: verificarea automată, rând cu rând, că tot textul se regăsește în `docs/`, plus recitirea secțiunilor folosite la ADR-uri, plan și întrebări.
- [x] Structura de foldere din §4.4, cu README în fiecare folder din `apps/`, `packages/`, `services/`, `deploy/`, `scripts/`, `tests/` și `docs/`.
- [x] `MEGA_PROMPT.md` copiat neschimbat în rădăcină (amprenta SHA-256 verificată identică cu fișierul primit).
- [x] Documentul împărțit în `docs/` pe secțiuni, text preluat integral; verificare automată: fiecare rând din `MEGA_PROMPT.md` se regăsește în `docs/` (vezi „Verificări”).
- [x] `CLAUDE.md` (memoria operațională a proiectului).
- [x] 22 de ADR-uri propuse (`docs/04-arhitectura/adr/`), inclusiv alegerea Django Ninja față de DRF.
- [x] Diagrame (sistem, fluxul scorului, plata împărțită), verificate prin randare.
- [x] `INTREBARI_DESCHISE.md`: Q1–Q38 cu varianta implicită, prioritate și etapa blocată, plus Q39–Q42 noi.
- [x] `PLAN_DETALIAT.md`, `CALENDAR.md`, `CHANGELOG.md`.
- [x] Criterii de achiziție hardware (`docs/09-hardware/02-criterii-achizitie-hardware.md`).
- [x] `.gitignore`, `.editorconfig`, `.gitattributes`.
- [x] **Aprobată de proprietar pe 26.09.2026** → tag `etapa-0`, merge în `main` (Q42).

## Etapa 0 — cum verifici (click cu click)
1. Deschide pe GitHub repository-ul `popescualexandrudd-cell/website` și alege branch-ul `claude/hopeful-euler-rguibn` (butonul cu numele branch-ului, sus în stânga listei de fișiere).
2. Deschide `README.md` (se afișează automat sub lista de fișiere): e prezentarea proiectului.
3. Intră în `docs/00-management/INTREBARI_DESCHISE.md`: tabelul de sus arată toate întrebările; cele marcate `URGENTĂ` sunt primele de răspuns.
4. Intră în `docs/04-arhitectura/02-diagrame.md`: GitHub desenează diagramele automat.
5. Intră în `docs/02-reguli-business/` și `docs/03-liga/`: regulile tale, împărțite pe teme, cu aceleași ID-uri (R-001 …).
6. Opțional: `docs/04-arhitectura/adr/README.md` — lista deciziilor tehnice, pe scurt.

## Verificări făcute în Etapa 0
- Amprenta `MEGA_PROMPT.md` identică cu fișierul primit.
- Acoperirea documentației: niciun rând din `MEGA_PROMPT.md` lipsă din `docs/`.
- Toate linkurile relative din fișierele Markdown duc la fișiere existente.
- Diagramele Mermaid se randează fără erori.

## Jurnal
- **26.09.2026** — Etapa 0 livrată: documentație, structură, ADR-uri, întrebări, plan.
- **26.09.2026** — Etapa 0 aprobată. Răspunsuri: Q7, Q8, Q20, Q36, Q37, Q40, Q41, Q42 rezolvate; Q22, Q23, Q24 parțial (Apple Wallet amânat); Q26, Q39 încă deschise. ADR-0001 … ADR-0022 acceptate. Început Etapa 1A.
- **27.09.2026** — Etapa 1A livrată: backend Django + API, conturi, roluri, 2FA, locații, audit, configurare, traduceri, client API; 109 teste, acoperire 97%. Tag-ul `etapa-0` nu a putut fi publicat din mediul de lucru (GitHub a refuzat push-ul de tag-uri, 403); există local și trebuie creat din GitHub → Releases.
- **27.09.2026** — Etapa 1A aprobată; Q43 = 14 ani. Cerință nouă a proprietarului pentru 1B: design și branding moderne, estetice, culori atractive, efecte 3D. Început Etapa 1B.
- **27.09.2026** — Etapa 1B livrată: pagina de pre-lansare RO/EN cu identitatea „Neon Jungle”, scenă 3D, listă de așteptare cu dublă confirmare, nota de informare redactată (Q41). Lighthouse mobil 93/100/100/100, desktop 100/100/100/100; 128 teste backend, 16 teste cap-coadă. Tag-ul `etapa-1a` există doar local (push de tag-uri refuzat).
- **27.09.2026** — Cerință nouă a proprietarului: estetică ultra-premium, luminoasă, randări 3D realiste, conformitate (contrast, cookies, date firmă, pagini legale, minimizarea datelor). Etapa 1B refăcută ca „Premium Light”. Lista de așteptare cere doar nume, email și, opțional, nivel. Adăugate paginile legale RO/EN, gestionarul de cookies și subsolul cu datele firmei și ANPC SAL. Lighthouse mobil 95/100/100/100, desktop 100/100/100/100; 131 teste backend, 26 teste cap-coadă. Întrebare nouă: Q44.
- **27.09.2026** — Etapa 2 livrată: `packages/league-engine` (MMR Weng-Lin verificat față de openskill, nivel, plasare, ranguri, LP, validatorul de scor, meciuri neterminate, anti-abuz, decay, provocări, sezoane, recalculare deterministă); 173 de teste, 100% acoperire pe ramuri; simularea mare (500 de jucători, 50.000 de meciuri): corelație rang–nivel real 0,96–0,98; „LP așteptat” calibrat (DE_CONFIRMAT); regula la 40–40 verificată la FIP (Star Point). Întrebare nouă: Q45.
- **27.09.2026** — Proprietarul a ales identitatea B4 „Noapte și alamă” de pe pânza de design și a trimis schița clubului. Etapa 1B, revizia 3: temă întunecată (bleumarin, alamă, os), fonturi Fraunces + Instrument Sans, arena 3D refăcută după schiță (4 terenuri 2 × 2, pasarela-lounge la 3 m între rânduri, seara), planul clubului pe site. Toate testele trec; Lighthouse mobil 94/100/100/100, desktop 100/100/100/100. Întrebare nouă: Q46.
- **27.09.2026** — Etapele 1B și 2 aprobate de proprietar (merge în `main`; tag-urile `etapa-1b` și `etapa-2` doar local, push-ul de tag-uri e refuzat). Q46: 4 aparate Reformer momentan, pasarela la 3 m. Început Etapa 3.
- **28.09.2026** — Etapa 6 livrată: liga legată de club (intrare, sezoane, fluxul scorului doar la Chioșcul de Ligă cu validare prin plată, provocări, decay, închiderea sezonului cu recompense, Hall of Fame, insigne, Meciul zilei, turnee în 6 formate); 490 de teste backend (135 noi), `jungle/league` cu 100% acoperire pe ramuri; exemplu de sezon demo. Întrebări noi: Q47–Q50.
- **28.09.2026** — Etapa 6 aprobată. Q6: top 3 pe rang aleg din cont 15% la abonament sau 4 × 20% la rezervări; Regii Junglei: 2 ore, o cutie de mingi, card special. Q49: teren, oră, rezultate și istoricul jucătorilor devin publice (R-012 și acordul ligii v2). Q11, Q27, Q28, Q47, Q48, Q50 confirmate. Început Etapa 7.
- **28.09.2026** — Etapa 7 aprobată (Q51, Q52 confirmate). Început Etapa 8. La cererea proprietarului, partea de backend a Etapei 8 și setarea `"ultracode": true` au intrat în `main` prin PR #1; ramura `claude/amazing-turing-kqq4p7` (skill-uri de design, MCP 21st.dev, framer-motion) n-a putut fi unită din mediul de lucru (blocată ca „cod terț”), rămâne pe GitHub pentru decizia proprietarului.
- **29.09.2026** — Etapa 8 livrată: Chioșcul de Plăți (numerar cu rest, bon fiscal, credit, vouchere, abonamente, împărțirea orei, cafenea, mod personal cu PIN), afișajul cafenelei, `packages/kiosk-kit`; teste cap-coadă cu două Hardware Bridge reale. Întrebări noi: Q53, Q54.
- **29.09.2026** — Etapa 8 aprobată (merge în `main`, tag local `etapa-8`); Q53 și Q54 rămân deschise, cu variantele implicite. Început Etapa 9.
- **29.09.2026** — CI: toate cele 6 rulări picate (27–29.09) analizate; 5 veneau din push-uri făcute înainte ca verificările să fie verzi, una dintr-o problemă reală în Hardware Bridge (reparată). Hook-ul `.githooks/pre-push` refuză de acum orice push fără `scripts/test-all` verde (regula 9 din `CLAUDE.md`).
- **29.09.2026** — Etapa 9 livrată: ecranele de teren și de lobby (§8.5), live prin Channels + Redis, `apps/court-screens`, `screens_demo`. Întrebare nouă: Q55.
- **29.09.2026** — Etapa 9 aprobată de proprietar (merge în `main`, tag local `etapa-9`); răspunsul la Q55 urmează.
- **29.09.2026** — Q55 aplicată (toți jucătorii pe nume, insigna „Ligă”, opoziția GDPR, echipele alese la Chioșcul Ligii); în `main`.
- **29.09.2026** — Etapa 10 livrată: panoul de administrare (`apps/admin`, §8.6) cu intrare 2FA obligatorie, meniu după permisiuni și locație, tablou de bord live, utilizatori, calendar cu mutare prin tragere, resurse, prețuri, abonamente, firme, clase, prezențe, ligă (fără câmp de scor), plăți și registru, numerar și rapoarte Z, cafenea, evenimente, rapoarte și exporturi CSV, personal și roluri, dispozitive, setări și feature flags, jurnal de audit, starea sistemului; modulele Etapelor 11–12 marcate. `jungle/panel` (100% acoperire), `manage.py panel_demo`, teste cap-coadă cu 2FA. Întrebare nouă: Q56.
- **29.09.2026** — Etapa 10 aprobată de proprietar (merge în `main`, tag local `etapa-10`); Q56 rămâne deschisă, cu varianta implicită. Început Etapa 11.
- **29.09.2026** — CI roșu pe `main` (3aa5a62, testul cap-coadă al Chioșcului Ligii): o scanare simulată pierdută. Cauza, măsurată: după fiecare ieșire, ecranul de repaus pornea gol și, când soseau clasamentele, pagina creștea cu 90 px chiar în clipa clicului pe „Scan”; Playwright verifică ținta doar la apăsare, iar eliberarea cădea în altă parte. Reparat: chioșcul păstrează clasamentele între sesiuni (fără salt, fără ecran gol); ecranul de repaus nu mai cere clasamentul în fiecare secundă (acum la 30 s, cum era prevăzut, iar rotirea Dublu/Simplu/Perechi funcționează); ceasul de inactivitate nu mai redesenează chioșcul în repaus; Chioșcul de Plăți păstrează la fel oferta de abonamente; ecranele de repaus spun când încă se încarcă, iar testele așteaptă ecranul gata înainte să apese și trimit scanarea simulată cu Enter; la un test picat, jurnalul CI arată ce a făcut pagina (mesajele bridge-ului, cererile, erorile) și ce afișa.
- **29.09.2026** — Etapa 11, secțiunea 1 livrată: fundația site-ului complet (comutatorul `full_site`, Q57, cu reîmprospătarea imediată a site-ului la schimbare; adresele localizate ale paginilor din §9.3, marcate „În construcție” și `noindex`) și antetul fix (meniul, limba, contul, „Rezervă”; meniul strâns sub 1280 px). Fișier nou `.dockerignore` (nimic construit local și niciun `.env` în imagini). Întrebare nouă: Q57.
