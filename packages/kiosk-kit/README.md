# @jungle/kiosk-kit

Ce au în comun ecranele aparatelor clubului: Chioșcul de Ligă, Chioșcul de Plăți, afișajul cafenelei (și, din Etapa 9, ecranele de teren și lobby). Creat în Etapa 8, ca aceeași regulă să fie scrisă o singură dată.

| Fișier | Ce conține |
|---|---|
| `src/bridge.ts` | Legătura cu Hardware Bridge (ADR-0013): `hello`, scanări semnate, evenimentele de numerar, comenzile semnate de server (`order`), simulatoarele (doar în dezvoltare), reconectare automată. |
| `src/hooks.ts` | `useDevice` (configurarea de la bridge, scanări, evenimente; fără bridge, scanerul-tastatură, doar în dezvoltare) și `useIdle` (ieșirea automată, oprită cât timp sunt bani în aparat). |
| `src/api.ts` | Citirea răspunsurilor API: `Offline` (fără server) și `ApiError` (cod stabil, tradus pe ecran); antetul `X-Device-Token`. |
| `src/i18n.ts` | Texte RO/EN din `packages/i18n` (fiecare ecran are spațiul lui: `kiosk.*`, `payKiosk.*`, `cafeDisplay.*`), ora clubului (`Europe/Bucharest`, ADR-0010), bani afișați în lei din bani (ADR-0009). |
| `src/components.tsx` | Tastatura pe ecran (cu diacritice), tastatura numerică (PIN), caseta SIMULATOR. |
| `src/kiosk.css` + `src/fonts/` | Stilul de bază al ecranelor tactile (doar din tokeni) și fonturile găzduite de noi (licențe OFL alături). |

Teste: `pnpm --filter @jungle/kiosk-kit test`.
