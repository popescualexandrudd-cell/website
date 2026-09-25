import type { LegalKind } from "../../../lib/generated/prisma/client";

/**
 * Draft legal texts, generated from config/club.yml. `{{…}}` placeholders are filled at
 * render time from the settings (lib/legal.ts), so they update when the admin edits the data.
 * Every page is flagged "De verificat de un jurist" in the admin until a lawyer reviews it.
 */
export const LEGAL_VERSION = "2026-09-25";

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

**Rezervări.** Numele, emailul, telefonul, programul și lecția alese, data și ora, nivelul declarat și mesajul tău. Pentru lecțiile copiilor, datele părintelui ca persoană de contact și doar prenumele și vârsta copilului. Temei: executarea contractului (art. 6 alin. 1 lit. b GDPR), adică organizarea lecției.

**Cereri de evaluare pentru academia de juniori.** Datele părintelui (nume, email, telefon), prenumele și vârsta copilului, cât a jucat până acum, grupa dorită și zilele care vă convin. Temei: demersurile făcute la cererea ta înainte de înscriere (art. 6 alin. 1 lit. b).

**Formularul de contact.** Numele, emailul, telefonul (opțional) și mesajul. Temei: interesul legitim de a-ți răspunde (art. 6 alin. 1 lit. f) și demersurile înainte de un eventual contract (lit. b).

**Lista de așteptare.** Numele, emailul, telefonul, programul și preferințele de orar. Temei: consimțământul tău (art. 6 alin. 1 lit. a).

**Newsletter.** Adresa de email, doar după ce confirmi abonarea din emailul primit. Temei: consimțământul tău. Te poți dezabona oricând, din linkul aflat în fiecare email.

**Recenzii.** Textul, numele afișat și acordul de publicare, doar dacă alegi să lași o recenzie. Temei: consimțământul tău.

**Fotografii, video-uri și rezultate.** Fotografiile și filmările de la antrenamente și rezultatele la turnee se publică numai cu acordul persoanelor în cauză; pentru minori, cu acordul scris al părintelui, iar la rezultate doar cu prenumele și inițiala numelui. La încărcare, din fotografii și video-uri se șterg datele ascunse (de exemplu locația GPS).

**Securitate.** Adresa IP a cererilor către formulare, păstrată temporar pentru a limita abuzurile. Temei: interesul legitim de a proteja site-ul.

Nu folosim datele tale pentru publicitate, nu le vindem și nu facem profilare.

## Cât timp păstrăm datele

- datele din rezervări: {{retentie.luni}} luni de la data lecției, apoi sunt anonimizate automat;
- mesajele din formularul de contact, cererile de evaluare și lista de așteptare: {{retentie.luni}} luni, apoi sunt anonimizate;
- documentele contabile (facturi, chitanțe): cât cere legislația fiscală;
- abonarea la newsletter: până te dezabonezi;
- fotografiile, video-urile și rezultatele publicate: până când tu (sau părintele) îți retragi acordul.

## Cine mai are acces la date

Datele sunt stocate pe un server închiriat de la un furnizor de găzduire din Uniunea Europeană: [DE COMPLETAT]. Emailurile sunt trimise printr-un furnizor de email: [DE COMPLETAT]. Ambii acționează ca persoane împuternicite, pe bază de contract, și nu folosesc datele în scop propriu. Nu transferăm date în afara Spațiului Economic European.

## Drepturile tale

Ai dreptul să ceri acces la datele tale, rectificarea sau ștergerea lor, restricționarea prelucrării, portabilitatea datelor și să te opui prelucrării bazate pe interes legitim. Poți retrage oricând consimțământul, fără să afecteze prelucrarea făcută până atunci. Scrie-ne la {{contact.email}} și îți răspundem în cel mult o lună.

Dacă nu ești mulțumit de răspuns, poți depune o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP), B-dul G-ral. Gheorghe Magheru 28–30, sector 1, București, www.dataprotection.ro.

## Cookie-uri

Site-ul public nu folosește cookie-uri de marketing sau de urmărire. Detaliile sunt în politica de cookie-uri.

## Modificări

Versiunea acestei politici: {{versiune}}. Când o modificăm, actualizăm versiunea, iar formularele salvează versiunea pe care ai acceptat-o.`,
      en: `This policy explains what personal data we collect through this website, why, how long we keep it and what rights you have. It is governed by Regulation (EU) 2016/679 (GDPR) and Romanian data protection law.

## Who the controller is

The data controller is {{entitate.denumire}} ({{entitate.forma}}), tax ID {{entitate.cui}}, registered at {{entitate.sediu}}. You can contact us with any question about your data at {{contact.email}} or {{contact.telefon}}.

## What data we collect and why

