# Plan detaliat pe etape

> Creat în Etapa 0 (26.09.2026), pe baza planului din [02-plan-pe-etape-original.md](02-plan-pe-etape-original.md) (§16). Planul original rămâne referința; acest document îl detaliază: ce se livrează, cum verifică proprietarul, de ce răspunsuri depinde fiecare etapă.
> **Regulă:** fiecare etapă se încheie cu teste verzi, dublă revizuire, documentație la zi, instrucțiuni de verificare pentru proprietar și **aprobare explicită** înainte de următoarea ([DEFINITION_OF_DONE.md](DEFINITION_OF_DONE.md), [CHECKLIST_LIVRARE.md](CHECKLIST_LIVRARE.md)).

## Cum verifică proprietarul până există un server de test

Până când avem un server de test (Q22 / Q40), fiecare etapă vine cu:
1. un **raport de verificare** în română (ce s-a testat, rezultatele testelor automate);
2. **capturi de ecran** generate automat (unde există interfață);
3. comenzi copiabile pentru rularea locală cu Docker Desktop, pentru cine dorește.

Când serverul de test există, fiecare etapă se poate verifica direct în browser, pe `staging`.

---

## Etapa 0 — Fundația documentației *(în curs, așteaptă aprobarea)*
- **Livrabile:** structura de foldere (§4.4); `MEGA_PROMPT.md` neschimbat; documentația împărțită în `docs/`; `CLAUDE.md`; 22 de ADR-uri; diagrame; `INTREBARI_DESCHISE.md` (Q1–Q42); `PROGRES.md`, `CALENDAR.md`, `CHANGELOG.md`; acest plan; README în fiecare folder; criterii de achiziție hardware.
- **Fără cod de aplicație.**
- **Verificare:** vezi `PROGRES.md` → „Etapa 0 — cum verifici”.

## Etapa 1A — Fundația backend *(oct. 2026)*
- **Livrabile:**
  - `apps/backend`: Django 5.2 + Django Ninja, configurare pe medii, Docker Compose de dezvoltare (PostgreSQL, Redis), verificare de sănătate (`/api/v1/health`).
  - **Conturi** (R-001, R-002, R-004 parțial): utilizator cu email, profil (nume, prenume, telefon, data nașterii, limba preferată), verificarea emailului, resetarea parolei, 2FA pentru personal, blocare după încercări eșuate.
  - **Roluri și permisiuni** (§8.1): Admin, Manager, Recepție, Antrenor/Instructor, Jucător/Client, Dispozitiv; permisiuni pe acțiuni, verificate în servicii.
  - Pregătite ca opțiuni: conturi de copii gestionate de părinți (Q7), cont rapid pentru invitați (Q8).
  - **Locații și resurse** (§2.2, Q20): mai multe locații; resurse (terenuri, săli, aparate reformer) adăugate din admin fără cod nou. Date demo: Jungle Padel cu 4 terenuri de padel, sala de pilates cu 4 reformere active (+2 inactive), sala de evenimente.
  - **Jurnal de audit** doar-adăugare (cine, ce, când, înainte/după, motiv, dispozitiv).
  - **Configurare versionată + feature flags** (ADR-0022), cu lista valorilor `DE_CONFIRMAT` / `DE_STABILIT`.
  - **Dispozitive:** entitatea `Device` (autentificarea mTLS completă vine în Etapele 7 și 14).
  - **i18n:** `packages/i18n` cu RO/EN și testul de completitudine; coduri de eroare stabile în API.
  - **Email:** adaptor de furnizor + șabloane RO/EN pentru verificarea contului (furnizorul real după Q24; în dezvoltare, un simulator care salvează emailurile local).
  - **API** `/api/v1` + schema OpenAPI; `packages/api-client` generat.
  - **Admin de bază:** adminul tehnic Django (cu 2FA) pentru modelele de mai sus; panoul complet vine în Etapa 10.
  - **Calitate:** uv, ruff, mypy, pytest, pre-commit, `scripts/test-all`, GitHub Actions (oglindă).
- **Verificare:** raport de teste; capturi din admin (creare cont, validare email, roluri, audit); comenzi pentru rulare locală.
- **Depinde de:** Q7, Q8, Q20, Q37 (se lucrează cu variantele implicite); Q17 (dacă telefonul se verifică prin cod).

