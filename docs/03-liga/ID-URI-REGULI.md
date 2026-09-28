# ID-urile regulilor ligii (LG-xxx)

> Creat în Etapa 2 (27.09.2026), conform ADR-0008 punctul 8. Fiecare regulă din `docs/03-liga/` primește un ID, **fără a schimba textul regulilor**. Testele din `packages/league-engine/tests/` au ID-ul în nume (de exemplu `test_lg_060_examples_from_the_specification`).
>
> **Unde:** `motor` = implementat și testat în `packages/league-engine` (Etapa 2). `Etapa N` = se implementează la integrare (backend, chioșc, admin), cu motorul ca bază.
> **DE_CONFIRMAT** = varianta implicită aleasă de noi acolo unde specificația nu spune exact; se poate schimba din configurarea versionată, fără cod.

## 6.1 Ce e activ
| ID | Regula | Unde |
|---|---|---|
| LG-001 | Trei clasamente separate (dublu individual, simplu individual, perechi), fiecare cu MMR, LP și rang proprii | motor |
| LG-002 | Un meci de dublu actualizează ratingul individual al celor 4 și ratingul celor 2 perechi | motor |
| LG-003 | Perechea e o combinație neordonată de doi jucători („ana+bogdan” = „bogdan+ana”) | motor |
| LG-004 | O pereche nouă pornește de la media μ de dublu a celor doi, cu σ0 și plasare. **DE_CONFIRMAT** (specificația nu spune de unde pornește perechea) | motor |
| LG-005 | Doar padel momentan; „sportul” rămâne o dimensiune pentru mai târziu | backend `league.matches` (doar terenuri de padel), Etapa 6 |

## 6.2 MMR
| ID | Regula | Unde |
|---|---|---|
| LG-020 | Model Weng-Lin (Thurstone–Mosteller, perechi complete): μ și σ; nou-veniții se mișcă repede | motor |
| LG-021 | `p_A = Φ((μ_A − μ_B) / sqrt(n·β² + σ²_A + σ²_B))`, n = entitățile evaluate în meci (4 la dublu, 2 la simplu și la perechi) | motor |
| LG-022 | Actualizări ponderate cu `w` pentru meciurile neterminate: `w` înmulțește atât schimbarea lui μ, cât și scăderea lui σ | motor |
| LG-023 | Validare numerică față de `openskill` 6.2 (doar ca dependență de test): diferență ≤ 1e-9 la victorii și înfrângeri. La egalitate, σ e identic, iar μ urmează articolul original (openskill face media schimbărilor între echipele la egalitate, ceea ce anulează aproape toată actualizarea) | motor |
| LG-024 | Echipa: `μ = Σμ`, `σ² = Σσ²` | motor |
| LG-025 | Parametrii impliciți: μ0 = 25, σ0 = 25/3, β = σ0/2, τ = σ0/100, marja de egalitate ε = 0,1 | motor |

## 6.3 Nivelul afișat
| ID | Regula | Unde |
|---|---|---|
| LG-030 | `Nivel = clamp(4,0 + (μ − 25)/5, 1,0, 7,0)`, o zecimală (jumătățile departe de zero) | motor |
| LG-031 | „Nivel provizoriu” în perioada de plasare | motor (starea „în plasare”), afișarea în Etapa 11 |
| LG-032 | Ce înseamnă fiecare nivel, în cuvinte | [NIVELURI.md](NIVELURI.md) |

## 6.4 Intrarea în ligă
| ID | Regula | Unde |
|---|---|---|
| LG-040 | Chestionar → `μ_inițial = 25 + 5·(L0 − 4)`, σ ridicat (σ0) | motor |
| LG-041 | Antrenorul poate ajusta L0 și σ înainte de primul meci | motor (`register_player` din nou) + admin în Etapa 10 |
| LG-042 | Acord GDPR la chioșcul de ligă înainte de intrare (R-010) | Etapa 5 / 7 |
| LG-043 | 5 meciuri de plasare; apoi rangul după MMR, plafonat la Platină IV; LP pornește de la 0 | motor |
| LG-044 | În meciurile de plasare nu se aplică LP (doar MMR) | motor |

