# Etapa 12 — AI și notificări: raport

Planul pe faze: [PLAN.md](PLAN.md).

## Faza 12A — Nucleul notificărilor (01.10.2026)

### Ce s-a construit
1. **O singură listă de mesaje (outbox).** Orice modul al clubului cere o notificare printr-un singur apel (`notifications.services.notify`). Mesajul se scrie întâi într-o listă și pleacă imediat după ce schimbarea s-a salvat. Același eveniment pentru același lucru (de exemplu memento-ul unei rezervări) nu pleacă niciodată de două ori.
2. **Canalele (Q17, Q18, DE_CONFIRMAT):** email și **notificări pe telefon** (push, din site-ul instalat ca aplicație). SMS-ul e pregătit, dar oprit. Fără WhatsApp.
3. **Notificările push** sunt criptate cap-coadă (standardele RFC 8291 și 8292): serviciul de push al telefonului (Google, Apple, Mozilla) doar le transportă și nu le poate citi. Cheile clubului se fac o dată, cu `manage.py vapid_keys`, și stau doar în `.env` pe server. Fără ele, push-ul rămâne oprit și mesajele vin pe email.
4. **Lista de evenimente din §11** (33), fiecare cu categoria, canalele și dacă se poate opri. Mesajele despre cont, rezervări, taxe și deciziile clubului (de exemplu o blocare) vin mereu. Memento-urile, liga, abonamentele, voucherele și noutățile se pot opri din cont.
5. **Textele, în română și engleză**, cu valori implicite scrise de noi și **editabile din panou**. Un text greșit (de exemplu `{{` neînchis) e refuzat înainte de salvare.
6. **Mesajele programate** (memento-urile) și **reîncercările** pleacă prin `manage.py send_notifications`, care rulează în fiecare minut (programarea pe server, în Etapa 14). Un mesaj netrimis se reîncearcă de cel mult 5 ori.
7. **Minimizarea datelor:** textul unui mesaj se șterge după 90 de zile; rămâne doar faptul că s-a trimis (cui, ce, când).

### În cont și în panou
1. **Contul → Notificări** (`/cont/notificari`):
   - „Primește notificări aici”, care pornește notificările pe acel telefon sau calculator, cu permisiunea browserului;
   - un tabel cu ce se poate opri, pe email și pe telefon;
   - explicația a ce vine mereu.
2. **Panoul → Notificări** (înlocuiește marcajul „vine în Etapa 12”; acțiunea nouă `notifications.manage`, pentru admin și manager):
   - textele fiecărui mesaj, pe canal și limbă, cu modificare și „Revino la textul implicit”;
   - ultimele mesaje trimise, cu starea lor: cui, ce, când, fără textul primit de client.
3. **Service worker-ul** (versiunea 3) arată notificarea și, la atingere, deschide pagina clubului la care se referă, niciodată alt site.

### Rezultate
| Verificare | Rezultat |
|---|---|
| Teste backend (`jungle/notifications`, 100% pe ramuri, impus de `test-all`) | 21. Criptarea push e verificată decriptând-o ca un browser real, iar semnătura VAPID e verificată cu cheia publică. Mai sunt acoperite: emailul trimis o singură dată, push-ul pe fiecare dispozitiv (cel dezabonat se șterge), preferințele (ce se poate și ce nu se poate opri), memento-urile la ora lor, reîncercările până la 5 și apoi „netrimis”, ștergerea textelor după 90 de zile, alertele pentru managerii locației, abonarea la push, textele din panou (salvare, refuz, revenire, jurnal) și drepturile de acces. |
| Teste în panou | 3: modulul doar cu `notifications.manage`, editarea și revenirea la textul implicit, lista mesajelor, refuzul unui text greșit. |
| Teste pe site | Cheia clubului ca octeți (unitar). Cap-coadă, în fluxul contului: pagina Notificări, oprirea memento-urilor pe email, alegerea păstrată la reîncărcare, accesibilitatea. |

### Ce urmează (12B)
Legarea fiecărui eveniment din §11 de modulul lui. De exemplu: confirmarea și memento-urile rezervărilor, lista de așteptare, validarea nivelului, cardul, liga (scoruri, ranguri, Diamant, provocări, decay, meciurile necesare, finalul sezonului, Meciul zilei), absențele, taxele, blocările, abonamentele, voucherele, evenimentele noi și alertele pentru personal.

## Faza 12B — Fiecare eveniment din §11, legat de modulul lui (06.10.2026)

