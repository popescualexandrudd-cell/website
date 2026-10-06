# Backup și restaurare

> **Stare:** construit în Etapa 14B (06.10.2026). Decizia: [ADR-0016](../../docs/04-arhitectura/adr/0016-backup-recuperare.md). Ghidul pentru proprietar: [docs/08-deploy-si-mentenanta/04-runbook-backup-si-recuperare.md](../../docs/08-deploy-si-mentenanta/04-runbook-backup-si-recuperare.md).

## Ce se salvează
**Baza de date**, adică tot ce ține minte clubul: conturile, rezervările, banii, liga, setările. Clubul nu păstrează fișiere încărcate; cardurile și PDF-urile se generează din baza de date. Separat de backup, rămân de păstrat în afara serverului:
- fișierele cu secrete: `/etc/jungle/prod.env` și `/etc/jungle/backup.env`;
- autoritatea de certificate a aparatelor.

Toate se păstrează offline, în două locuri sigure.

## Cum
- **Imaginea bazei de date** ([`postgres/Dockerfile`](postgres/Dockerfile)): PostgreSQL 17 cu pgBackRest ([`postgres/pgbackrest.conf`](postgres/pgbackrest.conf)).
- **Jurnalul tranzacțiilor** (WAL) pleacă în backup continuu, cel puțin o dată la 5 minute.
- **Copiile sunt criptate** (AES-256), cu cheia din `/etc/jungle/backup.env` ([`backup.env.example`](backup.env.example)):
  - `repo1` e pe server, în volumul `pgbackrest-repo`; se păstrează ultimele 2 backup-uri complete;
  - `repo2` e în afara clubului, într-un spațiu S3 în UE (Q73), și se activează din același fișier.
- **Programul**, prin temporizatoare systemd ([`systemd/`](systemd/)) care rulează [`deploy/scripts/backup`](../scripts/backup):

  | Ce | Când |
  |---|---|
  | backup complet | duminica, 02:30 |
  | backup diferențial | luni–sâmbătă, 02:30 |
  | test de restaurare | pe 1 ale lunii, 04:30 |

  Testul de restaurare readuce ultimul backup într-un container de unică folosință ([`postgres/restore-check`](postgres/restore-check)) și îl compară cu baza de date vie.
- **Raportarea:**
  - fiecare rulare se raportează backend-ului (`manage.py backup_report`); un eșec ajunge imediat la manageri și administratori (`staff.backup_failed`);
  - zilnic, `check_backups` dă alarma dacă lipsește un backup (26 de ore) sau un test de restaurare (35 de zile).

## Verificat
`deploy/scripts/smoke-stack` (rulat și în CI) face un backup complet și testul de restaurare pe tot sistemul pornit și verifică că amândouă ajung în backend ca reușite.
