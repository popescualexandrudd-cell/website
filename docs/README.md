# Documentația proiectului Jungle Padel

Documentația a fost creată în Etapa 0 (26.09.2026) prin împărțirea integrală a documentului-sursă `MEGA_PROMPT.md` (păstrat neschimbat în rădăcina repository-ului, ca referință istorică), plus documentele noi ale Etapei 0 (ADR-uri, plan, întrebări, diagrame).

## Documentul-sursă

Titlul și antetul din `MEGA_PROMPT.md`, preluate integral:

> MEGA-PROMPT — JUNGLE PADEL · Sistem digital complet (pentru Claude Code)
>
> Versiune document: 1.0 · Data: 26 septembrie 2026 · Limba de lucru: română (cod, identificatori și commit-uri în engleză; toate textele pentru clienți, personal și proprietar în română, cu traduceri).
> Acest document este SURSA DE ADEVĂR a proiectului. Rezumă integral conversația de planificare cu proprietarul, inclusiv fiecare decizie, fiecare preferință și fiecare ambiguitate rămasă deschisă. Nu omite nimic din el. Când ceva lipsește sau e neclar, ÎNTREABĂ, nu presupune în tăcere.

## Foldere

| Folder | Ce conține |
|---|---|
| [`00-management/`](00-management/) | Management: progres, întrebări deschise, plan, calendar, changelog, principii de lucru, Definition of Done |
| [`01-viziune-si-business/`](01-viziune-si-business/) | Contextul, conceptul „Jungle Padel”, arhiva ideilor |
| [`02-reguli-business/`](02-reguli-business/) | Regulile de business confirmate (R-xxx) |
| [`03-liga/`](03-liga/) | Specificația completă a ligii + rapoarte de simulare |
| [`04-arhitectura/`](04-arhitectura/) | Arhitectura, diagrame, AI, specificațiile aplicațiilor, ADR-uri |
| [`05-api/`](05-api/) | API (OpenAPI + ghid) — din Etapa 1A |
| [`06-date/`](06-date/) | Modelul de date, dicționar, retenție |
| [`07-securitate-gdpr-legal/`](07-securitate-gdpr-legal/) | Securitate, GDPR, fiscal |
| [`08-deploy-si-mentenanta/`](08-deploy-si-mentenanta/) | Deploy, backup, monitorizare, runbook-uri |
| [`09-hardware/`](09-hardware/) | Hardware Bridge, criterii de achiziție, chioșcuri, ecrane |
| [`10-seo/`](10-seo/) | SEO tehnic și de conținut |
| [`11-marketing/`](11-marketing/) | Marketing |
| [`12-branding/`](12-branding/) | Design tokens și platforma de brand |
| [`13-vanzari/`](13-vanzari/) | Vânzări |
| [`14-regulament-public/`](14-regulament-public/) | Regulamentul clubului (din etapele următoare) |
| [`15-instruire-personal/`](15-instruire-personal/) | Ghiduri pentru personal (Etapa 15) |

## Unde găsești fiecare secțiune din `MEGA_PROMPT.md`

Trimiterile de tipul „secțiunea 6.9” din documente se găsesc cu tabelul de mai jos.

