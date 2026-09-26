# 6.17 Testele ligii (obligatorii, înainte de orice integrare)

> **Sursa:** `MEGA_PROMPT.md` §6.17 (versiunea 1.0, 26.09.2026). Text preluat integral în Etapa 0, fără modificări de conținut.
> De acum, acest fișier este referința de lucru pentru această secțiune. Orice modificare ulterioară se notează aici, cu data și sursa („confirmat de proprietar la data X”); `MEGA_PROMPT.md` rămâne neschimbat, ca referință istorică.

- Teste unitare pentru fiecare regulă (cu ID-ul regulii în nume) și **100% acoperire pe ramuri** în `league-engine`.
- Teste de proprietate (hypothesis): semnul LP, limitele, determinismul, replay = calcul de la zero, nicio promovare dublă, podele și plafoane respectate.
- **Simulare mare**: 500 de jucători cu „nivel real” ascuns, 50.000 de meciuri pe mai multe sezoane. Verifici: corelația Spearman dintre rang și nivelul real ≥ 0,85 după convergență; inflația LP per sezon mărginită; convergența plasărilor; o distribuție rezonabilă pe ranguri (țintă orientativă: Bronz 20%, Argint 25%, Aur 25%, Platină 17%, Diamant 10%, Maestru 3%); efectul resetării. Generează raport HTML sau Markdown în `docs/03-liga/simulari/` și calibrează parametrii pe baza lui.
