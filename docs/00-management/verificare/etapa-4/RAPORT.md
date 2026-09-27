# Raport de verificare — Etapa 4 (bani, abonamente, corporate, vouchere, cafenea)

> Data: 27.09.2026. Branch: `claude/hopeful-euler-rguibn`. Starea: **livrată, așteaptă aprobarea proprietarului.**

Etapa 4 construiește tot ce ține de bani, în backend.

- Registrul contabil, plățile și împărțirea orei, soldul și datoriile.
- Abonamentele cu configuratorul în 3 pași și conturile de firmă.
- Voucherele și programul „Adu un prieten”.
- Cafeneaua.

Plățile reale se fac la chioșcul de plăți, care vine în Etapa 8 și folosește exact aceste funcții. Până atunci, managerul poate înregistra o plată doar ca excepție, cu motiv scris (Q10). Ecranele pentru clienți și pentru personal vin în Etapele 10–11.

## Ce s-a construit

### Registrul contabil
Reguli: R-064, R-067, ADR-0009.

- Fiecare mișcare de bani se scrie pe două rânduri egale (dublă înregistrare), în bani întregi.
- Baza de date refuză orice modificare sau ștergere și orice tranzacție care nu e echilibrată.
- Corecțiile se fac doar prin înregistrări inverse, cu motiv și autor, o singură dată.
- Fiecare plată are o cheie unică: dacă e trimisă de două ori (de exemplu după o pană de rețea), se încasează o singură dată.

### Plăți și împărțirea orei
Reguli: R-060 … R-063.

- Oricine poate plăti partea lui dintr-o rezervare.
- Împărțirea sumei se face în bani întregi; primul jucător plătește banii rămași. Exemplu: 100,01 lei la 3 jucători = 33,35 + 33,33 + 33,33.
- Numerar cu rest și bon fiscal (deocamdată de la un simulator, până alegem casa de marcat, Q23).
- Plată din creditul din cont.
- Cardul așteaptă procesatorul de plăți (Q9).

### Sold și datorii
Reguli: R-065, R-070 … R-072, Q14.

- Anulare cu cel puțin 24 h înainte: tot ce s-a plătit devine **credit în cont** pentru fiecare plătitor.
- Anulare târzie sau neprezentare: suma devine **datorie**.
- Clientul își vede soldul, datoriile și istoricul.

### Abonamente
Reguli: R-080 … R-089.

- Configuratorul are trei pași:
  1. sporturile;
  2. intensitatea: Start (4), Activ (8) sau Pro (12) sesiuni pe lună;
  3. perioada.
- Reducerile se aplică una după alta: 2 sporturi −10%, 3 sporturi −15%, trimestrial −5%, anual −15%.
- Prețul final se rotunjește la leu întreg.
- Abonamentul devine activ după plata integrală.
- Lecțiile și clasele de pilates consumă sesiunile lunii. Start nu e valabil la orele de vârf (17–22).
- Sesiunile nefolosite nu se reportează în luna următoare.
- O sesiune anulată la timp devine **sesiune de recuperare**, valabilă până la finalul abonamentului.
- Înghețare de maximum 2 săptămâni pe an; abonamentul se prelungește cu zilele înghețate.
- Intensitățile „La cerere” le creează recepția sau managerul, cu prețul stabilit de club (Q12).

### Corporate
Reguli: R-088, Q35.

- Cont de firmă cu angajați asociați.
- Abonamentele angajaților au reducerea firmei și sunt facturate firmei.
- Raport lunar: câte sesiuni a folosit fiecare angajat și suma facturată.

### Vouchere
Regula: R-121.

- Tipuri: o oră gratuită de padel, o sumă fixă sau un procent.
- Un voucher e al unei singure persoane și se folosește o singură dată.
- Valoarea lui intră în registru ca reducere în momentul folosirii.
- La o anulare gratuită, voucherul redevine valabil; nu se transformă în credit.

### „Adu un prieten”
Reguli: R-120, Q32.

- Fiecare membru are un cod personal.
- După primul abonament plătit de prietenul nou, amândoi primesc o oră gratuită de padel, valabilă în afara vârfului și în semi-vârf.
- Codul se acordă o singură dată pe persoană nouă. Verificăm contul, telefonul și dacă a trecut cel mult o lună de la înscriere.

### Cafenea
Reguli: R-111, R-112, Q33.

- Meniu cu categorii și produse disponibile sau nu (fără stoc la lansare).
- Comenzile se plătesc la plasare și primesc un număr pe zi.
- La bar, comanda trece prin stările nouă → în preparare → gata → ridicată.
- Ecranele din lobby arată doar numerele comenzilor gata.
- Managerul poate anula o comandă înainte să fie gata, cu motiv; banii se întorc.

