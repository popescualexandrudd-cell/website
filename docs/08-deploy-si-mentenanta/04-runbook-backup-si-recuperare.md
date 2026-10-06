# Backup și recuperare după dezastru: ghidul proprietarului

> Etapa 14B, 06.10.2026 (ADR-0016). Scris pentru cine nu e programator: comenzile se copiază așa cum sunt, pe server, din folderul `/opt/jungle`. Obiectivele (Q72): se pierd cel mult datele din ultimele minute (cel mult o oră), iar sistemul e refăcut în cel mult 4 ore.

## Ce se întâmplă singur
- **În fiecare noapte, la 02:30:** un backup (complet duminica, diferențial în rest).
- **Încontinuu:** fiecare modificare din baza de date pleacă în backup în cel mult 5 minute.
- **Pe 1 ale lunii, la 04:30:** testul de restaurare. Ultimul backup e readus într-un loc separat și comparat cu baza de date vie.
- **Dacă ceva nu merge, primiți email și notificare:** un backup eșuat, un backup care lipsește (26 de ore) sau un test de restaurare care lipsește (35 de zile).

## Ce păstrați dumneavoastră, offline, în două locuri sigure
1. Fișierul `/etc/jungle/backup.env`: are cheia backup-ului. **Fără ea, backup-ul nu se poate citi, nici de noi.**
2. Fișierul `/etc/jungle/prod.env`: setările și secretele serverului.
3. Fișierele autorității de certificate a aparatelor.

Exemple de locuri: un stick USB criptat într-un seif și un manager de parole. Le actualizați după orice schimbare a acestor fișiere.

## Verificări rapide
```bash
cd /opt/jungle
deploy/scripts/backup full            # un backup complet, acum
deploy/scripts/backup restore-test    # testul de restaurare, acum
systemctl list-timers 'jungle-*'      # când rulează următoarele
docker compose -f deploy/compose/prod/compose.yaml --env-file /etc/jungle/prod.env \
  exec -u postgres db pgbackrest --stanza=jungle info   # lista backup-urilor
```

## Dacă baza de date s-a stricat, dar serverul merge
1. Opriți aplicația, păstrând baza de date:
   ```bash
   cd /opt/jungle
   C="docker compose -f deploy/compose/prod/compose.yaml --env-file /etc/jungle/prod.env"
   $C stop proxy web backend realtime scheduler
   ```
2. Readuceți ultimul backup peste baza de date (sau până la un moment ales: `--type=time "--target=2027-04-10 18:00:00+03"`):
   ```bash
   $C stop db
   $C run --rm --no-deps -u postgres db pgbackrest --stanza=jungle --delta restore
   $C up -d
   ```
3. Verificați site-ul și panoul. Notați în jurnal ce s-a întâmplat.

## Dacă serverul s-a pierdut (dezastru)
1. Instalați un server nou (`docs/08-deploy-si-mentenanta/`, instalarea serverului) și copiați înapoi cele trei fișiere păstrate offline.
2. Porniți doar baza de date, goală, apoi readuceți backup-ul din copia din afara clubului (`--repo=2`):
   ```bash
   $C up -d db && $C stop db
   $C run --rm --no-deps -u postgres db sh -c 'rm -rf /var/lib/postgresql/data/* && pgbackrest --stanza=jungle --repo=2 restore'
   $C up -d
   ```
3. Puneți din nou temporizatoarele backup-ului (scriptul de instalare o face).

Timpul estimat: 1–2 ore, plus descărcarea backup-ului.

## Ce nu faceți
- Nu ștergeți volumele Docker (`docker volume rm`, `docker compose down -v`) pe server: acolo sunt datele și backup-ul local.
- Nu schimbați cheia din `backup.env` fără un backup complet nou imediat după (backup-urile vechi rămân pe cheia veche).
