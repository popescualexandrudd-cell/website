# 14. DEPLOY PE SERVERUL PROPRIU, BACKUP, MONITORIZARE, MENTENANȚĂ

> **Sursa:** `MEGA_PROMPT.md` §14 (versiunea 1.0, 26.09.2026). Text preluat integral în Etapa 0, fără modificări de conținut.
> De acum, acest fișier este referința de lucru pentru această secțiune. Orice modificare ulterioară se notează aici, cu data și sursa („confirmat de proprietar la data X”); `MEGA_PROMPT.md` rămâne neschimbat, ca referință istorică.

- **Server propriu** (specificații, sistem de operare, locație fizică, IP public, redundanță de internet și curent: Q22). Recomandă UPS, internet de rezervă (de exemplu 4G) pentru chioșcuri și backup off-site.
- Docker Compose pe medii (dev, staging, prod); fiecare aplicație pe subdomeniul ei (4.6); TLS automat; firewall; actualizări de securitate automate pentru sistemul de operare.
- **Backup**: PostgreSQL zilnic + la fiecare oră (incremental / WAL), criptat, cu copie off-site; test automat de restaurare; runbook de recuperare după dezastru, cu obiective RPO/RTO documentate.
- **Monitorizare**: disponibilitate, erori, latență, spațiu pe disc, stare dispozitive (fiecare chioșc și ecran trimite semnal de viață), alerte către personal.
- **Mentenanță** (`docs/08-deploy-si-mentenanta/`): cum se face o actualizare, cum se revine la versiunea anterioară, ce faci dacă un chioșc nu mai merge, cum se schimbă prețurile, cum se deschide un sezon nou, lista verificărilor lunare. Scrise pentru un proprietar non-programator, cu comenzi copiabile.
- Versionare semantică, tag-uri git pentru fiecare etapă aprobată, migrări de bază de date reversibile.
