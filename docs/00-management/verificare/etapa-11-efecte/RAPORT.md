# Video de prezentare și efecte la scroll: raport

> Cererea proprietarului din 30.09.2026: peste site-ul complet (Etapa 11), un video mare de prezentare și conținut care apare progresiv la derulare, cu funcții care răspund viu. Structura, designul, brandingul, textele, datele și calculele rămân neschimbate. Se lucrează în faze, fiecare aprobată separat.

| Fază | Ce conține | Starea |
|---|---|---|
| 0. Citire, inventar, referință, plan | fără modificări vizibile | **aprobată 30.09.2026** („aprob, continuă cu tot până la capăt”) |
| 1. Fundația | pasul de viteză, tokenii de mișcare, observatorul, CSS-ul de efecte, modul „lite”, comutatoarele `web_effects` și `web_hero_video`; butonul de apel și fraza Q34 la sala de evenimente | **livrată 30.09.2026** |
| 2. Videoul | stratul video, scriptul, controalele, tranziția spre hală, comutatorul `web_hero_video` | **livrată 30.09.2026** (așteaptă videoul) |
| 3. Secțiunile 14–19 | construite direct cu efecte | **livrată 30.09.2026** |
| 4. Efectele pe secțiunile 1–13 | una câte una, cu interactivitatea funcțiilor | **livrată 30.09.2026** |
| 5. Celelalte pagini | același limbaj de efecte, mai discret | **livrată 30.09.2026** |
| 6–7. Verificarea finală și predarea | ghid pentru proprietar | **livrate 30.09.2026**; așteaptă aprobarea |

---

## Faza 0 — Citire, inventar, referință, plan

### Ce s-a făcut
1. **Mesajul dumneavoastră, aplicat:** secțiunile 11–13 sunt aprobate și au intrat în `main`; Q33 și Q34 sunt închise, cu data și sursa. Q34 pe site (butonul de apel și fraza despre cerere) vine în Faza 1, ca să nu schimbe nimic vizibil în Faza 0.
2. **Starea confirmată:** branch-ul `claude/hopeful-euler-rguibn` era la commitul `b95ddbc` (secțiunea 13), exact ca în cerere. Testele complete (`scripts/test-all`) au trecut, iar CI-ul e verde; `main` e acum la `382c7f9` (secțiunile 11–13 aprobate).
3. **Scriptul de inventar** (`apps/web/scripts/inventory.mjs`). Deschide fiecare pagină a site-ului complet, în română și engleză, pe calculator și pe telefon, și listează tot ce vede și folosește un vizitator:
   - secțiunile în ordine, titlurile, linkurile, butoanele, formularele și câmpurile;
   - imaginile cu textul alternativ, regiunile, meta-datele și `hreflang`;
   - adresele API chemate de fiecare pagină.

   Din cod listează componentele care rulează în browser, cheile de traducere `web.*` și comutatoarele. Cu `--compare` arată ce s-a adăugat și ce a dispărut; dacă a dispărut ceva, comanda pică.
4. **Referința** ([INVENTAR_INAINTE.json](INVENTAR_INAINTE.json), făcută pe commitul `382c7f9`, cu site-ul complet pornit):
   - 36 de adrese (18 pagini în română și engleză), fiecare pe calculator și pe telefon: 72 de vizite, toate cu răspuns 200;
   - pe pagina principală: 17 secțiuni, 80 de titluri, 42 de linkuri, 31 de butoane, 8 regiuni și 9 adrese API chemate din browser;
   - din cod: 19 componente care rulează în browser, 619 chei de traducere `web.*` (aceleași în RO și EN), 14 comutatoare;
   - capturi pe toată pagina pentru toate cele 72 de vizite. Cele ale paginii principale sunt salvate aici ([calculator, RO](ecrane/referinta-desktop-ro.jpg), [telefon, RO](ecrane/referinta-mobil-ro.jpg), [calculator, EN](ecrane/referinta-desktop-en.jpg), [telefon, EN](ecrane/referinta-mobil-en.jpg)). Celelalte se refac oricând, identic, cu aceeași comandă pe commitul `382c7f9`.
5. **Viteza de referință** (Lighthouse, pagina principală, site-ul de azi, fără nicio modificare):

   | Măsurători | Telefon (performanță) | LCP | TBT | Accesibilitate · Bune practici · SEO | Calculator |
   |---|---|---|---|---|---|
   | 5, pornire la rece | 84 · 85 · 86 · 92 · 92 | 3,2–3,9 s | 130–310 ms | 100 · 100 · 100 | 100 (de 2 ori), LCP 0,7 s |
   | 5, după o rulare de încălzire | 91 · 91 · 88 · 85 · 90 | 3,2–3,9 s | 150–250 ms | 100 · 100 · 100 | 100 (de 2 ori), LCP 0,7 s |

   CLS e 0 în toate măsurătorile.

