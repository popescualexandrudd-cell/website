# Etapa 14 — Deploy, securitate, backup, monitorizare, hardware real: raport

## Faza 14A — Producția în Docker Compose, proxy-ul Caddy, planificatorul, 06.10.2026

### Ce s-a construit
1. **Producția, într-un singur fișier** (`deploy/compose/prod/compose.yaml`):
   - **baza de date** (PostgreSQL 17) și **Redis**;
   - **`migrate`**, care pornește primul și aduce baza de date la zi;
   - **backend-ul** (API-ul și panoul), **canalul live** al ecranelor și **planificatorul**;
   - **site-ul** și **proxy-ul**.

   Doar proxy-ul se vede din internet, pe porturile 80 și 443. Setările stau într-un fișier de pe server (`/etc/jungle/prod.env`), după modelul `.env.example`, fără niciun secret în cod.
2. **Proxy-ul (Caddy):**
   - certificatele HTTPS se obțin și se reînnoiesc singure;
   - fiecare parte are subdomeniul ei (§4.6): `www`, `api`, `admin`, `device`, `kiosk-liga`, `kiosk-plati`, `ecrane`, `cafe`;
   - aparatele intră doar cu certificatul clubului: fără el, conexiunea e refuzată, iar backend-ul verifică în plus că certificatul e chiar al aparatului (ADR-0012);
   - nimeni nu se poate da drept aparat trimițând din afară headerul certificatului;
   - headerele de securitate și politicile de conținut (CSP) sunt puse pe toate paginile.
3. **Planificatorul (ADR-0024, înlocuiește Celery din ADR-0006):**
   - rulează la minut sarcinile programate: mesajele, neprezentările, scorurile expirate, sarcina zilnică a ligii, memento-urile zilei, curățarea listei de așteptare;
   - fiecare rulare se notează 30 de zile;
   - o sarcină zilnică ratată (serverul oprit) rulează imediat ce serverul pornește, în aceeași zi;
   - după fiecare tură reușită, trimite un semnal de viață monitorizării.
4. **Imaginile Docker:** backend-ul, site-ul și proxy-ul, în care sunt incluse panoul, chioșcurile, ecranele și afișajul cafenelei. Imaginile de bază se pot schimba pentru o construire în spatele unui proxy de rețea.

### Rezultate
| Verificare | Rezultat |
|---|---|
| Planificatorul (`jungle/scheduler`, 100% pe ramuri) | 9 teste: fiecare sarcină e o comandă reală, fără ore între 03 și 04; intervalul; ziua clubului, inclusiv după o oprire și în noaptea trecerii la ora de vară; un eșec nu le oprește pe celelalte; semnalul de viață doar după o tură reușită; un singur planificator odată; comanda pornită și oprită. |
| Proxy-ul pe un Caddy real (`deploy/proxy/test-proxy`) | 31 de verificări: headerul falsificat e șters pe www, api și admin; aparatele fără certificat sau cu certificat străin sunt refuzate; backend-ul primește amprenta reală; aplicațiile, CSP, HSTS, redirecționarea domeniului. |
| Tot sistemul (`deploy/scripts/smoke-stack`) | construit din Dockerfile-uri și pornit din fișierul de producție, verificat prin proxy: site-ul, API-ul, panoul, chioșcul cu și fără certificat, API-ul aparatelor; `manage.py check --deploy` fără avertismente; planificatorul a făcut o tură. |
| `scripts/test-deploy` | toate trei, rulate și în CI la fiecare push (jobul `deploy`). |

### Ce decideți
- **Q72:** cât timp și câte date poate pierde clubul la o avarie. Varianta implicită: cel mult o oră de date, refacere în cel mult 4 ore.
- **Q73:** unde se ține copia backup-ului în afara clubului.

### Cum verificați
1. Citiți `deploy/proxy/README.md` (tabelul subdomeniilor) și ADR-0024.
2. Pe GitHub → Actions: jobul `deploy` e verde.

## Faza 14B — Backup și restaurare, 06.10.2026

### Ce s-a construit
1. **Imaginea bazei de date** (`deploy/backup/postgres`): PostgreSQL 17 cu pgBackRest.
   - Jurnalul tranzacțiilor pleacă în backup continuu, cel puțin o dată la 5 minute.
   - Copiile sunt criptate (AES-256). Una stă pe server; a doua, în afara clubului (S3 în UE, Q73), se pornește din setări.
