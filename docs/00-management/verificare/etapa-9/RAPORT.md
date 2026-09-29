# Raport de verificare — Etapa 9 (ecranele de la terenuri și din lobby)

> Data: 29.09.2026. Branch: `claude/hopeful-euler-rguibn`. Starea: **aprobată de proprietar pe 29.09.2026**. Q55 rămâne deschisă până la răspunsul proprietarului, cu variantele implicite.

În Etapa 8 am construit Chioșcul de Plăți și afișajul cafenelei. În Etapa 9 am construit **ecranele clubului** (§8.5):
- câte un ecran la fiecare teren;
- ecranele din lobby, cafenea și de pe pasarelă.

Ecranele se actualizează singure, în câteva secunde, după orice schimbare.

## Ce s-a construit

### 1. Ecranul de la teren
În timpul unei sesiuni, ecranul arată exact ca exemplul din specificație (numele sunt cele cerute pentru datele demo):

```
TEREN 4 · 14:00–15:30 · 90 MIN · MECI OFICIAL DE LIGĂ
Popescu Alexandru Daniel   Diamant II · 67 LP · Nivel 5.2
Moșteanu Rareș             Diamant III · 12 LP · Nivel 5.0
                    vs
Jucător 3                  Platină I · 88 LP · Nivel 4.8
Jucător 4                  Diamant IV · 40 LP · Nivel 4.9
Timp rămas: 00:47 · Următorul: 15:30 Antrenament
```

- Eticheta **„Meciul zilei”** apare când e cazul.
- Un **cod QR** duce la pagina ligii de pe site. Doar vizualizare: scorurile se introduc tot numai la Chioșcul Ligii.
- **Despre jucători se văd doar datele publice** (R-012): nume, rang, LP, nivel.
- Cine nu e în ligă apare doar ca **„Jucător”**, fără nume: un invitat, cineva care nu și-a semnat acordul GDPR sau cineva care și-a retras acordul (Q55).
- **Echipele** vin, în ordine, din:
  1. meciul introdus la Chioșcul Ligii;
  2. meciul de turneu;
  3. provocarea acceptată;
  4. altfel, din ordinea în care jucătorii și-au scanat cardul la intrarea pe teren (Q55).
- **Cât terenul e liber:** un vizual „jungle” animat, ce urmează pe teren, clasamentul, evenimentele și anunțurile clubului.

### 2. Ecranele din lobby, cafenea și de pe pasarelă
Arată:
- toate terenurile: liber sau ocupat, cu cine, cât timp mai e, ce urmează;
- **Meciul zilei**;
- clasamentele: dublu, perechi, simplu;
- **Regii Junglei**;
- evenimentele;
- **numerele comenzilor de la cafenea gata de ridicat**, în câteva secunde după ce barul le marchează „E gata”.

### 3. Mereu la zi, niciodată gol
- **Actualizarea e live.** Orice rezervare, intrare pe teren, schimbare în ligă sau comandă de cafenea ajunge pe ecrane în câteva secunde, fără reîncărcarea paginii. Schimbarea poate fi făcută oriunde: site, recepție, chioșc.
- **Fără internet sau fără server:**
  - ecranul păstrează ultimele date și le arată în continuare, chiar și după o repornire;
  - în colț apare discret „Se reconectează… · date de la 09:48”;
  - se reconectează singur, apoi arată imediat tot ce s-a schimbat între timp.
- **La finalul și la începutul fiecărei sesiuni,** ecranul se reîmprospătează singur. O dată pe minut are și o verificare de siguranță.
- **Accesul la date:** numai ecranele înrolate ale clubului, din rețeaua clubului, primesc datele. Orice altă încercare e refuzată și trecută în jurnal.

### Capturi de ecran (făcute de testele automate, cu datele demo)
1. [Ecranul de la teren](ecrane/e1-ecran-teren.png): exemplul din §8.5. Ora e cea a testului, nu 14:00.
2. [Ecranul din lobby](ecrane/e2-ecran-lobby.png).
3. [Lobby-ul după o rezervare nouă](ecrane/e3-ecran-lobby-live.png): Teren 1 devine ocupat fără reîncărcarea paginii.
4. [Fără server](ecrane/e4-fara-server.png): ecranul păstrează datele și arată discret că se reconectează.