### O constatare importantă: viteza pe telefon e sub prag chiar înainte de efecte
Cerința cere, la final, **Lighthouse pe telefon ≥ 90 la fiecare măsurătoare**. Site-ul de azi, fără nicio modificare, nu trece constant pragul: 5 din 10 măsurători sunt între 84 și 88.

**Cauzele:**
- În rulările slabe, fie pagina a apărut mai târziu în browserul de test (pornirea la rece), fie procesorul mediului de test era ocupat (TBT până la 310 ms). Același cod a dat 90–94 ieri.
- LCP-ul de 3,2 s vine din tot codul și fonturile cerute înainte de prima afișare, pe care Lighthouse le simulează pe un telefon lent.

**Propunerea:** Faza 1 începe cu un pas de **marjă de viteză**, înaintea oricărui efect. Candidații, fiecare măsurat separat:
1. Textele trimise browserului doar pentru pagina deschisă. Pagina principală primește azi și textele erorilor și ale listei de așteptare (~20 KB), pe care nu le folosește.
2. Simulatoarele de sub primul ecran pornesc codul abia când ajung aproape de ecran.

**Ținta:** fiecare măsurătoare ≥ 90, cu un protocol fix (o rulare de încălzire, apoi 5 măsurători), notat în fiecare raport. Abia după aceea adăugăm efectele. Orice efect care coboară vreo măsurătoare sub 90 nu se livrează.

### Planul de efecte

**Principiul:** nu facem un site nou; adăugăm un strat de mișcare. Efectul stă în CSS, pe atribute puse pe elementele de acum (`data-reveal`); un singur script mic, comun, marchează ce a intrat în ecran. Fără JavaScript sau cu comutatorul `web_effects` oprit, site-ul e identic cu cel de azi. Detaliile tehnice: ADR-0023 (propus).

**Pe secțiuni (1–13):**

| # | Secțiunea | La apariție | La derulare | Interacțiune | 3D | Pe telefon | „Reducerea mișcării” | Risc pentru viteză |
|---|---|---|---|---|---|---|---|---|
| 1 | Antetul | – | se compactează; bară de progres alamă; meniul arată secțiunea curentă | meniul se deschide și se închide animat | nu | la fel | fără animație, bara rămâne | mic (un observator) |
| 2 | Hero | textul urcă pe rânduri (există deja `hero-rise`) | **videoul** (Faza 2) se estompează și se micșorează, dezvăluie hala 3D | pauză / redare video | da (existent) | video și 3D nu rulează în același timp | randarea statică, buton de redare | **mare**: se măsoară separat |
| 3 | Turul | titlurile pe rânduri | adâncime la trecerea dintre opriri; planul se luminează ca acum | – | ușor (perspectivă CSS) | ca acum | ca acum | mic |
| 4 | Acum în club | cardurile terenurilor în cascadă | – | o valoare nouă intră cu derulare scurtă; un teren care își schimbă starea pulsează | nu | la fel | fără puls | mic |
| 5 | Padel | cardurile formatelor intră în 3D, în cascadă | parallax ușor pe terenul desenat | tilt după cursor (max ~8°) | ușor | fără tilt, apăsare | fade | mic |
| 6 | „Care e nivelul tău?” | pastilele în cascadă | – | apăsare animată; întrebările glisează; nivelul se numără până la valoarea de la server; recomandarea apare cu „pop” | nu (mingea rămâne) | la fel | fără glisare | mediu (componentă client existentă) |
| 7 | Liga | **scara rangurilor urcă treaptă cu treaptă** | – | LP-ul ca odometru, verde/roșu din tokeni; treapta atinsă se evidențiază; clasamentul se mută animat | nu | pe verticală | fade | mediu |
| 8 | Tenis | cifrele (anul, terenurile) se numără | – | – | nu | la fel | valorile finale direct | mic |
| 9 | Pilates | tipurile de clase în cascadă 3D | – | programul: schelet de încărcare, apoi intrare în cascadă | ușor | fără tilt | fade | mic |
| 10 | Pachete | pașii în cascadă | – | progresul pașilor animat; prețul ca odometru; reducerile cu „pop” | nu | la fel | fără odometru | mediu |
| 11 | „Împarte ora” | – | – | suma se împarte vizual în părți; partea fiecăruia apare animat | nu | la fel | fără animație | mic |
| 12 | Evenimente | calendarul în cascadă; faptele sălii se numără | – | – | nu | la fel | fade | mic (randare pe server) |
| 13 | Cafeneaua | pașii 1–2–3 apar pe rând; meniul în cascadă | – | – | nu | la fel | fade | mic (randare pe server) |

**Regula pentru secțiunile 14–19:** fiecare se construiește direct cu atributele `data-reveal` (titluri pe rânduri, carduri în cascadă, cifre care se numără), fără cod propriu de animație. Secțiunea 16 („Cifre”) folosește numărătoarea doar cu date reale, după lansare.

