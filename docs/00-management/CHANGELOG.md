# Jurnalul modificărilor (CHANGELOG)

Formatul urmează [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versiunile urmează versionarea semantică (§14). Fiecare etapă aprobată primește un tag git (`etapa-0`, `etapa-1a` …).

## [Nelansat]

### Reparat — 29.09.2026 (CI pe `main`)
- Hardware Bridge: o scanare sau o bancnotă se trimite acum tuturor paginilor deodată, iar o pagină care nu o preia în 2 secunde (de exemplu una care tocmai se închide) e deconectată și se reconectează singură. Înainte, o pagină pe cale să se închidă putea întârzia scanarea pentru pagina vie până la 10 secunde (testul cap-coadă al abonamentului a picat o dată în CI).
- Hardware Bridge: o încasare terminată (sau oprită de un defect) se consideră încheiată înainte ca pagina să afle, deci următoarea comandă a paginii nu mai primește „busy”.
- CI: la un test cap-coadă picat se păstrează 7 zile urmele Playwright (capturi, trace), iar scriptul afișează ultimele 200 de rânduri din jurnalul serverului.

### Etapa 8 — 29.09.2026 (aprobată 29.09.2026; Q53 și Q54 noi, deschise)
#### Adăugat
- `jungle.checkout` (§8.3, 100% acoperire pe ramuri): plata cu numerar la Chioșcul de Plăți: coș (rezervări întregi sau o parte din oră, clase, abonamente, taxe de turneu, cafenea), întrebarea „dă rest?” înainte de bani, „doar suma exactă” sau restul ca credit cu acordul clientului, notele semnate de bridge trimise imediat, restul (parțial dacă aparatul nu poate, diferența devine credit), registrul (câte o plată pe articol, în casa chioșcului), bonul fiscal (R-066) și închiderea; anularea cu banii înapoi; reconcilierea după cădere de curent și a banilor sosiți târziu sau necunoscuți; plata din credit (R-067) și cu voucher (R-121); abonament la chioșc (configuratorul R-081) și înghețare (R-086); împărțirea orei (R-060, R-061); datoriile primele; check-in (R-030); alertele aparatului către recepție.
- Modul personal al chioșcului (Q54): PIN de 6 cifre setat din cont cu 2FA, blocare după greșeli; alimentare rest, golire casetă, numărare comparată cu registrul (diferența la manager, R-064), raportul Z cu totalurile zilei.
- API-ul afișajului cafenelei (`/api/v1/device/cafe`, §8.7) și `POST /kiosk/payments/events` cu confirmarea semnată `journal.ack` pentru bridge.
- Hardware Bridge: escrow (bancnota se poate înapoia), „doar suma exactă”, rest parțial raportat exact, bon fiscal o singură dată, raport Z, alimentare/golire/numărare, alerte „rest scăzut” și „casetă plină”.
- `packages/kiosk-kit`: ce au în comun ecranele aparatelor (legătura cu bridge-ul, `useDevice`, `useIdle`, erori API, texte RO/EN, lei, ora clubului, tastaturi, stilul și fonturile); Chioșcul Ligii mutat pe el.
- `apps/kiosk-payments` (React + Vite): toate fluxurile din §8.3, RO/EN, ieșire după 60 s (niciodată cu bani în aparat), reconcilierea la pornire; `apps/cafe-display`: coada live pe trei coloane, semnal sonor.
- `manage.py payments_demo` (DEMO); testele cap-coadă cu două Hardware Bridge reale (chioșcul și afișajul).
- Q53 și Q54 (variante implicite DE_CONFIRMAT).
#### Reparat la revizuire
- Descrierile rezervărilor și ale claselor (pe bon, în registru, la chioșc) erau în ora UTC; acum sunt în ora clubului (ADR-0010).
- 10 scheme OpenAPI cu același nume se suprascriau în clientul generat (inclusiv din etapele anterioare); numele sunt acum unice și un test le verifică.
- Mesajul de blocare a PIN-ului arăta un minut în plus.
- Abonamentul comandat la chioșc cerea email confirmat, deși clientul e identificat cu cardul clubului (Q53).
- O plată oprită cu bani în aparat nu mai poate fi închisă de pe ecran fără a da banii înapoi.

### Etapa 7 — 28.09.2026 (aprobată 28.09.2026; Q51 și Q52 confirmate)
#### Adăugat
- Autentificarea aparatelor (ADR-0012): înrolare din API cu token afișat o dată (se păstrează doar amprenta SHA-256), certificat client (mTLS) obligatoriu în producție, cheia publică a Hardware Bridge; refuzurile în jurnal, limitate pe adresă; `GET /device/whoami`.
- API-ul Chioșcului Ligii (`/api/v1/kiosk/league/*`, doar aparate autentificate): ecranul de repaus, clasamente cu căutare, sesiunea jucătorului (60 s pe server, legată de aparat, `POST /logout`), acordul GDPR, scorul, confirmări, provocări, meciuri de turneu și validarea directorului, check-in (R-030). Cu bridge înrolat, scanările trebuie semnate (nonce, fereastră de 2 minute).
- `services/hardware-bridge` (ADR-0013): serviciu asyncio pe 127.0.0.1, doar pentru originea chioșcului; interfețele aparatelor cu simulatoare complete și defecte; cheie Ed25519, scanări și evenimente de numerar semnate, comenzi de numerar semnate de server, executate o singură dată; jurnal de numerar SQLite doar-adăugare (WAL, `synchronous=FULL`), recuperare după cădere de curent; 100% acoperire pe ramuri.
- `apps/kiosk-league` (React + Vite): ecranul de repaus, sesiunea cu ieșire după 30 s, toate acțiunile din §8.2, RO/EN, tastatură pe ecran, mesaje din codurile de eroare; teste unitare și cap-coadă cu backendul și bridge-ul reale (axe).
- `deploy/kiosk-os`: instalarea pe Debian (bridge ca serviciu, Chromium în `cage` cu politică restrictivă, pagină locală „temporar indisponibil”, watchdog, blocarea sistemului, actualizări de securitate), verificată fără instalare de `scripts/test-all`; procedura de instalare și înrolare, varianta Windows (`docs/09-hardware/`).
- `manage.py kiosk_demo` (DEMO, refuzat în producție); `KIOSK_ALLOW_LOOPBACK` doar pentru dezvoltare.
- LG-099 (Q51, confirmat): un meci contează doar pentru jucătorii deja în ligă când s-a jucat.
#### Reparat la revizuire
- Un jucător intrat în ligă imediat după meci bloca scorul abia la ultima confirmare (acum: refuz imediat, cu mesaj).
- Codul motorului `league.score_tournament_unfinished` lipsea din lista de erori (test nou pentru toate codurile motorului).
- În producție, serverul refuză să pornească fără Redis (sesiunile chioșcului și anti-replay-ul trebuie să fie comune tuturor proceselor).
- Construirea versiunii publicate a chioșcului e refuzată dacă un token de aparat e setat.

### Etapa 6 — 28.09.2026 (aprobată 28.09.2026)
#### Modificat la aprobare (răspunsurile proprietarului)
- Q6: top 3 din fiecare rang aleg din cont între 15% la abonament și 4 vouchere de 20% la rezervări (`POST /league/me/rewards/{id}/choose`); Regii Junglei: 2 ore gratuite, o cutie de mingi, card special.
- Q49: R-012 extins: rezultatele meciurilor de ligă (`GET /league/results`), pagina publică a jucătorului cu istoricul (`GET /league/players/{id}`), terenul și ora la meciurile de turneu și la Meciul zilei; jucătorii retrași apar ca „Jucător retras”; acordul ligii versiunea 2 (RO/EN).
- Q11, Q27, Q28, Q47, Q48, Q50 confirmate.
#### Adăugat
- `jungle.league`: evenimente de ligă doar-adăugare, starea în cache și recalculare de la zero identică (§6.16), clasamente cu doar câmpurile R-012, intrarea în ligă (chestionar Q47, validarea antrenorului, acordul de la chioșc, 18+) și ieșirea (retragerea acordului, ștergerea contului), sezoane cu valori fixate la pornire (ADR-0022) și pornire din sezonul anterior (LG-130).
- Fluxul scorului (§6.9): doar la Chioșcul de Ligă activ, al clubului, din rețeaua clubului (invariantul 1, refuzurile în jurnal); fereastra de 30 de minute; confirmare de toți; dispută; validare doar cu rezervarea plătită integral (Q11, 24 h), cu validare automată la plata ulterioară; expirare; rezolvarea managerului cu motiv (aplică, redeschide, anulează + recalculare); jurnal doar-adăugare al fiecărui pas; o singură aplicare la confirmări simultane (LG-162).
- Provocări (§6.11, la chioșc), decay zilnic și avertizări (LG-106, LG-107), închiderea sezonului cu recompense ca vouchere (Q6), Regii Junglei și cardul special, Hall of Fame, insigne, cardul Diamant automat (R-024), Meciul zilei (§6.15).
- Turnee (§6.14): eliminatoriu, grupe + eliminatoriu, fiecare cu fiecare, Americano, Mexicano, King of the Court; tragere după rang sau la sorți cu sămânță; taxa de participare în registru; scorul la chioșc (Q28); LP × 1,5 și bonus pe fază.
- Motor: meciurile de turneu nu au limită zilnică și nici randament descrescător (Q49, DE_CONFIRMAT); simularea neschimbată.
- `manage.py expire_league_matches` (la 5 minute), `manage.py league_daily` (zilnic); emailuri RO/EN pentru provocări, decay și recompense.
- `scripts/test-all` impune 100% acoperire pe ramuri și pentru `jungle/league`; 135 de teste noi (490 în backend).
#### Reparat la revizuire
- Managerul nu mai poate scrie un scor la o dispută (redeschide fereastra de la chioșc).
- Meciurile terminate în același minut nu mai forțează recalcularea întregului sezon.
- Starea salvată și recalcularea de la zero sunt identice până la ultimul caracter (ora în UTC).
- Un sezon închis nu mai poate primi evenimente de la o cerere începută înainte de închidere.
- Setările de tip listă de opțiuni ale motorului (al treilea refuz) sunt citite corect.
- Grupele de turneu nu mai pot avea o singură pereche; referința bonusului de turneu încape în baza de date.

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
