# Chioșcul de Ligă (aparatul 1)

> **Stare:** neînceput (schelet creat în Etapa 0, 26.09.2026). **Se construiește în Etapa:** 7.

## Ce face

Singurul loc unde se introduc și se confirmă scorurile (§4.1, §8.2): scanarea cardului, înscrierea în ligă cu formularul GDPR, introducerea scorului, confirmare sau contestare, provocări, check-in, clasamente. Ecran de repaus cu clasamentul live și Meciul zilei.

## Specificații

- [8.2 Chioșcul de Ligă (aparat 1)](../../docs/04-arhitectura/aplicatii/02-chiosc-liga.md)
- [6.9 Fluxul de validare (mașină de stări, pe server)](../../docs/03-liga/09-fluxul-de-validare.md)

## Decizii tehnice

[ADR-0007](../../docs/04-arhitectura/adr/0007-frontend-nextjs-vite.md), [ADR-0012](../../docs/04-arhitectura/adr/0012-autentificare-dispozitive.md), [ADR-0013](../../docs/04-arhitectura/adr/0013-hardware-bridge.md), [ADR-0014](../../docs/04-arhitectura/adr/0014-chioscuri-ecrane-kiosk-os.md)

## Unde rulează

Subdomeniu: `kiosk-liga.<domeniu>` (doar dispozitive înregistrate) (§4.6). Poate fi rulată și publicată separat.

## Variabile de mediu planificate

Valorile reale stau doar în `.env` pe server, niciodată în git.

- URL-ul API-ului
- portul local al Hardware Bridge

## Rulare, testare, deploy

Etapa 0 nu conține cod. `.env.example`, `Dockerfile` (unde e cazul) și testele se adaugă în etapa care construiește componenta, împreună cu instrucțiunile de rulare, testare și deploy.