## Rezultate
| Verificare | Rezultat |
|---|---|
| Teste backend noi (ecranele, legătura live, aparatele, setările) | 25, toate trec; `jungle/screens` are **100% acoperire pe ramuri**, impusă de `scripts/test-all` |
| Ecranele, teste unitare | 29: exemplul din §8.5, „Jucător” pentru cine nu e public, lobby-ul, rotirea anunțurilor, reconectarea, datele păstrate, reîmprospătarea la finalul sesiunii |
| Cap-coadă | 3 teste, cu backendul real, Redis (ca în producție) și câte un Hardware Bridge real pe fiecare ecran: ecranul de teren, lobby-ul care primește live o rezervare făcută din alt proces, ecranul fără server. Accesibilitatea e verificată (axe). |
| Toate verificările proiectului (`scripts/test-all`) | trec înainte de orice push; hook-ul `.githooks/pre-push` refuză altfel |

## Dubla revizuire: probleme găsite și reparate
1. **Un jucător care tocmai s-a retras din ligă** mai putea apărea în clasamentul de pe ecrane până la următoarea rescriere a clasamentului. Acum ecranul îl lasă deoparte imediat.
2. **Sfârșitul unei sesiuni nu e o schimbare în baza de date,** deci nu vine niciun anunț pentru el. Ecranul își calculează singur momentul și se reîmprospătează atunci.
3. **Lobby-ul nu încăpea pe un ecran Full HD.** Meciul zilei împingea clasamentul în afara ecranului, iar codul QR era tăiat. Am refăcut aranjarea.
4. **Din perspectiva unui atacator:**
   - biletul pentru legătura live e valabil 60 de secunde și o singură dată, iar legătura nu primește date, doar „s-a schimbat ceva”;
   - datele se cer tot prin API, cu tokenul ecranului;
   - un alt aparat (de exemplu un chioșc) sau o cerere din afara rețelei clubului e refuzat;
   - codul QR primit de la server e afișat numai dacă e o imagine curată (fără scripturi);
   - tokenul ecranului nu intră niciodată în fișierele publicate;
   - în browserul ecranului se păstrează doar date publice.

## Ce e de confirmat
| Întrebare | Varianta folosită până la răspuns |
|---|---|
| **Q55** (nouă) ecranele | pe nume doar jucătorii din ligă, ceilalți „Jucător”; echipele din meci, turneu sau provocare, altfel în perechi după ordinea scanării; anunțurile clubului scrise în admin, în RO și EN; codul QR duce la liga de pe site |
| Q53, Q54 (Etapa 8) | rămân deschise, cu variantele implicite |

## Limitări cunoscute (intenționate)
- **Anunțurile clubului și codul QR se setează acum din configurare.** Paginile lor din panoul de admin vin în Etapa 10.
- **Ecranele reale** (modelul televizoarelor, calculatoarele lor) se aleg odată cu restul hardware-ului (Q23). Instalarea folosește același sistem ca la chioșcuri (`deploy/kiosk-os`).
- **Evenimentele** afișate sunt deocamdată turneele ligii. Alte evenimente ale clubului (sala de evenimente, clase speciale) se adaugă când se construiește modulul lor.

## Cum verificați (click cu click)
1. Pe GitHub, branch-ul `claude/hopeful-euler-rguibn`, deschideți acest raport (`docs/00-management/verificare/etapa-9/RAPORT.md`).
2. Deschideți capturile de mai sus, în ordine: ecranul de la teren, lobby-ul, lobby-ul după o rezervare nouă, ecranul fără server.
3. Comparați prima captură cu exemplul din specificație (§8.5, mai sus): terenul, tipul meciului, jucătorii cu rang, LP și nivel, timpul rămas, ce urmează.
4. În [INTREBARI_DESCHISE.md](../../INTREBARI_DESCHISE.md), citiți **Q55** și răspundeți unde nu sunteți de acord.
5. Dacă vreți să le încercați pe un calculator (cu ajutorul cuiva tehnic): pașii din [apps/court-screens/README.md](../../../../apps/court-screens/README.md).

## După aprobare: răspunsul la Q55 (29.09.2026)
- **Toți jucătorii apar pe nume** pe ecranele terenurilor. Cei din ligă au insigna **„Ligă”** și, doar ei, rangul, LP-ul și nivelul.
- **Excepțiile:** cine își șterge contul, sau cere să nu apară pe nume (dreptul de opoziție din GDPR), apare ca „Jucător”. Recepția notează cererea în adminul tehnic; pagina din panoul de admin vine în Etapa 10. Politica de confidențialitate (ciorna) spune asta.
- **La Chioșcul Ligii, butonul nou „Echipele pe teren”:** după scanare, oricare dintre cei 4 jucători de pe teren alege „Cu cine joci?”, iar ecranul terenului se schimbă imediat. Implicit rămân perechile în ordinea scanării. Nu se poate după ce meciul a fost introdus, la meciurile de turneu sau la provocări.
- Anunțurile clubului și codul QR rămân cum erau, confirmate.

