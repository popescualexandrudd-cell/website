import type { FaqCategory } from "../../../lib/generated/prisma/client";

type FaqContent = {
  id: string;
  category: FaqCategory;
  showOnHome: boolean;
  programSlug?: string;
  question: { ro: string; en: string };
  answer: { ro: string; en: string };
};

export const faqContent: FaqContent[] = [
  {
    id: "seed-faq-01",
    category: "ECHIPAMENT",
    showOnHome: true,
    question: {
      ro: "Ce echipament îmi trebuie la prima lecție?",
      en: "What equipment do I need for the first lesson?",
    },
    answer: {
      ro: "Pantofi de tenis sau, la început, pantofi sport cu talpă plată care nu lasă urme; haine în care te miști ușor; o sticlă de apă și, vara, o șapcă. Racheta și mingile ți le împrumut eu.",
      en: "Tennis shoes or, at first, flat-soled trainers that do not mark the court; clothes you can move in; a bottle of water and, in summer, a cap. I lend you the racquet and balls.",
    },
  },
  {
    id: "seed-faq-02",
    category: "COPII",
    showOnHome: true,
    programSlug: "mini-tenis",
    question: {
      ro: "De la ce vârstă poate începe un copil?",
      en: "At what age can a child start?",
    },
    answer: {
      ro: "De la 4 ani, în grupa de mini-tenis. Mai important decât vârsta e ca cel mic să poată sta 45 de minute într-o activitate de grup și să urmeze indicații simple. Dacă nu sunteți siguri, începeți cu o ședință de probă: se vede repede dacă e momentul.",
      en: "From 4, in the mini tennis group. More important than age is whether your child can stay with a group activity for 45 minutes and follow simple instructions. If you are not sure, start with a trial session: it quickly shows whether the time is right.",
    },
  },
  {
    id: "seed-faq-03",
    category: "TEREN_VREME",
    showOnHome: true,
    question: {
      ro: "Ce se întâmplă când plouă?",
      en: "What happens when it rains?",
    },
    answer: {
      ro: "Pe zgură udă nu se joacă: suprafața devine alunecoasă și se strică. Dacă plouă înainte de lecție, te anunț din timp și o mutăm fără cost. Dacă ploaia începe în timpul lecției, timpul rămas se recuperează la următoarea întâlnire.",
      en: "We do not play on wet clay: it becomes slippery and gets damaged. If it rains before the lesson, I let you know in good time and we move it at no cost. If the rain starts during the lesson, the remaining time is made up at the next session.",
    },
  },
  {
    id: "seed-faq-04",
    category: "PROGRAM_PLATA",
    showOnHome: true,
    question: {
      ro: "Cum anulez o lecție?",
      en: "How do I cancel a lesson?",
    },
    answer: {
      ro: "Din linkul din emailul de confirmare, gratuit până cu {ore} de ore înainte de lecție. După acest termen, sună-mă sau scrie-mi pe WhatsApp. Anularea mai târzie nu mai e gratuită, dar în caz de boală sau de urgență vorbim și găsim o soluție.",
      en: "Through the link in your confirmation email, free of charge up to {ore} hours before the lesson. After that, call me or message me on WhatsApp. Later cancellations are no longer free, but in case of illness or an emergency we talk and find a solution.",
    },
  },
  {
    id: "seed-faq-05",
    category: "PROGRAM_PLATA",
    showOnHome: true,
    question: {
      ro: "Cum plătesc?",
      en: "How do I pay?",
    },
    answer: {
      ro: "Numerar la teren sau prin transfer bancar. Lecțiile individuale se plătesc la lecție, grupele la începutul lunii, iar pachetele la prima ședință din pachet. Datele pentru transfer ți le trimit după confirmarea rezervării.",
      en: "In cash at the court or by bank transfer. Private lessons are paid at the lesson, groups at the start of the month, and packages at the first session of the package. I send you the transfer details once your booking is confirmed.",
    },
  },
  {
    id: "seed-faq-06",
    category: "ECHIPAMENT",
    showOnHome: true,
    question: {
      ro: "Am nevoie de rachetă proprie?",
      en: "Do I need my own racquet?",
    },
    answer: {
      ro: "Nu la început. După o lună-două în care vii constant, merită o rachetă a ta. Te ajut să alegi mărimea, greutatea și racordajul potrivite; nu e nevoie de cel mai scump model, ci de unul pe măsura ta.",
      en: "Not at first. After a month or two of coming regularly, it is worth getting your own. I help you choose the right size, weight and strings; you do not need the most expensive model, just one that fits you.",
    },
  },
  {
    id: "seed-faq-07",
    category: "INCEPUT",
    showOnHome: false,
    question: {
      ro: "În cât timp pot juca un meci?",
      en: "How long before I can play a match?",
    },
    answer: {
      ro: "Depinde de cât de des joci. Cu una-două lecții pe săptămână și puțin exercițiu între ele, majoritatea adulților joacă un set cu reguli simplificate după trei-patru luni. Copiii ajung mai repede la meciuri, pentru că joacă pe terenuri și cu mingi pe măsura lor.",
      en: "It depends on how often you play. With one or two lessons a week and a little practice in between, most adults play a set with simplified rules after three or four months. Children get to matches sooner, because they play on courts and with balls their size.",
    },
  },
  {
    id: "seed-faq-08",
    category: "TEREN_VREME",
    showOnHome: false,
    question: {
      ro: "Se face tenis iarna?",
      en: "Do you play in winter?",
    },
    answer: {
      ro: "Da, lecțiile continuă și iarna, pe terenurile acoperite ale bazei: [DE COMPLETAT]. Programul de iarnă poate fi puțin diferit; orele libere le vezi mereu actualizate în pagina de rezervare.",
      en: "Yes, lessons continue through the winter on the venue's covered courts: [DE COMPLETAT]. The winter schedule may differ slightly; you can always see the up-to-date free times on the booking page.",
    },
  },
  {
    id: "seed-faq-09",
    category: "ECHIPAMENT",
    showOnHome: false,
    question: {
      ro: "Ce pantofi trebuie pe zgură?",
      en: "What shoes do I need on clay?",
    },
    answer: {
      ro: "Pantofi de tenis cu talpă pentru zgură, cu model în zigzag pe toată talpa: prinde bine și nu strică terenul. Pantofii de alergare nu sunt potriviți, pentru că talpa lor moale și înaltă nu te susține la deplasările laterale. Pantofii de tenis pentru hard merg și ei, dar alunecă mai mult.",
      en: "Tennis shoes with clay-court soles, with a zigzag pattern across the whole sole: they grip well and do not damage the court. Running shoes are not suitable, because their soft, high soles do not support you in lateral movement. Hard-court tennis shoes work too, but slide more.",
    },
  },
  {
    id: "seed-faq-10",
    category: "COPII",
    showOnHome: false,
    programSlug: "lectie-in-doi",
    question: {
      ro: "Pot lua lecții împreună cu copilul meu?",
      en: "Can I take lessons together with my child?",
    },
    answer: {
      ro: "Da, ca lecție în doi, dacă nivelurile sunt apropiate. Funcționează foarte bine cu copii de peste 10–11 ani. Pentru copiii mai mici, recomand ca cel mic să vină la mini-tenis sau la grupă, iar dumneavoastră la lecții separate; așa progresați amândoi în ritmul vostru și puteți juca apoi împreună în weekend.",
      en: "Yes, as a lesson for two, if your levels are close. It works very well with children over 10 or 11. For younger children, I recommend mini tennis or a group for them and separate lessons for you; that way you both progress at your own pace and can then play together at weekends.",
    },
  },
  {
    id: "seed-faq-11",
    category: "COMPETITIE",
    showOnHome: false,
    programSlug: "performanta-competitie",
    question: {
      ro: "Pregătiți și pentru turnee?",
      en: "Do you prepare players for tournaments?",
    },
    answer: {
      ro: "Da, în programul de performanță și competiție: plan de sezon, alegerea turneelor potrivite nivelului, pregătire tehnică, tactică și fizică, apoi discuția meciurilor după fiecare turneu. Însoțirea la turnee: [DE COMPLETAT].",
      en: "Yes, in the performance and competition programme: a season plan, choosing tournaments that suit the player's level, technical, tactical and physical preparation, then a review of the matches after each tournament. Accompanying players to tournaments: [DE COMPLETAT].",
    },
  },
  {
    id: "seed-faq-12",
    category: "INCEPUT",
    showOnHome: false,
    question: {
      ro: "Cum arată prima lecție?",
      en: "What is the first lesson like?",
    },
    answer: {
      ro: "Prima lecție e o evaluare. Lovim câteva mingi ca să văd tehnica și mișcarea, vorbim despre ce îți dorești de la tenis și stabilim primele obiective. La final știi ce urmează și cât de des ar fi bine să vii. Durata și prețul le găsești pe pagina de prețuri.",
      en: "The first lesson is an assessment. We hit a few balls so I can see your technique and movement, we talk about what you want from tennis and set the first goals. By the end you know what comes next and how often it would be good to come. You will find the length and price on the pricing page.",
    },
  },
  {
    id: "seed-faq-13",
    category: "COPII",
    showOnHome: false,
    question: {
      ro: "Pot părinții să stea la lecție?",
      en: "Can parents watch the lesson?",
    },
    answer: {
      ro: "Da, de pe marginea terenului. La copiii mici, primele ședințe merg mai ușor dacă părintele e aproape. Vă rog doar să lăsați indicațiile în seama mea în timpul lecției; copilul se concentrează mai bine când aude o singură voce.",
      en: "Yes, from the side of the court. With young children, the first sessions go more smoothly if a parent is nearby. I only ask you to leave the instructions to me during the lesson; children focus better when they hear one voice.",
    },
  },
  {
    id: "seed-faq-14",
    category: "INCEPUT",
    showOnHome: false,
    question: {
      ro: "Am peste 40 de ani și n-am jucat niciodată. Nu e prea târziu?",
      en: "I am over 40 and have never played. Is it too late?",
    },
    answer: {
      ro: "Nu. Adaptăm ritmul și exercițiile la corpul tău, cu încălzire atentă pentru umeri, genunchi și glezne. Dacă ai probleme de sănătate cunoscute, vorbește întâi cu medicul și spune-mi la prima lecție. Mulți adulți care încep după 40 de ani joacă apoi ani la rând, cu plăcere.",
      en: "No. We adapt the pace and drills to your body, with a careful warm-up for shoulders, knees and ankles. If you have known health issues, talk to your doctor first and tell me at the first lesson. Many adults who start after 40 go on to play happily for years.",
    },
  },
  {
    id: "seed-faq-15",
    category: "PROGRAM_PLATA",
    showOnHome: false,
    question: {
      ro: "Pot face o ședință de probă înainte să mă înscriu la o grupă?",
      en: "Can I do a trial session before joining a group?",
    },
    answer: {
      ro: "Da. Înscrierea la orice grupă începe cu o ședință de probă. Alegi o dată din pagina de rezervare, vii, și după ședință îți spun dacă grupa e potrivită nivelului tău. Dacă grupa e plină, te trec pe lista de așteptare.",
      en: "Yes. Joining any group starts with a trial session. Pick a date on the booking page, come along, and afterwards I will tell you whether the group suits your level. If the group is full, I put you on the waiting list.",
    },
  },
];
