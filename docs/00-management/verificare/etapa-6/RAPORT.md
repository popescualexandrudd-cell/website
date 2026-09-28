# Raport de verificare — Etapa 6 (integrarea ligii)

> Data: 28.09.2026. Branch: `claude/hopeful-euler-rguibn`. Starea: **livrată, așteaptă aprobarea proprietarului.**

Motorul ligii (aprobat în Etapa 2) calcula corect, dar nu știa nimic de club: rezervări, carduri, plăți, sezoane. În Etapa 6 l-am legat de tot restul sistemului. Un exemplu complet, cu date demo, generat de codul real: [EXEMPLU.md](EXEMPLU.md).

## Ce s-a construit

### Intrarea în ligă
Reguli: R-003, R-006, R-010, R-011.

- Jucătorul completează **chestionarul de nivel** din cont. Sistemul estimează un nivel (Q47), iar **antrenorul** îl confirmă sau îl schimbă.
- Intră în ligă doar cine are **18 ani**, **nivelul validat** și **acordul semnat la Chioșcul Ligii**. Când e îndeplinită ultima condiție, intră automat în sezonul în curs.
- Cine își retrage acordul sau își șterge contul iese din ligă. Nu mai apare nicăieri, iar ceilalți urcă un loc în clasament. Meciurile lui rămân în istoricul celorlalți.

### Sezoanele
Reguli: LG-130 … LG-134, Q27.

- Managerul creează și pornește sezonul. Valorile ligii (Q45) și regulile recompenselor (Q6) se fixează la pornire; o schimbare se aplică de la sezonul următor.
- Sezonul nou pornește din cel vechi: LP la 0, nivelurile apropiate de medie, 3 meciuri de re-plasare.
- Un sezon se poate marca „Calibrare” (Sezonul 0): nu are premii.

### Un meci de ligă, de la teren la clasament
Reguli: §6.9, LG-090 … LG-098, invariantul 1.

1. Rezervarea este de tip „meci oficial” (sau „provocare”) pe un teren de padel al clubului.
2. Toți jucătorii și-au scanat cardul la intrarea pe teren.
3. După ora de final, timp de **30 de minute**, un jucător își scanează cardul la **Chioșcul Ligii** și introduce scorul. Un scor imposibil e refuzat pe loc. Dacă încearcă prea devreme, chioșcul spune exact când se poate („între 15:30 și 16:00”).
4. Ceilalți jucători își scanează cardul și **confirmă** sau **contestă** scorul.
5. Meciul contează doar dacă **rezervarea e plătită integral**, inclusiv toate părțile din „Împarte ora”. Altfel, așteaptă plata **24 de ore** (Q11); o plată făcută mai târziu îl validează automat.
6. La validare, motorul calculează nivelul și LP-ul. Clasamentele și cardurile din Wallet se actualizează singure.

Tot ce iese din acest drum are o regulă:
- Un scor **contestat** ajunge la manager.
- Un scor **neconfirmat** sau **neplătit** la timp expiră.
- Un meci fără niciun set complet devine **antrenament** (nu contează).

**Scorurile se introduc și se confirmă numai la Chioșcul Ligii.** Serverul verifică de fiecare dată trei lucruri: că aparatul e un Chioșc de Ligă, că e activ și al acestui club, și că trimite din rețeaua clubului. Orice altă sursă e refuzată și trecută în jurnal: site, telefon, admin, alt aparat, altă rețea.

**Adminul nu scrie niciodată un scor.** La o dispută, managerul are trei opțiuni, toate cu motiv scris:
- validează scorul introdus la chioșc;
- redeschide fereastra, iar jucătorii reintroduc scorul la chioșc;
- anulează meciul. Un meci deja aplicat se scoate, iar liga se recalculează ca și cum nu s-ar fi jucat.

Fiecare pas al meciului rămâne într-un jurnal care nu se poate modifica. Jurnalul arată ce s-a verificat la fiecare pas: rezervarea, scanările, plata, chioșcul.

### Corectitudinea calculelor
Reguli: §6.16, LG-160 … LG-162.

- Fiecare schimbare din ligă e un **eveniment** care nu se mai modifică: un meci, un bonus, o zi de decay, o anulare. Clasamentul se poate recalcula oricând de la zero, cu **exact** același rezultat. Există un test care verifică asta.
- Un meci validat mai târziu (de exemplu, după plată) își ia locul corect în ordinea în timp: liga se recalculează automat.
- Două confirmări apăsate exact în același timp nu pot aplica meciul de două ori. Testul folosește două confirmări trimise în paralel.

### Provocările
Reguli: §6.11, LG-110 … LG-113, Q48.

