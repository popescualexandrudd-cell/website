# Raport de verificare — Etapa 7 (Hardware Bridge + Chioșcul Ligii)

> Data: 28.09.2026. Branch: `claude/hopeful-euler-rguibn`. Starea: **livrată, așteaptă aprobarea proprietarului**.

În Etapa 6, liga știa deja tot: ce meci s-a jucat, cine confirmă, cine a plătit. Îi lipsea **locul** în care jucătorii fac asta: Chioșcul Ligii, singurul aparat din club unde se introduc și se confirmă scorurile. În Etapa 7 am construit chioșcul și tot ce îl leagă de aparatele fizice.

## Ce s-a construit

### 1. Aparatul își dovedește identitatea (ADR-0012)
- Fiecare aparat se **înregistrează** în admin, apoi se **înrolează**. La înrolare, serverul dă un **token** afișat o singură dată. Serverul păstrează doar amprenta lui, deci tokenul nu poate fi citit din baza de date.
- Aparatul trimite tokenul la fiecare cerere. În producție se cere și **certificatul client** al aparatului (mTLS), care trebuie să fie cel înrolat.
- **Refuzat și trecut în jurnal:** token greșit, aparat necunoscut, aparat dezactivat, certificat greșit.
- **Ghicitul e limitat:** după 20 de încercări greșite în 10 minute, adresa respectivă e refuzată fără alte înregistrări în jurnal.
- **Aparat pierdut:** o nouă înrolare anulează tokenul vechi; dezactivarea din admin are efect imediat.

### 2. Hardware Bridge — serviciul de pe fiecare aparat (ADR-0013)
Un program mic, care rulează pe mini-PC-ul chioșcului și leagă ecranul de aparate: cititorul de carduri, apoi (Etapa 8) numerarul, casa de marcat și imprimanta.

- **Simulatoare complete** pentru toate aparatele, inclusiv defectele: bancnotă blocată, rest insuficient, casetă plină, cădere de curent, lipsă de hârtie, imprimantă deconectată. Aparatele reale se aleg după Q23.
- **Cheie proprie (Ed25519):** fiecare card scanat e **semnat** de bridge. Serverul îl acceptă o singură dată, în cel mult 2 minute. Un browser „spart” nu poate inventa o scanare, iar o scanare veche nu poate fi refolosită.
- **Banii se mișcă doar la comenzi semnate de server.** Fiecare comandă se execută o singură dată, chiar și după o repornire.
- **Jurnal de numerar pe disc**, doar-adăugare: fiecare bancnotă se scrie, semnată, **înainte** ca ecranul să afle de ea. După o cădere de curent, o plată rămasă neterminată se închide automat cu suma introdusă și restul dat, pentru reconciliere. (Plata completă cu numerar se face în Etapa 8.)
- **Acces:** ascultă doar pe aparatul însuși (`127.0.0.1`) și doar pentru pagina chioșcului.

### 3. Chioșcul Ligii (§8.2)
- **Ecranul de repaus:** clasamentul live (Dublu, Simplu, Perechi, pe rând), Meciul zilei cu terenul și ora, Regii Junglei, provocările zilei, „Scanează cardul”. Clasamentele complete se pot căuta după nume.
- **După scanare:** salutul și datele strict necesare, pentru că ecranul poate fi văzut de alții: rang, LP, nivel, loc, meciuri jucate față de minim. Ce are jucătorul de făcut apare pe butoane („1 de făcut”). **Ieșire automată după 30 de secunde** fără atingere, cu numărătoare inversă.
- **Acțiunile:**
  1. **Înscriere în ligă (GDPR):** textul complet, bifă obligatorie, doar de la 18 ani.
  2. **Introdu scorul:** apar singure meciurile terminate ale jucătorului, cu fereastra deschisă și toate scanările făcute. Echipele se schimbă atingând un nume. Scorul se introduce set cu set, cu butoane mari: tie-break la 7–6, super tie-break în setul 3, „meci neterminat”.
  3. **Confirmă sau contestă**, pentru ceilalți jucători.
  4. **Provocări:** răspuns (accept / refuz) și provocare nouă. La dublu, partenerul își scanează cardul.
  5. **Check-in**, o dată pe zi.
  6. **Clasamente** cu căutare, pe tastatura de pe ecran.
  7. **Meciuri de turneu:** „meciul s-a terminat”, scorul, iar **directorul de turneu validează** scorul.
