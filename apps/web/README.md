# Website public + contul clientului (Next.js, PWA)

> **Stare:** Etapa 1B livrată (27.09.2026): pagina de pre-lansare cu listă de așteptare, RO/EN. **Website-ul complet:** Etapa 11, secțiune cu secțiune.

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

| Ce | Comandă (din rădăcina repository-ului) |
|---|---|
| Dezvoltare (cu backend-ul pornit prin `scripts/dev`) | `pnpm --filter @jungle/web dev` → `http://localhost:3000` |
| Build de producție | `pnpm --filter @jungle/web build` |
| Teste unitare / lint / tipuri | `pnpm --filter @jungle/web test`, `lint`, `typecheck` |
| Teste cap-coadă (backend + site + Playwright + axe) | `scripts/test-e2e` |
| Fonturi reduse (după schimbarea fonturilor) | `cd apps/web && uvx --with brotli --from fonttools python scripts/subset_fonts.py` |

Variabile de mediu: [`.env.example`](.env.example) (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `SITE_INDEXABLE=true` doar în producție, Umami opțional). Imagine Docker: [`Dockerfile`](Dockerfile) (build din rădăcină).

### Structura
| Folder | Ce conține |
|---|---|
| `src/app/[locale]/` | paginile: principală, `waitlist/confirm`, `waitlist/unsubscribe`, `privacy-notice` (adrese traduse: `/ro/lista/confirmare` …), imaginea Open Graph |
| `src/app/sitemap.ts`, `robots.ts` | SEO (robots închis dacă `SITE_INDEXABLE` nu e `true`) |
| `src/components/` | scena 3D (`HeroScene`), carduri 3D (`Tilt`), `Reveal`, `CountUp`, formularul listei de așteptare, antet, subsol, logo |
| `src/i18n/` | rutare RO/EN (`next-intl`), textele vin din `packages/i18n` (`web.*`) |
| `src/proxy.ts` | detectarea limbii (în Next.js 16 „middleware” se numește „proxy”) |
| `public/fonts/` | fonturi reduse + licențele OFL |
| `e2e/` | teste Playwright |

### Reguli pentru scena 3D
Pornește după încărcarea paginii, doar cu accelerare grafică reală (altfel rămâne fundalul CSS), la 30 fps pe telefoane, oprită când nu e vizibilă, statică pentru „mișcare redusă”. Pentru demonstrații pe calculatoare fără placă video: adaugă `?3d=force` la adresă.