- Provocarea se lansează și se acceptă **la Chioșcul Ligii**. Adversarul poate fi din aceeași divizie sau cu cel mult una peste. Cel provocat primește un email.
- Răspunsul se dă în **72 de ore**; lipsa răspunsului contează ca refuz (Q48).
- Fiecare jucător are 2 refuzuri pe sezon. La al treilea, adminul alege ce se întâmplă (implicit nimic; opțional înfrângere tehnică, decisă de manager).
- Meciul se joacă în **7 zile**, pe o rezervare de tip „Provocare”, prin același drum de la chioșc. Provocatorul care câștigă ia **+5 LP**.

### Decay, avertizări și sarcinile automate
Reguli: LG-106, LG-107.

- Zilnic, Diamantele și Maeștrii inactivi de peste 14 zile pierd LP (5, respectiv 10 pe zi), dar niciodată sub Diamant IV.
- Cu **3 zile înainte** primesc un email, o singură dată.
- Dacă sarcina zilnică nu a rulat o noapte, recuperează zilele lipsă.

### Închiderea sezonului și recompensele
Reguli: §6.12, LG-100, LG-120 … LG-122, Q6.

- Managerul închide sezonul după data de final, și doar dacă nu mai e niciun meci pe jumătate: scor neconfirmat, neplătit sau disputat.
- Clasamentul devine final. Intră doar cine are minimul de meciuri (12).
- Recompensele se emit **automat, ca vouchere în cont**, cu email (varianta implicită Q6):
  - top 3 din fiecare rang: 15% la abonament și 4 × 15% la rezervări, luna următoare;
  - **Regii Junglei** (top 3): în plus 2 ore gratuite, mingi și cardul special. Pentru mingi, recepția primește o notificare; cardul intră în coada de tipar.
- Câștigătorii intră în **Hall of Fame**, care rămâne pe site.

### Insignele, cardul Diamant și Meciul zilei
Reguli: §6.15, R-024, Q50.

- **Insigne**, vizibile doar în contul propriu:
  - ucigaș de giganți;
  - serie de victorii;
  - Early Bird;
  - săptămâni la rând;
  - surpriza săptămânii;
  - promovare;
  - primul Diamant;
  - Rege al Junglei.
- La **primul Diamant**, cardul fizic cu emblemă intră automat în oferta jucătorului (o singură dată în viață, Q1).
- **Meciul zilei** se alege dintre meciurile de ligă de azi, după un scor de miză calculat mereu la fel. Scorul ține cont de: o promovare la îndemână, un duel în top 10, o provocare, o rivalitate, o diferență de nivel. Adminul îl poate schimba, cu motiv.
- Pe site și pe ecrane, Meciul zilei arată doar datele publice (R-012): nume, rang, nivel, LP, loc. Nu arată terenul și nici ora.

### Turneele
Reguli: §6.14, LG-141, LG-142, Q28, Q49.

- **Formate:**
  - eliminatoriu (cu calificări directe pentru cei mai buni);
  - grupe + eliminatoriu;
  - fiecare cu fiecare;
  - Americano;
  - Mexicano;
  - King of the Court.
- Tragerea o face sistemul: după rang, sau la sorți cu o „sămânță” păstrată, ca să poată fi verificată.
- Jucătorii se înscriu din cont (ca la o rezervare). Taxa de participare este condiția de plată. La retragere sau la anularea turneului, taxa se întoarce în cont.
- Adminul pune fiecare meci pe un teren. După meci, un jucător sau **directorul** îl marchează terminat la chioșc. Scorul se introduce și se confirmă tot la chioșc; directorul poate introduce și valida singur (Q28).
- LP-ul meciurilor de turneu se înmulțește cu **1,5**. La final se adaugă bonusul pe fază: 30 / 20 / 10 / 5 LP.
- Meciurile de turneu nu intră în limita de 3 meciuri pe zi (Q49).

## Rezultate
| Verificare | Rezultat |
|---|---|
| Teste backend | **490**, toate trec (135 noi în Etapa 6), acoperire totală 98% |
| Liga în backend (`jungle/league`) | **100% acoperire pe ramuri**, impusă de `scripts/test-all` |
| Motorul ligii | 174 de teste, 100% pe ramuri; simularea rulată din nou: rezultate identice |
| Modulele de bani | 100% (plata taxelor de turneu adăugată în registru) |
| Tragerile la sorți | testate cu proprietăți: fiecare cu fiecare se întâlnesc o singură dată; la Americano, fiecare jucător e partener cu fiecare exact o dată |
| ruff, mypy strict, migrații, client API, traduceri RO/EN | 0 probleme |