**Intensitatea:** spectaculoasă în hero și în tur; medie în secțiunile de prezentare; discretă în formulare, cont și paginile legale.

### Planul video (Faza 2)
- **Randarea de acum rămâne prima imagine.** Videoul se încarcă după ce pagina e gata și intră peste ea cu fade, doar dacă poate rula fără opriri. Până trimiteți videoul, hero-ul rămâne exact ca acum.
- **Comportamentul:** fără sunet, în buclă, pe tot primul ecran, cu buton de pauză. La derulare se estompează și dezvăluie hala 3D.
- **Scriptul** `pnpm --filter @jungle/web video:hero` (cu `ffmpeg`, verificat: se instalează în mediul de lucru, cu H.264, VP9 și AV1) pregătește variantele (MP4 și WebM, calculator ≤ 8 MB, telefon ≤ 3 MB) din originalul pus în `apps/web/media-src/hero/`.
- **Ce video să trimiteți:** o listă exactă vine în raportul Fazei 2 (orizontal 16:9, minimum 1080p, 15–30 de secunde, fără text în imagine).

### Demonstrațiile opționale (intră doar dacă le aprobați, după ce le vedeți)
1. Frunze în parallax (elemente vizuale noi, deci schimbă ușor designul).
2. O lumină care urmărește cursorul pe secțiunile întunecate.
3. Camera scenei 3D din hero care se mișcă prin hală la derulare.
4. Tranziții scurte între pagini.
5. Un mic efect de celebrare la rezultatul simulatoarelor.

Le arătăm ca înregistrări video în raportul Fazei 1, fără să le punem pe site.

### Întrebări noi (fiecare are o variantă implicită; nu blochează munca)
Q59–Q64, în `docs/00-management/INTREBARI_DESCHISE.md`:

| | Întrebarea | Varianta implicită |
|---|---|---|
| Q59 | Sunetul videoului | fără sunet; buton de sunet doar pentru muzică cu drepturi |
| Q60 | Varianta pentru telefon | aceeași filmare, încadrată cu un punct de focalizare reglabil |
| Q61 | „Pop”-uri | doar elemente care apar cu efect; fără ferestre pop-up |
| Q62 | Efectele opționale | doar cele aprobate după demonstrație |
| Q63 | Intensitatea | spectaculoasă în hero și în tur, medie în rest |
| Q64 | Pagina de pre-lansare | nu primește videoul și efectele; rămâne cum a fost aprobată |

### Riscuri
1. **Viteza pe telefon.** Suntem la 84–92 (mai sus). Fiecare efect se măsoară înainte de livrare; ce coboară vreo măsurătoare sub 90 nu se livrează.
2. **Videoul pe telefon.** Pe conexiuni lente, cu „Save-Data” sau cu „reducerea mișcării” rămâne randarea statică.
3. **Browserele fără animații legate de scroll** (Firefox, Safari mai vechi) primesc aceleași efecte prin observator.
4. **Valorile live** (ora actualizării, starea terenurilor) diferă de la o rulare la alta. Comparația inventarului și regresia vizuală le vor masca, iar testul de stabilitate al inventarului se face în Faza 1.

### Cum verificați (click cu click)
1. Deschideți capturile de referință ale paginii principale (linkurile de la punctul 4).
2. Citiți tabelul „Pe secțiuni”: pentru fiecare secțiune, efectul propus.
3. Răspundeți la Q59–Q64 doar dacă nu vă convine varianta implicită.
4. Dacă planul vă convine, inclusiv pasul de marjă de viteză de la începutul Fazei 1, scrieți „aprob planul” și începem Faza 1.

Nu s-a schimbat nimic vizibil pe site în această fază.

---

## Faza 1 — Fundația

### Ce s-a construit
1. **Pasul de viteză.** Fiecare pagină primește doar textele componentelor ei (`ClientTexts`, grupurile din `src/lib/client-messages.ts`). Pagina principală a site-ului complet nu mai poartă textele erorilor și ale listei de așteptare: documentul a scăzut de la 61,7 la 56,4 KB.
2. **Tokenii de mișcare** (în `packages/design-tokens`, derivați din cei existenți): easing-ul elastic pentru „pop”, durata de bază (520 ms), decalajul de cascadă (70 ms), distanța de urcare (24 px), unghiul maxim de tilt (8°), perspectiva (1200 px), scara de pornire a unui „pop” (0,9). Nicio culoare și niciun font nou.
3. **Observatorul unic** (`EffectsRuntime`, singurul cod nou în browser, fără texte). Pune nivelul de mișcare pe pagină și marchează fiecare element cu `data-reveal` când intră în ecran. Un element primit în focus din tastatură apare imediat.
4. **CSS-ul de efecte:** apariții `fade`, `rise`, `tilt` (3D), `pop` (elastic), `mask` și `lines` (titluri pe rânduri), cu cascadă. Se mișcă doar `transform`, `opacity` și `clip-path`.
5. **Trei niveluri:** complet; „lite” (telefon slab, „Save-Data”, conexiune lentă): doar fade-uri; „reducerea mișcării”: nimic ascuns, nimic în mișcare.
6. **Comutatoarele** `web_effects` și `web_hero_video`, oprite implicit, în panou (Setări și feature flags). Apar doar pe site-ul complet, niciodată pe pagina de pre-lansare (Q64).
7. **Q34 pe site:** la sala de evenimente, fraza „Cererea se face online, din cont, sau telefonic. Pachetele, prețurile și rezervarea le confirmă un manager al clubului.” și butonul „Sună la club”. Butonul apare doar când telefonul clubului e completat în panou (Setări → datele firmei).

