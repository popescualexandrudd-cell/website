# Raport de verificare — Etapa 10 (panoul de administrare)

> Data: 29.09.2026. Branch: `claude/hopeful-euler-rguibn`. Starea: **livrată, așteaptă aprobarea proprietarului**.

În Etapa 9 am construit ecranele de la terenuri și din lobby. În Etapa 10 am construit **panoul de administrare** (§8.6): locul din care personalul clubului conduce totul, dintr-un browser, pe calculator.

Panoul e o „fereastră” spre aceleași date ca site-ul, chioșcurile și ecranele: o rezervare mutată aici apare imediat pe ecranul terenului și în contul clientului.

## Ce s-a construit

### 1. Intrarea: parolă + cod din telefon (2FA obligatoriu)
- Fiecare om din personal intră cu emailul, parola și **codul din aplicația de autentificare** (Google Authenticator, Microsoft Authenticator, 1Password…).
- **La prima intrare**, panoul îi arată cheia pentru aplicație, îi cere un cod ca verificare, apoi îi dă **10 coduri de rezervă** (pentru un telefon pierdut). Codurile se văd o singură dată.
- Un cod folosit o dată nu mai merge a doua oară.

### 2. Fiecare vede doar ce are voie
- Meniul arată doar modulele permise rolului, la locația aleasă (admin, manager, recepție, antrenor).
- Serverul verifică **din nou** orice acțiune: un buton ascuns nu e singura protecție.
- Orice schimbare importantă cere un **motiv** și intră în **jurnalul de audit**, cu autorul.

### 3. Modulele
| Modul | Ce face |
|---|---|
| **Tablou de bord** | ocuparea terenurilor azi, rezervările, numerarul și veniturile zilei, alertele (notificări necitite, decizii în așteptare, aparate oprite), terenurile acum; se reîmprospătează la 30 de secunde |
| **Calendar rezervări** | o zi, o coloană pe teren / aparat Reformer / sala de evenimente, în programul clubului; **rezervare nouă** din orice celulă liberă (clientul se caută după nume, email sau telefon); **mutare prin tragere cu mouse-ul** (sau din detalii, cu tastatura); anulare, cu sau fără taxă; plată în numerar trecută ca excepție |
| **Utilizatori** | căutare, fișa persoanei (date, sold, ligă, carduri, rezervări, acorduri GDPR), cont rapid la recepție, roluri, card nou / blocat, „nu mai afișa numele pe ecrane” (Q55), ștergerea contului (GDPR) |
| **Antrenori și pilates** | clasele săptămânii, clasă nouă, lista participanților, prezența |
| **Prezențe** | notificările pentru personal, jucătorii blocați după neprezentări (ridicarea blocării, cu motiv), prezența trecută manual când cardul nu se citește |
| **Abonamente** / **Firme** | vânzare la recepție (și „La cerere”, și plătite de firmă), înghețare, anularea unei comenzi neplătite; firmele, angajații, raportul lunii |
| **Resurse** / **Prețuri** | terenurile, sala și aparatele (inclusiv scoase din uz); tarifele pe oră și ale abonamentelor, cu marcajul **DE_STABILIT** până le hotărâți |
| **Niveluri de validat** | chestionarele de nivel pentru intrarea în ligă (R-003) |
| **Liga** | meciurile de decis (aplic / redeschid / anulez, cu motiv), sezoanele, turneele (tragere la sorți, meci pus pe teren), Meciul zilei. **Panoul nu are niciun câmp de scor**: scorul se introduce doar la Chioșcul de Ligă |
| **Plăți și registru** | registrul zilei; o greșeală se corectează **doar printr-o înregistrare inversă**, cu motiv (nimic nu se șterge); voucherele |
| **Numerar și fiscal** | ce e în fiecare Chioșc de Plăți și în seif, operațiunile personalului, numărările cu diferența față de registru, **rapoartele Z**; PIN-ul propriu pentru chioșc |
| **Cafenea** | coada de comenzi, comanda la bar (excepție), meniul cu prețurile |
| **Evenimente** | cererile pentru sala de evenimente: aprob (sala se rezervă) sau refuz, cu răspuns pentru client |
| **Rapoarte și exporturi** | pe orice perioadă: venituri pe categorii, reduceri, numerar, rezervări pe tipuri, anulări, neprezentări, **ocuparea fiecărui teren**, clase, conturi noi; **export CSV** al registrului (pentru contabil) și al rezervărilor; lista de așteptare de dinainte de lansare |
| **Personal și roluri** | cine are un rol, dacă are 2FA configurat, ce poate face fiecare rol |
| **Dispozitive** | chioșcurile, ecranele și afișajul cafenelei: adăugare, înrolare, oprire imediată (de exemplu un chioșc furat) |
| **Setări și feature flags** | „Ce mai trebuie confirmat” (deciziile dumneavoastră încă deschise), comutatoarele (de exemplu parkour, ascuns la lansare), toate setările, fiecare schimbare fiind o versiune nouă, cu motiv și dată de la care se aplică. Aici se scriu și **anunțurile de pe ecrane** (`screens.announcements`) |
| **Jurnalul de audit** | cine a schimbat ce, când, de ce, ce era înainte și ce e după |
| **Starea sistemului** | versiunea, ora serverului, baza de date, cache-ul, aparatele online / offline |

