# Instalarea serverului: pas cu pas

> Etapa 14D, 06.10.2026 (ADR-0015, Q22, Q40). Pentru cine instalează serverul clubului; fiecare comandă se copiază ca atare. Durata: aproximativ o oră, plus așteptarea DNS-ului.

## Ce trebuie să existe înainte
- **Un server** cu Ubuntu Server 24.04 LTS (Q22, recomandat):
  - 8 nuclee, 32 GB RAM, 2 × 1 TB NVMe în oglindă;
  - UPS;
  - IP public fix.
- **Domeniul clubului** (Q39). Din panoul firmei de domenii, înregistrările DNS de tip A, toate spre IP-ul serverului:
  - `<domeniu>`, `www`, `api`, `admin`, `device`;
  - `kiosk-liga`, `kiosk-plati`, `ecrane`, `cafe`;
  - `status`, `erori`, `statistici`.
- **Contul de email** al clubului pentru trimiterea mesajelor (Q24).
- **Pentru copia de backup din afara clubului** (Q73): spațiul S3 în UE.

## 1. Pregătirea serverului (o dată)
1. Intrați pe server cu SSH, cu **cheia** dumneavoastră (nu cu parola).
2. Copiați sistemul și pregătiți serverul:
   ```bash
   sudo git clone https://github.com/popescualexandrudd-cell/website /opt/jungle
   cd /opt/jungle
   sudo deploy/scripts/install-server
   ```
   Scriptul face următoarele:
   - instalează Docker;
   - închide toate porturile, în afară de SSH, 80 și 443;
   - permite intrarea pe SSH doar cu cheie;
   - pornește actualizările automate de securitate;
   - face folderul `/etc/jungle`, cu fișierele de setări;
   - face autoritatea de certificate a aparatelor;
   - pune programul backup-urilor.

## 2. Setările (o dată)
1. `sudo nano /etc/jungle/prod.env`: completați fiecare valoare goală. Explicațiile sunt chiar în fișier. Valorile lungi, aleatoare se fac cu `openssl rand -base64 48`.
2. `sudo nano /etc/jungle/backup.env`: cheia backup-ului (și, când există, spațiul S3).
3. **Păstrați offline**, în două locuri sigure:
   - copiile celor două fișiere;
   - folderul `/etc/jungle/devices-ca`.

   Ghidul backup-ului spune de ce: `04-runbook-backup-si-recuperare.md`.

## 3. Prima pornire
```bash
cd /opt/jungle
sudo deploy/scripts/update v1.0.0        # versiunea de lansare (eticheta din GitHub)
sudo JUNGLE_ADMIN_PASSWORD='…' deploy/scripts/manage bootstrap_admin --email … --first-name … --last-name …
```
Apoi:
- `https://admin.<domeniu>`: intrați cu contul de administrator și configurați a doua verificare (2FA);
- **instrumentele de monitorizare**: `05-ghid-monitorizare.md`.

## 4. Aparatele (pentru fiecare chioșc, ecran sau afișaj)
1. În panou → **Dispozitive → Adaugă**: tipul, locația, numele (de exemplu „Chioșc Ligă 1”).
2. Pe server, certificatul aparatului:
   ```bash
   sudo deploy/scripts/devices-ca issue "Chioșc Ligă 1"
   ```
   Scriptul arată unde e fișierul `.p12`, parola lui și **amprenta SHA-256**.
3. Pe aparat, instalarea: `docs/09-hardware/03-instalare-chiosc-si-inrolare.md`. Adresa API e `https://device.<domeniu>/api/v1`; certificatul `.p12` se importă cum scrie acolo.
4. În panou → **Dispozitive → Înrolează**: cheia publică a aparatului și amprenta de la pasul 2.

Un aparat pierdut sau scos din folosință se **dezactivează din panou**: tokenul și certificatul lui nu mai funcționează din acel moment.

## 5. Verificarea
- `https://www.<domeniu>`: pagina de pre-lansare (site-ul complet se publică din panou, Q57).
- `https://admin.<domeniu>`: panoul.
- `systemctl list-timers 'jungle-*'`: backup-urile programate.
- `sudo deploy/scripts/backup full` și `sudo deploy/scripts/backup restore-test`: primul backup și primul test, acum.
