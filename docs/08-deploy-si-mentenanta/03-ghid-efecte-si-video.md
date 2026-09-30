# Ghid: videoul de prezentare și efectele site-ului

> Pentru proprietar și personalul clubului. Explică ce puteți face singuri din panou și ce ne cereți nouă. Detaliile tehnice sunt în ADR-0023 și în `apps/web/README.md` (secțiunea „Efecte”).

## Pe scurt
- Efectele și videoul sunt **straturi peste site**. Oprite, site-ul arată și funcționează exact ca fără ele.
- Se pornesc și se opresc din **panou**, fără programator, și se aplică pe site în câteva secunde.
- Pagina de pre-lansare (cea publică acum) nu primește niciodată efecte sau video (Q64).

## 1. Pornirea și oprirea
În panoul de admin: **Setări și feature flags**.

| Comutator | Ce face | Implicit |
|---|---|---|
| `full_site` | site-ul complet în locul paginii de pre-lansare | oprit |
| `web_effects` | apariția progresivă la derulare, numerele care numără, cardurile care se înclină, bara de progres din antet | oprit |
| `web_hero_video` | videoul de prezentare din primul ecran | oprit |

Efectele și videoul apar doar când și `full_site` e pornit. Orice schimbare cere un motiv și intră în jurnalul de audit.

**Când să le opriți:** dacă cineva raportează că site-ul merge greu pe un telefon anume, sau înaintea unei prezentări pe un proiector slab. Oprirea nu pierde nimic. Porniți-le la loc oricând.

## 2. Cine vede ce
- **Pe un calculator sau telefon bun:** toate efectele.
- **Pe un telefon slab, cu „Economizor de date” sau pe o conexiune lentă:** doar apariții simple (fade), fără video pornit singur.
- **Cu „Reducerea mișcării” pornită în setările telefonului sau ale calculatorului:** nimic nu se mișcă, totul e vizibil de la început. Videoul pornește doar din butonul lui.
- **Fără JavaScript:** site-ul complet, fără efecte.

## 3. Schimbarea videoului
1. Pregătiți videoul:
   - orizontal 16:9, cel puțin 1920×1080, 15–30 de secunde, care se poate relua în buclă;
   - fără text în imagine;
   - pe site rulează fără sunet (Q59).

   Dacă e randare sau imagine generată, spuneți-ne și îl marcăm „ilustrativ” (Q44).
2. Pe GitHub, pe branch-ul de lucru, deschideți `apps/web/media-src/hero` → **Add file** → **Upload files** → trageți videoul → **Commit changes**. Prin site-ul GitHub se pot urca fișiere de cel mult 25 MB; dacă e mai mare, exportați-l la 1080p sau mai scurt.
3. Ne scrieți „am urcat videoul”. Noi rulăm comanda care face variantele pentru calculator (≤ 8 MB) și telefon (≤ 3 MB) și verificăm viteza site-ului.
4. Porniți `web_hero_video` din panou.

Originalul nu ajunge niciodată pe site; doar variantele comprimate.

## 4. Ce se mișcă, pe secțiuni
- **Titlurile** intră pe rânduri, textele urcă ușor, cardurile apar în cascadă.
- **Pe calculator,** cardurile se înclină ușor după mouse, cu o lumină de alamă.
- **Simulatoarele** („Care e nivelul tău?”, punctele din ligă, pachetele, „Împarte ora”): rezultatul nou intră cu un „pop”. Calculul rămâne mereu al serverului, iar efectul nu schimbă nicio cifră.
- **„Acum în club”:** starea unui teren care se schimbă (liber sau ocupat) intră cu un „pop”.
- **„Clubul în cifre”:** numerele numără de la 0 la valoarea reală.
- **Antetul:** o bară subțire arată cât ați citit din pagină, iar în meniu se aprinde secțiunea în care sunteți.
- **Celelalte pagini** (paginile din meniu, paginile legale): o intrare discretă când ajungeți la ele din meniu.

## 5. Cum cereți o schimbare
Scrieți-ne ce vreți, cu pagina și secțiunea. De exemplu: „la Liga, rangurile să apară mai încet” sau „fără înclinarea cardurilor”.

Fiecare schimbare trece prin aceleași verificări ca restul site-ului:
- nimic din conținut sau din funcții nu dispare;
- capturile cu efectele oprite rămân identice;
- viteza pe telefon (Lighthouse) se măsoară înainte și după;
- accesibilitatea se verifică automat.

Efectele opționale propuse (frunze în parallax, lumina care urmărește cursorul, camera din hală la derulare, tranziții între pagini, celebrarea rezultatului la simulatoare) intră doar după ce le vedeți ca demonstrații și le aprobați (Q62).

## 6. Dacă ceva nu merge
- **Un element nu apare:** opriți `web_effects`; dacă apare, ne scrieți pagina și telefonul sau browserul folosit.
- **Videoul nu pornește:** verificați că `web_hero_video` e pornit. Pe telefoane slabe sau cu „Economizor de date”, videoul pornește doar din butonul lui; e voit.
- **Site-ul pare lent:** opriți întâi `web_hero_video`, apoi `web_effects`, și ne anunțați.
