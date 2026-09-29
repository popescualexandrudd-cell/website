# Raport de verificare — Etapa 11 (site-ul complet, secțiune cu secțiune)

> Branch: `claude/hopeful-euler-rguibn`. Site-ul complet se livrează **secțiune cu secțiune** (§9.2), fiecare cu aprobarea dumneavoastră. Acest raport crește cu fiecare secțiune.

| Secțiune (§9.2) | Livrată | Starea |
|---|---|---|
| Fundația site-ului complet + **1. Antetul fix** | 29.09.2026 | **așteaptă aprobarea** |
| 2. Hero „Intră în junglă” | — | urmează, după aprobarea secțiunii 1 |
| 3–19 | — | mai târziu, câte una |

---

## Secțiunea 1 — Antetul fix (și fundația site-ului complet)

### Ce s-a construit

**1. Comutatorul site-ului complet (Q57).** Site-ul complet stă ascuns până îl porniți dumneavoastră:
- Cât timp comutatorul `full_site` e **oprit** (acum), vizitatorii văd exact pagina de pre-lansare aprobată în Etapa 1B, cu lista de așteptare. Paginile noi nu există pentru ei („pagină negăsită”) și nu apar în Google.
- Îl porniți din panoul de admin: **Setări și feature flags** → `full_site` → Pornit, cu un motiv. Site-ul se schimbă **în câteva secunde**: serverul îi cere site-ului să se reîmprospăteze (o adresă protejată cu o parolă comună, păstrată doar în `.env` pe server). Dacă acel semnal se pierde, site-ul se actualizează singur în cel mult 5 minute.
- Oprirea funcționează la fel: site-ul revine la pagina de pre-lansare.

**2. Antetul fix (§9.2, secțiunea 1)**, sus pe fiecare pagină a site-ului complet:
- **logo-ul** (duce la pagina principală);
- **meniul**: Padel · Liga · Tenis · Pilates · Pachete · Evenimente · Cafenea · Contact; pagina pe care vă aflați e marcată;
- **limba**: RO / EN, rămâneți pe aceeași pagină (de exemplu `/ro/liga` ↔ `/en/league`);
- **contul** („Contul meu”);
- butonul **„Rezervă”**, mereu vizibil, și pe telefon.

Pe ecrane mai înguste de 1280 px (telefon, tabletă, laptop mic), meniul se strânge într-un buton **„Meniu”**. Lista se deschide sub antet, cu limba și contul dedesubt; se închide cu „Închide”, cu tasta Escape sau alegând o pagină.

**3. Adresele paginilor, în fiecare limbă** (§9.3): `/ro/padel`, `/ro/liga`, `/ro/tenis`, `/ro/pilates`, `/ro/pachete`, `/ro/evenimente`, `/ro/cafenea`, `/ro/contact`, `/ro/rezervari`, `/ro/cont` și echivalentele în engleză (`/en/league`, `/en/packages`, `/en/bookings`, `/en/account` …).
- Deocamdată fiecare pagină spune „În construcție”: se construiește după secțiunile paginii principale.
- Paginile sunt marcate să nu apară în Google până sunt gata.

**4. Pagina principală a site-ului complet** arată, până vin secțiunile, **harta celor 19 secțiuni**: ce e gata (1 din 19), ce urmează (Hero-ul) și ce vine mai târziu. E o previzualizare internă, pentru dumneavoastră. Vizitatorii n-o văd cât timp comutatorul e oprit.

### Capturi de ecran (făcute de testele automate)
1. [Antetul pe calculator](ecrane/desktop-01-antet.png): meniul întreg, limba, contul, „Rezervă”; sub el, harta secțiunilor.
2. [Antetul pe telefon](ecrane/mobile-01-antet.png): logo, „Rezervă” și butonul „Meniu”.
3. [Meniul deschis pe telefon](ecrane/mobile-02-meniu-deschis.png): lista paginilor, apoi limba și contul.

