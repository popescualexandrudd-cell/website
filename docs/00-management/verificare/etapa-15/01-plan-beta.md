# Planul beta (Etapa 15)

> 06.10.2026 (§16, PLAN_DETALIAT: „beta cu membrii clubului de tenis”). Varianta implicită, DE_CONFIRMAT de proprietar (Q74): datele, numărul de participanți și invitația.

## Scopul
Înainte de deschidere, oameni reali folosesc sistemul pe serverul clubului, cu aparatele la locul lor. Așa aflăm ce e greu de înțeles și ce nu merge, cât încă se poate repara fără grabă.

## Cine și când
- **Cine:** 20–40 de persoane:
  - membri ai Clubului Tenis Elite, invitați de proprietar;
  - personalul clubului;
  - câțiva prieteni ai clubului care n-au jucat niciodată padel.
- **Când:** ultimele 2–3 săptămâni din februarie 2027, după instalarea serverului și a aparatelor (Etapa 14) și înainte de inaugurare.
- **Unde:** serverul de producție. Site-ul complet e pornit (`full_site`), dar nu e anunțat și nu apare în motoarele de căutare (`SITE_INDEXABLE=false` până la lansare); adresa o primesc doar invitații. Prețurile sunt cele orientative, marcate, iar plățile din beta se fac cu bani de test din casa clubului, returnați la sfârșit.
- **După beta:** baza de date se golește complet înainte de inaugurare (`deploy/scripts/reset-before-launch`, Etapa 16); conturile din beta nu se păstrează, iar participanții își fac din nou cont la lansare (le spunem de la început).

## Ce încearcă fiecare participant (scenariile)
1. Contul pe site, confirmarea emailului, cardul în Apple sau Google Wallet.
2. O rezervare online, mutarea ei, anularea cu peste 24 de ore înainte.
3. La club: scanarea la intrare, meciul, împărțirea orei la Chioșcul de Plăți, bonul.
4. Chestionarul de nivel, validarea de antrenor, acordul ligii la Chioșcul Ligii (18+).
5. Un meci de ligă cu scorul introdus și confirmat la chioșc; rangul și LP-ul pe ecrane și pe site.
6. O clasă de Pilates: înscrierea, lista de așteptare, prezența.
7. O comandă la cafenea, plătită la chioșc și văzută pe afișaj.
8. Asistentul de pe site: trei întrebări despre club.

## Personalul, în paralel
Fiecare rol își parcurge ghidul (`docs/15-instruire-personal/`) pe sistemul real, cu participanții beta ca primii clienți.

## Cum aflăm ce nu merge
- **Erorile tehnice:** ajung singure în GlitchTip (Etapa 14C).
- **Părerile:** un formular simplu, trimis pe email la sfârșitul fiecărei săptămâni, cu trei întrebări: ce a fost greu, ce lipsește, ce ați schimba. Plus întrebarea NPS după primul meci (Q71).
- **Problemele:** se adună într-o listă, cu prioritate:
  - blocantă (bani, ligă, acces): se repară înainte de lansare;
  - importantă: se repară în beta;
  - de dorit: după lansare.

## Când e gata (criteriile de ieșire)
- Nicio problemă blocantă deschisă.
- Toate scenariile de mai sus făcute de cel puțin 10 participanți.
- Casa chioșcului se închide fără diferență 5 zile la rând.
- Testul de restaurare a reușit pe serverul real.
- Personalul a trecut prin ghidul lui.
