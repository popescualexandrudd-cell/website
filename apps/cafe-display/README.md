# Afișajul cafenelei

> **Stare:** neînceput (schelet creat în Etapa 0, 26.09.2026). **Se construiește în Etapa:** 8.

## Ce face

Coada de comenzi venite de la Chioșcul de Plăți, în timp real (§8.7): nouă → în preparare → gata → ridicată, cu semnal sonor; numărul comenzii gata apare pe ecranele din lobby.

## Specificații

- [8.7 Afișajul cafenelei](../../docs/04-arhitectura/aplicatii/07-afisaj-cafenea.md)

## Decizii tehnice

[ADR-0005](../../docs/04-arhitectura/adr/0005-timp-real-channels.md), [ADR-0007](../../docs/04-arhitectura/adr/0007-frontend-nextjs-vite.md), [ADR-0012](../../docs/04-arhitectura/adr/0012-autentificare-dispozitive.md)

## Unde rulează

Subdomeniu: `cafe.<domeniu>` (doar dispozitive înregistrate) (§4.6). Poate fi rulată și publicată separat.

## Variabile de mediu planificate

Valorile reale stau doar în `.env` pe server, niciodată în git.

- URL-ul API-ului și al WebSocket-ului

## Rulare, testare, deploy

Etapa 0 nu conține cod. `.env.example`, `Dockerfile` (unde e cazul) și testele se adaugă în etapa care construiește componenta, împreună cu instrucțiunile de rulare, testare și deploy.
