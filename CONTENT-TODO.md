# Ce mai ai de completat

Tot ce apare pe site ca **[DE COMPLETAT]** e o informație pe care nu am inventat-o: trebuie să vină de
la tine. Poți completa în două feluri:

- **înainte de prima pornire**, în `config/antrenor.yml` (se încarcă automat la prima pornire pe
  server, sau local cu `npm run db:reset`);
- **oricând după aceea, din panoul de administrare** (`/admin`). Tabloul de bord îți arată câte
  texte mai sunt marcate, iar în Conținut fiecare listă are eticheta „de completat” la elementele
  neterminate.

Coloana „În admin” spune unde găsești fiecare lucru.

## 1. Date despre tine

| Ce | Unde apare | În admin | În `antrenor.yml` |
| --- | --- | --- | --- |
| Numele tău | antet, pagina Despre, prima scenă, emailuri, date structurate Google | Setări → Numele afișat; Conținut → Profilul antrenorului → Nume | `antrenor.nume` |
| Inițialele (monograma) | antet | Setări → Monograma | se calculează din nume |
| Anii de experiență | pagina Despre | Conținut → Profilul antrenorului | `antrenor.ani_experienta` |
| Parcursul tău (3–5 fraze) | pagina Despre | Conținut → Profilul antrenorului → Parcursul tău | `antrenor.parcurs` |
| Certificările: denumirea exactă, emitentul, anul (2 intrări) | pagina Despre | Conținut → Certificări și diplome | `antrenor.certificari` |
| Rezultate ale elevilor (opțional, doar reale și cu acordul lor) | pagina Despre | Conținut → Profilul antrenorului | `antrenor.rezultate_elevi` |
| Fotografia ta | pagina Despre | Conținut → Profilul antrenorului → Fotografia ta | — |
| Textul primei scene („[nume], antrenor de tenis… la [localitate]”) | pagina principală, scena 1 | Conținut → Scenele paginii principale → Deschiderea | se completează din nume și localitate |

## 2. Contact

| Ce | În admin | În `antrenor.yml` |
| --- | --- | --- |
| Telefon | Setări → Contact | `contact.telefon` |
| WhatsApp (doar cifre, cu 40 în față) | Setări → Contact | `contact.whatsapp` |
| Email (primești și notificările) | Setări → Contact | `contact.email` |
| Instagram, Facebook, TikTok (opțional) | Setări → Contact | `contact.instagram` etc. |

## 3. Locația și terenurile

| Ce | În admin | În `antrenor.yml` |
| --- | --- | --- |
| Numele bazei sportive, adresa, localitatea | Conținut → Locații | `locatii[].nume`, `adresa`, `localitate` |
| Coordonatele pentru hartă (latitudine, longitudine) | Conținut → Locații | `locatii[].coordonate` |
| Cum ajungi (parcare, transport) | Conținut → Locații → Cum ajungi | — |
| Numărul de terenuri pe zgură și pe hard | Conținut → Terenuri | `terenuri[].numar` |
| Acoperit iarna (da/nu), nocturnă (da/nu), pentru fiecare tip | Conținut → Terenuri | `acoperit_iarna`, `nocturna` |
| A patra dotare a bazei (în listă apare „[altele]”) | Conținut → Facilități și servicii | `dotari` |
| Racordare rachete: confirmă că o oferi și descrie serviciul, sau șterge-l | Conținut → Facilități și servicii | `servicii_incluse` |
| Pregătire și însoțire la turnee: la fel | Conținut → Facilități și servicii | `servicii_incluse` |

## 4. Prețuri și program

