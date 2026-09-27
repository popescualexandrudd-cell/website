# Raport de verificare — Etapa 1B (pagina de pre-lansare), revizia 3 „Noapte și alamă”

> Data: 27.09.2026. Branch: `claude/hopeful-euler-rguibn`. Starea: **livrată, așteaptă aprobarea proprietarului.**

## Revizia 3 (27.09.2026): ce s-a schimbat
- **Identitatea B4 „Noapte și alamă”,** aleasă de proprietar de pe pânza de design, dintre 3 direcții și 6 variante de paletă:
  - bleumarin de noapte, alamă, os și verde de pădure;
  - titluri Fraunces, text Instrument Sans.
  - Descriere: [05-identitate-provizorie-noapte-si-alama.md](../../../12-branding/05-identitate-provizorie-noapte-si-alama.md).
- **Arena 3D refăcută după schița clubului:**
  - 4 terenuri în pătrat (2 × 2);
  - vederea de pe pasarela-lounge de la 3 m, dintre rânduri, seara.
- **Planul clubului în secțiunea Locație:** o schemă desenată de noi după schiță, fără scară și fără parkour (ascuns la lansare).
- **Textele RO/EN actualizate:** pasarela dintre terenuri, cafeneaua de la parter cu scara spre lounge, pilates și evenimente în clădirea de alături.
- **Rezultate:**
  - toate testele trec (131 backend, 173 ligă, 26 cap-coadă, cu verificarea automată de accesibilitate axe pe tema întunecată);
  - Lighthouse: mobil **94 / 100 / 100 / 100**, desktop **100 / 100 / 100 / 100**.

Restul raportului descrie revizia 2. Funcțiile descrise acolo au rămas aceleași; s-a schimbat doar aspectul.

---

## Ce s-a construit
| Ce | Detalii |
|---|---|
| Identitatea „Premium Light” | Fundal deschis, bleumarin profund, smarald matur, accente metalice, fontul Inter. Descriere: [04-identitate-provizorie-premium-light.md](../../../12-branding/04-identitate-provizorie-premium-light.md). |
| Povestea paginii (RO + EN) | 1. Deschiderea: vederea din lounge-ul suspendat la 3 m, randare 3D în care privirea coboară spre terenuri la derulare. 2. **Arena**: 4 terenuri, cifre reale. 3. **Ecosistemul**: rezervare → card digital → check-in → joc → scor confirmat → plată → ieșire. 4. **Facilități integrate**: vestiare, Pilates Reformer, sală de evenimente, cafenea și lounge. 5. **Liga și cardurile de statut**: card de membru 3D metalic, Argint → Aur → Platină → Diamant. 6. **Locație**. 7. **Lista de așteptare**. |
| Randări proprii | Scene 3D cu materiale fizice (sticlă, oțel, metal lăcuit) și reflexii de lumină. Pentru fiecare există o imagine statică generată de noi, cu text alternativ. **Nicio imagine cumpărată, nicio componentă sau serviciu extern** pe pagină (fără hărți încorporate, fonturi externe, widget-uri). |
| Minimizarea datelor | Formularul cere doar **numele, emailul și, opțional, nivelul de joc**. Telefonul și interesele au fost scoase și din baza de date. |
| Pagini legale | Termeni și condiții, Politica de confidențialitate, Politica de anulare și rambursare, Politica de cookies, Nota de informare, în română și engleză ([texte/](../../../07-securitate-gdpr-legal/texte/)). Redactate de noi, fără avocat (Q41). |
| Cookies | Gestionar propriu: înainte de alegere rulează doar ce e strict necesar. Statisticile pornesc doar după „Accept statisticile”. „Doar cookies necesare” are aceeași greutate vizuală. Alegerea se schimbă oricând din subsol („Setări cookies”). |
| Subsolul | Datele de identificare ale firmei (denumire, CUI, Nr. Registrul Comerțului, sediu, telefon, email), luate din configurarea din admin. Până le primim (Q26) scrie „în curs de completare”. Tot aici: linkurile legale și linkul **ANPC — Soluționarea alternativă a litigiilor (SAL)**. |
| Accesibilitate | Contrast AAA pentru text, focus vizibil la tastatură, legătura „Sari la conținut”, etichete explicite pe butoane („Înscrie-te pe lista de așteptare”, „Confirmă dezabonarea”), meniu pe mobil, pagină completă și statică pentru „mișcare redusă”. |

