# Punerea site-ului online, pas cu pas

Ghidul acesta e scris pentru cineva care nu a mai pus un site pe un server. Durează în jur de o
oră prima dată, din care cea mai mare parte e așteptare. Comenzile se copiază exact cum sunt
scrise, în fereastra neagră (terminalul) conectată la server.

Cuprins:

1. [Ce îți trebuie](#1-ce-îți-trebuie)
2. [Serverul](#2-serverul)
3. [Domeniul](#3-domeniul)
4. [Conectarea la server](#4-conectarea-la-server)
5. [Descărcarea site-ului pe server](#5-descărcarea-site-ului-pe-server)
6. [Pregătirea serverului](#6-pregătirea-serverului)
7. [Emailurile](#7-emailurile)
8. [Pornirea site-ului](#8-pornirea-site-ului)
9. [Contul tău de administrator](#9-contul-tău-de-administrator)
10. [Verificări după lansare](#10-verificări-după-lansare)
11. [Actualizări](#11-actualizări)
12. [Backup și restaurare](#12-backup-și-restaurare)
13. [Opțional: statistici, anti-spam, actualizare automată](#13-opțional)
14. [Probleme frecvente](#14-probleme-frecvente)

---

## 1. Ce îți trebuie

- **Un domeniu**, de exemplu `numele-tau-tenis.ro` (de la ROTLD prin orice registrar: ClausWeb,
  Hostico, Namecheap etc.). Cost: aproximativ 50–100 lei pe an.
- **Un server virtual (VPS)** cu **Ubuntu 24.04**, minimum **2 GB RAM**, 2 procesoare, 40 GB disc.
  Exemple: Hetzner Cloud CX22, DigitalOcean, OVH, un furnizor românesc. Cost: aproximativ 5–10 euro
  pe lună. Site-ul, baza de date și backup-urile stau toate pe acest server.
- **Un serviciu de email** pentru trimiterea confirmărilor (vezi pasul 7). Varianta gratuită de la
  Brevo (300 de emailuri pe zi) ajunge pentru un antrenor.
- **Fișierul `config/antrenor.yml` completat** cu datele tale (nume, telefon, adresă, prețuri). Ce
  rămâne necompletat apare pe site ca `[DE COMPLETAT]` și se poate completa oricând din panoul de
  administrare. Lista completă e în `CONTENT-TODO.md`.

## 2. Serverul

1. Creează un cont la furnizorul ales și un server nou cu **Ubuntu 24.04**.
2. La „SSH key” (cheie de acces), adaugă cheia ta publică. Dacă nu ai una, creeaz-o pe calculatorul
   tău:
   - pe Windows: deschide **PowerShell**; pe Mac: deschide **Terminal**;
   - scrie `ssh-keygen -t ed25519` și apasă Enter la toate întrebările;
   - afișează cheia publică cu `cat ~/.ssh/id_ed25519.pub` (pe Windows:
     `type $env:USERPROFILE\.ssh\id_ed25519.pub`) și copiaz-o în formularul furnizorului.
3. După creare, notează **adresa IP** a serverului (de forma `203.0.113.10`).

## 3. Domeniul

În panoul registrarului, la „DNS” sau „Zone DNS”, adaugă două înregistrări de tip **A**:

| Tip | Nume | Valoare |
| --- | --- | --- |
| A | `@` (sau gol) | adresa IP a serverului |
| A | `www` | adresa IP a serverului |

Dacă serverul are și adresă IPv6, adaugă aceleași două înregistrări și de tip **AAAA**.
Schimbarea se propagă în câteva minute până la câteva ore. Verifici de pe calculatorul tău cu
`nslookup numele-tau-tenis.ro`: trebuie să apară adresa IP a serverului.

## 4. Conectarea la server

De pe calculatorul tău (PowerShell sau Terminal):

```bash
ssh root@ADRESA_IP
```

La prima conectare răspunzi `yes`. Creează apoi un utilizator obișnuit (e mai sigur decât `root`):

```bash
adduser tenis
usermod -aG sudo tenis
rsync --archive --chown=tenis:tenis ~/.ssh /home/tenis
exit
```

De acum te conectezi cu `ssh tenis@ADRESA_IP`.

## 5. Descărcarea site-ului pe server

```bash
git clone https://github.com/CONTUL-TAU/REPOSITORY.git site
cd site
```

Dacă depozitul GitHub e privat, GitHub îți cere un nume și un „personal access token” în loc de
parolă (GitHub → Settings → Developer settings → Personal access tokens → acces doar de citire la
acest depozit).

**Înainte de prima pornire**, verifică `config/antrenor.yml` (datele tale):

```bash
nano config/antrenor.yml
```

(În `nano`: modifici textul, salvezi cu Ctrl+O și Enter, ieși cu Ctrl+X.) Datele din acest fișier
intră în site o singură dată, la prima pornire. După aceea, totul se modifică din panoul de
administrare.

## 6. Pregătirea serverului

Un singur script instalează tot ce trebuie (Docker, firewall, actualizări automate de securitate)
și creează fișierul de configurare `.env` cu parole generate aleatoriu:

```bash
sudo DOMAIN=numele-tau-tenis.ro ACME_EMAIL=adresa-ta@email.ro ./scripts/setup-server.sh
```

La final, **deconectează-te (`exit`) și conectează-te din nou**, ca să poți folosi Docker.
Scriptul se poate rula din nou oricând; nu strică nimic din ce există.

## 7. Emailurile

Site-ul trimite emailuri clienților (confirmări, memento cu o zi înainte, anulări) și ție (rezervări
noi, mesaje). Pentru asta are nevoie de datele unui serviciu SMTP. Exemplu cu **Brevo** (gratuit):

1. Creează un cont pe brevo.com.
2. La **Senders, Domains & Dedicated IPs → Domains**, adaugă domeniul tău. Brevo îți arată câteva
   înregistrări DNS (TXT pentru SPF, DKIM și DMARC). Adaugă-le în zona DNS a domeniului, la fel ca la
   pasul 3. Fără ele, emailurile ajung în Spam.
3. La **SMTP & API → SMTP**, generează o cheie SMTP.
4. Pe server, deschide `.env`:

   ```bash
   nano .env
   ```

   și completează:

   ```
   SMTP_HOST=smtp-relay.brevo.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=adresa-contului-brevo@email.ro
   SMTP_PASSWORD=cheia-smtp-generată
   EMAIL_FROM="Numele Tău <rezervari@numele-tau-tenis.ro>"
   COACH_NOTIFY_EMAIL=adresa-ta@email.ro
   ```

Poți folosi orice alt furnizor (Mailgun, Amazon SES, adresa de email a domeniului de la firma de
găzduire): trebuie doar aceleași patru date (server, port, utilizator, parolă).

Restul valorilor din `.env` sunt deja completate. Fiecare are o explicație în fișier.

## 8. Pornirea site-ului

```bash
docker compose up -d --build
```

Prima dată durează 5–10 minute (se construiește site-ul și se pregătesc imaginile). La final:

```bash
docker compose ps
```

Toate serviciile trebuie să apară `running`, iar `app` cu `(healthy)`. Deschide
`https://numele-tau-tenis.ro` în browser. Certificatul HTTPS se obține automat în primul minut.

La prima pornire, baza de date se creează singură și se completează din `config/antrenor.yml`.

## 9. Contul tău de administrator

```bash
docker compose exec app node dist/admin-create.mjs
```

Scriptul îți cere emailul, numele și o parolă (cel puțin 12 caractere, nu doar litere). Apoi intri
în panou la `https://numele-tau-tenis.ro/admin`. Pe telefon, adaugă pagina pe ecranul principal
(Safari: Partajează → Adaugă pe ecranul principal; Chrome: meniul ⋮ → Adaugă pe ecranul de pornire).

Dacă ai uitat parola, rulezi aceeași comandă cu același email: parola se schimbă, iar sesiunile
vechi se închid.

Cum se folosește panoul: `GHID-ADMIN.md`.

## 10. Verificări după lansare

1. **Setări → Email de test**: trimite un email de test la adresa ta. Dacă nu ajunge, verifică
   datele SMTP (pasul 7) și dosarul Spam.
2. **Tablou de bord**: avertismentele de sus îți spun ce mai lipsește (email, texte `[DE COMPLETAT]`,
   pagini legale neverificate).
3. **Disponibilitate**: setează intervalele în care primești elevi noi (vezi `GHID-ADMIN.md`).
4. Fă o rezervare de probă de pe site, de pe telefon, și confirm-o din emailul primit.
5. Dă paginile legale (Confidențialitate, Termeni, Cookies) unui jurist spre verificare, apoi bifează
   „verificat” în Conținut → Pagini legale.

## 11. Actualizări

Când apare o versiune nouă a site-ului în GitHub:

```bash
cd ~/site
./scripts/deploy.sh
```

Scriptul face, pe rând: descarcă noua versiune, face un backup, construiește, pornește și verifică
dacă site-ul răspunde. **Dacă noua versiune nu pornește, revine singur la cea veche** și îți spune.

După ce ai modificat `.env` (de exemplu altă parolă de email), aplici schimbarea cu:

```bash
./scripts/deploy.sh --fara-git
```

Actualizările de securitate ale sistemului de operare se instalează automat. O dată la câteva luni,
repornește serverul din panoul furnizorului sau cu `sudo reboot` (site-ul pornește singur).

## 12. Backup și restaurare

**Automat**: în fiecare noapte la 03:30 se salvează baza de date și imaginile încărcate. Se păstrează
ultimele 14 zile (le poți schimba în `.env`: `BACKUP_TIME`, `BACKUP_KEEP_DAYS`).

**Manual**, oricând:

```bash
./scripts/backup.sh                          # un backup acum
./scripts/backup.sh --lista                  # ce backup-uri există
./scripts/backup.sh --copiaza ~/backup-copie # le copiază într-un dosar de pe server
```

Pentru o copie pe calculatorul tău (din PowerShell/Terminal, pe calculator):

```bash
scp -r tenis@ADRESA_IP:~/backup-copie ./backup-site
```

**Restaurare** (de exemplu după o ștergere greșită):

```bash
./scripts/restore.sh                                  # cel mai recent backup
./scripts/restore.sh baza-2026-09-24_033000.dump      # un backup anume (numele din --lista)
```

Scriptul cere confirmarea (scrii `DA`), salvează întâi starea curentă (un backup cu
`inainte-de-restaurare` în nume, ca să poți reveni), oprește site-ul, pune la loc baza de date și
imaginile din același moment și repornește site-ul.

### Backup în afara serverului

Dacă serverul se strică de tot, backup-urile de pe el se pierd odată cu el. Poți trimite automat o
copie în altă parte, cu rclone (de exemplu Backblaze B2, aproximativ 0,5 euro pe lună, sau Google
Drive):

```bash
docker run --rm -it -v "$PWD/docker/backup/rclone:/config/rclone" rclone/rclone config
```

Urmezi întrebările (alegi furnizorul, dai un nume, de exemplu `copie`). Apoi în `.env`:

```
RCLONE_REMOTE=copie:numele-dosarului
```

și aplici cu `docker compose up -d backup`. De acum, după fiecare backup, dosarul de la distanță
e sincronizat cu ultimele 14 zile.

## 13. Opțional

### Statistici de vizitare fără cookie-uri (Umami)

1. În `.env`: `UMAMI_DB_PASSWORD` și `UMAMI_APP_SECRET` (două texte lungi, aleatorii:
   `openssl rand -hex 24`) și `UMAMI_DOMAIN=statistici.numele-tau-tenis.ro`.
2. În DNS: o înregistrare A `statistici` către IP-ul serverului.
3. `cp docker/caddy/umami.caddy.example docker/caddy/sites/umami.caddy`
4. `docker compose --profile analytics up -d`
5. Deschide `https://statistici.numele-tau-tenis.ro`, autentifică-te (`admin` / `umami`),
   **schimbă parola imediat**, adaugă site-ul și copiază „Website ID”.
6. În `.env`: `UMAMI_SCRIPT_URL=https://statistici.numele-tau-tenis.ro/script.js` și
   `UMAMI_WEBSITE_ID=...`, apoi `./scripts/deploy.sh --fara-git` și bifează în admin
   Setări → „Statistici de vizitare”.

### Anti-spam Cloudflare Turnstile

Formularele au deja protecție (câmp capcană și limită de trimiteri). Dacă primești totuși spam:
creează gratuit un widget Turnstile în contul Cloudflare, pune cheile în `.env`
(`TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`) și rulează `./scripts/deploy.sh --fara-git`.

### Actualizare automată din GitHub

La fiecare modificare pe ramura `main`, GitHub verifică site-ul (teste, build) și, dacă vrei, îl
actualizează singur pe server:

1. Pe server, creează o cheie doar pentru GitHub: `ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N ""`
   și `cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys`.
2. În GitHub → depozit → Settings → Secrets and variables → Actions:
   - Secrets: `DEPLOY_HOST` (IP-ul), `DEPLOY_USER` (`tenis`), `DEPLOY_PATH` (`/home/tenis/site`),
     `DEPLOY_SSH_KEY` (conținutul fișierului `~/.ssh/github_deploy`, cheia privată);
   - Variables: `DEPLOY_ENABLED` = `true`.

## 14. Probleme frecvente

| Problema | Ce faci |
| --- | --- |
| Site-ul nu se deschide deloc | Verifică DNS-ul (pasul 3) și `docker compose ps`. |
| Browserul spune că certificatul nu e valid | Domeniul trebuie să arate spre server înainte de pornire. Verifică DNS-ul, apoi `docker compose restart caddy`. Mesajele: `docker compose logs caddy`. |
| Emailurile nu ajung | Setări → Email de test îți arată eroarea. Verifică SMTP în `.env` și înregistrările SPF/DKIM. Uită-te și în Spam. |
| „Nu ai setat o adresă de email pentru notificări” | Completează `COACH_NOTIFY_EMAIL` în `.env` sau emailul din Setări. |
| Am uitat parola de admin | `docker compose exec app node dist/admin-create.mjs` cu același email. |
| Contul e blocat după parole greșite | Se deblochează singur după 15 minute. |
| Vreau să văd ce s-a întâmplat | `docker compose logs -f app` (ieși cu Ctrl+C); în admin: Jurnal. |
| Discul e plin | `docker system prune -f` șterge versiunile vechi ale site-ului; verifică `df -h`. |
| Vreau să schimb domeniul | Schimbă `DOMAIN` și `APP_URL` în `.env`, DNS-ul, apoi `./scripts/deploy.sh --fara-git`. |

Dacă ceva nu merge și nu știi de ce, rulează `docker compose logs --tail=100 app` și trimite
rezultatul persoanei care te ajută.