### Ce pleacă acum, și când
| Mesaj | Cui | Când |
|---|---|---|
| Rezervare confirmată / modificată / anulată | clientul | imediat; anularea spune dacă se plătește (sub 24 de ore) |
| Memento la 24 h și la 2 h | clientul | la ora lor; o mutare sau o anulare le retrage pe cele vechi |
| Locul de pe lista de așteptare | clientul promovat | imediat, cu ora până la care poate anula gratuit |
| Nivelul validat, cardul emis | clientul | imediat |
| Taxa de neprezentare | clientul | doar dacă rămâne ceva de plătit (nu dacă era plătit sau intra în abonament) |
| Rezervările blocate | clientul | la a 3-a neprezentare (Q15); deblocarea o face antrenorul sau managerul |
| Absențe la antrenamente | clientul | după 2 lipsuri la rând, o singură dată pe șir (Q67) |
| Abonament activ, înghețat, „mai ai 2 sesiuni”, „expiră pe …” | clientul | la plată, la înghețare, la a 2-a sesiune rămasă, cu 7 zile înainte (Q67) |
| Voucher primit | clientul | imediat (ce valorează și până când) |
| Eveniment nou în calendar | doar cine a cerut noutățile (Q67) | la prima publicare, nu pentru evenimentele demo sau trecute |
| Scor propus | ceilalți jucători din meci | imediat, cu ora până la care confirmă la Chioșcul Ligii |
| Meci validat, cu LP-ul fiecăruia | jucătorii | după validare (nu în meciurile de plasare) |
| Rang nou (promovare, retrogradare, primul rang după plasare) | jucătorii | după validare, pe fiecare clasament |
| Diamant | jucătorul | o singură dată în viață, cu cardul fizic de la recepție |
| Provocare primită / acceptată / refuzată | cei provocați / cei care au provocat | la Chioșcul Ligii |
| Risc de decay, finalul sezonului | jucătorii | ca până acum, acum și pe telefon |
| Scor contestat | managerii și adminii locației | imediat (rezolvarea, în panou) |
| Rest scăzut la Chioșcul de Plăți | managerii și adminii locației | cel mult o dată la 30 de minute pe chioșc |

Toate trec prin același loc (`notifications.notify`), deci pe email și pe telefon, în limba clientului, o singură dată și editabile din panou. Comanda nouă `manage.py notifications_daily` (dimineața) trimite „abonamentul expiră”.

### Corecturi pe drum
1. Confirmarea rezervării spunea „plata se face la club” și pentru lecțiile din abonament; acum spune că ce rămâne de plătit (dacă rămâne ceva) se vede în cont.
2. **Un test care pica de la sine după 01.10.2026** (lista de așteptare): nota de informare se publica la ora reală, iar testul se muta înapoi în timp, înaintea ei. Acum se publică la o dată fixă.

### Ce rămâne pentru fazele următoare (cu motiv)
- „Introduceți scorul” (la finalul meciului), „Meciul zilei”, „îți mai trebuie N meciuri”, „n-ai mai jucat de X zile” (cu jucători de nivelul tău): în **12E**, împreună cu potrivirea jucătorilor.
- „Aparat offline” și „backup eșuat”: în **Etapa 14** (monitorizare). Un chioșc liniștit noaptea nu trimite nimic serverului, deci alerta are nevoie întâi de un semnal regulat de la aparate, altfel ar suna degeaba.

### Rezultate
| Verificare | Rezultat |
|---|---|
| Teste backend | 781, toate verzi; noi: confirmări și memento-uri, retragerea memento-urilor la anulare, taxa, blocarea, absențele, abonamentele (activ, sesiuni, înghețat, expiră, comanda zilnică), voucherele (cu textul valorii în RO și EN), noutățile doar cu acord, provocările acceptate și refuzate, scorul propus, scorul contestat, primul rang și LP-ul după plasare, Diamantul, restul scăzut. |
| Acoperire 100% pe ramuri | `ledger`, `subscriptions`, `rewards`, `cafe`, `league`, `checkout`, `screens`, `panel`, `events`, `blog`, `notifications`: păstrată. |

### Cum verificați (după ce porniți serverul demo)
1. În cont → Notificări: „Noutăți de la club” e oprit; porniți-l pe email.
2. În panou → Evenimente: publicați un eveniment viitor. Emailul „Nou la Jungle Padel: …” ajunge doar la contul de la pasul 1.
3. Rezervați un teren pentru mâine: vine „Rezervarea e confirmată”; în panou → Notificări → ultimele mesaje apar și cele două memento-uri, programate.
4. Anulați rezervarea: memento-urile apar „Nu s-a trimis”, cu motivul `withdrawn` (retrase).

