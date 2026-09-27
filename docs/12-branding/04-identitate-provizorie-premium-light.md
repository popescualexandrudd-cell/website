# Identitatea vizuală provizorie „Premium Light” (înlocuită)

> **Înlocuită pe 27.09.2026** de [„Noapte și alamă” (B4)](05-identitate-provizorie-noapte-si-alama.md), aleasă de proprietar. Păstrată ca istoric; regulile despre scenele 3D rămân valabile.

> Creată pe 27.09.2026, la cererea proprietarului: „o estetică ultra-premium, serioasă, luminoasă și curată”. **Înlocuiește** identitatea „Neon Jungle” ([03](03-identitate-provizorie-neon-jungle.md), păstrată doar ca istoric). Este tot **provizorie**: logo-ul, culorile și fonturile finale le alege proprietarul (§2.4, §15.4, Etapa 13). Toate valorile stau în [`packages/design-tokens`](../../packages/design-tokens/) (ADR-0020), deci identitatea se schimbă dintr-un singur loc.

## Ideea
Un club de padel de nivel înalt, nu un loc de joacă: lumină naturală, suprafețe curate, bleumarin profund, verde smarald matur și accente metalice (șampanie, argint, platină). Nimic „cartoon”. Diferită de site-ul Clubului Tenis Elite (fără verde deschis sau lime, altă structură, §9.1).

## Paleta
| Nume | Cod | Unde se folosește |
|---|---|---|
| Suprafață 50 (slate-50) | `#F8FAFC` | fundalul paginii |
| Suprafață 0 / 100 / 200 | `#FFFFFF` / `#F1F5F9` / `#E2E8F0` | carduri, secțiuni alternative, linii |
| Cerneală 900 / 700 / 500 | `#0B1220` / `#334155` / `#5B6B80` | titluri și text, text secundar, explicații |
| Bleumarin 900 / 700 / 100 | `#0B2545` / `#13315C` / `#E7EEF7` | butoane principale, secțiunea întunecată, fundaluri reci |
| Smarald 700 / 600 / 100 | `#0E6B4F` / `#12805E` / `#E3F2EC` | accente, confirmări |
| Șampanie (text/linii) | `#8C6A3C` | linii fine, detalii metalice |
| Aur / Argint / Platină (decor) | `#C8A96A` / `#A7B1BD` / `#DCE2E8` | finisajele cardurilor de membru, balustrada |
| Focus | `#1D4ED8` | conturul de focus pentru tastatură |

Contrastul este verificat automat la fiecare rulare a testelor: **AAA (≥ 7:1)** pentru titluri și text pe fundalurile deschise, **AA (≥ 4,5:1)** pentru explicații și accente, alb pe bleumarin și smarald.

## Tipografie
**Inter** (geometric sans, licență OFL), găzduit pe serverul nostru și redus doar la caracterele folosite, inclusiv diacriticele românești (două fișiere, ~28 KB + ~2 KB). Titluri mari, strânse (spațiere negativă), text cu interliniere generoasă (1,65); etichetele mici („kicker”) cu majuscule rare și spațiere largă.

## Logo provizoriu
O plăcuță bleumarin cu colțuri rotunjite, cusătura mingii de padel în șampanie și o frunză smarald; lângă ea, „JUNGLE PADEL” cu spațiere largă. Semn de lucru până la logo-ul final (Etapa 13).

## Randări 3D (realizate de noi, fără imagini cumpărate)
Toate sunt randări în timp real (Three.js), cu materiale fizice (PBR) și reflexii de mediu. Pentru fiecare scenă există și o **imagine statică** generată din aceeași scenă (`apps/web/public/renders/`, comanda `node scripts/render-stills.mjs`), cu text alternativ.
- **Deschiderea paginii:** vederea din lounge-ul suspendat la 3 m spre cele 4 terenuri: podea din rășină lucioasă, pereți de sticlă care reflectă lumina, plasă și stâlpi din oțel, ecrane la fiecare teren, balustradă de sticlă cu mână curentă din metal șampanie. La derulare, privirea coboară spre terenuri (GSAP ScrollTrigger); mouse-ul adaugă o paralaxă fină.
- **Cardul de membru:** format real de card (85,6 × 54 mm), miez metalic sub lac transparent. Finisajul arată statutul în ligă: **Argint, Aur, Platină, Diamant**. La derulare cardul se rotește și trece prin niveluri; alegerea unui nivel (buton) întoarce cardul și schimbă finisajul.
- **Dispunerea terenurilor este ilustrativă**, nu proiectul de arhitectură. Sub scenă scrie: „Randare 3D ilustrativă, realizată de noi. Nu este o fotografie a clubului.”
- Pentru vestiare, studioul de pilates, sala de evenimente și cafenea **nu am inventat randări**: vor fi făcute după proiectul de arhitectură (Q44). Până atunci, cardurile au pictograme.

## Reguli care protejează experiența
- Scenele pornesc după încărcarea paginii și doar pe dispozitive cu placă video reală; verificarea se face **înainte** de a descărca biblioteca 3D, ca telefoanele slabe să nu plătească nimic. Altfel rămâne imaginea statică.
- Se desenează doar când se schimbă ceva (derulare, mouse), la cel mult 30 de cadre pe secundă pe telefoane și deloc când nu sunt pe ecran.
- „Mișcare redusă”: un singur cadru static, fără animații; totul rămâne lizibil.
- Textul din deschidere stă pe un voal deschis, ca să rămână lizibil (WCAG AA) peste orice parte a randării.

## Ce urmează (Etapa 13)
Platforma de brand, 3 direcții de logo, variante de paletă și decizia finală a proprietarului; apoi tokenii se actualizează și toate aplicațiile preiau automat identitatea aleasă.