## 6.5 Ranguri
| ID | Regula | Unde |
|---|---|---|
| LG-050 | Bronz, Argint, Aur, Platină, Diamant, fiecare cu IV → I; 100 LP pe treaptă | motor |
| LG-051 | Maestru (LP nelimitat); Regele Junglei = top 10 Maeștri eligibili după LP, calculat, nu stocat | motor |
| LG-052 | LP total = `treaptă × 100 + LP` (Bronz IV = 0 … Diamant I = 1900; Maestru = 2000 + LP) | motor |
| LG-053 | Promovare la ≥ 100 LP, cu păstrarea surplusului; din Diamant I în Maestru | motor |
| LG-054 | Protecție: 3 meciuri după promovare fără retrogradare (LP nu coboară sub 0) | motor |
| LG-055 | Retrogradare la LP < 0 (fără protecție): treapta anterioară, LP = 75 | motor |
| LG-056 | Podea la Bronz IV (LP 0); Maestru sub 0 → Diamant I, 75 LP | motor |
| LG-057 | Departajare: LP total, apoi μ, apoi meciuri oficiale în sezon, apoi cine a atins primul acel LP; ultima departajare, pentru o ordine complet deterministă: ID-ul | motor |
| LG-058 | Niciodată două promovări dintr-un meci: sub Maestru, surplusul se plafonează la 99 LP. **DE_CONFIRMAT** (apare doar cu bonusuri mari de turneu) | motor |

## 6.6 Calculul LP
| ID | Regula | Unde |
|---|---|---|
| LG-060 | `ΔLP_brut = K × (S − p)`, K = 40; exemplele ±20, +30/−30, +10/−10 | motor |
| LG-061 | `LP_total_așteptat = (Nivel − 1,0)/6,0 × 2000`, „se calibrează prin simulare”. **Calibrat la (Nivel − 1,3)/4,6 × 2000** ([CALIBRARE.md](simulari/CALIBRARE.md)), **DE_CONFIRMAT**, se recalibrează după Sezonul 0 | motor |
| LG-062 | Factorul `g` (MMR peste rang → urci mai repede, pierzi mai puțin), limitat la 0,75–1,5 | motor |
| LG-063 | `m_tip`: oficial 1,0; turneu 1,5; provocare 1,0 | motor |
| LG-064 | `w` (meci neterminat): 1,0 / 0,75 / 0,5 | motor |
| LG-065 | `m_rep` (anti-farming): 1,0 / 0,5 / 0,25 | motor |
| LG-066 | Rotunjire la cel mai apropiat întreg, .5 departe de zero (nu `round()` din Python) | motor |
| LG-067 | Limite: victorie [+3, +60]; înfrângere [−60, −3]; egalitate [−20, +20] | motor |
| LG-068 | O victorie nu dă niciodată LP negativ, o înfrângere niciodată pozitiv (test de proprietate) | motor |
| LG-069 | Bonusurile (provocare +5, fază de turneu) se adaugă **după** limitare, ca să nu se piardă. **DE_CONFIRMAT** (formula din §6.6 le pune înainte de limită, fără să spună ce se întâmplă peste +60) | motor |

## 6.7 Formatul scorului
| ID | Regula | Unde |
|---|---|---|
| LG-070 | Seturi până la 6, tie-break la 6–6 (până la 7, cu 2 diferență) | motor |
| LG-071 | Cele mai bune 2 din 3 seturi | motor |
| LG-072 | Regula la 40–40, configurabilă. **Implicit: „Star Point”**, regula oficială FIP / Premier Padel din 2026 (vezi nota din [07-formatul-scorului.md](07-formatul-scorului.md)) | motor (configurare), afișarea pe chioșc în Etapa 7 |
| LG-073 | Setul 3: set complet (implicit) sau super tie-break (până la 10, cu 2 diferență), per competiție | motor |
| LG-074 | Validatorul acceptă doar scoruri posibile; coduri de eroare stabile `league.score_*` | motor |
| LG-075 | Un set parțial doar la meciurile marcate „neterminat”, și doar ca ultim set | motor |

