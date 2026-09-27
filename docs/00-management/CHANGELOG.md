# Jurnalul modificărilor (CHANGELOG)

Formatul urmează [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versiunile urmează versionarea semantică (§14). Fiecare etapă aprobată primește un tag git (`etapa-0`, `etapa-1a` …).

## [Nelansat]

### Etapa 5 — 27.09.2026 (aprobată 27.09.2026)
#### Adăugat
- `jungle.cards`: card de membru cu cod QR aleatoriu și revocabil (R-020, R-022), reemitere care invalidează cardurile vechi, blocare de către personal, scanare cu codul cardului (R-025), coada de carduri de tipărit și PDF-ul CR80 cu fontul inclus (R-021), cardul Diamant cu emblemă aleasă, o singură dată (R-024, Q1).
- Apple Wallet (la cererea proprietarului, 27.09.2026): `.pkpass` semnat, serviciul web PassKit, notificări de actualizare prin APNs; Google Wallet: link „Adaugă în Google Wallet” semnat, actualizări prin API; actualizare automată la orice schimbare a cardului (R-023); `manage.py wallet_check`; activare după certificatele clubului (Q24).
- `jungle.privacy`: acordul ligii doar la Chioșcul de Ligă și doar de la 18 ani, cu toate câmpurile R-011; retragere din cont; exportul complet al datelor; ștergerea contului ca „Jucător retras” (§12.2).
- Textul acordului ligii (RO/EN), ghidul pentru conturile Apple/Google, imagini de exemplu ale cardului.
- 47 de teste noi (355 în backend).
#### Reparat la revizuire
- Cheia serviciului Apple Wallet se compară în timp constant.
- Schimbarea numelui actualizează cardul din Wallet.
- Recomandările în așteptare ale unui cont șters se anulează.

### Etapa 4 — 27.09.2026 (aprobată 27.09.2026)
#### Modificat la aprobare (răspunsurile proprietarului)
- Q21: prețuri orientative în sistem de la prima pornire (`seed_initial`), marcate DE_STABILIT, cu nota „Preț orientativ”.
- Q35: un singur pachet de firmă, 20% reducere (`corporate.discount_percent`, confirmat); reducerea per firmă a fost scoasă.
- Q9: doar numerar la lansare; Q13: Start permis în semi-vârf (confirmat).
#### Adăugat
- `jungle.ledger`: registru cu dublă înregistrare în bani întregi, tabele doar-adăugare, tranzacții echilibrate verificate la commit, chei de idempotență, corecții prin înregistrări inverse; plăți în numerar cu rest și bon (simulator, Q23), din credit, cu voucher; împărțirea orei (R-061); datorii la anulare târzie, neprezentare și sesiuni jucate; credit la anularea gratuită (Q14); excepțiile de plată ale personalului doar cu motiv (Q10).
- `jungle.subscriptions`: configuratorul în 3 pași, prețul pachetului cu reduceri multiplicative rotunjit la leu (R-084), comandă și activare la plată, sesiuni consumate de lecții și clase, regula Start fără vârf (R-087, Q13), fără reportare (R-085), sesiuni de recuperare (Q14), înghețare 14 zile/an (R-086), intensități „La cerere” (Q12), conturi corporate cu raport lunar (R-088, Q35).
- `jungle.rewards`: vouchere (oră gratuită, sumă, procent), „Adu un prieten” (R-120, Q32), emitere manuală de către manager (R-121).
- `jungle.cafe`: meniu, comenzi plătite și numerotate pe zi, coada de la bar, numerele gata pentru lobby, anulare cu restituire (R-111, R-112, Q33).
- Date DEMO (DE_STABILIT) pentru abonamente și cafenea în `seed_initial --demo`.
- `scripts/test-all` impune 100% acoperire pe ramuri pentru modulele de bani; 104 teste noi (308 în backend).
#### Reparat la revizuire
- Contul unei firme nu încăpea în registru (câmp prea scurt).
- Un voucher folosit și apoi anulat la timp s-ar fi transformat în credit cheltuibil; acum redevine voucher.
- Două plăți simultane din același credit ar fi putut trece amândouă; acum se fac pe rând.

### Etapa 3 — 27.09.2026 (aprobată 27.09.2026)
#### Modificat la aprobare (răspunsurile proprietarului)
- Q3: ora de vârf 17:00–22:00 (15:00–17:00 devine semi-vârf, implicit); programul 08:00–23:00 confirmat.
- Q2, Q15, Q16 confirmate: durate 60–180 min, fereastra de 90 de zile, 2 ore de anulare gratuită după promovare. Q21 rămâne deschisă.
#### Adăugat
- `jungle.bookings`: rezervări de terenuri și ședințe private pe Reformer (grilă de 30 min, durate Q2, program Q3, tipul sesiunii schimbabil până la check-in Q29), rezervare la recepție pentru un client, anulări gratuite/cu plată/scutite (R-070, R-071), lista de așteptare cu promovare automată și email (R-074, Q16), clase de pilates cu capacitate ≤ aparate active și listă de așteptare (R-100 … R-102), cereri pentru sala de evenimente aprobate de manager (Q34).
- Garanții în PostgreSQL: excluderea suprapunerilor pe resursă, pe antrenor și pe sală (btree_gist), grila și duratele (CHECK); rezervările simultane se pun la rând (advisory lock), fără deadlock.
- `jungle.pricing`: tarife pe 30 de minute pe bandă orară, sezon, tip client și produs; ofertă proporțională, corectă și în zilele cu schimbarea orei; tarife publice; modificări auditate. Tarife DEMO marcate DE_STABILIT în `seed_initial --demo`.
- `jungle.attendance`: scanări (sosire, teren, clasă) legate automat de rezervare sau clasă; neprezentări după 15 min; blocare la a treia în 90 de zile, cu notificare pentru antrenorul/instructorul responsabil sau manager (R-072, R-073, Q15); deblocare cu motiv; comanda `process_no_shows`.
- API: `/bookings`, `/classes`, `/events`, `/pricing`, `/staff/bookings`, `/staff/classes`, `/staff/events`, `/staff/scans`, `/staff/restrictions`, `/staff/notices`, `/staff/pricing/rates`; coduri de eroare noi traduse RO/EN; emailul `spot_promoted`.
- 71 de teste noi (202 în backend), cu ID-ul regulii în nume.
#### Reparat la revizuire
- Calculele de timp pe ziua schimbării orei se fac acum în UTC.
- Două rezervări simultane pe același teren dădeau „deadlock” în loc de „loc ocupat”.
- Un antrenor putea fi rezervat la o lecție în timpul propriei clase de pilates.
- Rezervarea online cere emailul confirmat.

### Etapa 1B, revizia 3 „Noapte și alamă” — 27.09.2026 (aprobată 27.09.2026)
#### Modificat
- Identitatea B4 aleasă de proprietar: tokeni noi (noapte, os, alamă, pădure), contrast AAA pe fundalurile întunecate; fonturile Fraunces și Instrument Sans (auto-găzduite, reduse).
- Arena 3D după schița clubului: 4 terenuri 2 × 2, pasarela-lounge la 3 m între rânduri, lumină de seară; cardul de membru cu reflexii mai discrete.
- Textele RO/EN după planul real (pasarela dintre terenuri, cafeneaua cu scară, pilates și evenimente în clădirea de alături).
#### Adăugat
- Planul clubului (schemă după schiță) în secțiunea Locație.
- `docs/12-branding/05-identitate-provizorie-noapte-si-alama.md`; întrebarea Q46.

### Etapa 2 — 27.09.2026 (aprobată 27.09.2026)
#### Adăugat
- `packages/league-engine` (Python pur): MMR Weng-Lin Thurstone–Mosteller verificat față de `openskill`; nivelul 1.0–7.0; chestionar și plasare; ranguri Bronz IV → Maestru, LP, promovare/retrogradare/protecție, departajare, Regele Junglei; validatorul de scor și meciurile neterminate; anti-abuz (minimum de meciuri, limită zilnică, randament descrescător, decay); provocări; turnee; resetarea de sezon; evenimente înainte/după, aplicare idempotentă, recalculare deterministă.
- 173 de teste cu ID-ul regulii în nume, 100% acoperire pe ramuri, teste de proprietate (hypothesis); incluse în `scripts/test-all`.
- Simularea mare (`tools/simulate.py`: 500 de jucători, 50.000 de meciuri, 8 sezoane) cu rapoarte și grafice în `docs/03-liga/simulari/`.
- `docs/03-liga/ID-URI-REGULI.md` (LG-001 … LG-162), `NIVELURI.md`, `simulari/CALIBRARE.md`; sursa FIP pentru regula la 40–40 („Star Point”, din 2026).
- Întrebarea nouă Q45 (valorile implicite ale ligii).
#### Modificat la calibrare
- `LP_total_așteptat` calibrat prin simulare la `(Nivel − 1,3)/4,6 × 2000` (DE_CONFIRMAT, se recalibrează după Sezonul 0).
#### Reparat la revizuire
- Două promovări posibile dintr-un singur meci cu bonus mare de turneu: surplusul se plafonează la 99 LP.
- Bonusurile se pierdeau la un câștig plafonat la +60: acum se adaugă după plafonare.
- Simulatorul socotea ziua în UTC (motorul, corect, în ora României): acum folosesc aceeași regulă.

### Etapa 1B, revizia 2 „Premium Light” — 27.09.2026 (așteaptă aprobarea)
#### Modificat
- Identitatea vizuală provizorie „Premium Light” înlocuiește „Neon Jungle”: fundal deschis, bleumarin, smarald, accente metalice, fontul Inter (`docs/12-branding/04-identitate-provizorie-premium-light.md`); contrast AAA pentru text.
- Pagina de pre-lansare refăcută pe povestea clubului: deschidere cu vederea din lounge-ul de la 3 m, Arena (4 terenuri), Ecosistemul (rezervare → acces digital → ieșire), Facilități integrate, Liga și cardurile de statut (Argint, Aur, Platină, Diamant), Locație, Lista de așteptare.
- Scene 3D noi cu materiale fizice (PBR) și reflexii: arena văzută din lounge (privirea coboară la derulare, GSAP ScrollTrigger) și cardul de membru metalic; imagini statice proprii, cu text alternativ, când 3D-ul nu rulează.
- Lista de așteptare: doar nume, email și, opțional, nivelul de joc (minimizarea datelor); telefonul și interesele au fost eliminate.
#### Adăugat
- Pagini legale RO/EN: Termeni și condiții, Politica de confidențialitate, Politica de anulare și rambursare, Politica de cookies (redactate fără avocat, Q41).
- Gestionar de cookies propriu: statisticile pornesc doar după „Accept”; refuzul are aceeași greutate; alegerea se poate schimba din subsol.
- Subsol cu datele de identificare ale firmei (din configurare, `GET /api/v1/config/company`), linkurile legale și linkul ANPC SAL.
- Meniu pe mobil, legătură „Sari la conținut”, focus vizibil, etichete explicite pe butoane.
- Întrebarea nouă Q44 (randări sau fotografii reale ale spațiilor).
#### Reparat la revizuire
- Linkurile din texte nu erau subliniate (se distingeau doar prin culoare, WCAG 1.4.1).
- Linkul spre politica de rambursare din termeni ducea la o adresă greșită.
- Biblioteca 3D se descărca și pe dispozitivele fără placă video; acum placa video se verifică înainte (mobil: performanță 86 → 95).
- Textul din deschidere avea contrast slab peste randare; adăugat un voal deschis în spatele lui.

### Etapa 1B — 27.09.2026 (așteaptă aprobarea)
#### Adăugat
- `apps/web` (Next.js 16): pagina de pre-lansare RO/EN cu adrese traduse, scenă 3D în timp real (Three.js), carduri 3D, medalii 3D ale rangurilor, apariții la derulare, contoare, hartă stilizată; SEO (metadate, hreflang, sitemap, robots, date structurate, imagine Open Graph); antete de securitate (CSP).
- `packages/design-tokens`: identitatea provizorie „Neon Jungle” (Style Dictionary), cu test de contrast WCAG.
- Backend `waitlist`: dublă confirmare, email de bun venit, dezabonare cu ștergerea datelor, ștergerea înscrierilor neconfirmate, listă/statistici/export CSV pentru manager.
- Nota de informare GDPR pentru lista de așteptare (RO/EN), comanda `publish_legal_document` (refuză textele cu `DE_CONFIRMAT`).
- Teste cap-coadă Playwright + axe (`scripts/test-e2e`, inclus în `scripts/test-all`); Dockerfile pentru site.
#### Reparat la revizuire
- Performanța pe mobil (57 → 93): scena 3D doar cu accelerare grafică reală și după încărcare, 30 fps pe telefoane; fonturi reduse de la 207 KB la 58 KB; CSS inclus în pagină.
- `EMAIL_FILE_PATH` nu era citit din mediu.

### Etapa 1A — 27.09.2026 (aprobată 27.09.2026)
#### Adăugat
- `apps/backend`: Django 5.2 LTS + Django Ninja, API `/api/v1` cu schemă OpenAPI; erori cu coduri stabile.
- Conturi: înregistrare cu acorduri versionate (hash), verificarea emailului, resetarea parolei, schimbarea parolei, profil; conturi rapide pentru invitați (Q8); conturi de copii în spatele unui comutator (Q7).
- Personal: roluri pe acțiuni, globale sau pe locație; 2FA TOTP obligatorie cu coduri de recuperare și protecție la reutilizare; blocare temporară după încercări greșite; limită de înregistrări pe IP.
- Locații și resurse administrabile fără cod; dispozitive; date inițiale (`seed_initial`, `--demo`).
- Jurnal de audit, versiuni de configurare și acorduri: tabele doar-adăugare (trigger PostgreSQL).
- Feature flags și configurare versionată, cu lista valorilor `DE_CONFIRMAT`.
- Admin tehnic de urgență (doar Admin + 2FA, modificări auditate).
- `packages/i18n` (RO/EN, test de completitudine), `packages/api-client` (generat din OpenAPI).
- `scripts/test-all`, `scripts/setup`, `scripts/dev`, `scripts/generate-api-client`; Dockerfile, Docker Compose de dezvoltare, pre-commit, GitHub Actions.
- Întrebarea nouă Q43 (vârsta minimă pentru cont propriu).
#### Reparat la revizuire
- Link de resetare cu `uid` invalid → eroare 500; acum „link invalid”.
- Câmpul 2FA lipsea de pe pagina de login a adminului de urgență.

### Etapa 0 — 26.09.2026 (aprobată 26.09.2026, tag `etapa-0`)
#### Adăugat
- Structura monorepo din §4.4 (`apps/`, `packages/`, `services/`, `deploy/`, `scripts/`, `tests/`, `docs/`), cu README în fiecare folder.
- `MEGA_PROMPT.md` (neschimbat, referință istorică).
- Documentația împărțită pe secțiuni în `docs/` (text preluat integral, cu ID-urile regulilor păstrate).
- `CLAUDE.md` — memoria operațională a proiectului.
- ADR-0001 … ADR-0022 (decizii de stack și de arhitectură, stare „Propus”).
- Diagrame de arhitectură (Mermaid).
- `INTREBARI_DESCHISE.md` (Q1–Q42), `PROGRES.md`, `PLAN_DETALIAT.md`, `CALENDAR.md`.
- Criterii de achiziție hardware.
- `.gitignore`, `.editorconfig`, `.gitattributes`.
#### Modificat la aprobare
- Răspunsurile proprietarului înregistrate în `INTREBARI_DESCHISE.md` (stare nouă `PARȚIAL`).
- ADR-0001 … ADR-0022: stare „Acceptat”.
- Apple Wallet amânat (Q24); textele legale redactate fără avocat, cu mențiune obligatorie (Q41).
