# Raport de verificare — Etapa 5 (carduri, Apple Wallet și Google Wallet, GDPR)

> Data: 27.09.2026. Branch: `claude/hopeful-euler-rguibn`. Starea: **livrată, așteaptă aprobarea proprietarului.**

La cererea proprietarului (27.09.2026), etapa include și **Apple Wallet**, nu doar Google Wallet (Q24).

## Ce s-a construit

### Cardul de membru
Reguli: R-020, R-022, R-025.

- Fiecare membru are un card cu **cod QR** care conține doar un **cod aleatoriu** (fără nume, email sau alte date).
- Primul card se creează la prima vizită în cont și se anunță pe email.
- Cardul are și un număr scurt, tipărit pe el (de exemplu JP-7K2M9QXA).

### Card pierdut
Regula: R-022.

- Din cont, membrul **blochează** cardul pierdut și primește **imediat** unul nou.
- Codul vechi nu mai funcționează nicăieri, nici în Wallet.
- Recepția poate reemite sau bloca un card, doar cu motiv scris.

### Scanarea cardului
Regula: R-025.

- Sosirea, intrarea pe teren și prezența la clase se înregistrează cu codul de pe card.
- Un cod necunoscut sau blocat e refuzat la fel, ca să nu se poată ghici care coduri au existat.

### Carduri fizice
Regula: R-021.

- O coadă „carduri de tipărit” (membru nou, reemitere, Diamant) cu stările de tipărit → tipărit → predat.
- Fișierul de tipar e un **PDF la dimensiunea de card bancar (CR80, 85,60 × 53,98 mm)**, în identitatea „Noapte și alamă”.
- Fontul e inclus în fișier, deci ă, â, î, ș, ț se tipăresc corect.
- Exemple: [card de membru](card-membru.png), [card Diamant](card-diamant.png). Numele sunt cele demo din §8.5, iar codurile QR sunt de test.

### Cardul Diamant
Reguli: R-024, Q1.

- La prima promovare în Diamant, o singură dată, jucătorul alege o emblemă de junglă dintr-o listă: jaguar, panteră, tucan, gorilă, crocodil, papagal ara, anaconda, leopard.
- Lista se modifică din setări și e de confirmat la Q1.
- Cardul intră la tipărit abia după alegerea emblemei.
- Declanșarea automată vine cu liga, în Etapa 6.

### Apple Wallet
Reguli: R-020, R-023.

- Cardul se adaugă în Apple Wallet: fișier `.pkpass` semnat cu certificatul clubului, etichete în română și engleză, culorile clubului.
- Include serviciul prin care iPhone-ul se abonează la actualizări și notificarea care îi cere să descarce cardul nou.

### Google Wallet
Reguli: R-020, R-023.

- Butonul „Adaugă în Google Wallet” este un link semnat cu cheia clubului.
- Modificările se trimit automat către Google.

### Actualizări automate
Regula: R-023.

Cardul din telefon se schimbă singur când:
- e reemis (cel vechi devine invalid);
- membrul își schimbă numele;
- se schimbă rangul și punctele după fiecare meci validat. Conexiunea există; o folosește liga în Etapa 6.

### Activarea Wallet
- Codul e gata. Apple Wallet și Google Wallet pornesc când certificatele clubului sunt puse pe server.
- Pașii: [ghidul pentru Apple Wallet și Google Wallet](../../../08-deploy-si-mentenanta/02-ghid-apple-google-wallet.md).
- Comanda `wallet_check` verifică totul fără să contacteze Apple sau Google.

### Acordul GDPR al ligii
Reguli: R-006, R-010, R-011, Q30.

- Textul complet e în română și engleză ([formular-gdpr-liga.ro.md](../../../07-securitate-gdpr-legal/texte/formular-gdpr-liga.ro.md)).
- Poartă mențiunea „Redactat fără revizuire juridică”.
- Afișarea publică a rezultatelor și a „Meciului zilei” e scrisă explicit (varianta implicită Q30).

### Semnarea acordului
- Se poate semna **doar la un Chioșc de Ligă activ** și **doar de la 18 ani** (ziua în care împlinește 18 ani contează).
- Se înregistrează: persoana, versiunea textului și amprenta lui, data și ora, chioșcul, limba și adresa IP.
- Dacă textul se schimbă, chioșcul știe că trebuie semnat din nou.
- Ecranul chioșcului vine în Etapa 7.

### Retragerea acordului
- Se face din cont, oricând.
- Liga (Etapa 6) primește semnalul și scoate jucătorul din ligă.

### Exportul datelor
Referință: GDPR art. 15 și 20.

