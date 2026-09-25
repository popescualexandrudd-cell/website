import type { FacilityType } from "../../../lib/generated/prisma/client";
import { TODO } from "../config";

type T = { ro: string; en: string };

export const pageHeaderContent: {
  key: string;
  title: T;
  intro: T;
  seoTitle?: T;
  seoDescription: T;
}[] = [
  {
    key: "inchiriere",
    title: { ro: "Închiriere teren de tenis", en: "Tennis court hire" },
    intro: {
      ro: "Opt terenuri de zgură în Pantelimon, patru acoperite profesional și patru în aer liber. Clubul e deschis zilnic, de dimineața până seara: suni, alegi ora și vii să joci.",
      en: "Eight clay courts in Pantelimon, four professionally covered and four outdoors. The club is open every day, from morning to night: call, pick a time and come and play.",
    },
    seoTitle: {
      ro: "Închiriere teren tenis Pantelimon: zgură, acoperit tot anul",
      en: "Tennis court hire in Pantelimon: clay, covered all year",
    },
    seoDescription: {
      ro: "Închiriază un teren de tenis la Elite Tenis Club Pantelimon: 8 terenuri de zgură, 4 acoperite tot anul, cu nocturnă, vestiare și dușuri. Deschis zilnic 08:00–01:00.",
      en: "Hire a tennis court at Elite Tenis Club Pantelimon: 8 clay courts, 4 covered all year, floodlights, changing rooms and showers. Open daily 08:00–01:00.",
    },
  },
  {
    key: "turnee",
    title: { ro: "Turnee la Elite Tenis Club", en: "Tournaments at Elite Tenis Club" },
    intro: {
      ro: "Pe terenurile clubului se joacă turnee ale Federației Române de Tenis și Tenis10. Aici găsești edițiile următoare, cu înscrierea, și turneele pe care le găzduim.",
      en: "Romanian Tennis Federation and Tenis10 tournaments are played on the club's courts. Here you find the next editions, with registration, and the tournaments we host.",
    },
    seoTitle: {
      ro: "Turnee de tenis în Pantelimon: FRT și Tenis10 pentru copii",
      en: "Tennis tournaments in Pantelimon: FRT and Tenis10 for children",
    },
    seoDescription: {
      ro: "Turneele de tenis găzduite la Elite Tenis Club Pantelimon: Cupa Elite, competiții ale Federației Române de Tenis și turnee Tenis10 pentru copii.",
      en: "The tennis tournaments hosted at Elite Tenis Club Pantelimon: the Elite Cup, Romanian Tennis Federation events and Tenis10 tournaments for children.",
    },
  },
  {
    key: "card-cadou",
    title: { ro: "Oferă o lecție de tenis", en: "Give a tennis lesson" },
    intro: {
      ro: "Un card cadou pentru o lecție, un pachet de lecții sau o sumă la alegere, la Elite Tenis Club. Pentru copii și adulți, începători sau jucători care vor să urce un nivel.",
      en: "A gift card for a lesson, a pack of lessons or an amount of your choice at Elite Tenis Club. For children and adults, beginners or players who want to move up a level.",
    },
    seoTitle: {
      ro: "Card cadou tenis: oferă o lecție de tenis în Pantelimon",
      en: "Tennis gift card: give a tennis lesson in Pantelimon",
    },
    seoDescription: {
      ro: "Oferă o lecție de tenis la Elite Tenis Club Pantelimon: card cadou pentru o lecție, un pachet sau o sumă, valabil un an, gata de tipărit.",
      en: "Give a tennis lesson at Elite Tenis Club Pantelimon: a gift card for one lesson, a pack or an amount, valid for a year, ready to print.",
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
      ro: "Liga amatorilor de la Elite Tenis Club Pantelimon: meciuri de simplu pe niveluri, clasament actualizat și înscriere online.",
      en: "The amateur league at Elite Tenis Club Pantelimon: singles matches by level, an up-to-date table and online sign-up.",
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
      ro: "Găsește un partener de tenis de nivelul tău la Elite Tenis Club Pantelimon: jucători amatori pe niveluri, contact prin club.",
      en: "Find a tennis partner of your level at Elite Tenis Club Pantelimon: amateur players by level, contact through the club.",
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
      ro: "Palmares Elite Tenis Club: rezultate și turnee",
      en: "Elite Tenis Club honours: results and tournaments",
    },
    seoDescription: {
      ro: "Palmaresul Elite Tenis Club Pantelimon: rezultatele jucătorilor academiei, turneele FRT și Tenis10 găzduite și campionii ligii amatorilor.",
      en: "Elite Tenis Club Pantelimon's honours: the academy players' results, the FRT and Tenis10 tournaments hosted and the amateur league champions.",
    },
  },
  {
    key: "scoli",
    title: { ro: "Tenis pentru școli și grădinițe", en: "Tennis for schools and kindergartens" },
    intro: {
      ro: "De peste zece ani lucrăm cu școli și grădinițe din București și Ilfov. Copiii învață tenis prin joc, cu echipament pe măsura lor, pe terenuri acoperite care nu depind de vreme.",
      en: "For more than ten years we have worked with schools and kindergartens in Bucharest and Ilfov. Children learn tennis through play, with equipment their size, on covered courts that do not depend on the weather.",
    },
    seoTitle: {
      ro: "Tenis pentru școli și grădinițe în București și Ilfov",
      en: "Tennis for schools and kindergartens in Bucharest and Ilfov",
    },
    seoDescription: {
      ro: "Programe de tenis pentru școli și grădinițe la Elite Tenis Club Pantelimon: mini-tenis, echipament adaptat inclus și terenuri acoperite tot anul. Parteneriat de peste 10 ani.",
      en: "Tennis programmes for schools and kindergartens at Elite Tenis Club Pantelimon: mini tennis, adapted equipment included and courts covered all year. Over 10 years of partnerships.",
    },
  },
  {
    key: "programe",
    title: { ro: "Programe și lecții", en: "Programmes and lessons" },
    intro: {
      ro: "Trei programe de pregătire (Inițiere, Competiție și Amatori) și cinci feluri de lecții: individuală, în doi, în trei, de grup sau analiză biomecanică. Le combini cum ți se potrivește.",
      en: "Three training programmes (Beginners, Competition and Recreational) and five kinds of lesson: private, in pairs, in threes, in a group or a biomechanical analysis. Combine them as it suits you.",
    },
    seoTitle: {
      ro: "Lecții de tenis în Pantelimon: inițiere, competiție, amatori",
      en: "Tennis lessons in Pantelimon: beginners, competition, recreational",
    },
    seoDescription: {
      ro: "Programele academiei de tenis de la Elite Tenis Club Pantelimon, pentru copii și adulți: lecții individuale, în doi, în trei sau în grup, de 60, 90 sau 120 de minute.",
      en: "The tennis academy's programmes at Elite Tenis Club Pantelimon, for children and adults: private, pair, three-player or group lessons of 60, 90 or 120 minutes.",
    },
  },
  {
    key: "academie",
    title: { ro: "Academia de juniori", en: "Junior academy" },
    intro: {
      ro: "Grupe pe vârste și pe etape, de la mini tenis la juniorii care joacă turnee. Fiecare copil începe cu o evaluare, ca să intre în grupa potrivită.",
      en: "Groups by age and stage, from mini tennis to juniors who play tournaments. Every child starts with an assessment, so they join the right group.",
    },
    seoTitle: {
      ro: "Tenis pentru copii în Pantelimon: grupe de la 4 ani",
      en: "Tennis for children in Pantelimon: groups from age 4",
    },
    seoDescription: {
      ro: "Grupe de tenis pentru copii de la 4 ani și juniori la Elite Tenis Club Pantelimon, pe etapele minge roșie, portocalie, verde și galbenă. Cere o evaluare.",
      en: "Tennis groups for children from 4 and juniors at Elite Tenis Club Pantelimon, by red, orange, green and yellow ball stages. Ask for an assessment.",
    },
  },
  {
    key: "echipa",
    title: { ro: "Echipa de antrenori", en: "The coaching team" },
    intro: {
      ro: "Antrenorii academiei, cu pregătirea, experiența și felul în care lucrează fiecare.",
      en: "The academy's coaches, with each one's training, experience and way of working.",
    },
    seoTitle: {
      ro: "Antrenori de tenis în Pantelimon, pentru copii și adulți",
      en: "Tennis coaches in Pantelimon, for children and adults",
    },
    seoDescription: {
      ro: "Antrenorii academiei de tenis de la Elite Tenis Club Pantelimon: formare, certificări și experiență cu copii, juniori și adulți.",
      en: "The coaches of the tennis academy at Elite Tenis Club Pantelimon: education, certifications and experience with children, juniors and adults.",
    },
  },
  {
    key: "facilitati",
    title: { ro: "Clubul", en: "The club" },
    intro: {
      ro: "Ne antrenăm la Elite Tenis Club din Pantelimon, pe zgură, inclusiv iarna, pe terenurile acoperite. Aici găsești terenurile, dotările clubului și ce primesc elevii la antrenamente.",
      en: "We train at Elite Tenis Club in Pantelimon, on clay, in winter too, on the covered courts. Here are the courts, the club's amenities and what players get in training.",
    },
    seoTitle: {
      ro: "Terenuri de tenis acoperite pe zgură în Pantelimon",
      en: "Covered clay tennis courts in Pantelimon",
    },
    seoDescription: {
      ro: "Elite Tenis Club Pantelimon: 8 terenuri de zgură, dintre care 4 acoperite, sală de fitness, rachete de împrumut și analiză video a loviturilor.",
      en: "Elite Tenis Club Pantelimon: 8 clay courts, 4 of them covered, a fitness room, loan racquets and video analysis of your strokes.",
    },
  },
  {
    key: "despre",
    title: { ro: "Despre academie", en: "About the academy" },
    intro: {
      ro: "Ce credem despre tenis, cum lucrăm cu fiecare jucător și cine conduce antrenamentele.",
      en: "What we believe about tennis, how we work with every player and who runs the sessions.",
    },
    seoTitle: {
      ro: "Despre academia de tenis Elite Tenis Club Pantelimon",
      en: "About the Elite Tenis Club tennis academy, Pantelimon",
    },
    seoDescription: {
      ro: "Filozofia și metoda academiei de tenis de la Elite Tenis Club Pantelimon: evaluare, plan pe 8–12 săptămâni, antrenamente cu obiectiv și verificări.",
      en: "The philosophy and method of the tennis academy at Elite Tenis Club Pantelimon: assessment, an 8–12 week plan, sessions with a goal, and check-ins.",
    },
  },
  {
    key: "preturi",
    title: { ro: "Prețuri", en: "Prices" },
    intro: {
      ro: "Tariful pe oră pentru fiecare tip de lecție, prețul pe durată, pachetele și regulile de anulare și plată.",
      en: "The hourly rate for each kind of lesson, the price by length, the packages and the cancellation and payment rules.",
    },
    seoTitle: {
      ro: "Prețuri lecții de tenis Pantelimon: individual, în doi, grup",
      en: "Tennis lesson prices in Pantelimon: private, pairs, group",
    },
    seoDescription: {
      ro: "Cât costă o lecție de tenis la Elite Tenis Club Pantelimon: individuală, în doi, în trei, de grup sau analiză biomecanică, pe 60, 90 sau 120 de minute.",
      en: "What a tennis lesson costs at Elite Tenis Club Pantelimon: private, in pairs, in threes, in a group or a biomechanical analysis, for 60, 90 or 120 minutes.",
    },
  },
  {
    key: "rezervare",
    title: { ro: "Rezervă o lecție", en: "Book a lesson" },
    intro: {
      ro: "Alegi programul, tipul lecției și durata, apoi ziua și ora. Confirmarea vine pe email.",
      en: "Choose the programme, the kind of lesson and its length, then the day and time. The confirmation comes by email.",
    },
    seoTitle: {
      ro: "Rezervă online o lecție de tenis în Pantelimon",
      en: "Book a tennis lesson online in Pantelimon",
    },
    seoDescription: {
      ro: "Vezi orele libere și rezervă online o lecție de tenis la Elite Tenis Club Pantelimon, pentru copii sau adulți, de 60, 90 sau 120 de minute.",
      en: "See the free times and book a tennis lesson online at Elite Tenis Club Pantelimon, for children or adults, of 60, 90 or 120 minutes.",
    },
  },
  {
    key: "galerie",
    title: { ro: "Galerie foto și video", en: "Photos and videos" },
    intro: {
      ro: "Fotografii și filmări de la antrenamente, turnee și de pe terenuri. Le publicăm doar cu acordul celor din imagini.",
      en: "Photos and videos from training, tournaments and the courts. We publish them only with the consent of the people in them.",
    },
    seoDescription: {
      ro: "Fotografii și video-uri de la antrenamentele academiei de tenis de la Elite Tenis Club Pantelimon.",
      en: "Photos and videos from the tennis academy's training at Elite Tenis Club Pantelimon.",
    },
  },
  {
    key: "sfaturi",
    title: { ro: "Sfaturi", en: "Tips" },
    intro: {
      ro: "Articole scurte despre echipament, tehnică și primii pași în tenis, pentru jucători și pentru părinți.",
      en: "Short articles on equipment, technique and first steps in tennis, for players and for parents.",
    },
    seoDescription: {
      ro: "Sfaturi practice de tenis: rachete pentru copii, pantofi pentru zgură, primele luni ca adult.",
      en: "Practical tennis tips: racquets for children, clay-court shoes, your first months as an adult.",
    },
  },
  {
    key: "intrebari",
    title: { ro: "Întrebări frecvente", en: "Frequently asked questions" },
    intro: {
      ro: "Ce ne întreabă oamenii cel mai des înainte de primul antrenament. Dacă nu găsești ce cauți, scrie-ne.",
      en: "What people ask us most often before their first session. If you cannot find your answer, write to us.",
    },
    seoDescription: {
      ro: "Echipament, vârsta de început, durata lecției, vreme, anulare, plată: răspunsuri despre lecțiile de tenis din Pantelimon.",
      en: "Equipment, starting age, lesson length, weather, cancellation, payment: answers about tennis lessons in Pantelimon.",
    },
  },
  {
    key: "contact",
    title: { ro: "Contact", en: "Contact" },
    intro: {
      ro: "Pentru o rezervare, cel mai repede e din pagina de rezervare. Pentru orice altceva, sună-ne la 0722 501 748 sau scrie-ne aici.",
      en: "To book, the booking page is quickest. For anything else, call us on 0722 501 748 or write to us here.",
    },
    seoTitle: {
      ro: "Contact: academia de tenis Elite Tenis Club Pantelimon",
      en: "Contact: the Elite Tenis Club tennis academy, Pantelimon",
    },
    seoDescription: {
      ro: "Elite Tenis Club, Bulevardul Biruinței 19-21, Pantelimon, Ilfov. Telefon 0722 501 748, email elite_tenis_club@yahoo.ro.",
      en: "Elite Tenis Club, Bulevardul Biruinței 19-21, Pantelimon, Ilfov. Phone 0722 501 748, email elite_tenis_club@yahoo.ro.",
    },
  },
  {
    key: "lista-asteptare",
    title: { ro: "Lista de așteptare", en: "Waiting list" },
    intro: {
      ro: "Nu găsești o oră potrivită? Lasă-ne datele și ce zile îți convin; îți scriem când se eliberează un loc.",
      en: "Can't find a time that suits you? Leave us your details and the days that work; we will write when a place opens up.",
    },
    seoDescription: {
      ro: "Înscrie-te pe lista de așteptare pentru lecții de tenis în Pantelimon.",
      en: "Join the waiting list for tennis lessons in Pantelimon.",
    },
  },
];

