import type { FacilityType } from "../../../lib/generated/prisma/client";

type T = { ro: string; en: string };

export const pageHeaderContent: {
  key: string;
  title: T;
  intro: T;
  seoTitle?: T;
  seoDescription: T;
}[] = [
  {
    key: "programe",
    title: {
      ro: "Programe de tenis pentru copii și adulți",
      en: "Tennis programmes for children and adults",
    },
    intro: {
      ro: "Inițiere, competiție, înaltă performanță, amatori, tabere și team building, plus grupele de minitenis, juniori și seniori. Totul pe zgură, cu antrenorii clubului.",
      en: "Beginners, competition, high performance, recreational, camps and team building, plus the mini tennis, junior and senior groups. All on clay, with the club's coaches.",
    },
    seoTitle: {
      ro: "Cursuri de tenis pentru copii și adulți în Pantelimon",
      en: "Tennis courses for children and adults in Pantelimon",
    },
    seoDescription: {
      ro: "Cursuri de tenis la Clubul Tenis Elite Pantelimon: minitenis de la 4 ani, juniori, adulți, performanță și tabere. Primele 2 ședințe gratuite pentru copii.",
      en: "Tennis courses at Clubul Tenis Elite, Pantelimon: mini tennis from 4, juniors, adults, high performance and camps. The first 2 sessions free for children.",
    },
  },
  {
    key: "inchiriere",
    title: { ro: "Închiriere teren de tenis", en: "Tennis court hire" },
    intro: {
      ro: "Opt terenuri de zgură în Pantelimon, patru acoperite și patru în aer liber, deschise zilnic între 07:00 și 22:00. Iarna, orice teren costă doar 60 de lei pe oră.",
      en: "Eight clay courts in Pantelimon, four covered and four outdoors, open every day from 07:00 to 22:00. In winter, any court costs just 60 lei an hour.",
    },
    seoTitle: {
      ro: "Închiriere teren tenis Pantelimon: zgură, 60 lei/oră iarna",
      en: "Tennis court hire in Pantelimon: clay, 60 lei an hour in winter",
    },
    seoDescription: {
      ro: "Închiriază un teren de tenis de zgură la Clubul Tenis Elite Pantelimon: 8 terenuri, 4 acoperite, iarna 60 lei/oră. Deschis zilnic 07:00–22:00.",
      en: "Hire a clay tennis court at Clubul Tenis Elite, Pantelimon: 8 courts, 4 covered, 60 lei an hour in winter. Open daily 07:00–22:00.",
    },
  },
  {
    key: "turnee",
    title: {
      ro: "Turnee de tenis la Clubul Tenis Elite",
      en: "Tennis tournaments at Clubul Tenis Elite",
    },
    intro: {
      ro: "Pe terenurile clubului se joacă turnee ale Federației Române de Tenis și Tenis10. Aici găsești edițiile următoare, cu înscrierea, și turneele pe care le găzduim.",
      en: "Romanian Tennis Federation and Tenis10 tournaments are played on the club's courts. Here you find the next editions, with registration, and the tournaments we host.",
    },
    seoTitle: {
      ro: "Turnee de tenis în Pantelimon: FRT și Tenis10 pentru copii",
      en: "Tennis tournaments in Pantelimon: FRT and Tenis10 for children",
    },
    seoDescription: {
      ro: "Turneele de tenis găzduite de Clubul Tenis Elite din Pantelimon: Cupa Elite, competiții ale Federației Române de Tenis și turnee Tenis10 pentru copii.",
      en: "The tennis tournaments hosted by Clubul Tenis Elite in Pantelimon: the Elite Cup, Romanian Tennis Federation events and Tenis10 tournaments for children.",
    },
  },
  {
    key: "echipa",
    title: { ro: "Antrenorii clubului", en: "The club's coaches" },
    intro: {
      ro: "Șase antrenori, o singură idee: tenisul se învață simplu, cu joc, răbdare și multe mingi lovite. Fiecare grupă are antrenorul ei.",
      en: "Six coaches, one idea: tennis is learnt simply, with play, patience and plenty of balls hit. Every group has its own coach.",
    },
    seoTitle: {
      ro: "Antrenori de tenis în Pantelimon, pentru copii și adulți",
      en: "Tennis coaches in Pantelimon, for children and adults",
    },
    seoDescription: {
      ro: "Antrenorii Clubului Tenis Elite din Pantelimon: minitenis, juniori, seniori și înaltă performanță, coordonați de antrenorul principal Vlad Moșteanu.",
      en: "The coaching team of Clubul Tenis Elite in Pantelimon: mini tennis, junior, senior and high-performance groups, led by head coach Vlad Moșteanu.",
    },
  },
  {
    key: "facilitati",
    title: { ro: "Baza sportivă și facilitățile", en: "The venue and facilities" },
    intro: {
      ro: "Opt terenuri de zgură, dintre care patru acoperite profesional, vestiare cu dușuri, sală de fitness, recepție cu magazin și parcare. Totul într-un singur loc, în Pantelimon.",
      en: "Eight clay courts, four of them professionally covered, changing rooms with showers, a fitness room, a reception with a shop and parking. All in one place, in Pantelimon.",
    },
    seoTitle: {
      ro: "Terenuri de tenis de zgură acoperite în Pantelimon",
      en: "Covered clay tennis courts in Pantelimon",
    },
    seoDescription: {
      ro: "Clubul Tenis Elite Pantelimon: 8 terenuri de zgură, 4 acoperite tot anul, vestiare cu dușuri, sală de fitness, recepție cu magazin și parcare.",
      en: "Clubul Tenis Elite, Pantelimon: 8 clay courts, 4 covered all year, changing rooms with showers, a fitness room, a reception with a shop and parking.",
    },
  },
  {
    key: "preturi",
    title: { ro: "Prețuri", en: "Prices" },
    intro: {
      ro: "Închirierea terenurilor, antrenamentele și ofertele clubului. Iarna, orice teren de zgură costă doar 60 de lei pe oră.",
      en: "Court hire, training sessions and the club's offers. In winter, any clay court costs just 60 lei an hour.",
    },
    seoTitle: {
      ro: "Prețuri tenis Pantelimon: teren 60 lei/oră iarna, antrenamente",
      en: "Tennis prices in Pantelimon: courts 60 lei an hour in winter, training",
    },
    seoDescription: {
      ro: "Prețuri la Clubul Tenis Elite Pantelimon: teren de zgură 60 lei/oră iarna, antrenamente individuale, în 2, în 3 și de grup; copiii au 2 ședințe gratuite.",
      en: "Prices at Clubul Tenis Elite, Pantelimon: clay courts at 60 lei an hour in winter; private, pair, three-player and group sessions; 2 free sessions for kids.",
    },
  },
  {
    key: "rezervare",
    title: { ro: "Rezervă un antrenament", en: "Book a session" },
    intro: {
      ro: "Alegi programul, tipul antrenamentului și durata, apoi ziua și ora. Confirmarea vine pe email.",
      en: "Choose the programme, the kind of session and its length, then the day and time. The confirmation comes by email.",
    },
    seoTitle: {
      ro: "Rezervă online un antrenament de tenis în Pantelimon",
      en: "Book a tennis session online in Pantelimon",
    },
    seoDescription: {
      ro: "Vezi orele libere și rezervă online un antrenament de tenis la Clubul Tenis Elite din Pantelimon, pentru copii sau adulți, de 60, 90 sau 120 de minute.",
      en: "See the free times and book a tennis session online at Clubul Tenis Elite in Pantelimon, for children or adults, of 60, 90 or 120 minutes.",
    },
  },
  {
    key: "galerie",
    title: { ro: "Galerie", en: "Gallery" },
    intro: {
      ro: "Imagini de pe terenurile clubului, de la antrenamente și de la turnee. Le publicăm doar cu acordul celor din imagini.",
      en: "Pictures from the club's courts, from training and from tournaments. We publish them only with the consent of the people in them.",
    },
    seoDescription: {
      ro: "Fotografii și video-uri de la antrenamentele și turneele Clubului Tenis Elite din Pantelimon.",
      en: "Photos and videos from the training and tournaments of Clubul Tenis Elite in Pantelimon.",
    },
  },
  {
    key: "sfaturi",
    title: { ro: "Sfaturi de tenis", en: "Tennis tips" },
    intro: {
      ro: "Articole scurte despre echipament, primii pași și tenisul copiilor, scrise de antrenorii clubului.",
      en: "Short articles on equipment, first steps and children's tennis, written by the club's coaches.",
    },
    seoDescription: {
      ro: "Sfaturi practice de tenis de la antrenorii Clubului Tenis Elite: rachete pentru copii, pantofi pentru zgură, primii pași ca adult.",
      en: "Practical tennis tips from the coaches of Clubul Tenis Elite: racquets for children, clay-court shoes, first steps as an adult.",
    },
  },
  {
    key: "intrebari",
    title: { ro: "Întrebări frecvente", en: "Frequently asked questions" },
    intro: {
      ro: "Ce ne întreabă oamenii cel mai des înainte de primul antrenament. Dacă nu găsești răspunsul, sună-ne sau întreabă asistentul clubului.",
      en: "What people ask us most often before their first session. If you cannot find the answer, call us or ask the club's assistant.",
    },
    seoDescription: {
      ro: "Vârsta de început, echipament, grupe, vreme, anulare și plată: răspunsuri despre tenisul la Clubul Tenis Elite din Pantelimon.",
      en: "Starting age, equipment, groups, weather, cancellation and payment: answers about tennis at Clubul Tenis Elite in Pantelimon.",
    },
  },
  {
    key: "contact",
    title: { ro: "Contact", en: "Contact" },
    intro: {
      ro: "Sună-ne la 0722 501 748, scrie-ne pe WhatsApp sau lasă-ne un mesaj aici. Ne găsești pe Bulevardul Biruinței 19/21, în Pantelimon.",
      en: "Call us on 0722 501 748, message us on WhatsApp or leave us a note here. You will find us at Bulevardul Biruinței 19/21, Pantelimon.",
    },
    seoTitle: {
      ro: "Contact Clubul Tenis Elite Pantelimon: 0722 501 748",
      en: "Contact Clubul Tenis Elite, Pantelimon: 0722 501 748",
    },
    seoDescription: {
      ro: "Clubul Tenis Elite, Bulevardul Biruinței 19/21, Pantelimon. Telefon și WhatsApp 0722 501 748, email elite_tenis_club@yahoo.ro. Deschis zilnic 07:00–22:00.",
      en: "Clubul Tenis Elite, Bulevardul Biruinței 19/21, Pantelimon, Ilfov. Phone and WhatsApp 0722 501 748, email elite_tenis_club@yahoo.ro. Open daily 07:00–22:00.",
    },
  },
  {
    key: "lista-asteptare",
    title: { ro: "Lista de așteptare", en: "Waiting list" },
    intro: {
      ro: "Nu găsești o oră potrivită? Lasă-ne datele și zilele care îți convin; te sunăm când se eliberează un loc.",
      en: "Can't find a time that suits you? Leave us your details and the days that work; we will call when a place opens up.",
    },
    seoDescription: {
      ro: "Înscrie-te pe lista de așteptare pentru antrenamentele de tenis de la Clubul Tenis Elite din Pantelimon.",
      en: "Join the waiting list for tennis sessions at Clubul Tenis Elite in Pantelimon.",
    },
  },
  {
    key: "scoli",
    title: { ro: "Tenis pentru școli și grădinițe", en: "Tennis for schools and kindergartens" },
    intro: {
      ro: "De peste zece ani aducem tenisul în școli și grădinițe din București și Ilfov. Copiii învață prin joc, cu echipament pe măsura lor, pe terenuri acoperite care nu depind de vreme.",
      en: "For more than ten years we have brought tennis to schools and kindergartens in Bucharest and Ilfov. Children learn through play, with equipment their size, on covered courts that do not depend on the weather.",
    },
    seoTitle: {
      ro: "Tenis pentru școli și grădinițe în București și Ilfov",
      en: "Tennis for schools and kindergartens in Bucharest and Ilfov",
    },
    seoDescription: {
      ro: "Programe de tenis pentru școli și grădinițe la Clubul Tenis Elite din Pantelimon: minitenis, echipament adaptat inclus și terenuri acoperite tot anul.",
      en: "Tennis programmes for schools and kindergartens at Clubul Tenis Elite in Pantelimon: mini tennis, adapted equipment included and courts covered all year.",
    },
  },
  {
    key: "card-cadou",
    title: { ro: "Oferă un antrenament de tenis", en: "Give a tennis session" },
    intro: {
      ro: "Un card cadou pentru un antrenament, un pachet de antrenamente sau o sumă la alegere, la Clubul Tenis Elite. Pentru copii și adulți, începători sau jucători care vor să urce un nivel.",
      en: "A gift card for a session, a pack of sessions or an amount of your choice at Clubul Tenis Elite. For children and adults, beginners or players who want to move up a level.",
    },
    seoTitle: {
      ro: "Card cadou tenis: oferă un antrenament de tenis în Pantelimon",
      en: "Tennis gift card: give a tennis session in Pantelimon",
    },
    seoDescription: {
      ro: "Oferă un antrenament de tenis la Clubul Tenis Elite din Pantelimon: card cadou pentru un antrenament, un pachet sau o sumă, valabil un an, gata de tipărit.",
      en: "Give a tennis session at Clubul Tenis Elite in Pantelimon: a gift card for a session, a pack or an amount, valid for a year, ready to print.",
    },
  },
  {
    key: "liga",
    title: { ro: "Liga amatorilor", en: "The amateur league" },
    intro: {
      ro: "Meciuri de simplu cu jucători de nivelul tău, pe zgura clubului, cu clasament și un campion la fiecare sezon. Pentru adulții care vor să joace, nu doar să se antreneze.",
      en: "Singles matches with players of your level, on the club's clay, with a table and a champion every season. For adults who want to play matches, not just practise.",
    },
    seoTitle: {
      ro: "Liga de tenis pentru amatori în Pantelimon",
      en: "Amateur tennis league in Pantelimon",
    },
    seoDescription: {
      ro: "Liga amatorilor de la Clubul Tenis Elite din Pantelimon: meciuri de simplu pe niveluri, clasament actualizat și înscriere online.",
      en: "The amateur league at Clubul Tenis Elite in Pantelimon: singles matches by level, an up-to-date table and online sign-up.",
    },
  },
  {
    key: "partener",
    title: { ro: "Găsește partener de joc", en: "Find a hitting partner" },
    intro: {
      ro: "Vrei să joci, dar n-ai cu cine? Lasă-ne nivelul tău și când joci, iar noi te punem în legătură cu jucători potriviți. Terenul îl rezervi la club.",
      en: "Want to play but have nobody to play with? Tell us your level and when you play, and we will put you in touch with the right players. Book the court with the club.",
    },
    seoTitle: {
      ro: "Partener de tenis în Pantelimon și estul Bucureștiului",
      en: "Tennis partner in Pantelimon and east Bucharest",
    },
    seoDescription: {
      ro: "Găsește un partener de tenis de nivelul tău la Clubul Tenis Elite din Pantelimon: jucători amatori pe niveluri, contact prin club.",
      en: "Find a tennis partner of your level at Clubul Tenis Elite in Pantelimon: amateur players by level, contact through the club.",
    },
  },
  {
    key: "palmares",
    title: { ro: "Palmaresul clubului", en: "The club's honours" },
    intro: {
      ro: "Rezultatele sportivilor noștri, turneele jucate pe terenurile clubului și campionii ligii amatorilor. Fiecare podium începe cu primul antrenament.",
      en: "Our players' results, the tournaments played on the club's courts and the amateur league champions. Every podium starts with the first practice.",
    },
    seoTitle: {
      ro: "Palmaresul Clubului Tenis Elite: rezultate și turnee",
      en: "Clubul Tenis Elite honours: results and tournaments",
    },
    seoDescription: {
      ro: "Palmaresul Clubului Tenis Elite din Pantelimon: rezultatele sportivilor, turneele FRT și Tenis10 găzduite și campionii ligii amatorilor.",
      en: "The honours of Clubul Tenis Elite in Pantelimon: the players' results, the FRT and Tenis10 tournaments hosted and the amateur league champions.",
    },
  },
];

