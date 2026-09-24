import type { FacilityType } from "../../../lib/generated/prisma/client";

type T = { ro: string; en: string };

export const pageHeaderContent: {
  key: string;
  title: T;
  intro: T;
  artKey: string;
  imageAlt: T;
  seoTitle?: T;
  seoDescription: T;
}[] = [
  {
    key: "programe",
    title: { ro: "Programe", en: "Programmes" },
    intro: {
      ro: "Lecții individuale, lecții în doi, grupe pe vârste și niveluri, pregătire pentru competiție. Fiecare program pornește de la o evaluare și are un plan scris.",
      en: "Private lessons, lessons for two, groups by age and level, competition training. Every programme starts with an assessment and has a written plan.",
    },
    artKey: "04-schele",
    imageAlt: {
      ro: "Frescă: meșteri pe schele de lemn construiesc o minge de tenis aurie uriașă.",
      en: "Fresco: craftsmen on wooden scaffolding build a giant gold tennis ball.",
    },
    seoDescription: {
      ro: "Lecții de tenis individuale și în doi, mini-tenis, grupe pentru copii, juniori și adulți, performanță și analiză video.",
      en: "Private and shared tennis lessons, mini tennis, groups for children, juniors and adults, performance and video analysis.",
    },
  },
  {
    key: "facilitati",
    title: { ro: "Facilități", en: "Facilities" },
    intro: {
      ro: "Terenurile, dotările bazei și ce aduc eu în plus la fiecare lecție, de la rachete de împrumut la analiza video.",
      en: "The courts, the venue's amenities and what I bring to every lesson, from loan racquets to video analysis.",
    },
    artKey: "06b-mozaic",
    imageAlt: {
      ro: "Curte-mozaic renascentistă văzută de sus, în tonuri de zgură și linii de fildeș.",
      en: "A Renaissance mosaic courtyard seen from above, in clay tones with ivory lines.",
    },
    seoDescription: {
      ro: "Terenuri de zgură și hard, nocturnă, vestiare, parcare, rachete de împrumut, mașină de mingi și analiză video.",
      en: "Clay and hard courts, floodlights, changing rooms, parking, loan racquets, ball machine and video analysis.",
    },
  },
  {
    key: "despre",
    title: { ro: "Despre mine", en: "About me" },
    intro: {
      ro: "Cum am ajuns la tenis, cum lucrez și ce urmăresc la fiecare elev.",
      en: "How I came to tennis, how I work and what I look for in every student.",
    },
    artKey: "02-impreuna",
    imageAlt: {
      ro: "Pictură: o mână matură și una tânără își trec o minge de tenis aurie.",
      en: "Painting: an older hand and a young hand passing a gold tennis ball.",
    },
    seoDescription: {
      ro: "Parcursul, certificările și filozofia de antrenament.",
      en: "Background, certifications and coaching philosophy.",
    },
  },
  {
    key: "preturi",
    title: { ro: "Prețuri", en: "Prices" },
    intro: {
      ro: "Tarifele pe program, pachetele de lecții și regulile de anulare și plată, pe scurt și fără surprize.",
      en: "Prices per programme, lesson packages and the cancellation and payment rules, briefly and without surprises.",
    },
    artKey: "04b-pergament",
    imageAlt: {
      ro: "Pictură: un personaj clasic desfășoară un pergament cu planul unui teren de tenis.",
      en: "Painting: a classical figure unrolls a parchment with the plan of a tennis court.",
    },
    seoDescription: {
      ro: "Prețuri pentru lecții de tenis individuale, în doi și grupe, pachete și politica de anulare.",
      en: "Prices for private, shared and group tennis lessons, packages and the cancellation policy.",
    },
  },
  {
    key: "rezervare",
    title: { ro: "Rezervă o lecție", en: "Book a lesson" },
    intro: {
      ro: "Alegi programul, vezi orele libere și îți lași datele. Durează două minute.",
      en: "Choose a programme, see the free times and leave your details. It takes two minutes.",
    },
    artKey: "10-constelatie",
    imageAlt: {
      ro: "Cer de noapte cu o constelație care desenează traiectoria unei mingi.",
      en: "A night sky with a constellation tracing the arc of a ball.",
    },
    seoDescription: {
      ro: "Rezervă online o lecție de tenis sau o ședință de probă la grupă, cu orele libere în timp real.",
      en: "Book a tennis lesson or a group trial session online, with free times in real time.",
    },
  },
  {
    key: "galerie",
    title: { ro: "Galerie", en: "Gallery" },
    intro: {
      ro: "Fotografii de la lecții, grupe, turnee și de pe terenuri. Publicate doar cu acordul celor din imagini.",
      en: "Photos from lessons, groups, tournaments and the courts. Published only with the consent of the people in them.",
    },
    artKey: "09b-ramuri",
    imageAlt: {
      ro: "Ramuri dese cu mingi aurii printre frunze.",
      en: "Dense branches with gold balls among the leaves.",
    },
    seoDescription: {
      ro: "Fotografii de la lecțiile și grupele de tenis.",
      en: "Photos from tennis lessons and groups.",
    },
  },
  {
    key: "sfaturi",
    title: { ro: "Sfaturi", en: "Tips" },
    intro: {
      ro: "Articole scurte despre echipament, tehnică și primii pași în tenis, pentru jucători și pentru părinți.",
      en: "Short articles on equipment, technique and first steps in tennis, for players and for parents.",
    },
    artKey: "06-schita-teren",
    imageAlt: {
      ro: "Schiță sepia a unui teren de tenis văzut de sus, pe pergament.",
      en: "A sepia sketch of a tennis court seen from above, on parchment.",
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
      ro: "Răspunsuri la ce se întreabă cel mai des înainte de prima lecție. Dacă nu găsești ce cauți, scrie-mi.",
      en: "Answers to what people ask most often before the first lesson. If you cannot find what you need, write to me.",
    },
    artKey: "09-curcubeu",
    imageAlt: {
      ro: "O minge aurie sub un curcubeu pe cer albastru-pal.",
      en: "A gold ball under a rainbow in a pale blue sky.",
    },
    seoDescription: {
      ro: "Echipament, vârsta de început, vreme, anulare, plată, turnee: răspunsuri la întrebările frecvente.",
      en: "Equipment, starting age, weather, cancellation, payment, tournaments: answers to common questions.",
    },
  },
  {
    key: "contact",
    title: { ro: "Contact", en: "Contact" },
    intro: {
      ro: "Pentru o rezervare rapidă, folosește pagina de rezervare. Pentru orice altceva, scrie-mi aici, sună sau lasă un mesaj pe WhatsApp.",
      en: "For a quick booking, use the booking page. For anything else, write to me here, call or leave a WhatsApp message.",
    },
    artKey: "03-cer",
    imageAlt: {
      ro: "Cer ultramarin cu nori albi.",
      en: "Ultramarine sky with white clouds.",
    },
    seoDescription: {
      ro: "Telefon, WhatsApp, email, adresa terenurilor și programul de lucru.",
      en: "Phone, WhatsApp, email, the courts' address and opening hours.",
    },
  },
  {
    key: "lista-asteptare",
    title: { ro: "Lista de așteptare", en: "Waiting list" },
    intro: {
      ro: "Lasă-ți datele și preferințele de orar. Îți scriu când se eliberează un loc în programul care te interesează.",
      en: "Leave your details and preferred times. I will write to you when a place opens up in the programme you want.",
    },
    artKey: "08-pom",
    imageAlt: {
      ro: "O tânără culege mingi aurii dintr-un pom.",
      en: "A young woman picking gold balls from a tree.",
    },
    seoDescription: {
      ro: "Înscrie-te pe lista de așteptare pentru lecții și grupe de tenis.",
      en: "Join the waiting list for tennis lessons and groups.",
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
  ro: `Cred că tenisul se învață bine doar pe bucăți mici, puse una peste alta cu răbdare. Nu încerc să schimb totul într-o lecție. Aleg un singur lucru, îl lucrăm până se așază, și abia apoi trecem la următorul.

Lucrez cu un plan scris, pe care îl vezi și tu. Știi ce urmărim în următoarele săptămâni și de ce, iar la final verificăm împreună, în joc și pe înregistrări, dacă am ajuns acolo.

Pentru copii, tenisul trebuie să rămână un joc. Terenul, mingea și racheta se potrivesc vârstei lor, iar progresul se măsoară în bucuria de a reveni pe teren săptămâna următoare.`,
  en: `I believe tennis is learned well only in small pieces, patiently put one on top of another. I do not try to change everything in one lesson. I choose one thing, we work on it until it settles, and only then move on to the next.

I work with a written plan that you see too. You know what we are aiming for in the coming weeks and why, and at the end we check together, in play and on video, whether we got there.

For children, tennis has to stay a game. The court, the ball and the racquet match their age, and progress is measured by how happy they are to come back on court the following week.`,
};
