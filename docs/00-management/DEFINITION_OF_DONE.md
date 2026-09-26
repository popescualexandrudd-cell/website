# 13. TESTARE ȘI CALITATE (Definition of Done pentru orice livrare)

> **Sursa:** `MEGA_PROMPT.md` §13 (versiunea 1.0, 26.09.2026). Text preluat integral în Etapa 0, fără modificări de conținut.
> De acum, acest fișier este referința de lucru pentru această secțiune. Orice modificare ulterioară se notează aici, cu data și sursa („confirmat de proprietar la data X”); `MEGA_PROMPT.md` rămâne neschimbat, ca referință istorică.

1. Teste unitare + de integrare + end-to-end (Playwright) pentru fluxurile complete între aplicații: rezervare → check-in → scanare pe teren → meci → scor → confirmări → plată împărțită → validare → LP → ecrane → notificări → Wallet.
2. Motorul ligii: 100% ramuri, teste de proprietate, simulare mare (6.17). Banii: 100% ramuri, teste pe rotunjiri, împărțiri, reversări, idempotență, întreruperi de curent simulate la numerar.
3. Teste de concurență (dublă rezervare, dublă confirmare, dublă plată), teste pe fusul orar și trecerile de oră, teste de încărcare (de exemplu 500 de utilizatori simultani pe site + ecrane conectate), teste de securitate, de accesibilitate și de completitudine a traducerilor (nicio cheie lipsă în RO/EN).
4. Simulatoare hardware pentru toate aparatele, ca totul să poată fi testat fără hardware real.
5. Lint, type-check, formatare: zero erori. Toate testele verzi cu o singură comandă (`scripts/test-all`).
6. **Dublă revizuire logică** (secțiunea 1.1, punctul 1) documentată pe scurt în descrierea fiecărui commit sau etape.
7. Documentația și `CLAUDE.md` actualizate. `CHANGELOG.md` completat.
8. Instrucțiuni pentru proprietar: cum verifică el însuși, pas cu pas.
