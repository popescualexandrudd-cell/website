# Raport de verificare — Etapa 1A (fundația backend)

> Data: 27.09.2026. Branch: `claude/hopeful-euler-rguibn`. Starea: **livrată, așteaptă aprobarea proprietarului.**

## Ce s-a construit (în cuvinte simple)
Fundația pe care stă tot sistemul: „creierul” central (backend-ul) și baza de date. Încă nu există pagini pentru clienți (acestea vin în Etapa 1B și 11), dar tot ce e dedesubt funcționează și e testat:

| Funcție | Ce înseamnă | Reguli |
|---|---|---|
| Conturi | Înregistrare cu email, telefon, data nașterii și limba; acceptarea termenilor și a politicii de confidențialitate (cu versiunea și amprenta textului); email de confirmare; resetarea parolei. | R-001, R-002, R-011 |
| Conturi rapide pentru invitați | Recepția creează un cont din nume, telefon și email; clientul primește un link ca să-și aleagă parola. | Q8 |
| Conturi de copii | Un părinte adult creează cont pentru copil (sub 18 ani). Funcția este pregătită, dar **oprită** până o activezi. | Q7 |
| Roluri | Admin, Manager, Recepție, Antrenor; un rol poate fi valabil pentru toate locațiile sau doar pentru una. | §8.1, Q37 |
| Autentificare în doi pași (2FA) | Obligatorie pentru tot personalul: parola + codul de 6 cifre din telefon (sau un cod de recuperare). Un cod nu poate fi folosit de două ori. | §12.1 |
| Blocare temporară | După 5 parole greșite, contul se blochează 15 minute; limite și pe adresa IP. | §12.1 |
| Locații și resurse | Jungle Padel cu 4 terenuri de padel, sala de pilates cu 6 aparate Reformer (4 active), sala de evenimente (20 de persoane). Se pot adăuga locații noi (de exemplu Tenis Elite) și resurse noi **fără programare**. | §2.2, Q20, R-100 |
| Jurnal de audit | Orice modificare importantă este scrisă într-un jurnal pe care **nimeni nu îl poate modifica sau șterge** (nici măcar direct din baza de date). | §8.1, R-004 |
| Comutatoare (feature flags) | Parkour, WhatsApp, POS, Apple Wallet etc. se pornesc și se opresc din admin, fără programare. | ADR-0022 |
| „Ce mai trebuie confirmat” | Lista valorilor încă nedecise (datele firmei, domeniul, vârsta minimă), cu numărul întrebării. | ADR-0022 |
| Dispozitive | Chioșcurile și ecranele se înregistrează în sistem (conectarea lor vine în Etapa 7). | ADR-0012 |
| Admin de urgență | Pagină tehnică doar pentru rolul Admin, doar cu 2FA; orice modificare făcută acolo intră în jurnalul de audit. | §8.6 |
| Traduceri | Toate mesajele de eroare există în română și engleză; un test oprește livrarea dacă lipsește vreo traducere. | R-140 |

## Rezultatele verificărilor automate (`scripts/test-all`)
| Verificare | Rezultat |
|---|---|
| Teste backend | **109 teste, toate trec** |
| Acoperirea codului de teste (pe ramuri) | **97%** (prag minim: 95%) |
| Stil și erori de cod (ruff) | 0 probleme |
| Verificarea tipurilor (mypy, mod strict) | 0 probleme |
| Migrațiile bazei de date sunt la zi | da |
| Clientul API TypeScript este generat din versiunea curentă a API-ului | da |
| Verificarea tipurilor TypeScript | 0 probleme |
| Traduceri RO/EN complete | da |

## Dubla revizuire
1. **Fluxul unui client real** (înregistrare → email → confirmare → login → schimbare profil → parolă uitată), fiecare pas cu test automat, inclusiv erorile: email invalid sau deja folosit, telefon invalid, parolă slabă, link expirat sau deja folosit.
2. **Perspectiva unui atacator și cazurile-limită.** Am verificat:
   - ghicirea parolelor (blocare temporară pe cont și pe adresa IP);
   - reutilizarea unui cod 2FA;
   - crearea de conturi în masă (**limită adăugată la revizuire: 10 înregistrări pe oră de pe aceeași adresă IP**);
   - aflarea dacă un email are cont (resetarea parolei răspunde la fel în ambele cazuri);
   - cereri trimise din alt site (protecție CSRF);
   - modificarea jurnalului de audit (refuzată de baza de date);
   - eliminarea ultimului Admin (refuzată);
   - acces fără 2FA la funcțiile personalului (refuzat).

**Probleme găsite și reparate la revizuire:**
- un link de resetare a parolei cu un format greșit producea o eroare internă a serverului; acum primește mesajul normal „link invalid”;
- pagina de login a adminului de urgență nu afișa câmpul pentru codul 2FA; am adăugat câmpul și un test care verifică afișarea lui.

## Capturi de ecran (date DEMO)
1. [Login în adminul de urgență, cu cod 2FA](01-login-admin-cu-2fa.png)
2. [Pagina principală a adminului](02-admin-pagina-principala.png)
3. [Resursele Jungle Padel](03-resurse-jungle-padel.png) — Reformer 5 și 6 sunt inactive
4. [Utilizatorii demo](04-utilizatori-demo.png), inclusiv numele cerute în §8.5
5. [Comutatoarele de funcții (feature flags)](05-feature-flags.png)
6. [Jurnalul de audit](06-jurnal-audit.png)

## Ce NU conține Etapa 1A (în mod intenționat)
- Pagini pentru clienți: vin în Etapa 1B (pre-lansare) și în Etapa 11 (website-ul complet).
- Panoul de admin complet: vine în Etapa 10. Până atunci există doar adminul tehnic de urgență.
- Poza opțională de profil (R-002) și schimbarea adresei de email: se adaugă odată cu zona de cont (Etapa 11).
- Textele legale reale: înscrierea online e blocată până când se publică textele reale. Le redactez în Etapa 1B, conform Q41, dar au nevoie și de datele firmei (Q26).
- Rularea în Docker nu a putut fi testată în acest mediu (Docker nu rulează aici). Fișierele sunt pregătite și vor fi verificate pe server în Etapa 14.