În această fază nicio secțiune nu primește încă efecte: fundația e pregătită, iar efectele vin secțiune cu secțiune în fazele următoare.

### Rezultate
| Verificare | Rezultat |
|---|---|
| Inventarul după ([INVENTAR_DUPA_FAZA1.json](INVENTAR_DUPA_FAZA1.json)) | **0 elemente eliminate sau schimbate**; 7 adăugiri: componenta `EffectsRuntime`, cheile de text ale frazei și butonului Q34 (RO și EN), comutatoarele `web_effects` și `web_hero_video`. |
| Regresia vizuală, efectele oprite | **72/72 capturi identice** cu referința (diferențe sub 0,13%). Pe telefon, pagina principală e mai lungă doar cu fraza Q34 (zona aprobată); tot ce e sub ea e identic, doar mutat mai jos. |
| Regresia vizuală, efectele pornite + „reducerea mișcării” | **72/72 capturi identice** cu referința; inventarul, tot 0 elemente eliminate. |
| Testele existente | toate trec neschimbate, și cu efectele oprite, și **din nou cu efectele pornite** (o etapă nouă în `scripts/test-e2e`). |
| Teste noi | unitare: nivelul de mișcare (3), comutatoarele (1), telefonul și linkul `tel:` (2); cap-coadă: apariția la intrarea în ecran, focusul din tastatură, „reducerea mișcării”, fără JavaScript. |

### Viteza pe telefon
| Măsurători (după o rulare de încălzire) | Telefon | Calculator |
|---|---|---|
| Efectele oprite, după pasul de viteză | 90 · 91 · 92 · 87 · 92 | 100 · 100 |
| Efectele pornite | 90 · 95 · 86 · 92 · 88 | 100 · 100 |
| Referința din Faza 0 | 91 · 91 · 88 · 85 · 90 | 100 · 100 |

- **Mediana e 90–91 în toate trei cazurile.** Observatorul nu costă viteză măsurabilă.
- **Rulările de 86–87** sunt cele în care browserul de test a afișat pagina târziu (1,2–1,3 s față de 0,2 s în rest). Mediul de test variază, nu pagina.
- **Rulările de 88:** TBT puțin peste 200 ms, tot din variația procesorului.
- **Pragul „≥ 90 la fiecare măsurătoare”** nu se poate dovedi cu certitudine în acest mediu, nici pentru site-ul de dinainte de efecte. Îl urmărim: fiecare fază următoare se măsoară la fel, iar un efect care coboară mediana nu se livrează.

### Cum verificați (click cu click)
1. În panou, la Setări și feature flags: `web_effects` și `web_hero_video` există, oprite.
2. Pe site, la Evenimente → Sala de evenimente: fraza nouă. Butonul „Sună la club” apare după ce completați telefonul în datele firmei.
3. Activați „Reducerea mișcării” din setările de accesibilitate ale telefonului: site-ul rămâne complet.

---

## Faza 2 — Videoul de prezentare

### Ce s-a construit
1. **Stratul video din hero** (`HeroVideo`). Randarea de acum rămâne prima imagine: videoul se încarcă abia după ce pagina e gata, când browserul e liber, și apare peste randare cu un fade doar după ce rulează efectiv.
   - rulează fără sunet, în buclă, pe tot primul ecran;
   - peste el rămân neschimbate titlul, textul, cele două butoane, nota „ilustrativ” și indicatorul de derulare; sub text, același strat de umbrire ca peste randare, din tokenul de culoare „night”;
   - la derulare se estompează și se micșorează puțin, dezvăluind randarea și hala 3D (reversibil când urcați înapoi);
   - un buton rotund, jos în dreapta, îl oprește și îl pornește („Oprește videoul” / „Pornește videoul”, din tastatură, WCAG 2.2.2); se oprește singur când iese din ecran;
   - cu „reducerea mișcării”, „Save-Data”, conexiune lentă sau telefon slab nu pornește singur: rămâne randarea, cu butonul de redare;
   - pe telefon, hala 3D pornește abia după ce hero-ul (cu videoul) a ieșit din ecran: niciodată amândouă deodată.