## Etapa 1B — Pagina de pre-lansare *(oct.–nov. 2026)*
- **Livrabile:**
  - `apps/web` (Next.js), RO/EN, o pagină de pre-lansare cu identitatea provizorie „jungle” (tokeni în `packages/design-tokens`): ce vine (padel, liga, pilates, cafenea, evenimente), deschiderea în martie 2027, locația (Șoseaua Biruinței, lângă Selgros Pantelimon).
  - **Listă de așteptare:** nume, email, telefon (opțional), interese (padel, liga, tenis, pilates, corporate, evenimente), limba; acord explicit cu nota de informare (ciornă marcată „necesită revizuire de către un avocat/DPO”, Q41); confirmare prin email (double opt-in); dezabonare cu un click; export CSV din admin; protecție anti-spam fără servicii terțe.
  - Acordul se înregistrează cu versiunea și hash-ul textului (același mecanism folosit apoi la GDPR-ul ligii, R-011).
  - **SEO de bază:** titluri și descrieri, Open Graph, `hreflang`, `sitemap.xml`, `robots.txt`, date structurate `Organization` / `SportsActivityLocation`; Lighthouse ≥ 90 pe mobil; WCAG 2.2 AA.
  - Analytics fără cookie-uri (Umami).
  - Membri fondatori doar dacă se confirmă Q36.
- **Verificare:** capturi pe telefon și desktop, raport Lighthouse, test de înscriere cap-coadă.
- **Depinde de (URGENT):** Q39 (domeniu și marcă), Q26 (datele firmei pentru nota de informare), Q41 (avocat), Q24 (furnizor de email), Q22 / Q40 (unde publicăm). Pagina se poate construi și aproba fără ele, dar **nu se poate publica** fără ele.

## Etapa 2 — Motorul ligii *(nov. 2026)*
- **Livrabile:** ID-uri `LG-xxx` pentru regulile din `docs/03-liga/`; `packages/league-engine` complet (MMR Weng-Lin, nivel, plasare, ranguri, LP, promovare/retrogradare/protecție, departajare, validatorul de scor, meciuri neterminate, anti-abuz, decay, provocări, sezoane și resetare, replay determinist); 100% acoperire pe ramuri; teste de proprietate; comparație cu `openskill`; **simularea mare** (500 de jucători, 50.000 de meciuri) cu raport în `docs/03-liga/simulari/` și calibrarea parametrilor; descrierea în cuvinte a nivelurilor 1.0–7.0; verificarea regulamentului oficial FIP / Premier Padel pentru regula la 40–40 (cu sursa notată).
- **Verificare:** raportul simulării (grafice, distribuția pe ranguri, corelația rang–nivel real) explicat simplu; exemple de meciuri cu LP calculat.
- **Depinde de:** Q5, Q31 (parametri; se lucrează cu variantele implicite).

## Etapa 3 — Rezervări, prețuri, anulări, prezențe *(nov. 2026)*
- **Livrabile:** rezervări pe grilă de 30 de minute, durate 60–180 (R-041), fără suprapuneri în baza de date (R-043), tipul sesiunii (R-044); motorul de prețuri configurabil (R-050 … R-053) cu valori demo `DE_STABILIT`; anulări (R-070, R-071), neprezentări și blocare după a treia (R-072, R-073), liste de așteptare automate (R-074); check-in și scanări la intrarea pe teren (R-030, R-031), prezențe automate (R-032); clase de pilates și lecții (R-090 … R-103, partea de programare); sala de evenimente (Q34); teste pe trecerile de oră.
- **Depinde de:** Q2, Q3, Q4, Q14, Q15, Q16, Q21, Q29, Q34.

## Etapa 4 — Bani *(nov.–dec. 2026)*
- **Livrabile:** registrul cu dublă înregistrare (R-064), plăți și împărțirea orei (R-060, R-061), sold și datorii (R-065), idempotență (R-067), abonamente și configuratorul în 3 pași (R-080 … R-089), corporate (R-088, Q35), vouchere și „Adu un prieten” (R-120), recompense ca înregistrări (R-121), produse de cafenea (R-111, R-112); 100% acoperire pe ramuri.
- **Depinde de:** Q9, Q10, Q12, Q13, Q14, Q21, Q32, Q33, Q35; confirmări fiscale cu contabilul (Q26).

## Etapa 5 — Carduri, Wallet, GDPR *(dec. 2026)*
- **Livrabile:** legitimații QR cu token revocabil (R-020 … R-025), Apple Wallet și Google Wallet cu actualizare automată, PDF de tipar CR80 și coada „carduri de emis”; formularul GDPR al ligii și acordurile (R-010, R-011), drepturile persoanei (export, ștergere cu pseudonimizarea „Jucător retras”, §12.2); ciorne legale marcate pentru avocat.
- **Depinde de:** Q1, Q24 (Apple Developer, emitent Google Wallet), Q30, Q41.

