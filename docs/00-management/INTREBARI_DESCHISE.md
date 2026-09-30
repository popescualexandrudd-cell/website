# Întrebări deschise

> **Sursa:** `MEGA_PROMPT.md` §17 (versiunea 1.0, 26.09.2026), preluată integral în Etapa 0, plus întrebările noi Q39–Q42 apărute la citirea documentului.
> Document viu: la fiecare răspuns al proprietarului se completează „Răspunsul proprietarului” (cu data), starea devine `REZOLVATĂ`, iar regula sau ADR-ul afectat se actualizează cu sursa („confirmat de proprietar la data X”).

Titlul și instrucțiunea din §17, preluate integral:

> **17. ÎNTREBĂRI DESCHISE (de pus proprietarului; fiecare cu varianta implicită până la răspuns)**
>
> Pune-le grupat și în ordinea urgenței (cele care blochează etapa curentă mai întâi), în română simplă, cu exemple. Nu bloca munca: lucrează cu varianta implicită, configurabilă, și marcheaz-o `DE_CONFIRMAT`.

**Priorități:**
- `URGENTĂ`: blochează Etapa 1A/1B sau are un termen lung de obținere (conturi externe, achiziții, verificări legale).
- `ÎNALTĂ`: afectează fundația (Etapa 1A); lucrez cu varianta implicită, dar confirmarea trebuie dată devreme.
- `MEDIE`: necesară în etapele 2–6; până atunci se lucrează cu varianta implicită, configurabilă.
- `SCĂZUTĂ`: necesară mai târziu sau fără impact asupra arhitecturii.

**Stări:** `DESCHISĂ` · `PARȚIAL` (răspuns parțial, rămâne ceva de stabilit) · `REZOLVATĂ` · `ÎNLOCUITĂ` (cu trimitere la întrebarea sau decizia nouă).

## Rezumat

