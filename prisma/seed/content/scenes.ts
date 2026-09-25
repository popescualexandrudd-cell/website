import type { Prisma } from "../../../lib/generated/prisma/client";

type SceneSeed = Prisma.SceneCreateInput;

type Vars = {
  /** The club's name. */
  club: string;
  /** The venue and its town. */
  locatie: string;
  oras: string;
  /** Number of courts and how many of them are covered, from config/club.yml. */
  terenuri: string;
  acoperite: string;
};

/**
 * The sections of the home page, top to bottom. `{club}`, `{locatie}`, `{oras}`, `{terenuri}`
 * and `{acoperite}` are replaced at seed time from config/club.yml. The academy speaks as "we":
 * the club and its coaches.
 */
export function sceneSeeds(vars: Vars): SceneSeed[] {
  const fill = (value: string) =>
    value
      .replaceAll("{club}", vars.club)
      .replaceAll("{locatie}", vars.locatie)
      .replaceAll("{oras}", vars.oras)
      .replaceAll("{terenuri}", vars.terenuri)
      .replaceAll("{acoperite}", vars.acoperite);

  return [
    {
      key: "deschiderea",
      order: 1,
      indexName: {
        ro: fill("Academie de tenis · {oras}"),
        en: fill("Tennis academy · {oras}"),
      },
      title: { ro: "Învață. Joacă. Concurează.", en: "Learn. Play. Compete." },
      body: {
        ro: fill(
          "Academia de tenis de la {locatie}, lângă București: copii de la 4 ani, juniori care joacă turnee și adulți care vor să învețe sau doar să joace, pe zgură, tot anul.",
        ),
        en: fill(
          "The tennis academy at {locatie}, next to Bucharest: children from the age of 4, juniors who play tournaments and adults who want to learn or simply play, on clay, all year round.",
        ),
      },
      ctaLabel: { ro: "Programează o lecție", en: "Book a lesson" },
      ctaHref: "/rezervare",
      extra: {
        secondaryLabel: { ro: "Academia de juniori", en: "Junior academy" },
        mediaNote: {
          ro: "[DE COMPLETAT] Video cu antrenamentele clubului, 10–20 de secunde, orizontal",
          en: "[DE COMPLETAT] A video of training at the club, 10–20 seconds, landscape",
        },
      },
    },
    {
      key: "manifest",
      order: 2,
      indexName: { ro: "Filozofia", en: "Philosophy" },
      title: {
        ro: "Înțelegi de ce, nu doar ce. Fiecare antrenament are un obiectiv.",
        en: "You learn why, not just what. Every session has one goal.",
      },
      body: {
        ro: "O lovitură bună pornește din picioare, trece prin șold și trunchi și abia la final ajunge în braț și în rachetă. Când corectăm ceva, explicăm de ce, ca jucătorul să poată repeta singur. Apoi exersăm până când mișcarea iese și în meci, nu doar la coșul cu mingi.",
        en: "A good stroke starts in the legs, passes through the hips and trunk and only at the end reaches the arm and the racquet. When we correct something, we explain why, so the player can repeat it on their own. Then we practise until it works in a match, not just from the ball basket.",
      },
    },
    {
      key: "cifre",
      order: 3,
      indexName: { ro: "Clubul", en: "The club" },
      title: { ro: fill("{club} în cifre"), en: fill("{club} in numbers") },
      body: { ro: "", en: "" },
    },
    {
      key: "programe",
      order: 4,
      indexName: { ro: "Programe de pregătire", en: "Training programmes" },
      title: {
        ro: "Inițiere, competiție sau tenis de plăcere",
        en: "Beginners, competition or tennis for fun",
      },
      body: {
        ro: "Programul spune ce lucrăm și pentru cine. Fiecare jucător începe cu o evaluare, apoi primește un plan pe câteva luni.",
        en: "The programme says what we work on and for whom. Every player starts with an assessment, then gets a plan for the next few months.",
      },
      ctaLabel: { ro: "Toate programele", en: "All programmes" },
      ctaHref: "/programe",
    },
    {
      key: "academia",
      order: 5,
      indexName: { ro: "Academia de juniori", en: "Junior academy" },
      title: { ro: "De la mingea roșie la turnee", en: "From the red ball to tournaments" },
      body: {
        ro: "Copiii cresc în tenis pe etape: teren, rachetă și minge pe măsura lor, apoi terenul mare. Fiecare copil începe cu o evaluare, ca să intre în grupa potrivită vârstei și nivelului său.",
        en: "Children grow into tennis in stages: a court, racquet and ball their size, then the full court. Every child starts with an assessment, so they join the group that fits their age and level.",
      },
      ctaLabel: { ro: "Cere o evaluare", en: "Ask for an assessment" },
      ctaHref: "/academie#evaluare",
      extra: {
        moreLabel: { ro: "Despre academia de juniori", en: "About the junior academy" },
      },
    },
    {
      key: "echipa",
      order: 6,
      indexName: { ro: "Echipa", en: "The team" },
      title: { ro: "Antrenorii academiei", en: "The academy's coaches" },
      body: {
        ro: "Oamenii care conduc antrenamentele, cu pregătirea și experiența fiecăruia.",
        en: "The people who run the sessions, with each one's training and experience.",
      },
      ctaLabel: { ro: "Toată echipa", en: "The whole team" },
      ctaHref: "/echipa",
      extra: {
        photoNote: {
          ro: "[DE COMPLETAT] Fotografia antrenorului pe teren, vertical 4:5",
          en: "[DE COMPLETAT] The coach's photo on court, portrait 4:5",
        },
      },
    },
    {
      key: "metoda",
      order: 7,
      indexName: { ro: "Metoda", en: "Method" },
      title: {
        ro: "Un plan, nu doar antrenamente unul după altul",
        en: "A plan, not just one session after another",
      },
      body: {
        ro: [
          "1. **Evaluare.** La început vedem cum lovește jucătorul, cum se mișcă și ce își dorește de la tenis.",
          "2. **Plan.** Stabilim obiective pe 8–12 săptămâni, potrivite vârstei și timpului pe care îl are.",
          "3. **Antrenament.** Fiecare antrenament are un obiectiv: arătăm, exersăm, corectăm pe loc, apoi îl punem în joc.",
          "4. **Verificare.** Din când în când filmăm, jucăm meciuri de verificare și ajustăm planul.",
        ].join("\n"),
        en: [
          "1. **Assessment.** At the start we see how the player hits, how they move and what they want from tennis.",
          "2. **Plan.** We set goals for 8–12 weeks that suit their age and the time they have.",
          "3. **Training.** Every session has one goal: we show, practise, correct on the spot, then use it in play.",
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
      key: "clubul",
      order: 8,
      indexName: { ro: "Baza sportivă", en: "The venue" },
      title: { ro: "Zgură, tot anul.", en: "Clay, all year round." },
      body: {
        ro: fill(
          "{locatie} are {terenuri} terenuri de zgură; {acoperite} sunt acoperite iarna, așa că antrenamentele continuă și în sezonul rece.",
        ),
        en: fill(
          "{locatie} has {terenuri} clay courts; {acoperite} are covered in winter, so training goes on through the cold season.",
        ),
      },
      ctaLabel: { ro: "Vezi facilitățile", en: "See the facilities" },
      ctaHref: "/facilitati",
      extra: {
        mediaNote: {
          ro: "[DE COMPLETAT] Fotografie cu terenurile clubului, orizontal",
          en: "[DE COMPLETAT] A photo of the club's courts, landscape",
        },
      },
    },
    {
      key: "galerie",
      order: 9,
      indexName: { ro: "Galerie", en: "Gallery" },
      title: { ro: "Din antrenamente și turnee", en: "From training and tournaments" },
      body: {
        ro: "Fotografii și filmări de pe terenurile clubului.",
        en: "Photos and videos from the club's courts.",
      },
      ctaLabel: { ro: "Toată galeria", en: "The whole gallery" },
      ctaHref: "/galerie",
      extra: {
        emptyNote: {
          ro: "[DE COMPLETAT] Fotografii și video-uri reale din antrenamente (admin → Galerie)",
          en: "[DE COMPLETAT] Real photos and videos from training (admin → Gallery)",
        },
      },
    },
    {
      key: "lectii",
      order: 10,
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
      key: "intrebari",
      order: 11,
      indexName: { ro: "Întrebări", en: "Questions" },
      title: { ro: "Înainte de primul antrenament", en: "Before the first session" },
      body: { ro: "", en: "" },
      ctaLabel: { ro: "Toate întrebările", en: "All questions" },
      ctaHref: "/intrebari",
    },
    {
      key: "rezervare",
      order: 12,
      indexName: { ro: "Rezervare", en: "Booking" },
      title: { ro: "Rezervă o lecție.", en: "Book a lesson." },
      body: {
        ro: "Alege programul, tipul lecției și durata. Vezi imediat primele ore libere.",
        en: "Choose the programme, the kind of lesson and its length. You see the first free times straight away.",
      },
    },
  ];
}
