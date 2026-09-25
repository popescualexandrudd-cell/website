import type { LegalKind } from "../../../lib/generated/prisma/client";

/**
 * Draft legal texts, generated from config/club.yml. `{{…}}` placeholders are filled at
 * render time from the settings (lib/legal.ts), so they update when the admin edits the data.
 * Every page is flagged "De verificat de un jurist" in the admin until a lawyer reviews it.
 */
export const LEGAL_VERSION = "2026-10-01";

type LegalContent = {
  kind: LegalKind;
  title: { ro: string; en: string };
  body: { ro: string; en: string };
};

export const legalContent: LegalContent[] = [
  {
    kind: "CONFIDENTIALITATE",
    title: { ro: "Politica de confidențialitate", en: "Privacy policy" },
    body: {
      ro: `Această politică explică ce date personale colectăm prin acest site, de ce, cât timp le păstrăm și ce drepturi ai. Se aplică Regulamentul (UE) 2016/679 (GDPR) și legislația română privind protecția datelor.

## Cine este operatorul

Operatorul datelor este {{entitate.denumire}} ({{entitate.forma}}), CUI {{entitate.cui}}, cu sediul în {{entitate.sediu}}. Ne poți contacta pentru orice întrebare legată de datele tale la {{contact.email}} sau la {{contact.telefon}}.

## Ce date colectăm și de ce

**Rezervări.** Numele, emailul, telefonul, programul și antrenamentul alese, data și ora, nivelul declarat, mesajul tău și, dacă îl folosești, codul cardului cadou. Pentru antrenamentele copiilor, datele părintelui ca persoană de contact și doar prenumele și vârsta copilului. Temei: executarea contractului (art. 6 alin. 1 lit. b GDPR), adică organizarea antrenamentului.

**Înscrierea copiilor la grupe (inclusiv cele 2 ședințe gratuite).** Datele părintelui (nume, email, telefon), prenumele și vârsta copilului, cât a jucat până acum, grupa dorită și zilele care vă convin. Temei: demersurile făcute la cererea ta înainte de înscriere (art. 6 alin. 1 lit. b).

**Închirierea terenurilor.** Numele, telefonul, emailul, ziua, ora, durata și terenul dorit. Temei: demersurile înainte de contract și executarea lui (art. 6 alin. 1 lit. b).

**Carduri cadou.** Numele, emailul și telefonul cumpărătorului, numele celui care primește cardul și mesajul de pe card. Temei: executarea contractului (art. 6 alin. 1 lit. b).

**Liga amatorilor și „Găsește partener”.** Numele, emailul, telefonul, nivelul, când joci și rezultatele meciurilor. Pe site apar doar prenumele și inițiala, nivelul și, dacă ai cerut, când joci; datele de contact nu sunt publicate. Temei: consimțământul tău (art. 6 alin. 1 lit. a).

**Formularul de contact.** Numele, emailul, telefonul (opțional) și mesajul. Temei: interesul legitim de a-ți răspunde (art. 6 alin. 1 lit. f) și demersurile înainte de un eventual contract (lit. b).

**Lista de așteptare.** Numele, emailul, telefonul, programul și preferințele de orar. Temei: consimțământul tău (art. 6 alin. 1 lit. a).

**Newsletter.** Adresa de email, doar după ce confirmi abonarea din emailul primit. Temei: consimțământul tău. Te poți dezabona oricând, din linkul aflat în fiecare email.

**Recenzii.** Textul, numele afișat și acordul de publicare, doar dacă alegi să lași o recenzie. Temei: consimțământul tău.

**Fotografii, video-uri și rezultate.** Fotografiile și filmările de la antrenamente și rezultatele la turnee se publică numai cu acordul persoanelor în cauză; pentru minori, cu acordul scris al părintelui, iar la rezultate doar cu prenumele și inițiala numelui. La încărcare, din fotografii și video-uri se șterg datele ascunse (de exemplu locația GPS).

**Securitate.** Adresa IP a cererilor către formulare și către asistent, păstrată temporar pentru a limita abuzurile. Temei: interesul legitim de a proteja site-ul.

{{sectiune.asistent}}

{{sectiune.campanii}}

{{publicitate}}

## Cât timp păstrăm datele

- datele din rezervări: {{retentie.luni}} luni de la data antrenamentului, apoi sunt anonimizate automat;
- mesajele din formularul de contact, înscrierile, cererile de teren, înscrierile în ligă și lista de așteptare: {{retentie.luni}} luni, apoi sunt anonimizate;
- cardurile cadou: pe durata valabilității și cât cere legislația fiscală;
- documentele contabile (facturi, chitanțe): cât cere legislația fiscală;
- abonarea la newsletter: până te dezabonezi;
- fotografiile, video-urile și rezultatele publicate: până când tu (sau părintele) îți retragi acordul.

## Cine mai are acces la date

Datele sunt stocate pe un server închiriat de la un furnizor de găzduire din Uniunea Europeană, iar emailurile sunt trimise printr-un furnizor de servicii de email. Ambii acționează ca persoane împuternicite, pe bază de contract, și nu folosesc datele în scop propriu. Lista actualizată a acestor furnizori ți-o trimitem la cerere, la {{contact.email}}. {{furnizori.extra}}

{{transfer}}

## Drepturile tale

Ai dreptul să ceri acces la datele tale, rectificarea sau ștergerea lor, restricționarea prelucrării, portabilitatea datelor și să te opui prelucrării bazate pe interes legitim. Poți retrage oricând consimțământul, fără să afecteze prelucrarea făcută până atunci. Scrie-ne la {{contact.email}} și îți răspundem în cel mult o lună.

Dacă nu ești mulțumit de răspuns, poți depune o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP), B-dul G-ral. Gheorghe Magheru 28–30, sector 1, București, www.dataprotection.ro.

## Cookie-uri

{{cookies.rezumat}}

## Modificări

Versiunea acestei politici: {{versiune}}. Când o modificăm, actualizăm versiunea, iar formularele salvează versiunea pe care ai acceptat-o.`,
      en: `This policy explains what personal data we collect through this website, why, how long we keep it and what rights you have. It is governed by Regulation (EU) 2016/679 (GDPR) and Romanian data protection law.

## Who the controller is

The data controller is {{entitate.denumire}} ({{entitate.forma}}), tax ID {{entitate.cui}}, registered at {{entitate.sediu}}. You can contact us with any question about your data at {{contact.email}} or {{contact.telefon}}.

## What data we collect and why

**Bookings.** Your name, email, phone, chosen programme and session, date and time, declared level, your message and, if you use one, the gift card code. For children's sessions, the parent's details as the contact person and only the child's first name and age. Legal basis: performance of the contract (Art. 6(1)(b) GDPR), that is, organising the session.

**Signing children up for groups (including the 2 free sessions).** The parent's details (name, email, phone), the child's first name and age, how much they have played, the group you would like and the days that suit you. Legal basis: steps taken at your request before enrolment (Art. 6(1)(b)).

**Court hire.** Name, phone, email, the day, time, length and court you want. Legal basis: steps before a contract and its performance (Art. 6(1)(b)).

**Gift cards.** The buyer's name, email and phone, the recipient's name and the message on the card. Legal basis: performance of the contract (Art. 6(1)(b)).

**Amateur league and "Find a partner".** Name, email, phone, level, when you play and match results. The site shows only your first name and initial, level and, if you asked, when you play; contact details are never published. Legal basis: your consent (Art. 6(1)(a)).

**Contact form.** Your name, email, phone (optional) and message. Legal basis: legitimate interest in replying to you (Art. 6(1)(f)) and steps prior to a possible contract (Art. 6(1)(b)).

**Waiting list.** Name, email, phone, programme and preferred times. Legal basis: your consent (Art. 6(1)(a)).

**Newsletter.** Your email address, only after you confirm the subscription from the email you receive. Legal basis: your consent. You can unsubscribe at any time from the link in every email.

**Reviews.** The text, displayed name and consent to publish, only if you choose to leave a review. Legal basis: your consent.

**Photos, videos and results.** Photos and videos from training and tournament results are published only with the consent of the people concerned; for minors, with a parent's written consent, and results show only the first name and the initial of the surname. On upload, hidden data (such as GPS location) is removed from photos and videos.

**Security.** The IP address of requests to the forms and to the assistant, kept temporarily to limit abuse. Legal basis: legitimate interest in protecting the site.

{{sectiune.asistent}}

{{sectiune.campanii}}

{{publicitate}}

## How long we keep data

- booking data: {{retentie.luni}} months after the session, then automatically anonymised;
- contact form messages, sign-ups, court requests, league sign-ups and waiting list entries: {{retentie.luni}} months, then anonymised;
- gift cards: while they are valid and as long as tax law requires;
- accounting documents (invoices, receipts): as long as tax law requires;
- newsletter subscription: until you unsubscribe;
- published photos, videos and results: until you (or the parent) withdraw consent.

## Who else has access

The data is stored on a server rented from a hosting provider in the European Union, and emails are sent through an email service provider. Both act as processors under contract and do not use the data for their own purposes. We will send you the current list of these providers on request, at {{contact.email}}. {{furnizori.extra}}

{{transfer}}

## Your rights

You have the right to access your data, to have it corrected or erased, to restrict processing, to data portability and to object to processing based on legitimate interest. You can withdraw consent at any time, without affecting processing carried out before. Write to us at {{contact.email}} and we will reply within one month.

If you are not satisfied with the answer, you can lodge a complaint with the Romanian data protection authority (ANSPDCP), B-dul G-ral. Gheorghe Magheru 28–30, sector 1, Bucharest, www.dataprotection.ro.

## Cookies

{{cookies.rezumat}}

## Changes

Version of this policy: {{versiune}}. When we change it, we update the version, and the forms record the version you accepted.`,
    },
  },
  {
    kind: "TERMENI",
    title: { ro: "Termeni și condiții", en: "Terms and conditions" },
    body: {
      ro: `Acești termeni se aplică rezervărilor făcute prin acest site și antrenamentelor de tenis, închirierii terenurilor și cardurilor cadou oferite de {{entitate.denumire}} ({{entitate.forma}}), CUI {{entitate.cui}}, cu sediul în {{entitate.sediu}}.

## Rezervarea

O rezervare făcută pe site este o cerere. {{rezervare.mod}} Primești pe email confirmarea, cu detaliile antrenamentului și un link personal prin care poți vedea sau anula rezervarea.

Înscrierea copiilor într-o grupă pornește de la o cerere făcută pe site sau la telefon. Copiii care se înscriu la grupele de inițiere au primele 2 ședințe gratuite. Locul în grupă se confirmă după aceste ședințe, iar abonamentul lunar și programul grupei se comunică la înscriere.

Terenurile se închiriază la telefon sau cu cererea de pe pagina Închiriere teren; rezervarea e confirmată de club. Tarifele sunt cele afișate pe site la data rezervării. Oferta cu mingile Dunlop pentru minimum 2 ore închiriate în weekend este valabilă doar pentru rezervările făcute direct la club.

Cardurile cadou sunt valabile 12 luni de la plată, dacă pe card nu scrie altfel. Un card se folosește o singură dată, la rezervarea antrenamentelor pe care le conține; dacă antrenamentul se anulează în termenul de anulare gratuită, cardul redevine valabil. Cardurile nu se preschimbă în bani.

## Anularea

Poți anula gratuit din linkul primit pe email până cu {{anulare.ore}} de ore înainte de începerea antrenamentului. După acest termen, anularea nu mai este gratuită; în caz de boală sau de urgență, contactează-ne și căutăm împreună o soluție.

Dacă noi trebuie să anulăm (vreme nepotrivită, teren indisponibil, boala antrenorului), te anunțăm cât mai repede și reprogramăm antrenamentul fără niciun cost pentru tine.

## Plata

Metodele de plată acceptate: {{plata.metode}}. Prețurile sunt afișate pe pagina de prețuri, în lei. Pachetele de antrenamente sunt valabile numărul de zile menționat la fiecare pachet, de la prima ședință.

## Sănătate și siguranță

Tenisul este o activitate fizică. Participi pe propria răspundere și ne spui înainte de primul antrenament dacă ai probleme de sănătate care pot fi afectate de efort. Pentru minori, părintele confirmă că acest copil poate face sport.

Respectă regulile bazei sportive, poartă încălțăminte potrivită suprafeței și anunță-l imediat pe antrenor dacă te doare ceva în timpul antrenamentului.

## Minori

Rezervările și înscrierile pentru copii se fac de părinte sau de tutorele legal, care este persoana de contact. Părintele sau adultul care îl aduce pe copil îl predă antrenorului la începutul antrenamentului și îl preia la final, la club.

## Fotografii și filmări

Orice publicare a fotografiilor sau filmărilor se face numai cu acordul scris al persoanei filmate sau, pentru minori, al părintelui.

## Litigii

Neînțelegerile se rezolvă mai întâi pe cale amiabilă, prin discuție directă. Dacă nu reușim, se aplică legea română, iar competența aparține instanțelor de la sediul operatorului.

Versiunea acestor termeni: {{versiune}}.`,
      en: `These terms apply to bookings made through this website and to the tennis sessions, court hire and gift cards provided by {{entitate.denumire}} ({{entitate.forma}}), tax ID {{entitate.cui}}, registered at {{entitate.sediu}}.

## Booking

A booking made on the site is a request. {{rezervare.mod}} You receive a confirmation by email, with the session details and a personal link to view or cancel the booking.

Children join a group through a request made on the site or by phone. Children joining a beginners group get the first 2 sessions free. The place in the group is confirmed after these sessions, and the monthly membership and the group's schedule are given when you join.

Courts are hired by phone or with the request on the Court hire page; the booking is confirmed by the club. The rates are those shown on the site on the day you book. The Dunlop ball offer for at least 2 hours hired at the weekend applies only to bookings made directly with the club.

Gift cards are valid for 12 months from payment, unless the card says otherwise. A card is used once, when booking the sessions it holds; if the session is cancelled within the free cancellation period, the card becomes valid again. Cards cannot be exchanged for cash.

## Cancellation

You can cancel free of charge from the link in your email up to {{anulare.ore}} hours before the session starts. After that, cancellation is no longer free; in case of illness or an emergency, contact us and we will find a solution together.

If we have to cancel (bad weather, court unavailable, the coach's illness), we let you know as soon as possible and we reschedule the session at no cost to you.

## Payment

Accepted payment methods: {{plata.metode}}. Prices are shown on the pricing page, in lei (RON). Session packs are valid for the number of days stated for each package, from the first session.

## Health and safety

Tennis is physical activity. You take part at your own risk and tell us before the first session about any health condition that exertion may affect. For minors, the parent confirms the child is fit to do sport.

Follow the venue's rules, wear footwear suited to the surface and tell the coach immediately if anything hurts during the session.

## Minors

Bookings and sign-ups for children are made by a parent or legal guardian, who is the contact person. The parent or adult who brings the child hands them over to the coach at the start of the session and collects them at the end, at the club.

## Photos and video

Anything published requires the written consent of the person filmed or, for minors, of a parent.

## Disputes

Disagreements are first settled amicably, by talking directly. If that fails, Romanian law applies and the courts at the operator's registered office have jurisdiction.

Version of these terms: {{versiune}}.`,
    },
  },
  {
    kind: "COOKIES",
    title: { ro: "Politica de cookie-uri", en: "Cookie policy" },
    body: {
      ro: `Un cookie este un fișier mic pe care un site îl salvează în browserul tău. Acest site folosește cât mai puține.

## Pe site-ul public

{{cookies.public}}

Statisticile de vizitare, dacă sunt activate, se fac cu Umami, un instrument găzduit pe același server, care nu folosește cookie-uri și nu identifică vizitatorii.

Harta locației se încarcă doar când apeși butonul „Arată harta”. Abia atunci browserul tău se conectează la OpenStreetMap, care poate înregistra adresa IP conform propriei politici.

Dacă protecția anti-spam Cloudflare Turnstile este activă pe formulare, aceasta poate folosi date tehnice strict necesare pentru a deosebi oamenii de programele automate.

## În panoul de administrare

Pentru echipa clubului, panoul de administrare folosește doar cookie-uri strict necesare:

| Cookie | Scop | Durată |
| --- | --- | --- |
| \`sesiune_admin\` | păstrează autentificarea în panoul de administrare | 30 de zile sau până la ieșirea din cont |
| \`__prerender_bypass\` | arată ciornele când echipa previzualizează site-ul | până la ieșirea din previzualizare sau închiderea browserului |

{{cookies.consimtamant}}

## Cum ștergi cookie-urile

Le poți șterge oricând din setările browserului. Site-ul public funcționează la fel și fără ele.

Versiunea acestei politici: {{versiune}}.`,
      en: `A cookie is a small file a website stores in your browser. This site uses as few as possible.

## On the public site

{{cookies.public}}

Visitor statistics, when enabled, use Umami, a tool hosted on the same server that uses no cookies and does not identify visitors.

The location map loads only when you press "Show map". Only then does your browser connect to OpenStreetMap, which may log your IP address under its own policy.

If Cloudflare Turnstile anti-spam protection is active on the forms, it may use strictly necessary technical data to tell people from bots.

## In the admin panel

For the club's team, the admin panel uses only strictly necessary cookies:

| Cookie | Purpose | Duration |
| --- | --- | --- |
| \`sesiune_admin\` | keeps you signed in to the admin panel | 30 days or until you sign out |
| \`__prerender_bypass\` | shows drafts while the team previews the site | until preview ends or the browser closes |

{{cookies.consimtamant}}

## How to delete cookies

You can delete them at any time in your browser settings. The public site works the same without them.

Version of this policy: {{versiune}}.`,
    },
  },
];
