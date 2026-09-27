# Raport de verificare — Etapa 1B (pagina de pre-lansare)

> Data: 27.09.2026. Branch: `claude/hopeful-euler-rguibn`. Starea: **livrată, așteaptă aprobarea proprietarului.**

## Ce s-a construit
| Ce | Detalii |
|---|---|
| Pagina de pre-lansare RO + EN | Deschidere cu scenă 3D, bandă animată, „Clubul” (6 carduri 3D), „Liga Jungle” (medalii 3D), „În cifre”, „Locație”, „Lista de așteptare”. Adrese: `/ro`, `/en`. |
| Identitate provizorie „Neon Jungle” | Culori, fonturi, logo, efecte: [docs/12-branding/03-identitate-provizorie-neon-jungle.md](../../../12-branding/03-identitate-provizorie-neon-jungle.md). |
| Lista de așteptare cu dublă confirmare | Înscriere → email de confirmare → email de bun venit. Dezabonare cu un click, cu **ștergerea datelor**. Înscrierile neconfirmate se șterg după 7 zile. |
| Nota de informare GDPR | Redactată de mine (Q41), RO + EN: [texte/](../../../07-securitate-gdpr-legal/texte/). Conține câmpuri `DE_CONFIRMAT` pentru datele firmei (Q26); **nu se poate publica în producție până nu le completăm** (sistemul refuză). |
| Pentru manager | Lista înscrierilor, statistici pe interese, export CSV (orice export e scris în jurnalul de audit). |
| Protecție | Câmp-capcană pentru roboți, limită de 5 înscrieri pe oră de pe aceeași adresă IP, răspuns identic pentru adrese noi și existente (nu se poate afla cine e pe listă), protecție la „formule” în exportul CSV. |
| SEO | Titlu și descriere pe limbă, `hreflang`, `sitemap.xml`, `robots.txt` (închis în afara producției), date structurate `SportsActivityLocation`, imagine pentru distribuirea pe rețele sociale. |
| Urmărirea campaniilor | Adresa `…/ro?src=instagram` înregistrează sursa înscrierii (pentru planul de marketing). |

## Rezultate
| Verificare | Rezultat |
|---|---|
| Teste backend | 128, toate trec (acoperire 97%) |
| Teste cap-coadă (Playwright, desktop + mobil) | 16, toate trec: pagina RO/EN, schimbarea limbii, înscriere → confirmare din email → dezabonare, acord obligatoriu, nota de informare, mișcare redusă, sitemap și robots |
| Accesibilitate automată (axe, WCAG 2.2 AA) | 0 probleme grave |
| Lighthouse mobil | **Performanță 93 · Accesibilitate 100 · Bune practici 100 · SEO 100** ([raport](lighthouse-mobil.html)) |
| Lighthouse desktop | **100 · 100 · 100 · 100** ([raport](lighthouse-desktop.html)) |
| Contrastul culorilor (WCAG AA) | verificat automat pentru toate culorile de text |
| ESLint, TypeScript strict, ruff, mypy strict | 0 probleme |

Cifrele Lighthouse sunt măsurate aici, pe build-ul de producție. Pe mobil, timpul până la cel mai mare element afișat (LCP) este 2,7 s în simularea de rețea mobilă lentă. Ținta din §9.4 este sub 2,5 s. Pe un telefon real, cu 4G bun, pagina apare mai repede; revenim cu măsurători pe serverul real (Etapa 14).

## Dubla revizuire: probleme găsite și reparate
1. **Performanță pe mobil (57 → 93).** Scena 3D rula pe procesor acolo unde nu există placă video (cum măsoară și Google). Acum:
   - pornește după încărcarea paginii;
   - rulează doar cu accelerare grafică reală;
   - pe telefoane merge la 30 de cadre pe secundă.

   Fonturile au scăzut de la 207 KB la 58 KB (doar caracterele folosite, inclusiv diacriticele), iar stilurile sunt incluse direct în pagină.
2. **Dezabonarea din email se face doar la click, nu automat.** Unele servere de email deschid singure linkurile ca să le verifice; fără această protecție, oamenii ar fi fost dezabonați fără să știe.
3. **Setarea pentru emailurile de test** (salvate în fișiere) nu era citită din configurare. Reparat.
4. **Eticheta linkului logo-ului** nu corespundea textului vizibil (problemă de accesibilitate). Reparat.
5. Structura componentei de confirmare, semnalată de ESLint (o randare în plus). Reparat.

## Capturi de ecran (scena 3D forțată, date reale ale clubului)
- Română, desktop: [deschidere](ro-desktop-01-hero.png) · [clubul](ro-desktop-02-clubul.png) · [liga](ro-desktop-03-liga.png) · [locație](ro-desktop-04-locatie.png) · [lista de așteptare](ro-desktop-05-lista.png)
- Română, mobil: [deschidere](ro-mobil-01-hero.png) · [clubul](ro-mobil-02-clubul.png) · [liga](ro-mobil-03-liga.png) · [locație](ro-mobil-04-locatie.png) · [lista](ro-mobil-05-lista.png)
- Engleză: [desktop](en-desktop-01-hero.png) · [mobil](en-mobil-01-hero.png)

## Ce lipsește pentru publicare (nu pentru aprobare)
1. **Datele firmei (Q26)**, pentru nota de informare.
2. **Domeniul (Q39)**, pentru adresa site-ului și a expeditorului emailurilor.
3. **Furnizorul de email (Q24)**, pentru trimiterea reală a emailurilor.
4. **Serverul (Q22/Q40)**, pentru găzduire. Imaginile Docker sunt pregătite, dar nu au putut fi testate aici; le verificăm pe server.
