# ADR-0008: Motorul ligii — pachet Python pur, model Weng-Lin implementat propriu

- **Stare:** Propus (Etapa 0)
- **Data:** 2026-09-26
- **Legat de:** §6 (în special 6.2, 6.6, 6.16, 6.17), §4.2 punctul 2

## Context
Liga este inima comunității și trebuie să fie „fără erori”: rating MMR ascuns, LP, ranguri, sezoane, anti-abuz, recalculare deterministă. Cerința: pachet Python pur, testabil izolat, 100% acoperire pe ramuri, teste de proprietate și o simulare mare.

## Decizie
1. `packages/league-engine`: **Python pur** (fără Django, fără acces la baza de date sau rețea), `mypy --strict`, 100% acoperire pe ramuri, `hypothesis`.
2. **Nucleu funcțional:** funcțiile primesc starea (imutabilă) + evenimentul (meciul) + configurarea versionată și returnează starea nouă + un eveniment de rating cu valorile înainte/după. Backend-ul doar persistă evenimentele și stările (§6.16).
3. **Model:** Weng-Lin în varianta **Thurstone–Mosteller** (compatibilă cu formula de probabilitate cu Φ din §6.2), cu parametrii impliciți din §6.2 (`μ0 = 25`, `σ0 = 25/3`, `β = σ0/2`, `τ = σ0/100`). Echipele: `μ = Σμ`, `σ² = Σσ²`.
4. **Validare numerică:** implementarea proprie se compară în teste cu pachetul open-source `openskill` (modelul Thurstone–Mosteller), folosit **doar ca dependență de test**, cu toleranța documentată (§6.2).
5. **Rotunjirea LP:** funcție explicită „la cel mai apropiat întreg, .5 departe de zero” (§6.6). Funcția `round()` din Python NU se folosește, pentru că rotunjește .5 spre numărul par.
6. **Configurarea ligii** este un obiect imutabil, versionat (ADR-0022); toate constantele din §6 (K, praguri, factori, limite) vin din el, nu din cod.
7. **Determinism:** recalcularea unui sezon = aplicarea evenimentelor în ordinea cronologică a finalului de meci; testul obligatoriu: recalculare de la un punct = recalculare de la zero, cu rezultat identic bit cu bit.
8. **Identificatori de regulă:** la începutul Etapei 2, fiecare regulă din `docs/03-liga/` primește un ID `LG-xxx` (fără a schimba textul regulilor), folosit în numele testelor.

## Alternative analizate
- **Folosirea directă a pachetului `openskill` în producție:** comportamentul s-ar putea schimba la o actualizare; documentul cere implementare proprie validată. Respins.
- **Elo clasic:** fără incertitudine; nou-veniții s-ar mișca prea încet; slab pentru echipe cu parteneri variabili. Respins.
- **Glicko-2:** conceput pentru 1 la 1. Respins.

## Consecințe
- Motorul poate fi testat, simulat și calibrat înainte de orice integrare (Etapa 2), exact cum cere §6.17.
- Backend-ul nu duplică nicio formulă: și „Simulatorul de puncte” de pe site apelează motorul prin API (§9.2 punctul 7).