export const serviceDescriptions: Record<
  string,
  { type: FacilityType; name: T; description: T; illustration: string }
> = {
  "Evaluare la prima ședință și grupă potrivită vârstei și nivelului": {
    type: "SERVICIU_ANTRENOR",
    name: {
      ro: "Grupa potrivită, de la prima ședință",
      en: "The right group, from the first session",
    },
    description: {
      ro: "La prima ședință antrenorul vede cum lovești și cum te miști, apoi îți recomandă grupa potrivită vârstei și nivelului tău.",
      en: "At the first session the coach sees how you hit and move, then recommends the group that fits your age and level.",
    },
    illustration: "plan",
  },
  "Rachete și mingi pentru începători": {
    type: "ECHIPAMENT",
    name: { ro: "Rachete și mingi pentru începători", en: "Racquets and balls for beginners" },
    description: {
      ro: "La început nu ai nevoie de echipament: clubul are rachete de toate mărimile și mingi potrivite fiecărei etape, de la mingea roșie la cea galbenă.",
      en: "You need no equipment to start: the club has racquets in every size and the right balls for every stage, from red to yellow.",
    },
    illustration: "racheta",
  },
  "Pregătire pentru turneele Federației Române de Tenis și Tenis10": {
    type: "SERVICIU_ANTRENOR",
    name: { ro: "Pregătire pentru turnee", en: "Tournament preparation" },
    description: {
      ro: "Pentru jucătorii care concurează: calendarul turneelor FRT și Tenis10, pregătirea meciurilor și turnee jucate chiar pe terenurile clubului.",
      en: "For players who compete: the FRT and Tenis10 tournament calendar, match preparation and tournaments played on the club's own courts.",
    },
    illustration: "turnee",
  },
};