**Conținutul site-ului** și **Traducerile** (Etapa 11), **Notificările**, **Comunitatea** și **Asistentul AI** (Etapa 12) apar deja în meniu, marcate cu etapa lor.

Tot panoul e în română și engleză (butonul „English”). Orele sunt mereu **ora clubului**, oriunde ar fi calculatorul, inclusiv în ziua trecerii la ora de vară (28.03.2027).

### Capturi de ecran (făcute de testele automate, cu datele demo)
1. [Prima intrare: configurarea 2FA](ecrane/01-configurare-2fa.png)
2. [Tabloul de bord](ecrane/02-tablou-de-bord.png) (meniul managerului)
3. [Calendarul rezervărilor](ecrane/03-calendar.png)
4. [Calendarul după mutarea unei rezervări prin tragere](ecrane/04-calendar-dupa-mutare.png)
5. [Jurnalul de audit](ecrane/05-jurnal-audit.png): mutarea, cu motivul ei
6. [Rapoarte și exporturi](ecrane/06-rapoarte.png)
7. [Setări și „Ce mai trebuie confirmat”](ecrane/07-setari.png)
8. [Starea sistemului](ecrane/08-stare-sistem.png)

## Rezultate
| Verificare | Rezultat |
|---|---|
| Server (citirile panoului, mutarea unei rezervări, rapoarte, exporturi, starea sistemului, date demo) | teste noi, toate trec; `jungle/panel` are **100% acoperire pe ramuri**; toate cele 652 de teste backend trec |
| Panoul, teste unitare | 61: fiecare modul, cu permisiunile, erorile serverului, ora clubului peste trecerea la ora de vară, cheile de idempotență la plăți |
| Cap-coadă | 3 teste, cu serverul real și build-ul de producție al panoului: prima intrare cu configurarea 2FA, rezervare nouă, mutare prin tragere, mutare refuzată pe un loc ocupat, anulare; intrarea cu cod (un cod greșit e refuzat), jurnalul de audit, liga fără câmp de scor, exportul CSV, setările, starea sistemului, schimbarea limbii; fără sesiune, API-ul refuză. Accesibilitatea verificată (axe) pe fiecare pagină parcursă |
| Toate verificările proiectului (`scripts/test-all`) | trec înainte de orice push; hook-ul `.githooks/pre-push` refuză altfel |

