# Scripturi

> **Stare:** construite în Etapa 1A (27.09.2026); simularea ligii vine în Etapa 2.

Comenzi pentru: pregătirea mediului local, date demo (inclusiv numele din exemplul §8.5), rularea tuturor testelor (`test-all`, §13.5), simularea ligii.

## Specificații

- [13. TESTARE ȘI CALITATE (Definition of Done pentru orice livrare)](../docs/00-management/DEFINITION_OF_DONE.md)

## Decizii tehnice

[ADR-0021](../docs/04-arhitectura/adr/0021-calitate-teste-ci.md)

## Scripturi disponibile
| Script | Ce face |
|---|---|
| `test-all` | toate verificările proiectului; trebuie să fie verde înainte de orice livrare |
| `setup` | dependențe, migrații, date inițiale și demo |
| `dev` | pornește backend-ul pe `http://localhost:8000` |
| `generate-api-client` | regenerează schema OpenAPI și clientul TypeScript |
