# Etapa 16 — Inaugurarea și pornirea: raport

> 07.10.2026. PLAN_DETALIAT, Etapa 16: „lansare, Sezonul 0/1 al ligii (Q27), monitorizare intensivă”. Lansarea propriu-zisă are loc în martie 2027, la club (Q74). Acum s-a construit și s-a testat tot ce trebuie pentru ea. Ce rămâne sunt pași de făcut pe serverul real, cu proprietarul, într-o ordine scrisă.

## Ce s-a făcut
1. **Planul zilei de lansare** (`PLAN-LANSARE.md`):
   - **Z−7:** versiunea `v1.0.0`; golirea datelor din beta; primul administrator, aparatele și backup-ul din nou; Sezonul 0, pregătit dar nepornit;
   - **Z−1:** backup și test de restaurare, aparatele, restul în chioșc, prețurile;
   - **ziua Z, pe ore:** site-ul în motoarele de căutare (`SITE_INDEXABLE=true`); `full_site` pornit; mesajul către lista de așteptare; Sezonul 0 pornit seara;
   - **primele 14 zile:** monitorizare zilnică;
   - **ziua 30:** Sezonul 1 și raportul primei luni.
2. **Versiunile** (`docs/08-deploy-si-mentenanta/08-versiuni.md`):
   - numele `vMAJOR.MINOR.PATCH`;
   - pașii: CI verde pe ramură, `main`, `CHANGELOG`, eticheta, `update` pe server;
   - ce nu se face niciodată.
3. **Uneltele pentru lansare, testate cap-coadă pe stiva de producție** (`scripts/test-deploy`):
   - `update` și `rollback` (cu baza de date readusă în timp);
   - `reset-before-launch` (Etapa 15);
   - pornirea site-ului complet din comutator, cu site-ul citind API-ul din interiorul stivei (reparat în Etapa 15);
   - testul de încărcare.
4. **Sezonul 0 al ligii:** se face din panou (Liga → Sezoane → Sezon nou, cu „Sezon de calibrare (fără premii)”, Q27) și se pornește cu **Pornesc sezonul**. Ambele există din Etapa 6 și sunt testate.

## Ce rămâne (la club, cu proprietarul)
Lista de lansare (`../etapa-15/02-lista-de-lansare.md`), pe scurt:
- **serverul:** cumpărat sau închiriat (Q40) și instalat (`06-instalarea-serverului.md`);
- **domeniul** (Q39);
- **emailul**, cu SPF, DKIM și DMARC (Q24);
- **copia de backup în afara clubului** (Q73);
- **aparatele și casa de marcat fiscală** (Q23, R-066);
- **conturile de Wallet** (Q24);
- **prețurile finale** (Q21), **textele legale aprobate** (Q41), **datele firmei** (Q26);
- **beta-ul** (Q74), apoi ziua lansării după plan.

## Cum verificați
1. Citiți `PLAN-LANSARE.md` și spuneți-ne dacă ordinea și orele vă convin.
2. În CI (jobul **deploy**), secțiunea „update and rollback” și „the reset before the opening”: toate cu `ok`.
