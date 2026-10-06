# Teste end-to-end (Playwright)

> **Stare:** construite în Etapele 1B–14; harta lor, adunată în Etapa 15 (06.10.2026). Testele stau lângă fiecare aplicație și le pornește `scripts/test-e2e` (rulat și de `scripts/test-all`).

Fluxuri complete între aplicații: rezervare → check-in → scanare pe teren → meci → scor → confirmări → plată împărțită → validare → LP → ecrane → notificări → Wallet (§13.1), cu simulatoarele hardware și verificări de accesibilitate (axe).

| Partea | Teste | Ce pornește `scripts/test-e2e` |
|---|---|---|
| Site-ul (pre-lansare, apoi site-ul complet, contul, rezervările, PWA, asistentul), desktop + mobil, cu axe | `apps/web/e2e/` | backend + build de producție + Playwright (`E2E_ONLY=web`) |
| Chioșcul Ligii, cu Hardware Bridge real (simulatoare, scanări semnate) | `apps/kiosk-league/e2e/` | `E2E_ONLY=kiosk` |
| Chioșcul de Plăți și afișajul cafenelei | `apps/kiosk-payments/e2e/` | `E2E_ONLY=payments` |
| Ecranele de teren și lobby, cu schimbări live | `apps/court-screens/e2e/` | `E2E_ONLY=screens` |
| Panoul de admin (2FA, calendar, rapoarte, setări; capturile pentru ghidurile personalului) | `apps/admin/e2e/` | `E2E_ONLY=admin` |
| Stiva de producție întreagă (proxy, backup, actualizare, revenire, încărcare) | `deploy/scripts/smoke-stack` | `scripts/test-deploy` |

## Specificații

- [13. TESTARE ȘI CALITATE (Definition of Done pentru orice livrare)](../../docs/00-management/DEFINITION_OF_DONE.md)

## Decizii tehnice

[ADR-0021](../../docs/04-arhitectura/adr/0021-calitate-teste-ci.md)