export const amenityNames: Record<string, T> = {
  vestiare: { ro: "Vestiare", en: "Changing rooms" },
  dușuri: { ro: "Dușuri", en: "Showers" },
  parcare: { ro: "Parcare", en: "Parking" },
  "sală de fitness": { ro: "Sală de fitness", en: "Fitness room" },
  "recepție și magazin": { ro: "Recepție și magazin", en: "Reception and shop" },
};

/** How the club presents its amenities. */
export const amenityDescriptions: Record<string, T> = {
  vestiare: {
    ro: "Vestiare separate pentru femei și bărbați, curate și încălzite iarna, cu toalete și spațiu pentru echipament.",
    en: "Separate changing rooms for women and men, clean and heated in winter, with toilets and room for your kit.",
  },
  dușuri: {
    ro: "Dușuri cu apă caldă după fiecare antrenament, ca să pleci direct la birou sau acasă.",
    en: "Hot showers after every session, so you can go straight to the office or home.",
  },
  parcare: {
    ro: "Parcare chiar la club: vii cu mașina, lași bagajul și ești pe teren în două minute.",
    en: "Parking right at the club: drive in, drop your bag and be on court in two minutes.",
  },
  "sală de fitness": {
    ro: "Sală de fitness echipată, pentru încălzire, pregătirea fizică a juniorilor și antrenamentele de forță ale adulților.",
    en: "An equipped fitness room for warming up, juniors' conditioning and adults' strength training.",
  },
  "recepție și magazin": {
    ro: "Recepția te întâmpină și îți confirmă terenul; în magazin găsești mingi, accesorii de tenis și răcoritoare.",
    en: "Reception welcomes you and confirms your court; the shop has balls, tennis accessories and refreshments.",
  },
};