## Dubla revizuire: probleme găsite și reparate
1. **Invariantul 1:** prima variantă îi permitea managerului să scrie un „scor corectat” la o dispută. Am înlocuit-o cu „redeschide fereastra”: jucătorii reintroduc scorul la chioșc.
2. **Meciuri terminate în același minut** pe terenuri diferite (foarte des: rezervările se termină la ore fixe) ar fi forțat recalcularea întregului sezon de fiecare dată. Acum se aplică direct, în ordinea înregistrării.
3. **Recalcularea de la zero** dădea aceleași valori, dar scrise altfel (ora în alt fus). Acum totul se scrie în UTC: rezultatul e identic până la ultimul caracter.
4. **Un sezon închis** putea primi încă un eveniment de la o cerere începută înainte de închidere. Acum starea se citește sub aceeași blocare pe care o folosește și închiderea.
5. **Setarea „al treilea refuz”**, citită din setări, nu ar fi fost recunoscută niciodată de motor. Acum setările se citesc cu tipul corect.
6. **Grupe cu o singură pereche**, deci fără meciuri (de exemplu 5 perechi în grupe de 2). Acum o grupă nu e niciodată mai mică decât mărimea aleasă.
7. **Referința bonusului de turneu** era prea lungă pentru baza de date. Am scurtat-o.
8. **Zilele de turneu** loveau limita de 3 meciuri pe zi. Excepția e acum în motor, marcată DE_CONFIRMAT (Q49).
9. **Din perspectiva unui atacator:**
   - 6 surse interzise sunt testate: site sau telefon (fără aparat), Chioșc de Plăți, ecran, chioșc dezactivat, chioșcul altui club, altă rețea. Toate sunt refuzate și trecute în jurnal.
   - Un test automat verifică că API-ul nu are niciun endpoint de introdus sau confirmat scoruri.
   - Dezactivarea unui chioșc are efect imediat.
   - Paginile publice (clasamente, Regii Junglei, Hall of Fame, Meciul zilei, turnee) afișează doar câmpurile R-012.
   - Insignele și statisticile personale se văd doar în contul propriu.

## Ce e de confirmat (lucrăm cu varianta implicită, schimbabilă din setări)
| Întrebare | Varianta folosită |
|---|---|
| Q6 recompensele | top 3 din fiecare rang (Bronz … Maestru): 15% la abonament + 4 × 15% la rezervări, 31 de zile; Regii Junglei: și 2 × 60 de minute, mingi, card special |
| Q11 termenul de plată | 24 de ore |
| Q27 sezonul de calibrare | fără premii; datele le alege managerul |
| Q28 turneele | jucătorii la chioșc, cu confirmare; directorul poate introduce și valida la chioșc; bonus 30/20/10/5 |
| Q45 valorile ligii | neschimbate față de Etapa 2 |
| **Q47** (nouă) chestionarul | mijlocul treptei alese, ±0,25 după experiență |
| **Q48** (nouă) provocările | la chioșc; la dublu, între perechi; lipsa răspunsului = refuz; înfrângerea tehnică o decide managerul |
| **Q49** (nouă) turneele | fără limită zilnică; înscriere din cont; pe site fără teren și oră; rezultatul folosit de tablou e definitiv |
| **Q50** (nouă) insigne și Meciul zilei | pragurile și punctajul din raport |

## Limitări cunoscute (intenționate)
- **Chioșcul Ligii** (ecranul, autentificarea aparatului cu certificat): Etapa 7. Toate funcțiile pe care le va apela sunt gata și testate.
- **Ecranele** (actualizare în timp real): Etapa 9. **Panoul de admin** (dispute, sezoane, turnee pe ecran): Etapa 10. Până atunci funcțiile există în API.
- **Paginile ligii pe site** (clasamente, Hall of Fame, turnee, contul jucătorului): Etapa 11. API-ul lor e gata.
- **Notificări** în afară de email, textul AI pentru Meciul zilei și detecția de anomalii: Etapa 12.
- **Rularea automată** a sarcinilor (`expire_league_matches` la 5 minute, `league_daily` zilnic): programate la deploy, în Etapa 14. Comenzile există.

## Cum verificați (click cu click)
1. Pe GitHub, branch-ul `claude/hopeful-euler-rguibn`, deschideți acest raport.
2. Deschideți [EXEMPLU.md](EXEMPLU.md). E un sezon demo produs de codul real: clasamentul, pașii unui meci la chioșc, un turneu, recompensele.
3. În [INTREBARI_DESCHISE.md](../../INTREBARI_DESCHISE.md) citiți **Q47–Q50** și răspundeți acolo unde nu sunteți de acord. Contează mai ales Q48 (provocările) și Q49 (turneele). Tot acolo sunt și Q6, Q11, Q27, Q28.