| Secțiunea (titlul original) | Fișierul |
|---|---|
| 0. CUM FOLOSEȘTI ACEST DOCUMENT | [00-management/00-cum-se-foloseste-documentul.md](00-management/00-cum-se-foloseste-documentul.md) |
| ↳ 0.1 Pentru proprietar (om) | [00-management/00-cum-se-foloseste-documentul.md](00-management/00-cum-se-foloseste-documentul.md) |
| ↳ 0.2 Pentru Claude Code (primele acțiuni obligatorii) | [00-management/00-cum-se-foloseste-documentul.md](00-management/00-cum-se-foloseste-documentul.md) |
| 1. ROLUL TĂU | [00-management/01-rol-si-principii-de-lucru.md](00-management/01-rol-si-principii-de-lucru.md) |
| ↳ 1.1 Principii de lucru (obligatorii) | [00-management/01-rol-si-principii-de-lucru.md](00-management/01-rol-si-principii-de-lucru.md) |
| 2. CONTEXTUL PROIECTULUI (business) | [01-viziune-si-business/01-context-business.md](01-viziune-si-business/01-context-business.md) |
| ↳ 2.1 Locația și terenul | [01-viziune-si-business/01-context-business.md](01-viziune-si-business/01-context-business.md) |
| ↳ 2.2 Ce se construiește | [01-viziune-si-business/01-context-business.md](01-viziune-si-business/01-context-business.md) |
| ↳ 2.3 Clubul de tenis existent (sinergie) | [01-viziune-si-business/01-context-business.md](01-viziune-si-business/01-context-business.md) |
| ↳ 2.4 Calendar și resurse | [01-viziune-si-business/01-context-business.md](01-viziune-si-business/01-context-business.md) |
| ↳ 2.5 Obiectivul de business | [01-viziune-si-business/01-context-business.md](01-viziune-si-business/01-context-business.md) |
| 3. CONCEPTUL „JUNGLE PADEL” (pentru conținut, design și funcții) | [01-viziune-si-business/02-concept-jungle-padel.md](01-viziune-si-business/02-concept-jungle-padel.md) |
| 4. ARHITECTURA SISTEMULUI | [04-arhitectura/01-arhitectura-sistemului.md](04-arhitectura/01-arhitectura-sistemului.md) |
| ↳ 4.1 Principiul de bază | [04-arhitectura/01-arhitectura-sistemului.md](04-arhitectura/01-arhitectura-sistemului.md) |
| ↳ 4.2 Componente | [04-arhitectura/01-arhitectura-sistemului.md](04-arhitectura/01-arhitectura-sistemului.md) |
| ↳ 4.3 Stack tehnic (decizie inițială, documentată ca ADR în Etapa 0) | [04-arhitectura/01-arhitectura-sistemului.md](04-arhitectura/01-arhitectura-sistemului.md) |
| ↳ 4.4 Structura de foldere (monorepo; fiecare aplicație poate fi rulată și pusă pe domeniul ei separat) | [04-arhitectura/01-arhitectura-sistemului.md](04-arhitectura/01-arhitectura-sistemului.md) |
| ↳ 4.5 Documentația derivată din acest prompt | [04-arhitectura/01-arhitectura-sistemului.md](04-arhitectura/01-arhitectura-sistemului.md) |
| ↳ 4.6 Domenii și subdomenii (numele domeniului: `DE_CONFIRMAT`, notat `<domeniu>`) | [04-arhitectura/01-arhitectura-sistemului.md](04-arhitectura/01-arhitectura-sistemului.md) |
| 5. REGULI DE BUSINESS CONFIRMATE (cu ID-uri pentru trasabilitate în cod și teste) | [02-reguli-business/README.md](02-reguli-business/README.md) |
| ↳ 5.1 Conturi, identitate, validare | [02-reguli-business/01-conturi-identitate-validare.md](02-reguli-business/01-conturi-identitate-validare.md) |
| ↳ 5.2 Liga și GDPR la înscriere | [02-reguli-business/02-liga-si-gdpr-la-inscriere.md](02-reguli-business/02-liga-si-gdpr-la-inscriere.md) |
| ↳ 5.3 Carduri (legitimații) | [02-reguli-business/03-carduri-legitimatii.md](02-reguli-business/03-carduri-legitimatii.md) |
| ↳ 5.4 Check-in și prezențe | [02-reguli-business/04-check-in-si-prezente.md](02-reguli-business/04-check-in-si-prezente.md) |
| ↳ 5.5 Rezervări | [02-reguli-business/05-rezervari.md](02-reguli-business/05-rezervari.md) |
| ↳ 5.6 Intervale orare și prețuri | [02-reguli-business/06-intervale-orare-si-preturi.md](02-reguli-business/06-intervale-orare-si-preturi.md) |
| ↳ 5.7 Plăți | [02-reguli-business/07-plati.md](02-reguli-business/07-plati.md) |
| ↳ 5.8 Anulări și neprezentări (aceleași reguli pentru padel, tenis, pilates, lecții) | [02-reguli-business/08-anulari-si-neprezentari.md](02-reguli-business/08-anulari-si-neprezentari.md) |
| ↳ 5.9 Abonamente și pachete | [02-reguli-business/09-abonamente-si-pachete.md](02-reguli-business/09-abonamente-si-pachete.md) |
| ↳ 5.10 Antrenori, lecții, clase | [02-reguli-business/10-antrenori-lectii-clase.md](02-reguli-business/10-antrenori-lectii-clase.md) |
| ↳ 5.11 Pilates Reformer | [02-reguli-business/11-pilates-reformer.md](02-reguli-business/11-pilates-reformer.md) |
| ↳ 5.12 Evenimente, parkour, cafenea | [02-reguli-business/12-evenimente-parkour-cafenea.md](02-reguli-business/12-evenimente-parkour-cafenea.md) |
| ↳ 5.13 Recomandări, recompense | [02-reguli-business/13-recomandari-recompense.md](02-reguli-business/13-recomandari-recompense.md) |
| ↳ 5.14 Notificări | [02-reguli-business/14-notificari.md](02-reguli-business/14-notificari.md) |
| ↳ 5.15 Limbi | [02-reguli-business/15-limbi.md](02-reguli-business/15-limbi.md) |
| 6. LIGA JUNGLE — SPECIFICAȚIE COMPLETĂ | [03-liga/00-introducere-si-model.md](03-liga/00-introducere-si-model.md) |
| ↳ 6.1 Ce e activ | [03-liga/01-ce-e-activ.md](03-liga/01-ce-e-activ.md) |
| ↳ 6.2 MMR (rating ascuns) — model bayesian cu incertitudine pentru echipe | [03-liga/02-mmr-rating-ascuns.md](03-liga/02-mmr-rating-ascuns.md) |
| ↳ 6.3 Nivelul afișat (1.0–7.0) | [03-liga/03-nivelul-afisat.md](03-liga/03-nivelul-afisat.md) |
| ↳ 6.4 Intrarea în ligă (jucători noi) | [03-liga/04-intrarea-in-liga.md](03-liga/04-intrarea-in-liga.md) |
| ↳ 6.5 Ranguri (confirmat: Bronz → Diamant, cu trepte) | [03-liga/05-ranguri.md](03-liga/05-ranguri.md) |
| ↳ 6.6 Calculul LP pentru un meci oficial | [03-liga/06-calculul-lp.md](03-liga/06-calculul-lp.md) |
| ↳ 6.7 Formatul scorului (confirmat: ca la padelul oficial) | [03-liga/07-formatul-scorului.md](03-liga/07-formatul-scorului.md) |
| ↳ 6.8 Meciuri neterminate (confirmat) | [03-liga/08-meciuri-neterminate.md](03-liga/08-meciuri-neterminate.md) |
| ↳ 6.9 Fluxul de validare (mașină de stări, pe server) | [03-liga/09-fluxul-de-validare.md](03-liga/09-fluxul-de-validare.md) |
| ↳ 6.10 Anti-abuz și eligibilitate | [03-liga/10-anti-abuz-si-eligibilitate.md](03-liga/10-anti-abuz-si-eligibilitate.md) |
| ↳ 6.11 Provocări directe (confirmat) | [03-liga/11-provocari-directe.md](03-liga/11-provocari-directe.md) |
| ↳ 6.12 Recompense (confirmat) | [03-liga/12-recompense.md](03-liga/12-recompense.md) |
| ↳ 6.13 Sezoane | [03-liga/13-sezoane.md](03-liga/13-sezoane.md) |
| ↳ 6.14 Tipuri de meci | [03-liga/14-tipuri-de-meci.md](03-liga/14-tipuri-de-meci.md) |
| ↳ 6.15 Gamificare | [03-liga/15-gamificare.md](03-liga/15-gamificare.md) |
| ↳ 6.16 Corectitudine tehnică (obligatoriu) | [03-liga/16-corectitudine-tehnica.md](03-liga/16-corectitudine-tehnica.md) |
| ↳ 6.17 Testele ligii (obligatorii, înainte de orice integrare) | [03-liga/17-testele-ligii.md](03-liga/17-testele-ligii.md) |
| 7. MODELUL DE DATE (orientativ; detaliază în `docs/06-date/`) | [06-date/01-model-de-date-orientativ.md](06-date/01-model-de-date-orientativ.md) |
| 8. APLICAȚIILE — SPECIFICAȚII FUNCȚIONALE | [04-arhitectura/aplicatii/README.md](04-arhitectura/aplicatii/README.md) |
| ↳ 8.1 Backend central | [04-arhitectura/aplicatii/01-backend-central.md](04-arhitectura/aplicatii/01-backend-central.md) |
| ↳ 8.2 Chioșcul de Ligă (aparat 1) | [04-arhitectura/aplicatii/02-chiosc-liga.md](04-arhitectura/aplicatii/02-chiosc-liga.md) |
| ↳ 8.3 Chioșcul de Plăți (aparat 2) — numerar cu rest la lansare | [04-arhitectura/aplicatii/03-chiosc-plati.md](04-arhitectura/aplicatii/03-chiosc-plati.md) |
| ↳ 8.4 Hardware Bridge (serviciu local pe fiecare aparat) | [09-hardware/01-hardware-bridge.md](09-hardware/01-hardware-bridge.md) |
| ↳ 8.5 Ecranele de la terenuri și cele de lobby/cafenea/mezanin | [04-arhitectura/aplicatii/05-ecrane-teren-si-lobby.md](04-arhitectura/aplicatii/05-ecrane-teren-si-lobby.md) |
| ↳ 8.6 Panoul de admin (control total, „complet funcțional”) | [04-arhitectura/aplicatii/06-panou-admin.md](04-arhitectura/aplicatii/06-panou-admin.md) |
| ↳ 8.7 Afișajul cafenelei | [04-arhitectura/aplicatii/07-afisaj-cafenea.md](04-arhitectura/aplicatii/07-afisaj-cafenea.md) |
| ↳ 8.8 Carduri și Wallet | [04-arhitectura/aplicatii/08-carduri-si-wallet.md](04-arhitectura/aplicatii/08-carduri-si-wallet.md) |
| 9. WEBSITE-UL „SIMULATOR” | [04-arhitectura/aplicatii/09-website-simulator.md](04-arhitectura/aplicatii/09-website-simulator.md) |
| ↳ 9.1 Ideea (din videoul trimis de proprietar: DOAR INSPIRAȚIE, NU SE COPIAZĂ) | [04-arhitectura/aplicatii/09-website-simulator.md](04-arhitectura/aplicatii/09-website-simulator.md) |
| ↳ 9.2 Secțiunile paginii principale (propunere; se livrează ȘI se aprobă una câte una) | [04-arhitectura/aplicatii/09-website-simulator.md](04-arhitectura/aplicatii/09-website-simulator.md) |
| ↳ 9.3 Pagini | [04-arhitectura/aplicatii/09-website-simulator.md](04-arhitectura/aplicatii/09-website-simulator.md) |
| ↳ 9.4 Reguli de UX, animație, performanță | [04-arhitectura/aplicatii/09-website-simulator.md](04-arhitectura/aplicatii/09-website-simulator.md) |
| 10. INTELIGENȚA ARTIFICIALĂ (integrată în tot sistemul) | [04-arhitectura/03-inteligenta-artificiala.md](04-arhitectura/03-inteligenta-artificiala.md) |
| ↳ 10.1 Arhitectură | [04-arhitectura/03-inteligenta-artificiala.md](04-arhitectura/03-inteligenta-artificiala.md) |
| ↳ 10.2 Funcții AI | [04-arhitectura/03-inteligenta-artificiala.md](04-arhitectura/03-inteligenta-artificiala.md) |
| 11. NOTIFICĂRI (email + telefon; fără WhatsApp la lansare) | [04-arhitectura/aplicatii/11-notificari.md](04-arhitectura/aplicatii/11-notificari.md) |
| 12. SECURITATE, GDPR, LEGAL ȘI FISCAL (România) | [07-securitate-gdpr-legal/README.md](07-securitate-gdpr-legal/README.md) |
| ↳ 12.1 Securitate | [07-securitate-gdpr-legal/01-securitate.md](07-securitate-gdpr-legal/01-securitate.md) |
| ↳ 12.2 GDPR | [07-securitate-gdpr-legal/02-gdpr.md](07-securitate-gdpr-legal/02-gdpr.md) |
| ↳ 12.3 Fiscal și comercial | [07-securitate-gdpr-legal/03-fiscal-si-comercial.md](07-securitate-gdpr-legal/03-fiscal-si-comercial.md) |
| ↳ Registrul prelucrărilor (art. 30) | [07-securitate-gdpr-legal/04-registrul-prelucrarilor.md](07-securitate-gdpr-legal/04-registrul-prelucrarilor.md) |
| ↳ DPIA: liga și ecranele | [07-securitate-gdpr-legal/05-dpia-liga-si-ecrane.md](07-securitate-gdpr-legal/05-dpia-liga-si-ecrane.md) |
| ↳ 12.4 Branding tehnic (design tokens) | [12-branding/01-branding-tehnic-design-tokens.md](12-branding/01-branding-tehnic-design-tokens.md) |
| 13. TESTARE ȘI CALITATE (Definition of Done pentru orice livrare) | [00-management/DEFINITION_OF_DONE.md](00-management/DEFINITION_OF_DONE.md) |
| 14. DEPLOY PE SERVERUL PROPRIU, BACKUP, MONITORIZARE, MENTENANȚĂ | [08-deploy-si-mentenanta/01-cerinte-deploy-backup-monitorizare.md](08-deploy-si-mentenanta/01-cerinte-deploy-backup-monitorizare.md) |
| 15. SEO, MARKETING, BRANDING, VÂNZĂRI (livrabile de business) | [10-seo/README.md](10-seo/README.md) |
| ↳ 15.1 SEO tehnic (în cod) | [10-seo/01-seo-tehnic.md](10-seo/01-seo-tehnic.md) |
| ↳ 15.2 SEO de conținut și local (în `docs/10-seo/`) | [10-seo/02-seo-continut-si-local.md](10-seo/02-seo-continut-si-local.md) |
| ↳ 15.3 Marketing (în `docs/11-marketing/`) | [11-marketing/01-plan-de-marketing.md](11-marketing/01-plan-de-marketing.md) |
| ↳ 15.4 Branding (în `docs/12-branding/`) | [12-branding/02-platforma-de-brand.md](12-branding/02-platforma-de-brand.md) |
| ↳ 15.5 Vânzări (în `docs/13-vanzari/`) | [13-vanzari/01-vanzari.md](13-vanzari/01-vanzari.md) |
| 16. PLAN DE LUCRU PE ETAPE (cu aprobarea proprietarului după fiecare) | [00-management/02-plan-pe-etape-original.md](00-management/02-plan-pe-etape-original.md) |
| 17. ÎNTREBĂRI DESCHISE (de pus proprietarului; fiecare cu varianta implicită până la răspuns) | [00-management/INTREBARI_DESCHISE.md](00-management/INTREBARI_DESCHISE.md) |
| 18. ARHIVA IDEILOR DIN CONVERSAȚIE (starea fiecăreia) | [01-viziune-si-business/03-arhiva-ideilor.md](01-viziune-si-business/03-arhiva-ideilor.md) |
| 19. CHECKLIST FINAL ÎNAINTE DE ORICE LIVRARE | [00-management/CHECKLIST_LIVRARE.md](00-management/CHECKLIST_LIVRARE.md) |