/** Services from the config that need a fixed name. */
export const conditionalServices: Record<string, T> = {};

/**
 * The reviews published on the club's own site (elitetenisclub.ro/testimonials), with the
 * authors' names as they appear there.
 */
export const clubTestimonials: {
  id: string;
  author: string;
  role: T;
  text: T;
  published: boolean;
}[] = [
  {
    id: "seed-testimonial-01",
    author: "Adrian M.",
    role: { ro: "Profesor", en: "Teacher" },
    text: {
      ro: "Fetele mele gemene de 5 ani sunt la începutul călătoriei lor în tenis, și acest club a fost alegerea perfectă pentru ele. Antrenorii sunt răbdători și pricepuți, iar fiecare antrenament este plin de zâmbete și entuziasm.",
      en: "My five-year-old twin girls are at the start of their tennis journey, and this club was the perfect choice for them. The coaches are patient and skilled, and every session is full of smiles and enthusiasm.",
    },
    published: true,
  },
  {
    id: "seed-testimonial-02",
    author: "Cristian",
    role: { ro: "Manager firmă", en: "Company manager" },
    text: {
      ro: "Am participat la competițiile organizate de acest club și am fost impresionat de nivelul lor de organizare și profesionalism. Sunt un club care se preocupă cu adevărat de dezvoltarea tenisului la toate nivelurile.",
      en: "I have taken part in the competitions this club organises and was impressed by how well organised and professional they are. They are a club that truly cares about developing tennis at every level.",
    },
    published: true,
  },
];