2. **Comanda** `pnpm --filter @jungle/web video:hero` (`apps/web/scripts/video-hero.mjs`, cu `ffmpeg`). Din originalul pus în `apps/web/media-src/hero/` face:
   - variantele pentru calculator (1920 px) și telefon (1280 px), MP4 (H.264, pornire rapidă) și WebM (VP9), fără sunet;
   - o imagine de rezervă;
   - fișierul `manifest.json`, pe care îl citește site-ul.

   Verifică durata, rezoluția și sunetul. Dacă o variantă depășește bugetul (calculator ≤ 8 MB, telefon ≤ 3 MB), o recomprimă singură, puțin mai tare, până intră în buget. Opțiunea `--illustrative` adaugă pe site eticheta „Video ilustrativ” (Q44).
3. **Comutatorul** `web_hero_video` (Faza 1). Oprit sau fără video încărcat, hero-ul e exact ca acum.
4. **Folderul pentru original** `apps/web/media-src/hero/`, cu instrucțiuni (README). Originalul nu se servește pe site.

### Rezultate
| Verificare | Rezultat |
|---|---|
| Fără video (comutator oprit sau fără fișiere) | hero-ul identic: toate testele existente trec neschimbate, iar inventarul nu pierde nimic. |
| Testele cap-coadă ale videoului (cu un clip de test generat la fiecare rulare, niciodată pus pe site) | calculator + telefon: randarea e prima imagine; videoul vine după, rulează fără sunet, se oprește și repornește din buton, se estompează la derulare și revine la urcare; cu „reducerea mișcării” nu pornește singur, iar butonul de redare îl pornește; engleza. |
| Toate testele site-ului cu efectele și videoul pornite | 101 trec (87 existente neschimbate, 8 ale fundației, 6 ale videoului). |
| Scriptul pe un clip de probă 1080p de 18 s (cel mai greu caz: imagine de test cu mult zgomot) | calculator: MP4 5,0 MB, WebM 6,6 MB; telefon: MP4 1,5 MB, WebM 2,8 MB, toate în buget, după recomprimarea automată. |
| Teste unitare | manifestul video (doar fișiere din `/media/hero/`, formă exactă), nivelul de mișcare. |

### Viteza pe telefon
Cu efectele și videoul de test pornite (după o rulare de încălzire): **93 · 86 · 92 · 92 · 92** pe telefon (mediana 92), **100 · 100** pe calculator. Videoul pentru telefon (1,1 MB) se descarcă abia după prima afișare; singura rulare de 86 are din nou prima afișare întârziată în browserul de test.

### Ce video să trimiteți
- orizontal 16:9, minimum 1920×1080 (ideal 4K), 15–30 de secunde, care se poate relua în buclă;
- fără text în imagine și fără sunet obligatoriu (Q59: pe site rulează fără sunet);
- opțional, o variantă verticală 9:16 pentru telefon (Q60);
- doar filmări reale (clubul de tenis, șantierul); dacă sunt randări sau imagini generate, spuneți-ne și îl marcăm „ilustrativ” (Q44).

**Cum îl urcați:** pe GitHub, pe branch-ul de lucru, deschideți folderul `apps/web/media-src/hero` → **Add file** → **Upload files** → trageți videoul → **Commit changes**. Prin site-ul GitHub se pot urca fișiere de cel mult 25 MB; dacă videoul e mai mare, exportați-l la 1080p sau mai scurt. Apoi îl pregătim noi și pornim `web_hero_video`.

### Cum verificați (click cu click)
1. Până trimiteți videoul, hero-ul arată exact ca acum, chiar și cu `web_hero_video` pornit.
2. După ce îl pregătim: deschideți pagina principală; după câteva secunde videoul apare peste randare. Butonul rotund din dreapta-jos îl oprește.
3. Derulați: videoul se estompează și apare hala.
4. Activați „Reducerea mișcării” pe telefon: videoul nu mai pornește singur, iar butonul îl pornește.

---

## Faza 3 — Secțiunile 14–19, construite direct cu efecte

### Ce s-a construit
Pagina principală are acum toate cele 19 secțiuni. Cele șase noi sunt randate pe server (fără cod nou în browser) și poartă efectele din prima zi.
1. **Comunitatea** (secțiunea 14):
   - cele 7 insigne ale ligii, fiecare într-un card care apare cu un „pop” elastic și se înclină după cursor; insignele fiecărui jucător rămân private, în contul lui (R-012);
   - **Hall of Fame**, citit din API (câștigătorii sezoanelor încheiate: nume, rang, loc; LG-134). Până la primul sezon încheiat scrie „Primii câștigători apar aici la finalul primului sezon.”;
   - **„Adu un prieten”** (R-120).
