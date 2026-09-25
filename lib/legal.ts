import type { LocalizedSettings } from "./content";

/** What the site actually runs, so the legal texts describe only the tools in use. */
export type LegalFeatures = {
  /** The AI assistant is on (switched on and an API key on the server). */
  assistant: boolean;
  /** Google Analytics, with the statistics consent. */
  analytics: boolean;
  /** Google Ads conversion measurement, with the marketing consent. */
  googleAds: boolean;
  /** The Meta Pixel, with the marketing consent. */
  metaPixel: boolean;
};

const NO_FEATURES: LegalFeatures = {
  assistant: false,
  analytics: false,
  googleAds: false,
  metaPixel: false,
};

function list(items: string[], and: string): string {
  return items.length <= 1
    ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} ${and} ${items.at(-1)}`;
}

/** The paragraphs that depend on which assistant, statistics and advertising tools are on. */
function featureBlocks(f: LegalFeatures, en: boolean): Record<string, string> {
  const ads = [f.googleAds ? "Google Ads" : null, f.metaPixel ? "Meta" : null].filter(
    (x): x is string => x !== null,
  );
  const tracking = f.analytics || ads.length > 0;
  const processors = [
    f.assistant
      ? en
        ? "Anthropic PBC (USA) writes the assistant's answers."
        : "Anthropic PBC (SUA) generează răspunsurile asistentului."
      : null,
    f.analytics || f.googleAds
      ? en
        ? "Google Ireland Limited provides the statistics and the ad measurement, only with your consent."
        : "Google Ireland Limited asigură statisticile și măsurarea reclamelor, doar cu acordul tău."
      : null,
    f.metaPixel
      ? en
        ? "Meta Platforms Ireland Limited measures the Facebook and Instagram ads, only with your consent."
        : "Meta Platforms Ireland Limited măsoară reclamele de pe Facebook și Instagram, doar cu acordul tău."
      : null,
  ].filter((x): x is string => x !== null);
  const abroad = [
    f.assistant ? "Anthropic" : null,
    f.analytics || f.googleAds ? "Google" : null,
    f.metaPixel ? "Meta" : null,
  ].filter((x): x is string => x !== null);

  const cookieRows = [
    en
      ? "| `cookie_consent` | this site | remembers your cookie choice | 6 months |"
      : "| `cookie_consent` | site-ul | ține minte alegerea ta despre cookie-uri | 6 luni |",
    f.analytics
      ? en
        ? "| `_ga`, `_ga_*` | Google Analytics (statistics) | tells visits apart, under a pseudonymous ID | 2 years |"
        : "| `_ga`, `_ga_*` | Google Analytics (statistici) | deosebește vizitele, cu un identificator pseudonim | 2 ani |"
      : null,
    f.googleAds
      ? en
        ? "| `_gcl_au` | Google Ads (marketing) | links a visit to the ad that was clicked | 90 days |"
        : "| `_gcl_au` | Google Ads (marketing) | leagă vizita de reclama pe care s-a dat clic | 90 de zile |"
      : null,
    f.metaPixel
      ? en
        ? "| `_fbp`, `_fbc` | Meta Pixel (marketing) | measures the ads on Facebook and Instagram | 90 days |"
        : "| `_fbp`, `_fbc` | Meta Pixel (marketing) | măsoară reclamele de pe Facebook și Instagram | 90 de zile |"
      : null,
    f.analytics
      ? en
        ? "| `attribution` (session storage) | this site | remembers where the visit came from, with the statistics consent | until the tab is closed |"
        : "| `attribution` (memoria de sesiune) | site-ul | ține minte de unde a venit vizita, cu acordul pentru statistici | până închizi fila |"
      : null,
  ].filter((x): x is string => x !== null);

  return {
    "sectiune.asistent": f.assistant
      ? en
        ? "**The site's assistant.** The questions you type into the assistant are sent, together with the club's public information, to Anthropic PBC (USA), whose artificial intelligence model writes the answer. We do not store the conversations: they stay in your browser window and are gone when you close the page. Please do not type personal data there. Legal basis: legitimate interest in answering questions about the club quickly (Art. 6(1)(f))."
        : "**Asistentul de pe site.** Întrebările pe care le scrii în asistent sunt trimise, împreună cu informațiile publice ale clubului, către Anthropic PBC (SUA), al cărei model de inteligență artificială scrie răspunsul. Nu păstrăm conversațiile: rămân doar în fereastra ta și dispar când închizi pagina. Te rugăm să nu scrii acolo date personale. Temei: interesul legitim de a răspunde repede la întrebările despre club (art. 6 alin. 1 lit. f)."
      : "",
    "sectiune.campanii": [
      en
        ? "**Where the visit came from.** With a booking, an assessment request or a message we also store where you reached the site from (for example “Google, search” or the name of a campaign), with no other data about you. It shows us which channels and ads bring players. Legal basis: legitimate interest (Art. 6(1)(f))."
        : "**Sursa vizitei.** Odată cu o rezervare, o cerere de evaluare sau un mesaj salvăm și de unde ai ajuns pe site (de exemplu „Google, căutare” sau numele unei campanii), fără alte date despre tine. Așa aflăm ce canale și ce reclame ne aduc elevi. Temei: interesul legitim (art. 6 alin. 1 lit. f).",
      f.analytics
        ? en
          ? "**Statistics (Google Analytics), only with your consent.** If you accept the statistics cookies, Google Analytics records the pages visited, how long the visit lasted, the type of device and the approximate town, under a pseudonymous identifier. Legal basis: your consent (Art. 6(1)(a)), which you can withdraw at any time from “Cookie settings” at the bottom of the page."
          : "**Statistici (Google Analytics), doar cu acordul tău.** Dacă accepți cookie-urile de statistică, Google Analytics înregistrează paginile vizitate, durata vizitei, tipul dispozitivului și orașul aproximativ, cu un identificator pseudonim. Temei: consimțământul tău (art. 6 alin. 1 lit. a), pe care îl poți retrage oricând din „Setări cookie-uri”, în subsolul paginii."
        : "",
      ads.length > 0
        ? en
          ? `**Ad measurement (${list(ads, "and")}), only with your consent.** If you accept the marketing cookies, ${list(ads, "and")} learn that you reached the site from one of our ads and whether you sent a booking or a request, without your name or contact details. Legal basis: your consent, which you can withdraw at any time.`
          : `**Măsurarea reclamelor (${list(ads, "și")}), doar cu acordul tău.** Dacă accepți cookie-urile de marketing, ${list(ads, "și")} află că ai ajuns pe site dintr-o reclamă de-a noastră și dacă ai trimis o rezervare sau o cerere, fără numele sau datele tale de contact. Temei: consimțământul tău, pe care îl poți retrage oricând.`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    publicitate:
      ads.length > 0
        ? en
          ? "We do not sell your data and we do not profile you."
          : "Nu vindem datele tale și nu facem profilare."
        : en
          ? "We do not use your data for advertising, we do not sell it and we do not profile you."
          : "Nu folosim datele tale pentru publicitate, nu le vindem și nu facem profilare.",
    "furnizori.extra": processors.join(" "),
    transfer:
      abroad.length > 0
        ? en
          ? `${list(abroad, "and")} may also process data in the USA; such transfers rely on the EU–US Data Privacy Framework or on the European Commission's standard contractual clauses.`
          : `${list(abroad, "și")} pot prelucra date și în SUA; transferul se face pe baza Cadrului UE–SUA privind protecția datelor sau a clauzelor contractuale standard ale Comisiei Europene.`
        : en
          ? "We do not transfer data outside the European Economic Area."
          : "Nu transferăm date în afara Spațiului Economic European.",
    "cookies.rezumat": tracking
      ? en
        ? "Statistics and marketing cookies are used only with your consent, which you can change at any time from “Cookie settings” at the bottom of the page. Details are in the cookie policy."
        : "Cookie-urile de statistică și de marketing se folosesc doar cu acordul tău, pe care îl poți schimba oricând din „Setări cookie-uri”, în subsolul paginii. Detaliile sunt în politica de cookie-uri."
      : en
        ? "The public site does not use marketing or tracking cookies. Details are in the cookie policy."
        : "Site-ul public nu folosește cookie-uri de marketing sau de urmărire. Detaliile sunt în politica de cookie-uri.",
    "cookies.public": tracking
      ? [
          en
            ? "The site works without tracking cookies. On your first visit we ask whether you accept the statistics and marketing cookies; until you accept, no Google or Meta script is loaded. You can change your choice at any time from “Cookie settings” at the bottom of the page. You choose the language through the page address, not through a cookie."
            : "Site-ul funcționează fără cookie-uri de urmărire. La prima vizită te întrebăm dacă accepți cookie-urile de statistică și de marketing; până nu accepți, nu se încarcă niciun script Google sau Meta. Alegerea o poți schimba oricând din „Setări cookie-uri”, în subsolul paginii. Limba o alegi din adresa paginii, nu dintr-un cookie.",
          en
            ? "| Cookie | Set by | Purpose | Duration |\n| --- | --- | --- | --- |"
            : "| Cookie | Cine îl setează | Scop | Durată |\n| --- | --- | --- | --- |",
        ].join("\n\n") + `\n${cookieRows.join("\n")}`
      : en
        ? "The public site sets no marketing, advertising or tracking cookies. You choose the language through the page address, not through a cookie."
        : "Site-ul public nu setează cookie-uri de marketing, de publicitate sau de urmărire. Limba o alegi din adresa paginii, nu dintr-un cookie.",
    "cookies.consimtamant": tracking
      ? en
        ? "Strictly necessary cookies (your cookie choice and the admin panel's) do not require consent under Article 4(5) of Romanian Law 506/2004. Statistics and marketing cookies are used only after you accept them."
        : "Cookie-urile strict necesare (alegerea ta despre cookie-uri și cele din panoul de administrare) nu au nevoie de consimțământ, conform art. 4 alin. (5) din Legea nr. 506/2004. Cele de statistică și de marketing se folosesc doar după ce le accepți."
      : en
        ? "Strictly necessary cookies do not require consent under Article 4(5) of Romanian Law 506/2004. That is why the site shows no cookie banner."
        : "Cookie-urile strict necesare nu au nevoie de consimțământ, conform art. 4 alin. (5) din Legea nr. 506/2004. De aceea site-ul nu afișează un banner de cookie-uri.",
  };
}

