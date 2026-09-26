# ADR-0019: AI — adaptor de furnizor, unelte cu permisiuni explicite, interdicții impuse tehnic

- **Stare:** Acceptat (26.09.2026, odată cu aprobarea Etapei 0 de către proprietar)
- **Data:** 2026-09-26
- **Legat de:** §4.1, §10, R-131

## Context
AI-ul este conectat la tot sistemul (asistent, matchmaking, Meciul zilei, rapoarte, copilot pentru admin), dar nu are voie să atingă scoruri, rating, LP, clasamente, bani, reduceri, vouchere sau acorduri GDPR și nu dezvăluie date ale altor utilizatori (§10.1).

## Decizie
1. Modul `ai` în backend, cu o interfață de furnizor (`AIProvider`). Implicit: **API-ul Claude de la Anthropic**; modelul se setează prin variabila de mediu `AI_MODEL`, nu se scrie în cod.
2. **Limită lunară de cost**, **comutator global de oprire** (feature flag) și jurnal pentru fiecare interacțiune (`AIInteractionLog`), fără date sensibile inutile (pseudonimizare unde se poate).
3. **AI-ul acționează doar prin unelte (tools) dintr-un registru** cu listă permisă pe context: asistent public (fără cont), asistent autentificat (în numele clientului), copilot pentru admin. Fiecare unealtă apelează aceleași servicii ca oamenii, cu aceleași validări și permisiunile utilizatorului în numele căruia lucrează.
4. **Dublă barieră pentru interdicții:**
   1. uneltele care ar modifica scoruri, rating, LP, clasamente, bani, reduceri, vouchere sau acorduri GDPR **nu există** în registru;
   2. serviciile respective refuză orice apel marcat „origine AI”, chiar dacă cineva ar adăuga greșit o unealtă. Ambele bariere au teste automate.
5. **Copilotul pentru admin** interoghează doar vederi agregate, doar-citire, printr-un rol de bază de date fără drept de scriere; interogările folosite se afișează pentru transparență.
6. **Deciziile se calculează determinist în cod** (scorul de potrivire la matchmaking, scorul de miză pentru Meciul zilei, detecția de anomalii); AI-ul doar formulează textul și explicațiile.
7. Textele generate pentru public (traduceri, articole, mesaje pentru comunitate) sunt marcate „de revizuit” până la aprobarea unui om.

## Alternative analizate
- **AI cu acces direct la baza de date:** imposibil de controlat. Respins.
- **Furnizor fix, fără adaptor:** blocare la un singur furnizor. Respins.

## Consecințe
- Cheia API a furnizorului AI se creează pe firma clubului (Q24) și stă doar în `.env` pe server.
- Prelucrarea prin AI se trece în registrul de prelucrări GDPR (§10.1, §12.2).
