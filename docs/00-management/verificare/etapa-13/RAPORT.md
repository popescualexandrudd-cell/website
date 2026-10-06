# Etapa 13 — SEO, conținut, marketing, branding, vânzări: raport

## Faza 13A — SEO tehnic (§15.1), 06.10.2026

### Ce s-a construit
1. **Sitemap-ul** (`/sitemap.xml`):
   - înainte de lansare: pagina principală și textele juridice, ca până acum;
   - cu site-ul complet pornit: și paginile Padel, Liga, Tenis, Pilates, Pachete, Evenimente, Cafenea, Contact, Pentru firme, Despre, Blog, Rezervări și articolele reale ale blogului (cu data ultimei schimbări);
   - fiecare adresă are și perechea ei în cealaltă limbă (hreflang);
   - contul, pagina „offline” și articolele demo nu sunt oferite motoarelor de căutare.
2. **Datele pentru Google (schema.org)**, doar cu fapte pe care site-ul le arată deja:
   - **clubul** (`SportsActivityLocation`): numele, adresa, programul zilnic 08:00–23:00 (Q3), sporturile; telefonul, doar dacă e completat în panou;
   - **întrebările frecvente** (`FAQPage`);
   - **evenimentele din calendar** (`Event`): doar cele reale, iar cele anulate sunt marcate „anulat”; evenimentele demo nu apar (invariantul 12);
   - **calea paginii** (`BreadcrumbList`) pe paginile de prezentare;
   - fără prețuri (DE_STABILIT) și fără recenzii.
3. **Titlul și descrierea site-ului complet:** cele de până acum invitau la lista de așteptare (pagina de pre-lansare). Site-ul complet are acum titlul și descrierea lui, editabile din „Conținutul site-ului” (grupul SEO).
4. **Paginile de eroare:**
   - **404:** spune ce s-a întâmplat și duce mai departe: pagina principală și, cu site-ul complet pornit, Rezervări, Liga și Contact;
   - **eroare de server:** „Ceva n-a mers”, cu butonul „Încearcă din nou” și linkul spre pagina principală. Detaliile erorii nu se arată vizitatorului.

### Rezultate
| Verificare | Rezultat |
|---|---|
| Teste pe site (unitare) | 6 noi: datele clubului (cu și fără telefon), întrebările, evenimentele (fără demo, anulate marcate, limba paginii), calea paginii, textul scriptului care nu poate închide eticheta; sitemap-ul înainte și după lansare (fără cont și fără articole demo). |
| Cap-coadă (site-ul complet) | Nou: datele schema.org pe pagina principală și pe o pagină de prezentare; sitemap-ul cu ambele limbi; titlul și descrierea site-ului complet; pagina 404 utilă, cu verificarea de accesibilitate. |

### Cum verificați
1. Cu site-ul complet pornit: deschideți `/sitemap.xml`; apar paginile clubului, fiecare cu perechea ei în engleză.
2. Pe pagina principală, testul Google „Rich Results” (după lansare, pe domeniul real) găsește clubul și întrebările frecvente.
3. O adresă greșită (de exemplu `/ro/pagina-care-nu-exista`) arată pagina 404, cu linkuri spre restul site-ului.

## Faza 13B — SEO de conținut și local (§15.2), 06.10.2026

### Ce s-a construit
1. **Cinci ghiduri pentru blog, în română și engleză,** scrise doar cu fapte sigure:
   - „Ce este padelul”;
   - „Regulile padelului” (cu „Star Point”, regula oficială FIP din 2026, verificată în Etapa 2);
   - „Echipamentul de padel”;
   - „Padel sau tenis?”;
   - „Cum funcționează Liga Jungle” (din `docs/03-liga`).

   Toate sunt marcate „de revizuit de club” și **nu sunt publicate**. Comanda `manage.py blog_guides` le pune în blog ca ciorne: le citiți, le corectați și le publicați din panou (modulul Blog). Comanda nu suprascrie un articol cu aceeași adresă, deci corecturile dumneavoastră rămân.
2. **Harta cuvintelor-cheie pe pagini** (`docs/10-seo/03-harta-cuvintelor-cheie.md`): un subiect principal pe pagină, în ambele limbi. Volumele de căutare se măsoară după lansare, în Google Search Console.
3. **Calendarul editorial** (`docs/10-seo/04-calendar-editorial.md`): câte un ghid pe lună până la inaugurare, apoi rezultatele ligii și noutățile clubului (DE_CONFIRMAT).
4. **Google Business Profile, NAP și citări locale** (`docs/10-seo/05-google-business-profile-si-nap.md`):
   - numele, adresa, telefonul și programul, identice peste tot, din panou;
   - categoriile, descrierea fără prețuri, fotografiile doar reale, recenziile cerute corect;
   - lista citărilor de făcut după lansare.
5. **Corecturi pe drum:**
   - datele schema.org ale clubului nu mai spun „Tennis”: terenul de tenis de la Jungle Padel e încă nedecis (§2.2);
   - o adresă inexistentă ajunge acum la pagina 404 utilă a site-ului, în limba ei, nu la pagina goală implicită.

### Rezultate
| Verificare | Rezultat |
|---|---|
| Teste backend (`jungle/blog`, 100% pe ramuri) | 3 noi: fiecare ghid e complet în ambele limbi (titlu, rezumat, text, mențiunea „de revizuit”, fără HTML sau tabele); comanda le adaugă o singură dată, nepublicate, fără să suprascrie o corectură; un ghid stricat e refuzat. |

