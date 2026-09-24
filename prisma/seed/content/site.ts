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
    title: { ro: "Programe", en: "Programmes" },
    intro: {
      ro: "Lecții individuale, lecții în doi, grupe pe vârste și niveluri, pregătire pentru competiție. Fiecare program pornește de la o evaluare și are un plan scris.",
      en: "Private lessons, lessons for two, groups by age and level, competition training. Every programme starts with an assessment and has a written plan.",
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
    seoDescription: {
      ro: "Terenuri de zgură și hard, nocturnă, vestiare, parcare, rachete de împrumut, mașină de mingi și analiză video.",
      en: "Clay and hard courts, floodlights, changing rooms, parking, loan racquets, ball machine and video analysis.",
    },
  },
  {
    key: "despre",
    title: { ro: "Despre mine", en: "About me" },
    intro: {
      ro: "Formarea mea sportivă și universitară, metoda de lucru și rezultatele sportivilor pe care i-am pregătit.",
      en: "My sporting and university background, the way I work and the results of the players I have coached.",
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
  ro: `Tenisul de performanță se construiește metodic. Pornesc de la evaluarea inițială a nivelului tehnic, a calităților motrice și a obiectivelor sportivului, iar pe baza ei stabilesc un plan periodizat, cu obiective clare pentru fiecare etapă.

Lucrez după principiile didacticii sportive: accesibilitate, sistematizare, progresivitate și individualizare. Învățarea tehnicii urmează etapele învățării motrice: demonstrație și explicație, exersare dirijată, feedback imediat, apoi transfer în situații de joc și de competiție.

Pregătirea tehnico-tactică se completează cu pregătirea fizică specifică (viteză de reacție și deplasare, forță explozivă, rezistență, mobilitate, prevenirea accidentărilor) și cu pregătirea psihologică: concentrarea, gestionarea presiunii și rutinele dintre puncte.

La copii, dozarea efortului respectă particularitățile de vârstă, iar jocul rămâne principalul mijloc de învățare. La juniorii de performanță, fiecare ciclu de pregătire este legat de calendarul competițional.`,
  en: `Performance tennis is built methodically. I start from an initial assessment of the player's technique, motor abilities and goals, and from it I draw up a periodised plan with clear objectives for each stage.

I work to the principles of sports pedagogy: accessibility, systematic progression, gradual loading and individualisation. Technique is learned through the stages of motor learning: demonstration and explanation, guided practice, immediate feedback, then transfer to match and competition situations.

Technical and tactical work is complemented by sport-specific conditioning (reaction and movement speed, explosive strength, endurance, mobility, injury prevention) and by mental preparation: focus, handling pressure and between-point routines.

With children, training loads respect their stage of development and play remains the main way of learning. With performance juniors, every training cycle is tied to the competition calendar.`,
};
