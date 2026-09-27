# Website public + contul clientului (Next.js, PWA)

> **Stare:** Etapa 1B livrată (27.09.2026), refăcută în stilul „Premium Light”: pagina de pre-lansare RO/EN cu randări 3D, listă de așteptare, pagini legale, gestionar de cookies. **Website-ul complet:** Etapa 11, secțiune cu secțiune.

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
- ID-ul site-ului în Umami (statistici fără cookie-uri, pornite doar după acordul vizitatorului)

## Rulare, testare, deploy

| Ce | Comandă (din rădăcina repository-ului) |
|---|---|
| Dezvoltare (cu backend-ul pornit prin `scripts/dev`) | `pnpm --filter @jungle/web dev` → `http://localhost:3000` |
| Build de producție | `pnpm --filter @jungle/web build` |
| Teste unitare / lint / tipuri | `pnpm --filter @jungle/web test`, `lint`, `typecheck` |
| Teste cap-coadă (backend + site + Playwright + axe) | `scripts/test-e2e` |
| Fonturi reduse (după schimbarea fonturilor) | `cd apps/web && uvx --with brotli --from fonttools python scripts/subset_fonts.py` |
| Imaginile statice ale scenelor 3D (după orice schimbare a scenelor) | cu site-ul pornit (`build` + `start`): `cd apps/web && node scripts/render-stills.mjs` → `public/renders/` |

Variabile de mediu: [`.env.example`](.env.example) (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `SITE_INDEXABLE=true` doar în producție, Umami opțional). Imagine Docker: [`Dockerfile`](Dockerfile) (build din rădăcină).

### Structura
| Folder | Ce conține |
|---|---|
| `src/app/[locale]/` | paginile: principală, `terms`, `privacy`, `refunds`, `cookies`, `privacy-notice`, `waitlist/confirm`, `waitlist/unsubscribe` (adrese traduse: `/ro/termeni-si-conditii`, `/ro/lista/confirmare` …), imaginea Open Graph |
| `src/app/sitemap.ts`, `robots.ts` | SEO (robots închis dacă `SITE_INDEXABLE` nu e `true`) |
| `src/components/` | scenele 3D (`ArenaScene`, `MemberCardScene`) cu imaginile lor statice (`HeroVisual`, `LeagueCard`), `CookieConsent`, `LegalDocument`, `TimelineProgress`, `Reveal`, formularul listei de așteptare, antet (cu meniu pe mobil), subsol (datele firmei, ANPC) |
| `src/lib/` | `consent.ts` (cookie-ul de acord), `webgl.ts` (regulile scenelor 3D), `site.ts` (fapte confirmate), clientul API |
| `public/renders/` | imaginile statice ale scenelor 3D, randate de noi |
| `src/i18n/` | rutare RO/EN (`next-intl`), textele vin din `packages/i18n` (`web.*`) |
| `src/proxy.ts` | detectarea limbii (în Next.js 16 „middleware” se numește „proxy”) |
| `public/fonts/` | fonturi reduse + licențele OFL |
| `e2e/` | teste Playwright |

### Reguli pentru scenele 3D
Pornesc după încărcarea paginii, doar cu placă video reală (verificată înainte de a descărca three.js; altfel rămâne imaginea statică), desenează doar la schimbări, la 30 fps pe telefoane, oprite când nu sunt vizibile, statice pentru „mișcare redusă”. Pentru demonstrații pe calculatoare fără placă video: `?3d=force`; pentru generarea imaginilor statice: `?3d=capture`.

### Cookies
Gestionar propriu (`CookieConsent`), fără servicii externe: înainte de alegere rulează doar ce e strict necesar; statisticile (Umami, dacă e configurat) pornesc doar după „Accept statisticile”. „Doar cookies necesare” are aceeași greutate vizuală. Alegerea stă 12 luni în cookie-ul `jp_consent` și se schimbă oricând din subsol („Setări cookies”).