2. **Echipa** (15): antrenorii de padel, instructorul de Reformer și recepția, doar ca roluri. Nume și fotografii nu inventăm: le punem când ni le trimiteți (Q65).
3. **Clubul în cifre** (16): doar cifre de proiect din documente (4 terenuri, pasarela la 3 m, 4 aparate Reformer cu loc pentru 6, sala de 20 de persoane, 28 de locuri de parcare, sezonul de 3 luni). **Numerele numără în sus** când apar și se opresc mereu pe valoarea reală.
4. **Locație și acces** (17): adresa, accesul, parcarea, planul clubului, OpenStreetMap și, opțional, Waze sau Google Maps. Doar linkuri: nicio hartă încorporată, niciun script de la terți.
5. **Întrebări frecvente** (18): 8 întrebări cu regulile pe scurt (program și vârf, durate, anulare, neprezentare, plată, fără credite la padel, cine intră în ligă, unde se introduc scorurile), cu link spre Termeni. Se deschid fără cod.
6. **Subsolul** (19): pe site-ul complet, sub coloanele de acum, un rând nou cu paginile clubului, programul (08:00–23:00) și limbile. Datele firmei, paginile legale și ANPC rămân exact unde erau.

**Efecte noi, pentru tot site-ul** (doar la mișcarea completă; cu „reducerea mișcării” nu rulează):
- cardurile cu `data-tilt` se înclină după cursor, cu o lumină de alamă în dreptul lui (doar pe calculator);
- o bară subțire de alamă sub antet arată cât ați citit din pagină;
- în meniu, linkul secțiunii din ecran e marcat.

### Rezultate
| Verificare | Rezultat |
|---|---|
| Inventarul, efectele oprite și efectele pornite + „reducerea mișcării” | **0 elemente eliminate sau schimbate**; 1196 de adăugiri: cele 5 secțiuni, rândul nou din subsol (10 linkuri pe fiecare pagină), 172 de chei de text (RO + EN). Inventarul compară acum câmpurile fără id-urile automate ale React: cele 5 glisoare ale simulatorului de puncte își schimbaseră doar id-ul generat, pentru că pagina are mai multe secțiuni. |
| Regresia vizuală, efectele oprite | **70/72 capturi identice** cu referința. Diferă doar pagina principală (RO, EN) pe telefon: are secțiunile noi. Pe calculator, pagina principală și toate celelalte pagini sunt în limita de 0,5%, cu subsolul crescut (conținut adăugat). |
| Regresia vizuală, efectele pornite + „reducerea mișcării” | **68/72 identice**; diferă doar pagina principală (calculator și telefon, RO și EN), din același motiv. |
| Pagina principală, verificată rând cu rând | Secțiunile 1–13 sunt identice cu referința. Singurele diferențe: ora „Actualizat la” din „Acum în club” (e live), hala 3D din hero (pornește la un moment variabil) și fraza Q34 aprobată în Faza 1. |
| Testele existente | toate trec neschimbate, cu efectele oprite și cu ele pornite. Harta secțiunilor arată acum 19 din 19 gata (testul antetului a fost actualizat pentru asta, ca la fiecare secțiune livrată). |
| Teste noi | cap-coadă: cele 6 secțiuni (textele, Hall of Fame față de API, linkurile hărții în fereastră nouă, fără iframe, întrebările deschise din click, subsolul și schimbarea limbii, engleza); efectele: numerele numără și se opresc pe valoarea reală, bara de progres, linkul secțiunii din ecran, „reducerea mișcării”. Unitare: Hall of Fame, numărarea, tilt-ul, progresul. |
| Accesibilitate | axe fără probleme serioase pe toate paginile, cu efectele pornite și oprite. Verificarea se face pe pagina cu efectele terminate: axe derulează la fiecare element și ar fi măsurat altfel contrastul unui text la jumătatea fade-ului. |

Captura secțiunilor noi: [calculator](ecrane/faza3-calculator-ro.jpg), [telefon](ecrane/faza3-mobil-ro.jpg).

### Viteza pe telefon
| Măsurători (după o rulare de încălzire, efectele pornite) | Telefon | Calculator |
|---|---|---|
| Prima serie | 92 · 87 · 91 · 93 · 82 | 100 · 100 |
| A doua serie (după mutarea rândului din subsol) | 92 · 87 · 92 · 89 · 90 | 100 · 100 |

- **Mediana e 90–91,** ca în Fazele 0–2.
- **Rularea de 82** are prima afișare întârziată (1,4 s), ca rulările slabe din referință. Rulările de 87 au procesorul ocupat (TBT 270–310 ms).
- **LCP** rămâne 3,2 s: primul ecran nu s-a schimbat. **Accesibilitate, bune practici și SEO:** 100 la toate.

### O corectură făcută înainte de livrare
În prima variantă, rândul nou din subsol stătea în coloanele existente și împingea „Informații legale” pe un rând nou. Asta schimba un aspect aprobat, așa că l-am mutat într-un rând separat, sub coloane. Captura de după arată subsolul de dinainte neschimbat.

