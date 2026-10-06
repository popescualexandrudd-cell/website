# Deploy și mentenanță

Cerințele de deploy, backup și monitorizare (§14) și, pe măsură ce se construiesc, runbook-urile pentru proprietar (comenzi copiabile).

## Conținut

- [14. DEPLOY PE SERVERUL PROPRIU, BACKUP, MONITORIZARE, MENTENANȚĂ](01-cerinte-deploy-backup-monitorizare.md)
- [Ghid: activarea Apple Wallet și Google Wallet](02-ghid-apple-google-wallet.md) (Etapa 5)
- [Ghid: videoul de prezentare și efectele site-ului](03-ghid-efecte-si-video.md) (Etapa 11, ADR-0023): pornire și oprire din panou, schimbarea videoului, cererea unei schimbări
- [Backup și recuperare după dezastru: ghidul proprietarului](04-runbook-backup-si-recuperare.md) (Etapa 14B)
- [Monitorizarea: ghidul proprietarului](05-ghid-monitorizare.md) (Etapa 14C)
- [Instalarea serverului: pas cu pas](06-instalarea-serverului.md) (Etapa 14D)
- [Mentenanța de zi cu zi: ghidul proprietarului](07-mentenanta.md) (Etapa 14E)
- [Versiunile: cum se face și cum se instalează o versiune nouă](08-versiuni.md) (Etapa 16)
- Ziua lansării, pas cu pas: [etapa-16/PLAN-LANSARE.md](../00-management/verificare/etapa-16/PLAN-LANSARE.md)

## Testul de încărcare
`tests/load/club.js` (k6, Etapa 15): seara cea mai aglomerată (500 de vizitatori + ecranele), rulat de `scripts/test-deploy` pe stiva de producție și, înainte de lansare, pe serverul real (`DOMAIN=<domeniu> RESOLVE=<IP> k6 run tests/load/club.js`).