- **Mesaje clare**, din codurile serverului, de exemplu: „Scorul se poate introduce între 11:00 și 11:30”, „Nu toți jucătorii și-au scanat cardul la intrarea pe teren”, „Cardul nu este valabil”. Ora afișată e mereu ora clubului.
- **Limba:** română sau engleză, cu buton în colț; sesiunea pornește în limba jucătorului.
- **Fără server:** „Serviciu temporar indisponibil”, cu revenire automată. **Fără bridge:** avertisment pentru recepție.
- **Aspect:** tema clubului (noapte și alamă) și fonturile site-ului.

Capturi de ecran, făcute de testele automate: [repaus](ecrane/1-repaus.png), [acordul GDPR](ecrane/2-acord-gdpr.png), [sesiunea jucătorului](ecrane/3-sesiune.png), [scorul](ecrane/4-scor.png), [clasamentele](ecrane/5-clasamente.png).

### 4. Instalarea pe aparat (ADR-0014)
- `deploy/kiosk-os/install.sh` pregătește un mini-PC cu Debian:
  - pornește Hardware Bridge ca serviciu;
  - deschide pagina chioșcului pe tot ecranul (fără desktop, fără alte aplicații);
  - blochează orice alt site, descărcările, printarea și uneltele de dezvoltare;
  - adaugă o pagină locală „temporar indisponibil” și un watchdog care repornește ce se blochează (după 5 eșecuri la rând, tot aparatul);
  - dezactivează consolele și tastele speciale;
  - instalează automat actualizările de securitate, cu repornire la 04:30.
- De ce **Debian**: ADR-0014 permite „Ubuntu LTS sau Debian stabil”. Pe Debian, browserul vine ca pachet normal, iar regulile de blocare și certificatul client funcționează direct.
- Procedura pas cu pas, inclusiv înrolarea: [docs/09-hardware/03-instalare-chiosc-si-inrolare.md](../../../09-hardware/03-instalare-chiosc-si-inrolare.md). Varianta Windows, dacă un aparat vine cu Windows: [04-varianta-windows.md](../../../09-hardware/04-varianta-windows.md).

## Rezultate
| Verificare | Rezultat |
|---|---|
| Teste backend | **538**, toate trec; acoperire totală 98% |
| Liga în backend (`jungle/league`, cu chioșcul) și banii | **100% acoperire pe ramuri** |
| Hardware Bridge | **56 de teste, 100% acoperire pe ramuri**, inclusiv căderea de curent, comenzile repetate și paginile de pe alt site |
| Chioșcul Ligii, teste unitare | **18** (texte, ora clubului, scorul, legătura cu bridge-ul, ecranele) |
| Cap-coadă | site: 26 de teste; **Chioșcul Ligii: 6 teste cu backendul real, Hardware Bridge real și scanări semnate**: repaus, card necunoscut, înscriere GDPR, scor introdus și confirmat de ceilalți trei jucători, check-in, căutare, ieșire după 30 s; accesibilitate verificată (axe) |
| Instalarea pe aparat | verificată fără instalare (`deploy/kiosk-os/check.sh`) |
| ruff, mypy strict, migrații, client API, traduceri RO/EN | 0 probleme |

