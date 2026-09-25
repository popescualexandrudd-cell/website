/**
 * The assistant's own answers, without an AI model: used when the server has no Anthropic key
 * or the model cannot answer. The visitor's question is matched to topics (prices, courts,
 * children, hours…) and to the club's published FAQ; the answer is built from the club's data
 * and always ends with the next step. Pure, so it is tested in tests/unit/assistant-local.test.ts.
 */

export type LocalClub = {
  locale: "ro" | "en";
  clubName: string;
  phone: string;
  whatsapp: boolean;
  email: string;
  address: string;
  hours: string;
  rentalRates: string;
  firstSessions: string;
  groups: { name: string; ages: string }[];
  coaches: { name: string; role: string }[];
  programs: { name: string; path: string }[];
  tournaments: string[];
  faqs: { question: string; answer: string }[];
  paths: {
    booking: string;
    rental: string;
    programs: string;
    signup: string;
    pricing: string;
    team: string;
    tournaments: string;
    contact: string;
    giftCard: string;
    league: string;
    partner: string;
    schools: string;
    facilities: string;
  };
};

/** Lower case, no diacritics, words only: "Câți ani?" → ["cati", "ani"]. */
export function words(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

type Topic = {
  key: string;
  /** Word stems that point to the topic (without diacritics). */
  stems: string[];
  answer: (club: LocalClub) => string;
};

const STOP = new Set(
  "si sau de la in pe cu ce cat cum care este sunt un o the a an of to for is are do does can how what i my me eu ma mi va voi noi am are".split(
    " ",
  ),
);

function topics(ro: boolean): Topic[] {
  const L = (r: string, e: string) => (ro ? r : e);
  return [
    {
      key: "rental",
      stems: ["teren", "inchir", "court", "hire", "rent", "zgura", "clay"],
      answer: (c) =>
        L(
          `Clubul are 8 terenuri de zgură, dintre care 4 acoperite, deschise zilnic ${c.hours}.\n\n${c.rentalRates}\n\nCeri un teren [aici](${c.paths.rental}#cerere) sau la [${c.phone}](tel:${c.phone.replace(/\s/g, "")}).`,
          `The club has 8 clay courts, 4 of them covered, open every day ${c.hours}.\n\n${c.rentalRates}\n\nRequest a court [here](${c.paths.rental}#cerere) or call [${c.phone}](tel:${c.phone.replace(/\s/g, "")}).`,
        ),
    },
    {
      key: "prices",
      stems: ["pret", "cost", "tarif", "lei", "ron", "price", "abonament", "plat", "pay", "fee"],
      answer: (c) =>
        L(
          `- **Închiriere teren:** iarna, 60 de lei pe oră pentru orice teren de zgură; tarifele de vară sunt pe [pagina de închiriere](${c.paths.rental}).\n- **Grupe:** abonamentele lunare pornesc de la 240 de lei.\n- **Copii:** ${c.firstSessions}.\n- **Antrenamente individuale, în 2, în 3 și de grup:** tariful îl afli la recepție sau la ${c.phone}.\n\nToate prețurile: [Prețuri](${c.paths.pricing}).`,
          `- **Court hire:** in winter, 60 lei an hour for any clay court; the summer rates are on the [court hire page](${c.paths.rental}).\n- **Groups:** monthly memberships start at 240 lei.\n- **Children:** ${c.firstSessions}.\n- **Private, pair, three-player and group sessions:** ask at reception or call ${c.phone} for the rate.\n\nAll prices: [Prices](${c.paths.pricing}).`,
        ),
    },
    {
      key: "children",
      stems: [
        "copil",
        "copii",
        "fiu",
        "fiic",
        "varst",
        "ani",
        "minitenis",
        "child",
        "kid",
        "son",
        "daughter",
        "age",
        "old",
        "incep",
        "start",
      ],
      answer: (c) =>
        L(
          `Copiii pot începe de la 4 ani, la minitenis. Grupele clubului:\n${c.groups.map((g) => `- **${g.name}**${g.ages ? `: ${g.ages}` : ""}`).join("\n")}\n\n**Oferta de bun venit:** ${c.firstSessions}. Înscrie copilul [aici](${c.paths.signup}).`,
          `Children can start from 4, in mini tennis. The club's groups:\n${c.groups.map((g) => `- **${g.name}**${g.ages ? `: ${g.ages}` : ""}`).join("\n")}\n\n**Welcome offer:** ${c.firstSessions}. Sign your child up [here](${c.paths.signup}).`,
        ),
    },
    {
      key: "offer",
      stems: ["gratuit", "gratis", "oferta", "reducer", "free", "offer", "campan", "promo"],
      answer: (c) =>
        L(
          `Ofertele clubului acum:\n- **Campania de iarnă:** orice teren de zgură cu doar 60 de lei pe oră. [Cere un teren](${c.paths.rental}#cerere)\n- **Pentru copii:** ${c.firstSessions}. [Înscrie copilul](${c.paths.signup})`,
          `The club's current offers:\n- **Winter campaign:** any clay court for just 60 lei an hour. [Request a court](${c.paths.rental}#cerere)\n- **For children:** ${c.firstSessions}. [Sign your child up](${c.paths.signup})`,
        ),
    },
    {
      key: "hours",
      stems: [
        "program",
        "orar",
        "deschis",
        "inchis",
        "ora",
        "ore",
        "hours",
        "open",
        "close",
        "when",
      ],
      answer: (c) =>
        L(
          `Clubul este deschis zilnic, de luni până duminică, ${c.hours}. Un antrenament îl rezervi [online](${c.paths.booking}), iar un teren [aici](${c.paths.rental}#cerere).`,
          `The club is open every day, Monday to Sunday, ${c.hours}. Book a session [online](${c.paths.booking}) and a court [here](${c.paths.rental}#cerere).`,
        ),
    },
    {
      key: "address",
      stems: [
        "adres",
        "unde",
        "locat",
        "gasesc",
        "ajung",
        "parcar",
        "harta",
        "where",
        "address",
        "location",
        "park",
        "map",
      ],
      answer: (c) =>
        L(
          `Ne găsești pe **${c.address}**. Ai parcare la club. Detalii și harta: [Contact](${c.paths.contact}).`,
          `You will find us at **${c.address}**. There is parking at the club. Details and map: [Contact](${c.paths.contact}).`,
        ),
    },
    {
      key: "contact",
      stems: ["telefon", "sun", "contact", "email", "mail", "whatsapp", "phone", "call"],
      answer: (c) =>
        L(
          `Telefon${c.whatsapp ? " și WhatsApp" : ""}: [${c.phone}](tel:${c.phone.replace(/\s/g, "")}). Email: [${c.email}](mailto:${c.email}). Sau scrie-ne din pagina [Contact](${c.paths.contact}).`,
          `Phone${c.whatsapp ? " and WhatsApp" : ""}: [${c.phone}](tel:${c.phone.replace(/\s/g, "")}). Email: [${c.email}](mailto:${c.email}). Or write to us from the [Contact](${c.paths.contact}) page.`,
        ),
    },
    {
      key: "coaches",
      stems: ["antrenor", "echip", "coach", "team", "profesor", "trainer"],
      answer: (c) =>
        L(
          `Echipa de antrenori a clubului:\n${c.coaches.map((m) => `- **${m.name}**, ${m.role.toLowerCase()}`).join("\n")}\n\nToată echipa: [Echipa](${c.paths.team}).`,
          `The club's coaching team:\n${c.coaches.map((m) => `- **${m.name}**, ${m.role.toLowerCase()}`).join("\n")}\n\nThe whole team: [Team](${c.paths.team}).`,
        ),
    },
    {
      key: "programs",
      stems: [
        "curs",
        "lecti",
        "antrenament",
        "program",
        "adult",
        "amator",
        "performanta",
        "lesson",
        "course",
        "session",
        "training",
        "beginner",
      ],
      answer: (c) =>
        L(
          `Programele clubului:\n${c.programs.map((p) => `- [${p.name}](${p.path})`).join("\n")}\n\nAntrenamentele pot fi individuale, în 2, în 3 sau de grup, de 60, 90 sau 120 de minute. [Rezervă online](${c.paths.booking}).`,
          `The club's programmes:\n${c.programs.map((p) => `- [${p.name}](${p.path})`).join("\n")}\n\nSessions can be private, for 2, for 3 or in a group, of 60, 90 or 120 minutes. [Book online](${c.paths.booking}).`,
        ),
    },
    {
      key: "tournaments",
      stems: [
        "turne",
        "competit",
        "concurs",
        "frt",
        "tenis10",
        "tournament",
        "competition",
        "match",
      ],
      answer: (c) =>
        L(
          `Pe terenurile clubului se joacă turnee ale Federației Române de Tenis și Tenis10${c.tournaments.length > 0 ? `: ${c.tournaments.join(", ")}` : ""}. Calendarul: [Turnee](${c.paths.tournaments}).`,
          `Romanian Tennis Federation and Tenis10 tournaments are played on the club's courts${c.tournaments.length > 0 ? `: ${c.tournaments.join(", ")}` : ""}. The calendar: [Tournaments](${c.paths.tournaments}).`,
        ),
    },
    {
      key: "winter",
      stems: [
        "iarn",
        "ploai",
        "ploua",
        "frig",
        "acoperit",
        "sala",
        "winter",
        "rain",
        "cold",
        "indoor",
        "covered",
      ],
      answer: (c) =>
        L(
          `Da, se joacă tot anul: 4 dintre terenurile de zgură sunt acoperite. Iarna, orice teren costă doar 60 de lei pe oră. [Cere un teren](${c.paths.rental}#cerere).`,
          `Yes, we play all year: 4 of the clay courts are covered. In winter, any court costs just 60 lei an hour. [Request a court](${c.paths.rental}#cerere).`,
        ),
    },
    {
      key: "gift",
      stems: ["cadou", "card", "voucher", "gift", "present"],
      answer: (c) =>
        L(
          `Poți oferi un card cadou pentru antrenamente sau o sumă la alegere, valabil 12 luni. Îl comanzi [aici](${c.paths.giftCard}).`,
          `You can give a gift card for sessions or an amount of your choice, valid for 12 months. Order it [here](${c.paths.giftCard}).`,
        ),
    },
    {
      key: "league",
      stems: ["liga", "partener", "adversar", "league", "partner", "opponent"],
      answer: (c) =>
        L(
          `Pentru adulți avem [Liga amatorilor](${c.paths.league}) și lista [Găsește partener](${c.paths.partner}), unde te punem în legătură cu jucători de nivelul tău.`,
          `For adults we have the [Amateur league](${c.paths.league}) and the [Find a partner](${c.paths.partner}) list, where we put you in touch with players of your level.`,
        ),
    },
    {
      key: "camps",
      stems: [
        "tabar",
        "taber",
        "vacant",
        "camp",
        "holiday",
        "team",
        "building",
        "firm",
        "corporate",
        "companie",
        "eveniment",
        "event",
      ],
      answer: (c) =>
        L(
          `Organizăm **tabere de tenis** în vacanțele școlare și **team building** pentru firme, cu terenuri, antrenori și echipament. Pentru perioade și oferte, sună la [${c.phone}](tel:${c.phone.replace(/\s/g, "")}) sau vezi [Programe](${c.paths.programs}).`,
          `We run **tennis camps** in the school holidays and **team building** for companies, with courts, coaches and equipment. For dates and quotes, call [${c.phone}](tel:${c.phone.replace(/\s/g, "")}) or see [Programmes](${c.paths.programs}).`,
        ),
    },
    {
      key: "schools",
      stems: ["scoal", "gradinit", "school", "kindergarten"],
      answer: (c) =>
        L(
          `De peste zece ani ducem tenisul în școli și grădinițe din București și Ilfov. Detalii: [Școli și grădinițe](${c.paths.schools}).`,
          `For more than ten years we have taken tennis to schools and kindergartens in Bucharest and Ilfov. Details: [Schools](${c.paths.schools}).`,
        ),
    },
    {
      key: "facilities",
      stems: [
        "vestiar",
        "dus",
        "fitness",
        "magazin",
        "facilit",
        "shower",
        "changing",
        "shop",
        "gym",
      ],
      answer: (c) =>
        L(
          `La club ai vestiare cu dușuri, sală de fitness, recepție cu magazin și parcare. Detalii: [Facilități](${c.paths.facilities}).`,
          `The club has changing rooms with showers, a fitness room, a reception with a shop and parking. Details: [Facilities](${c.paths.facilities}).`,
        ),
    },
    {
      key: "booking",
      stems: ["rezerv", "programez", "book", "reserv", "appointment"],
      answer: (c) =>
        L(
          `Un antrenament îl rezervi [online](${c.paths.booking}): alegi programul, tipul antrenamentului, ziua și ora. Pentru un teren, [cere-l aici](${c.paths.rental}#cerere).`,
          `Book a session [online](${c.paths.booking}): choose the programme, the kind of session, the day and the time. For a court, [request it here](${c.paths.rental}#cerere).`,
        ),
    },
  ];
}

/** How well a question matches a set of stems: the number of question words starting with one. */
function score(question: string[], stems: string[]): number {
  return question.filter((word) => stems.some((stem) => word.startsWith(stem))).length;
}

/** The answer to the visitor's last question, from the club's data. */
export function localAnswer(question: string, club: LocalClub): string {
  const ro = club.locale === "ro";
  const q = words(question).filter((w) => !STOP.has(w));
  const ranked = topics(ro)
    .map((topic) => ({ topic, points: score(q, topic.stems) }))
    .filter((entry) => entry.points > 0)
    .sort((a, b) => b.points - a.points);

  // A published FAQ answer that shares at least two meaningful words with the question.
  let bestFaq: { answer: string; points: number } | null = null;
  for (const faq of club.faqs) {
    const fw = new Set(words(faq.question).filter((w) => !STOP.has(w) && w.length > 2));
    const points = q.filter((w) => w.length > 2 && fw.has(w)).length;
    if (points >= 2 && (!bestFaq || points > bestFaq.points))
      bestFaq = { answer: faq.answer, points };
  }

  // The club's own FAQ answer wins when it fits at least as well as a topic; otherwise the one or
  // two closest topics (a question about "the programme" can mean the hours or the courses).
  const parts: string[] =
    bestFaq && (ranked.length === 0 || bestFaq.points >= (ranked[0]?.points ?? 0))
      ? [bestFaq.answer]
      : ranked.slice(0, 2).map(({ topic }) => topic.answer(club));

  if (parts.length === 0) {
    return ro
      ? `Nu am găsit încă un răspuns exact, dar colegii de la recepție te ajută imediat: [${club.phone}](tel:${club.phone.replace(/\s/g, "")})${club.whatsapp ? " (și pe WhatsApp)" : ""}, zilnic ${club.hours}. Între timp, poți vedea [Programele](${club.paths.programs}), [Prețurile](${club.paths.pricing}) sau [închirierea terenurilor](${club.paths.rental}).`
      : `I do not have an exact answer yet, but reception will help you straight away: [${club.phone}](tel:${club.phone.replace(/\s/g, "")})${club.whatsapp ? " (WhatsApp too)" : ""}, every day ${club.hours}. Meanwhile, see the [Programmes](${club.paths.programs}), [Prices](${club.paths.pricing}) or [court hire](${club.paths.rental}).`;
  }
  return parts.join("\n\n");
}