## Etapa 6 — Integrarea ligii *(dec. 2026)*
- **Livrabile:** meciuri, fereastra de scor, confirmări, dispute, validarea prin plată, aplicarea MMR/LP (§6.9), sezoane, provocări, turnee (formate și tablouri), recompense, insigne, Meciul zilei (scor de miză determinist); recalculare la anularea unui meci; teste de concurență.
- **Depinde de:** Q6, Q11, Q27, Q28.

## Etapa 7 — Hardware Bridge + Chioșcul de Ligă *(dec. 2026–ian. 2027)*
- **Livrabile:** bridge-ul cu interfețe, simulatoare complete, semnături, jurnal local; aplicația Chioșc Ligă (§8.2) cu toate acțiunile și mesajele de eroare; scripturi de mod kiosk.
- **Depinde de:** Q23 (modelele reale; până atunci, simulatoare).

## Etapa 8 — Chioșcul de Plăți + afișajul cafenelei *(ian. 2027)*
- **Livrabile:** fluxurile din §8.3 (numerar cu rest, avertizare înainte de plată dacă nu există rest, bon fiscal, mod personal, reconciliere, raport Z), afișajul cafenelei (§8.7); teste de cădere de curent pe simulator.
- **Depinde de:** Q10, Q23, Q33, contabilul (fiscal).

## Etapa 9 — Ecranele *(ian. 2027)*
- **Livrabile:** ecranul fiecărui teren și ecranele de lobby/cafenea/mezanin (§8.5), în timp real, cu datele demo din §8.5 și reconectare automată.

## Etapa 10 — Panoul de admin complet *(ian. 2027)*
- **Livrabile:** toate modulele din §8.6, cu 2FA și permisiuni.

## Etapa 11 — Website-ul „simulator” *(ian.–feb. 2027)*
- **Livrabile:** secțiunile din §9.2, **livrate și aprobate una câte una**; paginile din §9.3; zona de cont; PWA.
- **Depinde de:** Q25; identitatea vizuală (dacă e gata), altfel tema provizorie.

## Etapa 12 — AI + notificări *(feb. 2027)*
- **Livrabile:** funcțiile din §10.2 și matricea din §11.
- **Depinde de:** Q17, Q18, Q19, Q24 (cheia AI).

## Etapa 13 — SEO, conținut, marketing, branding, vânzări *(în paralel, finalizare feb. 2027)*
- **Livrabile:** documentele din §15.2–§15.5, regulamentul public (`docs/14-regulament-public/`).
- **Depinde de:** Q36, Q38, Q39.

## Etapa 14 — Deploy, securitate, backup, monitorizare, hardware real *(feb. 2027)*
- **Livrabile:** serverul de producție configurat (ADR-0015 … ADR-0017), testul de restaurare, runbook-urile, înrolarea aparatelor, driverele reale testate la club.
- **Depinde de:** Q22, Q23.

## Etapa 15 — Beta, încărcare, instruire *(feb.–mar. 2027)*
- **Livrabile:** beta cu membrii clubului de tenis, teste de încărcare, ghidurile din `docs/15-instruire-personal/`, lista de lansare.
- **Depinde de:** Q21 (prețuri finale), Q37.

## Etapa 16 — Inaugurare și go-live *(mar. 2027)*
- **Livrabile:** lansare, Sezonul 0/1 al ligii (Q27), monitorizare intensivă.

---

## Riscuri pentru calendar (de urmărit)

| Risc | Impact | Ce facem acum |
|---|---|---|
| Aparatele (numerar cu rest, casă de marcat) se aleg sau se livrează târziu | Chioșcul de plăți nu poate fi integrat la timp | Criteriile de achiziție sunt în `docs/09-hardware/02-criterii-achizitie-hardware.md`; modelele trebuie alese până la finalul lui noiembrie 2026 (Q23) |
| Casa de marcat fiscală pentru regim nesupravegheat | Obligație legală (R-066) | Confirmare cu contabilul și cu furnizorul, înainte de cumpărare |
| Contul Apple Developer al firmei (cere număr D-U-N-S) | Apple Wallet întârziat | Început în octombrie 2026 (Q24) |
| Serverul propriu nu e gata | Pagina de pre-lansare nu poate fi publicată | Q22 / Q40 |
| Marca „Jungle Padel” indisponibilă | Rebranding după tipărirea materialelor | Verificare la OSIM/EUIPO înainte de domeniu și materiale (Q39) |
| Prea multe etape pentru 6 luni | Întârzierea lansării | Dacă e nevoie, se amână după lansare: limbile suplimentare, funcțiile AI secundare (fără a compromite liga, banii și securitatea, §16) |
