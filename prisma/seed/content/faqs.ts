import type { FaqCategory } from "../../../lib/generated/prisma/client";

type FaqContent = {
  id: string;
  category: FaqCategory;
  showOnHome: boolean;
  programSlug?: string;
  question: { ro: string; en: string };
  answer: { ro: string; en: string };
};

/** The club's answers to what people ask before the first session. */
export const faqContent: FaqContent[] = [
  {
    id: "seed-faq-01",
    category: "ECHIPAMENT",
    showOnHome: true,
    question: {
      ro: "Ce echipament îmi trebuie la primul antrenament?",
      en: "What equipment do I need for my first session?",
    },
    answer: {
      ro: "Pantofi de tenis sau, la început, pantofi sport cu talpă plată; haine în care te miști ușor și o sticlă cu apă. Rachetele și mingile le primești de la club.",
      en: "Tennis shoes or, at first, flat-soled trainers; clothes you can move in and a bottle of water. The club provides racquets and balls.",
    },
  },
  {
    id: "seed-faq-02",
    category: "COPII",
    showOnHome: true,
    programSlug: "initiere",
    question: {
      ro: "De la ce vârstă poate începe un copil?",
      en: "From what age can a child start?",
    },
    answer: {
      ro: "De la 4 ani, la minitenis cu mingea roșie: teren mic, rachetă scurtă, mingi moi și multe jocuri. Toți copiii care se înscriu la grupele de inițiere primesc primele 2 ședințe gratuit.",
      en: "From 4, in red-ball mini tennis: a small court, a short racquet, soft balls and plenty of games. Every child who joins a beginners group gets the first 2 sessions free.",
    },
  },
  {
    id: "seed-faq-03",
    category: "COPII",
    showOnHome: true,
    programSlug: "initiere",
    question: { ro: "Care este oferta pentru copii?", en: "What is the offer for children?" },
    answer: {
      ro: "Primele 2 ședințe sunt gratuite pentru toți copiii care se înscriu la grupele de inițiere, fără nicio obligație. Echipamentul îl asigurăm noi. Înscrierea se face din pagina Programe sau la 0722 501 748.",
      en: "The first 2 sessions are free for every child who joins a beginners group, with no commitment. We provide the equipment. Sign up on the Programmes page or on 0722 501 748.",
    },
  },
  {
    id: "seed-faq-04",
    category: "TEREN_VREME",
    showOnHome: true,
    question: { ro: "Se joacă tenis iarna?", en: "Can you play tennis in winter?" },
    answer: {
      ro: "Da. Clubul are 4 terenuri de zgură acoperite, folosite tot anul. Iarna, orice teren se închiriază cu doar 60 de lei pe oră, zilnic între 07:00 și 22:00.",
      en: "Yes. The club has 4 covered clay courts used all year round. In winter, any court can be hired for just 60 lei an hour, every day from 07:00 to 22:00.",
    },
  },
  {
    id: "seed-faq-05",
    category: "TEREN_VREME",
    showOnHome: false,
    question: { ro: "Ce se întâmplă când plouă?", en: "What happens when it rains?" },
    answer: {
      ro: "Antrenamentul continuă pe terenurile acoperite. Dacă ai rezervat un teren în aer liber și plouă, te sunăm și îți propunem un teren acoperit sau altă oră.",
      en: "The session carries on in the covered courts. If you booked an outdoor court and it rains, we call you and offer a covered court or another time.",
    },
  },
  {
    id: "seed-faq-06",
    category: "PROGRAM_PLATA",
    showOnHome: true,
    question: { ro: "Cât costă închirierea unui teren?", en: "How much does a court cost?" },
    answer: {
      ro: "Iarna, 60 de lei pe oră pentru orice teren de zgură. Vara (de la 1 mai): afară 40 de lei ziua și 80 de lei seara, în sală 50 și 80 de lei, iar în weekend 50 și 80 de lei. Tarifele complete sunt pe pagina Închiriere teren.",
      en: "In winter, 60 lei an hour for any clay court. In summer (from 1 May): outdoors 40 lei by day and 80 lei in the evening, indoors 50 and 80 lei, and at weekends 50 and 80 lei. The full rates are on the Court hire page.",
    },
  },
  {
    id: "seed-faq-07",
    category: "PROGRAM_PLATA",
    showOnHome: false,
    question: { ro: "Care este programul clubului?", en: "What are the club's opening hours?" },
    answer: {
      ro: "Clubul este deschis zilnic, de luni până duminică, între 07:00 și 22:00.",
      en: "The club is open every day, Monday to Sunday, from 07:00 to 22:00.",
    },
  },
  {
    id: "seed-faq-08",
    category: "PROGRAM_PLATA",
    showOnHome: false,
    question: { ro: "Cum anulez un antrenament?", en: "How do I cancel a session?" },
    answer: {
      ro: "Din linkul din emailul de confirmare, gratuit până cu {ore} de ore înainte de antrenament. După acest termen, sună-ne la 0722 501 748.",
      en: "From the link in your confirmation email, free of charge up to {ore} hours before the session. After that, call us on 0722 501 748.",
    },
  },
  {
    id: "seed-faq-09",
    category: "PROGRAM_PLATA",
    showOnHome: false,
    question: { ro: "Cum plătesc?", en: "How do I pay?" },
    answer: {
      ro: "Numerar la club sau prin transfer bancar. Abonamentele lunare pentru grupe pornesc de la 240 de lei; tariful exact îl afli la recepție.",
      en: "Cash at the club or by bank transfer. Monthly group memberships start at 240 lei; ask at reception for the exact rate.",
    },
  },
  {
    id: "seed-faq-10",
    category: "ECHIPAMENT",
    showOnHome: false,
    question: { ro: "Am nevoie de rachetă proprie?", en: "Do I need my own racquet?" },
    answer: {
      ro: "Nu la început. După ce vii constant o lună-două, merită o rachetă a ta, iar antrenorii clubului te ajută să alegi mărimea și greutatea potrivite.",
      en: "Not at first. Once you have been coming regularly for a month or two, your own racquet is worth it, and the club's coaches help you choose the right size and weight.",
    },
  },
  {
    id: "seed-faq-11",
    category: "ECHIPAMENT",
    showOnHome: false,
    question: { ro: "Ce pantofi trebuie pe zgură?", en: "What shoes do I need on clay?" },
    answer: {
      ro: "Pantofi de tenis cu talpă pentru zgură, cu model în zigzag: prind bine și nu strică terenul. Pantofii de alergare nu sunt potriviți, pentru că nu te susțin la deplasările laterale.",
      en: "Tennis shoes with clay-court soles, with a zigzag pattern: they grip well and do not damage the court. Running shoes are not suitable, as they do not support you when moving sideways.",
    },
  },
  {
    id: "seed-faq-12",
    category: "COMPETITIE",
    showOnHome: false,
    programSlug: "competitie",
    question: {
      ro: "Pregătiți jucători pentru turnee?",
      en: "Do you prepare players for tournaments?",
    },
    answer: {
      ro: "Da, în programele Competiție și Înaltă performanță: pregătire tehnică, tactică și fizică, alegerea turneelor potrivite și discuția meciurilor. Multe turnee FRT și Tenis10 se joacă chiar pe terenurile clubului.",
      en: "Yes, in the Competition and High performance programmes: technical, tactical and physical preparation, choosing the right tournaments and reviewing the matches. Many FRT and Tenis10 tournaments are played on the club's own courts.",
    },
  },
  {
    id: "seed-faq-13",
    category: "COPII",
    showOnHome: false,
    question: { ro: "Pot părinții să stea la antrenament?", en: "Can parents watch the session?" },
    answer: {
      ro: "Da, de pe marginea terenului. Vă rugăm doar să lăsați indicațiile în seama antrenorului; copilul se concentrează mai bine când aude o singură voce.",
      en: "Yes, from the side of the court. We only ask you to leave the instructions to the coach; children focus better when they hear one voice.",
    },
  },
  {
    id: "seed-faq-14",
    category: "INCEPUT",
    showOnHome: false,
    programSlug: "amatori",
    question: {
      ro: "Am peste 40 de ani și n-am jucat niciodată. Nu e prea târziu?",
      en: "I am over 40 and have never played. Is it too late?",
    },
    answer: {
      ro: "Nu. Antrenorii adaptează ritmul și exercițiile, cu încălzire atentă pentru umeri, genunchi și glezne. Mulți jucători ai clubului au început tenisul ca adulți.",
      en: "No. The coaches adapt the pace and exercises, with a careful warm-up for shoulders, knees and ankles. Many of the club's players took up tennis as adults.",
    },
  },
  {
    id: "seed-faq-15",
    category: "INCEPUT",
    showOnHome: false,
    question: {
      ro: "Organizați tabere și team building?",
      en: "Do you run camps and team building?",
    },
    answer: {
      ro: "Da. În vacanțele școlare organizăm tabere de tenis pentru copii, iar pentru firme organizăm team building și turnee interne, cu terenuri, antrenori și echipament. Sună-ne pentru perioade și oferte.",
      en: "Yes. In the school holidays we run tennis camps for children, and for companies we organise team building and in-house tournaments, with courts, coaches and equipment. Call us for dates and quotes.",
    },
  },
  {
    id: "seed-faq-16",
    category: "INCEPUT",
    showOnHome: false,
    question: {
      ro: "Care este diferența dintre programe și tipurile de antrenament?",
      en: "What is the difference between programmes and kinds of session?",
    },
    answer: {
      ro: "Programul (Inițiere, Competiție, Înaltă performanță, Amatori) spune ce lucrezi. Tipul antrenamentului spune cu cine: individual, în 2, în 3 sau în grup. Le combini cum ți se potrivește.",
      en: "The programme (Beginners, Competition, High performance, Recreational) says what you work on. The kind of session says with whom: private, for 2, for 3 or in a group. Combine them as it suits you.",
    },
  },
];
