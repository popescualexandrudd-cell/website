# 5.12 Evenimente, parkour, cafenea

> **Sursa:** `MEGA_PROMPT.md` §5.12 (versiunea 1.0, 26.09.2026). Text preluat integral în Etapa 0, fără modificări de conținut.
> De acum, acest fișier este referința de lucru pentru această secțiune. Orice modificare ulterioară se notează aici, cu data și sursa („confirmat de proprietar la data X”); `MEGA_PROMPT.md` rămâne neschimbat, ca referință istorică.

- **R-110** **Evenimentele apar pe site de la lansare** (petreceri cu DJ, turnee, sala de evenimente pentru 15–20 de persoane). **Parkourul NU apare la lansare** (feature flag, activat după deschiderea padelului).
- **R-111** **Cafeneaua vinde prin chioșcul de plăți** („mai simplu: doar în aparat”). Toate vânzările de cafenea apar în chioșcul de plăți și în rapoarte. Comanda ajunge pe afișajul cafenelei, iar numărul comenzii apare pe ecranul din lobby când e gata.
- **R-112** Meniu, prețuri, categorii, disponibilitate și, opțional, stoc: configurabile din admin (Q33).

## Completări de implementare
- **R-110, calendarul (30.09.2026, Etapa 11, prin delegarea proprietarului din 29.09.2026):** evenimentele (seri cu DJ, padel social, evenimente ale clubului) se publică din panou (Evenimente → „Calendarul public”, dreptul `events.manage`), cu titlul în română și engleză; fiecare adăugare, modificare, publicare, retragere și anulare intră în jurnalul de audit, iar modificarea, publicarea, retragerea și anularea cer un motiv. Pe site, calendarul le arată alături de turneele ligii deschise sau în desfășurare; un eveniment anulat rămâne marcat „Anulat” până la ora lui de sfârșit. Un eveniment din calendar nu rezervă terenuri sau sala (se rezervă separat). Detalii: `docs/04-arhitectura/aplicatii/09-website-simulator.md`, secțiunea 12.
- **R-111, R-112, pe site (30.09.2026, Etapa 11, secțiunea 13):** secțiunea „Cafeneaua” arată meniul exact din panou, doar produsele disponibile, cu prețurile marcate orientative cât sunt DE_STABILIT (Q21), și explică comanda: la Chioșcul de Plăți, în numerar, cu numărul comenzii pe bon și pe ecranul din lobby. Orice schimbare de meniu din panou ajunge pe site imediat.
- **Q33 (confirmat de proprietar la 30.09.2026):** cafeneaua funcționează fără gestiune de stoc și fără imprimantă de bonuri la bar; un produs e doar „disponibil / indisponibil”, iar comenzile apar pe afișajul barului.
- **Q34 (confirmat de proprietar la 30.09.2026):** sala de evenimente se cere online (din cont) și telefonic (recepția sau managerul o introduc în panou, etapă ulterioară); pachetele, prețurile și confirmarea le aprobă un manager.
