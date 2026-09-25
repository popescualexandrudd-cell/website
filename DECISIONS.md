# Decizii de proiect

Acest fișier păstrează planul de design și fiecare decizie luată fără să întreb, cu motivul ei.
Ordinea: întâi planul vizual (scris înainte de cod), apoi deciziile tehnice, în ordinea în care au apărut.

> **Actualizare (redesign „zgură”, partea a III-a):** direcția vizuală din partea I (picturi
> renascentiste, pergament, minge aurie, animații GSAP) a fost înlocuită la cererea antrenorului
> cu o identitate de academie de tenis: paleta suprafeței de zgură, tipografie sans condensată și
> scene 3D în timp real. Părțile I și II rămân ca istoric; ce s-a schimbat e descris în partea a III-a.

---

## Partea I. Planul de design

### 1. Principiul

„Jocul se construiește." Pagina principală e o expoziție în zece săli. Fiecare sală are o singură
pictură, un singur gând și aceeași minge aurie. Mingea e singurul element care se mișcă între săli;
tot restul stă pe loc și se schimbă prin dizolvare, zoom sau mască, legate strict de scroll.

Ce am verificat față de secțiunile 3–5 înainte de cod:

| Tentație de șablon | Ce fac în loc |
| --- | --- |
| Etichetă cu majuscule deasupra fiecărui titlu („PROGRAME") | Nicio etichetă. Indexul din stânga spune deja unde ești. |
| Grilă de carduri pentru programe | Bandă orizontală cu picturi mici, fiecare cu legenda dedesubt, ca într-o sală de muzeu. Pe mobil, listă editorială. |
| Numere 01, 02, 03 decorative | Numerotare doar în „Cum lucrăm", pentru că e o secvență reală. |
| Săgeată lipită de textul butonului („Rezervă →") | Butoanele spun doar acțiunea. Direcția o dă poziția. |
| Fade-up la fiecare secțiune | Textul apare numai în scenele fixate, legat de scroll, ca parte din coregrafie. Paginile interioare nu au animații de apariție. |
| Gradient decorativ de fundal | Singurul gradient e cel al mingii (auriu, radial). Voalul de sub text e o pată de pergament, nu un gradient de efect. |
| Hero cu „Bun venit" | Scena 1 începe direct cu o afirmație despre învățare. |
| Monospace pentru etichete | Nu. Două familii, atât: Cormorant Garamond și Hanken Grotesk. |

### 2. Tokens

```
Culori                          Rol
--color-pergament  #ECE3CF      fundal pagini interioare, scene-schiță
--color-pergament-adanc #E2D5B8 fundal secundar (liste, câmpuri)
--color-cerneala   #1D1A15      text principal
--color-cerneala-2 #4A4338      text secundar (contrast 7,6:1 pe pergament)
--color-ultramarin #1846C4      scene de cer, linkuri, focus
--color-cer        #9CC0EC      nori, fundaluri secundare
--color-aur        #C9A13B      mingea, detalii rare (niciodată text pe pergament: 1,9:1)
--color-aur-deschis #F4DC8A     capătul luminos al gradientului
--color-aur-inchis #6E5214      capătul umbrit al gradientului
--color-zgura      #9E4A28      exclusiv informații despre terenuri (4,75:1 pe pergament)
--color-noapte     #0B1B4D      cerul din scena 10 (derivat din ultramarin)
```

Contraste verificate (WCAG 2.2, text normal ≥ 4,5:1):

- cerneală pe pergament: 13,5:1
- pergament pe ultramarin: 6,1:1
- ultramarin pe pergament (linkuri): 6,1:1
- cerneală pe cer `#9CC0EC`: 8,9:1
- pergament pe cer: 1,5:1, deci interzis; pe cer deschis textul e mereu cerneală
- zgură pe pergament: 4,75:1
- aur pe cerneală (butonul-minge din bara mobilă): 7,1:1

Tipografie, scală modulară 1,333, bază 18 px (17 px sub 768 px):

```
--step--1  13,5 px   index scene, note, metadate
--step-0   18 px     corp (interlinie 1,6, max 65ch)
--step-1   24 px     subtitluri, lead
--step-2   32 px     titluri de secțiune în paginile interioare
--step-3   42,6 px   titluri de pagină pe mobil
--step-4   56,8 px   titluri de pagină pe desktop
--step-5   75,7 px   titlurile scenelor pe desktop
```

Display: Cormorant Garamond 300/400/500 + italic, tracking −0,015em la corpuri mari.
Text: Hanken Grotesk 400/500. Butoanele: Hanken 500, 15–16 px, fără majuscule.
Italicul caligrafic (Cormorant italic 300, cu `font-feature-settings: "swsh", "salt"` unde fontul le are)
apare o singură dată: titlul scenei 9.

### 3. Grila

Desktop (≥ 1024 px): 12 coloane, margine exterioară `clamp(24px, 4vw, 64px)`, șanț 24 px.
Coloana 1 e rezervată indexului de scene (fix, stânga). Textul scenelor stă în coloanele 2–12,
aliniat la stânga, în spațiul negativ al picturii.

Tabletă (768–1023 px): 8 coloane, indexul se ascunde, rămâne linia de progres.

Mobil (< 768 px): 4 coloane, margine 20 px. Scenele se stivuiesc: imaginea 9:16 ocupă ecranul,
textul stă în treimea de jos peste un voal de pergament sau în continuarea imaginii.

Pozițiile posibile ale textului (câmpuri editabile în admin, per scenă, separat desktop/mobil):
`STANGA_SUS, STANGA_CENTRU, STANGA_JOS, DREAPTA_SUS, DREAPTA_CENTRU, DREAPTA_JOS, CENTRU_SUS, CENTRU, CENTRU_JOS`.
Stânga = coloanele 2–6, dreapta = coloanele 8–12, centru = coloanele 4–9.

### 4. Interfața permanentă

```
┌───────────────────────────────────────────────────────────────────────┐
│ (M)                                             Rezervă    Meniu      │  monogram · buton · meniu
│                                                                       │
│ Deschiderea ─                                                         │
│ Împreună                                                              │  index: numele scenelor,
│ Filozofia                                                             │  o linie verticală de progres,
│ Metoda                                                                │  scena curentă în cerneală plină,
│ Programe                                                              │  restul la 60% opacitate
│ ...                                                                   │
└───────────────────────────────────────────────────────────────────────┘
```

UI-ul își schimbă tonul (cerneală sau pergament) după scena curentă, prin `data-tone` pe `<html>`.
Meniul e un overlay pe pergament, cu linkuri mari în Cormorant 400, câte unul pe rând.
Pe mobil, după prima scenă, apare jos o bară fixă: „Rezervă” (cerneală plină) și „WhatsApp”.

### 5. Scenele, una câte una

Legendă: `▓` zonă încărcată a picturii, `●` mingea, `░` voal local de pergament, `T` text.
Coordonatele mingii sunt procente din imagine; ele sunt câmpuri editabile (`ballX`, `ballY`, `ballSize`),
ca mingea călătoare să aterizeze exact peste mingea pictată când se schimbă imaginea.

**Scena 1 · Deschiderea** · tranziție de ieșire: zoom lent spre minge

```
Desktop 1440×900                                   Mobil 390×844
┌─────────────────────────────────────────────┐    ┌──────────────┐
│ (M)                          Rezervă  Meniu │    │(M)     Meniu │
│ index                         ▓▓▓▓▓▓        │    │    ▓▓▓▓▓     │
│      T Tenisul se învață     ▓▓▓▓▓▓▓▓       │    │   ▓▓▓▓▓▓▓    │
│      T lovitură cu lovitură. ▓▓ ●▓▓▓▓       │    │   ▓▓●▓▓▓▓    │
│      t Nume, antrenor...     ▓▓▓▓▓▓▓▓▓      │    │   ▓▓▓▓▓▓▓    │
│      [Rezervă o lecție]       ▓▓▓▓▓▓▓       │    │░T Tenisul se░│
│                                ▓▓▓▓▓        │    │░t Nume, ... ░│
└─────────────────────────────────────────────┘    │░[Rezervă]   ░│
 text: STANGA_CENTRU, cerneală pe tencuială caldă   └──────────────┘
 minge: 64%, 50%                                     text: CENTRU_JOS
```

**Scena 2 · Împreună** · ieșire: zoom prin minge, spre albastru

```
┌─────────────────────────────────────────────┐    ┌──────────────┐
│                                             │    │              │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ● ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓      │    │▓▓▓▓▓ ● ▓▓▓▓▓ │
│ ▓▓▓ mâna matură   mâna tânără ▓▓▓▓▓         │    │▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│                                             │    │              │
│      T Eu aduc metoda.                      │    │ T Eu aduc    │
│      T Tu aduci răbdarea.                   │    │ T metoda...  │
│      t Progresul se vede...                 │    │ t Progresul  │
└─────────────────────────────────────────────┘    └──────────────┘
 text: STANGA_JOS · minge 50%, 42%                    text: CENTRU_JOS
```

**Scena 3 · Filozofia** · mingea se compune din puncte halftone; ieșire: norii trec prin cadru

```
┌─────────────────────────────────────────────┐    ┌──────────────┐
│      ☁           ☁                          │    │  ☁      ☁    │
│      T Un joc bun e făcut        · · ·      │    │     ·:●:·    │
│      T din lucruri mici.       · :●: ·      │    │              │
│      t Priza. Pasul de...        · · ·      │    │T Un joc bun  │
│            ☁                ☁               │    │t Priza. ...  │
└─────────────────────────────────────────────┘    └──────────────┘
 text: STANGA_CENTRU, pergament pe ultramarin · minge 60%, 44%
```

**Scena 4 · Metoda** · două picturi (schele, apoi pergamentul); ieșire: pergamentul umple ecranul

```
┌─────────────────────────────────────────────┐    ┌──────────────┐
│ ░░░░░░░░░░░░░░░░░         ▓▓▓▓▓▓▓▓▓▓        │    │   ▓▓▓●▓▓▓    │
│ ░T Cum lucrăm    ░      ▓▓▓  ●  ▓▓▓▓        │    │   ▓▓▓▓▓▓▓    │
│ ░1 Evaluare ...  ░     ▓▓▓▓▓▓▓▓▓▓▓▓▓        │    │T Cum lucrăm  │
│ ░2 Plan ...      ░      ▓▓ schele ▓▓        │    │1 Evaluare    │
│ ░3 Antrenament   ░      ▓▓▓▓▓▓▓▓▓▓▓         │    │2 Plan        │
│ ░4 Verificare    ░                          │    │3 ...  4 ...  │
└─────────────────────────────────────────────┘    └──────────────┘
 text: STANGA_CENTRU, pe voal; pașii apar pe rând, legat de scroll
```

**Scena 5 · Programele** · bandă orizontală fixată pe pergament; mingea sare între picturi

```
┌─────────────────────────────────────────────┐    ┌──────────────┐
│ T Pentru cine   ┌────┐  ┌────┐  ┌────┐  ┌── │    │T Pentru cine │
│                 │ ▓● │  │ ▓▓ │  │ ▓▓ │  │ ▓ │    │┌───┐ Mini-   │
│                 │ ▓▓ │  │ ▓● │  │ ▓▓ │  │ ▓ │    ││▓● │ tenis   │
│                 └────┘  └────┘  └────┘  └── │    │└───┘ 4–7 ani │
│                 Mini-   Grupe   Adulți      │    │┌───┐ Grupe   │
│                 tenis   copii   începători  │    ││▓▓ │ copii   │
│                 4–7 ani 8–16    60 min      │    │└───┘ ...     │
│                 de la…  de la…  de la…      │    │              │
└─────────────────────────────────────────────┘    └──────────────┘
 scroll vertical → mișcare orizontală a benzii       listă verticală, fără fixare
```

**Scena 6 · Terenul** · liniile terenului se desenează; schița devine mozaic; ieșire: dizolvare

```
┌─────────────────────────────────────────────┐    ┌──────────────┐
│    ┌──────────┬──────────┐    T Unde jucăm  │    │ ┌────┬────┐  │
│    │  ┌───────┼───────┐  │    t Zgură: 4    │    │ │  ┌─┼─┐  │  │
│    │  │       ●       │  │    t Hard: 2     │    │ │  │ ● │  │  │
│    │  └───────┼───────┘  │    t Nocturnă... │    │ └──┴─┴─┴──┘  │
│    └──────────┴──────────┘    Vezi facilit. │    │T Unde jucăm  │
└─────────────────────────────────────────────┘    └──────────────┘
 text: DREAPTA_CENTRU · informațiile de teren în zgură
```

**Scena 7 · Prima lecție** · același mozaic, cadru mai larg; ieșire: mască de pensulă spre cer

```
┌─────────────────────────────────────────────┐    ┌──────────────┐
│                           ┌──────────────┐  │    │ ┌──────────┐ │
│ T Prima lecție este       │ ▓▓▓▓▓▓▓▓▓▓▓▓ │  │    │ │ ▓▓▓●▓▓▓▓ │ │
│ T o evaluare.             │ ▓▓▓▓▓●▓▓▓▓▓▓ │  │    │ └──────────┘ │
│ t [prima lecție] Vedem... │ ▓▓▓▓▓▓▓▓▓▓▓▓ │  │    │T Prima lecție│
│ Vezi prețurile            └──────────────┘  │    │t ...         │
└─────────────────────────────────────────────┘    └──────────────┘
 mozaicul se micșorează la ~62% și se așază la dreapta; text STANGA_CENTRU
```

**Scena 8 · Locurile** · nori în parallax; ieșire: apare curcubeul

```
┌─────────────────────────────────────────────┐    ┌──────────────┐
│  ☁                              ▓▓●▓▓       │    │      ▓▓●▓▓   │
│      T Lucrez cu puțini elevi.  ▓●▓▓▓●      │    │      ▓▓▓▓▓   │
│      t Ca fiecare să primească   ▓▓▓        │    │       ▓▓▓    │
│      t Locuri libere în mai: 7  ▓▓▓▓▓       │    │T Lucrez cu   │
│                     ☁            ▓▓▓        │    │t Locuri: 7   │
└─────────────────────────────────────────────┘    └──────────────┘
 text: STANGA_CENTRU, cerneală pe cer deschis
```

**Scena 9 · Întrebările** · curcubeu, apoi ramuri; textul curge liber peste fundalul fix

```
┌─────────────────────────────────────────────┐    ┌──────────────┐
│ ▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │    │░░░░░░░░░░░░░░│
│ ▓▓●▓▓▓▓▓░ T Întrebat înainte ░▓▓▓●▓▓▓▓▓▓▓▓  │    │░T Întrebat  ░│
│ ▓▓▓▓▓▓▓▓░   de prima lecție  ░▓▓▓▓▓▓▓▓▓▓▓▓  │    │░+ Ce echip. ░│
│ ▓▓▓▓▓▓▓▓░ + Ce echipament... ░▓▓▓▓▓▓▓▓▓▓▓▓  │    │░+ De la ce  ░│
│ ▓▓▓▓▓▓▓▓░ + De la ce vârstă  ░▓▓▓▓▓▓▓▓●▓▓▓  │    │░„recenzie”  ░│
└─────────────────────────────────────────────┘    └──────────────┘
 text: CENTRU, pe o coloană de pergament; singurul titlu în italic caligrafic
```

**Scena 10 · Constelația** · cerul se întunecă; mingea devine stea

```
┌─────────────────────────────────────────────┐    ┌──────────────┐
│        ✦ · · ✦                              │    │   ✦ · ✦ ·    │
│      ✦       · ●    T Următoarea lovitură   │    │ ✦      ●     │
│   ✦            ·    T e a ta.               │    │T Următoarea  │
│  ▓▓                 [program ▾]             │    │[program ▾]   │
│ ▓▓▓▓ figura         [10:00][11:10][17:00]   │    │[10:00][11:10]│
│ ▓▓▓▓▓               tel · WhatsApp · email  │    │tel · WhatsApp│
└─────────────────────────────────────────────┘    └──────────────┘
 text: DREAPTA_CENTRU, pergament pe noapte
```

### 6. Mișcarea

- Scenele au un „stage” lipit (`position: sticky`) cu straturile de imagine suprapuse;
  textele sunt în fluxul normal al documentului, peste stage. Asta ține textul accesibil:
  ordinea de tab e ordinea de citire, nimic nu e ascuns în straturi invizibile.
- Mingea călătoare e un strat fix. În interiorul unei scene stă exact peste mingea pictată
  și e aproape invizibilă; în tranziții preia rolul și zboară spre mingea scenei următoare.
- Tranzițiile sunt un tip editabil (`Scene.transition`): `DIZOLVARE`, `ZOOM_LENT`, `ZOOM_MINGE`,
  `NORI`, `PERGAMENT`, `MASCA_PENSULA`, `CURCUBEU`, `NOAPTE`. Fiecare e o funcție care primește
  stratul care iese, stratul care intră și poziția mingii.
- Singura animație autonomă: norii derivă lent (CSS, 90–140 s pe ciclu).
- `prefers-reduced-motion`: fără stage, fără minge, fără shader; fiecare scenă e imagine statică
  urmată de text.
- Sub 768 px: fără pinning, fără shader, fără minge călătoare; imaginile 9:16 se dizolvă simplu.

### 7. Paginile interioare

```
┌─────────────────────────────────────────────┐
│ (M)                          Rezervă  Meniu │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  pictura-antet, 16:9 tăiată la ~55vh
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│                                             │
│   T Programe                                │  titlu --step-4, coloanele 2–8
│   t intro pe o coloană îngustă              │
│   ─────────────────────────────────────     │
│   Mini-tenis              4–7 ani · 45 min  │  listă editorială: rânduri cu filet
│   Descriere scurtă...     de la 250 lei     │  subțire, nu carduri
│   ─────────────────────────────────────     │
└─────────────────────────────────────────────┘
```

---

## Partea a II-a. Decizii tehnice

1. **Next.js 16.3.6** (ultima stabilă la instalare), React 19, App Router, Server Actions.
   `middleware.ts` se numește acum `proxy.ts` în Next 16; acolo stau i18n și CSP cu nonce.
2. **TypeScript 5.9.3**, nu 6.0 sau 7.0. TypeScript 7 (portul nativ) nu are încă API-ul pe care îl
   folosesc typescript-eslint și verificarea de tipuri din Next; 6.0 schimbă valori implicite
   (`types: []`) și e la limita suportului typescript-eslint (`<6.1`). 5.9 e ultima versiune pe care
   tot ecosistemul o suportă fără rezerve.
3. **ESLint 9**, nu 10: `eslint-plugin-react` (inclus în `eslint-config-next`) nu e compatibil cu 10.
4. **Prisma 7.10** cu `@prisma/adapter-pg` (clientul fără motor Rust). Eticheta `latest` a CLI-ului
   indica un RC 8.0; am fixat 7.10.0, ultima versiune stabilă.
5. **Autentificare proprie** în loc de Better Auth / Auth.js. Auth.js nu permite sesiuni în baza de date
   cu furnizorul Credentials (forțează JWT), iar Better Auth aduce tabele și fluxuri de care nu avem
   nevoie (cont, verificare email, OAuth). Implementarea urmează modelul recomandat după retragerea
   Lucia: token aleator de 32 de octeți în cookie `httpOnly`, `secure`, `sameSite=lax`, stocat în
   baza de date doar ca SHA-256; parole argon2id (`@node-rs/argon2`); sesiune regenerată la fiecare
   login; blocare temporară după încercări greșite.
6. **Constrângerea de excludere** folosește `tstzrange("startsAt", "blockedUntil")`, unde
   `blockedUntil = endsAt + pauza dintre lecții` la momentul rezervării. Cu `endsAt` simplu, două cereri
   simultane ar putea lăsa două lecții lipite, fără pauză; așa, pauza e garantată de baza de date.
   Constrângerea se aplică doar lecțiilor exclusive (fără `groupScheduleId`) în stările active.
   În plus, crearea rezervărilor ia un `pg_advisory_xact_lock`, ca verificarea capacității grupelor
   să fie și ea sigură la cereri simultane.
7. **Engleza folosește căi traduse** (`/en/programs`, `/en/pricing`), nu căile românești sub `/en`,
   pentru SEO și pentru că un vizitator englez citește adresa.
8. **Modele adăugate** față de secțiunea 8: `LegalPage` (paginile legale sunt conținut editabil,
   cu versiune și marcajul „De verificat de un jurist"), `PageHeader` (titlul, introducerea și
   pictura-antet ale fiecărei pagini interioare, ca antrenorul să poată schimba orice text și orice
   imagine), `RateLimit` (limitare de rată în Postgres, comună aplicației și worker-ului).
9. **Configurația din secțiunea 0** stă în `config/antrenor.yml`, citită de seed. Orice valoare care
   încă are paranteze pătrate devine `[DE COMPLETAT]`. Seed-ul creează doar ce lipsește (nu suprascrie
   ce ai editat în admin); `npm run db:reset` reconstruiește totul din fișier.
10. **Prețurile lipsă** sunt `NULL` în baza de date și se afișează ca `[DE COMPLETAT]`; nu pun un preț
    inventat. JSON-LD omite prețul când lipsește.
11. **Node 22 LTS** în Docker, aceeași versiune ca în mediul de dezvoltare și în CI.
12. **Playwright 1.56.1**, fixat pe versiunea browserelor preinstalate în mediul de lucru; în CI se
    instalează browserul potrivit automat.
13. **„Locuri libere în [luna curentă]: N"** numără intervalele libere de lecție individuală de 60 de
    minute rămase în luna curentă, fără suprapuneri și cu pauza inclusă, plus locurile libere din
    grupe. Numărul e cinstit doar dacă disponibilitatea din admin reflectă timpul deschis pentru
    elevi noi, nu tot programul de lucru; asta e explicat în `GHID-ADMIN.md`.
14. **Grupele** au un câmp `membersCount` (elevii obișnuiți, întreținut de antrenor). Locuri libere la o
    ședință = capacitate − membri − cereri active pentru acea ședință.
15. **Butoanele din emailul antrenorului** (confirmă / refuză) duc la o pagină cu token semnat HMAC,
    valabil 7 zile, care cere o apăsare de confirmare (POST). Un GET nu schimbă nimic, pentru că
    scanerele de email deschid automat linkurile.
16. **Fișierele încărcate** stau în volumul `media`, servit de Caddy direct (`file_server`, fără
    execuție). În dezvoltare le servește o rută Next care citește același director.
17. **Paginile publice se randează la cerere** (datele vin din Postgres, editate din admin), cu
    `React.cache` pentru deduplicare. Build-ul Docker nu are nevoie de baza de date.
18. **Previzualizarea** folosește `draftMode()` din Next: din admin pornești previzualizarea și vezi
    site-ul cu ciornele și elementele inactive, cu o bandă „Previzualizare" sus.
19. **Harta** e un iframe OpenStreetMap încărcat doar la click (nu cere cont, nu setează cookie-uri de
    marketing), cu link spre Google Maps pentru navigație.
20. **`config/antrenor.yml` are în plus câmpul `localitate`** la locație: titlurile SEO locale
    („Antrenor de tenis în [localitate]") au nevoie de oraș separat de adresa completă.
21. **Valorile opționale** din configurație („[opțional: …]", „[url sau gol]") rămân goale, nu devin
    `[DE COMPLETAT]`: un link de Instagram „de completat" n-ar avea sens pe site.
22. **Serviciile condiționate** („[Racordare rachete, dacă e cazul]") apar cu numele lor și cu
    descrierea `[DE COMPLETAT]`, ca antrenorul să le confirme sau să le șteargă. Nu le prezint ca fapte.
23. **Orarul grupelor din seed este o propunere** (marți/joi 17:00 mini-tenis etc.), în intervalul de
    lucru din configurație. E listat în `CONTENT-TODO.md` ca de verificat.
24. **`npm run db:reset`** folosește `prisma migrate reset`. Prisma 7 refuză să ruleze această comandă
    când detectează un agent AI fără acordul explicit al utilizatorului. Am verificat echivalentul pe
    o bază nouă: `migrate deploy` + seed rulat de două ori (a doua rulare nu creează nimic).
25. **Stripe nu este implementat**: configurația are `plata_online_stripe: false`. Un comutator fără
    modul în spate ar fi fost un stub. Limitarea și pașii de adăugare sunt în raportul final.
26. **Pictura scenei 3 (`03-cer`) nu conține mingea.** În scena 3 mingea se compune pe site din
    puncte halftone (shader). O minge pictată ar concura cu ea. În variantele mobilă și statică,
    aceeași minge e desenată în CSS peste pictură. Promptul din `docs/DIRECTIE-ARTISTICA.md` e ajustat.
27. **Terenul din scenele 6–7 e vertical și centrat** (vedere de sus, lungimea pe verticală, 80% din
    înălțimea picturii). Așa schița, mozaicul și liniile desenate pe scroll se suprapun exact, iar
    textul are loc de o parte și de alta.
28. **Tranzițiile sunt generice**: fiecare tip (`DIZOLVARE`, `ZOOM_LENT`, `ZOOM_MINGE`, `NORI`,
    `PERGAMENT`, `MASCA_PENSULA`, `CURCUBEU`, `NOAPTE`) funcționează între oricare două scene, deci
    antrenorul poate schimba tipul sau ordinea scenelor din admin fără cod.
29. **Imaginile din stage se descarcă doar în modul cinematic** (`<source media>` cu interogarea
    cinematică și un pixel transparent în rest): pe mobil și cu reduced-motion nu se descarcă nimic
    în plus. GSAP, Lenis și shader-ul se încarcă dinamic, tot doar în modul cinematic.
30. **Suprapunerile SVG** (liniile terenului, constelația, curcubeul, masca de pensulă) folosesc
    `viewBox` 2560×1440 cu `preserveAspectRatio="xMidYMid slice"`, adică exact aceeași încadrare ca
    `object-fit: cover` a picturilor 16:9.
31. **„Locuri libere în septembrie: 81"** cu datele din seed: disponibilitatea din seed e tot programul
    de lucru (07–21). Numărul devine realist când antrenorul setează în admin doar timpul liber pentru
    elevi noi (vezi decizia 13).
32. **Editorul de conținut e generic** (`lib/admin/resources.ts`): fiecare tip de conținut e descris
    o singură dată prin câmpuri (text, text traductibil RO/EN, Markdown cu previzualizare, listă,
    număr, preț, dată, oră, alegere, relație, imagine, pictură). Aceeași descriere generează
    formularul, validarea pe server și lista. Serverul citește doar câmpurile declarate, deci o
    cerere modificată nu poate scrie alte coloane (ordinea, id-ul). Adăugarea unui câmp nou înseamnă
    o linie în registru, nu un formular nou.
33. **Scenele și antetele de pagină nu se pot adăuga sau șterge din admin**, doar edita și reordona
    (scenele) sau ascunde. Fiecare scenă are o componentă și o coregrafie proprie; o scenă „nouă”
    fără cod n-ar avea ce afișa.
34. **Ștergerile care ar strica istoricul sunt refuzate cu explicație**: un program cu rezervări, o
    ședință de grupă cu rezervări (setarea `groupScheduleId` la NULL le-ar transforma în lecții
    exclusive suprapuse, pe care constrângerea de excludere le-ar respinge oricum), ultima locație,
    o imagine folosită pe site. În locul ștergerii, mesajul propune debifarea „Activ”.
35. **Versiunea politicii de confidențialitate crește automat** (data zilei) când textul paginii legale
    se schimbă, pentru că fiecare acord salvat (rezervare, contact, newsletter) păstrează versiunea.
36. **Formularele nu se golesc la o eroare de validare.** React 19 resetează automat formularele cu
    `action` după fiecare trimitere; `useFormAction` (`components/ui/useFormAction.ts`) trimite prin
    `startTransition` și păstrează ce a scris utilizatorul. Fără JavaScript, formularul trimite nativ.
37. **Încărcarea imaginilor**: tipul real se verifică prin decodare cu sharp (nu după extensie sau
    MIME), SVG e refuzat (poate conține scripturi), limita e 10 MB, originalul nu se păstrează:
    se salvează doar variantele AVIF/WebP re-encodate (fără EXIF/GPS), cu nume aleatorii, în
    `MEDIA_DIR`. În producție Caddy le servește direct; ruta `/media/[...path]` le servește în
    dezvoltare și refuză orice cale care iese din director.
38. **Acțiunile din liste redirecționează înapoi cu `?ok=`** (marcat citit, arhivat, șters): rândul
    poate ieși din filtrul curent, iar mesajul de confirmare trebuie să rămână vizibil.
39. **Ștergerea datelor unui client (GDPR)** anonimizează rezervările (rămân data, programul și
    starea, pentru statistică și evidența contabilă) și șterge mesajele, cererile de pe lista de
    așteptare, abonarea, recenziile legate și copiile emailurilor. E refuzată cât timp clientul are
    lecții viitoare active, ca să nu rămână un interval blocat fără persoană de contact.
40. **Exportul newsletter-ului include linkul personal de dezabonare** al fiecărui abonat: site-ul nu
    trimite newslettere, antrenorul folosește un serviciu extern (Brevo, Mailchimp) și pune linkul în
    fiecare email.
41. **Regula `no-html-link-for-pages` e oprită doar în admin**: ruta `[...rest]` face ca orice URL
    intern să pară o pagină, iar descărcările (CSV, JSON) și previzualizarea trebuie să fie `<a>`
    simple, nu `<Link>` (care ar prelua și naviga pe client).
42. **Imaginile generate nu sunt în git** (`public/art/generated/`, manifestul, iconițele PNG): sunt
    rezultatul lui `npm run images` din sursele din `art-src/` și `app/icon.svg`. Se generează singure
    la `npm run dev` și `npm run build` când lipsesc (și în build-ul Docker). Motiv: fișierele binare
    comprimate conțin inevitabil octeți care, pentru `grep`, arată ca literele s și t cu sedilă, iar verificarea diacriticelor
    din criteriile de acceptare trebuie să nu găsească nimic în depozit. Manifestul se citește la
    rulare, deci verificarea tipurilor nu depinde de imagini.
43. **Imaginile Open Graph** se generează la cerere de `/api/og?path=…&lang=…` (next/og, 1200×630,
    cache o zi). Titlul se caută în baza de date după calea paginii, nu se ia din adresă, ca nimeni
    să nu poată genera imagini cu text arbitrar pe domeniul antrenorului. Fontul e Cormorant din
    `@fontsource`; subsetul latin-ext e declarat primul, altfel Satori desenează „ă” cu fontul implicit.
44. **Fonturi**: se preîncarcă doar Hanken Grotesk (textul), subsetul latin. Cormorant și subsetul
    latin-ext (ă, ș, ț) se descarcă imediat ce pagina le folosește (`unicode-range`), cu fallback
    ajustat la aceleași dimensiuni (CLS 0). Pe mobil, preîncărcarea tuturor celor șase fișiere lua
    lățime de bandă primei picturi.
45. **Prima pictură se preîncarcă din `<head>`** (`<link rel="preload" as="image" imagesrcset media>`),
    separat pentru telefon (9:16) și desktop, astfel că descărcarea nu așteaptă după scripturi.
46. **Widget-ul de rezervare de pe pagina principală se încarcă doar la apropiere** (IntersectionObserver,
    1500 px înainte); fără JavaScript rămâne un link către pagina de rezervare.
47. **`content-visibility: auto`** pe scenele de sub prima, în afara modului cinematic: timpul de
    stil și layout pe mobil a scăzut de la ~670 ms la ~230 ms (Lighthouse, CPU încetinit 4×).
48. **Măsurători Lighthouse (mobil)**: pe serverul de producție local (HTTP/1.1, fără Caddy),
    simularea standard dă 89–96 la performanță, 100 la accesibilitate, bune practici și SEO;
    cu încetinire reală (`--throttling-method=devtools`) pagina principală are 98 (LCP 1,8 s).
    Variația de ±3 puncte vine din simulare. JavaScript la încărcarea paginii principale: 160 KB gzip
    pe mobil, 220 KB pe desktop (inclusiv GSAP, încărcat dinamic).
49. **`npm audit`**: 4 vulnerabilități „high” veneau din CLI-ul Prisma (`mysql2`, nefolosit, și
    `deepmerge-ts`). Le-am rezolvat cu `overrides` (versiuni corectate, aceeași interfață);
    `prisma validate`, `migrate status` și testele trec. Rezultat: 0 vulnerabilități.
50. **Imaginea de producție** (`Dockerfile`): Node 22 Alpine, patru etape. Imaginea finală conține
    doar serverul Next.js `standalone` (cu modulele pe care le folosește efectiv), fișierele statice,
    worker-ul/seed-ul/admin-create compilate cu esbuild în `dist/` și CLI-ul Prisma pentru migrări,
    într-un director separat. 728 MB față de 1,74 GB cu toate dependențele de producție.
    Rulează ca utilizatorul `app` (uid 1001), cu `HEALTHCHECK` pe `/api/health`.
51. **La pornire** (`docker/app/entrypoint.sh`): `prisma migrate deploy`, apoi seed-ul doar dacă baza
    e goală (`--if-empty`). La prima instalare site-ul are conținut fără alt pas; după aceea seed-ul
    nu mai atinge nimic, deci ce șterge antrenorul din admin nu reapare.
52. **Clientul Prisma se creează la prima folosire** (proxy în `lib/db.ts`), ca `next build` să
    funcționeze fără `DATABASE_URL` (în Docker, build-ul nu are acces la bază).
53. **Compose**: baza de date e doar în rețeaua `backend`, marcată `internal` (fără porturi publicate
    și fără ieșire în internet); `app` și `worker` au sistemul de fișiere read-only (plus `tmpfs`
    pentru `/tmp` și cache), `cap_drop: ALL`, `no-new-privileges`, jurnale rotite (5 × 10 MB).
54. **Caddy**: HTTPS automat, HTTP/2 și HTTP/3, compresie zstd/gzip, `www` → domeniul simplu,
    `/media` servit direct din volum (read-only) cu cache de un an, limită de 12 MB la încărcare.
    **Fără jurnal de acces**: IP-urile vizitatorilor nu se păstrează (erorile rămân în jurnal).
    `/_next/static` și `/art/generated` au deja `immutable` de la Next.js.
55. **Backup**: container separat (Postgres 16 Alpine + rclone copiat din imaginea oficială, fără
    `apk`), programat zilnic la 03:30 ora României; `pg_dump` în format custom + arhiva imaginilor,
    cu data și ora până la secundă în nume; 14 zile; `rclone sync` opțional. Restaurarea face întâi
    un backup „inainte-de-restaurare”, apoi `pg_restore --clean --single-transaction`. Testul a
    prins o eroare reală: fără secunde în nume, backup-ul de siguranță suprascria backup-ul din
    același minut.
56. **Volumul `media` e partajat** de app (scrie), Caddy (citește) și backup (arhivează/restaurează).
    Imaginea de backup creează `/media` cu proprietarul 1001, iar backup-ul pornește după aplicație,
    ca volumul nou să aparțină mereu utilizatorului aplicației (testul inițial a găsit volumul
    creat ca root, deci încărcările eșuau).
57. **`deploy.sh`**: backup, păstrează imaginea curentă ca `antrenor-tenis-app:anterior`,
    construiește, pornește și așteaptă starea „healthy” (5 minute); altfel revine la imaginea
    anterioară. Migrările de bază de date nu se anulează automat: backup-ul făcut chiar înainte se
    restaurează cu `restore.sh` (mesajul scriptului spune asta).
58. **CI** (`.github/workflows/ci.yml`): verificarea diacriticelor, lint, tipuri, teste cu PostgreSQL,
    build, e2e cu Mailpit, `npm audit --audit-level=critical`, build-ul imaginii Docker; deploy prin
    SSH doar dacă variabila `DEPLOY_ENABLED` e `true`.
59. **Capturile din `GHID-ADMIN.md`** sunt SVG-uri care conțin imaginea JPEG în base64
    (`scripts/docs-screenshots.mjs`): se afișează în GitHub și în orice browser, iar depozitul rămâne
    doar cu fișiere text (vezi decizia 42).
60. **Verificarea în acest mediu**: rețeaua de aici trece printr-un proxy cu certificat propriu și
    blochează `dl-cdn.alpinelinux.org`. Imaginea s-a construit cu o variantă a Dockerfile-ului care
    adaugă doar certificatul proxy-ului (nu e în depozit); stack-ul complet a pornit dintr-o copie
    curată a depozitului, cu HTTPS pe `localhost` (certificat intern Caddy), iar rezervarea,
    confirmarea din admin, emailurile, încărcarea imaginilor, backup-ul și restaurarea au funcționat.

---

## Partea a III-a. Redesign: paleta de zgură, tipografie de academie, scene 3D

Cererea: fundal în culorile zgurii (portocaliu, cărămiziu, galben cald), fonturi simple și
moderne ca la marile academii, animații 3D realiste în locul celor abstracte, o secțiune personală
elegantă pentru fotografia antrenorului, texte de specialitate despre Alexandru Daniel Popescu și un
audit al codului. Site-ul de referință indicat (Rafa Nadal Academy) nu a putut fi deschis din acest
mediu (rețea blocată), așa că structura urmează convențiile comune ale academiilor mari: antet
închis la culoare cu navigație orizontală, hero pe tot ecranul cu titlu mare în majuscule, cifre-
cheie sub hero, secțiuni alternante deschis/închis, carduri de program, cale de dezvoltare pe etape.

61. **Paleta** (tokens în `app/globals.css`): nisip `#F6EFE6` (fundal), nisip adânc `#ECDFCD`,
    zgură `#B94C22` (butoane, accente; contrast 5,1:1 cu textul crem), zgură adâncă `#9A3D19`
    (linkuri, 6:1 pe nisip), cărămidă închisă `#2A130B` (antet, subsol, secțiuni închise), galben
    cald `#F2B134` (doar decor și text mare pe fond închis) și galbenul mingii `#D9E453` (puncte de
    listă, pictograma). Textul mic pe zgură e crem, niciodată galben (3,7:1 nu ajunge).
62. **Tipografie**: Barlow Condensed 700 pentru titluri, cu majuscule, ca tabelele de scor și
    semnalistica de academie; Inter (variabil) pentru text. Ambele au ă â î ș ț în subsetul
    latin-ext (verificat în fișierele fontului). Înălțimea rândului la titluri e 1,06–1,14, nu 0,9:
    virgula de sub Ș/Ț atingea altfel rândul următor.
63. **Motorul 3D** (`components/court3d/engine/`, three.js 0.186): un singur context WebGL pentru
    toată pagina; pânza se mută în zona 3D cea mai vizibilă (hero sau laborator) și nu desenează
    nimic când nicio zonă nu e pe ecran sau fila e ascunsă. Terenul are dimensiunile ITF
    (23,77 × 10,97 m, fileu 0,914 m la centru și 1,07 m la stâlpi, cu săgeată), texturi procedurale
    (zgură cu urme de perie și de alunecare, linii prăfuite, fileu, fetru cu cusătură), soare de
    după-amiază cu umbre, cer și chiparoși. Nicio imagine nu se descarcă.
64. **Fizica mingii**: gravitație, rezistența aerului (Cd 0,55), efectul Magnus cu
    CL = S/(2S+1), ricoșeu pe zgură cu restituție 0,78 și frecare Coulomb 0,7 care transformă
    rotația (liftatul „mușcă” și sare, tăiatul alunecă). Fiecare lovitură e calculată prin
    bisecție ca să aterizeze exact unde a țintit jucătorul și să treacă fileul; urma pe zgură și
    praful apar la fiecare ricoșeu. Testele unitare verifică dimensiunile, efectul liftatului,
    ricoșeul și precizia țintirii.
65. **Jucătorii**: manechine biomecanice din forme netede, animate pe fazele reale ale loviturilor
    (dreapta liftată, rever cu două mâini, serviciu), cu cinematică inversă pentru brațe și
    picioare: cheile descriu unde e mâna pe mâner, orientarea rachetei și a fețelor ei, rotația
    bazinului și a umerilor și poziția picioarelor; coatele și genunchii se calculează. Capul
    urmărește mingea, picioarele stau pe zgură și pășesc doar când corpul are nevoie. În meci,
    jucătorul prezice traiectoria, face split-step, aleargă spre minge, alege dreapta sau reverul,
    iar lovitura e sincronizată ca racheta să întâlnească mingea exact la impact.
66. **Limita realismului, spusă deschis**: oameni fotorealiști (piele, fețe, haine care se mișcă)
    cer modele scanate și animații înregistrate prin motion capture, livrate de un artist 3D.
    Proiectul nu inventează așa ceva: manechinul biomecanic e o alegere asumată (arată mecanica
    loviturii, nu un personaj) și e prezentat ca atare pe site („Model biomecanic”).
67. **Performanța 3D**: three.js e un fișier separat (≈ 159 KB gzip) încărcat doar după ce
    pagina s-a încărcat și browserul e liber (sau la prima interacțiune), doar dacă zona 3D e
    aproape de ecran și dispozitivul are WebGL 2 cu accelerare hardware. Randarea software
    (SwiftShader, llvmpipe) primește afișul static. Construcția scenei se face în pași cu pauze,
    iar shaderele se compilează asincron. Rezoluția se adaptează la durata cadrelor; dacă nici la
    rezoluția minimă nu ține pasul, animația se oprește pe ultimul cadru. Pe telefoane și
    dispozitive modeste: umbre 1024 px și 30 de cadre pe secundă. Obiectele statice sunt comasate
    (stâlpii gardului într-un singur apel de desenare, mobilierul în două). JavaScript-ul inițial
    specific paginii principale: 4,6 KB gzip (restul e comun tuturor paginilor).
68. **Accesibilitate 3D**: pânza e decorativă (`aria-hidden`), zona are o descriere text; la
    „reduced motion” meciul se oprește pe un cadru real de impact, iar laboratorul nu pornește
    singur. Laboratorul se controlează doar cu butoane și un cursor reale (tastatură, cititoare de
    ecran); fazele și explicațiile sunt text normal, utile și fără 3D.
69. **Pagina principală, secțiune cu secțiune**: hero 3D cu patru repere, antrenorul (rama foto),
    filozofia (declarație pe zgură), metoda + laboratorul tehnic, palierele de pregătire (de la
    inițiere la înaltă performanță, plus adulți), programe (carduri), baza sportivă (cu planul
    terenului la scară), prima lecție, locuri libere, întrebări, rezervare. Secțiunile se
    editează din admin (texte, butoane, ordine, vizibilitate); o secțiune nouă fără machetă
    dedicată apare ca text simplu.
70. **Secțiunea personală**: rama portret 4:5, decalată peste un bloc de zgură cu linie galbenă,
    folosește fotografia din profilul antrenorului. Până la încărcare, rama afișează un teren
    desenat și nota vizibilă „[DE COMPLETAT] Fotografia ta pe teren”, aceeași pe pagina principală
    și pe „Despre mine”.
71. **Conținut**: doar faptele date de antrenor (liceu cu program sportiv; licență UNEFS în
    performanță sportivă, specializarea tenis și performanță motrică; masterand UNEFS în
    management și marketing în structuri sportive; arbitru național FRT; curs de formare
    psihopedagogică cu atestat; 4 ani de antrenorat; copii cu rezultate la nivel național și
    european, inclusiv campioni ai României; antrenor la Elite Tenis Club, pe toate palierele).
    Ce nu s-a spus rămâne marcat: anii diplomelor, instituția care a eliberat atestatul
    psihopedagogic, adresa și localitatea clubului. Registrul: terminologie de metodică și
    biomecanică (lanț kinetic, obiective operaționale, periodizare, calități motrice, învățare
    motrică), cu fraze scurte.
72. **Date**: migrarea `redesign_3d` șterge 17 coloane și 3 enumerări folosite doar de picturi
    (poziția textului, tonul, mingea, tranzițiile, imaginile scenelor, cheile de pictură la programe
    și antete) și redenumește cheile `constelatia` → `rezervare`, `impreuna` → `antrenorul`, fără
    să atingă textele editate. Programele și antetele păstrează o fotografie opțională.
    `config/antrenor.yml` acceptă acum texte în ambele limbi (`ro:`/`en:`) și certificări cu titlu,
    emitent și an.
73. **Audit și curățenie**: avertismentul Next.js despre `package-lock.json` din folderul
    utilizatorului e rezolvat cu `turbopack.root` și `outputFileTracingRoot` fixate pe proiect;
    eliminate GSAP, Lenis, shaderul halftone, regizorul cinematic, cele 30 de compoziții SVG,
    manifestul de picturi citit de pe disc la fiecare proces și câmpul „pictură” din admin;
    `<html data-page>` și antetul `x-pathname` nu mai aveau cititor și au dispărut. Axe a găsit
    două probleme noi, rezolvate: contrastul etichetei galbene pe zgură și numele accesibil al
    linkului din antet (trebuie să conțină textul vizibil). Testele: 58 unitare și de integrare,
    10 end-to-end (inclusiv axe WCAG 2.2 AA pe toate paginile, la „reduced motion” și fără).
74. **Pagina 404** e o minge ieșită în afara terenului („Out”): același limbaj, fără imagine.

## Partea a IV-a. Programe și lecții, date club, 3D realist

75. **Programe și tipuri de lecții separate**: programul (Inițiere, Competiție, Amatori) spune ce se
    lucrează; tipul lecției (individuală, în doi, în trei, grup 4–6, analiză biomecanică) spune cu
    cine și cât costă pe oră; durata (60, 90, 120 de minute sau mai mult) se alege la rezervare.
    Orice lecție ocupă exclusiv timpul antrenorului, așa că excluderea din PostgreSQL acoperă acum
    toate rezervările active; migrarea `lesson_types` anulează grupele suprapuse rămase.
76. **Rezervarea în cinci pași** (program → lecție și durată → oră → date → confirmare), cu
    emailuri către client și antrenor; widgetul de pe prima pagină sare direct la „Datele mele”.
77. **Scena 3D realistă**: un om MakeHuman (CC0) cu schelet propriu și IK, terenul clubului
    complet, cerul fotografiat (Poly Haven, CC0) ca lumină și reflexii. Afișe WebP randate din
    aceeași scenă, pentru încărcare și fără WebGL.

## Partea a V-a. Academia: șablon pentru orice club

78. **Șablon, nu site de antrenor**: marca e clubul (nume, logo, două culori, descriere), iar
    antrenorii devin o echipă (`Coach`, cu antrenor principal unic). Migrarea `academy_template`
    mută profilul existent în echipă ca antrenor principal, cu certificările lui, și redenumește
    secțiunile păstrate (`filozofia` → `manifest`, `terenul` → `clubul`); cele scrise pentru un
    singur antrenor (antrenorul, prima lecție, locuri) dispar. `config/antrenor.yml` devine
    `config/club.yml`, cu secțiunile `club`, `antrenori` și `academie_juniori` (`SABLON.md`).
79. **Culorile clubului** sunt două variabile CSS (`--brand`, `--accent`) puse pe `<html>` din
    setări; toate tokenurile paletei se derivă din ele cu `color-mix(in oklab)`, deci admin-ul
    schimbă tot site-ul fără build. La salvare se verifică contrastul cu textul alb (7:1 pentru
    bază, 4,5:1 pentru accent), iar valorile sunt validate ca `#rrggbb` înainte să ajungă în
    atributul `style`.
80. **Doar imagini reale**: nu există fotografii de stoc sau generate. Până încarcă clubul
    fotografii și video-uri, fiecare loc arată terenul desenat în linii pe culorile clubului și o
    notă „[DE COMPLETAT]” care spune ce trebuie încărcat (`MediaFrame`).
81. **Deschiderea cinematică** (după site-urile din clipurile primite și academiile Nadal, IMG,
    Mouratoglou): video-ul clubului pe tot ecranul, titlul pe rânduri care urcă la încărcare; la
    derulare, pe 65% dintr-un ecran, video-ul se micșorează într-un cadru rotunjit și textul se
    ridică (`--hero-p`, calculat într-un singur `requestAnimationFrame`). Antetul stă peste video
    și devine opac după primii pixeli. La „reduced motion”: secțiune statică, fără animații.
82. **Video**: încărcarea trimite fișierul brut (nu un formular), scris pe disc în flux, cu limită
    de 500 MB, într-un folder ascuns pe care nici aplicația, nici Caddy nu îl servesc. Rândul
    `Media` (tip `VIDEO`, stare `IN_PROCESARE`) apare doar după încărcarea completă; conversia
    pornește cu `after()` și e revendicată atomic (`processingAt`), iar worker-ul reia la fiecare
    minut ce a rămas (inclusiv o revendicare mai veche de 30 de minute). ffmpeg: H.264 High, CRF 23,
    maximum 30 fps, 720p mereu și 1080p doar din surse mari, AAC stereo, `+faststart`, fără
    metadate și capitole (GPS-ul telefonului dispare); cadrul de previzualizare e scos din fișierul
    convertit (deja rotit corect) și codat ca imaginile (AVIF + WebP + blur). Limita de 3 minute
    ține site-ul rapid și discul mic. Originalul se șterge după conversie, reușită sau nu.
83. **Redarea**: `<video muted loop playsinline>` cu două surse alese prin `media` (1080p de la
    1100 px), pornit doar cât e pe ecran (IntersectionObserver), niciodată automat la „reduced
    motion” sau economisire de date, cu buton de pauză (WCAG 2.2.2). Ruta `/media` răspunde cu
    byte-range (206/416), necesar în Safari; în producție Caddy face același lucru. În galerie,
    video-ul pornește cu sunet doar la cerere, în fereastra de vizualizare.
84. **Academia de juniori**: grupele urmează etapele ITF „Play and Stay” (minge roșie, portocalie,
    verde, galbenă), cu descrieri generale ale etapelor; programul, taxa și locurile nu se inventează
    (rămân „[DE COMPLETAT]” sau „la cerere”). Cererea de evaluare folosește aceeași tabelă ca lista
    de așteptare (`kind = EVALUARE`), deci moștenește anonimizarea, exportul GDPR și inboxul din
    admin. Rezultatele la turnee se publică doar cu acordul părinților (verificat și la salvare,
    și la citire).
85. **Cifrele de pe prima pagină** se calculează din conținut (terenuri, terenuri acoperite, vârsta
    minimă din grupe și programe, programe, antrenori când sunt cel puțin doi), ca să nu existe
    cifre de marketing nevalidate. Numărătoarea animată pornește de la valoarea reală din HTML.
86. **Vocea**: textele site-ului vorbesc la plural, ca academie („îți răspundem”, „te anunțăm”);
    doar paginile antrenorilor și filozofia antrenorului principal rămân la persoana întâi.
    Telefonul nu mai apare în mesajele de eroare din cod: șablonul nu are date ale unui club
    anume în afara bazei de date.
87. **Fără laborator 3D**: la cererea clientului, jucătorul 3D și scena lui (three.js, modelul
    MakeHuman, cerul fotografiat, afișele) au fost scoase cu totul, împreună cu setarea care îl
    pornea (migrarea `remove_3d_lab`). Secțiunea „Metoda” rămâne cu cei patru pași; lecția
    „Analiză biomecanică” rămâne, fiind un serviciu real al clubului. Pagina principală nu mai
    încarcă nicio bibliotecă 3D, deci e mai ușoară pe telefon.

## Partea a VI-a. Asistentul AI și măsurarea campaniilor

88. **Asistentul de pe site** răspunde la întrebările părinților și ale jucătorilor (vârste, grupe,
    prețuri, program, rezervare) doar din conținutul publicat: la fiecare întrebare, serverul
    compune din baza de date un text cu contactul, baza sportivă, programele, lecțiile și
    prețurile pe durată, grupele academiei, antrenorii, regulile de rezervare, întrebările
    frecvente și paginile site-ului (`lib/assistant/knowledge.ts`). Valorile „[DE COMPLETAT]”
    apar ca „nepublicat încă”, iar instrucțiunile îi cer să spună că nu știe și să dea telefonul,
    niciodată să ghicească prețuri, ore sau locuri libere. Îi trimite pe copii spre evaluare și pe
    adulți spre rezervare; fereastra are oricum cele două butoane.
89. **Modelul**: Claude Opus 5 (`claude-opus-5`) prin SDK-ul oficial `@anthropic-ai/sdk`, cu
    răspuns în flux (NDJSON către browser), efort `low` pentru răspunsuri rapide, textul clubului
    în instrucțiunile de sistem cu prompt caching (aceleași pentru toate întrebările până se
    editează conținutul) și `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`): dacă
    modelul refuză o cerere din motive de siguranță, API-ul o reia pe modelul de rezervă
    recomandat de Anthropic. Un refuz final ajunge la vizitator ca mesaj politicos. Modelul se
    poate schimba din `ASSISTANT_MODEL` (de exemplu `claude-sonnet-5`, mai ieftin).
90. **Costuri și abuz**: întrebarea are cel mult 600 de caractere, conversația trimisă e limitată
    la ultimele 12 mesaje, răspunsul la 2000 de tokeni; 12 întrebări în 10 minute și 60 pe zi de
    la aceeași adresă IP, plus o limită pentru tot site-ul (`ASSISTANT_DAILY_LIMIT`, implicit
    400/zi). Cererile din alte site-uri sunt refuzate (Origin). Fără `ANTHROPIC_API_KEY` sau cu
    comutatorul din admin oprit, asistentul nu apare.
91. **Confidențialitate**: conversațiile nu se salvează (doar în memoria ferestrei); în jurnal
    rămân doar numărul de tokeni. Politica de confidențialitate descrie asistentul și transferul
    către Anthropic (SUA) doar când e activ, prin câmpuri care se completează singure
    (`{{sectiune.asistent}}`, `{{transfer}}`); fereastra îi roagă pe vizitatori să nu scrie date
    personale.
92. **Sursa fiecărei cereri, fără cookie-uri**: la prima încărcare, browserul citește din adresă
    etichetele UTM și clicurile pe reclame (`gclid`, `fbclid`, `msclkid`) sau, altfel, site-ul de
    unde a venit vizitatorul (căutare, rețea socială, alt site) și le ține în memorie cât navighează
    pe site. Formularele de rezervare, evaluare, listă de așteptare și contact le trimit într-un
    câmp ascuns; serverul le validează și le salvează (`attribution`), fără identificatorii
    clicurilor. Admin → Campanii numără cererile pe sursă și campanie și construiește linkuri UTM
    pentru postări, reclame și coduri QR. Cu acordul pentru statistici, sursa rezistă și la
    reîncărcarea paginii (memoria de sesiune).
93. **Google Analytics, Google Ads și Meta Pixel** se configurează din `.env` (ID-uri validate
    după format, ca un typo să nu strice pagina sau politica CSP) și se încarcă doar după acord:
    bannerul are „Accept” și „Refuz” la fel de vizibile și alegerea pe categorii (statistici,
    marketing); Google primește Consent Mode v2 cu starea aleasă. Conversiile: `booking_request`
    (rezervare), `generate_lead` (evaluare, listă, mesaj), `contact_click` (telefon, WhatsApp) și
    evenimentele asistentului; în Google Ads, eticheta de rezervare și cea de cerere; în Meta,
    `Schedule`, `Lead` și `Contact`. Retragerea acordului șterge cookie-urile Google și Meta și
    reîncarcă pagina. CSP-ul se deschide doar pentru instrumentele configurate. Fără niciun cod,
    site-ul nu arată bannerul, iar politica de cookie-uri spune asta.
94. **Paginile legale** au acum câmpuri care descriu doar instrumentele active. O ciornă pe care
    nu a editat-o nimeni și nu a verificat-o un jurist se actualizează la noua versiune a
    șablonului la pornirea serverului; una editată rămâne neatinsă.

95. **Verificarea completă** (după scoaterea laboratorului 3D): 105 pagini publice, în română și
    engleză, pe calculator și pe telefon (status, erori în consolă, cereri eșuate, imagini,
    depășiri de lățime, un singur H1, titlu și descriere, ancore), 101 pagini din admin pe ambele
    dimensiuni, testele unitare, de integrare și end-to-end, și cu asistentul și bannerul active.
    Corecturi: numerele cu „de” la 20 și peste („24 de ore”, dar „12 ore”, „o oră”) în site,
    emailuri și admin (`roCount` și plural ICU), vocea academiei („îți cerem”, „Mulțumim”),
    descrieri pentru paginile legale, tabelul de cookie-uri și tabelele din admin fără depășire
    pe telefon, întrebarea despre lecția de grup (trimitea spre un pas al rezervării din afara
    ei; migrarea `content_fixes` o corectează doar dacă textul nu a fost editat), textul despre
    tarife care nu mai presupune ce lecții sunt „de persoană”, iar rularea ffmpeg nu mai face
    ca build-ul să includă tot proiectul în imagine.

## Partea a VII-a. Site-ul clubului Elite, la nivel de academie de top

96. **Doar fapte publice**: povestea (2013, sala acoperită, școlile de peste 10 ani, turneele FRT
    și Tenis10), programul 08–23, dotările și echipa vin din prezentarea publică a clubului și din
    calendarele frt.ro și tenis10.ro (Instagram și Facebook nu se pot citi direct de aici; au fost
    verificate prin căutare). Ce nu e confirmat (tarife, anul sălii) rămâne „[DE COMPLETAT]”, iar
    antrenorii de pe site-ul actual al clubului intră nepublicați, până confirmă clubul rolurile.
97. **Structura** după academiile de top: poveste → cifre (inclusiv anii de la înființare) →
    piloni → programe → etapele academiei → „Găsește-ți programul” → filozofie → echipă → metodă →
    turnee → baza sportivă (cu închiriere) → galerie → comunitate → lecții → întrebări → rezervare.
    Secțiunile noi se creează singure pe un site existent (seed-ul completează structura lipsă),
    iar ordinea se schimbă din admin.
98. **Pagini noi**: „Închiriere teren” (cererea ajunge în Mesaje și pe email, conversia
    `court_request`), „Turnee” (model `Tournament`, admin, JSON-LD `SportsEvent` pentru edițiile cu
    date), „Școli și grădinițe” (contactul vine cu subiectul completat). Meniul pune academia,
    programele, închirierea și turneele în față.
99. **Asistentul**: pop-up-ul „Întreabă-ne ceva” apare o singură dată pe vizită (după 9 secunde
    sau o treime din pagină), cu întrebări potrivite paginii; pe telefon e un singur rând.
    Asistentul primește acum și povestea, închirierea, turneele și școlile; „Găsește-ți programul”
    îi poate trimite răspunsurile ca întrebare.
100. **Efecte**: bară de progres a lecturii, bandă cu numele turneelor, carduri care se ridică la
     hover, cronologia care apare pas cu pas, mingea animată; toate se opresc la „reduced motion”.
     **/llms.txt** descrie clubul pentru motoarele de căutare cu AI.