/** Fills the {{…}} placeholders of the legal drafts with the current settings. */
export function fillLegalTemplate(
  body: string,
  settings: LocalizedSettings,
  version: string,
  locale: string,
  retentionMonths: number,
  features: LegalFeatures = NO_FEATURES,
): string {
  const bookingMode =
    settings.bookingMode === "INSTANT"
      ? locale === "en"
        ? "It is confirmed automatically."
        : "Se confirmă automat."
      : locale === "en"
        ? "We confirm it by email, usually the same day."
        : "O confirmăm pe email, de obicei în aceeași zi.";
  const values: Record<string, string> = {
    "entitate.denumire": settings.legalName,
    "entitate.forma": settings.legalForm,
    "entitate.cui": settings.legalCui,
    "entitate.sediu": settings.legalAddress,
    "contact.email": settings.email,
    "contact.telefon": settings.phone,
    "retentie.luni": String(retentionMonths),
    "anulare.ore": String(settings.freeCancelHours),
    "plata.metode": settings.paymentMethods.join(", ").toLowerCase(),
    "rezervare.mod": bookingMode,
    versiune: version,
    ...featureBlocks(features, locale === "en"),
  };
  return body
    .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key: string) => values[key] ?? match)
    .replace(/\n{3,}/g, "\n\n");
}
