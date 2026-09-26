# Progresul proiectului

> Actualizat la fiecare sesiune de lucru. Prima secțiune spune mereu **unde suntem acum**.

## Unde suntem acum
- **Etapa curentă:** Etapa 0 — livrată pe 26.09.2026, **așteaptă aprobarea proprietarului**.
- **Următoarea etapă:** 1A (fundația backend), apoi 1B (pagina de pre-lansare). Nu încep cod de aplicație până la aprobarea Etapei 0.
- **Întrebări urgente:** Q22, Q23, Q24, Q26, Q39, Q40, Q41 (vezi [INTREBARI_DESCHISE.md](INTREBARI_DESCHISE.md)).
- **Branch de lucru:** `claude/hopeful-euler-rguibn` (repository `popescualexandrudd-cell/website`).

## Starea etapelor

| Etapă | Conținut | Orientativ | Stare |
|---|---|---|---|
| 0 | Documentație, structură, ADR-uri, întrebări, plan | oct. 2026 | Livrată, așteaptă aprobarea |
| 1A | Fundația backend | oct. 2026 | Neîncepută |
| 1B | Pagina de pre-lansare | oct.–nov. 2026 | Neîncepută |
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
- [ ] **Aprobarea proprietarului** → apoi tag `etapa-0` (Q42).

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
- **26.09.2026** — Etapa 0 livrată: documentație, structură, ADR-uri, întrebări, plan. Așteaptă aprobarea.
