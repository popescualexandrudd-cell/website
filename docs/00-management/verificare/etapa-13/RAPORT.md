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