export const serviceDescriptions: Record<
  string,
  { type: FacilityType; name: T; description: T; illustration: string }
> = {
  "Evaluare inițială și plan de antrenament personalizat": {
    type: "SERVICIU_ANTRENOR",
    name: {
      ro: "Evaluare inițială și plan personalizat",
      en: "Initial assessment and a personal plan",
    },
    description: {
      ro: "La prima lecție vedem tehnica și mișcarea, apoi primești obiectivele pe 8–12 săptămâni, în scris.",
      en: "In the first lesson we look at technique and movement, then you get your 8–12 week goals in writing.",
    },
    illustration: "plan",
  },
  "Rachete și mingi de împrumut pentru începători": {
    type: "ECHIPAMENT",
    name: { ro: "Rachete și mingi de împrumut", en: "Loan racquets and balls" },
    description: {
      ro: "Pentru începători, de toate mărimile, inclusiv rachete scurte și mingi lente pentru copii.",
      en: "For beginners, in every size, including short racquets and slow balls for children.",
    },
    illustration: "racheta",
  },
  "Mașină de aruncat mingi": {
    type: "ECHIPAMENT",
    name: { ro: "Mașină de aruncat mingi", en: "Ball machine" },
    description: {
      ro: "Pentru repetiții multe și constante: aceeași minge, în același loc, până când mișcarea devine automată.",
      en: "For many consistent repetitions: the same ball in the same place until the movement becomes automatic.",
    },
    illustration: "masina",
  },
  "Analiză video a loviturilor, trimisă după lecție": {
    type: "SERVICIU_ANTRENOR",
    name: { ro: "Analiză video a loviturilor", en: "Video analysis of your strokes" },
    description: {
      ro: "Filmăm loviturile, le privim împreună și primești clipurile după lecție, cu observații scurte.",
      en: "We film your strokes, watch them together and you get the clips after the lesson, with short notes.",
    },
    illustration: "video",
  },
};