## Dubla revizuire: probleme găsite și reparate
1. **O plată trimisă de două ori** (internet întrerupt, clic dublu) ar fi putut fi înregistrată de două ori. Fiecare plată din panou poartă acum o cheie unică (R-067): o reîncercare nu mai plătește nimic a doua oară, iar o sumă schimbată primește o cheie nouă.
2. **Plata trecută de recepție** permitea și „card”; clubul primește doar numerar (Q9). Am lăsat doar numerarul.
3. **Datele din panou erau în ora calculatorului**, nu a clubului. Acum orice oră aleasă (rezervare, clasă, turneu, dată de aplicare a unei setări) se trimite în ora clubului.
4. **Un preț pe oră cu număr impar de bani** nu se poate împărți corect pe jumătăți de oră: panoul îl refuză cu un mesaj clar, în loc să rotunjească pe tăcute.
5. **Accesibilitate** (găsite de testele cap-coadă): celulele libere de sub o rezervare erau ascunse sub ea; capul calendarului folosea un rol de tabel fără tabel. Reparate.
6. **Din perspectiva unui atacator:**
   - panoul e pe aceeași adresă cu API-ul: cookie-ul de sesiune și protecția CSRF funcționează fără reguli între domenii;
   - fără 2FA verificat, serverul nu dă permisiunile, deci nici meniul, nici datele;
   - exporturile CSV sunt trecute în jurnal, iar orice text care ar putea fi o formulă de Excel (`=`, `+`, `-`, `@`) e scris ca text;
   - rapoartele financiare au o permisiune nouă, `reports.view`, doar pentru admin și manager;
   - tokenul unui dispozitiv înrolat se vede o singură dată;
   - registrul de bani refuză orice modificare chiar și la nivelul bazei de date (testat).

## Ce e de confirmat
| Întrebare | Varianta folosită până la răspuns |
|---|---|
| **Q56** (nouă) cine vede rapoartele | rapoartele financiare și exporturile: admin și manager; recepția vede registrul zilei și numerarul, nu rapoartele pe perioade |
| Q53, Q54 (Etapa 8) | rămân deschise, cu variantele implicite |
| Q21 (prețurile) | tarifele rămân DEMO, marcate DE_STABILIT; acum le puteți schimba singur din **Prețuri** |

## Limitări cunoscute (intenționate)
- **Operațiunile cu numerar** (alimentare, golire, numărare, închiderea zilei) se fac la chioșc, în modul personal, cu cardul și PIN-ul. Panoul le arată și setează PIN-ul, dar nu le poate porni de la distanță.
- **Meciul zilei și programarea meciurilor de turneu** se fac după codul rezervării (se vede în detaliile rezervării din calendar).
- **Anunțurile de pe ecrane** se scriu deocamdată în **Setări** (`screens.announcements`), ca text RO + EN; un editor dedicat vine cu conținutul site-ului (Etapa 11).

## Cum verificați (click cu click)
1. Pe GitHub, branch-ul `claude/hopeful-euler-rguibn`, deschideți acest raport (`docs/00-management/verificare/etapa-10/RAPORT.md`).
2. Deschideți capturile de mai sus, în ordine.
3. În captura 3 și 4: rezervarea lui Alexandru Daniel Popescu era pe Teren 1 la 10:00; după tragere e pe Teren 3 la 14:00. În captura 5 se vede mutarea, cu motivul „clientul a cerut altă oră”.
4. În captura 7, lista „Ce mai trebuie confirmat” e exact lista deciziilor încă deschise din [INTREBARI_DESCHISE.md](../../INTREBARI_DESCHISE.md).
5. Citiți **Q56** și răspundeți dacă nu sunteți de acord.
6. Dacă vreți să îl încercați pe un calculator (cu ajutorul cuiva tehnic): pașii din [apps/admin/README.md](../../../../apps/admin/README.md) (`manage.py panel_demo` creează conturile demo ale managerului și recepției, cu 2FA de configurat la prima intrare).
