# Platforma de brand Jungle Padel: propunerea (§15.4)

> Etapa 13E, 06.10.2026. Propunere scrisă de noi pe baza §3 (conceptul) și a identității provizorii „Noapte și alamă” (B4, [05](05-identitate-provizorie-noapte-si-alama.md)). Totul e **DE_CONFIRMAT** de proprietar. Logo-ul final îl alege proprietarul; sistemul se adaptează prin design tokens (`packages/design-tokens`, ADR-0020), fără cod nou.

## 1. Esența
- **Misiunea:** un club în care padelul e motivul să vii, iar seara petrecută acolo e motivul să revii.
- **Promisiunea:** „Mai mult decât un teren.” Joci, bei o cafea, rămâi la o seară cu DJ.
- **Pentru cine:** jucătorii de padel de orice nivel, jucătorii de tenis curioși, cei care vin la Pilates Reformer și firmele din zonă.

## 2. Valorile
| Valoare | Ce înseamnă în club | Cum se vede în sistem |
|---|---|---|
| **Corectitudine** | un clasament în care oricine poate avea încredere | scorul se confirmă doar la Chioșcul Ligii (invariantul 1) |
| **Ospitalitate** | ești primit ca într-un club, nu ca la o casă de bilete | recepția, cafeneaua, ecranele cu numele jucătorilor |
| **Progres** | fiecare meci te duce mai departe | nivelul, rangul și LP-ul, Jungle Report-ul săptămânal |
| **Comunitate** | găsești parteneri pe nivelul tău | potrivirea jucătorilor, Americano, evenimentele |
| **Transparență** | prețul și regulile se știu dinainte | regulamentul public, prețurile afișate, bonul fiscal |

## 3. Personalitatea
Elegant, cald și sigur pe el, ca o gazdă bună. Spune lucrurile direct și nu exagerează. Jungla e atmosfera: verde, lumină, muzică. Nu e un decor de desene animate (B4: „Jungle” spus cu eleganță).

## 4. Tonul vocii
| Facem | Nu facem |
|---|---|
| ne adresăm cu „tu”, prietenos și respectuos | glume pe seama nivelului cuiva |
| propoziții scurte, verbe active („Rezervă”, „Intră în ligă”) | jargon tehnic sau englezisme inutile în română |
| spunem exact ce se întâmplă și ce urmează | promisiuni pe care nu le putem ține (prețuri nestabilite, Q21) |
| cifre doar din sistem | superlative fără acoperire („cel mai bun club din România”) |

**Exemple (RO / EN):**
- Confirmare: „Gata, terenul e al tău. Ne vedem joi la 19:00.” / “Done, the court is yours. See you Thursday at 19:00.”
- Eroare: „Ora asta tocmai s-a ocupat. Uite cele mai apropiate libere.” / “That slot was just taken. Here are the nearest free ones.”
- Liga: „Ai urcat în Aur II. Felicitări pentru meci!” / “You're up to Gold II. Well played!”

În engleză tonul rămâne același, cu formulări firești, nu traduse cuvânt cu cuvânt.

## 5. Marca și domeniul (lista de verificare)
De făcut de proprietar (sau de un consilier în proprietate industrială) **înainte** de logo-ul final și de semnalistică:
1. [ ] Căutare „Jungle Padel” în baza OSIM (marcă națională), clasele 41 (sport, cluburi), 43 (cafenea) și 25 (îmbrăcăminte, pentru merchandise).
2. [ ] Căutare în baza EUIPO (eSearch plus) și TMview, pentru mărci identice sau asemănătoare în UE.
3. [ ] Decizia: marcă națională (OSIM) sau marcă a UE (EUIPO). Verbală, figurativă sau ambele, după alegerea logo-ului.
4. [ ] Verificarea domeniilor (`.ro`, `.com`) și a numelor de cont pe rețelele sociale. Domeniul se înregistrează pe firma clubului.
5. [ ] Firma clubului e titularul mărcii și al domeniului, nu o persoană fizică.

Nu am făcut noi aceste căutări (nu avem acces la bazele oficiale din acest mediu) și nu dăm o opinie juridică.

## 6. Trei direcții de logo (brief-uri)
Fiecare direcție se desenează pe paleta B4. Toate trebuie să funcționeze monocrom, la 16 px (favicon) și pe cardul de membru.

| | A · Monograma | B · Frunza-rachetă | C · Emblema de club |
|---|---|---|---|
| **Ideea** | „JP” în Fraunces, într-un cartuș dreptunghiular, ca o insignă de club privat | o frunză de palmier care, privită altfel, e o rachetă de padel | un blazon rotund cu un jaguar stilizat și anul deschiderii (2027) |
| **Culori** | alamă pe noapte | pădure + alamă | os pe noapte, cu linie de alamă |
| **Unde strălucește** | carduri, uniforme, broderie | ecrane, aplicație, rețele | semnalistică, merchandise, trofeele ligii |
| **Riscul** | poate părea rece; are nevoie de numele scris lângă | frunza e un motiv des folosit; trebuie desenată cu grijă ca să fie unică | detaliile se pierd la dimensiuni mici; are nevoie de o variantă simplificată |

**Brief-ul comun pentru designer:**
- predă SVG, plus variantele orizontală, verticală și doar simbolul;
- nu folosește verde deschis sau lime și nu seamănă cu Clubul Tenis Elite (invariantul 13);
- contrastul se verifică la fel ca tokenii: AAA pentru text.

## 7. Paletele și fonturile propuse
- **În vigoare:** paleta și fonturile B4 (Fraunces, Instrument Sans), deja în design tokens și verificate automat pentru contrast.
- **Propunerea:** le păstrăm și după logo. Dacă logo-ul ales cere altă nuanță (de exemplu un verde mai cald), se schimbă doar tokenul; testele de contrast spun imediat dacă mai e lizibil.

## 8. Limbajul vizual al junglei
Lumina și plantele, nu animalele de desen animat:
- frunze de palmier în contre-jour;
- benzi LED calde;
- reflexii în sticlă;
- umbre de frunze pe pereți.

Fotografiile se fac seara, cu oameni reali (cu acordul lor). Randările rămân marcate „ilustrativ” (Q44).

## 9. Aplicații
| Aplicația | Propunerea | Starea |
|---|---|---|
| Cardul de membru | nivelurile Argint, Aur, Platină, Diamant, cu numele în Fraunces | construit (Etapa 5); se schimbă logo-ul |
| Ecranele de teren și lobby | fond noapte, numele jucătorilor în os, accente de alamă | construite (Etapa 9) |
| Semnalistica | plăci de alamă periată cu text gravat; numerele terenurilor mari, vizibile de pe pasarelă | DE_CONFIRMAT |
| Merchandise | tricouri tehnice negre cu logo mic de alamă; prosoape; sticle de apă | DE_CONFIRMAT |
| Uniformele personalului | polo bleumarin cu logo brodat; antrenorii cu dungă de alamă | DE_CONFIRMAT |
| Numele terenurilor | propunerea din §3: **Jaguar, Tucan, Gorila, Anaconda**; în sistem sunt „Teren 1–4” | DE_CONFIRMAT (numele se schimbă din panou, la resurse) |

## 10. Ce decide proprietarul
1. Aprobă sau schimbă misiunea, valorile și tonul.
2. Alege o direcție de logo (A, B sau C) pentru designer.
3. Face verificarea mărcii și a domeniului (secțiunea 5).
4. Spune dacă vrea nume pentru terenuri.
