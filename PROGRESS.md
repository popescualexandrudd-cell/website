# Progres

Fiecare fază se încheie cu verificări și un commit. Dacă lucrul se întrerupe, se reia de la prima fază neterminată.

| Fază | Stare |
| --- | --- |
| 1. Plan de design (`DECISIONS.md`) | gata |
| 2. Fundație | gata |
| 3. Date | în lucru |
| 4. Sistem vizual și pagina principală | — |
| 5. Pagini interioare | — |
| 6. Rezervări și emailuri | — |
| 7. Admin | — |
| 8. SEO, GDPR, securitate, performanță, accesibilitate | — |
| 9. Deploy | — |
| 10. QA final | — |

## Faza 2: Fundație

- Next.js 16.3.6, React 19, TypeScript 5.9 strict (`noUncheckedIndexedAccess`), ESLint 9 (config Next), Prettier.
- Tailwind CSS v4 cu tokens-urile din `DECISIONS.md` în `app/globals.css`.
- Fonturi prin `next/font/google` (descărcate la build, servite de pe domeniul propriu). Verificat cu fontTools:
  subseturile latin-ext ale Cormorant Garamond (drept și italic) și Hanken Grotesk conțin Ș ș Ț ț (U+0218–U+021B).
- `lib/env.ts`: validare Zod la pornire (`instrumentation.ts`), mesaje în română.
- `proxy.ts`: i18n (ro fără prefix, en sub `/en` cu căi traduse) și CSP cu nonce.
- `docker-compose.dev.yml`: PostgreSQL 16 și Mailpit.

## Următorul pas

Faza 3: schema Prisma, migrarea cu constrângerea de excludere, seed-ul din `config/antrenor.yml`.