### Cum verificați (click cu click)
1. Porniți site-ul complet și `web_effects` din panou (Setări și feature flags).
2. Derulați pe pagina principală până la „Un club, nu doar terenuri.”: insignele apar pe rând; pe calculator, cardurile se înclină după mouse.
3. La „Clubul în cifre.”, numerele numără de la 0 până la valoarea lor.
4. Urmăriți bara subțire de sub antet: crește cât derulați. În meniu, linkul secțiunii în care sunteți se aprinde (de exemplu „Liga”).
5. La „Pe scurt, înainte să vii.”, deschideți o întrebare.
6. Jos, în subsol: paginile clubului, programul și limbile, sub datele firmei.

### Decizii noi (nu blochează nimic)
- **Q65:** cine face parte din echipă și ce scriem despre fiecare (până atunci: doar rolurile).
- **Q66:** harta „secțiune cu secțiune” de la finalul paginii o scoatem în ziua lansării publice.

---

## Faza 4 — Efectele pe secțiunile 1–13

### Ce s-a adăugat (doar atribute și o clasă; niciun text, nicio funcție schimbată)
- **La fiecare secțiune, 3–13:** eticheta mică apare cu un fade, titlul intră pe rânduri, textul de sub el urcă ușor.
- **Turul clubului:** cele opt opriri apar în cascadă.
- **„Acum în club”:** când un teren se eliberează sau se ocupă, starea lui nouă intră cu un „pop”.
- **Padel:**
  - desenul terenului se descoperă dinspre centru;
  - avantajele apar pe rând;
  - cardurile se înclină la apariție și după mouse;
  - formatele de turneu intră cu un „pop”.
- **„Care e nivelul tău?”:** nivelul primit de la server intră cu un „pop” la fiecare rezultat nou.
- **Liga:**
  - scara rangurilor urcă treaptă cu treaptă;
  - cardurile „cum câștigi LP” se înclină;
  - premiile apar pe rând;
  - în simulatorul de puncte, LP-ul nou intră cu un „pop”.
- **Tenis:** 8 și 4 (terenurile) numără în sus; anul 2013 nu numără (e un an, nu o cantitate); cardurile se înclină.
- **Pilates:**
  - desenul studioului se descoperă;
  - faptele apar pe rând;
  - cele 8 clase intră cu un „pop” și se înclină;
  - lista de așteptare urcă.
- **Pachete și „Împarte ora”:** prețul nou intră cu un „pop” la fiecare alegere. Notele de sub simulatoare apar pe rând.
- **Evenimente:**
  - cardurile se înclină;
  - evenimentele din calendar apar pe rând;
  - sala de evenimente se înclină la apariție;
  - numărul de persoane numără în sus.
- **Cafeneaua:** cei trei pași intră cu un „pop”; categoriile meniului apar pe rând.
- **Hero-ul** nu primește apariții. E primul ecran, iar imaginea lui e cea după care Lighthouse măsoară încărcarea (LCP); mișcarea lui e videoul din Faza 2.

**Calculele nu se ating:** „pop”-ul e o animație pe elementul care arată valoarea primită de la server; valoarea nu trece prin nicio formulă în site.

### O problemă găsită la măsurare și reparată
Prima măsurare cu efectele pe toate secțiunile a dat pe telefon **85 · 82 · 87 · 86 · 86**, cu TBT 300–430 ms. Am comparat, pe aceeași versiune, efectele oprite și pornite: oprite 91, pornite 86.

**Cauza:** la pornirea efectelor, cele aproximativ 200 de elemente de sub ecran treceau spre starea „ascuns” *cu animație*, adică sute de fade-uri invizibile în timpul încărcării paginii.

**Reparația:**
- elementele de sub ecran trec direct, fără animație, în starea de dinaintea apariției;
- ce e deja pe ecran se marchează din primul raport al observatorului, fără să forțeze browserul să recalculeze pagina;
- lumina de pe carduri se desenează doar cât stă mouse-ul pe card.

Efectele rămân aceleași.

### Rezultate
| Verificare | Rezultat |
|---|---|
| Inventarul, efectele oprite și „reducerea mișcării” | **0 elemente eliminate sau schimbate** (doar adăugirile din Faza 3). |
| Regresia vizuală, efectele oprite | **70/72 identice**; diferă doar pagina principală pe telefon (secțiunile 14–19). Secțiunile 1–13, verificate rând cu rând: identice. |
| Regresia vizuală, efectele pornite + „reducerea mișcării” | **68/72 identice**, la fel ca în Faza 3 (doar pagina principală, cu secțiunile noi). |
| Testele existente | toate trec neschimbate, cu efectele oprite (101) și pornite. |
| Teste noi | „pop”-ul prețului (elementul intră din nou, cu animația, iar valoarea e cea a serverului); fiecare secțiune 3–13 își arată titlul când ajungeți la ea; cardurile apar la derulare. |
| Toate testele site-ului | 28 pre-lansare, 101 site complet, **127 cu efectele și videoul pornite**. |