/** How to find the club, on the contact page and in the location details. */
export const locationDirections: T = {
  ro: "Clubul este pe Bulevardul Biruinței 19/21, în Pantelimon, la câteva minute de sectoarele 2 și 3 ale Bucureștiului. Ai parcare la club, iar recepția te îndrumă spre teren.",
  en: "The club is at Bulevardul Biruinței 19/21 in Pantelimon, a few minutes from Bucharest's sectors 2 and 3. There is parking at the club, and reception shows you to your court.",
};

/**
 * The home page's title and description for Google. What people type first ("tenis Pantelimon",
 * "teren de zgură"), then the club's name; the description leads with the offers. Both stay within
 * the admin's limits (70 and 160 characters), so the club can save the settings without editing
 * them first — tests/unit/seed-limits.test.ts checks it.
 */
export function homeSeo(city: string, clubName: string, covered: number) {
  return {
    seoTitle: {
      ro: `Tenis ${city}: cursuri și teren de zgură · ${clubName}`,
      en: `Tennis in ${city}: lessons and clay courts · ${clubName}`,
    },
    seoDescription: {
      ro: `8 terenuri de zgură în ${city}, ${covered} acoperite, 07:00–22:00. Tenis de la 4 ani, juniori și adulți. Iarna 60 lei/oră; copiii au 2 ședințe gratuite.`,
      en: `8 clay courts in ${city}, ${covered} covered, open 07:00–22:00. Tennis from age 4, juniors and adults. Winter courts 60 lei/hour; 2 free sessions for kids.`,
    },
  };
}