## Faza 12C — Nucleul AI (06.10.2026)

### Ce s-a construit
1. **Adaptorul de furnizor** (ADR-0019 §1): restul clubului vorbește doar cu o interfață (`AIProvider`). Implicit, Claude de la Anthropic, prin biblioteca oficială. Cheia (`AI_API_KEY`) și modelul (`AI_MODEL`, propus `claude-opus-5-5`) stau doar în `.env` pe server. Fără ele, AI-ul e oprit, iar restul sistemului merge normal. Textul fix trimis la fiecare întrebare (instrucțiunile și lista de unelte) e pus în cache la furnizor, deci costă mai puțin. Dacă modelul refuză o cerere din motive de siguranță, furnizorul o trece automat la alt model potrivit („fallbacks”).
2. **Comutatorul global `ai`** (oprit implicit) și **limita lunară de cost** (`ai.monthly_budget_usd`, Q68). Limita oprește atât întrebările noi, cât și pe cea în curs, înainte de pasul următor. Costul se socotește din tokenii raportați de furnizor, la prețul întreg (și pentru textul din cache), ca limita să nu fie depășită.
3. **Jurnalul** fiecărei întrebări (`AIInteraction`): unde (site, cont, personal), rezultatul, uneltele folosite, tokenii și costul. **Fără textul întrebării, al răspunsului sau al datelor citite** (minimizare, §10.1).
4. **Uneltele, pe context** (registrul): asistentul public, cel din contul clientului și copilotul pentru personal primesc fiecare doar uneltele lui. Prima unealtă, `club_info` (adresa, programul, contactul public), e doar de citire. Uneltele asistentului (12D) și ale copilotului (12F) se adaugă tot aici.
5. **Dubla barieră** (invariantul 4):
   1. o unealtă al cărei nume vorbește despre scoruri, rating, LP, ranguri, clasamente, bani, plăți, prețuri, reduceri, vouchere, acorduri sau setări **nu poate fi înregistrată**; un test listează toate uneltele existente, deci orice unealtă nouă trece prin revizuire;
   2. **serviciile protejate refuză orice apel venit de la AI** (`ai.forbidden`), chiar dacă o unealtă ar fi adăugată greșit: registrul ligii (rating, LP, ranguri, clasamente), Chioșcul Ligii și rezolvarea meciurilor (scoruri), registrul de bani (orice plată, rambursare, credit sau reducere), prețurile, voucherele și „Adu un prieten”, acordul ligii și ștergerea contului, comutatoarele și setările clubului.
6. **Panoul → Asistentul AI** (înlocuiește marcajul „vine în Etapa 12”; acțiunea nouă `ai.view`, admin și manager): starea comutatorului, modelul (sau „lipsește cheia”), costul lunii față de limită, ce poate face AI-ul în fiecare context, ce nu poate face niciodată și ultimele întrebări (unde, rezultatul, uneltele, tokenii, costul).

### Rezultate
| Verificare | Rezultat |
|---|---|
| Teste backend (`jungle/ai` și bariera, 100% pe ramuri, impus de `test-all`) | 11. Acoperă: AI-ul oprit fără comutator sau fără cheie; un răspuns printr-o unealtă, cu blocurile modelului trimise înapoi neschimbate și jurnalul fără text; refuzul, eroarea furnizorului, prea mulți pași, răspunsul tăiat; uneltele doar din contextul lor și erorile trimise modelului; limita lunară (oprește întrebarea în curs și pe următoarele, luna nouă o ia de la zero); **bariera 1** (lista uneltelor, numele interzise refuzate); **bariera 2** (15 servicii protejate refuză un apel AI); **o unealtă adăugată greșit care încearcă să miște bani e refuzată**, iar registrul rămâne neatins; panoul (drepturi, stare, jurnal); Claude printr-un transport simulat (instrucțiunile în cache, efortul, „fallbacks”, eroarea furnizorului). |
| Toate testele backend | 792, verzi. |
| Teste în panou | 3 noi (modulul doar cu `ai.view`, starea și jurnalul, AI oprit și jurnal gol); 77 în total. |

### Ce urmează (12D)
Asistentul clubului pe site și în cont: răspunde din datele clubului, verifică disponibilitatea și rezervă pentru clientul intrat în cont. Plata rămâne la chioșc (R-063). Anularea rămâne în cont: o anulare mișcă bani (credit sau taxă), deci bariera 2 o refuză pentru AI.

## Faza 12D — Asistentul clubului (06.10.2026)

