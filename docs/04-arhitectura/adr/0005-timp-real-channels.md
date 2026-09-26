# ADR-0005: Date în timp real cu Django Channels și Redis

- **Stare:** Propus (Etapa 0)
- **Data:** 2026-09-26
- **Legat de:** §4.1 („totul este conectat live”), §8.1, §8.5, §8.7

## Context
Clasamentele, ecranele de la terenuri, ecranele din lobby, chioșcurile și afișajul cafenelei trebuie să se actualizeze instant după orice validare de scor, rezervare sau comandă.

## Decizie
1. **Django Channels 4** (ASGI) pentru WebSockets, cu **Redis** ca strat de canale.
2. Canale pe subiecte: `leaderboard.<clasament>`, `court.<teren>`, `screens.<locație>`, `kiosk.<dispozitiv>`, `cafe.<locație>`, `user.<utilizator>`.
3. Mesajele anunță schimbarea și trimit un instantaneu mic; la reconectare, clientul reîncarcă starea completă prin API (sursa de adevăr rămâne API-ul).
4. Evenimentele se publică **după** confirmarea tranzacției în baza de date (`transaction.on_commit`), ca să nu se anunțe date care nu există.
5. Clienții de afișaj se reconectează automat (cu pauze crescătoare), păstrează ultima stare și afișează un indicator discret de conexiune; niciodată ecran gol (§8.5).
6. Accesul la canale respectă permisiunile: canalele publice conțin doar câmpurile din R-012.

## Alternative analizate
- **Server-Sent Events:** mai simplu, dar tot ar necesita infrastructură ASGI; Channels e cerut explicit în §4.3. Respins.
- **Servicii terțe (Pusher, Ably):** dependență de terți (§1.1 punctul 5). Respins.
- **Interogare periodică (polling):** latență și încărcare mai mari. Respins ca mecanism principal (rămâne rezervă).

## Consecințe
- Un proces ASGI separat în Docker Compose.
- Teste pentru reconectare, ordine a mesajelor și filtrarea câmpurilor publice.
