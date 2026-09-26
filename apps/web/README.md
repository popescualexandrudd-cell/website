# Website public + contul clientului (Next.js, PWA)

> **Stare:** neînceput (schelet creat în Etapa 0, 26.09.2026). **Se construiește în Etapa:** 1B (pre-lansare), 11 (website complet, secțiune cu secțiune).

## Ce face

Website-ul „simulator” (§9): pagina principală pe secțiuni, simulatoarele (nivel, puncte LP, pachete, „Împarte ora”), liga live, rezervări, contul clientului (progres, rezervări, abonament, plăți, carduri, insigne, provocări, confidențialitate), multilingv, instalabil ca aplicație (PWA). Prima livrare: **pagina de pre-lansare cu listă de așteptare** (Etapa 1B).

## Specificații

- [9. WEBSITE-UL „SIMULATOR”](../../docs/04-arhitectura/aplicatii/09-website-simulator.md)
- [15.1 SEO tehnic (în cod)](../../docs/10-seo/01-seo-tehnic.md)

## Decizii tehnice

[ADR-0007](../../docs/04-arhitectura/adr/0007-frontend-nextjs-vite.md), [ADR-0018](../../docs/04-arhitectura/adr/0018-internationalizare.md), [ADR-0020](../../docs/04-arhitectura/adr/0020-design-tokens.md)

## Unde rulează

Subdomeniu: `www.<domeniu>` (§4.6). Poate fi rulată și publicată separat.

## Variabile de mediu planificate

Valorile reale stau doar în `.env` pe server, niciodată în git.

- URL-ul API-ului
- URL-ul site-ului (pentru SEO și linkuri canonice)
- ID-ul site-ului în Umami (analytics fără cookie-uri)

## Rulare, testare, deploy

Etapa 0 nu conține cod. `.env.example`, `Dockerfile` (unde e cazul) și testele se adaugă în etapa care construiește componenta, împreună cu instrucțiunile de rulare, testare și deploy.
