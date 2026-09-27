# Progresul proiectului

> Actualizat la fiecare sesiune de lucru. Prima secțiune spune mereu **unde suntem acum**.

## Unde suntem acum
- **Etapa curentă:** Etapa 1B (pagina de pre-lansare), **revizia 2 „Premium Light”**, livrată pe 27.09.2026, așteaptă aprobarea proprietarului. Raport: [verificare/etapa-1b/RAPORT.md](verificare/etapa-1b/RAPORT.md). În paralel a început Etapa 2 (motorul ligii), la cererea proprietarului („după acestea continuă cu următoarea etapă”).
- **Etapa 1A:** aprobată de proprietar pe 27.09.2026 (merge în `main`). Raport: [verificare/etapa-1a/RAPORT.md](verificare/etapa-1a/RAPORT.md).
- **Etapa 0:** aprobată de proprietar pe 26.09.2026 (tag `etapa-0`, branch `main`).
- **Următoarea etapă:** 2 (motorul ligii + simulări).
- **Întrebări încă deschise care contează curând:** Q26 (datele firmei: subsol și texte legale), Q39 (domeniu, marcă), Q24 (furnizor de email), Q23 (modelele de hardware), Q44 (randări sau fotografii ale spațiilor) — vezi [INTREBARI_DESCHISE.md](INTREBARI_DESCHISE.md).
- **Branch de lucru:** `claude/hopeful-euler-rguibn` (repository `popescualexandrudd-cell/website`).

## Starea etapelor

| Etapă | Conținut | Orientativ | Stare |
|---|---|---|---|
| 0 | Documentație, structură, ADR-uri, întrebări, plan | oct. 2026 | **Aprobată 26.09.2026** |
| 1A | Fundația backend | oct. 2026 | **Aprobată 27.09.2026** |
| 1B | Pagina de pre-lansare | oct.–nov. 2026 | Livrată (revizia 2 „Premium Light”), așteaptă aprobarea |
| 2 | Motorul ligii + simulări | nov. 2026 | Neîncepută |
| 3 | Rezervări, prețuri, anulări, prezențe | nov. 2026 | Neîncepută |
| 4 | Bani, abonamente, corporate, vouchere, cafenea | nov.–dec. 2026 | Neîncepută |
| 5 | Carduri, Wallet, GDPR | dec. 2026 | Neîncepută |
| 6 | Integrarea ligii | dec. 2026 | Neîncepută |
| 7 | Hardware Bridge + Chioșcul de Ligă | dec. 2026–ian. 2027 | Neîncepută |
| 8 | Chioșcul de Plăți + afișajul cafenelei | ian. 2027 | Neîncepută |
| 9 | Ecranele | ian. 2027 | Neîncepută |
| 10 | Panoul de admin complet | ian. 2027 | Neîncepută |
| 11 | Website-ul „simulator” | ian.–feb. 2027 | Neîncepută |
| 12 | AI + notificări | feb. 2027 | Neîncepută |
| 13 | SEO, marketing, branding, vânzări | în paralel, feb. 2027 | Neîncepută |
| 14 | Deploy, securitate, backup, hardware real | feb. 2027 | Neîncepută |
| 15 | Beta, încărcare, instruire | feb.–mar. 2027 | Neîncepută |
| 16 | Inaugurare și go-live | mar. 2027 | Neîncepută |

## Etapa 1B — cum verifici (click cu click)
1. Pe GitHub, branch-ul `claude/hopeful-euler-rguibn`, deschide `docs/00-management/verificare/etapa-1b/RAPORT.md`.
2. Deschide capturile de ecran din același folder: `ro-desktop-00-banner-cookies.png`, `ro-desktop-01-hero.png` și următoarele; `ro-mobil-…` pentru telefon, `en-…` pentru engleză.
3. Citește textele legale din `docs/07-securitate-gdpr-legal/texte/`: termeni, confidențialitate, rambursare, cookies, nota de informare.
4. Identitatea vizuală: `docs/12-branding/04-identitate-provizorie-premium-light.md`.

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
