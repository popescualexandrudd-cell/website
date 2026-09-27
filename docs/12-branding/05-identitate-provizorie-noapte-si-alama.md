# Identitatea vizuală provizorie „Noapte și alamă” (B4)

> **Aleasă de proprietar pe 27.09.2026** dintre direcțiile propuse pe pânza de design (A · Premium Light, B · Jungle Noir, C · Court Clay; apoi 6 variante de paletă pentru B). **Înlocuiește** „Premium Light” ([04](04-identitate-provizorie-premium-light.md)) și „Neon Jungle” ([03](03-identitate-provizorie-neon-jungle.md)), păstrate doar ca istoric. Rămâne **provizorie** până la logo-ul final (Etapa 13). Toate valorile stau în [`packages/design-tokens`](../../packages/design-tokens/) (ADR-0020).

## Ideea
Un club privat, seara: bleumarin de noapte, alamă, os și un verde de pădure pentru terenuri. „Jungle” spus cu eleganță, fără frunze de desen animat. Diferită de site-ul Clubului Tenis Elite (fără verde deschis sau lime, §9.1).

## Paleta
| Nume | Cod | Unde se folosește |
|---|---|---|
| Noapte 950 / 900 / 800 | `#070E18` / `#0A1320` / `#0D1726` | subsol; fundalul paginii; secțiuni alternative |
| Noapte 700 / 600 / 500 | `#13253A` / `#1E3148` / `#3A5270` | carduri și panouri; linii; contururi puternice |
| Os 50 / 200 / 400 | `#EEE7DA` / `#C9CDD3` / `#9AA6B3` | titluri și text; text secundar; explicații și contururi de câmpuri |
| Alamă 300 / 400 | `#DCC08A` / `#C6A15B` | linkuri și etichete; butoane principale și linii |
| Pădure 700 / 400 | `#1D3B2E` / `#6DBF94` | terenurile; mesaje de succes |
| Focus | `#8DB8FF` | conturul de focus pentru tastatură |

Contrast verificat automat la fiecare rulare: **AAA** pentru text pe toate fundalurile, **AA** pentru explicații, linkuri și mesaje, **AAA** pentru textul de pe butoanele de alamă, **3:1** pentru focus și contururile câmpurilor.

## Tipografie
- **Fraunces** (serif editorial, regular și cursiv) pentru titluri; cursivul, în alamă, pentru accente.
- **Instrument Sans** pentru text, meniuri și butoane (majuscule cu spațiere largă).
- Ambele sunt open-source (OFL), găzduite pe serverul nostru, reduse la caracterele folosite, cu ă, ș, ț (~72 KB în total).

## Forme
Colțuri aproape drepte (2–6 px), linii fine de 1 px, butoane dreptunghiulare. Aspectul e de club, nu de aplicație.

## Randări 3D
- **Deschiderea**, după schița proprietarului: vederea de pe **pasarela-lounge de la 3 m, dintre cele două rânduri de terenuri** (2 × 2), seara. Include:
  - terenuri verde de pădure;
  - benzi LED;
  - pereți de sticlă care reflectă lumina;
  - balustrade de sticlă cu mână curentă de alamă;
  - podea închisă, lucioasă.
- **Cardul de membru:** Argint, Aur, Platină, Diamant. Numele nivelului este scris cu Fraunces.
- **Planul clubului** (secțiunea Locație) este o schemă desenată de noi după schiță, fără scară. Parkour-ul lipsește, pentru că e ascuns la lansare. Etichetele neclare din schiță nu apar (Q46).
- Imaginile statice se regenerează cu `node scripts/render-stills.mjs`.

## Reguli
Rămân cele din [04](04-identitate-provizorie-premium-light.md):
- scenele 3D pornesc doar pe o placă video reală;
- desenează doar când se schimbă ceva;
- pe telefon rulează la 30 fps;
- cu „mișcare redusă”, pagina e statică.

Peste randare, un voal închis ține textul lizibil.