## Dubla revizuire: probleme găsite și reparate
1. **O scanare semnată e bună o singură dată**, deci un jucător ar fi trebuit să-și scaneze cardul la fiecare apăsare. Acum prima scanare deschide o **sesiune scurtă pe server**: 60 de secunde, legată de acel chioșc, închisă la „Ieșire”.
2. **Etapa 6 — un jucător nou care intră în ligă imediat după meci** (semnează la chioșc, apoi introduce scorul): scorul trecea de chioșc și se bloca abia la ultima confirmare. Acum e refuzat imediat, cu un mesaj clar. Regula LG-099 e marcată DE_CONFIRMAT (**Q51**).
3. **Etapa 6 — un cod de eroare al motorului** („meciurile de turneu nu pot fi neterminate”) lipsea din listă și apărea ca eroare generică. Am adăugat codul și un test care verifică toate codurile motorului.
4. **„Ieșire” apăsat imediat după trimiterea scorului** putea redeschide sesiunea (un răspuns întârziat). Acum răspunsurile întârziate sunt ignorate.
5. **Directorul de turneu** nu vedea pe ecran scorul introdus de jucători, deci nu-l putea valida. Acum îl vede și îl validează.
6. **Caseta simulatorului** acoperea butoanele de jos. Acum stă sub ele. La club, caseta nu apare.
7. **Din perspectiva unui atacator:**
   - **Fără Redis în producție**, fiecare proces al serverului ar fi avut memoria lui: sesiunile chioșcului ar fi „expirat” la întâmplare, iar o scanare ar fi putut fi refolosită pe alt proces. Acum serverul **refuză să pornească** în producție fără Redis.
   - **Ghicirea tokenurilor** ar fi putut umple jurnalul de audit. Acum e limitată pe adresă.
   - **Tokenul aparatului** nu intră niciodată în fișierele publicate ale chioșcului: vine de la bridge, iar construirea versiunii publicate e refuzată dacă un token e setat.
   - **Accesul local de test** (chioșc pe `127.0.0.1`) e refuzat în producție.
   - Pentru endpoint-urile chioșcului, un test verifică faptul că acceptă doar aparate autentificate. Site-ul și telefonul primesc refuz.
   - Transmiterea scorului de la un chioșc aflat în afara rețelei clubului e refuzată și trecută în jurnal.

## Ce e de confirmat (lucrăm cu varianta implicită)
| Întrebare | Varianta folosită |
|---|---|
| **Q51** (nouă) jucătorul intrat în ligă după meci | meciul nu contează; refuz imediat, cu mesaj |
| **Q52** (nouă) chioșcul | ieșire după 30 s; RO + EN (alte limbi când le alegeți); clasamentul de repaus se schimbă la 10 s |
| Q23 aparatele | simulatoare până la alegere; criteriile sunt în `docs/09-hardware/02-criterii-achizitie-hardware.md` |

## Limitări cunoscute (intenționate)
- **Aparatele reale** (scanner, numerar, casă de marcat, imprimantă): driverele se scriu după Q23, în Etapa 14. Interfețele și simulatoarele sunt gata.
- **Plata cu numerar la chioșc** (creditarea pe server din evenimentele semnate, restul, bonul fiscal): Etapa 8. Bridge-ul are deja jurnalul, semnăturile și comenzile semnate.
- **Înrolarea din panoul de admin:** Etapa 10. Până atunci se face din pagina tehnică a API-ului (`/api/v1/docs`), ca administrator, conform procedurii.
- **Certificatele client și domeniul** `kiosk-liga.<domeniu>`: la deploy (Etapa 14; Q39 domeniul).

## Cum verificați (click cu click)
1. Pe GitHub, branch-ul `claude/hopeful-euler-rguibn`, deschideți acest raport.
2. Deschideți capturile de ecran de mai sus: [repaus](ecrane/1-repaus.png) → [acordul GDPR](ecrane/2-acord-gdpr.png) → [sesiunea](ecrane/3-sesiune.png) → [scorul](ecrane/4-scor.png) → [clasamentele](ecrane/5-clasamente.png). Arată ce vede un jucător, în ordine.
3. Citiți procedura de instalare a unui chioșc: [docs/09-hardware/03-instalare-chiosc-si-inrolare.md](../../../09-hardware/03-instalare-chiosc-si-inrolare.md).
4. În [INTREBARI_DESCHISE.md](../../INTREBARI_DESCHISE.md), citiți **Q51** și **Q52** și răspundeți unde nu sunteți de acord.
5. Dacă vreți să-l încercați pe un calculator (cu ajutorul cuiva tehnic): pașii „Rulare locală” din [apps/kiosk-league/README.md](../../../../apps/kiosk-league/README.md). Caseta **SIMULATOR** ține locul cititorului de carduri.