### Rezultate
| Verificare | Rezultat |
|---|---|
| Comutatorul și reîmprospătarea (server) | 6 teste noi: semnalul pleacă doar după salvarea în baza de date, doar cu adresa și parola configurate; o eroare de rețea nu strică salvarea; schimbarea comutatorului de pe server (`manage.py set_flag`) intră în jurnalul de audit, cu motiv |
| Site, teste unitare | 5 teste noi: modul site-ului e „complet” doar dacă serverul spune clar „pornit” (orice eroare = pre-lansare); adresa de reîmprospătare refuză o parolă greșită sau lipsă și orice etichetă necunoscută |
| Cap-coadă, înainte de pornire | toate testele paginii de pre-lansare trec ca înainte (28 de rulări, calculator + telefon); paginile noi răspund „negăsită” |
| Cap-coadă, după pornire | comutatorul pornit de pe server, apoi 7 teste (11 rulări, calculator + telefon): antetul și harta, o pagină din meniu în română și apoi în engleză, „Rezervă” și contul, **nicio lățime de ecran între 320 și 1440 px nu iese din ecran** (WCAG 1.4.10), meniul de pe telefon (Escape, focusul înapoi pe buton), ordinea tastaturii (WCAG 2.4.3), refuzul reîmprospătării fără parolă. Accesibilitatea verificată cu axe pe fiecare pagină |
| Toate verificările proiectului (`scripts/test-all`) | trec înainte de orice push |

### Dubla revizuire: probleme găsite și reparate
1. **Pe telefon, limba și contul stăteau lângă listă**, nu sub ea (o regulă de aranjare a antetului se aplica și în panoul meniului). Reparat și testat.
2. **Între 1024 și 1279 px, meniul întreg se lovea de butoane.** Pragul la care apare meniul întreg e acum 1280 px, testat la fiecare lățime.
3. **Pe un telefon foarte îngust (320 px), harta secțiunilor ieșea din ecran cu 20 px** (găsit de testul pe toate lățimile). Coloanele ei nu mai sunt niciodată mai late decât ecranul.
4. **O memorie a site-ului de la o rulare anterioară** (comutatorul pornit) putea ajunge într-o construcție nouă. Testele o șterg înainte de fiecare construcție. Imaginile Docker nu mai primesc nimic construit local (nici fișiere `.env`), printr-un fișier `.dockerignore` nou.
5. **Din perspectiva unui atacator:**
   - adresa de reîmprospătare nu face nimic fără parola comună (comparată în timp constant) și acceptă doar etichetele cunoscute;
   - fără parolă configurată, adresa nu există (răspunde „negăsită”);
   - comutatorul îl schimbă doar un admin, din panou, sau cineva cu acces la server; de fiecare dată cu motiv, în jurnalul de audit.

### Ce e de hotărât
| Întrebare | Varianta folosită până la răspuns |
|---|---|
| **Q57** (nouă): când apare site-ul complet | rămâne ascuns (comutatorul `full_site` oprit); îl porniți dumneavoastră din panou, când hotărâți |

### Cum verificați (click cu click)
1. Pe GitHub, branch-ul `claude/hopeful-euler-rguibn`, deschideți acest raport (`docs/00-management/verificare/etapa-11/RAPORT.md`).
2. Deschideți cele 3 capturi, în ordine: pe calculator meniul e întreg, pe telefon se strânge în „Meniu”.
3. În captura 1: harta arată „Antetul fix” ca gata și „Hero «Intră în junglă»” ca următoarea secțiune.
4. Citiți **Q57** în [INTREBARI_DESCHISE.md](../../INTREBARI_DESCHISE.md) și spuneți-ne când vreți să apară site-ul complet.
5. Dacă antetul vă place, scrieți „aprob secțiunea 1”. Dacă vreți altceva (ordinea meniului, textul butonului), spuneți ce anume.
