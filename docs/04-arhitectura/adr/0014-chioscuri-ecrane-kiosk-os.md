# ADR-0014: Chioșcuri și ecrane — Linux + Chromium în mod kiosk

- **Stare:** Propus (Etapa 0)
- **Data:** 2026-09-26
- **Legat de:** §4.3, §8.2, §8.3, §8.5, §8.7

## Context
Chioșcurile și ecranele trebuie să pornească singure, să nu permită accesul la sistemul de operare și să se refacă singure după blocaje sau căderi de conexiune.

## Decizie
1. **Implicit:** mini-PC cu Ubuntu LTS (sau Debian stabil), utilizator dedicat fără drepturi de administrator, Chromium pe tot ecranul (`--kiosk`) pornit automat.
2. **Watchdog:** repornește browserul și bridge-ul la blocaj; repornește aparatul dacă e nevoie.
3. **Ecran „Serviciu temporar indisponibil”** servit local când lipsește conexiunea la server; revenire automată.
4. Acces la sistemul de operare blocat (fără tastatură fizică, taste speciale dezactivate); actualizări de securitate automate, în afara programului.
5. **Varianta Windows** (Edge/Chrome în mod kiosk, „Assigned Access”) se documentează în `docs/09-hardware/`, pentru cazul în care aparatul de plată vine cu Windows.
6. Scripturile de configurare stau în `deploy/kiosk-os/`.
7. Ecranele de la terenuri pot folosi același sistem pe mini-PC sau un dispozitiv mai mic; decizia după Q23.

## Alternative analizate
- **Aplicații native (Electron):** mai greu de actualizat și de securizat decât o pagină servită de server. Respins.
- **Windows ca implicit:** licențe și actualizări mai greu de controlat. Rămâne variantă documentată.

## Consecințe
- Actualizarea aplicației de chioșc = publicarea unei versiuni noi pe server; aparatul o preia la reîncărcare.
