# Panoul de admin (React + Vite)

> **Stare:** neînceput (schelet creat în Etapa 0, 26.09.2026). **Se construiește în Etapa:** 10 (până atunci, adminul tehnic Django din Etapa 1A).

## Ce face

Control total asupra datelor și setărilor (§8.6): tablou de bord live, utilizatori, calendar de rezervări, resurse, prețuri, abonamente, antrenori, pilates, prezențe, ligă, plăți și registru, numerar și fiscal, cafenea, evenimente, notificări, comunitate, AI, conținut, traduceri, dispozitive, feature flags, rapoarte, audit, roluri, backup. Autentificare cu 2FA obligatorie.

## Specificații

- [8.6 Panoul de admin (control total, „complet funcțional”)](../../docs/04-arhitectura/aplicatii/06-panou-admin.md)

## Decizii tehnice

[ADR-0007](../../docs/04-arhitectura/adr/0007-frontend-nextjs-vite.md), [ADR-0011](../../docs/04-arhitectura/adr/0011-autentificare-utilizatori-personal.md), [ADR-0022](../../docs/04-arhitectura/adr/0022-feature-flags-configurare-versionata.md)

## Unde rulează

Subdomeniu: `admin.<domeniu>` (acces restricționat, 2FA) (§4.6). Poate fi rulată și publicată separat.

## Variabile de mediu planificate

Valorile reale stau doar în `.env` pe server, niciodată în git.

- URL-ul API-ului

## Rulare, testare, deploy

Etapa 0 nu conține cod. `.env.example`, `Dockerfile` (unde e cazul) și testele se adaugă în etapa care construiește componenta, împreună cu instrucțiunile de rulare, testare și deploy.
