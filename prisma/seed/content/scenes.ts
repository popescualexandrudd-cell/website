import type { Prisma } from "../../../lib/generated/prisma/client";

type SceneSeed = Prisma.SceneCreateInput;

/**
 * The sections of the home page, top to bottom. `{nume}` and `{locatie}` are replaced at seed
 * time from config/antrenor.yml. Texts use the vocabulary of sports science and coaching
 * methodology, kept short enough to read on a phone.
 */
export function sceneSeeds(vars: { nume: string; locatie: string }): SceneSeed[] {
  const fill = (value: string) =>
    value.replaceAll("{nume}", vars.nume).replaceAll("{locatie}", vars.locatie);

  return [
    {
      key: "deschiderea",
      order: 1,
      indexName: {
        ro: fill("{nume} · Antrenor de tenis"),
        en: fill("{nume} · Tennis coach"),
      },
      title: {
        ro: "Tenis de performanță, construit metodic.",
        en: "Performance tennis, built with method.",
      },
      body: {
        ro: fill(
          "Pregătire tehnico-tactică, fizică și psihologică pentru copii, juniori și adulți, de la inițiere până la înalta performanță. Antrenamente individuale și în grupă la {locatie}.",
        ),
        en: fill(
          "Technical, tactical, physical and mental preparation for children, juniors and adults, from first steps to high performance. Private and group training at {locatie}.",
        ),
      },
      ctaLabel: { ro: "Rezervă evaluarea inițială", en: "Book the initial assessment" },
      ctaHref: "/rezervare",
      extra: {
        stat1Value: { ro: "4 ani", en: "4 years" },
        stat1Label: { ro: "de activitate ca antrenor", en: "of coaching experience" },
        stat2Value: { ro: "Campioni naționali", en: "National champions" },
        stat2Label: { ro: "printre sportivii pregătiți", en: "among the players I have coached" },
        stat3Value: { ro: "UNEFS", en: "UNEFS" },
        stat3Label: {
          ro: "licență în performanță sportivă, specializarea tenis",
          en: "degree in sports performance, tennis specialisation",
        },
        stat4Value: { ro: "Arbitru FRT", en: "FRT umpire" },
        stat4Label: {
          ro: "arbitru național de tenis",
          en: "national tennis umpire",
        },
        secondaryLabel: { ro: "Descoperă programele", en: "Explore the programmes" },
        sceneLabel: {
          ro: "Animație 3D: doi jucători într-un schimb de mingi pe un teren de zgură.",
          en: "3D animation: two players in a rally on a clay court.",
        },
      },
    },
    {
      key: "antrenorul",
      order: 2,
      indexName: { ro: "Antrenorul", en: "The coach" },
      title: { ro: fill("{nume}"), en: fill("{nume}") },
      body: {
        ro: fill(
          "Antrenor de tenis la {locatie}, cu patru ani de activitate și o formare construită pe trei piloni: experiența de sportiv, pregătirea universitară în performanță sportivă și formarea psihopedagogică.\n\nCoordonez toate palierele de pregătire, de la inițiere până la înalta performanță. Am pregătit copii care au obținut rezultate notabile la nivel național și european, inclusiv campioni ai României.",
        ),
        en: fill(
          "Tennis coach at {locatie}, with four years of coaching and a background built on three pillars: my own experience as an athlete, a university education in sports performance and teacher training in pedagogy and psychology.\n\nI oversee every stage of development, from beginners to high performance. I have coached children who went on to notable results at national and European level, including Romanian champions.",
        ),
      },
      ctaLabel: { ro: "Parcursul complet", en: "Full background" },
      ctaHref: "/despre",
      extra: {
        credentialsTitle: { ro: "Formare și certificări", en: "Education and certifications" },
        photoNote: {
          ro: "[DE COMPLETAT] Fotografia ta pe teren, format vertical 4:5",
          en: "[DE COMPLETAT] Your photo on court, portrait 4:5",
        },
      },
    },
    {
      key: "filozofia",
      order: 3,
      indexName: { ro: "Filozofia", en: "Philosophy" },
      title: {
        ro: "Fiecare lovitură are o explicație biomecanică. Fiecare lecție, un obiectiv.",
        en: "Every stroke has a biomechanical explanation. Every lesson, one objective.",
      },
      body: {
        ro: "O lovitură eficientă transferă energia prin lanțul kinetic: de la sol, prin membrele inferioare, bazin și trunchi, până la braț și rachetă. Corectez tehnica pe baza analizei mișcării, nu după impresii, și o consolidez prin exersare sistematică, până devine automatism în joc.",
        en: "An efficient stroke transfers energy through the kinetic chain: from the ground, through the legs, hips and trunk, to the arm and the racquet. I correct technique from movement analysis, not impressions, and consolidate it through systematic practice until it holds up in match play.",
      },
    },
    {
      key: "metoda",
      order: 4,
      indexName: { ro: "Metoda", en: "Method" },
      title: {
        ro: "Un proces de pregătire, nu o succesiune de lecții",
        en: "A training process, not a series of lessons",
      },
      body: {
        ro: [
          "1. **Evaluare inițială.** Testăm nivelul tehnic, calitățile motrice (viteză, coordonare, rezistență, mobilitate) și obiectivele sportivului.",
          "2. **Planificare periodizată.** Obiective pe cicluri de 8–12 săptămâni, cu volum și intensitate dozate după vârstă și calendarul competițional.",
          "3. **Instruire tehnico-tactică.** Fiecare ședință are un obiectiv operațional: demonstrație, exersare dirijată, feedback imediat, transfer în joc.",
          "4. **Control și reglare.** Analiză video, indicatori de progres și meciuri de verificare; planul se ajustează după fiecare evaluare.",
        ].join("\n"),
        en: [
          "1. **Initial assessment.** We test technical level, motor abilities (speed, coordination, endurance, mobility) and the player's goals.",
          "2. **Periodised planning.** Goals for 8–12-week cycles, with volume and intensity matched to age and the competition calendar.",
          "3. **Technical and tactical instruction.** Every session has one operational objective: demonstration, guided practice, immediate feedback, transfer to play.",
          "4. **Monitoring and adjustment.** Video analysis, progress indicators and practice matches; the plan is adjusted after each assessment.",
        ].join("\n"),
      },
      extra: {
        labTitle: { ro: "Laboratorul tehnic", en: "The technique lab" },
        labIntro: {
          ro: "Modelul biomecanic 3D arată fazele fiecărei lovituri. Alege lovitura, oprește mișcarea în orice moment și rotește camera ca să urmărești lanțul kinetic din toate unghiurile.",
          en: "The 3D biomechanical model shows the phases of each stroke. Choose a stroke, stop the motion at any moment and turn the camera to follow the kinetic chain from every angle.",
        },
      },
    },
    {
      key: "palierele",
      order: 5,
      indexName: { ro: "Palierele de pregătire", en: "Stages of development" },
      title: {
        ro: "De la inițiere la înaltă performanță",
        en: "From first steps to high performance",
      },
      body: {
        ro: [
          "1. **Inițiere.** Mini-tenis pentru 4–7 ani: coordonare, orientare în spațiu și elementele tehnice de bază, învățate prin joc.",
          "2. **Formare.** Pentru 8–12 ani: consolidarea tehnicii loviturilor, dezvoltarea calităților motrice, primele competiții.",
          "3. **Specializare.** Pentru 13–16 ani: pregătire tehnico-tactică individualizată, pregătire fizică specifică, calendar competițional planificat.",
          "4. **Înaltă performanță.** Periodizare pe obiective competiționale, analiză de joc și pregătire psihologică pentru turnee.",
          "5. **Adulți.** Învățare accelerată pentru începători, perfecționare tehnică și pregătire pentru competițiile de amatori.",
        ].join("\n"),
        en: [
          "1. **Introduction.** Mini tennis for ages 4–7: coordination, spatial awareness and the basic technical elements, learned through play.",
          "2. **Foundation.** Ages 8–12: consolidating stroke technique, developing motor abilities, first competitions.",
          "3. **Specialisation.** Ages 13–16: individual technical and tactical training, sport-specific conditioning, a planned competition calendar.",
          "4. **High performance.** Periodisation around competition goals, match analysis and mental preparation for tournaments.",
          "5. **Adults.** Accelerated learning for beginners, technical refinement and preparation for amateur competition.",
        ].join("\n"),
      },
    },
    {
      key: "programe",
      order: 6,
      indexName: { ro: "Programe", en: "Programmes" },
      title: { ro: "Programe de pregătire", en: "Training programmes" },
      body: { ro: "", en: "" },
      ctaLabel: { ro: "Toate programele", en: "All programmes" },
      ctaHref: "/programe",
    },
    {
      key: "terenul",
      order: 7,
      indexName: { ro: "Baza sportivă", en: "The venue" },
      title: { ro: "Unde ne antrenăm", en: "Where we train" },
      body: { ro: "", en: "" },
      ctaLabel: { ro: "Vezi facilitățile", en: "See the facilities" },
      ctaHref: "/facilitati",
    },
    {
      key: "prima-lectie",
      order: 8,
      indexName: { ro: "Prima lecție", en: "First lesson" },
      title: {
        ro: "Prima lecție este o evaluare inițială.",
        en: "The first lesson is an initial assessment.",
      },
      body: {
        ro: "Analizăm tehnica loviturilor, deplasarea în teren și obiectivele tale, apoi stabilim planul de pregătire. Fără abonament obligatoriu.",
        en: "We analyse your strokes, your movement on court and your goals, then agree on a training plan. No subscription required.",
      },
      ctaLabel: { ro: "Vezi prețurile", en: "See the prices" },
      ctaHref: "/preturi",
    },
    {
      key: "locurile",
      order: 9,
      indexName: { ro: "Locuri", en: "Places" },
      title: { ro: "Grupe mici, atenție individuală.", en: "Small groups, individual attention." },
      body: {
        ro: "Numărul de sportivi pe care îi pregătesc este limitat, pentru ca fiecare să primească feedback constant și un plan individualizat.",
        en: "I keep the number of players I coach limited, so that everyone gets constant feedback and an individual plan.",
      },
      extra: {
        available: { ro: "Locuri libere în {luna}: {n}", en: "Places left in {luna}: {n}" },
        full: {
          ro: "Luna aceasta e completă. Poți intra pe lista de așteptare.",
          en: "This month is full. You can join the waiting list.",
        },
        waitlistLabel: { ro: "Intră pe lista de așteptare", en: "Join the waiting list" },
      },
    },
    {
      key: "intrebari",
      order: 10,
      indexName: { ro: "Întrebări", en: "Questions" },
      title: { ro: "Înainte de prima lecție", en: "Before the first lesson" },
      body: { ro: "", en: "" },
      ctaLabel: { ro: "Toate întrebările", en: "All questions" },
      ctaHref: "/intrebari",
    },
    {
      key: "rezervare",
      order: 11,
      indexName: { ro: "Rezervare", en: "Booking" },
      title: { ro: "Programează prima ședință.", en: "Book your first session." },
      body: {
        ro: "Alege programul și vezi primele intervale libere.",
        en: "Choose a programme and see the first free times.",
      },
    },
  ];
}