**Bookings.** Your name, email, phone, chosen programme and lesson, date and time, declared level and your message. For children's lessons, the parent's details as the contact person and only the child's first name and age. Legal basis: performance of a contract (Art. 6(1)(b) GDPR), that is, organising the lesson.

**Assessment requests for the junior academy.** The parent's details (name, email, phone), the child's first name and age, how much they have played, the group you would like and the days that suit you. Legal basis: steps taken at your request before enrolment (Art. 6(1)(b)).

**Contact form.** Your name, email, phone (optional) and message. Legal basis: legitimate interest in replying to you (Art. 6(1)(f)) and steps prior to a possible contract (Art. 6(1)(b)).

**Waiting list.** Name, email, phone, programme and preferred times. Legal basis: your consent (Art. 6(1)(a)).

**Newsletter.** Your email address, only after you confirm the subscription from the email you receive. Legal basis: your consent. You can unsubscribe at any time from the link in every email.

**Reviews.** The text, displayed name and consent to publish, only if you choose to leave a review. Legal basis: your consent.

**Photos, videos and results.** Photos and videos from training and tournament results are published only with the consent of the people concerned; for minors, with a parent's written consent, and results show only the first name and the initial of the surname. On upload, hidden data (such as GPS location) is removed from photos and videos.

**Security.** The IP address of form requests, kept temporarily to limit abuse. Legal basis: legitimate interest in protecting the site.

We do not use your data for advertising, we do not sell it and we do not profile you.

## How long we keep data

- booking data: {{retentie.luni}} months after the lesson, then automatically anonymised;
- contact form messages, assessment requests and waiting list entries: {{retentie.luni}} months, then anonymised;
- accounting documents (invoices, receipts): as long as tax law requires;
- newsletter subscription: until you unsubscribe;
- published photos, videos and results: until you (or the parent) withdraw consent.

## Who else has access

The data is stored on a server rented from a hosting provider in the European Union: [DE COMPLETAT]. Emails are sent through an email provider: [DE COMPLETAT]. Both act as processors under contract and do not use the data for their own purposes. We do not transfer data outside the European Economic Area.

## Your rights

You have the right to access your data, to have it corrected or erased, to restrict processing, to data portability and to object to processing based on legitimate interest. You can withdraw consent at any time, without affecting processing carried out before. Write to us at {{contact.email}} and we will reply within one month.

If you are not satisfied with the answer, you can lodge a complaint with the Romanian data protection authority (ANSPDCP), B-dul G-ral. Gheorghe Magheru 28–30, sector 1, Bucharest, www.dataprotection.ro.

## Cookies

The public site does not use marketing or tracking cookies. Details are in the cookie policy.

## Changes

Version of this policy: {{versiune}}. When we change it, we update the version, and the forms record the version you accepted.`,
    },
  },
  {
    kind: "TERMENI",
    title: { ro: "Termeni și condiții", en: "Terms and conditions" },
    body: {
      ro: `Acești termeni se aplică rezervărilor făcute prin acest site și lecțiilor de tenis oferite de {{entitate.denumire}} ({{entitate.forma}}), CUI {{entitate.cui}}, cu sediul în {{entitate.sediu}}.

## Rezervarea

O rezervare făcută pe site este o cerere. {{rezervare.mod}} Primești pe email confirmarea, cu detaliile lecției și un link personal prin care poți vedea sau anula rezervarea.

Pentru academia de juniori, înscrierea într-o grupă pornește de la o cerere de evaluare făcută pe site. Locul în grupă se confirmă după evaluare, iar taxa lunară și programul grupei sunt cele afișate pe pagina academiei.

## Anularea

Poți anula gratuit din linkul primit pe email până cu {{anulare.ore}} de ore înainte de începerea lecției. După acest termen, anularea nu mai este gratuită; în caz de boală sau de urgență, contactează-ne și căutăm împreună o soluție.

Dacă noi trebuie să anulăm (vreme nepotrivită, teren indisponibil, boala antrenorului), te anunțăm cât mai repede și reprogramăm lecția fără niciun cost pentru tine.

## Plata

Metodele de plată acceptate: {{plata.metode}}. Prețurile sunt afișate pe pagina de prețuri, în lei. Pachetele de lecții sunt valabile numărul de zile menționat la fiecare pachet, de la prima ședință.

## Sănătate și siguranță

Tenisul este o activitate fizică. Participi pe propria răspundere și ne spui înainte de primul antrenament dacă ai probleme de sănătate care pot fi afectate de efort. Pentru minori, părintele confirmă că acest copil poate face sport.

Respectă regulile bazei sportive, poartă încălțăminte potrivită suprafeței și anunță-l imediat pe antrenor dacă te doare ceva în timpul lecției.

## Minori

Rezervările pentru copii se fac de părinte sau de tutorele legal, care este persoana de contact. Dacă un adult trebuie să rămână la bază pe durata lecțiilor copiilor mici: [DE COMPLETAT].