## 6.8 Meciuri neterminate
| ID | Regula | Unde |
|---|---|---|
| LG-080 | Contează doar cu cel puțin un set complet | motor |
| LG-081 | Câștigătorul: mai multe seturi complete; apoi mai multe game-uri (cu setul parțial); altfel egalitate. Un super tie-break complet contează ca un game; unul parțial nu se adună la game-uri | motor |
| LG-082 | `w` = 1,0 (complet), 0,75 (1–1 la seturi complete), 0,5 (exact un set complet) | motor |
| LG-083 | Zero seturi complete → nu contează (devine antrenament) | motor |
| LG-084 | La turnee, meciul se joacă până la final (nu poate fi neterminat) | motor |

## 6.9 Fluxul de validare
| ID | Regula | Unde |
|---|---|---|
| LG-090 | Stările `PROGRAMAT` … `APLICAT` și stările terminale | backend `league.matches` (Etapa 6) |
| LG-091 | Rezervarea există, e de tip meci oficial și e la club | backend `league.matches.check_booking` (Etapa 6) |
| LG-092 | Toți jucătorii au scanat cardul la intrarea pe teren | backend `league.matches.check_scans` (Etapa 6) |
| LG-093 | Fereastra de scor: 30 de minute după finalul rezervării (turnee: Q28) | backend `league.matches.score_window` (Etapa 6; turnee: `propose_fixture`) |
| LG-094 | Un jucător introduce, toți ceilalți confirmă sau contestă | backend `league.matches.propose` / `respond` (Etapa 6); ecranul chioșcului: `apps/kiosk-league` (Etapa 7) |
| LG-095 | Contestare → `DISPUTAT`; neconfirmat → `EXPIRAT` | backend `league.matches` (dispute, expirare, `resolve`) (Etapa 6) |
| LG-096 | Validare doar cu rezervarea plătită integral (Q11: 24 de ore) | backend `league.matches._payment_gate` + cârligul de plată din registru (Etapa 6) |
| LG-097 | `APLICAT`: MMR și LP prin motor, actualizări în timp real, notificări | backend `league.store.record` (Etapa 6); notificările: Etapa 12 |
| LG-098 | Verificări independente între sisteme, toate logate; doar chioșcul de ligă înregistrat | backend `league.kiosk.check` + jurnalul `MatchTransition` (Etapa 6); autentificarea chioșcului: `devices.auth` (token, certificat client, cheia Hardware Bridge) (Etapa 7) |
| LG-099 | Un meci contează doar pentru jucătorii care erau deja în ligă când s-a jucat (DE_CONFIRMAT, [Q51](../00-management/INTREBARI_DESCHISE.md#q51)) | backend `league.matches.check_registered_before` (Etapa 7) |

## 6.10 Anti-abuz și eligibilitate
| ID | Regula | Unde |
|---|---|---|
| LG-100 | Clasamentul final și recompensele: minimum 12 meciuri oficiale pe sezon (perechi: 6, Q31) | motor |
| LG-101 | Eligibilitate live: `meciuri ≥ min(12, săptămâni complete scurse)` | motor |
| LG-102 | Aceiași jucători exacți în ultimele 7 zile: meciurile 1–2 100%, al 3-lea 50%, apoi 25% | motor |
| LG-103 | Maximum 3 meciuri oficiale pe zi per jucător (ziua în ora României) | motor |
| LG-104 | Limita de diferență de nivel: dezactivată implicit (Q5); dacă e activată, meciul devine antrenament | motor |
| LG-105 | Detecția de anomalii (semnalare în admin, nu modifică nimic) | Etapa 12 (detecția de anomalii, cu AI) |
| LG-106 | Decay pentru Diamant și Maestru după 14 zile: −5 / −10 LP pe zi, cel mult până la Diamant IV; o dată pe zi | motor |
| LG-107 | Notificare cu 3 zile înainte de decay | motor (cine) + backend `league.daily` (emailul, Etapa 6) |
| LG-108 | Minorii excluși; fără acord GDPR nu intri în ligă | Etapa 5 / 6 (`privacy.league_consent`, `league.services.eligible`) |

## 6.11 Provocări directe
| ID | Regula | Unde |
|---|---|---|
| LG-110 | Adversarul poate fi cu maximum o treaptă peste. **DE_CONFIRMAT:** și pe aceeași treaptă | motor |
| LG-111 | 72 de ore pentru răspuns; 2 refuzuri pe sezon; al treilea: implicit nimic (doar afișat), opțional înfrângere tehnică | motor |
| LG-112 | Meciul se joacă în cel mult 7 zile | motor (termenul) + backend `league.challenges` (Etapa 6) |
| LG-113 | Provocatorul care câștigă primește +5 LP | motor |

## 6.12 Recompense
| ID | Regula | Unde |
|---|---|---|
| LG-120 | Top 3 Regi ai Junglei: ore gratuite, mingi, card special | backend `league.closing` (Etapa 6) |
| LG-121 | 10–20% reducere pentru top 3 din fiecare rang (Q6) | backend `league.closing` (vouchere, Etapa 6) |
| LG-122 | Motor de recompense configurabil per sezon | backend `league.closing` + setarea `league.rewards` (Etapa 6) |
| LG-123 | Card fizic la promovarea în Diamant (R-024) | Etapa 5 (cardul) + backend `league.badges` (oferta automată, Etapa 6) |

## 6.13 Sezoane
| ID | Regula | Unde |
|---|---|---|
| LG-130 | Sezoane de 3 luni; „Sezonul 0 – Calibrare” (Q27) | backend `league.services.activate_season` (Etapa 6) |
| LG-131 | Resetare: LP = 0; `μ' = μ̄ + 0,75·(μ − μ̄)` (μ̄ = media clasamentului respectiv) | motor |
| LG-132 | `σ' = min(σ0, σ + 1,5)` | motor |
| LG-133 | 3 meciuri de re-plasare; rangul, plafonat la rangul final din sezonul anterior | motor |
| LG-134 | Arhivarea sezonului (Hall of Fame) | backend `league.closing` (Hall of Fame, Etapa 6); pagina de pe site: Etapa 11 |

## 6.14 Tipuri de meci
| ID | Regula | Unde |
|---|---|---|
| LG-140 | Doar meciurile oficiale, de turneu și provocările ajung în motor; antrenamentele și lecțiile nu schimbă MMR sau LP | motor |
| LG-141 | Turneu: LP × 1,5 + bonus pe fază (configurabil) | motor (`award_bonus`) |
| LG-142 | Tablourile și formatele de turneu | backend `league.draws`, `league.tournaments` (Etapa 6) |

## 6.15–6.16 Gamificare și corectitudine tehnică
| ID | Regula | Unde |
|---|---|---|
| LG-150 | Insigne, Meciul zilei, grafice | backend `league.badges`, `league.spotlight` (Etapa 6); graficele și textul AI: Etapa 11 / 12 |
| LG-160 | Fiecare meci aplicat produce un eveniment imutabil (valori înainte/după pentru jucători și perechi); aplicarea e idempotentă și în ordinea cronologică a finalului | motor |
| LG-161 | Anularea unui meci = recalculare deterministă de la acel punct; identică cu recalcularea de la zero (test de proprietate) | motor |
| LG-162 | Două confirmări simultane nu pot aplica meciul de două ori (blocare + cheie de idempotență) | backend `league.matches.respond` (blocarea rândului, testată cu fire paralele, Etapa 6) |

## Note din Etapa 6 (28.09.2026)
- **LG-102, LG-103 la turnee (DE_CONFIRMAT, [Q49](../00-management/INTREBARI_DESCHISE.md#q49)):** meciurile de turneu nu intră în limita zilnică și nu au randament descrescător (sunt trase la sorți de sistem). Textul regulilor nu se schimbă; motorul aplică excepția doar tipului „turneu”. Simularea a fost rulată din nou: rapoartele din `simulari/` au rămas identice.
- **LG-110 … LG-113 (DE_CONFIRMAT, [Q48](../00-management/INTREBARI_DESCHISE.md#q48)):** provocările se lansează și se acceptă la Chioșcul Ligii; lipsa răspunsului în 72 de ore contează ca refuz.

