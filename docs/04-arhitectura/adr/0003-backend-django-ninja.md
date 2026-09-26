# ADR-0003: Backend Django 5.2 LTS + Django Ninja, Python ≥ 3.12

- **Stare:** Propus (Etapa 0)
- **Data:** 2026-09-26
- **Legat de:** §4.3 („Django REST Framework sau Django Ninja; alege și justifică în ADR”), §8.1

## Context
Backend-ul este singura sursă de adevăr (§4.1). Are nevoie de: API REST versionat (`/api/v1/`) cu schemă OpenAPI generată automat, din care se generează clientul TypeScript; tipare statice stricte (mypy) pe bani; permisiuni pe roluri, inclusiv pentru dispozitive; un admin tehnic de rezervă (§8.6); întreținere pe mulți ani.

## Decizie
1. **Django 5.2 LTS** (versiune cu suport extins până în aprilie 2028; ultima versiune de patch verificată pe 26.09.2026: 5.2.17). Actualizarea la următorul LTS se planifică înainte de aprilie 2028.
2. **Django Ninja** (1.x, cu Pydantic v2) pentru API-ul `/api/v1/`.
3. Logica de business stă în **module de servicii** (funcții tranzacționale, testate direct), separate de endpoint-uri. Aceleași servicii sunt folosite de API, de sarcinile Celery, de uneltele AI și de admin. Nicio regulă de business nu stă doar în interfață.
4. Adminul tehnic Django rămâne activ ca „mod de urgență”, doar pentru rolul Admin (§8.6).
5. Erorile API returnează coduri stabile (de exemplu `booking.slot_taken`) și parametri; textul pentru utilizator se traduce în frontend (ADR-0018).

### De ce Django Ninja și nu Django REST Framework (DRF)
1. **Contract exact:** schema OpenAPI se generează direct din tipurile Python (Pydantic), deci clientul TypeScript generat corespunde exact API-ului. La DRF este nevoie de un pachet suplimentar (drf-spectacular) și de adnotări manuale, cu risc de nepotrivire.
2. **Tipare statice:** schemele Pydantic și adnotările de tip funcționează natural cu mypy strict, cerut pe bani și pe ligă (§4.3). Serializatoarele DRF sunt dinamice.
3. **Mai puțină „magie”:** fără ViewSet-uri și routere implicite; codul se citește liniar, lucru important pentru sesiuni viitoare fără context.
4. **Async** acolo unde e util (AI, streaming de răspunsuri).

### Riscuri și atenuare
- Ecosistem mai mic decât DRF (permisiuni, throttling, filtre): permisiunile pe roluri și pe dispozitive le scriem explicit oricum (§12.1); limitarea ratei se face la proxy și în aplicație (Redis).
- Dacă Django Ninja nu mai este întreținut: serviciile și schemele Pydantic rămân; se schimbă doar stratul subțire de rute.

## Alternative analizate
- **Django REST Framework:** cel mai matur și cunoscut; alternativă validă, respinsă pentru motivele 1–3.
- **FastAPI separat de Django:** am pierde adminul, ORM-ul, migrațiile și autentificarea Django (două framework-uri de întreținut). Respins.

## Consecințe
- Fiecare endpoint are scheme de intrare și ieșire tipate; clientul TypeScript se regenerează cu o comandă, iar verificarea automată semnalează un client neactualizat.
- Echipa viitoare trebuie să cunoască Django + Pydantic (ambele foarte răspândite).