## Rezultate
| Verificare | Rezultat |
|---|---|
| Teste backend | 131, toate trec (acoperire 97%) |
| Teste unitare site + tokeni | toate trec (acordul pentru cookies, fapte afișate, contrast AAA/AA) |
| Teste cap-coadă (Playwright, desktop + mobil) | 26 trec. Acoperă: pagina RO/EN, text alternativ pe randări, tastatura, carduri pe niveluri, subsolul cu datele firmei și ANPC, înscrierea cu 3 câmpuri → confirmare → dezabonare, acordul obligatoriu, cele 10 pagini legale, cookies (nimic înainte de alegere, statistici doar după „Accept”, retragerea acordului), mișcare redusă, meniul pe mobil, sitemap/robots. 2 teste se sar intenționat: tastatura pe telefon și meniul mobil pe desktop. |
| Accesibilitate automată (axe, WCAG 2.2 AA) | 0 probleme grave (pagina principală și paginile legale) |
| Lighthouse mobil | **Performanță 94 · Accesibilitate 100 · Bune practici 100 · SEO 100** (revizia 3, [raport](lighthouse-mobil.html)) |
| Lighthouse desktop | **100 · 100 · 100 · 100** ([raport](lighthouse-desktop.html)) |
| ESLint, TypeScript strict, ruff, mypy strict | 0 probleme |

Lighthouse a fost rulat pe build-ul de producție, cu indexarea pornită, ca în producție. Pe mobil, cel mai mare element afișat (LCP) apare la 2,9 s în simularea de rețea mobilă lentă. Ținta din §9.4 este sub 2,5 s. Pe un telefon real cu 4G bun pagina apare mai repede; măsurăm din nou pe serverul real (Etapa 14).

## Dubla revizuire: probleme găsite și reparate
1. **Linkurile din texte se distingeau doar prin culoare** (WCAG 1.4.1). Acum sunt subliniate peste tot.
2. **Termenii trimiteau spre o adresă greșită** a politicii de rambursare. Reparat în text.
3. **Biblioteca 3D se descărca și pe telefoanele fără placă video**, apoi nu era folosită. Acum placa video se verifică înainte, iar performanța pe mobil a crescut de la 86 la 95.
4. **Textul din deschidere se citea greu** peste liniile terenurilor. Am pus un voal deschis în spatele lui.
5. **Titlul secțiunii „Cum funcționează” rămânea uneori invizibil** (animația de apariție pe un element fix la derulare). Titlul nu mai are animație.
6. **Logo-ul se rupea pe două rânduri** pe telefoane. Reparat.
7. **Din perspectiva unui atacator:**
   - Textele legale se afișează fără HTML brut, iar linkurile periculoase sunt filtrate.
   - Datele firmei sunt afișate ca text simplu.
   - Cookie-ul de acord e citit cu validare: o valoare stricată înseamnă „întreabă din nou”.
   - Statisticile nu se pot porni fără acord, iar adresa lor vine doar din configurarea serverului.

## Capturi de ecran (scena 3D forțată, date reale ale clubului)
- Română, desktop:
  - [bannerul de cookies](ro-desktop-00-banner-cookies.png)
  - [deschidere](ro-desktop-01-hero.png)
  - [arena](ro-desktop-02-arena.png)
  - [ecosistem](ro-desktop-03-ecosistem.png)
  - [facilități](ro-desktop-04-facilitati.png)
  - [liga și cardul](ro-desktop-05-liga.png)
  - [locație](ro-desktop-06-locatie.png)
  - [lista de așteptare](ro-desktop-07-lista.png)
  - [subsol](ro-desktop-08-subsol.png)
- Română, mobil: aceleași capturi, cu numele `ro-mobil-…` (de exemplu [deschidere](ro-mobil-01-hero.png), [liga](ro-mobil-05-liga.png)).
- Engleză:
  - desktop: [cookies](en-desktop-00-banner-cookies.png), [deschidere](en-desktop-01-hero.png)
  - mobil: [cookies](en-mobil-00-banner-cookies.png), [deschidere](en-mobil-01-hero.png)

## Note importante
- **Platforma europeană SOL/ODR a fost închisă** în iulie 2025 (Regulamentul (UE) 2024/3228). De aceea, subsolul trimite la pagina ANPC despre **SAL** (soluționarea alternativă a litigiilor), singura cale valabilă acum.
- **Randări fotorealiste pentru vestiare, pilates, sala de evenimente și cafenea:** nu le-am inventat. Le facem după proiectul de arhitectură (**Q44**); până atunci, grila de facilități are pictograme și o notă.
- Dispunerea terenurilor din scena 3D este **ilustrativă** și este marcată ca atare pe pagină.

## Ce lipsește pentru publicare (nu pentru aprobare)
1. **Datele firmei (Q26):** pentru subsol și textele legale. Sistemul refuză publicarea textelor care mai conțin `DE_CONFIRMAT`.
2. **Domeniul (Q39):** pentru adresa site-ului și a expeditorului emailurilor.
3. **Furnizorul de email (Q24):** pentru trimiterea reală a emailurilor.
4. **Serverul (Q22/Q40):** pentru găzduire.