## Fotografii și filmări

Filmările făcute pentru analiza tehnicii sunt folosite doar pentru antrenament. Orice publicare se face numai cu acordul scris al persoanei filmate sau, pentru minori, al părintelui.

## Litigii

Neînțelegerile se rezolvă mai întâi pe cale amiabilă, prin discuție directă. Dacă nu reușim, se aplică legea română, iar competența aparține instanțelor de la sediul operatorului.

Versiunea acestor termeni: {{versiune}}.`,
      en: `These terms apply to bookings made through this website and to the tennis lessons provided by {{entitate.denumire}} ({{entitate.forma}}), tax ID {{entitate.cui}}, registered at {{entitate.sediu}}.

## Booking

A booking made on the site is a request. {{rezervare.mod}} You receive a confirmation by email, with the lesson details and a personal link to view or cancel the booking.

For the junior academy, joining a group starts with an assessment request made on the site. The place in the group is confirmed after the assessment, and the group's monthly fee and schedule are those shown on the academy page.

## Cancellation

You can cancel free of charge from the link in your email up to {{anulare.ore}} hours before the lesson starts. After that, cancellation is no longer free; in case of illness or an emergency, contact us and we will find a solution together.

If we have to cancel (bad weather, court unavailable, the coach's illness), we let you know as soon as possible and we reschedule the lesson at no cost to you.

## Payment

Accepted payment methods: {{plata.metode}}. Prices are shown on the pricing page, in lei (RON). Lesson packages are valid for the number of days stated for each package, from the first session.

## Health and safety

Tennis is physical activity. You take part at your own risk and tell us before the first session about any health condition that exertion may affect. For minors, the parent confirms the child is fit to do sport.

Follow the venue's rules, wear footwear suited to the surface and tell the coach immediately if anything hurts during the lesson.

## Minors

Bookings for children are made by a parent or legal guardian, who is the contact person. Whether an adult must stay at the venue during young children's lessons: [DE COMPLETAT].

## Photos and video

Video recorded for technique analysis is used only for training. Anything published requires the written consent of the person filmed or, for minors, of a parent.

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

Site-ul public nu setează cookie-uri de marketing, de publicitate sau de urmărire. Limba o alegi din adresa paginii, nu dintr-un cookie.

Statisticile de vizitare, dacă sunt activate, se fac cu Umami, un instrument găzduit pe același server, care nu folosește cookie-uri și nu identifică vizitatorii.

Harta locației se încarcă doar când apeși butonul „Arată harta”. Abia atunci browserul tău se conectează la OpenStreetMap, care poate înregistra adresa IP conform propriei politici.

Dacă protecția anti-spam Cloudflare Turnstile este activă pe formulare, aceasta poate folosi date tehnice strict necesare pentru a deosebi oamenii de programele automate.

## În panoul de administrare

Pentru echipa academiei, panoul de administrare folosește un singur cookie strict necesar:

| Cookie | Scop | Durată |
| --- | --- | --- |
| \`sesiune_admin\` | păstrează autentificarea în panoul de administrare | 30 de zile sau până la ieșirea din cont |
| \`__prerender_bypass\` | arată ciornele când echipa previzualizează site-ul | până la ieșirea din previzualizare sau închiderea browserului |

Cookie-urile strict necesare nu au nevoie de consimțământ, conform art. 4 alin. (5) din Legea nr. 506/2004. De aceea site-ul nu afișează un banner de cookie-uri.

## Cum ștergi cookie-urile

Le poți șterge oricând din setările browserului. Site-ul public funcționează la fel și fără ele.

Versiunea acestei politici: {{versiune}}.`,
      en: `A cookie is a small file a website stores in your browser. This site uses as few as possible.

## On the public site

The public site sets no marketing, advertising or tracking cookies. You choose the language through the page address, not through a cookie.

Visitor statistics, when enabled, use Umami, a tool hosted on the same server that uses no cookies and does not identify visitors.

The location map loads only when you press "Show map". Only then does your browser connect to OpenStreetMap, which may log your IP address under its own policy.

If Cloudflare Turnstile anti-spam protection is active on the forms, it may use strictly necessary technical data to tell people from bots.

## In the admin panel

For the academy team, the admin panel uses a single strictly necessary cookie:

| Cookie | Purpose | Duration |
| --- | --- | --- |
| \`sesiune_admin\` | keeps you signed in to the admin panel | 30 days or until you sign out |
| \`__prerender_bypass\` | shows drafts while the team previews the site | until preview ends or the browser closes |

Strictly necessary cookies do not require consent under Article 4(5) of Romanian Law 506/2004. That is why the site shows no cookie banner.

## How to delete cookies

You can delete them at any time in your browser settings. The public site works the same without them.

Version of this policy: {{versiune}}.`,
    },
  },
];
