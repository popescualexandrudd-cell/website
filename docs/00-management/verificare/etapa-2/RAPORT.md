# Raport de verificare — Etapa 2 (motorul ligii + simulări)

> Data: 27.09.2026. Branch: `claude/hopeful-euler-rguibn`. Starea: **livrată, așteaptă aprobarea proprietarului.**

## Ce s-a construit
| Ce | Detalii |
|---|---|
| Motorul ligii | [`packages/league-engine`](../../../../packages/league-engine/): toate calculele ligii (§6) ca bibliotecă separată, fără bază de date. Backend-ul o va folosi în Etapa 6. |
| Rating ascuns (MMR) | Modelul Weng-Lin, verificat față de o implementare open-source de referință (`openskill`): rezultate identice până la a noua zecimală. |
| Nivel, plasare, ranguri, LP | Nivelul 1.0–7.0, 5 meciuri de plasare, Bronz IV → Maestru, promovare cu surplus, protecție 3 meciuri, retrogradare la 75 LP, Regele Junglei. |
| Scorul | Validator de scor ca la padelul oficial: tie-break, al treilea set complet sau super tie-break, meciuri neterminate cu punctaj redus. |
| Regula la 40–40 | Verificată la sursă: **„Star Point”**, regula oficială FIP / Premier Padel din 2026 ([sursa](https://www.padelfip.com/2025/12/between-innovation-and-tradition-introducing-the-star-point-the-scoring-system-that-appeals-to-everyone/)). Implicită, dar configurabilă. |
| Anti-abuz | Minimum 12 meciuri pentru clasamentul final, maximum 3 meciuri pe zi, puncte reduse la meciuri repetate cu aceiași jucători, decay pentru Diamant și Maestru. |
| Provocări, turnee, sezoane | Bonus +5 LP la provocarea câștigată, turneu ×1,5 + bonus pe fază, resetarea de sezon cu 3 meciuri de re-plasare. |
| Siguranță | Fiecare meci produce un eveniment cu valorile înainte și după. Același meci nu se poate aplica de două ori. Anularea unui meci recalculează sezonul identic cu un calcul de la zero. |
| Documente | [ID-urile regulilor (LG-xxx)](../../../03-liga/ID-URI-REGULI.md), [nivelurile în cuvinte](../../../03-liga/NIVELURI.md), [calibrarea](../../../03-liga/simulari/CALIBRARE.md), [raportul simulării](../../../03-liga/simulari/RAPORT_SIMULARE.md). |

## Rezultate
| Verificare | Rezultat |
|---|---|
| Teste ale motorului | **173**, toate trec, cu ID-ul regulii în nume |
| Acoperire pe ramuri | **100%** (cerința §6.17) |
| Teste de proprietate (hypothesis) | semnul și limitele LP, nicio promovare dublă, podele, determinism, recalculare = calcul de la zero, validatorul nu se blochează la niciun scor |
| Comparația cu `openskill` | diferență ≤ 1e-9 (victorii, înfrângeri, dublu, simplu) |
| Simularea mare (500 de jucători, 50.000 de meciuri, 8 sezoane) | corelația rang–nivel real **0,96–0,98** (țintă ≥ 0,85); fără inflație de LP; distribuția pe ranguri 15/22/28/25/8/2 % (țintă orientativă 20/25/25/17/10/3 %) |
| Exemplele din §6.6 | egal ±20, surpriză +30/−30, favorit +10/−10: exact |
| ruff, mypy strict, restul proiectului (`scripts/test-all`) | 0 probleme |

## Dubla revizuire: probleme găsite și reparate
1. **Cu formula inițială din §6.6, nimeni nu ajungea Maestru** în simulare (0%). Am calibrat „LP-ul așteptat” (ancorele 1,3 → 5,9), cum cere specificația. Noile valori sunt marcate DE_CONFIRMAT și se recalibrează după Sezonul 0.
2. **Plasarea e zgomotoasă** cu σ ridicat: după 5 meciuri, nivelul e uneori mai departe de cel real decât chestionarul. Se corectează singur până la finalul primului sezon. Am păstrat valoarea din specificație și am notat o propunere pentru după Sezonul 0.
3. **Un bonus mare de turneu ar fi putut produce două promovări dintr-o dată.** Surplusul se plafonează acum la 99 LP.
4. **Bonusurile s-ar fi pierdut** la un câștig deja plafonat la +60. Acum se adaugă după plafonare.
5. **Referința `openskill` face media la egalitate** între echipe, ceea ce anulează aproape toată actualizarea. Am păstrat formula din articolul original și am documentat diferența.
6. **Simulatorul socotea ziua în UTC**, iar motorul în ora României, așa că un meci jucat după miezul nopții intra pe altă zi la limita de 3 meciuri. Motorul era corect (are un test pentru un meci de la 00:30, ora României, adică 21:30 UTC); simulatorul folosește acum aceeași regulă.
7. **Din perspectiva unui atacator:**
   - același meci trimis de două ori nu se aplică de două ori;
   - un meci mai vechi decât ultimul aplicat e refuzat și cere recalculare;
   - scorurile imposibile sunt refuzate cu coduri de eroare stabile;
   - datele fără fus orar sunt refuzate;
   - jucătorii necunoscuți sau duplicați sunt refuzați.

## Ce urmează pentru ligă (Etapa 6)
- Fluxul de validare la chioșc: fereastra de scor, confirmarea tuturor, plata.
- Salvarea evenimentelor în baza de date și protecția la confirmări simultane.
- Sezoanele în calendar, provocările, turneele și recompensele.