| ID | Subiect | Prioritate | Blochează | Stare |
|---|---|---|---|---|
| [Q1](#q1) | Cardul de Diamant | MEDIE | Etapa 5 (carduri), Etapa 6 (promovări) | DESCHISĂ |
| [Q2](#q2) | Durata de 150 de minute | MEDIE | Etapa 3 (rezervări) | REZOLVATĂ |
| [Q3](#q3) | Programul de funcționare | ÎNALTĂ | Etapa 3 (rezervări, prețuri); conținutul paginii de pre-lansare (1B) | REZOLVATĂ (semi-vârful rămâne implicit) |
| [Q4](#q4) | Prioritatea abonaților | MEDIE | Etapa 3 (liste de așteptare), Etapa 6 (turnee) | DESCHISĂ |
| [Q5](#q5) | Limita de diferență de nivel | MEDIE | Etapa 2 (parametru al motorului; nu blochează) | DESCHISĂ |
| [Q6](#q6) | Recompense | MEDIE | Etapa 6 (recompense de sezon) | REZOLVATĂ |
| [Q7](#q7) | Copiii | ÎNALTĂ | Etapa 1A (modelul de conturi: legătura părinte–copil) | REZOLVATĂ |
| [Q8](#q8) | Invitații fără cont | ÎNALTĂ | Etapa 1A (conturi rapide), Etapa 3 (scanarea la intrarea pe teren) | REZOLVATĂ |
| [Q9](#q9) | Plata online cu card | MEDIE | Etapa 4 (plăți) | REZOLVATĂ |
| [Q10](#q10) | Recepția | MEDIE | Etapa 4 (plăți, registru) | DESCHISĂ |
| [Q11](#q11) | Termenul pentru plată | MEDIE | Etapa 6 (validarea scorului prin plată) | REZOLVATĂ |
| [Q12](#q12) | Intensitățile „La cerere” | MEDIE | Etapa 4 (configuratorul de pachete) | DESCHISĂ |
| [Q13](#q13) | Start | MEDIE | Etapa 4 (regula Start/vârf) | REZOLVATĂ |
| [Q14](#q14) | „Recuperare” | MEDIE | Etapa 3 (anulări), Etapa 4 (credit în cont) | DESCHISĂ |
| [Q15](#q15) | Neprezentări | MEDIE | Etapa 3 (neprezentări și blocări) | REZOLVATĂ |
| [Q16](#q16) | Lista de așteptare | MEDIE | Etapa 3 (liste de așteptare) | REZOLVATĂ |
| [Q17](#q17) | „Telefon” | MEDIE | Etapa 12 (notificări); Etapa 1A (dacă telefonul trebuie verificat prin cod) | DESCHISĂ |
| [Q18](#q18) | Pilates | SCĂZUTĂ | Etapa 12 (notificări pilates) | DESCHISĂ |
| [Q19](#q19) | Grupul comunității | SCĂZUTĂ | Etapa 12 (mesaje pentru comunitate) | DESCHISĂ |
| [Q20](#q20) | Tenis | ÎNALTĂ | Etapa 1A (modelul Locație → Resurse) | REZOLVATĂ |
| [Q21](#q21) | Prețuri | MEDIE | Etapele 3–4 (valori demo); prețurile finale trebuie știute înainte de Etapa 15 (beta) | PARȚIAL (prețuri orientative) |
| [Q22](#q22) | Serverul | URGENTĂ | Etapa 1B (unde publicăm pagina de pre-lansare) și Etapa 14 (deploy) | PARȚIAL |
| [Q23](#q23) | Hardware | URGENTĂ | Etapele 7–9 (drivere reale); trebuie răspuns ÎNAINTE de a cumpăra aparatele | PARȚIAL |
| [Q24](#q24) | Conturi externe | URGENTĂ | Etapa 1B (furnizorul de email pentru lista de așteptare), Etapa 5 (Apple/Google Wallet), Etapa 12 (cheia AI) | PARȚIAL |
| [Q25](#q25) | Limbi suplimentare | SCĂZUTĂ | Etapa 11 (website complet) | DESCHISĂ |
| [Q26](#q26) | Datele firmei | URGENTĂ | Etapa 1B (operatorul de date din nota de informare a listei de așteptare), Etapa 4 (bonuri, facturi), Etapa 5 (GDPR) | DESCHISĂ |
| [Q27](#q27) | Calendarul sezoanelor | MEDIE | Etapa 6 (sezoane) | REZOLVATĂ |
| [Q28](#q28) | Turnee | MEDIE | Etapa 6 (turnee) | REZOLVATĂ |
| [Q29](#q29) | Tipul meciului | MEDIE | Etapa 3 (tipul sesiunii la rezervare) | DESCHISĂ |
| [Q30](#q30) | Afișarea publică a rezultatelor | MEDIE | Etapa 5 (textul formularului GDPR al ligii) | REZOLVATĂ |
| [Q31](#q31) | Clasamentul pe perechi | SCĂZUTĂ | Etapa 2 (parametru al motorului; nu blochează) | DESCHISĂ |
| [Q32](#q32) | Voucherul „Adu un prieten” | MEDIE | Etapa 4 (vouchere și recomandări) | DESCHISĂ |
| [Q33](#q33) | Cafeneaua | MEDIE | Etapa 4 (produse de cafenea), Etapa 8 (afișajul cafenelei) | DESCHISĂ |
| [Q34](#q34) | Sala de evenimente | MEDIE | Etapa 3 (rezervarea sălii de evenimente) | DESCHISĂ |
| [Q35](#q35) | Pachetele corporate | MEDIE | Etapa 4 (conturi corporate) | REZOLVATĂ |
| [Q36](#q36) | Membri fondatori | ÎNALTĂ | Etapa 1B (dacă pagina de pre-lansare oferă locuri de membru fondator) | REZOLVATĂ |
| [Q37](#q37) | Personalul | ÎNALTĂ | Etapa 1A (roluri și permisiuni), Etapa 15 (instruirea personalului) | REZOLVATĂ |
| [Q38](#q38) | Propunerile de concept | SCĂZUTĂ | Etapa 13 (branding, marketing); numele terenurilor se pot schimba oricând din admin | DESCHISĂ |
| [Q39](#q39) | Numele domeniului și marca „Jungle Padel” *(nouă)* | URGENTĂ | Etapa 1B (pagina de pre-lansare), Etapa 13 (branding) | DESCHISĂ |
| [Q40](#q40) | Găzduirea paginii de pre-lansare dacă serverul propriu nu e gata *(nouă)* | URGENTĂ | Etapa 1B | REZOLVATĂ |
| [Q41](#q41) | Avocat / DPO pentru revizuirea textelor legale *(nouă)* | URGENTĂ | Etapa 1B (nota de informare pentru lista de așteptare), Etapa 5 (formularul GDPR al ligii) | REZOLVATĂ |
| [Q42](#q42) | Fluxul de aprobare pe GitHub *(nouă)* | SCĂZUTĂ | Etapa 0 (organizare) | REZOLVATĂ |
| [Q43](#q43) | Vârsta minimă pentru a-ți crea singur cont *(nouă, Etapa 1A)* | MEDIE | Etapa 1B / 11 (înscrierea publică) | REZOLVATĂ |
| [Q46](#q46) | Etichetele neclare din schița clubului *(nouă, Etapa 1B)* | SCĂZUTĂ | Etapa 1B (planul de pe site), Etapa 3 (resursele: săli, parcări) | PARȚIAL |
| [Q45](#q45) | Valorile implicite ale ligii alese în Etapa 2 *(nouă, Etapa 2)* | SCĂZUTĂ | Etapa 6 (nu blochează; se schimbă din configurare) | DESCHISĂ |
| [Q44](#q44) | Randări sau fotografii reale ale spațiilor (vestiare, pilates, sală de evenimente, cafenea, lounge) *(nouă, Etapa 1B)* | MEDIE | Etapa 1B (grila de facilități), Etapa 11 (website-ul complet), Etapa 13 (marketing) | DESCHISĂ |
| [Q47](#q47) | Chestionarul de nivel: cum se estimează nivelul *(nouă, Etapa 6)* | SCĂZUTĂ | nimic (antrenorul stabilește nivelul final) | REZOLVATĂ |
| [Q48](#q48) | Provocările: unde, cine răspunde, ce înseamnă lipsa răspunsului *(nouă, Etapa 6)* | MEDIE | nimic (varianta implicită e în lucru) | REZOLVATĂ |
| [Q49](#q49) | Turneele: limita zilnică, înscrierea, ce se vede pe site *(nouă, Etapa 6)* | MEDIE | nimic (varianta implicită e în lucru) | REZOLVATĂ |
| [Q50](#q50) | Insignele și „Meciul zilei”: praguri și ce se afișează *(nouă, Etapa 6)* | SCĂZUTĂ | nimic (se schimbă din setări) | REZOLVATĂ |
| [Q51](#q51) | Un jucător nou care intră în ligă imediat după meci: meciul contează? *(nouă, Etapa 7)* | SCĂZUTĂ | nimic (varianta implicită e în lucru) | REZOLVATĂ |
| [Q52](#q52) | Chioșcul Ligii: 30 de secunde până la ieșire, limbile ecranului *(nouă, Etapa 7)* | SCĂZUTĂ | nimic (se schimbă ușor) | REZOLVATĂ |
| [Q53](#q53) | Chioșcul de Plăți: numerar, rest, credit, bon fiscal | MEDIE | Etapa 8 (nu blochează; lucrez cu varianta implicită) | DESCHISĂ |
| [Q54](#q54) | Chioșcul de Plăți: modul personal (cine, PIN) | MEDIE | Etapa 8 (nu blochează) | DESCHISĂ |
| [Q55](#q55) | Ecranele: cine apare pe nume, echipele, anunțurile | MEDIE | Etapa 9 (nu blochează) | REZOLVATĂ 29.09.2026 |
| [Q56](#q56) | Panoul de admin: cine vede rapoartele financiare *(nouă, Etapa 10)* | SCĂZUTĂ | nimic (se schimbă ușor) | DESCHISĂ |
| [Q57](#q57) | Site-ul complet: când înlocuiește pagina de pre-lansare *(nouă, Etapa 11)* | MEDIE | nimic (comutator în panou) | REZOLVATĂ 29.09.2026 |
| [Q58](#q58) | Adresa site-ului Clubului Tenis Elite *(nouă, Etapa 11)* | SCĂZUTĂ | nimic (link din panou) | REZOLVATĂ 30.09.2026 |

## Întrebările din MEGA_PROMPT (Q1–Q38)

### <a id="q1"></a>Q1 — Cardul de Diamant

- **Prioritate:** MEDIE · **Blochează:** Etapa 5 (carduri), Etapa 6 (promovări)
- **Stare:** DESCHISĂ
- **Varianta implicită (din MEGA_PROMPT):** prima dată, emblemă din listă predefinită, fără design liber.
- **Folosită în Etapa 5 (27.09.2026):** La prima promovare în Diamant (o singură dată), jucătorul alege o emblemă din `cards.diamond_emblems`: jaguar, panteră, tucan, gorilă, crocodil, papagal ara, anaconda, leopard. Fără design liber.
- **Răspunsul proprietarului:** —
- **Textul original (§17):**

  > - **Q1 Cardul de Diamant**: ce înseamnă „să alegi de junglă”: o emblemă sau un animal dintr-o listă? Se acordă la prima atingere a rangului Diamant (o dată în viață) sau în fiecare sezon? *Implicit: prima dată, emblemă din listă predefinită, fără design liber.*

### <a id="q2"></a>Q2 — Durata de 150 de minute

- **Prioritate:** MEDIE · **Blochează:** Etapa 3 (rezervări)
- **Stare:** REZOLVATĂ
- **Varianta implicită (din MEGA_PROMPT):** da.
- **Folosită în Etapa 3 (27.09.2026):** Durate 60, 90, 120, 150, 180 min (`bookings.durations_minutes`).
- **Răspunsul proprietarului (27.09.2026):** duratele sunt 60, 90, 120, 150 sau 180 de minute (confirmat).
- **Textul original (§17):**

  > - **Q2 Durata de 150 de minute** e permisă (regula „60, apoi din 30 în 30”)? *Implicit: da.*

### <a id="q3"></a>Q3 — Programul de funcționare

- **Prioritate:** ÎNALTĂ · **Blochează:** Etapa 3 (rezervări, prețuri); conținutul paginii de pre-lansare (1B)
- **Stare:** REZOLVATĂ
- **Varianta implicită (din MEGA_PROMPT):** în afara vârfului; weekend ca în cursul săptămânii.
- **Notă:** Fără program confirmat, pagina de pre-lansare afișează „Programul se anunță în curând”.
- **Folosită în Etapa 3 (27.09.2026):** 08:00–23:00 zilnic; benzi: vârf 15–22, semi-vârf 08–12, restul în afara vârfului; weekend ca în cursul săptămânii (`bookings.opening_hours`, `pricing.time_bands`).
- **Răspunsul proprietarului (27.09.2026):** program 08:00–23:00 în fiecare zi; ora de vârf 17:00–22:00 (confirmat). Semi-vârful (08–12 și 15–17) și restul orelor în afara vârfului rămân varianta implicită, `DE_CONFIRMAT`, schimbabile din admin (`pricing.time_bands`).
- **Textul original (§17):**

  > - **Q3 Programul de funcționare** și benzile pentru 13:00–15:00, după 22:00 și weekend. *Implicit: în afara vârfului; weekend ca în cursul săptămânii.*

### <a id="q4"></a>Q4 — Prioritatea abonaților

- **Prioritate:** MEDIE · **Blochează:** Etapa 3 (liste de așteptare), Etapa 6 (turnee)
- **Stare:** DESCHISĂ
- **Varianta implicită (din MEGA_PROMPT):** prioritate pe liste de așteptare și la turnee.
- **Folosită în Etapa 3 (27.09.2026):** Câmpul `priority` pe lista de așteptare există; se leagă de abonamente în Etapa 4.
- **Răspunsul proprietarului:** —
- **Textul original (§17):**

  > - **Q4 Prioritatea abonaților**, dacă rezervarea nu are limită de timp: prioritate pe lista de așteptare, înscriere mai devreme la turnee, altceva? *Implicit: prioritate pe liste de așteptare și la turnee.*

### <a id="q5"></a>Q5 — Limita de diferență de nivel

- **Prioritate:** MEDIE · **Blochează:** Etapa 2 (parametru al motorului; nu blochează)
- **Stare:** DESCHISĂ
- **Varianta implicită (din MEGA_PROMPT):** contează (fără limită).
- **Notă:** Explicație simplă: „Dacă doi jucători foarte buni joacă împotriva a doi începători, meciul să conteze pentru ligă sau să fie trecut automat ca antrenament?”. Formula oricum dă foarte puține puncte favoritului care câștigă (de exemplu +3 LP).
- **Răspunsul proprietarului:** —
- **Textul original (§17):**

  > - **Q5 Limita de diferență de nivel** (explicație simplă: „Dacă doi jucători foarte buni joacă împotriva a doi începători, meciul să conteze pentru ligă sau să fie trecut automat ca antrenament?”). *Implicit: contează (fără limită).*

### <a id="q6"></a>Q6 — Recompense

- **Prioritate:** MEDIE · **Blochează:** Etapa 6 (recompense de sezon)
- **Stare:** REZOLVATĂ
- **Varianta implicită (din MEGA_PROMPT):** top 3 din fiecare rang.
- **Folosită în Etapa 6 (28.09.2026):** la închiderea sezonului, **top 3 din fiecare rang** (Bronz, Argint, Aur, Platină, Diamant, Maestru) în clasamentul final de dublu primesc câte un voucher de **15%** la abonament și **4 vouchere de 15%** la rezervări, valabile 31 de zile. **Regii Junglei (top 3)** primesc în plus 2 vouchere de câte 60 de minute (valabile 90 de zile), mingi și cardul special. Doar cei cu minimul de meciuri (12) intră în clasamentul final. Valorile se schimbă din setarea `league.rewards` și se fixează la începutul fiecărui sezon.
- **Răspunsul proprietarului (28.09.2026):** top 3 din fiecare rang primesc, la alegere, **15% la abonament sau 4 vouchere de 20% la rezervări** (aleg din cont). Regii Junglei primesc în plus **2 ore gratuite, o cutie de mingi și un card special**.
- **Textul original (§17):**

  > - **Q6 Recompense**: „10–20% reducere luna următoare” e pentru top 3 din fiecare rang sau o alternativă la premiile Regilor Junglei? *Implicit: top 3 din fiecare rang.*

### <a id="q7"></a>Q7 — Copiii

- **Prioritate:** ÎNALTĂ · **Blochează:** Etapa 1A (modelul de conturi: legătura părinte–copil)
- **Stare:** REZOLVATĂ
- **Varianta implicită (din MEGA_PROMPT):** da, modul pregătit, activabil.
- **Notă:** Lucrez cu varianta implicită; confirmarea schimbă doar dacă modulul e activ la lansare.
- **Răspunsul proprietarului (26.09.2026):** Confirmat varianta implicită: modulul de conturi de copii este pregătit și activabil din admin (flag `child_accounts`, oprit până la activare).
- **Textul original (§17):**

  > - **Q7 Copiii**: se creează conturi de copii gestionate de părinți, pentru antrenamente, fără ligă? *Implicit: da, modul pregătit, activabil.*

### <a id="q8"></a>Q8 — Invitații fără cont

- **Prioritate:** ÎNALTĂ · **Blochează:** Etapa 1A (conturi rapide), Etapa 3 (scanarea la intrarea pe teren)
- **Stare:** REZOLVATĂ
- **Varianta implicită (din MEGA_PROMPT):** da, cont rapid la chioșc, cu QR temporar.
- **Răspunsul proprietarului (26.09.2026):** Confirmat varianta implicită: cont rapid pentru invitați (nume, telefon, email), creat de recepție sau la chioșc.
- **Textul original (§17):**

  > - **Q8 Invitații fără cont** care joacă o închiriere: trebuie să-și facă cont rapid (nume, telefon, email) ca să poată scana la intrarea pe teren? *Implicit: da, cont rapid la chioșc, cu QR temporar.*

### <a id="q9"></a>Q9 — Plata online cu card

- **Prioritate:** MEDIE · **Blochează:** Etapa 4 (plăți)
- **Stare:** REZOLVATĂ
- **Varianta implicită (din MEGA_PROMPT):** dezactivată; „plată la locație”.
- **Notă:** Contractul cu o bancă sau un procesator durează de obicei câteva săptămâni; dacă vreți plata online la deschidere, decizia trebuie luată până în decembrie 2026.
- **Folosită în Etapa 4 (27.09.2026):** Plata online e dezactivată; rezervările sunt „plată la locație”, cu datoria urmărită în cont. Metoda „card” răspunde `payments.method_unavailable` până la alegerea procesatorului.
- **Răspunsul proprietarului (27.09.2026):** la lansare, doar plata în numerar (la chioșc). Fără plată online cu card; rezervările online rămân „plată la locație”. Adaptorul pentru card rămâne pregătit, dezactivat.
- **Textul original (§17):**

  > - **Q9 Plata online cu card**: ce bancă sau procesator și când? *Implicit: dezactivată; „plată la locație”.*

### <a id="q10"></a>Q10 — Recepția

- **Prioritate:** MEDIE · **Blochează:** Etapa 4 (plăți, registru)
- **Stare:** DESCHISĂ
- **Varianta implicită (din MEGA_PROMPT):** doar chioșcul; admin-ul poate înregistra excepții cu motiv, auditat.
- **Folosită în Etapa 4 (27.09.2026):** Plățile le ia chioșcul (Etapa 8); managerul înregistrează excepții (`POST /api/v1/staff/payments`), doar cu motiv, în jurnal.
- **Răspunsul proprietarului:** —
- **Textul original (§17):**

  > - **Q10 Recepția** poate încasa numerar în afara chioșcului sau înregistra plăți manuale? *Implicit: doar chioșcul; admin-ul poate înregistra excepții cu motiv, auditat.*

### <a id="q11"></a>Q11 — Termenul pentru plată

- **Prioritate:** MEDIE · **Blochează:** Etapa 6 (validarea scorului prin plată)
- **Stare:** REZOLVATĂ
- **Varianta implicită (din MEGA_PROMPT):** 24 de ore.
- **Folosită în Etapa 6 (28.09.2026):** 24 de ore (setarea `league.payment_deadline_hours`). Plata făcută în acest timp validează automat scorul; după termen, scorul expiră.
- **Răspunsul proprietarului (28.09.2026):** confirmat, 24 de ore.
- **Textul original (§17):**

  > - **Q11 Termenul pentru plată** după introducerea scorului, ca meciul să fie validat. *Implicit: 24 de ore.*

### <a id="q12"></a>Q12 — Intensitățile „La cerere”

- **Prioritate:** MEDIE · **Blochează:** Etapa 4 (configuratorul de pachete)
- **Stare:** DESCHISĂ
- **Varianta implicită (din MEGA_PROMPT):** cerere aprobată de admin; sub 8 sesiuni = regula Start.
- **Folosită în Etapa 4 (27.09.2026):** Intensitățile „La cerere” le creează recepția/managerul, cu prețul lunar stabilit de club; sub 8 sesiuni se aplică regula Start (`subscriptions.start_rule_below_sessions`).
- **Răspunsul proprietarului:** —
- **Textul original (§17):**

  > - **Q12 Intensitățile „La cerere”**: le alege clientul singur sau se aprobă și se stabilește prețul de admin? Ce regulă de vârf au? *Implicit: cerere aprobată de admin; sub 8 sesiuni = regula Start.*

### <a id="q13"></a>Q13 — Start

- **Prioritate:** MEDIE · **Blochează:** Etapa 4 (regula Start/vârf)
- **Stare:** REZOLVATĂ
- **Varianta implicită (din MEGA_PROMPT):** da (restricție doar pe 15:00–22:00).
- **Folosită în Etapa 4 (27.09.2026):** Start nu e valabil în banda de vârf (acum 17–22, după Q3); semi-vârful e permis.
- **Răspunsul proprietarului (27.09.2026):** da: Start se poate folosi și în semi-vârf; nu se poate folosi doar în banda de vârf (17–22).
- **Textul original (§17):**

  > - **Q13 Start** poate folosi semi-vârful (08:00–12:00)? *Implicit: da (restricție doar pe 15:00–22:00).*

### <a id="q14"></a>Q14 — „Recuperare”

- **Prioritate:** MEDIE · **Blochează:** Etapa 3 (anulări), Etapa 4 (credit în cont)
- **Stare:** DESCHISĂ
- **Varianta implicită (din MEGA_PROMPT):** credit în cont; sesiunea recuperată e valabilă până la finalul perioadei abonamentului.
- **Folosită în Etapa 3 (27.09.2026):** Anularea gratuită e marcată „eligibilă pentru recuperare”; creditul în cont vine în Etapa 4.
- **Folosită în Etapa 4 (27.09.2026):** Plățile unei rezervări anulate la timp devin credit în cont pentru fiecare plătitor; sesiunea de abonament devine sesiune de recuperare, valabilă până la finalul abonamentului.
- **Răspunsul proprietarului:** —
- **Textul original (§17):**

  > - **Q14 „Recuperare”** la anularea cu 24 h înainte: pentru închirieri plătite, credit în cont sau rambursare în numerar? Sesiunea de abonament recuperată trebuie folosită în aceeași lună? *Implicit: credit în cont; sesiunea recuperată e valabilă până la finalul perioadei abonamentului.*

### <a id="q15"></a>Q15 — Neprezentări

- **Prioritate:** MEDIE · **Blochează:** Etapa 3 (neprezentări și blocări)
- **Stare:** REZOLVATĂ
- **Varianta implicită (din MEGA_PROMPT):** 90 de zile; managerul.
- **Folosită în Etapa 3 (27.09.2026):** 90 de zile (`bookings.no_show_window_days`); pentru închirieri se anunță managerul.
- **Răspunsul proprietarului (27.09.2026):** da: neprezentările se numără pe 90 de zile; pentru închirieri se anunță managerul.
- **Textul original (§17):**

  > - **Q15 Neprezentări**: în ce interval se numără cele „mai mult de două” (90 de zile, sezon, total)? Cine e „antrenorul responsabil” pentru clienții care doar închiriază? *Implicit: 90 de zile; managerul.*

### <a id="q16"></a>Q16 — Lista de așteptare

- **Prioritate:** MEDIE · **Blochează:** Etapa 3 (liste de așteptare)
- **Stare:** REZOLVATĂ
- **Varianta implicită (din MEGA_PROMPT):** da, în primele 2 ore de la promovare.
- **Folosită în Etapa 3 (27.09.2026):** Anulare gratuită 2 h după promovare (`bookings.promotion_free_cancel_hours`).
- **Răspunsul proprietarului (27.09.2026):** da: anulare gratuită în primele 2 ore de la promovare.
- **Textul original (§17):**

  > - **Q16 Lista de așteptare**: cine e promovat cu mai puțin de 24 h înainte poate anula gratuit? *Implicit: da, în primele 2 ore de la promovare.*

### <a id="q17"></a>Q17 — „Telefon”

- **Prioritate:** MEDIE · **Blochează:** Etapa 12 (notificări); Etapa 1A (dacă telefonul trebuie verificat prin cod)
- **Stare:** DESCHISĂ
- **Varianta implicită (din MEGA_PROMPT):** push; SMS pregătit, dezactivat.
- **Răspunsul proprietarului:** —
- **Textul original (§17):**

  > - **Q17 „Telefon”** la notificări înseamnă notificări push din aplicație, SMS sau ambele? *Implicit: push; SMS pregătit, dezactivat.*

### <a id="q18"></a>Q18 — Pilates

- **Prioritate:** SCĂZUTĂ · **Blochează:** Etapa 12 (notificări pilates)
- **Stare:** DESCHISĂ
- **Varianta implicită (din MEGA_PROMPT):** email + push.
- **Răspunsul proprietarului:** —
- **Textul original (§17):**

  > - **Q18 Pilates**: s-a cerut notificare pe WhatsApp la lista de așteptare, dar ulterior „fără WhatsApp”. *Implicit: email + push.*

### <a id="q19"></a>Q19 — Grupul comunității

- **Prioritate:** SCĂZUTĂ · **Blochează:** Etapa 12 (mesaje pentru comunitate)
- **Stare:** DESCHISĂ
- **Varianta implicită (din MEGA_PROMPT):** generare + postare manuală.
- **Răspunsul proprietarului:** —
- **Textul original (§17):**

  > - **Q19 Grupul comunității** e pe WhatsApp, Facebook, Telegram? AI-ul generează textul, iar echipa îl postează manual? *Implicit: generare + postare manuală.*

### <a id="q20"></a>Q20 — Tenis

- **Prioritate:** ÎNALTĂ · **Blochează:** Etapa 1A (modelul Locație → Resurse)
- **Stare:** REZOLVATĂ
- **Varianta implicită (din MEGA_PROMPT):** suport pentru mai multe locații; site-ul de tenis rămâne separat, cu legături reciproce.
- **Notă:** Lucrez cu varianta implicită: sistemul suportă de la început mai multe locații; la lansare există doar locația Jungle Padel.
- **Răspunsul proprietarului (26.09.2026):** Confirmat varianta implicită: suport pentru mai multe locații; site-ul de tenis rămâne separat, cu legături reciproce.
- **Textul original (§17):**

  > - **Q20 Tenis**: sistemul gestionează și terenurile Clubului Tenis Elite (mai multe locații)? Se integrează sau se înlocuiește site-ul existent al clubului de tenis? *Implicit: suport pentru mai multe locații; site-ul de tenis rămâne separat, cu legături reciproce.*

### <a id="q21"></a>Q21 — Prețuri

- **Prioritate:** MEDIE · **Blochează:** Etapele 3–4 (valori demo); prețurile finale trebuie știute înainte de Etapa 15 (beta)
- **Stare:** PARȚIAL
- **Varianta implicită (din MEGA_PROMPT):** valori demo marcate `DE_STABILIT`.
- **Folosită în Etapa 3 (27.09.2026):** Tarife DEMO marcate DE_STABILIT în `seed_initial --demo`; tenisul 120 RON/oră (R-051).
- **Răspunsul proprietarului (27.09.2026):** încă deschisă (prețurile nu sunt stabilite). Tarifele rămân DEMO, marcate `DE_STABILIT`.
- **Textul original (§17):**

  > - **Q21 Prețuri**: padel, pilates, lecții, sala de evenimente, meniul cafenelei, datele sezonului de vară și de iarnă. *Implicit: valori demo marcate `DE_STABILIT`.*

### <a id="q22"></a>Q22 — Serverul

- **Prioritate:** URGENTĂ · **Blochează:** Etapa 1B (unde publicăm pagina de pre-lansare) și Etapa 14 (deploy)
- **Stare:** PARȚIAL
- **Varianta implicită (propusă în Etapa 0):** Recomandare orientativă, de confirmat în Etapa 14: Ubuntu Server LTS; minimum 8 nuclee, 32 GB RAM, 2 × 1 TB SSD NVMe în oglindă (RAID 1); UPS; IP public fix; internet de rezervă (4G/5G) pentru chioșcuri; backup criptat în afara clubului.
- **Notă:** Vezi și Q40 (găzduire temporară dacă serverul nu e gata).
- **Răspunsul proprietarului (26.09.2026):** „Servere avem sau închiriem.” Resursele de găzduire există; specificațiile exacte, locația și accesul se stabilesc în Etapa 14.
- **Textul original (§17):**

  > - **Q22 Serverul**: sistem de operare, resurse (procesor, memorie, disc), locație (la club sau în centru de date), IP public, UPS, internet de rezervă, cine are acces fizic.

### <a id="q23"></a>Q23 — Hardware

- **Prioritate:** URGENTĂ · **Blochează:** Etapele 7–9 (drivere reale); trebuie răspuns ÎNAINTE de a cumpăra aparatele
- **Stare:** PARȚIAL
- **Varianta implicită (din MEGA_PROMPT):** arhitectură pregătită pentru ambele variante.
- **Notă:** Înainte de achiziție, trimiteți-mi modelele propuse: verific că aparatul de numerar și casa de marcat au protocol sau SDK documentat, utilizabil din Linux. Criteriile sunt în `docs/09-hardware/02-criterii-achizitie-hardware.md`.
- **Răspunsul proprietarului (26.09.2026):** „Le alegem; creează sistemele până atunci.” Proprietarul alege modelele; până atunci totul se construiește și se testează cu simulatoare. Modelele alese trebuie trimise înainte de cumpărare.
- **Textul original (§17):**

  > - **Q23 Hardware**: modelele exacte (aparat de numerar cu rest, casa de marcat fiscală, scannere, ecrane, mini-PC-uri); există scanner lângă fiecare teren pentru scanarea la intrare? *Implicit: arhitectură pregătită pentru ambele variante.*

### <a id="q24"></a>Q24 — Conturi externe

- **Prioritate:** URGENTĂ · **Blochează:** Etapa 1B (furnizorul de email pentru lista de așteptare), Etapa 5 (Apple/Google Wallet), Etapa 12 (cheia AI)
- **Stare:** PARȚIAL
- **Varianta implicită (propusă în Etapa 0):** Toate conturile se creează pe firma clubului, de către proprietar, cu ghid pas cu pas de la mine. Parolele și cheile NU se trimit în chat și nu intră în git: se pun direct în fișierul de configurare (`.env`) de pe server.
- **Notă:** Apple Developer pentru o firmă cere un număr D-U-N-S, care se obține în câteva zile sau săptămâni: merită început acum, ca Wallet să fie gata în decembrie.
- **Răspunsul proprietarului (26.09.2026):** Nu se începe înscrierea în Apple Developer acum. Consecință: Apple Wallet se amână (adaptor pregătit, dezactivat); în Etapa 5 se livrează Google Wallet (dacă se creează contul de emitent), PDF-ul de tipar și emailul cu cardul. Furnizorul de email, emitentul Google Wallet și cheia AI rămân de stabilit.
- **Actualizare (27.09.2026, proprietarul):** Apple Wallet se face în Etapa 5, împreună cu Google Wallet. Codul se construiește și se testează complet; pentru activare e nevoie de contul Apple Developer al firmei (cu număr D-U-N-S) și de certificatul „Pass Type ID”, puse doar în `.env` pe server.
- **Etapa 5 (27.09.2026):** codul pentru Apple Wallet și Google Wallet e gata; pașii pentru conturi sunt în `docs/08-deploy-si-mentenanta/02-ghid-apple-google-wallet.md`. Rămân de creat de proprietar: Apple Developer (cu D-U-N-S), Google Wallet Console, furnizorul de email, cheia AI.
- **Textul original (§17):**

  > - **Q24 Conturi externe**: Apple Developer (pentru Wallet), emitent Google Wallet, furnizor de email, cheie API pentru AI: cine le creează și pe ce firmă?

### <a id="q25"></a>Q25 — Limbi suplimentare

- **Prioritate:** SCĂZUTĂ · **Blochează:** Etapa 11 (website complet)
- **Stare:** DESCHISĂ
- **Varianta implicită (propusă în Etapa 0):** La lansare: română și engleză complete. Spaniolă, italiană și chineză se adaugă din cataloage, traduse cu AI și marcate „necesită revizuire” până la aprobare; franceză și germană doar dacă le confirmați. Revizuirea: o persoană numită de proprietar.
- **Răspunsul proprietarului (27.09.2026):** să punem prețuri orientative. Sunt în sistem de la prima pornire (nu doar în datele demo), marcate `DE_STABILIT` cu nota „Preț orientativ”: padel 180 / 150 / 120 lei pe oră (vârf / semi-vârf / în afara vârfului); lecție de padel 220 / 200 lei pe oră; ședință privată Reformer 180 lei pe oră; clasă de pilates 80 lei pe oră; sala de evenimente 200 lei pe oră; abonamente pe lună: padel 400 / 720 / 960 lei, tenis 360 / 640 / 860 lei, pilates 320 / 560 / 780 lei (Start / Activ / Pro); cafenea: espresso 12, cappuccino 16, apă 8 lei. Prețurile finale le confirmă proprietarul din admin.
- **Textul original (§17):**

  > - **Q25 Limbi suplimentare** peste RO, EN, ES, IT, ZH (franceză, germană, altele?) și cine revizuiește traducerile.

### <a id="q26"></a>Q26 — Datele firmei

- **Prioritate:** URGENTĂ · **Blochează:** Etapa 1B (operatorul de date din nota de informare a listei de așteptare), Etapa 4 (bonuri, facturi), Etapa 5 (GDPR)
- **Stare:** DESCHISĂ
- **Varianta implicită (propusă în Etapa 0):** Câmpurile firmei rămân marcate `DE_CONFIRMAT` în configurare; niciun text legal nu se publică fără ele.
- **Răspunsul proprietarului (26.09.2026):** Datele firmei nu există încă. Câmpurile rămân `DE_CONFIRMAT` în configurare.
- **Textul original (§17):**

  > - **Q26 Datele firmei** (denumire, CUI, adresă, date de contact pentru GDPR) și contabilul (pentru fiscal și e-Factura).

### <a id="q27"></a>Q27 — Calendarul sezoanelor

- **Prioritate:** MEDIE · **Blochează:** Etapa 6 (sezoane)
- **Stare:** REZOLVATĂ
- **Varianta implicită (din MEGA_PROMPT):** da, o lună.
- **Folosită în Etapa 6 (28.09.2026):** un sezon se poate marca „Calibrare”; la închiderea lui nu se dau premii. Datele sezoanelor le alege managerul.
- **Răspunsul proprietarului (28.09.2026):** confirmat (Sezonul 0 – Calibrare, fără premii).
- **Textul original (§17):**

  > - **Q27 Calendarul sezoanelor** și „Sezonul 0 – Calibrare” la deschidere. *Implicit: da, o lună.*

### <a id="q28"></a>Q28 — Turnee

- **Prioritate:** MEDIE · **Blochează:** Etapa 6 (turnee)
- **Stare:** REZOLVATĂ
- **Varianta implicită (din MEGA_PROMPT):** jucătorii, cu confirmare; directorul poate introduce și valida.
- **Folosită în Etapa 6 (28.09.2026):** un jucător sau directorul marchează meciul terminat la Chioșcul Ligii; scorul se introduce și se confirmă tot acolo, în 30 de minute. Directorul (manager) poate introduce și valida singur, la chioșc. Bonus de fază: câștigător 30 LP, finalist 20, semifinaliști 10, sferturi 5 (setarea `league.tournament_bonuses`).
- **Răspunsul proprietarului (28.09.2026):** confirmat (jucătorii la chioșc, cu confirmare; directorul poate introduce și valida; bonus 30/20/10/5 LP).
- **Textul original (§17):**

  > - **Q28 Turnee**: cine introduce scorul (jucătorii sau un arbitru/director de turneu)? *Implicit: jucătorii, cu confirmare; directorul poate introduce și valida.*

### <a id="q29"></a>Q29 — Tipul meciului

- **Prioritate:** MEDIE · **Blochează:** Etapa 3 (tipul sesiunii la rezervare)
- **Stare:** DESCHISĂ
- **Varianta implicită (din MEGA_PROMPT):** la rezervare, modificabil până la check-in.
- **Folosită în Etapa 3 (27.09.2026):** Ales la rezervare, schimbabil până la prima scanare.
- **Răspunsul proprietarului:** —
- **Textul original (§17):**

  > - **Q29 Tipul meciului** se alege la rezervare sau la chioșc? *Implicit: la rezervare, modificabil până la check-in.*

### <a id="q30"></a>Q30 — Afișarea publică a rezultatelor

- **Prioritate:** MEDIE · **Blochează:** Etapa 5 (textul formularului GDPR al ligii)
- **Stare:** REZOLVATĂ
- **Varianta implicită (din MEGA_PROMPT):** da, menționat explicit în formular; de validat cu avocatul.
- **Folosită în Etapa 5 (27.09.2026):** Acordul ligii (`formular-gdpr-liga`) spune explicit că rezultatele meciurilor de ligă și „Meciul zilei” sunt publice, cu nume, prenume și nivel.
- **Răspunsul proprietarului (28.09.2026, prin Q49):** da; în plus, terenul, ora, rezultatele și istoricul fiecărui jucător sunt publice. Acordul ligii, versiunea 2.
- **Textul original (§17):**

  > - **Q30 Afișarea publică a rezultatelor** meciurilor și a Meciului zilei intră în acordul GDPR din ligă? *Implicit: da, menționat explicit în formular; de validat cu avocatul.*

### <a id="q31"></a>Q31 — Clasamentul pe perechi

- **Prioritate:** SCĂZUTĂ · **Blochează:** Etapa 2 (parametru al motorului; nu blochează)
- **Stare:** DESCHISĂ
- **Varianta implicită (din MEGA_PROMPT):** 6.
- **Răspunsul proprietarului:** —
- **Textul original (§17):**

  > - **Q31 Clasamentul pe perechi**: minim de meciuri pentru clasamentul final. *Implicit: 6.*

### <a id="q32"></a>Q32 — Voucherul „Adu un prieten”

- **Prioritate:** MEDIE · **Blochează:** Etapa 4 (vouchere și recomandări)
- **Stare:** DESCHISĂ
- **Varianta implicită (din MEGA_PROMPT):** în afara vârfului și semi-vârf.
- **Folosită în Etapa 4 (27.09.2026):** Voucherul e valabil în afara vârfului și în semi-vârf (`referrals.voucher_bands`), 90 de zile.
- **Răspunsul proprietarului:** —
- **Textul original (§17):**

  > - **Q32 Voucherul „Adu un prieten”**: valabil în orice bandă orară? *Implicit: în afara vârfului și semi-vârf.*

### <a id="q33"></a>Q33 — Cafeneaua

- **Prioritate:** MEDIE · **Blochează:** Etapa 4 (produse de cafenea), Etapa 8 (afișajul cafenelei)
- **Stare:** DESCHISĂ
- **Varianta implicită (din MEGA_PROMPT):** fără stoc la lansare; afișaj la bar.
- **Folosită în Etapa 4 (27.09.2026):** Fără stoc (doar „disponibil / indisponibil”); coada de comenzi pentru bar există în API, afișajul vine în Etapa 8.
- **Răspunsul proprietarului:** —
- **Textul original (§17):**

  > - **Q33 Cafeneaua**: gestiune de stoc? Meniu? Imprimantă de bonuri la bar? *Implicit: fără stoc la lansare; afișaj la bar.*

### <a id="q34"></a>Q34 — Sala de evenimente

- **Prioritate:** MEDIE · **Blochează:** Etapa 3 (rezervarea sălii de evenimente)
- **Stare:** DESCHISĂ
- **Varianta implicită (din MEGA_PROMPT):** cerere de rezervare online, confirmată de manager.
- **Folosită în Etapa 3 (27.09.2026):** Cerere online (`POST /api/v1/events`), aprobată de manager.
- **Răspunsul proprietarului:** —
- **Textul original (§17):**

  > - **Q34 Sala de evenimente**: se rezervă online? Pachete și prețuri? *Implicit: cerere de rezervare online, confirmată de manager.*

### <a id="q35"></a>Q35 — Pachetele corporate

- **Prioritate:** MEDIE · **Blochează:** Etapa 4 (conturi corporate)
- **Stare:** REZOLVATĂ
- **Varianta implicită (propusă în Etapa 0):** Cont de firmă cu angajați asociați; firma cumpără abonamente pentru angajați din configuratorul standard, cu o reducere corporate configurabilă; factură lunară pe firmă; raport lunar de utilizare. Prețurile și pragurile (de exemplu 5 / 10 / 20 de angajați) se stabilesc de proprietar.
- **Folosită în Etapa 4 (27.09.2026):** Cont de firmă cu angajați; reducere per firmă sau implicită (`corporate.default_discount_percent`, 0%, DE_STABILIT); facturare pe firmă; raport lunar de utilizare.
- **Răspunsul proprietarului (27.09.2026):** un singur pachet de firmă, cu 20% reducere la abonamentele angajaților (`corporate.discount_percent` = 20, confirmat). Reducerea nu mai diferă de la o firmă la alta.
- **Textul original (§17):**

  > - **Q35 Pachetele corporate**: structură (număr de angajați, ore incluse, facturare lunară)?

### <a id="q36"></a>Q36 — Membri fondatori

- **Prioritate:** ÎNALTĂ · **Blochează:** Etapa 1B (dacă pagina de pre-lansare oferă locuri de membru fondator)
- **Stare:** REZOLVATĂ
- **Varianta implicită (propusă în Etapa 0):** Pagina de pre-lansare are doar listă de așteptare, fără beneficii promise; modulul „membru fondator” e pregătit în sistem, dar dezactivat până la decizie.
- **Răspunsul proprietarului (26.09.2026):** Confirmat varianta implicită: pagina de pre-lansare are doar listă de așteptare, fără beneficii promise; modulul „membru fondator” pregătit, dezactivat.
- **Textul original (§17):**

  > - **Q36 Membri fondatori** (propunere: 100 de locuri cu beneficii la lansare), da sau nu?

### <a id="q37"></a>Q37 — Personalul

- **Prioritate:** ÎNALTĂ · **Blochează:** Etapa 1A (roluri și permisiuni), Etapa 15 (instruirea personalului)
- **Stare:** REZOLVATĂ
- **Varianta implicită (propusă în Etapa 0):** Rolurile din secțiunea 8.1: Admin, Manager, Recepție, Antrenor/Instructor, Jucător/Client, Dispozitiv. Un instructor de pilates la lansare (R-103); numărul de antrenori și de persoane la recepție e configurabil din admin.
- **Răspunsul proprietarului (26.09.2026):** Confirmat varianta implicită: rolurile Admin, Manager, Recepție, Antrenor/Instructor, Jucător/Client, Dispozitiv; numărul de persoane configurabil.
- **Textul original (§17):**

  > - **Q37 Personalul**: câte persoane la recepție, câți antrenori (padel, tenis), roluri?

### <a id="q38"></a>Q38 — Propunerile de concept

- **Prioritate:** SCĂZUTĂ · **Blochează:** Etapa 13 (branding, marketing); numele terenurilor se pot schimba oricând din admin
- **Stare:** DESCHISĂ
- **Varianta implicită (propusă în Etapa 0):** Nicio propunere nu e adoptată până la decizie. Terenurile se numesc implicit „Teren 1–4”, cu nume configurabile din admin.
- **Răspunsul proprietarului:** —
- **Textul original (§17):**

  > - **Q38 Propunerile de concept** din secțiunea 18: care se adoptă?

## Întrebări noi, apărute în Etapa 0 (Q39–Q42)

### <a id="q39"></a>Q39 — Numele domeniului și marca „Jungle Padel”

- **Prioritate:** URGENTĂ · **Blochează:** Etapa 1B (pagina de pre-lansare), Etapa 13 (branding)
- **Stare:** DESCHISĂ
- **Întrebarea:** Ce domeniu cumpărăm (de exemplu o variantă `.ro` a numelui)? S-a verificat disponibilitatea mărcii „Jungle Padel” la OSIM (România) și EUIPO (Uniunea Europeană)?
- **Varianta implicită (propusă în Etapa 0):** Până la cumpărare lucrăm cu `<domeniu>` (secțiunea 4.6). Recomand verificarea mărcii ÎNAINTE de cumpărarea domeniului și de orice material tipărit.
- **Notă:** Sursa: secțiunile 3, 4.6 și 15.4 din MEGA_PROMPT (verificarea mărcii și a domeniului).
- **Răspunsul proprietarului (26.09.2026):** Nu avem încă domeniu și nici verificarea mărcii. Se lucrează cu `<domeniu>`.

### <a id="q40"></a>Q40 — Găzduirea paginii de pre-lansare dacă serverul propriu nu e gata

- **Prioritate:** URGENTĂ · **Blochează:** Etapa 1B
- **Stare:** REZOLVATĂ
- **Întrebarea:** Serverul propriu (Q22) va fi funcțional în octombrie–noiembrie 2026? Dacă nu, acceptați ca pagina de pre-lansare să stea temporar pe un server virtual închiriat în UE (VPS), cu codul și datele noastre, fără platforme terțe, urmând să fie mutată pe serverul propriu în Etapa 14?
- **Varianta implicită (propusă în Etapa 0):** Da, VPS temporar în UE, cu backup; mutare pe serverul propriu în Etapa 14.
- **Notă:** Sursa: Etapa 1B (pre-lansare devreme) vs. secțiunea 14 (server propriu).
- **Răspunsul proprietarului (26.09.2026):** Acceptat: server propriu sau închiriat (inclusiv pentru pagina de pre-lansare).

### <a id="q41"></a>Q41 — Avocat / DPO pentru revizuirea textelor legale

- **Prioritate:** URGENTĂ · **Blochează:** Etapa 1B (nota de informare pentru lista de așteptare), Etapa 5 (formularul GDPR al ligii)
- **Stare:** REZOLVATĂ
- **Întrebarea:** Aveți un avocat sau un responsabil cu protecția datelor (DPO) care să revizuiască textele legale înainte de publicare? Cine semnează?
- **Varianta implicită (propusă în Etapa 0):** Scriu ciornele complete, marcate „necesită revizuire de către un avocat/DPO înainte de publicare” (secțiunea 12.2); nu se publică fără revizuire.
- **Notă:** Sursa: secțiunea 12.2 din MEGA_PROMPT.
- **Răspunsul proprietarului (26.09.2026):** „Fă tu în locul avocatului și modificăm dacă este cazul.” Textele legale le redactez eu, proprietarul le citește și cere modificări. Fiecare text poartă mențiunea „redactat fără revizuire juridică; recomandăm verificarea de către un avocat/DPO”, iar proprietarul își asumă publicarea.

### <a id="q42"></a>Q42 — Fluxul de aprobare pe GitHub

- **Prioritate:** SCĂZUTĂ · **Blochează:** Etapa 0 (organizare)
- **Stare:** REZOLVATĂ
- **Întrebarea:** Repository-ul se numește `website` și nu are încă un branch principal `main`. Aprobarea unei etape înseamnă: îmbinarea (merge) în `main` și un tag `etapa-N`? Păstrăm numele `website` sau îl redenumim `jungle-padel`?
- **Varianta implicită (propusă în Etapa 0):** Da: la fiecare etapă aprobată, merge în `main` + tag (`etapa-0`, `etapa-1a` …). Numele repository-ului rămâne neschimbat.
- **Notă:** Sursa: secțiunea 14 (tag-uri git pentru fiecare etapă aprobată).
- **Răspunsul proprietarului (26.09.2026):** De acord: la fiecare etapă aprobată, merge în `main` + tag (`etapa-0`, `etapa-1a` …); numele repository-ului rămâne `website`.

## Întrebări noi, apărute în Etapa 1A

### <a id="q43"></a>Q43 — Vârsta minimă pentru a-ți crea singur cont

- **Prioritate:** MEDIE · **Blochează:** înscrierea publică (Etapa 1B / 11)
- **Stare:** REZOLVATĂ
- **Întrebarea:** De la ce vârstă își poate face cineva singur cont online? Sub această vârstă, contul îl face un părinte (conturi de copii, Q7). În România, vârsta de la care o persoană își poate da singură acordul pentru servicii online este 16 ani (de verificat).
- **Varianta implicită (propusă în Etapa 1A):** 16 ani; configurabilă din admin (`accounts.min_self_registration_age`, marcată `DE_CONFIRMAT`). Liga rămâne 18+ (R-006).
- **Răspunsul proprietarului (27.09.2026):** 14 ani. Setarea `accounts.min_self_registration_age` = 14 (confirmat). Notă: pentru persoanele de 14–15 ani, orice prelucrare bazată pe consimțământ (de exemplu mesaje de marketing) are nevoie de acordul părintelui (vârsta consimțământului digital în România: 16 ani, Legea 190/2018); astfel de opțiuni vor fi oprite pentru ei până la 16 ani.

## Întrebări noi, apărute în Etapa 1B

### <a id="q44"></a>Q44 — Randări sau fotografii reale ale spațiilor

- **Prioritate:** MEDIE · **Blochează:** imaginile din grila „Facilități integrate” (Etapa 1B), website-ul complet (Etapa 11), materialele de marketing (Etapa 13)
- **Stare:** DESCHISĂ
- **Context:** proprietarul a cerut (27.09.2026) randări fotorealiste pentru vestiare, studioul de Pilates Reformer și sala de evenimente. Nu avem încă proiectul de arhitectură (planuri, materiale, finisaje), iar o randare „inventată” ar fi prezentată ca realitate (invariantul 12). Arena și cardul de membru sunt randări proprii, marcate ca ilustrative.
- **Întrebarea:** Există (sau va exista) un proiect de arhitectură / design interior cu randări? Sunt disponibile planurile și materialele, ca să realizăm noi randările? Când se pot face fotografii reale?
- **Varianta implicită:** până la primirea materialelor, grila de facilități folosește pictograme și nota „Randările fotorealiste ale acestor spații vor fi adăugate pe baza proiectului de arhitectură”. Folosim doar imagini proprii (fără imagini cumpărate de pe site-uri de stock).

## Întrebări noi, apărute în Etapa 2

### <a id="q45"></a>Q45 — Valorile implicite ale ligii alese în Etapa 2

- **Prioritate:** SCĂZUTĂ · **Blochează:** nimic (toate se schimbă din configurarea versionată, fără cod)
- **Stare:** DESCHISĂ
- **Context:** acolo unde specificația nu spunea exact, am ales o variantă implicită, marcată DE_CONFIRMAT în [ID-URI-REGULI.md](../03-liga/ID-URI-REGULI.md).
- **Întrebările, pe înțeles:**
  1. **Provocări:** se poate provoca și cineva de pe aceeași treaptă, nu doar de pe treapta de deasupra? *Implicit: da.*
  2. **Perechi noi:** o pereche care joacă prima dată împreună pornește de la media nivelurilor celor doi. *Implicit: da.*
  3. **Bonusuri:** bonusul de provocare (+5) și cel de turneu se adaugă chiar dacă meciul a adus deja maximul de +60. *Implicit: da.*
  4. **Nivelul pentru ranguri:** din simulare, am ales ca un jucător de nivel 5,9 sau peste să tindă spre Maestru (nu 7,0, ca în formula inițială, unde nimeni nu ajungea Maestru). *Implicit: 5,9, recalibrat după Sezonul 0.*
  5. **Regula la 40–40:** „Star Point”, regula oficială din 2026 (două avantaje, apoi un punct decisiv). *Implicit: Star Point; se poate alege „Punct de aur” pentru ligă.*

### <a id="q46"></a>Q46 — Etichetele neclare din schița clubului

- **Prioritate:** SCĂZUTĂ · **Blochează:** nimic (planul de pe site le omite până la confirmare)
- **Stare:** DESCHISĂ
- **Context:** pe 27.09.2026 proprietarul a trimis schița clubului și a confirmat citirea noastră:
  - două clădiri despărțite de o alee cu acces din două capete;
  - clădirea de padel: 4 terenuri 2 × 2, pasarela-lounge la 3 m între rânduri, cafenea cu scară, recepție, vestiare;
  - clădirea de alături: pilates și sala de evenimente;
  - parcări;
  - parkour pentru copii.
- **Întrebările:**
  1. Ce scrie sub „Sala de evenimente” și în parcarea de jos?
  2. Câte aparate Reformer sunt la deschidere? Schița arată 6, documentația spune 4, extensibil la 6.
  3. Care este înălțimea exactă a pasarelei?
- **Varianta implicită:** textele neclare nu apar pe site; rămân 4 aparate Reformer la deschidere (R-100); pasarela este la 3 m.
- **Răspunsul proprietarului (27.09.2026):** 4 aparate Reformer momentan; pasarela are 3 m. Rămâne deschis doar punctul 1 (textele de sub „Sala de evenimente” și din parcarea de jos).

## Întrebări noi, apărute în Etapa 6

### <a id="q47"></a>Q47 — Chestionarul de nivel: cum se estimează nivelul

- **Prioritate:** SCĂZUTĂ · **Blochează:** nimic (antrenorul confirmă sau schimbă nivelul înainte de primul meci, R-003)
- **Stare:** REZOLVATĂ
- **Varianta implicită (DE_CONFIRMAT):** jucătorul alege descrierea care i se potrivește (treapta de nivel); estimarea pornește de la mijlocul treptei: −0,25 dacă joacă padel de mai puțin de un an, +0,25 dacă a jucat competițional alt sport cu rachetă, +0,25 dacă a jucat turnee regionale sau naționale. Rezultatul rămâne mereu în treapta aleasă.
- **Răspunsul proprietarului (28.09.2026):** confirmat.
### <a id="q48"></a>Q48 — Provocările: unde, cine răspunde, ce înseamnă lipsa răspunsului

- **Prioritate:** MEDIE · **Blochează:** nimic
- **Stare:** REZOLVATĂ
- **Variantele implicite (DE_CONFIRMAT):**
  1. Provocările se lansează și se acceptă **la Chioșcul Ligii**, cu cardul; pe site doar se văd (invariantul 2: de la distanță, liga doar se vizualizează).
  2. La dublu, provocarea e între **perechi**, după rangul perechii; ambele perechi trebuie să fi terminat meciurile de plasare.
  3. Răspunde **unul dintre cei provocați**, pentru toată perechea.
  4. **Fără răspuns în 72 de ore = refuz** (altfel refuzurile s-ar putea ocoli prin tăcere).
  5. La al treilea refuz, dacă adminul alege „înfrângere tehnică”, **managerul primește o notificare și decide**; nu se scad puncte automat, pentru că un scor se introduce doar la chioșc (invariantul 1).
- **Răspunsul proprietarului (28.09.2026):** da, confirmat în întregime.
### <a id="q49"></a>Q49 — Turneele: limita zilnică, înscrierea, ce se vede pe site

- **Prioritate:** MEDIE · **Blochează:** nimic
- **Stare:** REZOLVATĂ
- **Variantele implicite (DE_CONFIRMAT):**
  1. Meciurile de turneu **nu intră în limita de 3 meciuri oficiale pe zi** și nu au „randament descrescător”: sunt trase la sorți de sistem, iar un turneu are mai multe meciuri pe zi.
  2. Înscrierea se face **din cont** (ca o rezervare) sau la recepție. Cel care înscrie perechea își alege partenerul; partenerul se poate retrage oricând înainte de tragere.
  3. Taxa de participare (DE_STABILIT) e condiția de plată: un meci de turneu contează doar când toți jucătorii lui au taxa plătită.
  4. Pe site apar înscrierile, tabloul, scorurile și clasamentul, **fără teren și fără oră** (R-012: despre un jucător se publică doar numele, nivelul, LP-ul și locul).
  5. Un rezultat de turneu, odată folosit de tablou, **nu se mai anulează** din admin (tabloul a mers mai departe).
  6. Un turneu se desfășoară pe mai multe rezervări de câte cel mult 3 ore (regula R-041 a duratelor).
- **Răspunsul proprietarului (28.09.2026):** punctul 1 confirmat (fără limită zilnică la turnee). Punctul 4 schimbat: **pe site apar terenul și ora meciurilor, numele, rangul, LP-ul și locul, plus rezultatele meciurilor și istoricul fiecărui jucător**. R-012 și acordul ligii (versiunea 2) au fost actualizate. Restul confirmat.
### <a id="q50"></a>Q50 — Insignele și „Meciul zilei”: praguri și ce se afișează

- **Prioritate:** SCĂZUTĂ · **Blochează:** nimic (totul se schimbă din setări)
- **Stare:** REZOLVATĂ
- **Variantele implicite (DE_CONFIRMAT):**
  1. **Insigne** (vizibile doar în contul propriu): „Ucigaș de giganți” la o victorie contra unei echipe cu cel puțin un nivel peste; 10 victorii la rând; „Early Bird” după 5 meciuri terminate înainte de ora 10; 4 săptămâni la rând cu meciuri; „Surpriza săptămânii” (lunea, pentru săptămâna trecută); promovare; primul Diamant; Rege al Junglei. O insignă primită rămâne, chiar dacă un meci e anulat ulterior.
  2. **Meciul zilei**: se alege dintre meciurile de ligă de azi după un scor de miză (promovare la îndemână 3, duel între doi jucători din top 10: 3, unul din top 10: 1, provocare 2, rivalitate 2, diferență de nivel 1). Adminul îl poate schimba, cu motiv. Pe site și pe ecrane apar doar numele, rangul, nivelul, LP-ul și locul jucătorilor (fără teren și oră). Textul de prezentare scris de AI vine în Etapa 12.
- **Răspunsul proprietarului (28.09.2026):** confirmat. (Meciul zilei arată acum și terenul și ora, după Q49.)

### <a id="q51"></a>Q51 — Un jucător nou care intră în ligă imediat după meci: meciul contează?

- **Prioritate:** SCĂZUTĂ · **Blochează:** nimic
- **Stare:** REZOLVATĂ
- **Situația:** un jucător nou joacă un meci oficial, apoi semnează acordul ligii la chioșc și abia după aceea se introduce scorul. În momentul meciului, el nu era în ligă.
- **Varianta implicită (DE_CONFIRMAT, în lucru din 28.09.2026):** meciul **nu contează** în ligă; chioșcul refuză scorul imediat, cu mesajul „X s-a înscris în ligă după acest meci, deci meciul nu poate conta în ligă”. Motivul: liga se calculează în ordinea meciurilor, iar înainte de înscriere jucătorul nu are nivel în ligă. (Fără această regulă, scorul ar fi trecut de chioșc și s-ar fi blocat abia la ultima confirmare.) Regula: LG-099.
- **Alternativă:** meciul contează, iar înscrierea se socotește de la începutul meciului.
- **Răspunsul proprietarului (28.09.2026):** confirmat: meciul nu contează (LG-099).

### <a id="q52"></a>Q52 — Chioșcul Ligii: 30 de secunde până la ieșire, limbile ecranului

- **Prioritate:** SCĂZUTĂ · **Blochează:** nimic
- **Stare:** REZOLVATĂ
- **Variantele implicite (DE_CONFIRMAT):**
  1. Ieșirea automată după **30 de secunde** fără atingere (din §8.2), cu numărătoare inversă în ultimele 10 secunde. Serverul mai ține sesiunea încă cel mult 60 de secunde, legată de acel chioșc.
  2. Ecranul e în **română și engleză** (buton în colț); sesiunea pornește în limba aleasă de jucător în cont. §8.2 pomenește „și celelalte limbi”: se adaugă când le alegeți (textele sunt deja separate de cod).
  3. Clasamentul de repaus se schimbă la **10 secunde** între Dublu, Simplu și Perechi.
- **Răspunsul proprietarului (28.09.2026):** confirmat (30 s, RO + EN, 10 s).

## Întrebări noi, apărute în Etapa 8

### <a id="q53"></a>Q53 — Chioșcul de Plăți: numerar, rest, credit, bon fiscal

- **Prioritate:** MEDIE · **Blochează:** nimic (lucrez cu variantele implicite, configurabile în admin)
- **Stare:** DESCHISĂ
- **Variantele implicite (DE_CONFIRMAT, din 29.09.2026):**
  1. **Suma maximă a unei plăți la chioșc: 5.000 lei** (`checkout.max_amount`). Peste ea, plata se face la recepție.
  2. **Grupele de TVA pe bonul fiscal:** toate pe grupa „A” (`checkout.vat_groups`), până le confirmă contabilul (terenuri, pilates, abonamente, cafenea, taxe de turneu pot avea cote diferite).
  3. **Restul pe care aparatul nu îl poate da** (după ce clientul a acceptat „restul în cont”, sau la un blocaj) devine **credit în contul clientului**; dacă clientul nu a bifat acordul, managerul primește și o notificare.
  4. **Plata întreruptă** (cădere de curent, aparatul repornește): nu se cumpără nimic automat; banii rămași în aparat devin credit în cont, iar managerul e anunțat.
  5. **Fiscal:** bonul fiscal se tipărește la plata cu numerar; plata din credit sau cu voucher **nu** scoate bon nou (creditul a trecut deja printr-o încasare). Trebuie confirmat cu contabilul, inclusiv cum se tratează creditul rămas din rest.
  6. **Abonament la chioșc fără email confirmat:** cardul clubului (emis la recepție) îl identifică pe client, deci chioșcul primește comanda chiar dacă emailul nu e confirmat (online, emailul confirmat rămâne obligatoriu, R-002).
- **Alternative:** altă sumă maximă; cote TVA separate de la lansare; restul nedat returnat doar la recepție (fără credit); plata din credit cu bon fiscal separat.
- **Răspunsul proprietarului:** —

### <a id="q54"></a>Q54 — Chioșcul de Plăți: modul personal (cine, PIN)

- **Prioritate:** MEDIE · **Blochează:** nimic
- **Stare:** DESCHISĂ
- **Variantele implicite (DE_CONFIRMAT, din 29.09.2026):**
  1. **Cine are voie la casa chioșcului** (alimentare rest, golire casetă, numărare, raport Z): **managerul și recepția**.
  2. **PIN-ul:** 6 cifre, setat de fiecare angajat din contul lui (cu autentificare în doi pași); nu sunt permise PIN-uri ușoare (111111, 123456). După **5 greșeli** la rând, PIN-ul se blochează **15 minute** (`checkout.pin_max_failures`, `checkout.pin_lock_minutes`).
  3. Sesiunea de personal la chioșc durează **5 minute** de la ultima acțiune și e legată de acel chioșc.
  4. O **diferență la numărare** (bani în aparat față de registru) ajunge automat la manager.
- **Alternative:** doar managerul; PIN de 4 cifre; alt prag de blocare.
- **Răspunsul proprietarului:** —

## Întrebări noi, apărute în Etapa 9

### <a id="q55"></a>Q55 — Ecranele de la terenuri și din lobby: cine apare pe nume, echipele, anunțurile

- **Prioritate:** MEDIE · **Blochează:** nimic (lucrez cu variantele implicite, configurabile în admin)
- **Stare:** REZOLVATĂ (29.09.2026)
- **Variantele implicite (DE_CONFIRMAT, din 29.09.2026):**
  1. **Pe ecrane apar pe nume doar jucătorii din ligă** (cu acordul GDPR semnat la chioșc), cu câmpurile publice din R-012: nume, rang, LP, nivel. Oricine altcineva de pe teren (un invitat, cineva care nu e în ligă, cineva care și-a retras acordul) apare doar ca **„Jucător”**, fără nume și fără alte date.
  2. **Echipele:** dacă meciul a fost deja introdus la Chioșcul Ligii, sau e un meci de turneu ori o provocare acceptată, echipele sunt cele de acolo. Altfel, când 4 jucători și-au scanat cardul la intrarea pe teren, ecranul îi arată **în perechi, în ordinea scanării** (primii doi contra ultimii doi) (`screens.pairs_from_scan_order`); cu 2 jucători, unul contra altul; cu 3, unul sub altul, fără „vs”.
  3. **Anunțurile clubului pe ecrane** („reclame interne”, §8.5): texte scurte (maximum 160 de caractere), în română și engleză, scrise de club în admin (`screens.announcements`); se rotesc la 12 secunde. Implicit nu e niciunul.
  4. **Codul QR** de pe ecrane duce la pagina publică a ligii de pe site (`screens.qr_url`, implicit `/ro/liga`).
- **Alternative:** perechile doar după introducerea scorului (până atunci, jucătorii unul sub altul); invitații cu prenumele (ar cere acordul lor); fără anunțuri pe ecranele de la terenuri.
- **Răspunsul proprietarului (29.09.2026):**
  1. **Toți jucătorii apar pe nume** pe ecrane; cei din ligă sunt marcați clar, cu o insignă „Ligă”, și doar ei au rang, LP și nivel (R-012). Cine își șterge contul apare ca „Jucător”. Cine nu vrea să apară pe nume o poate cere (dreptul de opoziție, GDPR art. 21) și apare ca „Jucător”: deocamdată recepția o notează în adminul tehnic; pagina din panoul de admin vine în Etapa 10. Politica de confidențialitate (ciorna) spune asta.
  2. **Echipele:** implicit, în perechi după ordinea scanării; în plus, **jucătorii își aleg singuri echipele la Chioșcul Ligii** („Echipele pe teren”: „Cu cine joci?”), iar ecranul terenului se schimbă imediat. Nu se poate după introducerea meciului, la un meci de turneu sau la o provocare.
  3. **Anunțurile clubului:** confirmat (texte scurte RO + EN, implicit niciunul).
  4. **Codul QR:** confirmat (pagina ligii de pe site).
- **Aplicat în Etapa 10 (29.09.2026):** cererea „nu mai afișa numele pe ecrane” se notează acum din panoul de admin, pe fișa persoanei (Utilizatori), de recepție, manager sau admin (permisiunea `privacy.requests`), cu motiv, în jurnal.

### <a id="q56"></a>Q56 — Panoul de admin: cine vede rapoartele financiare

- **Prioritate:** SCĂZUTĂ · **Blochează:** nimic (lucrez cu varianta implicită)
- **Stare:** DESCHISĂ (din 29.09.2026)
- **Varianta implicită (DE_CONFIRMAT):** rapoartele pe perioade (venituri pe categorii, reduceri, ocuparea terenurilor) și exporturile CSV (registrul pentru contabil, rezervările) le văd **doar adminul și managerul** (permisiunea nouă `reports.view`). Recepția vede, ca până acum, registrul zilei, numerarul chioșcurilor și seiful (de care are nevoie la închiderea zilei), dar nu rapoartele pe perioade.
- **Alternative:** rapoartele doar pentru admin (proprietar); sau și pentru recepție.

## Întrebări noi, apărute în Etapa 11

### <a id="q57"></a>Q57 — Site-ul complet: când înlocuiește pagina de pre-lansare

- **Prioritate:** MEDIE · **Blochează:** nimic (lucrez cu varianta implicită)
- **Stare:** REZOLVATĂ (29.09.2026)
- **Răspunsul proprietarului (29.09.2026):** „când le ofer eu și când public varianta”. Site-ul complet apare **doar când îl publică proprietarul**, manual, fără o dată automată. Rămâne valabilă varianta implicită de mai jos (comutatorul `full_site`, oprit până atunci), acum confirmată.
- **Context:** în Etapa 11 construim site-ul complet (§9.2), secțiune cu secțiune. Până la lansare, vizitatorii văd pagina de pre-lansare aprobată în Etapa 1B (lista de așteptare).
- **Varianta implicită (DE_CONFIRMAT):** site-ul complet stă **ascuns în spatele comutatorului `full_site`**, oprit. Vizitatorii văd în continuare pagina de pre-lansare; paginile noi (Padel, Liga, Pilates, Rezervări, Cont…) nu există pentru ei (răspund „pagină negăsită” și nu apar în Google). Îl porniți dumneavoastră când hotărâți, din panoul de admin (**Setări și feature flags** → `full_site`, cu motiv) sau, tehnic, cu `manage.py set_flag full_site on --reason "..."`. Site-ul se schimbă în câteva secunde (serverul îi cere site-ului să se reîmprospăteze); dacă acel semnal se pierde, cel târziu în 5 minute.
- **Alternative:** pornirea automată la o dată fixă (de exemplu cu o lună înainte de deschiderea din martie 2027); sau site-ul complet vizibil imediat, cu mențiunea „în construcție”.
- **Întrebare pentru proprietar:** când vreți să apară site-ul complet: la o dată anume, după ce aprobați toate secțiunile, sau cu câteva săptămâni înainte de deschidere?

### <a id="q58"></a>Q58 — Adresa site-ului Clubului Tenis Elite

- **Prioritate:** SCĂZUTĂ · **Blochează:** nimic (secțiunea Tenis merge și fără link)
- **Stare:** REZOLVATĂ (30.09.2026)
- **Răspunsul proprietarului (30.09.2026):** „nu avem adresa”. Secțiunea Tenis rămâne **fără link** și fără promisiunea unuia (fraza „Legătura … apare aici în curând” a fost scoasă). Dacă site-ul de tenis va avea o adresă, se completează din panou (**Setări** → `club.tennis_club_url`) și butonul „Mergi la Clubul Tenis Elite” apare singur.
- **Context:** Q20 (26.09.2026): site-ul de tenis rămâne separat, cu legături reciproce. Secțiunea Tenis a site-ului (Etapa 11, secțiunea 8) trebuie să trimită vizitatorul acolo, dar adresa site-ului nu apare în documentație.
- **Varianta implicită (DE_CONFIRMAT):** până primim adresa, secțiunea scrie „Legătura spre site-ul Clubului Tenis Elite apare aici în curând.”, fără link. Adresa se completează din panou (**Setări** → `club.tennis_club_url`, doar `https://…`), iar site-ul se actualizează singur în câteva secunde.
- **Întrebare pentru proprietar:** care e adresa site-ului Clubului Tenis Elite? Și, pentru legătura inversă: puteți adăuga pe site-ul de tenis un link spre Jungle Padel, când publicați site-ul complet?
