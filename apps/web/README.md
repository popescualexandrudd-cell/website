# Website public + contul clientului (Next.js, PWA)

> **Stare:** Etapa 1B aprobată (27.09.2026, identitatea „Noapte și alamă”): pagina de pre-lansare RO/EN cu randări 3D, listă de așteptare, pagini legale, gestionar de cookies. **Website-ul complet:** Etapa 11, secțiune cu secțiune; secțiunea 1 (antetul fix) livrată pe 29.09.2026, ascunsă în spatele comutatorului `full_site` (Q57) până la pornirea lui.

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

Variabile de mediu: [`.env.example`](.env.example) (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `SITE_INDEXABLE=true` doar în producție, Umami opțional, `REVALIDATE_SECRET` = `WEB_REVALIDATE_SECRET` din backend). Imagine Docker: [`Dockerfile`](Dockerfile) (build din rădăcină; `.dockerignore` din rădăcină ține afară `.next`, `node_modules` și orice `.env`).

### Site-ul complet și pagina de pre-lansare (Q57)
- `src/lib/flags.ts` citește comutatorul `full_site` din `GET /api/v1/config/flags` (memorie de 5 minute, eticheta `flags`); doar un „pornit” clar dă site-ul complet, orice eroare lasă pagina de pre-lansare.
- `src/app/api/revalidate/route.ts`: backend-ul cere reîmprospătarea imediată după ce salvează un comutator sau o setare (`X-Revalidate-Secret`, doar etichetele `flags` și `config`); fără `REVALIDATE_SECRET` adresa răspunde 404.
- Oprit: `layout.tsx` pune antetul paginii de pre-lansare, iar paginile noi (`Upcoming`) răspund 404. Pornit: `SiteHeader` și pagina principală `FullHome`: secțiunile gata (Hero-ul `FullHero`, turul `Tour` + `TourStops` pe `SitePlan`, „Acum în club” `NowInClub` + `LiveClub`, live din API, logica în `src/lib/live.ts`, Padel `Padel` + `PadelCourt`, simulatorul de nivel `Level` + `LevelSimulator`, cu întrebările în `src/lib/level.ts` și nivelul din `GET /api/v1/league/level-guess`, liga `League` + `PointsSimulator` (LP din `GET /api/v1/league/lp-preview`, rangurile în `src/lib/league.ts`) + `StandingsPreview`, tenisul `Tennis`, cu linkul spre Clubul Tenis Elite din `src/lib/links.ts`, pilates `Pilates` + `ClassSchedule`, cu programul grupat pe zilele clubului în `src/lib/classes.ts`), apoi harta secțiunilor §9.2 (`BUILT` = câte sunt gata).
- Testele cap-coadă rulează întâi pagina de pre-lansare, apoi pornesc comutatorul de pe server (`manage.py set_flag full_site on`) și rulează `e2e/full/` (`E2E_SITE_MODE=full`). Doar site-ul: `E2E_ONLY=web scripts/test-e2e`.

### Structura
| Folder | Ce conține |
|---|---|
| `src/app/[locale]/` | paginile: principală, `terms`, `privacy`, `refunds`, `cookies`, `privacy-notice`, `waitlist/confirm`, `waitlist/unsubscribe` (adrese traduse: `/ro/termeni-si-conditii`, `/ro/lista/confirmare` …), imaginea Open Graph; paginile site-ului complet (`padel`, `league`, `tennis`, `pilates`, `packages`, `events`, `cafe`, `contact`, `bookings`, `account` → `/ro/liga`, `/ro/pachete`, `/ro/rezervari`, `/ro/cont` …) |
| `src/app/sitemap.ts`, `robots.ts` | SEO (robots închis dacă `SITE_INDEXABLE` nu e `true`) |
| `src/components/` | scenele 3D (`ArenaScene`, `MemberCardScene`) cu imaginile lor statice (`HeroVisual`, `LeagueCard`), `CookieConsent`, `LegalDocument`, `TimelineProgress`, `Reveal`, formularul listei de așteptare, antetul paginii de pre-lansare și antetul site-ului complet (`SiteHeader`), `FullHome`, `Upcoming`, subsol (datele firmei, ANPC) |
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
