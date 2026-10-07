# Evaluarea impactului asupra protecției datelor (DPIA): liga și ecranele publice

> 07.10.2026, verificarea finală (§12.2, GDPR art. 35). **Redactat fără revizuire juridică. Recomandăm verificarea de către un avocat/DPO.** Se aprobă de proprietar înainte de lansare (Q41). Se refac evaluarea și documentul la orice schimbare a datelor afișate public.

## 1. De ce o evaluare
Liga face clasamente publice și calcule automate (rating, rang) despre persoane. Ecranele din club arată numele celor care joacă. Nu e o prelucrare la scară mare și nu are efecte juridice, dar e publică și sistematică. De aceea o evaluăm, ca măsură de prudență.

## 2. Ce se prelucrează
| | Liga | Ecranele terenurilor și din lobby |
|---|---|---|
| **Cine** | adulți (18+) care au semnat acordul ligii la Chioșcul Ligii (R-006, R-010) | jucătorii rezervării de pe acel teren |
| **Ce apare public** | nume, prenume, nivel (rang + nivel numeric), LP, locul în clasament; rezultatele meciurilor de ligă cu data, ora, terenul și LP-ul; istoricul; terenul și ora meciurilor de turneu și ale Meciului zilei (R-012, Q49) | nume și prenume, cât ține rezervarea; „Ligă” pentru cei din ligă, cu rang, LP și nivel (Q55) |
| **Unde** | site, ecrane, chioșcuri | doar în club |
| **Ce NU apare** | insignele, statisticile detaliate, datele de contact, vârsta | orice altceva |
| **Calculul** | motorul ligii (ADR-0008), după reguli publice, doar din scoruri confirmate de jucători la chioșc (invariantul 1) | — |

## 3. Necesitate și proporționalitate
- **Clasamentul public** e chiar serviciul cerut de jucător: o ligă fără clasament nu există. Datele sunt cele minime pentru a o urmări.
- **Temei:** contractul, plus acordul explicit, semnat la chioșc, pentru afișarea publică. Acordul se poate retrage oricând din cont; jucătorul apare apoi „Jucător retras” în istoricul altora, ca rezultatele lor să rămână corecte.
- **Ecranele:** interes legitim (cine joacă pe teren). Opoziția e simplă: la recepție, iar numele devine „Jucător” (`NameObjection`).
- **Minorii:** liga e doar 18+, verificată pe server. Pe ecrane, un minor dintr-o rezervare apare cu numele, ca orice jucător; părintele se poate opune la recepție (DE_CONFIRMAT de proprietar: varianta implicită, numele minorilor pe ecrane, cu opoziție).
- **Decizii automate:** ratingul nu produce efecte juridice. Orice rezultat se poate contesta la personal, care decide doar soarta scorului propus (aplic, redeschid, anulez), niciodată scorul în sine.

## 4. Riscurile și măsurile
| Risc | Probabilitate / gravitate | Măsuri construite |
|---|---|---|
| Scoruri falsificate (de la distanță, de AI, de personal) | mică / medie | doar la Chioșcul Ligii înregistrat: aparat + certificat + rețea + rol, verificat pe server; refuz + jurnal (ADR-0012); AI-ul blocat de două bariere (ADR-0019); testat |
| Date publice peste ce s-a acceptat | mică / medie | datele publice doar prin `league.public` și schemele R-012, verificate de testele API-ului ligii (`league/tests/test_api.py`) |
| Un jucător vrea să dispară | medie / mică | retragerea acordului din cont; ștergerea contului; „Jucător retras” |
| Cineva nu vrea numele pe ecran | medie / mică | opoziția la recepție, efect imediat |
| Furt de date din server | mică / mare | HTTPS, 2FA pentru personal, permisiuni pe rol, backup criptat, actualizări automate de securitate, firewall (Etapa 14) |
| Profilare sau hărțuire pe baza orelor de joc publice | mică / medie | doar meciurile de ligă și turneu sunt publice (Q49); rezervările obișnuite nu; fără date de contact |

## 5. Concluzie
Cu măsurile de mai sus, riscul rămas e **mic**. Nu e nevoie de consultarea prealabilă a ANSPDCP (art. 36). Evaluarea se revede:
- la orice câmp public nou;
- la pornirea asistentului AI pentru clienți;
- la un an după lansare.
