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
    title: { ro: "Programe și lecții", en: "Programmes and lessons" },
    intro: {
      ro: "Trei programe de pregătire (Inițiere, Competiție și Amatori) și cinci feluri de lecții: individuală, în doi, în trei, de grup sau analiză biomecanică. Le combini cum ți se potrivește.",
      en: "Three training programmes (Beginners, Competition and Recreational) and five kinds of lesson: private, for two, for three, group or biomechanical analysis. Combine them however suits you.",
    },
    seoTitle: {
      ro: "Lecții de tenis în Pantelimon: inițiere, competiție, amatori",
      en: "Tennis lessons in Pantelimon: beginners, competition, recreational",
    },
    seoDescription: {
      ro: "Lecții de tenis pentru copii și adulți la Elite Tennis Club Pantelimon: individuale, în doi, în trei sau în grup, de 60, 90 sau 120 de minute.",
      en: "Tennis lessons for children and adults at Elite Tennis Club Pantelimon: private, for two, for three or in a group, 60, 90 or 120 minutes.",
    },
  },
  {
    key: "facilitati",
    title: { ro: "Terenuri și facilități", en: "Courts and facilities" },
    intro: {
      ro: "Ne antrenăm la Elite Tennis Club din Pantelimon, pe zgură, inclusiv iarna, pe terenurile acoperite. Aici găsești terenurile, dotările bazei și ce aduc eu la fiecare lecție.",
      en: "We train at Elite Tennis Club in Pantelimon, on clay, in winter too, on the covered courts. Here you will find the courts, the venue's amenities and what I bring to every lesson.",
    },
    seoTitle: {
      ro: "Terenuri de tenis pe zgură în Pantelimon, acoperite iarna",
      en: "Clay tennis courts in Pantelimon, covered in winter",
    },
    seoDescription: {
      ro: "Elite Tennis Club Pantelimon: 8 terenuri de zgură, dintre care 4 acoperite, sală de fitness, rachete de împrumut și analiză video a loviturilor.",
      en: "Elite Tennis Club Pantelimon: 8 clay courts, 4 of them covered, a fitness room, loan racquets and video analysis of your strokes.",
    },
  },
  {
    key: "despre",
    title: { ro: "Despre mine", en: "About me" },
    intro: {
      ro: "Cum am ajuns antrenor, ce am studiat și cum lucrez cu elevii mei, de la primele lecții la turnee.",
      en: "How I became a coach, what I studied and how I work with my players, from the first lessons to tournaments.",
    },
    seoTitle: {
      ro: "Antrenor de tenis Pantelimon: Popescu Alexandru Daniel",
      en: "Tennis coach in Pantelimon: Popescu Alexandru Daniel",
    },
    seoDescription: {
      ro: "Antrenor de tenis la Elite Tennis Club Pantelimon, absolvent UNEFS (specializarea tenis) și arbitru național de tenis.",
      en: "Tennis coach at Elite Tennis Club Pantelimon, UNEFS graduate (tennis specialisation) and national tennis umpire.",
    },
  },
  {
    key: "preturi",
    title: { ro: "Prețuri", en: "Prices" },
    intro: {
      ro: "Tariful pe oră pentru fiecare tip de lecție, prețul pe durată, pachetele și regulile de anulare și plată.",
      en: "The hourly rate for each kind of lesson, the price by length, packages and the cancellation and payment rules.",
    },
    seoTitle: {
      ro: "Prețuri lecții de tenis Pantelimon: individual, în doi, grup",
      en: "Tennis lesson prices in Pantelimon: private, for two, group",
    },
    seoDescription: {
      ro: "Cât costă o lecție de tenis la Elite Tennis Club Pantelimon: individuală, în doi, în trei, de grup sau analiză biomecanică, pe 60, 90 sau 120 de minute.",
      en: "What a tennis lesson costs at Elite Tennis Club Pantelimon: private, for two, for three, group or biomechanical analysis, for 60, 90 or 120 minutes.",
    },
  },
  {
    key: "rezervare",
    title: { ro: "Rezervă o lecție", en: "Book a lesson" },
    intro: {
      ro: "Alegi programul, tipul lecției și durata, apoi ziua și ora. Confirmarea vine pe email.",
      en: "Choose the programme, the kind of lesson and its length, then the day and time. The confirmation arrives by email.",
    },
    seoTitle: {
      ro: "Rezervă online o lecție de tenis în Pantelimon",
      en: "Book a tennis lesson online in Pantelimon",
    },
    seoDescription: {
      ro: "Vezi orele libere și rezervă online o lecție de tenis la Elite Tennis Club Pantelimon, pentru copii sau adulți, de 60, 90 sau 120 de minute.",
      en: "See the free times and book a tennis lesson online at Elite Tennis Club Pantelimon, for children or adults, 60, 90 or 120 minutes.",
    },
  },
  {
    key: "galerie",
    title: { ro: "Galerie", en: "Gallery" },
    intro: {
      ro: "Fotografii de la lecții, turnee și de pe terenuri. Le public doar cu acordul celor din imagini.",
      en: "Photos from lessons, tournaments and the courts. I publish them only with the consent of the people in them.",
    },
    seoDescription: {
      ro: "Fotografii de la lecțiile de tenis de la Elite Tennis Club Pantelimon.",
      en: "Photos from tennis lessons at Elite Tennis Club Pantelimon.",
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
      en: "Practical tennis tips: racquets for children, clay-court shoes, the first months as an adult.",
    },
  },
  {
    key: "intrebari",
    title: { ro: "Întrebări frecvente", en: "Frequently asked questions" },
    intro: {
      ro: "Ce mă întreabă oamenii cel mai des înainte de prima lecție. Dacă nu găsești ce cauți, scrie-mi.",
      en: "What people ask me most often before the first lesson. If you cannot find what you need, write to me.",
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
      ro: "Pentru o rezervare, cel mai repede e din pagina de rezervare. Pentru orice altceva, sună-mă la 0722 501 748 sau scrie-mi aici.",
      en: "For a booking, the booking page is quickest. For anything else, call me on 0722 501 748 or write to me here.",
    },
    seoTitle: {
      ro: "Contact: lecții de tenis la Elite Tennis Club Pantelimon",
      en: "Contact: tennis lessons at Elite Tennis Club Pantelimon",
    },
    seoDescription: {
      ro: "Elite Tennis Club, Bulevardul Biruinței 19-21, Pantelimon, Ilfov. Telefon 0722 501 748, email elite_tenis_club@yahoo.ro.",
      en: "Elite Tennis Club, Bulevardul Biruinței 19-21, Pantelimon, Ilfov. Phone 0722 501 748, email elite_tenis_club@yahoo.ro.",
    },
  },
  {
    key: "lista-asteptare",
    title: { ro: "Lista de așteptare", en: "Waiting list" },
    intro: {
      ro: "Nu găsești o oră potrivită? Lasă-mi datele și ce zile îți convin; îți scriu când se eliberează un loc.",
      en: "Cannot find a time that suits you? Leave your details and the days that work; I will write when a place opens up.",
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
};

/** Conditional services from the config ("[…, dacă e cazul]") keep their name but carry a visible marker. */
export const conditionalServices: Record<string, T> = {
  "racordare rachete": { ro: "Racordare rachete", en: "Racquet stringing" },
  "pregătire și însoțire la turnee": {
    ro: "Pregătire și însoțire la turnee",
    en: "Tournament preparation and accompaniment",
  },
};

export const exampleTestimonials: { id: string; author: string; role: T; text: T }[] = [
  {
    id: "seed-testimonial-01",
    author: "[EXEMPLU] Andrei, părinte",
    role: { ro: "[EXEMPLU] părinte", en: "[EXEMPLU] parent" },
    text: {
      ro: "[EXEMPLU] Acesta este un text de exemplu, ca să vezi cum arată o recenzie pe site. Înlocuiește-l cu o recenzie reală, primită de la un elev sau de la un părinte, cu acordul lui de publicare.",
      en: "[EXEMPLU] This is sample text showing how a review looks on the site. Replace it with a real review from a student or parent, with their consent to publish.",
    },
  },
  {
    id: "seed-testimonial-02",
    author: "[EXEMPLU] Ioana",
    role: { ro: "[EXEMPLU] jucătoare amatoare", en: "[EXEMPLU] amateur player" },
    text: {
      ro: "[EXEMPLU] Text de exemplu. Recenziile se publică doar dacă sunt reale și dacă persoana a bifat acordul de publicare.",
      en: "[EXEMPLU] Sample text. Reviews are published only if they are real and the person has ticked the consent to publish.",
    },
  },
  {
    id: "seed-testimonial-03",
    author: "[EXEMPLU] Mihai",
    role: { ro: "[EXEMPLU] junior, 14 ani", en: "[EXEMPLU] junior, 14" },
    text: {
      ro: "[EXEMPLU] Text de exemplu, nepublicat. Poți cere recenzii automat: după prima lecție efectuată, clientul primește o invitație pe email.",
      en: "[EXEMPLU] Sample text, not published. You can collect reviews automatically: after the first completed lesson, the client receives an email invitation.",
    },
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