### Ce face
1. **Pe site, un buton „Întreabă clubul”** în colțul fiecărei pagini a site-ului complet, doar când AI-ul e pornit (comutatorul `ai`). Panoul spune de la început că e un **asistent AI care poate greși** (Regulamentul european privind IA, art. 50) și că nu rezervă și nu încasează nimic singur.
2. **Răspunde din datele clubului**, prin uneltele lui, niciodată din memorie:
   - programul, adresa și contactul public (`club_info`);
   - terenurile libere pe o zi, pentru o durată (`court_availability`), din rezervările reale, fără date despre cine a rezervat;
   - prețul unui teren pentru o oră aleasă (`court_quote`), calculat exact ca la rezervare; un preț încă nestabilit (DE_STABILIT) e spus ca „orientativ”;
   - antrenamentele din următoarele 7 zile, cu locurile rămase (`class_schedule`).
3. **Pentru un client intrat în cont:**
   - îi spune rezervările lui viitoare, niciodată ale altcuiva (`my_bookings`);
   - **îi pregătește o rezervare** (`propose_booking`) după toate regulile unei rezervări: email confirmat, fără blocare, ora pe grilă, în program, terenul liber. Clientul o face apăsând **„Rezervă”** sub răspuns. Butonul cheamă aceeași rezervare ca pagina de rezervări. AI-ul nu rezervă singur, iar plata rămâne la Chioșcul de Plăți (R-063).
4. **Limite:** cel mult 30 de întrebări pe oră de persoană (sau de adresă, fără cont; Q68), cel mult 20 de replici și 2.000 de caractere pe replică. Conversația stă doar în pagină: serverul nu păstrează textul.
5. **Comutatorul `ai` nu mai poate fi pornit fără cheie și model** pe server (`ai.not_configured`). Astfel butonul nu apare degeaba.
6. **Un furnizor „de test”, scriptat** (`AI_FAKE`, doar în dezvoltare și în testele cap-coadă; refuzat pe serverul de producție). Nu e un AI: urmează un script fix prin uneltele reale ale clubului. Așa se testează tot drumul, inclusiv barierele și jurnalul, fără cheie și fără cost.

### Rezultate
| Verificare | Rezultat |
|---|---|
| Teste backend (`jungle/ai`, 100% pe ramuri) | 19 (8 noi): terenurile libere din rezervări, fără ore trecute și fără date personale; prețul ca la rezervare și „orientativ”; antrenamentele săptămânii; rezervările proprii; rezervarea pregătită, nu făcută (email neconfirmat, teren ocupat); furnizorul scriptat pe tot drumul; pe site: vizitator, client, butonul care rezervă prin endpoint-ul obișnuit, limita pe oră, AI oprit; comutatorul care așteaptă cheia. |
| Teste pe site | Conversația trimisă cum o acceptă API-ul (unitar). Cap-coadă, cu AI-ul pornit și furnizorul scriptat: un vizitator întreabă de program (accesibilitate, Escape și focusul înapoi pe buton); un client intrat în cont primește rezervarea pregătită și o face cu butonul; în engleză. |
| Panou | Testul cap-coadă arată modelul scriptat al mediului de test („fake-club”). |


## Faza 12E — Potrivirea jucătorilor, mementourile ligii, Jungle Report și ciornele AI (06.10.2026)

### Ce pleacă acum de la ligă (calculat în cod, niciodată de AI)
1. **„Hai înapoi pe teren”**: după **21 de zile** fără meci de ligă (`notifications.inactive_days`, Q67), o singură dată pe pauză, cu până la **3 jucători de nivelul tău** care au jucat în ultimele 30 de zile (`league.partners`, Q67). Potrivirea (`jungle/league/matchmaking.py`) e deterministă: cel mai apropiat nivel (cel mult ±0,75), apoi meciul cel mai recent, apoi numele. Folosește doar date publice (nume și nivel, R-012) și doar jucătorii din clasament. Fără nimeni potrivit, mesajul spune să întrebe la recepție.
2. **„Încă N meciuri pentru clasamentul final”**: cu **14 zile** înainte de finalul sezonului (`notifications.matches_needed_days`, Q67), o dată pe sezon, celor care au jucat dar sunt sub minimul de 12 meciuri (LG-110).
3. **„Meciul zilei”** (pe telefon): jucătorilor meciului ales după miză, după miezul nopții; și jucătorilor meciului ales de admin peste zi. O dată pe zi și persoană.
4. **„Introduceți scorul”** (pe telefon): organizatorului unui meci oficial sau al unei provocări, la ora de final. Se retrage dacă rezervarea se anulează, se mută sau nu mai e meci de ligă (și revine dacă redevine).
5. **Jungle Report**, în fiecare luni, pentru săptămâna încheiată, celor care au jucat: meciurile și victoriile, LP-ul câștigat sau pierdut, rangul de acum, partenerul cu care ai jucat cel mai des și un obiectiv (meciurile care lipsesc până la clasamentul final, LP-ul până la diviziunea următoare sau „păstrează ritmul”). Cifrele vin din evenimentele ligii (calculul curent), iar textul e șablonul clubului, editabil în panou. **Raportul nu e scris de AI**: așa nu poate spune nimic ce liga n-a înregistrat, și nu costă nimic. Dacă vreți un text personalizat de AI, e o decizie de cost (Q68).

