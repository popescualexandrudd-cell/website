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
  /** Outdoor courts and the year the club opened. */
  exterior: string;
  an: string;
};

/**
 * The sections of the home page, top to bottom. `{club}`, `{locatie}`, `{oras}`, `{terenuri}`,
 * `{acoperite}`, `{exterior}` and `{an}` are replaced at seed time from config/club.yml. The
 * academy speaks as "we": the club and its coaches. The story follows the club's own public
 * presentation (elitetenisclub.ro) and the tournament calendars of frt.ro and tenis10.ro.
 */
export function sceneSeeds(vars: Vars): SceneSeed[] {
  const fill = (value: string) =>
    value
      .replaceAll("{club}", vars.club)
      .replaceAll("{locatie}", vars.locatie)
      .replaceAll("{oras}", vars.oras)
      .replaceAll("{terenuri}", vars.terenuri)
      .replaceAll("{acoperite}", vars.acoperite)
      .replaceAll("{exterior}", vars.exterior)
      .replaceAll("{an}", vars.an);

  return [
    {
      key: "deschiderea",
      order: 1,
      indexName: {
        ro: fill("Academie de tenis · {oras}"),
        en: fill("Tennis academy · {oras}"),
      },
      // The club's own line, from the opening of elitetenisclub.ro.
      title: {
        ro: "Experiență de elită în lumea tenisului.",
        en: "An elite experience in the world of tennis.",
      },
      body: {
        ro: fill(
          "Școală de tenis pentru copii și adulți la {locatie}, lângă București: copii de la 4 ani, juniori care joacă turnee și adulți care vor să învețe sau doar să joace, pe zgură, tot anul.",
        ),
        en: fill(
          "A tennis school for children and adults at {locatie}, next to Bucharest: children from the age of 4, juniors who play tournaments and adults who want to learn or simply play, on clay, all year round.",
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
      key: "poveste",
      order: 2,
      indexName: { ro: "Povestea clubului", en: "Our story" },
      title: { ro: fill("Din {an}, pe zgură."), en: fill("On clay since {an}.") },
      body: {
        ro: fill(
          [
            "Clubul a pornit în {an} cu {exterior} terenuri de zgură în aer liber, în {oras}. Apoi a ridicat o sală cu încă {acoperite} terenuri de zgură sub acoperiș, ca tenisul să nu se oprească iarna. Azi e unul dintre puținele cluburi din România cu terenuri acoperite profesional, folosite tot anul.",
            "1. **{an}.** Primele {exterior} terenuri de zgură, în aer liber.",
            "2. **Sala acoperită.** Încă {acoperite} terenuri de zgură, pe orice vreme, tot anul.",
            "3. **Școli și grădinițe.** De peste zece ani, tenis pentru copii împreună cu școli și grădinițe din București și Ilfov.",
            "4. **Turnee.** Turnee ale Federației Române de Tenis și Tenis10, jucate pe terenurile clubului.",
            "5. **Azi.** Mini-tenis, inițiere, avansați și performanță, lecții pentru adulți și pregătire fizică.",
          ].join("\n"),
        ),
        en: fill(
          [
            "The club started in {an} with {exterior} outdoor clay courts in {oras}. It then built a hall with {acoperite} more clay courts under a roof, so tennis does not stop in winter. Today it is one of the few clubs in Romania with professionally covered courts used all year round.",
            "1. **{an}.** The first {exterior} clay courts, outdoors.",
            "2. **The covered hall.** {acoperite} more clay courts, in any weather, all year.",
            "3. **Schools and kindergartens.** For more than ten years, tennis for children with schools and kindergartens in Bucharest and Ilfov.",
            "4. **Tournaments.** Romanian Tennis Federation and Tenis10 tournaments, played on the club's courts.",
            "5. **Today.** Mini tennis, beginners, advanced and performance players, lessons for adults and fitness training.",
          ].join("\n"),
        ),
      },
      ctaLabel: { ro: "Povestea completă", en: "The whole story" },
      ctaHref: "/despre#poveste",
    },
    {
      key: "manifest",
      order: 8,
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
      key: "piloni",
      order: 4,
      indexName: { ro: "Ce ne definește", en: "What defines us" },
      title: { ro: "Ce face diferența", en: "What makes the difference" },
      body: {
        ro: fill(
          [
            "1. **Zgură, tot anul.** {acoperite} terenuri acoperite profesional și {exterior} în aer liber: antrenamentele nu se opresc pentru ploaie sau frig.",
            "2. **De la mingea roșie la turnee.** Copiii cresc pe etapele ITF, cu teren, rachetă și minge pe măsura lor.",
            "3. **Turnee acasă.** Turnee ale Federației Române de Tenis și Tenis10 găzduite la club: juniorii pot juca meciuri oficiale pe terenurile unde se antrenează.",
            "4. **Deschis de dimineața până seara.** Terenurile se pot închiria zilnic, iar pe cele acoperite se joacă și seara, la nocturnă.",
          ].join("\n"),
        ),
        en: fill(
          [
            "1. **Clay, all year round.** {acoperite} professionally covered courts and {exterior} outdoors: training does not stop for rain or cold.",
            "2. **From the red ball to tournaments.** Children grow through the ITF stages, with a court, racquet and ball their size.",
            "3. **Tournaments at home.** Romanian Tennis Federation and Tenis10 tournaments hosted at the club: juniors can play official matches on the courts where they train.",
            "4. **Open from morning to night.** Courts can be hired every day, and the covered ones are floodlit for evening play.",
          ].join("\n"),
        ),
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
      body: {
        ro: "Programul spune ce lucrăm și pentru cine. Fiecare jucător începe cu o evaluare, apoi primește un plan pe câteva luni.",
        en: "The programme says what we work on and for whom. Every player starts with an assessment, then gets a plan for the next few months.",
      },
      ctaLabel: { ro: "Toate programele", en: "All programmes" },
      ctaHref: "/programe",
    },
    {
      key: "academia",
      order: 6,
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
      key: "potrivire",
      order: 7,
      indexName: { ro: "Găsește-ți programul", en: "Find your programme" },
      title: { ro: "Trei întrebări, pasul potrivit", en: "Three questions, the right next step" },
      body: {
        ro: "Spune-ne pentru cine e tenisul, cât a jucat până acum și ce își dorește. Îți arătăm programul sau grupa potrivită și ce urmează.",
        en: "Tell us who the tennis is for, how much they have played and what they want from it. We show you the programme or group that fits and what comes next.",
      },
    },
    {
      key: "echipa",
      order: 9,
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
      order: 10,
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
    },
    {
      key: "turnee",
      order: 11,
      indexName: { ro: "Turnee", en: "Tournaments" },
      title: { ro: "Meciuri oficiale, acasă", en: "Official matches, at home" },
      body: {
        ro: "Clubul găzduiește turnee ale Federației Române de Tenis și Tenis10. Juniorii pot juca meciuri oficiale pe terenurile pe care se antrenează, cu antrenorii lângă ei.",
        en: "The club hosts Romanian Tennis Federation and Tenis10 tournaments. Juniors can play official matches on the courts where they train, with their coaches close by.",
      },
      ctaLabel: { ro: "Toate turneele", en: "All tournaments" },
      ctaHref: "/turnee",
    },
    {
      key: "clubul",
      order: 12,
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
      order: 13,
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
      key: "social",
      order: 14,
      indexName: { ro: "Comunitatea", en: "Community" },
      title: { ro: "Urmărește clubul", en: "Follow the club" },
      body: {
        ro: "Anunțuri, oferte și imagini de pe teren, pe Instagram și pe Facebook.",
        en: "News, offers and pictures from the courts, on Instagram and Facebook.",
      },
    },
    {
      key: "lectii",
      order: 15,
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
      order: 16,
      indexName: { ro: "Întrebări", en: "Questions" },
      title: { ro: "Înainte de primul antrenament", en: "Before the first session" },
      body: { ro: "", en: "" },
      ctaLabel: { ro: "Toate întrebările", en: "All questions" },
      ctaHref: "/intrebari",
    },
    {
      key: "rezervare",
      order: 17,
      indexName: { ro: "Rezervare", en: "Booking" },
      title: { ro: "Rezervă o lecție.", en: "Book a lesson." },
      body: {
        ro: "Alege programul, tipul lecției și durata. Vezi imediat primele ore libere.",
        en: "Choose the programme, the kind of lesson and its length. You see the first free times straight away.",
      },
    },
  ];
}
