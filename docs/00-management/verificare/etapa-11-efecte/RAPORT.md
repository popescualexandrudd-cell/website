# Video de prezentare și efecte la scroll: raport

> Cererea proprietarului din 30.09.2026: peste site-ul complet (Etapa 11), un video mare de prezentare și conținut care apare progresiv la derulare, cu funcții care răspund viu. Structura, designul, brandingul, textele, datele și calculele rămân neschimbate. Se lucrează în faze, fiecare aprobată separat.

| Fază | Ce conține | Starea |
|---|---|---|
| 0. Citire, inventar, referință, plan | fără modificări vizibile | **livrată, așteaptă aprobarea planului** |
| 1. Fundația | tokenii de mișcare, observatorul, CSS-ul de efecte, modul „lite”, comutatorul `web_effects`; butonul de apel și fraza Q34 la sala de evenimente | urmează |
| 2. Videoul | stratul video, scriptul, controalele, tranziția spre hală, comutatorul `web_hero_video` | urmează |
| 3. Secțiunile 14–19 | construite direct cu efecte | urmează |
| 4. Efectele pe secțiunile 1–13 | una câte una, cu interactivitatea funcțiilor | urmează |
| 5. Celelalte pagini | același limbaj de efecte, mai discret | urmează |
| 6–7. Verificarea finală și predarea | ghid pentru proprietar | urmează |

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
