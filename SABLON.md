# Șablonul pentru o academie de tenis

Site-ul e construit ca șablon: același cod servește orice club sau academie de tenis. Tot ce ține
de club (nume, logo, culori, antrenori, grupe, programe, prețuri, texte, fotografii, video-uri)
stă în baza de date și se editează din admin; nimic nu e scris în cod.

Acest ghid arată cum pregătești site-ul pentru un club nou, de la zero până la prima publicare.

## Ce primește clubul

- **Pagina principală cinematică**: se deschide cu un video real al clubului pe tot ecranul, care
  la derulare se retrage într-un cadru; apoi filozofia în litere mari, cifrele clubului (calculate
  din conținut), programele în carduri care se suprapun la derulare, etapele academiei de
  juniori, echipa, metoda (cu laboratorul tehnic 3D, opțional), baza sportivă, galeria foto și
  video, tipurile de lecții, întrebările și rezervarea.
- **Academia de juniori**: grupe pe vârste și etape (minge roșie, portocalie, verde, galbenă), cu
  program, taxă lunară și locuri; rezultatele la turnee (doar cu acordul părinților); formularul
  prin care părinții cer o evaluare.
- **Echipa de antrenori**: câți antrenori are clubul, fiecare cu pagina lui (parcurs, formare,
  specializări, video), antrenorul principal primul.
- **Galerie foto și video**: video-urile se încarcă din admin și sunt convertite automat pentru web.
- **Rezervări online** cu programe, tipuri de lecții și durată; emailuri, anulare prin link,
  mementouri; panou de administrare complet; SEO, GDPR, accesibilitate WCAG 2.2 AA; română și
  engleză.

## Pasul 1: fișierul clubului

Copiază proiectul și deschide `config/club.yml`. Completezi, de sus în jos:

| Secțiune | Ce scrii |
| --- | --- |
| `club` | numele, monograma (2–3 litere, până încarci logoul), descrierea de sub nume („Academie de tenis”), cele două culori |
| `antrenori` | fiecare antrenor: nume, rol, titulatură, un rezumat, specializări, ani de experiență, certificări, limbi, parcurs. Primul e antrenorul principal |
| `contact` | telefon, email (primește și notificările), opțional WhatsApp și rețelele sociale |
| `locatii` | adresa, codul poștal, județul, terenurile (suprafață, număr, acoperit iarna, nocturnă) și dotările |
| `programe` | care dintre cele trei programe (Inițiere, Competiție, Amatori) le oferă clubul |
| `academie_juniori` | grupele: etapa, vârstele, programul, antrenamentele pe săptămână, durata, zilele și orele, taxa lunară, locurile |
| `lectii`, `pachete` | tipurile de lecții rezervabile online, cu tariful pe oră, și pachetele |
| `program_lucru`, `rezervari`, `plata` | orele în care se primesc rezervări și regulile lor |
| `site`, `entitate_legala` | domeniul, limbile și datele firmei sau ale clubului sportiv |

Orice valoare lăsată între paranteze pătrate apare pe site ca **[DE COMPLETAT]**, ca să nu scape
nimic; nimic nu se inventează în locul ei.

### Culorile

Două culori, în formatul `#rrggbb`:

- **principala** e baza închisă a designului (antet, secțiuni întunecate, subsol): alege un ton
  închis din identitatea clubului (verde, bleumarin, vișiniu închis);
- **accentul** e culoarea butoanelor și a linkurilor: trebuie să rămână lizibilă cu text alb.

Toate celelalte nuanțe se calculează din ele. Din admin, la salvare, site-ul verifică contrastul
(minimum 7:1 pentru culoarea principală și 4,5:1 pentru accent, cu text alb) și refuză o culoare
prea deschisă.

## Pasul 2: baza de date

```bash
npm run db:reset        # creează baza și o completează din config/club.yml
npm run admin:create    # contul de administrator
npm run dev             # http://localhost:3000
```

Pe server, prima pornire face singură acest pas (vezi [`DEPLOY.md`](DEPLOY.md)).

## Pasul 3: fotografiile și video-urile clubului

Din `/admin` → **Media** se încarcă logoul, video-ul de deschidere, fotografiile antrenorilor,
ale programelor, ale grupelor și galeria. Lista completă, cu formatele recomandate, e în
[`CONTENT-TODO.md`](CONTENT-TODO.md), secțiunea 1.

Pentru video-ul de deschidere contează cel mai mult:

- filmat la club, cu antrenamente reale, orizontal, 10–20 de secunde, stabil (trepied sau
  gimbal), la lumină bună;
- fără text sau logo pe imagine (titlul site-ului apare deasupra);
- fără sunet necesar: pe pagina principală video-ul e mut, pornește singur și are buton de pauză.

Conversia (MP4 H.264 la 720p și 1080p, cadru de previzualizare, fără date ascunse) o face serverul
cu **ffmpeg**, în 1–3 minute. Imaginea Docker îl are; local îl instalezi o dată (vezi `FFMPEG_PATH`
în `.env.example`).

## Pasul 4: textele

Textele de pe pagina principală (Conținut → Secțiunile paginii principale), antetele paginilor,
descrierile programelor, întrebările frecvente și paginile legale sunt scrise pentru Elite Tenis
Club. Pentru alt club, citește-le din admin și adaptează-le; paginile legale trebuie verificate de
un jurist.

## Pasul 5: publicarea

Pașii pentru server, domeniu, HTTPS și email sunt în [`DEPLOY.md`](DEPLOY.md). Înainte de
publicare, tabloul de bord din admin arată câte câmpuri mai sunt „de completat”.

## Ce se poate opri

- **Laboratorul tehnic 3D** (Setări → Funcții): pe pagina principală rămân pașii metodei.
- **Versiunea în engleză**, **newsletterul**, **invitațiile la recenzie** (Setări → Funcții).
- Orice secțiune a paginii principale (Conținut → Secțiunile paginii principale → Afișează
  secțiunea), ordinea lor se schimbă prin tragere.
