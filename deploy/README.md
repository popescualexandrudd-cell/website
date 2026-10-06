# Deploy

> **Stare:** mediul de dezvoltare din Etapa 1A; producția în lucru în Etapa 14 (din 06.10.2026): faza 14A (Compose de producție, proxy-ul Caddy, planificatorul) livrată.

Tot ce ține de rularea sistemului pe serverul propriu (§14). Subfolderele: `compose/`, `proxy/`, `backup/`, `monitoring/`, `kiosk-os/`.

## Specificații

- [14. DEPLOY PE SERVERUL PROPRIU, BACKUP, MONITORIZARE, MENTENANȚĂ](../docs/08-deploy-si-mentenanta/01-cerinte-deploy-backup-monitorizare.md)

## Decizii tehnice

[ADR-0015](../docs/04-arhitectura/adr/0015-infrastructura-docker-caddy.md), [ADR-0016](../docs/04-arhitectura/adr/0016-backup-recuperare.md), [ADR-0017](../docs/04-arhitectura/adr/0017-observabilitate-analytics.md), [ADR-0014](../docs/04-arhitectura/adr/0014-chioscuri-ecrane-kiosk-os.md)

## Producția (Etapa 14A)
- [`compose/prod/compose.yaml`](compose/prod/compose.yaml) pornește serviciile de producție:
  - baza de date și Redis;
  - `migrate`, care rulează primul: migrările, datele inițiale și fișierele statice;
  - backend-ul (gunicorn), canalul live (daphne, `/ws/`) și planificatorul (ADR-0024);
  - site-ul și proxy-ul.

  Setările stau în [`compose/prod/.env.example`](compose/prod/.env.example). Pe server, copia completată e `/etc/jungle/prod.env`.
- [`proxy/Caddyfile`](proxy/Caddyfile) și [`proxy/Dockerfile`](proxy/Dockerfile) fac proxy-ul: Caddy, cu panoul, chioșcurile, ecranele și afișajul cafenelei incluse în imagine.
- Verificările:
  - `scripts/test-deploy` rulează pe rând: fișierul Compose, apoi comportamentul proxy-ului pe un Caddy real ([`proxy/test-proxy`](proxy/test-proxy)), apoi tot sistemul pornit din Compose ([`scripts/smoke-stack`](scripts/smoke-stack));
  - CI-ul îl rulează la fiecare push (jobul `deploy`).

## Serverul (Etapa 14D)
| Script | Rol |
|---|---|
| `scripts/install-server` | pregătirea serverului Ubuntu 24.04: Docker, firewall, SSH doar cu cheie, actualizări de securitate, `/etc/jungle`, autoritatea aparatelor, temporizatoarele backup-ului |
| `scripts/devices-ca` | autoritatea de certificate a aparatelor: `init`, `issue <nume>` (fișierul `.p12` și amprenta pentru panou) |
| `scripts/update` | o versiune nouă: backup, cod, imagini, migrări, repornire, verificare |
| `scripts/rollback` | înapoi la versiunea de dinainte; dacă baza de date s-a schimbat, readusă la momentul actualizării (cere „DA”) |
| `scripts/manage` | o comandă Django în backend-ul care rulează |
| `scripts/backup` | backup-urile și testul de restaurare (14B) |
| `scripts/test-install`, `scripts/smoke-stack` | testele (rulate de `scripts/test-deploy`) |

