# Verificarea etapelor 0–6 (28.09.2026)

> La cererea proprietarului („verifică dacă ai parcurs toate etapele și dacă le-ai completat corect”), înainte de Etapa 7. Fiecare etapă a fost comparată cu livrabilele din [PLAN_DETALIAT.md](../PLAN_DETALIAT.md) și cu promisiunile din rapoartele anterioare.

## Rezultatul verificărilor automate (toate odată, `scripts/test-all`, inclusiv browserul)
| Verificare | Rezultat |
|---|---|
| Teste backend | 492, toate trec; acoperire totală 98% |
| Liga și banii (`league`, `ledger`, `subscriptions`, `rewards`, `cafe`) | 100% acoperire pe ramuri |
| Motorul ligii | 174 de teste, 100% pe ramuri |
| Site: teste unitare + 26 de teste cap-coadă în browser (desktop și mobil) + accesibilitate (axe) | trec |
| ruff, mypy strict, migrații, schema API și clientul generat, traduceri RO/EN, contrastul culorilor | 0 probleme |

## Etapă cu etapă
| Etapă | Livrabile din plan | Stare |
|---|---|---|
| 0 | structura de foldere, `docs/`, 22 de ADR-uri, diagrame, întrebări, plan, calendar, README în fiecare folder | complet (50 de întrebări acum, Q1–Q50) |
| 1A | backend, conturi, 2FA, blocare la încercări eșuate, roluri, locații și resurse, audit, configurare versionată, dispozitive, i18n, email, API + client, admin tehnic, CI | complet |
| 1B | site RO/EN, listă de așteptare cu dublă confirmare și dezabonare, export CSV, anti-spam propriu, SEO, pagini legale, cookies | complet (publicarea așteaptă Q39, Q26, Q24, Q22/Q40) |
| 2 | motorul ligii, simularea mare, niveluri, regula la 40–40 | complet |
| 3 | rezervări, prețuri, anulări, neprezentări, liste de așteptare, scanări, clase, sala de evenimente, trecerea la ora de vară | complet |
| 4 | registru, plăți, împărțirea orei, abonamente, corporate, vouchere, recomandări, cafenea | complet |
| 5 | carduri, Apple și Google Wallet, PDF de tipar, acordul ligii, export și ștergere | complet |
| 6 | liga integrată: meciuri, fereastră, confirmări, dispute, plată, sezoane, provocări, turnee, recompense, insigne, Meciul zilei, recalculare, concurență | complet, cu modificările aprobate (Q6, Q49) |

## Promisiuni din rapoartele vechi, verificate
- Etapa 4 → 6: recompensele de sezon automate: **livrate**.
- Etapa 5 → 6: rangul și LP pe cardul din Wallet, cardul Diamant automat, ieșirea din ligă la retragerea acordului: **livrate**.
- Etapa 2 → 6: fluxul de la chioșc, evenimentele salvate, confirmările simultane, sezoane, provocări, turnee, recompense: **livrate**.
- Pentru Etapa 7 (acum): ecranele Chioșcului Ligii (acordul, scorurile), conectarea aparatelor, scanerele (simulatoare până la Q23).

## De reținut
- Acordul ligii are acum **versiunea 2** (Q49). Pe un server existent se publică cu `publish_legal_document` (comanda din `apps/backend/README.md`); jucătorii o semnează din nou la chioșc. Serverul de producție nu există încă, deci nu e nimic de migrat.
- Detecția de anomalii în ligă (LG-105) și textul AI al Meciului zilei rămân în Etapa 12, conform planului.
