# Design tokens

> **Stare:** construit în Etapa 1B (27.09.2026); din 27.09.2026 identitatea provizorie „Noapte și alamă” (B4), aleasă de proprietar.

## Ce face

Culorile, fonturile, spațierile, razele, umbrele și animațiile tuturor aplicațiilor, dintr-un singur loc (§12.4). Identitate provizorie „Noapte și alamă” (B4) până la identitatea finală (Etapa 13).

## Specificații

- [12.4 Branding tehnic (design tokens)](../../docs/12-branding/01-branding-tehnic-design-tokens.md)

## Decizii tehnice

[ADR-0020](../../docs/04-arhitectura/adr/0020-design-tokens.md), [ADR-0007](../../docs/04-arhitectura/adr/0007-frontend-nextjs-vite.md)

## Rulare, testare, deploy

- Tokenii (format DTCG): `tokens/color.json`, `tokens/base.json`. Descrierea identității: [docs/12-branding/05-identitate-provizorie-noapte-si-alama.md](../../docs/12-branding/05-identitate-provizorie-noapte-si-alama.md).
- Generare: `pnpm --filter @jungle/design-tokens build` → `dist/tokens.css` (variabile CSS) și `dist/tokens.ts`. Fișierele generate se păstrează în git; `scripts/test-all` verifică că sunt la zi.
- Test automat: contrastul culorilor de text (AAA pentru text, AA pentru explicații și accente, 3:1 pentru focus și contururi, pe toate fundalurile de noapte) — `pnpm --filter @jungle/design-tokens test`.
