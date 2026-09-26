# ADR-0018: Internaționalizare — cataloage comune, coduri de eroare traduse în interfață

- **Stare:** Propus (Etapa 0)
- **Data:** 2026-09-26
- **Legat de:** R-140, §9.3, §13.3, §15.1

## Context
Româna și engleza sunt obligatorii și complete la lansare peste tot (website, cont, chioșcuri, ecrane, emailuri, notificări). Spaniolă, italiană, chineză și alte limbi se adaugă fără cod nou.

## Decizie
1. **`packages/i18n`** este sursa unică a textelor de interfață pentru toate aplicațiile: câte un fișier JSON pe limbă, format **ICU MessageFormat** (plural, sume, date), chei stabile pe domenii (`booking.*`, `league.*`, `kiosk.*`).
2. Româna este limba de referință; **test automat:** nicio cheie lipsă sau în plus în RO și EN (§13.3).
3. O limbă nouă = un fișier nou în catalog + activarea ei din admin. Traducerile generate cu AI sunt marcate `needsReview` până la aprobarea în admin (R-140).
4. **Conținutul editabil** (pagini CMS, șabloane de notificări și emailuri) stă în baza de date, pe limbă, cu aceeași stare de revizuire.
5. **API-ul nu trimite texte pentru utilizator:** trimite coduri de eroare și parametri, traduse de interfață; emailurile și notificările se compun în backend din șabloanele pe limbă.
6. URL-uri localizate (`/ro/…`, `/en/…`) cu `hreflang` și sitemap pe limbă (§15.1).
7. Formatare cu `Intl`: sume în lei, date și ore în format local, mereu în ora clubului (ADR-0010).

## Alternative analizate
- **Fișiere `.po` Django pentru tot:** nepotrivite pentru frontend-urile TypeScript. Respins ca sursă unică (rămân pentru mesajele tehnice ale adminului Django).
- **Servicii SaaS de traduceri:** dependență de terți. Respins.

## Consecințe
- Fiecare text vizibil are o cheie; testele de completitudine împiedică lansarea cu texte lipsă.
