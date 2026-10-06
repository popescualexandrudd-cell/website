# Teste de securitate

> **Stare:** construite pe parcurs (Etapele 1A–14), adunate aici în Etapa 15 (06.10.2026). Verificările de securitate stau lângă codul pe care îl apără; aici e harta lor (§12.1).

| Ce se verifică | Unde | Cine îl rulează |
|---|---|---|
| Scorurile doar de la Chioșcul Ligii înregistrat (aparat + rețea + rol), orice altă sursă refuzată și notată (invariantul 1, ADR-0012) | `apps/backend/jungle/league/tests/test_matches.py`, `test_kiosk_api.py` | `scripts/test-all` |
| Aparatele: token + certificat client, mesajele bridge-ului semnate Ed25519, nonce o singură dată | `apps/backend/jungle/devices/tests/`, `services/hardware-bridge/tests/` | `scripts/test-all` |
| Proxy-ul: headerul certificatului nu poate fi falsificat din afară, mTLS pe subdomeniile aparatelor, HSTS, CSP, fără încadrare | `deploy/proxy/test-proxy` | `scripts/test-deploy` (CI, jobul `deploy`) |
| AI-ul nu atinge scoruri, bani, acorduri; dublă barieră (ADR-0019) | `apps/backend/jungle/ai/tests/` | `scripts/test-all` |
| Permisiunile personalului (`authorize` pe locație), 2FA în panou | testele fiecărei aplicații (`*/tests/`), `apps/admin/e2e/` | `scripts/test-all`, `scripts/test-e2e` |
| Limitele de cereri (înregistrare, lista de așteptare, asistentul) | `accounts/tests/test_registration.py`, `waitlist/tests/`, `ai/tests/test_assistant.py` | `scripts/test-all` |
| Setările de producție ale Django (`check --deploy`, cookie-uri sigure, HTTPS) | `deploy/scripts/smoke-stack` | `scripts/test-deploy` |
| Dependențe fără vulnerabilități cunoscute (`pnpm audit --prod`, `pip-audit`) | `scripts/test-deploy` | CI, la fiecare push |
| Secrete: niciunul în git; doar în `/etc/jungle/*.env` pe server | `.gitignore`, `deploy/compose/prod/.env.example` (doar nume) | revizuirea fiecărei etape |

Revizuirea „din perspectiva unui atacator” a fiecărei etape e în rapoartele ei (`docs/00-management/verificare/etapa-*/RAPORT.md`).

## Specificații

- [12.1 Securitate](../../docs/07-securitate-gdpr-legal/01-securitate.md)

## Decizii tehnice

[ADR-0021](../../docs/04-arhitectura/adr/0021-calitate-teste-ci.md), [ADR-0012](../../docs/04-arhitectura/adr/0012-autentificare-dispozitive.md)