2. **Programul** (temporizatoare systemd, `deploy/scripts/backup`):
   - backup complet duminica;
   - backup diferențial în celelalte nopți, la 02:30;
   - testul de restaurare lunar: ultimul backup e readus într-un container separat și comparat cu baza de date vie.
3. **Alertele:**
   - fiecare rulare se raportează backend-ului;
   - un eșec ajunge imediat la manageri (email și push);
   - zilnic, un backup sau un test de restaurare care lipsește dă alarma (`check_backups`);
   - după fiecare backup reușit pleacă un semnal de viață spre monitorizare.
4. **Ghidul proprietarului** (`docs/08-deploy-si-mentenanta/04-runbook-backup-si-recuperare.md`):
   - ce păstrați offline;
   - verificările rapide;
   - refacerea bazei de date, inclusiv la un moment ales;
   - recuperarea după pierderea serverului.

### Rezultate
| Verificare | Rezultat |
|---|---|
| Backend (`jungle/scheduler`, 100% pe ramuri) | 13 teste. Cele 4 noi: eșecul ajunge la manageri, o singură dată; semnalul de viață după un backup reușit; alarma zilnică pentru ce lipsește, o dată pe zi; comenzile `backup_report` și `check_backups`. |
| Tot sistemul (`deploy/scripts/smoke-stack`) | Pe sistemul pornit: backup complet cu pgBackRest, apoi testul de restaurare. Amândouă trec și apar în backend ca reușite. |

### Decizii (delegate de proprietar, 06.10.2026)
- **Q72:** cel mult o oră de date pierdute (în practică, minute) și refacere în cel mult 4 ore.
- **Q73:** spațiu S3 în UE, criptat. Contul se deschide la instalarea serverului.

## Faza 14C — Monitorizare și alerte, 06.10.2026

### Ce s-a construit
1. **Aparatele care nu mai răspund:** la 5 minute, planificatorul verifică chioșcurile, ecranele și afișajul cafenelei. Un aparat care tace de 10 minute, cât clubul e deschis, înseamnă un mesaj pentru managerii locației (email și push), o singură dată pe pauză. Evenimentul `staff.device_offline` exista din Etapa 12, dar nu pleca de nicăieri.
2. **Discul serverului:** peste 85% ocupat, managerii primesc mesaj, o dată pe zi (evenimentul nou `staff.disk_low`, RO și EN).
3. **Erorile:**
   - backend-ul le trimite în GlitchTip-ul clubului, fără date personale;
   - site-ul (pe server și în browser), panoul și aparatele își raportează erorile backend-ului, fără scripturi de la terți în pagină, cel mult 30 pe oră de la o adresă.
4. **Jurnalele:** în producție, fiecare linie e în JSON și poartă ID-ul cererii.
5. **Instrumentele** (`--profile monitoring`), cu baza lor de date separată:
   - Uptime Kuma (`status.<domeniu>`);
   - GlitchTip (`erori.<domeniu>`);
   - Umami (`statistici.<domeniu>`).

   Ghidul de pornire: `docs/08-deploy-si-mentenanta/05-ghid-monitorizare.md`.

### Rezultate
| Verificare | Rezultat |
|---|---|
| Planificatorul și supravegherea (`jungle/scheduler`, 100% pe ramuri) | 4 teste noi: aparatul tăcut, o dată pe pauză; nimic cât clubul e închis; discul, o dată pe zi; comenzile. |
| Jurnalele și erorile (`core/observability.py`, 100% pe ramuri) | 4 teste: linia JSON cu ID-ul cererii; middleware-ul; GlitchTip doar cu DSN; raportarea din browsere, cu limită. |
| Site, panou, aparate (Vitest) | Raportarea nu strică niciodată pagina; un mesaj care se repetă pleacă cel mult o dată pe minut. |
| Proxy-ul (`test-proxy`) | Rutele `status`, `erori` și `statistici` merg, iar headerul falsificat e șters și pe ele. |
| Tot sistemul (`smoke-stack`) | Planificatorul rulează în producție `watch_devices` și `check_disk`. |
| Instrumentele, pornite local | GlitchTip, Umami și Uptime Kuma pornesc și răspund. |