### Cum verificați
1. Pe server: `uv run python apps/backend/manage.py blog_guides`.
2. Panou → **Blog**: cele cinci ghiduri, ca ciorne. Le citiți, corectați ce e nevoie și apăsați „Publică” cu un motiv.

## Faza 13C — Regulamentul public și pagina `/regulament`, 06.10.2026

### Ce s-a construit
1. **Regulamentul clubului**, în română și engleză (`docs/14-regulament-public/`), scris doar din regulile confirmate:
   - programul 08–23 și benzile orare;
   - contul (propriu de la 14 ani) și cardul QR;
   - rezervările: durate, scanarea tuturor jucătorilor, tipul sesiunii;
   - plata: fără credite la padel, ora împărțită la chioșc, numerar și bon fiscal;
   - anularea (24 de ore), neprezentarea (15 minute), blocarea la a treia, lista de așteptare (2 ore după promovare);
   - abonamentele: Start, Activ, Pro, Start fără vârf, fără report, înghețarea 14 zile;
   - Pilates, liga (18+, scorul doar la Chioșcul Ligii), comportamentul.

   Poartă mențiunea Q41 („Redactat fără revizuire juridică…”). Două puncte rămân DE_CONFIRMAT: semi-vârful și regulile de folosire a spațiilor (Q70).
2. **Pagina `/ro/regulament` și `/en/rules`:** documentul nou „rules” (`jungle.legal`), versionat ca textele juridice, în subsolul site-ului și în sitemap. Cât conține `DE_CONFIRMAT`, apare marcat ca demo.

### Cum verificați
1. Subsolul site-ului → „Regulamentul clubului”.
2. Citiți textul și spuneți-ne ce schimbăm (Q70). Cu textul aprobat, îl publicăm definitiv: `manage.py publish_legal_document --kind rules`.

## Faza 13D — Planul de marketing, 06.10.2026

### Ce s-a scris (doar documente, fără cod)
1. **Planul de pre-lansare**, octombrie 2026 – martie 2027 (`docs/11-marketing/02-plan-pre-lansare.md`): ce facem în fiecare lună, unde și ce măsurăm, până la inaugurarea cu DJ și sezonul 0 al ligii.
2. **Calendarul săptămânal de formate** după lansare (`03-formate-saptamanale.md`): liga corporate, Ladies Padel, Americano, clinica tenis → padel, Jungle Night, Padel & Brunch, plus campaniile de reactivare (mementourile din 12E).
3. **KPI** (`04-kpi.md`): fiecare indicator cu definiția lui și locul din panou de unde se citește. Nicio cifră estimată.

Datele, bugetele, partenerii și formatele sunt DE_CONFIRMAT. Q71 (chestionarul NPS) e deschisă.

### Cum verificați
1. Citiți cele trei documente din `docs/11-marketing/`.
2. Spuneți-ne ce formate păstrați și ce date alegeți pentru inaugurare.

## Faza 13E — Branding și vânzări, 06.10.2026

### Ce s-a scris (doar documente, fără cod)
1. **Platforma de brand** (`docs/12-branding/06-platforma-de-brand-propunere.md`):
   - misiunea, promisiunea („Mai mult decât un teren”), valorile, personalitatea și tonul vocii, cu exemple RO/EN;
   - lista de verificare pentru marcă (OSIM, EUIPO, clasele 41, 43, 25) și domeniu; căutările le face proprietarul, noi nu dăm o opinie juridică;
   - 3 brief-uri de logo (monograma, frunza-rachetă, emblema), pe paleta B4;
   - aplicațiile: card, ecrane, semnalistică, merchandise, uniforme, numele terenurilor (Jaguar, Tucan, Gorila, Anaconda, propunere din §3).
2. **Vânzări** (`docs/13-vanzari/`):
   - scripturile pentru recepție și telefon, din regulament (prețurile se citesc doar din panou);
   - prezentarea de 8 slide-uri pentru firme (pachetul Q35, fără prețuri);
   - cele patru secvențe de email, legate de notificările existente; trei mesaje propuse sunt marcate „neconstruit” până la decizie;
   - șase variante de ofertă de lansare, fără sume noi.

Totul e DE_CONFIRMAT.

### Cum verificați
1. Citiți documentele din `docs/12-branding/` (06) și `docs/13-vanzari/` (02–05).
2. Alegeți o direcție de logo și spuneți-ne ce oferte de lansare vreți.

## Etapa 13 completă: ce decide proprietarul
Toate cele cinci faze sunt livrate. Etapa așteaptă aprobarea. Deciziile deschise:
1. **Q70:** textul regulamentului, semi-vârful și regulile pentru vestiare, cafenea și sala de evenimente.
2. **Q71:** chestionarul NPS după primul meci.
3. **Ghidurile blogului:** le citiți în panou → Blog și le publicați pe cele bune.
4. **Planul de marketing și formatele săptămânale:** ce păstrați, ce date alegeți.
5. **Branding:** misiunea, valorile, tonul și o direcție de logo (A, B sau C) pentru designer. Verificarea mărcii și a domeniului o faceți dumneavoastră (Q39).
6. **Vânzări:** scripturile și prezentarea pentru firme; ce oferte de lansare vreți; dacă vreți cele trei mesaje noi propuse.
