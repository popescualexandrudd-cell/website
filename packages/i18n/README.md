# Traduceri (i18n)

> **Stare:** construit în Etapa 1A (27.09.2026): RO/EN pentru toate codurile de eroare ale API-ului.

## Ce face

Cataloagele de texte pentru toate aplicațiile: română (referință) și engleză complete la lansare; spaniolă, italiană, chineză și altele adăugate fără cod nou (R-140). Test automat: nicio cheie lipsă în RO/EN.

## Specificații

- [5.15 Limbi](../../docs/02-reguli-business/15-limbi.md)

## Decizii tehnice

[ADR-0018](../../docs/04-arhitectura/adr/0018-internationalizare.md)

## Rulare, testare, deploy

- Cataloagele: `messages/ro.json` (referință) și `messages/en.json`, format ICU MessageFormat (de exemplu `{retry_after_seconds, number}`).
- Un cod de eroare nou din backend (`apps/backend/jungle/core/errors.py`) trebuie adăugat în ambele fișiere la `errors.<cod>`; testele backend și `pnpm --filter @jungle/i18n test` verifică asta.
- O limbă nouă = un fișier nou (`es.json`, `it.json`, `zh.json` …), fără cod nou.
