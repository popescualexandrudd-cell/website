# 5.7 Plăți

> **Sursa:** `MEGA_PROMPT.md` §5.7 (versiunea 1.0, 26.09.2026). Text preluat integral în Etapa 0, fără modificări de conținut.
> De acum, acest fișier este referința de lucru pentru această secțiune. Orice modificare ulterioară se notează aici, cu data și sursa („confirmat de proprietar la data X”); `MEGA_PROMPT.md` rămâne neschimbat, ca referință istorică.

- **R-060** **Pentru padel nu există credite.** Se plătește ora (sesiunea) de teren, iar jucătorii **o împart între ei**. La chioșc se încasează ora de padel; există funcția **„Împarte ora cu partenerii”**: fiecare își scanează cardul și își plătește partea. Organizatorul poate plăti și integral.
- **R-061** Împărțirea sumei: în bani întregi, cu restul distribuit determinist (primul participant plătește restul de bani, de exemplu 100,01 / 3). Testat.
- **R-062** **Chioșcul de plăți acceptă, la lansare, doar NUMERAR și dă rest.** Aparatul care se cumpără suportă orice metodă (numerar, POS cu card) și orice software, deci arhitectura are adaptoare pentru POS, activabile ulterior. Banca nu e aleasă încă.
- **R-063** Plata online cu card pe website: procesatorul nu e ales (Q9). Până atunci, rezervările online sunt „plată la locație”, cu datorie urmărită în cont.
- **R-064** **Registru contabil intern (ledger) cu dublă înregistrare**, imutabil: orice mișcare de bani (numerar primit, rest dat, plată, rambursare, credit în cont, voucher, discount, taxă de neprezentare) e o înregistrare nemodificabilă. Corecțiile se fac prin înregistrări inverse, cu motiv și autor.
- **R-065** **Contul clientului are un sold** (credit din anulări eligibile, rambursări, recompense) și poate avea **datorii** (taxe de anulare tardivă sau neprezentare, rezervări neplătite).
- **R-066** Fiecare încasare în numerar la chioșc emite **bon fiscal** prin casa de marcat fiscală integrată (obligație legală în România; modelul se alege la achiziție). Facturi pentru corporate, inclusiv e-Factura (Q26).
- **R-067** Idempotență: orice operație de plată are o cheie unică; o re-trimitere nu poate încasa de două ori.

## Modificări

- **27.09.2026** (confirmat de proprietar, Q9): la lansare **doar plata în numerar**. Plata online cu card nu se activează; rezervările online rămân „plată la locație”, cu datoria urmărită în cont.
