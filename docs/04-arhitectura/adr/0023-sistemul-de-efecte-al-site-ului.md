# ADR-0023: Sistemul de efecte al site-ului (video de prezentare, apariții la scroll, interactivitate)

- **Stare:** Acceptat (30.09.2026: proprietarul a aprobat planul, „aprob, continuă cu tot până la capăt”)
- **Data:** 2026-09-30
- **Legat de:** §9.2, §9.4, ADR-0007, ADR-0020 (tokeni), ADR-0022 (comutatoare), Q44, Q57; cererea proprietarului din 30.09.2026 („site-ul devine un simulator de efecte”)

## Context
Proprietarul vrea, peste site-ul complet (Etapa 11), un video mare de prezentare în hero și conținut care apare progresiv la derulare (fade, 3D, „pop”), cu funcții care răspund viu la fiecare acțiune. Structura, designul, brandingul, textele, datele și calculele rămân neschimbate. Viteza pe telefon e sub prag chiar înainte de efecte (Lighthouse mobil 84–92 în 10 măsurători din 30.09.2026, LCP 3,2–3,9 s); orice cod nou în browser o coboară, deci Faza 1 începe cu un pas de marjă de viteză.

## Decizie
1. **CSS mai întâi.** Elementele randate pe server primesc atribute (`data-reveal="fade|rise|tilt|pop|mask|lines"`, `data-reveal-delay`, `data-reveal-group`); efectele sunt reguli CSS. Unde browserul are animații legate de scroll (`animation-timeline: view()`), le folosim în `@supports`.
2. **Un singur observator** (o componentă client mică în layout, `EffectsRuntime`) marchează elementele vizibile (`data-shown`) și nimic altceva: fără câte o componentă client pe secțiune. `Reveal` rămâne pentru pagina de pre-lansare.
3. **Îmbunătățire progresivă.** Starea „ascuns înainte de apariție” se aplică doar sub `html[data-motion="on"]`, pus de observator. Fără JavaScript, cu comutatorul oprit sau la o eroare, totul e vizibil ca acum. Focusul din tastatură face imediat vizibil elementul.
4. **Doar `transform` și `opacity`** (plus `clip-path` cu măsură): CLS rămâne 0.
5. **Trei niveluri:** complet; „lite” (telefon slab: `navigator.hardwareConcurrency ≤ 2` sau `deviceMemory ≤ 2`, „Save-Data”, conexiune 2g/3g): doar fade-uri, fără 3D, parallax sau scene fixate; „reduced motion”: regula globală existentă, efectele noi devin un fade scurt sau nimic.
6. **GSAP** (deja instalat) doar pentru scenele legate de scroll pe care CSS nu le face bine: tranziția video → hală și, eventual, scara rangurilor. Import dinamic după `load`, ca în `ArenaScene`. Nicio bibliotecă nouă de animație.
7. **Tokeni de mișcare** noi doar în `packages/design-tokens` (durata de bază, distanțe, decalajul de cascadă, unghiul maxim de tilt, perspectiva, easing-ul elastic), derivați din cei existenți. Culorile strălucirilor și ale umbririi peste video: tokenii existenți cu transparență (`color-mix()`).
8. **Videoul** urmează modelul scenei 3D: randarea statică rămâne imaginea LCP; videoul se încarcă după `load`, când browserul e liber, și intră cu fade doar când poate rula fără opriri. Fără video, hero-ul e exact ca acum.
9. **Două comutatoare** (ADR-0022): `web_effects` (toate efectele noi) și `web_hero_video` (videoul), oprite implicit, pornite din panou; site-ul se reîmprospătează ca la `full_site`.
10. **Calculele nu se ating:** animațiile pornesc de la valorile primite de la server (nivel, LP, prețuri, părți) și ajung exact la ele.

## Dovezi cerute la fiecare fază
Inventarul înainte/după (`apps/web/scripts/inventory.mjs`, diferența doar adăugiri), regresia vizuală cu efectele oprite și cu „reduced motion”, testele existente neschimbate, Lighthouse mobil ≥ 90 la fiecare măsurătoare.

## Alternative analizate
- **Motion/Framer, Lenis, AOS:** cod în plus în browser, dublează ce face GSAP + CSS. Respinse (fără ADR și aprobare nu se adaugă).
- **O componentă client pe secțiune:** mai simplu de scris, dar fiecare adaugă cod și texte în browser; viteza pe telefon ar coborî sub 90. Respins.
- **Video ca imagine LCP:** LCP ar crește mult pe telefon. Respins.

## Consecințe
- Orice secțiune nouă (14–19) folosește atributele `data-reveal`, nu propriul cod de animație.
- `apps/web/README.md` („Efecte”) și `CLAUDE.md` descriu convenția.
