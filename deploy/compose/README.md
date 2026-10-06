# Docker Compose pe medii

> **Stare:** mediul `dev` creat în Etapa 1A (27.09.2026); `prod` creat în Etapa 14A (06.10.2026). `staging` folosește același fișier, cu propriul `.env`: `JUNGLE_ENV=staging`, alt domeniu, iar `CADDY_OPTIONS` duce la serverul de test Let’s Encrypt; rulează pe o altă mașină.

Fișierele Docker Compose pentru `dev`, `staging` și `prod` (§14).

## Specificații

- [14. DEPLOY PE SERVERUL PROPRIU, BACKUP, MONITORIZARE, MENTENANȚĂ](../../docs/08-deploy-si-mentenanta/01-cerinte-deploy-backup-monitorizare.md)

## Decizii tehnice

[ADR-0015](../../docs/04-arhitectura/adr/0015-infrastructura-docker-caddy.md)

## Medii
- [`dev/compose.yaml`](dev/compose.yaml): PostgreSQL 17, Redis 7 și backend-ul (neverificat încă în Docker: mediul de lucru nu rulează Docker; verificare în Etapa 14).
- [`prod/compose.yaml`](prod/compose.yaml): producția (Etapa 14A). Doar Caddy e accesibil din afară (porturile 80 și 443). Imaginile poartă eticheta `JUNGLE_VERSION`. Verificat cap-coadă de `deploy/scripts/smoke-stack` (local și în CI).

