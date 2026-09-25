import type { Audience, Level, PriceUnit } from "../../../lib/generated/prisma/client";

type Text = { ro: string; en: string };

/** A training programme: what we work on and for whom. */
export type ProgramContent = {
  slug: string;
  /** The name under `programe:` in config/club.yml. */
  configName: string;
  name: Text;
  summary: Text;
  description: Text;
  focusPoints: { ro: string[]; en: string[] };
  audience: Audience;
  level: Level;
  ageMin?: number;
  ageMax?: number;
  /** Booked online as lessons (false: camps and corporate events, arranged by phone). */
  bookableOnline?: boolean;
};

/** A kind of lesson: with how many people, for how long, at what hourly rate. */
export type LessonContent = {
  slug: string;
  /** The name under `lectii:` in config/club.yml. */
  configName: string;
  name: Text;
  summary: Text;
  minParticipants: number;
  maxParticipants: number;
  priceUnit: PriceUnit;
};

export const programContent: ProgramContent[] = [
  {
    slug: "initiere",
    configName: "Inițiere",
    name: { ro: "Inițiere", en: "Beginners" },
    summary: {
      ro: "Primii pași în tenis, pentru copii de la 4 ani și pentru adulți care n-au mai jucat. Copiii încep cu 2 ședințe gratuite.",
      en: "First steps in tennis, for children from 4 and adults who have never played. Children start with 2 free sessions.",
    },
    focusPoints: {
      ro: [
        "priza, poziția de așteptare și primele lovituri",
        "coordonare, echilibru și deplasare în teren",
        "forehand, rever și primul serviciu",
        "regulile și numărătoarea, ca să poți juca un meci",
      ],
      en: [
        "the grip, the ready position and the first strokes",
        "coordination, balance and moving on court",
        "forehand, backhand and a first serve",
        "the rules and scoring, so you can play a match",
      ],
    },
    audience: "TOATE",
    level: "INCEPATOR",
    ageMin: 4,
    description: {
      ro: `Inițierea este locul în care tenisul devine joacă, apoi pasiune. Copiii încep cu minitenisul: teren mic, rachete pe măsura lor și mingi mai moi, care sar încet și le lasă timp să lovească. Adulții merg direct pe terenul mare, cu mingi mai lente la început, ca loviturile să iasă din primele antrenamente.

## Oferta de bun venit

Toți copiii care se înscriu la grupele de inițiere primesc **primele 2 ședințe gratuit**. Fără obligații, iar echipamentul îl asigurăm noi.

## Ce lucrăm

- priza, poziția de așteptare și primele lovituri;
- coordonare, echilibru și deplasare în teren;
- forehand, rever și primul serviciu;
- regulile și numărătoarea, ca să poți juca un meci.

## Ritmul

Cu două antrenamente pe săptămână, cei mai mulți țin un schimb de mingi după câteva săptămâni, iar după câteva luni joacă primele meciuri.

## Ce aduci

Pantofi sport cu talpă plată (ideal, pantofi de tenis pentru zgură), haine lejere și o sticlă cu apă. Rachetele și mingile le primești de la club.`,
      en: `Beginners is where tennis becomes play, then a passion. Children start with mini tennis: a small court, racquets their size and softer balls that bounce slowly and give them time to hit. Adults go straight to the full court, with slower balls at first, so the strokes work from the first sessions.

## Our welcome offer

Every child who joins a beginners group gets **the first 2 sessions free**. No commitment, and we provide the equipment.

## What we work on

- the grip, the ready position and the first strokes;
- coordination, balance and moving on court;
- forehand, backhand and a first serve;
- the rules and scoring, so you can play a match.

## The pace

With two sessions a week, most players keep a rally going within a few weeks and play their first matches within a few months.

## What to bring

Flat-soled trainers (ideally clay-court tennis shoes), comfortable clothes and a bottle of water. The club provides racquets and balls.`,
    },
  },
  {
    slug: "competitie",
    configName: "Competiție",
    name: { ro: "Competiție", en: "Competition" },
    summary: {
      ro: "Pentru copii, juniori și adulți care joacă turnee sau se pregătesc pentru primul. Tehnică, tactică, pregătire fizică și meciuri oficiale acasă.",
      en: "For children, juniors and adults who play tournaments or are getting ready for their first. Technique, tactics, conditioning and official matches at home.",
    },
    focusPoints: {
      ro: [
        "lovituri care rezistă la viteză și la presiunea meciului",
        "tactică: construcția punctului, serviciu și retur",
        "pregătire fizică specifică tenisului",
        "calendarul de turnee ales după vârstă și nivel",
        "rutine între puncte și controlul emoțiilor",
      ],
      en: [
        "strokes that hold up at match speed and under pressure",
        "tactics: building the point, serve and return",
        "tennis-specific conditioning",
        "a tournament calendar chosen by age and level",
        "routines between points and handling nerves",
      ],
    },
    audience: "TOATE",
    level: "COMPETITIE",
    description: {
      ro: `Programul de competiție pregătește jucătorii pentru turneele Federației Române de Tenis și Tenis10. Avantajul clubului: multe dintre aceste turnee se joacă chiar pe terenurile noastre, așa că primele meciuri oficiale au loc într-un loc cunoscut, cu antrenorii aproape.

## Ce lucrăm

- lovituri care rezistă la viteză și la presiunea meciului;
- tactică: construcția punctului, serviciu și retur;
- pregătire fizică specifică tenisului;
- calendarul de turnee ales după vârstă și nivel;
- rutine între puncte și controlul emoțiilor.

## După fiecare turneu

Antrenorii clubului discută meciurile cu jucătorul: ce a mers, ce nu și ce ducem în antrenamentele următoare.

## Cum te antrenezi

În grupe mici de nivel apropiat, completate cu antrenamente individuale sau în doi.`,
      en: `The competition programme prepares players for Romanian Tennis Federation and Tenis10 tournaments. The club's advantage: many of these tournaments are played on our own courts, so the first official matches happen somewhere familiar, with the coaches close by.

## What we work on

- strokes that hold up at match speed and under pressure;
- tactics: building the point, serve and return;
- tennis-specific conditioning;
- a tournament calendar chosen by age and level;
- routines between points and handling nerves.

## After every tournament

The club's coaches go through the matches with the player: what worked, what did not, and what we take into the next sessions.

## How you train

In small groups of a similar level, together with private or paired sessions.`,
    },
  },
  {
    slug: "inalta-performanta",
    configName: "Înaltă performanță",
    name: { ro: "Înaltă performanță", en: "High performance" },
    summary: {
      ro: "Pentru juniorii care țintesc titluri naționale și turnee internaționale. Mai multe antrenamente pe săptămână, pregătire fizică și un plan de sezon.",
      en: "For juniors aiming at national titles and international tournaments. More sessions a week, conditioning and a season plan.",
    },
    focusPoints: {
      ro: [
        "plan de sezon cu obiective clare și turnee alese atent",
        "antrenamente tehnice și tactice de intensitate mare",
        "pregătire fizică și prevenirea accidentărilor",
        "pregătire mentală pentru meciurile importante",
        "legătura constantă între antrenor, jucător și părinți",
      ],
      en: [
        "a season plan with clear goals and carefully chosen tournaments",
        "high-intensity technical and tactical sessions",
        "conditioning and injury prevention",
        "mental preparation for big matches",
        "constant contact between coach, player and parents",
      ],
    },
    audience: "JUNIORI",
    level: "COMPETITIE",
    ageMin: 10,
    ageMax: 18,
    description: {
      ro: `Înalta performanță este pasul următor pentru juniorii care joacă deja turnee și vor mai mult: clasament național, titluri, turnee internaționale. Programul este coordonat de antrenorul principal al clubului, împreună cu echipa de antrenori.

## Ce lucrăm

- plan de sezon cu obiective clare și turnee alese atent;
- antrenamente tehnice și tactice de intensitate mare;
- pregătire fizică și prevenirea accidentărilor;
- pregătire mentală pentru meciurile importante;
- legătura constantă între antrenor, jucător și părinți.

## Cum intri în program

Accesul se face după o evaluare cu antrenorul principal, care ține cont de rezultate, de nivelul de joc și de timpul pe care juniorul îl poate dedica tenisului.

## Sala acoperită

Terenurile de zgură acoperite permit pregătirea fără întrerupere și iarna, exact în perioada în care se construiește forma pentru sezonul următor.`,
      en: `High performance is the next step for juniors who already play tournaments and want more: a national ranking, titles, international events. The programme is led by the club's head coach together with the coaching team.

## What we work on

- a season plan with clear goals and carefully chosen tournaments;
- high-intensity technical and tactical sessions;
- conditioning and injury prevention;
- mental preparation for big matches;
- constant contact between coach, player and parents.

## How to join

Entry follows an assessment with the head coach, who looks at results, level of play and the time the junior can give to tennis.

## The covered hall

The covered clay courts allow uninterrupted training in winter too, exactly when the form for next season is built.`,
    },
  },
  {
    slug: "amatori",
    configName: "Amatori",
    name: { ro: "Amatori", en: "Recreational" },
    summary: {
      ro: "Tenis de plăcere pentru adulți: lovituri mai sigure, mai multă mișcare și meciuri mai bune cu prietenii. Orice nivel.",
      en: "Tennis for fun for adults: more reliable strokes, more exercise and better matches with friends. Any level.",
    },
    focusPoints: {
      ro: [
        "lovituri mai sigure, blânde cu încheietura și umărul",
        "serviciu și retur, care decid cele mai multe puncte",
        "jocul la fileu și dublul",
        "tactică simplă pentru meciurile de club",
      ],
      en: [
        "more reliable strokes, kinder to wrist and shoulder",
        "serve and return, which decide most points",
        "net play and doubles",
        "simple tactics for club matches",
      ],
    },
    audience: "ADULTI",
    level: "TOATE",
    description: {
      ro: `Programul pentru amatori este pentru adulții care joacă din plăcere: după serviciu, în weekend, cu prietenii. Nu cere un anumit nivel. Unii vin să repare o lovitură care îi încurcă de ani buni, alții vor să se miște mai mult sau să câștige mai des meciul de sâmbătă.

## Ce lucrăm

- lovituri mai sigure, blânde cu încheietura și umărul;
- serviciu și retur, care decid cele mai multe puncte;
- jocul la fileu și dublul;
- tactică simplă pentru meciurile de club.

## Ritmul

Vii cât îți permite programul. Un antrenament pe săptămână te ține în formă; două aduc progres vizibil.

## Mai mult decât antrenament

Liga amatorilor și lista „Găsește partener” te pun în legătură cu jucători de nivelul tău, pentru meciuri adevărate.`,
      en: `The recreational programme is for adults who play for fun: after work, at weekends, with friends. No particular level is needed. Some come to fix a stroke that has bothered them for years, others want more exercise or to win Saturday's match more often.

## What we work on

- more reliable strokes, kinder to wrist and shoulder;
- serve and return, which decide most points;
- net play and doubles;
- simple tactics for club matches.

## The pace

Come as often as your schedule allows. One session a week keeps you in shape; two bring visible progress.

## More than training

The amateur league and the "Find a partner" list put you in touch with players of your level, for real matches.`,
    },
  },
  {
    slug: "tabere",
    configName: "Tabere",
    name: { ro: "Tabere de tenis", en: "Tennis camps" },
    summary: {
      ro: "În vacanțele școlare, zile întregi de tenis, mișcare și jocuri pentru copii, cu antrenorii clubului, pe zgură.",
      en: "In the school holidays, full days of tennis, exercise and games for children, with the club's coaches, on clay.",
    },
    focusPoints: {
      ro: [
        "antrenamente de tenis pe grupe de vârstă și nivel",
        "jocuri de coordonare și pregătire fizică adaptată vârstei",
        "mini-turnee la final de săptămână",
        "prieteni noi și o vacanță activă, departe de ecrane",
      ],
      en: [
        "tennis sessions by age and level",
        "coordination games and age-appropriate conditioning",
        "mini tournaments at the end of the week",
        "new friends and an active holiday, away from screens",
      ],
    },
    audience: "COPII",
    level: "TOATE",
    ageMin: 5,
    ageMax: 14,
    bookableOnline: false,
    description: {
      ro: `Taberele de tenis transformă vacanța școlară într-o săptămână activă, pe zgură, alături de antrenorii clubului. Copiii sunt împărțiți pe grupe de vârstă și nivel, așa că fiecare lucrează în ritmul lui, de la primii pași până la jucătorii de turneu.

## O zi de tabără

- antrenamente de tenis pe grupe de vârstă și nivel;
- jocuri de coordonare și pregătire fizică adaptată vârstei;
- mini-turnee la final de săptămână;
- prieteni noi și o vacanță activă, departe de ecrane.

## Pe orice vreme

Dacă plouă, tabăra continuă pe terenurile acoperite.

## Înscrierea

Perioadele taberelor le anunțăm pe site, pe Facebook și pe Instagram. Pentru locuri și detalii, sună-ne sau scrie-ne.`,
      en: `Tennis camps turn the school holidays into an active week on clay with the club's coaches. Children are split by age and level, so each works at their own pace, from first steps to tournament players.

## A day at camp

- tennis sessions by age and level;
- coordination games and age-appropriate conditioning;
- mini tournaments at the end of the week;
- new friends and an active holiday, away from screens.

## Whatever the weather

If it rains, the camp carries on in the covered courts.

## Signing up

We announce the camp dates on the site, on Facebook and on Instagram. For places and details, call or write to us.`,
    },
  },
  {
    slug: "team-building",
    configName: "Team building",
    name: { ro: "Team building și evenimente corporate", en: "Team building and corporate events" },
    summary: {
      ro: "Tenis pentru echipa ta: inițiere pentru colegi, turnee interne și evenimente de firmă, cu terenuri, antrenori și echipament asigurate.",
      en: "Tennis for your team: taster sessions for colleagues, in-house tournaments and company events, with courts, coaches and equipment provided.",
    },
    focusPoints: {
      ro: [
        "inițiere în tenis pentru colegii care n-au jucat niciodată",
        "turneu intern de simplu sau dublu, cu tablou și premiere",
        "antrenori ai clubului pe fiecare teren",
        "rachete și mingi pentru toți participanții",
      ],
      en: [
        "a tennis taster for colleagues who have never played",
        "an in-house singles or doubles tournament, with a draw and prize-giving",
        "club coaches on every court",
        "racquets and balls for everyone",
      ],
    },
    audience: "ADULTI",
    level: "TOATE",
    bookableOnline: false,
    description: {
      ro: `Un team building pe terenul de tenis leagă echipa altfel decât o ședință: colegii se mișcă, râd și joacă împreună. Clubul organizează evenimente pentru firme de la câteva persoane până la echipe mari, pe cele 8 terenuri de zgură.

## Ce putem organiza

- inițiere în tenis pentru colegii care n-au jucat niciodată;
- turneu intern de simplu sau dublu, cu tablou și premiere;
- antrenori ai clubului pe fiecare teren;
- rachete și mingi pentru toți participanții.

## Pe orice vreme

Terenurile acoperite fac evenimentul posibil în orice anotimp.

## Oferta

Spune-ne câți colegi vin, ce dată preferați și ce vă doriți, iar noi îți trimitem propunerea.`,
      en: `A team building day on the tennis court brings a team together differently from a meeting: colleagues move, laugh and play together. The club runs events for companies from a handful of people to large teams, on its 8 clay courts.

## What we can organise

- a tennis taster for colleagues who have never played;
- an in-house singles or doubles tournament, with a draw and prize-giving;
- club coaches on every court;
- racquets and balls for everyone.

## Whatever the weather

The covered courts make the event possible in any season.

## Your quote

Tell us how many colleagues are coming, the date you prefer and what you would like, and we will send you a proposal.`,
    },
  },
];

