# 6.2 MMR (rating ascuns) — model bayesian cu incertitudine pentru echipe

> **Sursa:** `MEGA_PROMPT.md` §6.2 (versiunea 1.0, 26.09.2026). Text preluat integral în Etapa 0, fără modificări de conținut.
> De acum, acest fișier este referința de lucru pentru această secțiune. Orice modificare ulterioară se notează aici, cu data și sursa („confirmat de proprietar la data X”); `MEGA_PROMPT.md` rămâne neschimbat, ca referință istorică.

- Implementează în `packages/league-engine` un model de tip **Weng-Lin (familia OpenSkill / TrueSkill-like)**: fiecare jucător are `μ` (nivel estimat) și `σ` (incertitudine). Nou-veniții se mișcă repede, veteranii stabil.
- Parametri impliciți: `μ0 = 25`, `σ0 = 25/3`, `β = σ0/2`, `τ = σ0/100` (dinamică), parametri de egalitate pentru rezultatele egale ale meciurilor neterminate.
- Echipa în dublu: `μ_echipă = Σμ`, `σ²_echipă = Σσ²`.
- **Probabilitatea de câștig** (folosită și pentru LP și pentru matchmaking):
  `p_A = Φ( (μ_A − μ_B) / sqrt(n·β² + σ²_A + σ²_B) )`, unde `n` = numărul total de jucători din meci, iar Φ = funcția de repartiție normală standard.
- Implementarea proprie se validează numeric în teste față de o implementare de referință open-source (de exemplu pachetul `openskill`, doar ca dependență de test), cu toleranță documentată.
- Actualizările sunt **ponderate** pentru meciurile neterminate (factorul `w` din 6.6).