- Un fișier cu **tot** ce știe clubul despre persoană: profil, acorduri, carduri, rezervări, clase, prezențe, abonamente, vouchere, mișcări în cont, plăți, comenzi la cafenea.
- Fișierul nu conține nimic despre alte persoane.

### Ștergerea contului
Referință: §12.2.

- Membrul șterge contul din cont (cu parola), sau personalul o face la cerere, cu motiv.
- Persoana devine **„Jucător retras”**: numele, emailul, telefonul și data nașterii se șterg, iar contul se închide.
- Cardurile se blochează, iar cardul din Wallet devine invalid pe telefon.
- Se șterg prezențele, listele de așteptare, codul de recomandare și voucherele.
- **Rămân, fără date personale:** istoricul altor jucători (ca rezultatele lor să rămână corecte), evidența contabilă (obligație legală) și dovada acordurilor date.
- Ștergerea e refuzată, cu un mesaj clar, dacă există:
  - datorii;
  - rezervări viitoare;
  - un rol de personal;
  - conturi de copii gestionate.
- Creditul din cont se pierde doar după confirmare explicită.

## Rezultate
| Verificare | Rezultat |
|---|---|
| Teste backend | **355**, toate trec (47 noi în Etapa 5), acoperire totală 98% |
| Carduri, Wallet, GDPR | 100% acoperire pe ramuri |
| Semnătura Apple | verificată cu OpenSSL în teste, cu certificate de test generate la rulare |
| Linkul Google | semnătura verificată cu cheia publică în teste |
| Modulele de bani, motorul ligii | 100% (neschimbate) |
| Site: 26 de teste cap-coadă + axe | trec (neschimbat) |
| ruff, mypy strict, migrații, client API, traduceri RO/EN | 0 probleme |

## Dubla revizuire: probleme găsite și reparate
1. **Verificarea cheii Apple:** comparația simplă a cheii Apple Wallet ar fi putut fi ghicită măsurând timpii de răspuns. Acum folosește o comparație în timp constant.
2. **Numele vechi în Wallet:** schimbarea numelui în cont nu actualiza cardul din Wallet. Acum îl actualizează. O schimbare de limbă nu declanșează actualizarea.
3. **Recomandări după ștergere:** un cont șters ar fi putut primi totuși voucherul „Adu un prieten”. Recomandările în așteptare ale contului se anulează la ștergere.
4. **Din perspectiva unui atacator:**
   - codul QR nu conține date personale și se poate bloca imediat;
   - codul și cheia Wallet nu apar în adminul de urgență;
   - serviciul Apple răspunde doar cu cheia corectă a fiecărui card;
   - acordul de ligă nu se poate semna de pe site sau de la alt dispozitiv decât Chioșcul de Ligă;
   - ștergerea contului cere parola.

## Ce e de confirmat (lucrăm cu varianta implicită, schimbabilă din admin)
| Întrebare | Varianta folosită |
|---|---|
| Q1 cardul Diamant | la prima promovare, o singură dată; emblemă dintr-o listă de 8 animale de junglă |
| Q24 conturile externe | Apple Developer (cu D-U-N-S) și Google Wallet Console, create de proprietar pe firma clubului, după ghid |
| Q30 afișarea publică | rezultatele meciurilor de ligă și „Meciul zilei” sunt publice, scris explicit în acord |
| Q41 textele legale | acordul de ligă e redactat de noi, cu mențiunea obligatorie |

## Limitări cunoscute (intenționate)
- **Chioșcul de Ligă** (ecranul pe care se semnează acordul): Etapa 7. Funcția de semnare e gata și testată.
- **Rangul și LP pe card, cardul Diamant automat:** Etapa 6 (integrarea ligii).
- **Wallet pe telefoane reale:** după crearea conturilor Apple/Google și publicarea serverului pe HTTPS (Etapa 14).
- **Jurnalul de audit** păstrează adresa de email a celui care a făcut o acțiune (dovadă de securitate). Perioada de păstrare e DE_CONFIRMAT în politica de confidențialitate; ștergerea automată după termen vine la deploy (Etapa 14).

## Cum verificați (click cu click)
1. Pe GitHub, branch-ul `claude/hopeful-euler-rguibn`, deschideți acest raport.
2. Deschideți [card-membru.png](card-membru.png) și [card-diamant.png](card-diamant.png) și spuneți-ne dacă vă place cum arată cardul tipărit.
3. Citiți acordul de ligă: `docs/07-securitate-gdpr-legal/texte/formular-gdpr-liga.ro.md`.
4. Pentru Wallet: parcurgeți `docs/08-deploy-si-mentenanta/02-ghid-apple-google-wallet.md`. Primul pas (numărul D-U-N-S) merită început acum.