export const lessonContent: LessonContent[] = [
  {
    slug: "antrenament-individual",
    configName: "Antrenament individual",
    name: { ro: "Antrenament individual", en: "Private session" },
    summary: {
      ro: "Doar tu și antrenorul. Tot timpul este al tău: corecturi pe loc, în ritmul tău.",
      en: "Just you and the coach. All the time is yours: on-the-spot corrections, at your pace.",
    },
    minParticipants: 1,
    maxParticipants: 1,
    priceUnit: "LECTIE",
  },
  {
    slug: "antrenament-in-2",
    configName: "Antrenament în 2",
    name: { ro: "Antrenament în 2", en: "Session for 2" },
    summary: {
      ro: "Doi jucători de nivel apropiat: prieteni, frați, părinte și copil. Multe schimburi de mingi și puncte jucate.",
      en: "Two players of a similar level: friends, siblings, parent and child. Plenty of rallies and points played.",
    },
    minParticipants: 2,
    maxParticipants: 2,
    priceUnit: "PERSOANA",
  },
  {
    slug: "antrenament-in-3",
    configName: "Antrenament în 3",
    name: { ro: "Antrenament în 3", en: "Session for 3" },
    summary: {
      ro: "Trei jucători pe un teren. Ritm alert, exerciții prin rotație și jocuri cu puncte.",
      en: "Three players on one court. A brisk pace, rotation drills and point games.",
    },
    minParticipants: 3,
    maxParticipants: 3,
    priceUnit: "PERSOANA",
  },
  {
    slug: "antrenament-de-grup",
    configName: "Antrenament de grup",
    name: { ro: "Antrenament de grup", en: "Group session" },
    summary: {
      ro: "Între 4 și 6 jucători de nivel apropiat. Exerciții pe stații, jocuri și multă mișcare.",
      en: "Four to six players of a similar level. Drill stations, games and plenty of movement.",
    },
    minParticipants: 4,
    maxParticipants: 6,
    priceUnit: "PERSOANA",
  },
];