### Viteza pe telefon (după reparație, aceeași versiune, după o rulare de încălzire)
| | Telefon | TBT |
|---|---|---|
| Efectele oprite | 93 · 94 · 89 · 93 · 92 | 90–230 ms |
| **Efectele pornite** | **95 · 90 · 92 · 83 · 92** (mediana 92) | 90–240 ms |

Singura rulare sub 90 (83) are LCP-ul întârziat (3,9 s față de 3,2 s), ca rulările slabe din referință; TBT-ul ei e normal. Pe calculator: 100.

---

## Faza 5 — Celelalte pagini

Același limbaj, mai discret (Q63):
- **Paginile din meniu** („În construcție”) și **paginile legale:** când ajungeți la ele din meniu, panoul urcă ușor, iar titlul intră pe rânduri.
- **La deschiderea directă a unei pagini** (adresa tastată, un link din afară), nimic din ce e pe ecran nu se ascunde: e afișat exact ca fără efecte.
- **Paginile legale** sunt comune cu pagina de pre-lansare. Primesc atributele doar când `web_effects` e pornit, deci pe pagina de pre-lansare nu se schimbă nimic, nici în cod (Q64).

**Test nou:** la deschiderea directă a Termenilor, pagina e afișată imediat; din meniu, pagina Pilates intră cu mișcarea discretă și rămâne afișată.

---

## Faza 6 — Verificarea finală

| Cerință | Dovada |
|---|---|
| Nimic eliminat sau schimbat | inventarul: **0 elemente eliminate** pe toate cele 72 de vizite (18 pagini × RO/EN × calculator/telefon), cu efectele oprite și cu ele pornite + „reducerea mișcării”. |
| Designul și conținutul neschimbate | regresia vizuală: toate paginile identice cu referința din Faza 0, cu excepția adăugirilor aprobate (secțiunile 14–19, rândul din subsol, fraza Q34). |
| „Reducerea mișcării” | nimic ascuns, nimic în mișcare; videoul nu pornește singur; capturile identice cu cele cu efectele oprite. |
| Fără JavaScript | tot conținutul vizibil (test cap-coadă). |
| Telefoane slabe, „Economizor de date” | doar fade-uri, fără video pornit singur (nivelul „lite”). |
| Tastatura | un element primit în focus apare imediat (test cap-coadă). |
| Accesibilitatea | axe fără probleme serioase pe toate paginile, cu efectele oprite și pornite; Lighthouse accesibilitate 100. |
| Testele existente | trec neschimbate. Singurele modificări: testul antetului, care numără secțiunile gata (19 din 19), și pregătirea verificării axe (așteaptă terminarea efectelor). |
| Biblioteci noi | **niciuna.** Efectele sunt CSS plus un singur script mic; GSAP n-a fost necesar. |
| Pagina de pre-lansare | neschimbată: niciun fișier al ei atins, cele 28 de teste ale ei trec neschimbate. |
| Calculele | toate valorile vin de la server; „pop”-ul și numărarea se opresc exact pe textul serverului. |
| Viteza | mediana pe telefon 92 cu efectele pornite, 93 cu ele oprite; calculatorul 100. Unele măsurători izolate coboară sub 90, cu sau fără efecte, din cauza mediului de test (Faza 0). |

**Înregistrările derulării** (Playwright, pagina principală cu efectele pornite, de sus până jos):
- [calculator](inregistrari/desktop.webm);
- [telefon](inregistrari/mobile.webm).

Se deschid în browser (Chrome, Firefox, Edge).

---

## Faza 7 — Predarea

- **Ghidul pentru proprietar:** [docs/08-deploy-si-mentenanta/03-ghid-efecte-si-video.md](../../../08-deploy-si-mentenanta/03-ghid-efecte-si-video.md). Explică pornirea și oprirea din panou, cine vede ce, schimbarea videoului, cum cereți o schimbare și ce faceți dacă ceva nu merge.
- **Pentru programatori:**
  - ADR-0023, cu secțiunea „Implementarea”;
  - `apps/web/README.md`, secțiunea „Efecte”;
  - convenția din `CLAUDE.md`;
  - comanda nouă `apps/web/scripts/record-scroll.mjs` (înregistrarea derulării).
- **Actualizate:** PROGRES, CHANGELOG, INTREBARI_DESCHISE (Q65, Q66).

### Ce aveți de decis
1. **Aprobarea** efectelor (Fazele 1–5) și a secțiunilor 14–19.
2. **Videoul:** când îl aveți, îl urcați după ghid (secțiunea 3).
3. **Q59–Q66,** fiecare cu varianta implicită; niciuna nu blochează.
4. **Efectele opționale** (Q62): vi le arătăm ca demonstrații, dacă vreți.
