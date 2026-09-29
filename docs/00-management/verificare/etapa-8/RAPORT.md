# Raport de verificare — Etapa 8 (Chioșcul de Plăți + afișajul cafenelei)

> Data: 29.09.2026. Branch: `claude/hopeful-euler-rguibn`. Starea: **aprobată de proprietar pe 29.09.2026** (Q53 și Q54 rămân deschise, cu variantele implicite). Partea de backend a intrat deja în `main` pe 28.09.2026 (PR #1, la cererea proprietarului); ecranele sunt pe branch.

În Etapa 7 am construit Hardware Bridge și Chioșcul Ligii. În Etapa 8 am construit **al doilea aparat**: Chioșcul de Plăți, unde clientul plătește singur, cu **numerar și rest**, primește **bon fiscal**, iar comenzile de la cafenea ajung pe **afișajul barului**.

## Ce s-a construit

### 1. Plata cu numerar, fără ca vreun leu să se piardă (§8.3)
- **Înainte să bage bani**, clientul află dacă aparatul are rest. Dacă nu are:
  - „Momentan acceptăm doar suma exactă”: o bancnotă care ar cere rest îi este înapoiată pe loc;
  - sau restul intră **în contul lui, ca credit, numai dacă bifează că e de acord**.
- **Fiecare bancnotă** e scrisă întâi pe discul aparatului, semnată, apoi trimisă imediat serverului. Serverul confirmă, tot semnat, că a primit-o.
- **Restul:** aparatul dă cât poate și raportează exact cât a dat. Ce nu a putut da intră în contul clientului, iar managerul e anunțat.
- **Bonul fiscal** se tipărește o singură dată (R-066). Pentru o comandă de la cafenea se tipărește și un bon cu numărul comenzii.
- **Anulare:** clientul primește banii înapoi; ce nu poate da aparatul devine credit. Dacă o plată se oprește cu bani în aparat, pe ecran rămâne un singur buton: „Anulez și primesc banii înapoi”. Ecranul nu se închide singur cât timp sunt bani în aparat.
- **Cădere de curent sau de internet:**
  - fără server, chioșcul **nu începe plăți noi**;
  - o plată în curs reîncearcă singură câteva minute;
  - la repornire, tot ce a rămas neconfirmat pe aparat ajunge la server, iar banii rămași dintr-o plată întreruptă devin credit (managerul e anunțat);
  - banii veniți pentru o plată pe care serverul nu o cunoaște se înregistrează separat și sunt semnalați.

### 2. Tot ce poate face clientul la chioșc
1. **Check-in** la sosire.
2. **Plătește rezervarea**, întreagă sau **„Împarte ora”**:
   - jucătorii își scanează cardurile;
   - sistemul calculează părțile;
   - fiecare își plătește partea;
   - „mai sunt de plătit” se actualizează singur.
3. **Datoriile** (anulări tardive, neprezentări) apar primele, marcate.
4. **Abonament:** configuratorul în 3 pași (sporturi, cât de des, pe ce perioadă), cu prețul și reducerile calculate de server. Se poate și **îngheța** (până la 14 zile pe an).
5. **Cafenea:** meniu, cantități, coș. Comanda apare pe afișajul barului.
6. **Voucherele** lui (sau un cod tastat pe ecran) și **creditul din cont**.

Ecranul e în română și engleză. Ieșirea e automată după 60 de secunde fără atingere, dar niciodată cât timp sunt bani în aparat. Prețurile încă orientative sunt marcate cu „*” (Q21).

### 3. Modul personal (Q54)
Recepționerul atinge „Personal”, scanează cardul de angajat și tastează PIN-ul. PIN-ul și-l setează fiecare angajat din contul lui; după 5 greșeli se blochează 15 minute. Apoi poate:
- **alimenta restul** din seif;
- **goli caseta** în seif;
- **număra banii**: diferența față de registru ajunge automat la manager;
- **închide ziua** cu raportul Z al casei de marcat și totalurile zilei (încasat, rest dat, mutat din sau în seif, în aparat).

Pe același ecran vede și câte bancnote are aparatul și alertele „rest scăzut” sau „casetă plină”.

### 4. Afișajul cafenelei (§8.7)
Comenzile plătite apar în câteva secunde, în trei coloane: **Noi → În preparare → Gata**. Barul atinge comanda ca s-o mute mai departe; „Ridicată” o scoate de pe ecran. La fiecare comandă nouă se aude un semnal sonor.

### 5. O singură bază pentru toate ecranele aparatelor
Chioșcul Ligii, Chioșcul de Plăți și afișajul cafenelei folosesc acum aceeași bază (`packages/kiosk-kit`): legătura cu aparatul, tastaturile, textele, aspectul. Ecranele din Etapa 9 o vor folosi și ele.

Capturi de ecran, făcute de testele automate:
- [repaus](ecrane/p1-repaus.png);
- [sesiunea clientului](ecrane/p2-sesiune.png);
- [înainte de bani](ecrane/p3-inainte-de-bani.png);
- [introducerea banilor](ecrane/p4-introducere.png);
- [plată reușită, cu rest](ecrane/p5-platit.png);
- [afișajul cafenelei](ecrane/p6-afisaj-cafenea.png);
- [abonamentul](ecrane/p7-abonament.png);
- [modul personal și raportul Z](ecrane/p8-mod-personal.png).

## Rezultate
| Verificare | Rezultat |
|---|---|
| Teste backend | **594**, toate trec |
| Plățile la chioșc (`jungle/checkout`), liga și banii | **100% acoperire pe ramuri** |
| Hardware Bridge | **63 de teste, 100% acoperire pe ramuri** |
| Ecranele, teste unitare | Chioșcul de Plăți 29, afișajul cafenelei 5, baza comună 15, Chioșcul Ligii 14 |
| Cap-coadă | site: 26; Chioșcul Ligii: 6; **Chioșcul de Plăți + afișajul: 6 teste cu backendul real și două Hardware Bridge reale.** Acoperă: repaus; voucher, apoi restul cu numerar, cu rest și bon fiscal; o cafea plătită din credit care apare pe afișaj și e dusă până la „Ridicată”; abonament comandat și plată anulată; modul personal cu numărare și raport Z; PIN greșit refuzat. Accesibilitatea e verificată (axe). |
| ruff, mypy strict, migrații, client API, traduceri RO/EN | 0 probleme |

## Dubla revizuire: probleme găsite și reparate
1. **Ora pe bon și la chioșc era greșită (Etapa 4):** descrierea unei rezervări sau a unei clase arăta ora UTC („06:00” în loc de „09:00”). Acum e ora clubului, cu test.
2. **Clientul API (etapele anterioare):** 10 formate de date purtau același nume și se suprascriau (de exemplu, datele contului). Acum au nume unice, iar un test oprește problema pe viitor.
3. **Abonamentul la chioșc** era refuzat dacă clientul nu își confirmase emailul, deși cardul clubului îl identifică. Acum chioșcul îl primește; online, emailul confirmat rămâne obligatoriu (Q53, DE_CONFIRMAT).
4. **Mesajul de blocare a PIN-ului** spunea „16 minute” pentru o blocare de 15.
5. **O plată oprită cu bani în aparat** putea fi închisă de pe ecran fără ca banii să fie dați înapoi. Acum singura ieșire e restituirea, iar ecranul nu se mai închide singur.
6. **Din perspectiva unui atacator:**
   - ecranul nu poate „inventa” bani: serverul socotește numai bancnotele semnate de aparat, fiecare o singură dată;
   - aparatul dă bani numai la comenzi semnate de server, fiecare executată o dată;
   - un bon nu se tipărește de două ori, iar restul nu se dă de două ori;
   - un alt aparat, sau o cerere din afara rețelei clubului, e refuzat și trecut în jurnal;
   - PIN-ul se blochează după încercări repetate, iar sesiunea de personal e legată de acel chioșc;
   - tokenul aparatului nu apare niciodată în fișierele publicate.

## Ce e de confirmat
| Întrebare | Varianta folosită până la răspuns |
|---|---|
| **Q53** (nouă) numerar, rest, credit, fiscal | maxim 5.000 lei pe plată; TVA pe grupa A până confirmă contabilul; restul nedat devine credit (cu notificare); plata întreruptă devine credit; fără bon nou la plata din credit sau cu voucher; la chioșc, cardul înlocuiește emailul confirmat |
| **Q54** (nouă) modul personal | managerul și recepția; PIN de 6 cifre, blocare 15 minute după 5 greșeli; sesiune de 5 minute |
| Q23 aparatele | simulatoare până la alegere |

## Limitări cunoscute (intenționate)
- **Aparatele reale** (acceptorul de bancnote cu rest, casa de marcat, imprimanta): driverele se scriu după alegerea modelelor (Q23, Etapa 14).
- **Notificările pentru manager** (diferențe, rest nedat, blocaje) se salvează acum pe server; lista lor în panoul de admin vine în Etapa 10.
- **Numărul comenzii pe ecranele din lobby:** Etapa 9.
- **POS cu card:** adaptor pregătit, dezactivat (R-062, Q9: doar numerar).

## Cum verificați (click cu click)
1. Pe GitHub, branch-ul `claude/hopeful-euler-rguibn`, deschideți acest raport (`docs/00-management/verificare/etapa-8/RAPORT.md`).
2. Deschideți capturile de mai sus, în ordine. Arată ce vede un client de la scanarea cardului până la plata reușită, apoi afișajul barului și modul personal.
3. În [INTREBARI_DESCHISE.md](../../INTREBARI_DESCHISE.md), citiți **Q53** și **Q54** și răspundeți unde nu sunteți de acord. Pentru Q53 (TVA, bonul pentru plata din credit) e bine să întrebați și contabilul.
4. Dacă vreți să-l încercați pe un calculator (cu ajutorul cuiva tehnic): pașii „Rulare locală” din [apps/kiosk-payments/README.md](../../../../apps/kiosk-payments/README.md). Caseta **SIMULATOR** ține locul cititorului de carduri și al bancnotelor.