## Rezultate
| Verificare | Rezultat |
|---|---|
| Teste backend | **308**, toate trec (104 noi în Etapa 4), acoperire totală 97% |
| Modulele de bani (registru, abonamente, vouchere, cafenea) | **100% acoperire pe ramuri**, verificată automat de `scripts/test-all` (ADR-0009) |
| Teste de proprietate (hypothesis) | împărțirea orei nu creează și nu pierde niciun ban; prețul pachetelor e mereu leu întreg, la cel mult 50 de bani de valoarea exactă |
| Motorul ligii | 173 de teste, 100% (neschimbat) |
| Site: 26 de teste cap-coadă + axe | trec (neschimbat) |
| ruff, mypy strict, migrații, client API, traduceri RO/EN | 0 probleme |

## Dubla revizuire: probleme găsite și reparate
1. **Contul firmei nu încăpea în registru**: numele intern al contului era mai lung decât câmpul. Testele au prins problema, iar câmpul a fost mărit.
2. **Voucher transformat în bani:** o rezervare plătită cu voucher și apoi anulată la timp ar fi transformat voucherul în credit real, cheltuibil de exemplu la cafenea. Acum voucherul redevine valabil, iar creditul rămâne zero.
3. **Același credit folosit de două ori:** două plăti simultane din creditul aceluiași client ar fi putut trece amândouă verificarea. Acum se fac pe rând.
4. **Din perspectiva unui atacator:**
   - prețurile vin doar de pe server, nu din ce trimite clientul;
   - o plată trimisă de două ori se încasează o singură dată, iar aceeași cheie cu alte date e refuzată;
   - un voucher se folosește doar de titular;
   - codul de recomandare nu merge pe contul tău, pe un al doilea cont cu același telefon sau pentru cineva care a mai avut abonament;
   - statusul plății unei rezervări îl văd doar organizatorul și personalul;
   - ecranul din lobby arată doar numere.

## Decizie tehnică notată
**Voucherul e o promisiune, nu bani.** La emitere nu se scrie nimic în registru. La folosire, valoarea lui intră ca reducere (cont „Reduceri și recompense”), cu motivul voucherului. Așa, orice voucher folosit apare în registru o singură dată, iar voucherele nefolosite nu umflă artificial conturile.

## Ce e de confirmat (lucrăm cu varianta implicită, schimbabilă din admin)
| Întrebare | Varianta folosită |
|---|---|
| Q9 plata online | dezactivată: „plată la locație”, cu datoria urmărită în cont |
| Q10 recepția | plățile le ia chioșcul; managerul înregistrează excepții, cu motiv, în jurnal |
| Q12 „La cerere” | creată de recepție/manager, cu prețul stabilit de club; sub 8 sesiuni se aplică regula Start |
| Q13 Start | fără orele de vârf (17–22); semi-vârful e permis |
| Q14 recuperare | credit în cont pentru plăți; sesiunea de abonament devine recuperare, valabilă până la finalul abonamentului |
| Q21 prețuri | abonamente și cafenea: valori DEMO, marcate DE_STABILIT |
| Q32 voucherul „Adu un prieten” | în afara vârfului și semi-vârf, valabil 90 de zile |
| Q33 cafeneaua | fără stoc; afișaj la bar (ecranul vine în Etapa 8) |
| Q35 corporate | reducere per firmă (implicit 0%, DE_STABILIT), facturare pe firmă, raport lunar |

## Limitări cunoscute (intenționate)
- **Chioșcul de plăți** (numerar cu bancnote reale, bon la imprimanta chioșcului) și **afișajul cafenelei**: Etapa 8.
- **Casa de marcat fiscală reală și e-Factura pentru firme**: după alegerea modelului (Q23) și confirmarea cu contabilul (Q26). Până atunci, bonurile au numere `SIM-…` și nu sunt documente fiscale.
- **Recompensele de sezon automate** (top 3, reduceri la final de sezon): se emit cu aceleași vouchere în Etapa 6. Deocamdată managerul le poate emite manual.
- Un abonament plătit nu se rambursează din aplicație. Excepțiile le rezolvă managerul, prin corecții în registru, cu motiv.

## Cum verificați (click cu click)
1. Pe GitHub, branch-ul `claude/hopeful-euler-rguibn`: deschideți acest raport.
2. Deschideți `docs/00-management/INTREBARI_DESCHISE.md` și, dacă puteți, răspundeți la:
   - **Q21**: prețurile abonamentelor și ale cafenelei;
   - **Q35**: reducerea pentru firme;
   - **Q9**: vreți plata online cu card la deschidere? Contractul cu banca durează câteva săptămâni.
3. Opțional, local:
   - rulați `scripts/setup`, apoi `scripts/dev`;
   - la `http://localhost:8000/api/v1/docs` găsiți secțiunile „subscriptions”, „account”, „cafe”, „staff: payments”, „staff: vouchers”, „staff: cafe”;
   - încercați configuratorul la `POST /api/v1/subscriptions/quote`.