| Ce | În admin | În `antrenor.yml` |
| --- | --- | --- |
| Prețul pentru fiecare program (8 programe: lecție individuală, lecție în doi / persoană, mini-tenis / lună, grupe copii și juniori / lună, adulți începători / lună, performanță, analiză video, tabere) | Conținut → Prețuri și pachete | `programe[].pret_ron`, `pret_ron_persoana`, `pret_ron_luna` |
| Pachetele: numele (ex. „5 lecții individuale”), prețul, numărul de lecții | Conținut → Prețuri și pachete | `pachete` |
| Tabere și clinici: durata și numărul maxim de participanți | Conținut → Programe → Tabere și clinici de weekend | `programe[]` |
| Oferta pentru prima lecție (ex. „evaluare de 30 de minute, gratuită”) | Setări → Rezervări → Oferta pentru prima lecție | `rezervari.prima_lectie` |
| **Orarul grupelor** (zi, oră, capacitate, membri deja înscriși). Cel din site e o propunere, în programul tău de lucru | Conținut → Orarul grupelor | — |
| **Disponibilitatea pentru elevi noi**. Acum e tot programul de lucru (07–21), deci „Locuri libere” arată un număr mare. Setează doar intervalele libere pentru rezervări | Disponibilitate | — |

## 5. Întrebări frecvente

Două răspunsuri depind de situația ta:

| Întrebare | În admin |
| --- | --- |
| „Se face tenis și iarna?” (depinde dacă terenurile sunt acoperite) | Conținut → Întrebări frecvente |
| „Pregătiți jucători pentru turnee?” | Conținut → Întrebări frecvente |

## 6. Date legale și paginile legale

| Ce | Unde apare | În admin |
| --- | --- | --- |
| Forma de organizare (PFA, SRL, club), denumirea legală, CUI, nr. Registrul Comerțului, sediul | subsol, termeni, confidențialitate | Setări → Date legale |
| Furnizorul serverului și furnizorul de email (numele firmelor) | Politica de confidențialitate | Conținut → Pagini legale → Confidențialitate |
| Dacă un adult trebuie să rămână la bază în timpul lecțiilor copiilor mici | Termeni și condiții | Conținut → Pagini legale → Termeni |
| **Verificarea de către un jurist** a celor trei pagini legale (sunt ciorne), apoi bifa „verificat” | tablou de bord (avertisment) | Conținut → Pagini legale |

## 7. Titlul și descrierea pentru Google

„Antrenor de tenis în [localitate]: lecții pentru copii și adulți” și descrierea conțin localitatea
și baza sportivă. Le completezi în Setări → Motoare de căutare (română și engleză).

## 8. Imagini și fotografii

| Ce | Detalii |
| --- | --- |
| **Picturile finale** pentru cele 10 scene, 6 programe, textura de pergament și 5 nori | Prompturile, numele fișierelor, dimensiunile și punctele focale: `docs/DIRECTIE-ARTISTICA.md`. Până atunci, site-ul folosește compozițiile provizorii. |
| Fotografia ta (portret) | Conținut → Profilul antrenorului |
| Fotografii pentru galerie (lecții, grupe, turnee, terenuri) | Conținut → Galerie. Cele cu copii doar cu acordul scris al părinților. |
| Opțional: fotografii pentru programe, facilități, articole | câmpul „Fotografie” din fiecare |

## 9. Recenzii și articole

| Ce | Detalii |
| --- | --- |
| **Recenzii reale** | Cele 3 recenzii din admin sunt marcate „[EXEMPLU]” și nu apar pe site. Înlocuiește-le cu recenzii reale, cu acordul autorului, sau șterge-le. După fiecare lecție efectuată, clientul primește automat invitația să lase o recenzie; o publici tu din Conținut → Recenzii. |
| **Articolele din Sfaturi** | 3 articole sunt scrise ca ciorne (nu apar pe site). Citește-le, adaptează-le la stilul tău și publică-le din Conținut → Articole. |

## 10. Pe server

| Ce | Unde |
| --- | --- |
| Domeniul și serverul | `DEPLOY.md`, pașii 1–3 |
| Datele de email (SMTP) și adresa pentru notificări | `.env`, `DEPLOY.md` pasul 7 |
| Opțional: Umami, Turnstile, backup în afara serverului | `DEPLOY.md`, secțiunile 12–13 |
