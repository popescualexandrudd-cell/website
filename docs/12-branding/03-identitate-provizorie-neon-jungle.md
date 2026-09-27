# Identitatea vizuală provizorie „Neon Jungle” (înlocuită)

> **Înlocuită pe 27.09.2026** de [„Premium Light”](04-identitate-provizorie-premium-light.md), la cererea proprietarului. Păstrată doar ca istoric.

> Creată în Etapa 1B (27.09.2026), la cererea proprietarului: „design și branding moderne, estetice, cu culori care să atragă, efecte 3D și altele”. Este **provizorie**: logo-ul, culorile și fonturile finale le alege proprietarul (§2.4, §15.4). Toate valorile stau în [`packages/design-tokens`](../../packages/design-tokens/) (ADR-0020), deci schimbarea identității se face dintr-un singur loc.

## Ideea
Jungla noaptea, într-un club: întuneric verde-profund, frunze mari, licurici și lumini neon de petrecere. Energie de seară cu DJ, nu de parc sportiv. **Diferită intenționat de site-ul Clubului Tenis Elite** (fără verde deschis sau lime, fără aceeași structură, §9.1).

## Paleta
| Nume | Cod | Unde se folosește |
|---|---|---|
| Noapte 950 | `#040C09` | fundalul paginii |
| Noapte 900 / 800 / 700 | `#071610` / `#0C2219` / `#133226` | suprafețe, carduri |
| Orhidee (accent principal) | `#FF3DA5` | butoane, lumini, gradient |
| Tucan | `#FF8A1F` | gradientul „apus” |
| Licurici | `#FFD84D` | evidențieri, mingea, focus |
| Lagună | `#2BE8D2` | pereții de sticlă, linkuri, detalii reci |
| Frunză | `#1F8A5B` | frunzele (verde profund, niciodată lime) |
| Nisip | `#F6EBD9` | textul principal |

Gradientul-semnătură „apus”: orhidee → tucan → licurici. Contrastul culorilor de text față de fundal este verificat automat (WCAG 2.2 AA, minimum 4,5:1) la fiecare rulare a testelor.

## Tipografie
- **Unbounded** (titluri): lată, geometrică, cu personalitate de club.
- **Manrope** (text): foarte lizibilă pe ecrane mici.
- Ambele sunt fonturi open-source (licența OFL), găzduite pe serverul nostru și reduse doar la caracterele folosite, inclusiv diacriticele românești. Paginile se încarcă repede și fără cereri către Google.

## Logo provizoriu
O minge de padel în gradientul „apus”, a cărei cusătură este o frunză de junglă, lângă textul „JUNGLE / PADEL”. Este doar un semn de lucru până la alegerea logo-ului final (3 direcții de logo, ca brief, vin în Etapa 13).

## Efecte și mișcare
- **Scena 3D** din deschiderea paginii, în timp real (Three.js): un teren de padel cu pereți de sticlă luminoși, o minge care sare cu o urmă neon, frunze care se leagănă, licurici și lumini colorate care se mișcă. Camera urmărește ușor mouse-ul.
- **Carduri 3D** care se înclină după mouse, cu un reflex de lumină.
- **Medalii 3D rotative** pentru rangurile ligii (Bronz → Regele Junglei).
- Bandă animată cu cuvinte-cheie, apariții lente la derulare, cifre care cresc animat, o hartă stilizată înclinată în 3D, granulație de film și aure colorate în fundal.

## Reguli care protejează experiența
- Scena 3D pornește **după** ce textul e pe ecran și **doar** pe dispozitive cu accelerare grafică reală. Pe celelalte rămâne fundalul animat CSS, ca pagina să nu devină greoaie.
- Pe telefoane, scena rulează la 30 de cadre pe secundă, ca să economisească bateria. Se oprește când nu e pe ecran.
- Cine a cerut în sistem „mișcare redusă” vede o pagină statică, completă și lizibilă (§9.4).
- Sub scenă scrie clar: „Scena 3D este o ilustrație, nu o fotografie a clubului” (nu prezentăm demo-ul ca realitate).

## Ce urmează (Etapa 13)
Platforma de brand, 3 direcții de logo, variante de paletă și decizia finală a proprietarului; apoi tokenii se actualizează și toate aplicațiile preiau automat noua identitate.