export const amenityNames: Record<string, T> = {
  vestiare: { ro: "Vestiare", en: "Changing rooms" },
  dușuri: { ro: "Dușuri", en: "Showers" },
  parcare: { ro: "Parcare", en: "Parking" },
  "sală de fitness": { ro: "Sală de fitness", en: "Fitness room" },
  "recepție și magazin": { ro: "Recepție și magazin", en: "Reception and shop" },
};

/** What the club says about its amenities (its own public presentation). */
export const amenityDescriptions: Record<string, T> = {
  vestiare: {
    ro: "Vestiare separate pentru bărbați și femei, cu toalete și dușuri.",
    en: "Separate changing rooms for men and women, with toilets and showers.",
  },
  "sală de fitness": {
    ro: "Sală de fitness echipată, pentru pregătirea fizică de lângă teren.",
    en: "An equipped fitness room, for physical training next to the courts.",
  },
  "recepție și magazin": {
    ro: "La recepție găsești echipament de tenis și răcoritoare.",
    en: "At reception you will find tennis equipment and refreshments.",
  },
};

/** Conditional services from the config ("[…, dacă e cazul]") keep their name but carry a visible marker. */
export const conditionalServices: Record<string, T> = {
  "racordare rachete": { ro: "Racordare rachete", en: "Racquet stringing" },
  "pregătire și însoțire la turnee": {
    ro: "Pregătire și însoțire la turnee",
    en: "Tournament preparation and accompaniment",
  },
};

