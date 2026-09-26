# ADR-0009: Bani — sume întregi în bani, registru cu dublă înregistrare, idempotență

- **Stare:** Propus (Etapa 0)
- **Data:** 2026-09-26
- **Legat de:** §1.1 punctul 8, R-060 … R-067, R-084, §8.3

## Context
Banii trebuie să fie exacți, auditabili și imposibil de modificat pe ascuns. Clienții împart ora între ei, plătesc cu numerar și primesc rest, au sold și datorii.

## Decizie
1. **Toate sumele sunt numere întregi în bani** (RON × 100), tip `bigint` în baza de date. Niciodată `float`. Conversia în lei se face doar la afișare.
2. Fiecare sumă are moneda asociată (`RON` la lansare), ca extindere viitoare.
3. **Registru cu dublă înregistrare (R-064):** fiecare tranzacție contabilă are cel puțin două înregistrări, iar suma debitelor este egală cu suma creditelor (verificat în cod și în baza de date). Conturi interne orientative: numerar pe fiecare chioșc, sold client, creanțe client (datorii), venituri pe categorii (padel, tenis, pilates, lecții, abonamente, cafenea, evenimente), vouchere, reduceri.
4. **Imutabil:** înregistrările nu se modifică și nu se șterg. Corecțiile se fac prin înregistrări inverse, cu motiv și autor (tabel doar-adăugare, ADR-0004).
5. **Idempotență (R-067):** fiecare operație de plată are o cheie unică; o re-trimitere întoarce rezultatul inițial, fără o a doua încasare.
6. **Rotunjiri documentate și testate:** împărțirea orei (R-061: restul de bani îl plătește primul participant, determinist); prețul pachetelor (R-084: reduceri aplicate multiplicativ, rotunjire la leu întreg).
7. **100% acoperire pe ramuri** pentru modulele de bani; teste de proprietate (suma părților = total; niciun ban creat sau pierdut).
8. TVA, categoriile fiscale și e-Factura: `DE_CONFIRMAT` cu contabilul clubului (§12.3).

## Alternative analizate
- **`float`:** erori de rotunjire. Respins.
- **`Decimal`:** exact, dar întregii în bani sunt mai simpli și mai rapizi. Respins pentru stocare și calcule.
- **Câmp simplu „sold” pe client, modificat direct:** fără istoric auditabil. Respins.

## Consecințe
- Soldul unui client este suma înregistrărilor lui, nu o valoare editabilă.
- Rapoartele contabile se obțin direct din registru.
