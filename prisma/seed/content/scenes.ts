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
 * site speaks as the club ("we": the club and its coaches). The story follows the club's own
 * public presentation and the tournament calendars of frt.ro and tenis10.ro.
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
        ro: fill("Club de tenis · {oras}"),
        en: fill("Tennis club · {oras}"),
      },
      title: {
        ro: "Experiență de elită în lumea tenisului.",
        en: "An elite experience in the world of tennis.",
      },
      body: {
        ro: fill(
          "{club}, în {oras}, lângă București: {terenuri} terenuri de zgură, {acoperite} acoperite, deschise zilnic între 07:00 și 22:00. Tenis pentru copii de la 4 ani, juniori și adulți, tot anul.",
        ),
        en: fill(
          "{club}, in {oras}, next to Bucharest: {terenuri} clay courts, {acoperite} of them covered, open every day from 07:00 to 22:00. Tennis for children from 4, juniors and adults, all year round.",
        ),
      },
      ctaLabel: { ro: "Rezervă un antrenament", en: "Book a session" },
      ctaHref: "/rezervare",
      extra: {
        secondaryLabel: { ro: "Închiriază un teren", en: "Hire a court" },
      },
    },
    {
      key: "campanie",
      order: 2,
      indexName: { ro: "Campania de iarnă", en: "Winter campaign" },
      title: {
        ro: "Campania de iarnă la Clubul Tenis Elite!",
        en: "The winter campaign at Clubul Tenis Elite!",
      },
      body: {
        ro: "Ai cel mai mic preț din București la închirierea terenului: doar **60 RON/oră**.\nCopilul tău vrea să învețe tenis? Oferim **2 ședințe GRATUITE** pentru toți copiii care se înscriu la grupele de inițiere!",
        en: "The lowest court hire price in Bucharest: just **60 RON an hour**.\nDoes your child want to learn tennis? We offer **2 FREE sessions** to every child who joins a beginners group!",
      },
      ctaLabel: { ro: "Rezervă terenul", en: "Book a court" },
      ctaHref: "/inchiriere-teren",
      extra: {
        secondaryLabel: { ro: "Înscrie copilul", en: "Sign your child up" },
      },
    },
    {
      key: "poveste",
      order: 3,
      indexName: { ro: "Povestea noastră", en: "Our story" },
      title: { ro: fill("Din {an}, pe zgură."), en: fill("On clay since {an}.") },
      body: {
        ro: fill(
          [
            "Totul a început în {an}, cu {exterior} terenuri de zgură în aer liber, în {oras}. Pentru ca tenisul să nu se oprească odată cu primul frig, clubul a ridicat apoi o sală cu încă {acoperite} terenuri de zgură acoperite, în care se joacă tot anul. De atunci, pe terenurile noastre se organizează turnee ale Federației Române de Tenis și Tenis10, iar de peste zece ani ducem tenisul în școli și grădinițe din București și Ilfov, ca tot mai mulți copii să țină o rachetă în mână.",
            "1. **{an}.** Primele {exterior} terenuri de zgură, în aer liber.",
            "2. **Sala acoperită.** Încă {acoperite} terenuri de zgură, pe orice vreme.",
            "3. **Turneele federației.** Competiții FRT și Tenis10, organizate pe terenurile clubului.",
            "4. **Școli și grădinițe.** Tenis pentru copii, împreună cu școli și grădinițe din București și Ilfov.",
            "5. **Azi.** Minitenis, juniori, seniori, înaltă performanță, tabere și team building.",
          ].join("\n"),
        ),
        en: fill(
          [
            "It all began in {an}, with {exterior} outdoor clay courts in {oras}. So that tennis would not stop with the first cold day, the club then built a hall with {acoperite} more covered clay courts, played on all year. Since then our courts have hosted Romanian Tennis Federation and Tenis10 tournaments, and for more than ten years we have taken tennis into schools and kindergartens in Bucharest and Ilfov, so that more and more children hold a racquet.",
            "1. **{an}.** The first {exterior} clay courts, outdoors.",
            "2. **The covered hall.** {acoperite} more clay courts, in any weather.",
            "3. **Federation tournaments.** FRT and Tenis10 competitions, held on the club's courts.",
            "4. **Schools and kindergartens.** Tennis for children, with schools and kindergartens in Bucharest and Ilfov.",
            "5. **Today.** Mini tennis, juniors, seniors, high performance, camps and team building.",
          ].join("\n"),
        ),
      },
      ctaLabel: { ro: "Palmaresul clubului", en: "The club's honours" },
      ctaHref: "/palmares",
    },
    {
      key: "cifre",
      order: 4,
      indexName: { ro: "Clubul", en: "The club" },
      title: { ro: fill("{club} în cifre"), en: fill("{club} in numbers") },
      body: { ro: "", en: "" },
    },
    {
      key: "piloni",
      order: 5,
      indexName: { ro: "Ce ne definește", en: "What defines us" },
      title: { ro: "Ce face diferența", en: "What makes the difference" },
      body: {
        ro: fill(
          [
            "1. **Zgură totală.** Toate cele {terenuri} terenuri sunt de zgură, iar {acoperite} sunt acoperite: antrenamentele nu se opresc pentru ploaie sau frig.",
            "2. **De la mingea roșie la turnee.** Copiii cresc pe etapele ITF, cu teren, rachetă și minge pe măsura lor, până la primele meciuri oficiale.",
            "3. **Turnee acasă.** Turnee ale Federației Române de Tenis și Tenis10 găzduite la club: juniorii joacă meciuri oficiale pe terenurile unde se antrenează.",
            "4. **De dimineața până seara.** Clubul este deschis zilnic, de luni până duminică, între 07:00 și 22:00, cu nocturnă pe toate terenurile.",
          ].join("\n"),
        ),
        en: fill(
          [
            "1. **Clay all round.** All {terenuri} courts are clay and {acoperite} are covered: training does not stop for rain or cold.",
            "2. **From the red ball to tournaments.** Children grow through the ITF stages, with a court, racquet and ball their size, up to their first official matches.",
            "3. **Tournaments at home.** Romanian Tennis Federation and Tenis10 tournaments hosted at the club: juniors play official matches on the courts where they train.",
            "4. **From morning to night.** The club is open every day, Monday to Sunday, from 07:00 to 22:00, with floodlights on every court.",
          ].join("\n"),
        ),
      },
    },
    {
      key: "programe",
      order: 6,
      indexName: { ro: "Programe de pregătire", en: "Training programmes" },
      title: {
        ro: "Un program pentru fiecare jucător",
        en: "A programme for every player",
      },
      body: {
        ro: "Inițiere, competiție, înaltă performanță, amatori, tabere și team building. Antrenorii clubului te ajută să alegi de la prima ședință.",
        en: "Beginners, competition, high performance, recreational, camps and team building. The club's coaches help you choose from the first session.",
      },
      ctaLabel: { ro: "Toate programele", en: "All programmes" },
      ctaHref: "/programe",
    },
    {
      key: "academia",
      order: 7,
      indexName: { ro: "Clubul Tenis Elite", en: "Clubul Tenis Elite" },
      title: {
        ro: "De la mingea roșie la mingea galbenă",
        en: "From the red ball to the yellow ball",
      },
      body: {
        ro: "Minitenisul crește odată cu copilul: mingea roșie, apoi portocalie și verde, pe terenuri pe măsura lui. De la 11 ani, juniorii și seniorii joacă cu mingea galbenă, pe terenul mare.",
        en: "Mini tennis grows with the child: the red ball, then orange and green, on courts their size. From 11, juniors and seniors play with the yellow ball on the full court.",
      },
      ctaLabel: { ro: "Înscrie copilul", en: "Sign your child up" },
      ctaHref: "/programe#inscriere",
      extra: {
        moreLabel: { ro: "Grupele clubului", en: "The club's groups" },
      },
    },
    {
      key: "potrivire",
      order: 8,
      indexName: { ro: "Găsește-ți programul", en: "Find your programme" },
      title: { ro: "3 întrebări, pasul potrivit", en: "3 questions, the right next step" },
      body: {
        ro: "Spune-ne pentru cine e tenisul, cât ai jucat până acum și ce îți dorești. Îți arătăm programul sau grupa potrivită.",
        en: "Tell us who the tennis is for, how much you have played and what you want. We show you the programme or group that fits.",
      },
    },
    {
      key: "echipa",
      order: 9,
      indexName: { ro: "Echipa", en: "The team" },
      title: { ro: "Antrenorii clubului", en: "The club's coaches" },
      body: {
        ro: "Tenisul, simplu: joc, răbdare și multe mingi lovite. Șase antrenori, coordonați de antrenorul principal Vlad Moșteanu.",
        en: "Tennis, made simple: play, patience and plenty of balls hit. Six coaches, led by head coach Vlad Moșteanu.",
      },
      ctaLabel: { ro: "Toată echipa", en: "The whole team" },
      ctaHref: "/echipa",
    },
    {
      key: "lectii",
      order: 10,
      indexName: { ro: "Tipuri de antrenament", en: "Kinds of session" },
      title: {
        ro: "Individual, în 2, în 3 sau în grup",
        en: "Private, for 2, for 3 or in a group",
      },
      body: {
        ro: "Programul spune ce lucrezi; antrenamentul, cu cine și cât timp. Durata o alegi la rezervare: 60, 90 sau 120 de minute.",
        en: "The programme says what you work on; the session, with whom and for how long. You choose the length when you book: 60, 90 or 120 minutes.",
      },
      ctaLabel: { ro: "Vezi prețurile", en: "See the prices" },
      ctaHref: "/preturi",
    },
    {
      key: "turnee",
      order: 11,
      indexName: { ro: "Turnee", en: "Tournaments" },
      title: { ro: "Meciuri oficiale, acasă", en: "Official matches, at home" },
      body: {
        ro: "Clubul găzduiește turnee ale Federației Române de Tenis și Tenis10. Juniorii joacă meciuri oficiale pe terenurile pe care se antrenează, cu antrenorii aproape.",
        en: "The club hosts Romanian Tennis Federation and Tenis10 tournaments. Juniors play official matches on the courts where they train, with their coaches close by.",
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
          "{terenuri} terenuri de zgură, dintre care {acoperite} acoperite profesional, vestiare cu dușuri, sală de fitness, recepție cu magazin și parcare, deschise zilnic între 07:00 și 22:00.",
        ),
        en: fill(
          "{terenuri} clay courts, {acoperite} of them professionally covered, changing rooms with showers, a fitness room, a reception with a shop and parking, open every day from 07:00 to 22:00.",
        ),
      },
      ctaLabel: { ro: "Vezi facilitățile", en: "See the facilities" },
      ctaHref: "/facilitati",
    },
    {
      key: "galerie",
      order: 13,
      indexName: { ro: "Galerie", en: "Gallery" },
      title: { ro: "Pe terenurile clubului", en: "On the club's courts" },
      body: {
        ro: "Imagini de la antrenamente, de la turnee și de pe podium.",
        en: "Pictures from training, tournaments and the podium.",
      },
      ctaLabel: { ro: "Toată galeria", en: "The whole gallery" },
      ctaHref: "/galerie",
    },
    {
      key: "intrebari",
      order: 14,
      indexName: { ro: "Întrebări", en: "Questions" },
      title: { ro: "Înainte de primul antrenament", en: "Before the first session" },
      body: { ro: "", en: "" },
      ctaLabel: { ro: "Toate întrebările", en: "All questions" },
      ctaHref: "/intrebari",
    },
    {
      key: "rezervare",
      order: 15,
      indexName: { ro: "Rezervare", en: "Booking" },
      title: { ro: "Rezervă un antrenament.", en: "Book a session." },
      body: {
        ro: "Alege programul, tipul antrenamentului și durata. Vezi imediat primele ore libere.",
        en: "Choose the programme, the kind of session and its length. You see the first free times straight away.",
      },
    },
  ];
}