/**
 * The reviews published on the club's own site (elitetenisclub.ro/testimonials). The first two
 * are complete and published; the other two are cut off on that page, so they stay drafts until
 * the club adds the full text and the author's name.
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
  {
    id: "seed-testimonial-03",
    author: TODO,
    role: { ro: "Părinte", en: "Parent" },
    text: {
      ro: `Ceea ce m-a impresionat cel mai mult este modul în care antrenorii din acest club lucrează cu copiii mici. Fiul meu se distrează enorm la ${TODO}`,
      en: `What impressed me most is the way the coaches at this club work with young children. My son has an enormous amount of fun at ${TODO}`,
    },
    published: false,
  },
  {
    id: "seed-testimonial-04",
    author: TODO,
    role: { ro: TODO, en: TODO },
    text: {
      ro: `Orele private cu antrenorul au făcut o diferență semnificativă în abilitățile mele. Recomand cu încredere ${TODO}`,
      en: `The private lessons with the coach made a significant difference to my game. I can confidently recommend ${TODO}`,
    },
    published: false,
  },
];

export const coachPhilosophy: T = {
  ro: `Pornesc de la ce vede toată lumea pe teren, dar puțini explică: o lovitură bună vine din picioare, trece prin șold și trunchi și abia la final ajunge în braț și în rachetă. Când corectez ceva, îți spun și de ce, ca să poți repeta singur, fără mine lângă tine.

Prima lecție e o evaluare: văd cum lovești, cum te miști și ce îți dorești de la tenis. De acolo facem un plan pe câteva săptămâni, cu un obiectiv clar pentru fiecare lecție. Exersăm până când mișcarea iese și în joc, nu doar la coșul cu mingi.

Pregătirea fizică și partea mentală fac parte din antrenament: deplasarea, echilibrul, prevenirea accidentărilor, concentrarea și rutinele dintre puncte.

La copii, jocul rămâne principalul mod de a învăța, iar efortul e potrivit vârstei. La cei care joacă turnee, antrenamentele se leagă de calendarul competițiilor.`,
  en: `I start from something everyone sees on court but few explain: a good stroke comes from the legs, passes through the hips and trunk, and only at the end reaches the arm and the racquet. When I correct something I also tell you why, so you can repeat it on your own, without me next to you.

The first lesson is an assessment: I see how you hit, how you move and what you want from tennis. From there we make a plan for the next few weeks, with one clear goal for each lesson. We practise until the movement works in play, not just from the ball basket.

Fitness and the mental side are part of training: footwork, balance, injury prevention, focus and the routines between points.

With children, play stays the main way of learning and the effort suits their age. For players who compete, training follows the tournament calendar.`,
};
