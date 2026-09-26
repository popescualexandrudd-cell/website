# Ecranele de la terenuri și din lobby / cafenea / mezanin

> **Stare:** neînceput (schelet creat în Etapa 0, 26.09.2026). **Se construiește în Etapa:** 9.

## Ce face

Afișaj live (§8.5): pe fiecare teren, intervalul, durata, tipul sesiunii, jucătorii (doar câmpurile publice din R-012), timpul rămas, următoarea rezervare, Meciul zilei; în lobby, starea tuturor terenurilor, clasamente, Regii Junglei, evenimente, comenzile de cafenea gata. Reconectare automată, fără ecrane goale.

## Specificații

- [8.5 Ecranele de la terenuri și cele de lobby/cafenea/mezanin](../../docs/04-arhitectura/aplicatii/05-ecrane-teren-si-lobby.md)
- [5.2 Liga și GDPR la înscriere](../../docs/02-reguli-business/02-liga-si-gdpr-la-inscriere.md)

## Decizii tehnice

[ADR-0005](../../docs/04-arhitectura/adr/0005-timp-real-channels.md), [ADR-0007](../../docs/04-arhitectura/adr/0007-frontend-nextjs-vite.md), [ADR-0012](../../docs/04-arhitectura/adr/0012-autentificare-dispozitive.md), [ADR-0014](../../docs/04-arhitectura/adr/0014-chioscuri-ecrane-kiosk-os.md)

## Unde rulează

Subdomeniu: `ecrane.<domeniu>` (doar dispozitive înregistrate) (§4.6). Poate fi rulată și publicată separat.

## Variabile de mediu planificate

Valorile reale stau doar în `.env` pe server, niciodată în git.

- URL-ul API-ului și al WebSocket-ului
- identificatorul ecranului (teren sau zonă)

## Rulare, testare, deploy

Etapa 0 nu conține cod. `.env.example`, `Dockerfile` (unde e cazul) și testele se adaugă în etapa care construiește componenta, împreună cu instrucțiunile de rulare, testare și deploy.
