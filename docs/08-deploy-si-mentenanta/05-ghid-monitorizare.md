# Monitorizarea: ghidul proprietarului

> Etapa 14C, 06.10.2026 (ADR-0017). Se face o singură dată, după instalarea serverului. Comenzile se rulează din `/opt/jungle`.

## Ce primiți fără să faceți nimic
Pe email și ca notificare, managerii și administratorii primesc mesaj când:
- **un aparat nu mai răspunde** (chioșc, ecran, afișajul cafenelei), după 10 minute, cât clubul e deschis;
- **discul serverului** trece de 85%;
- **un backup** a eșuat sau lipsește;
- **o dispută de ligă** sau **restul scăzut la un chioșc** (din etapele anterioare).

## Pornirea instrumentelor (o dată)
1. Completați în `/etc/jungle/prod.env`: `MONITORING_DB_PASSWORD`, `GLITCHTIP_SECRET_KEY`, `UMAMI_APP_SECRET`. Fiecare e o valoare lungă, aleatoare: `openssl rand -base64 48`.
2. Porniți instrumentele:
   ```bash
   docker compose -f deploy/compose/prod/compose.yaml --env-file /etc/jungle/prod.env --profile monitoring up -d
   ```
3. **`https://status.<domeniu>`** (Uptime Kuma). Faceți-vă contul, apoi adăugați verificările:
   - „HTTP(s)” pentru `https://www.<domeniu>`, `https://api.<domeniu>/api/v1/health` și `https://admin.<domeniu>`, la fiecare minut;
   - „Push” numit „Planificator”, la 5 minute. Adresa lui o puneți în `SCHEDULER_HEARTBEAT_URL`.
   - „Push” numit „Backup”, la 26 de ore. Adresa lui o puneți în `BACKUP_HEARTBEAT_URL`.
   - La „Notificări”, adăugați emailul managerului.
4. **`https://erori.<domeniu>`** (GlitchTip). Faceți-vă contul (înscrierea publică e oprită), apoi:
   - creați o organizație „Jungle Padel” și un proiect „backend”;
   - copiați „DSN”-ul proiectului în `SENTRY_DSN`.
5. **`https://statistici.<domeniu>`** (Umami). Intrați cu `admin` / `umami` și **schimbați parola imediat**. Apoi adăugați site-ul `www.<domeniu>` și puneți:
   - `UMAMI_SRC=https://statistici.<domeniu>/script.js`;
   - `UMAMI_WEBSITE_ID` = ID-ul site-ului din Umami.
6. Reporniți cu noile setări:
   ```bash
   deploy/scripts/update   # reconstruiește site-ul cu adresa Umami și repornește serviciile
   ```

## Lunar
- În Uptime Kuma: toate verificările sunt verzi.
- În GlitchTip: erorile noi. Dacă una se repetă, ne-o trimiteți.
- În panou → Sistem: versiunea și ultimele sarcini programate.
