import type { Prisma } from "../../../lib/generated/prisma/client";

type SceneSeed = Prisma.SceneCreateInput;

/**
 * The sections of the home page, top to bottom. `{nume}` and `{locatie}` are replaced at seed
 * time from config/antrenor.yml. Plain, friendly wording, short enough to read on a phone.
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
        ro: "Lecții de tenis pentru copii și adulți, de la primele lovituri la turnee.",
        en: "Tennis lessons for children and adults, from the first strokes to tournaments.",
      },
      body: {
        ro: fill(
          "Sunt antrenor la {locatie}, în Pantelimon, lângă București. Lucrez cu începători, cu jucători care joacă de plăcere și cu cei care merg la turnee: individual, în doi, în trei sau în grup, pe zgură, tot anul.",
        ),
        en: fill(
          "I coach at {locatie} in Pantelimon, next to Bucharest. I work with beginners, with people who play for fun and with those who play tournaments: one to one, in twos, threes or groups, on clay, all year round.",
        ),
      },
      ctaLabel: { ro: "Rezervă prima lecție", en: "Book your first lesson" },
      ctaHref: "/rezervare",
      extra: {
        stat1Value: { ro: "4 ani", en: "4 years" },
        stat1Label: { ro: "ca antrenor de tenis", en: "as a tennis coach" },
        stat2Value: { ro: "Nivel european", en: "European level" },
        stat2Label: {
          ro: "rezultate ale copiilor pe care i-am pregătit",
          en: "results of the children I have coached",
        },
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
        secondaryLabel: { ro: "Vezi programele", en: "See the programmes" },
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
          "Sunt antrenor la {locatie} de patru ani. Am jucat tenis ca sportiv, am terminat facultatea de sport la UNEFS, cu specializarea tenis, și am făcut formarea psihopedagogică, așa că pe teren îmbin experiența de jucător cu partea de metodică.\n\nLucrez cu toate nivelurile, de la copii care abia încep până la juniori care joacă turnee. Câțiva dintre copiii pe care i-am pregătit au avut rezultate bune la nivel național și european, inclusiv titluri de campion al României.",
        ),
        en: fill(
          "I have been coaching at {locatie} for four years. I played as an athlete, graduated in sport from UNEFS with a tennis specialisation and completed teacher training, so on court I combine a player's experience with sound method.\n\nI work with every level, from children who are just starting to juniors who play tournaments. Several of the children I have coached have done well nationally and in Europe, including Romanian champions.",
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
        ro: "Înțelegi de ce, nu doar ce. Fiecare lecție are un obiectiv.",
        en: "You learn why, not just what. Every lesson has one goal.",
      },
      body: {
        ro: "O lovitură bună pornește din picioare, trece prin șold și trunchi și abia la final ajunge în braț și în rachetă. Când corectez ceva, îți explic de ce, ca să poți repeta singur. Apoi exersăm până când mișcarea iese și în meci, nu doar la coșul cu mingi.",
        en: "A good stroke starts in the legs, passes through the hips and trunk and only at the end reaches the arm and the racquet. When I correct something, I explain why, so you can repeat it on your own. Then we practise until it works in a match, not just from the ball basket.",
      },
    },
    {
      key: "metoda",
      order: 4,
      indexName: { ro: "Metoda", en: "Method" },
      title: {
        ro: "Un plan, nu doar lecții una după alta",
        en: "A plan, not just one lesson after another",
      },
      body: {
        ro: [
          "1. **Evaluare.** La prima lecție văd cum lovești, cum te miști și ce îți dorești de la tenis.",
          "2. **Plan.** Stabilim obiective pe 8–12 săptămâni, potrivite vârstei și timpului pe care îl ai.",
          "3. **Antrenament.** Fiecare lecție are un obiectiv: îți arăt, exersăm, corectăm pe loc, apoi îl punem în joc.",
          "4. **Verificare.** Din când în când filmăm, jucăm meciuri de verificare și ajustăm planul.",
        ].join("\n"),
        en: [
          "1. **Assessment.** In the first lesson I see how you hit, how you move and what you want from tennis.",
          "2. **Plan.** We set goals for 8–12 weeks that suit your age and the time you have.",
          "3. **Training.** Every lesson has one goal: I show you, we practise, I correct on the spot, then we use it in play.",
          "4. **Check-ins.** Now and then we film, play practice matches and adjust the plan.",
        ].join("\n"),
      },
      extra: {
        labTitle: { ro: "Laboratorul de biomecanică", en: "The biomechanics lab" },
        labIntro: {
          ro: "Jucătorul 3D arată fazele fiecărei lovituri pe un teren de zgură. Alege lovitura, oprește mișcarea unde vrei și rotește camera ca să o vezi din orice unghi.",
          en: "The 3D player shows the phases of each stroke on a clay court. Choose a stroke, pause the motion wherever you like and turn the camera to see it from any angle.",
        },
      },
    },
    {
      key: "programe",
      order: 5,
      indexName: { ro: "Programe de pregătire", en: "Training programmes" },
      title: {
        ro: "Inițiere, competiție sau tenis de plăcere",
        en: "Beginners, competition or tennis for fun",
      },
      body: { ro: "", en: "" },
      ctaLabel: { ro: "Toate programele", en: "All programmes" },
      ctaHref: "/programe",
    },
    {
      key: "lectii",
      order: 6,
      indexName: { ro: "Tipuri de lecții", en: "Kinds of lesson" },
      title: { ro: "Singur, în doi sau în grup", en: "On your own, in pairs or in a group" },
      body: {
        ro: "Programul spune ce lucrăm; lecția, cu cine și cât timp. Durata o alegi la rezervare: 60, 90, 120 de minute sau mai mult.",
        en: "The programme says what we work on; the lesson, with whom and for how long. You choose the length when you book: 60, 90, 120 minutes or more.",
      },
      ctaLabel: { ro: "Vezi prețurile", en: "See the prices" },
      ctaHref: "/preturi",
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
        ro: "Prima lecție e o evaluare.",
        en: "The first lesson is an assessment.",
      },
      body: {
        ro: "Lovim câteva mingi, vorbim despre ce îți dorești și stabilim cum continuăm. Fără abonament obligatoriu.",
        en: "We hit some balls, talk about what you want and agree on how to continue. No subscription required.",
      },
      ctaLabel: { ro: "Vezi prețurile", en: "See the prices" },
      ctaHref: "/preturi",
    },
    {
      key: "locurile",
      order: 9,
      indexName: { ro: "Locuri", en: "Places" },
      title: { ro: "Număr limitat de elevi.", en: "A limited number of players." },
      body: {
        ro: "Lucrez cu un număr limitat de elevi, ca fiecare să aibă atenția mea la fiecare lecție.",
        en: "I keep the number of players I coach limited, so everyone gets my full attention in every lesson.",
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
      title: { ro: "Rezervă o lecție.", en: "Book a lesson." },
      body: {
        ro: "Alege programul, tipul lecției și durata. Vezi imediat primele ore libere.",
        en: "Choose the programme, the kind of lesson and its length. You see the first free times straight away.",
      },
    },
  ];
}
