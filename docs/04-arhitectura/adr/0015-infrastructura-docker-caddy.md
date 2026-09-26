# ADR-0015: Infrastructură — Docker Compose pe serverul propriu, Caddy ca proxy

- **Stare:** Propus (Etapa 0)
- **Data:** 2026-09-26
- **Legat de:** §4.3, §4.6, §14

## Context
Totul rulează pe serverul propriu al clubului (Q22), întreținut fără o echipă de operațiuni. Fiecare aplicație are subdomeniul ei (§4.6).

## Decizie
1. **Docker Compose** pe medii (`dev`, `staging`, `prod`), în `deploy/compose/`. Fiecare aplicație este un serviciu separat, cu imagine versionată (tag = versiunea semantică).
2. **Caddy** ca proxy invers, cu TLS automat (Let's Encrypt) pentru toate subdomeniile și verificare de certificat client (mTLS) pentru subdomeniile dispozitivelor (ADR-0012). Configurarea în `deploy/proxy/`.
3. **Firewall:** doar porturile 80/443 publice; SSH doar cu cheie (ideal doar prin VPN). Actualizări automate de securitate pentru sistemul de operare.
4. Headere de securitate și CSP strict setate la proxy și în aplicații (§12.1).
5. Secretele doar în fișiere `.env` de pe server (niciodată în git); în repository există doar `.env.example`.

## Alternative analizate
- **Nginx + Certbot:** echivalent, dar cu mai multă configurare manuală a certificatelor. Respins.
- **Kubernetes:** prea complex pentru un singur server și fără programator. Respins.

## Consecințe
- O actualizare = descărcarea imaginilor noi și repornirea serviciilor, cu migrări reversibile; revenirea la versiunea anterioară = tag-ul anterior (runbook în `docs/08-deploy-si-mentenanta/`).
