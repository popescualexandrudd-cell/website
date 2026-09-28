# Instalarea unui chioșc și înrolarea lui (runbook)

> Redactat în Etapa 7 (28.09.2026). Se aplică Chioșcului de Ligă; Chioșcul de Plăți (Etapa 8) și ecranele (Etapa 9) folosesc aceiași pași. Aparatele reale se aleg după Q23; până atunci totul rulează cu simulatoare.

## De ce e nevoie
- Un mini-PC cu ecran tactil, **Debian 12 sau 13** (varianta „Debian stabil” din ADR-0014: Chromium vine ca pachet obișnuit, iar politicile de securitate și certificatul client funcționează direct), conectat prin cablu la rețeaua clubului.
- Un cont de **administrator** în admin (cu 2FA).
- În producție: certificatul client al aparatului (mTLS, ADR-0012), emis de noi, și amprenta lui SHA-256.

## Pașii

> Panoul de admin complet vine în Etapa 10. Până atunci, pașii „admin” de mai jos se fac din pagina tehnică a API-ului, `https://<api>/api/v1/docs`, autentificat ca administrator (cu 2FA): se deschide operația indicată, „Try it out”, se completează și „Execute”.

1. **Înregistrarea aparatului (admin).** *Dispozitive → Adaugă*: tipul „Chioșc Ligă”, locația, un nume („Chioșc Ligă 1”). Se notează **ID-ul aparatului**. (API: `POST /api/v1/staff/devices`.)
2. **Instalarea pe aparat.** Pe mini-PC, ca root, dintr-o copie a repository-ului:
   ```bash
   printf 'BRIDGE_DEVICE_ID=<ID-ul de la pasul 1>\nBRIDGE_API_URL=https://<api>/api/v1\nBRIDGE_ALLOWED_ORIGINS=https://kiosk-liga.<domeniu>\nBRIDGE_SIMULATOR_CONTROL=0\n' > /root/bridge.env
   deploy/kiosk-os/install.sh --kiosk-url https://kiosk-liga.<domeniu>/ --api-url https://<api>/api/v1 --bridge-env /root/bridge.env
   ```
   La final, scriptul afișează **cheia publică a Hardware Bridge** (o linie base64). Cheia privată rămâne doar pe aparat (`/var/lib/jungle-bridge/bridge-key.pem`, drepturi 600).
3. **Înrolarea (admin).** *Dispozitive → Chioșc Ligă 1 → Înrolează*: se lipesc cheia publică și, în producție, amprenta certificatului client. Serverul afișează **tokenul aparatului o singură dată**. (API: `POST /api/v1/staff/devices/{id}/enroll`.) Înrolarea din nou generează un token nou; cel vechi nu mai funcționează din acel moment.
4. **Tokenul pe aparat.** Se adaugă `BRIDGE_DEVICE_TOKEN=<token>` în `/etc/jungle-bridge/bridge.env` (fișier cu drepturi 600, al lui root). Tokenul nu se trimite pe chat sau email și nu se scrie în altă parte. Apoi: `systemctl restart jungle-bridge && systemctl reboot`.
5. **Certificatul client (producție).** Se importă în profilul utilizatorului `kiosk`: `sudo -u kiosk pk12util -d sql:/home/kiosk/.pki/nssdb -i chiosc-liga-1.p12`. Politica Chromium îl alege automat pentru site-ul chioșcului și pentru API.
6. **Verificarea.** După repornire, ecranul arată clasamentul și „Scanează cardul”. Se scanează un card de test: apare sesiunea jucătorului. În admin, aparatul are „văzut ultima dată” actualizat, iar în jurnalul de audit apare `devices.enrolled`.

## Ce face instalarea
| Ce | Unde |
|---|---|
| Hardware Bridge, utilizator propriu, repornire automată, sistem de fișiere doar-citire în afară de `/var/lib/jungle-bridge` | `jungle-bridge.service` |
| Chromium pe tot ecranul, în `cage` (o singură aplicație, fără desktop), utilizator fără drepturi | `jungle-kiosk.service` |
| Doar site-ul chioșcului și API-ul sunt permise; fără unelte de dezvoltare, descărcări, printare, parole | `/etc/chromium/policies/managed/jungle.json` |
| Pagină locală „Serviciu temporar indisponibil”, care deschide aplicația când serverul răspunde | `/opt/jungle-kiosk/start.html` |
| Watchdog: repornește bridge-ul sau ecranul dacă nu răspund; după 5 eșecuri la rând repornește aparatul; watchdog hardware la blocarea sistemului | `jungle-kiosk-watchdog.timer`, `system.conf.d` |
| Fără console text, fără Ctrl+Alt+Del, fără taste SysRq, butonul de pornire ignorat | `logind.conf.d`, `sysctl.d` |
| Actualizări de securitate automate; repornire, dacă e nevoie, la 04:30 (în afara programului 08–23) | `apt.conf.d/52jungle-unattended-upgrades` |

## Situații
- **Ecranul arată „Cititorul de carduri nu răspunde”:** `systemctl status jungle-bridge`; jurnalul: `journalctl -u jungle-bridge`.
- **„Chioșcul nu este înrolat”:** lipsește tokenul din `bridge.env` sau aparatul a fost reînrolat (tokenul vechi nu mai merge): se reia pasul 3.
- **Aparat pierdut sau furat:** în admin, *Dezactivează* (refuzat imediat, cu jurnal), apoi înrolare nouă pe aparatul nou.
- **Actualizarea aplicației chioșcului:** se publică pe server; aparatul o preia la următoarea încărcare (ADR-0014). **Actualizarea bridge-ului:** se rulează din nou `install.sh` cu versiunea nouă (cheia și jurnalul de numerar rămân în `/var/lib/jungle-bridge`).
- **Verificare fără instalare:** `deploy/kiosk-os/check.sh` (rulat și de `scripts/test-all`).