Toate pleacă din `manage.py league_daily` (care spune acum și câte mementouri a scris) și trec prin notificări (email/telefon, în limba clientului, o singură dată, oprite din cont la categoria „Liga”).

### Ciornele scrise de AI (panou → Asistentul AI → Ciorne)
1. **Ce scrie:** un **mesaj pentru comunitate** (cel mult 120 de cuvinte; îl postați voi în grup, varianta implicită din Q19), un **articol pentru blog** (300–600 de cuvinte) sau o **traducere** RO ↔ EN.
2. **Din ce:** din datele publice ale clubului, adunate în cod: programul și adresa, calendarul pe 30 de zile (fără elementele demo), sezonul în curs, meciurile din ultima săptămână și primii 5 din clasamentul public. Plus ce îi scrieți. AI-ul nu primește nicio unealtă și are instrucțiunea să nu inventeze prețuri, date, oameni sau rezultate. Unde lipsește un fapt, scrie „[de completat]”.
3. **Revizuirea:** fiecare ciornă rămâne **„De revizuit”** până când cineva o aprobă (o puteți corecta înainte) sau renunță la ea, o singură dată. Ambele se trec în jurnalul de audit, cu „corectată: da/nu”. Nimic nu se publică și nu se trimite singur. Textul aprobat se copiază cu un buton (în grup sau în modulul Blog).
4. **Cine:** acțiunea nouă `ai.drafts` (admin, manager). Fiecare ciornă intră în jurnalul AI și în limita lunară, ca o întrebare. Cu AI-ul oprit, panoul spune că asistentul nu e disponibil.

### Rezultate
| Verificare | Rezultat |
|---|---|
| Teste backend | 814 în total. Noi — liga: potrivirea (nivel, meci recent, nume, fără cei șterși sau prea departe), pauza lungă o singură dată, meciurile care lipsesc în fereastra corectă și o dată pe sezon, Meciul zilei din job și la alegerea adminului, Jungle Report (luni, o dată pe săptămână, RO și EN, partenerul ascuns dacă a ieșit din ligă, meciul neterminat neluat în calcul), cuvintele pentru rang și obiectiv. Rezervări: „Introduceți scorul” la final, retras și readus odată cu tipul. AI: ciorna din fapte publice, faptele ligii doar publice, traducerea fără fapte, ciorna eșuată nesalvată, cererile greșite, aprobarea cu corecturi, renunțarea, o singură revizuire, furnizorul scriptat; Claude primește uneltele doar când există. |
| Acoperire 100% pe ramuri | `league`, `notifications`, `ai` și restul listei: păstrată. |
| Panou | 80 de teste (3 noi: ciornele doar cu `ai.drafts`, cererea și aprobarea corectată, renunțarea). Cap-coadă: secțiunea „Ciorne”, cu AI-ul oprit, spune că asistentul nu e disponibil (cu verificarea de accesibilitate). |

### Cum verificați
1. Panou → **Asistentul AI** → **Ciorne scrise de AI**: alegeți „Mesaj pentru comunitate”, scrieți despre ce, apăsați „Scrie ciorna”. Cu AI-ul oprit apare „Asistentul AI nu este disponibil acum.”; cu cheia pusă și AI-ul pornit, ciorna apare „De revizuit”: corectați textul, apoi „Aprobă” și „Copiază textul”.
2. Panou → **Notificări**: textul „Jungle Report” (și „Hai înapoi pe teren”) se poate modifica, ca orice mesaj.
3. Panou → **Configurare**: `notifications.inactive_days`, `notifications.matches_needed_days`, `league.partners` (DE_CONFIRMAT, Q67).

### Ce urmează (12F)
Copilotul pentru personal (întrebări peste date agregate, doar citire), detecția de anomalii și sugestiile de preț (doar sugestii, aplicate de om).