## Fazele 14D și 14E — Serverul, aparatele, actualizarea și ghidurile, 06.10.2026

### Ce s-a construit
1. **Instalarea serverului** (`deploy/scripts/install-server`, Ubuntu 24.04), într-o singură comandă, care se poate rula din nou fără să strice nimic:
   - instalează Docker, din pachetele Ubuntu;
   - închide toate porturile, în afară de SSH, 80 și 443;
   - permite SSH doar cu cheie, și doar dacă o cheie e deja pusă, ca nimeni să nu rămână pe dinafară;
   - pornește actualizările de securitate automate;
   - face `/etc/jungle`, cu fișierele de setări (drepturi 600);
   - face autoritatea de certificate a aparatelor;
   - pune programul backup-urilor.
2. **Certificatele aparatelor** (`deploy/scripts/devices-ca init | issue <nume>`): fiecare chioșc, ecran sau afișaj primește un certificat semnat de autoritatea clubului. Scriptul arată amprenta de pus în panou la înrolare.
3. **Actualizarea și revenirea:**
   - `deploy/scripts/update <versiune>`: backup complet, apoi codul versiunii, imaginile, baza de date adusă la zi, repornirea și verificarea.
   - `deploy/scripts/rollback`: întoarcerea la versiunea de dinainte. Dacă actualizarea a schimbat baza de date, cere confirmarea scrisă „DA” și readuce baza de date exact la momentul dinaintea actualizării.
4. **`deploy/scripts/manage`**: o comandă Django pe server, de exemplu primul administrator.
5. **Panoul → Starea sistemului → Sarcini programate și backup:** ultima rulare a fiecărei sarcini și a fiecărui backup (reușit, eșuat, rulează, încă n-a rulat), cu nume în română și engleză.
6. **Ghidurile proprietarului:**
   - `docs/08-deploy-si-mentenanta/06-instalarea-serverului.md`;
   - `07-mentenanta.md`: actualizarea, revenirea, un aparat care nu merge, prețurile, sezonul nou, verificările lunare;
   - ghidul de înrolare a aparatelor, actualizat (`device.<domeniu>`, certificatul).
7. **Reparat, găsit de testul de actualizare:** verificarea de sănătate a imaginii backend-ului întreba `127.0.0.1` prin HTTP. În producție, Django refuză un host necunoscut și redirecționează HTTP spre HTTPS, deci containerul ar fi apărut mereu „nesănătos”. Acum `healthcheck.py` trimite numele de host permis și HTTPS.

### Rezultate
| Verificare | Rezultat |
|---|---|
| ShellCheck | Toate scripturile serverului trec (nivelul „warning”). |
| `deploy/scripts/test-install` | Instalarea rulată de două ori pe un Ubuntu 24.04 curat: drepturile fișierelor, autoritatea, regula SSH (doar cu o cheie existentă), firewall-ul, temporizatoarele; nimic suprascris la a doua rulare. |
| `deploy/scripts/smoke-stack`, partea de actualizare | Dintr-o copie a repository-ului cu două versiuni, a doua cu o migrare nouă: actualizarea la v1, apoi la v2 (migrarea aplicată), apoi revenirea cu „DA". Migrarea dispare, ce s-a scris după actualizare dispare, ce era înainte rămâne, backend-ul răspunde. |
| Panoul (`jungle/panel`, 100% pe ramuri; Vitest) | Lista sarcinilor în starea sistemului; fiecare sarcină are nume în ambele limbi (testul pică altfel). |

### Ce așteaptă serverul și aparatele (Q22, Q23)
- **Instalarea reală:** se face după ghid când serverul e gata.
- **Driverele reale ale aparatelor** (acceptorul de bancnote și monede, casa de marcat fiscală, cititoarele) se scriu și se testează la club, după alegerea modelelor (Q23). Hardware Bridge are deja interfața și simulatoarele (Etapele 7–8, ADR-0013); un driver real înlocuiește doar simulatorul, prin aceeași interfață.

## Etapa 14 completă
Toate cele cinci faze sunt livrate. Ce mai rămâne de făcut pe server și la club e scris în ghiduri, pas cu pas.

