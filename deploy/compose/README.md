# Docker Compose pe medii

> **Stare:** mediul `dev` creat în Etapa 1A (27.09.2026); `staging` și `prod` în Etapa 14.

Fișierele Docker Compose pentru `dev`, `staging` și `prod` (§14).

## Specificații

- [14. DEPLOY PE SERVERUL PROPRIU, BACKUP, MONITORIZARE, MENTENANȚĂ](../../docs/08-deploy-si-mentenanta/01-cerinte-deploy-backup-monitorizare.md)

## Decizii tehnice

[ADR-0015](../../docs/04-arhitectura/adr/0015-infrastructura-docker-caddy.md)

## Medii
- [`dev/compose.yaml`](dev/compose.yaml): PostgreSQL 17, Redis 7 și backend-ul (neverificat încă în Docker: mediul de lucru nu rulează Docker; verificare în Etapa 14).
