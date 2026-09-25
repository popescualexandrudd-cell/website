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
      ro: "Pentru cei care încep: copii de la 4 ani și adulți care n-au mai jucat. Învățăm loviturile de bază, mișcarea în teren și regulile, fără grabă.",
      en: "For people starting out: children from 4 and adults who have never played. We learn the basic strokes, how to move on court and the rules, without rushing.",
    },
    focusPoints: {
      ro: [
        "priza și poziția de așteptare",
        "forehand, rever și primul serviciu",
        "deplasarea în teren și echilibrul la lovire",
        "regulile și numărătoarea, ca să poți juca un meci",
      ],
      en: [
        "the grip and the ready position",
        "forehand, backhand and a first serve",
        "moving on court and staying balanced when you hit",
        "the rules and scoring, so you can play a match",
      ],
    },
    audience: "TOATE",
    level: "INCEPATOR",
    ageMin: 4,
    description: {
      ro: `Inițierea e pentru cine ține racheta în mână pentru prima dată sau aproape. La copii începem cu mini-tenis: teren mai mic, mingi mai moi și multe jocuri de coordonare. La adulți mergem direct pe terenul mare, dar cu mingi mai lente la început, ca loviturile să iasă din primele lecții.

## Ce lucrăm

- priza și poziția de așteptare;
- forehand, rever și primul serviciu;
- deplasarea în teren și echilibrul la lovire;
- regulile și numărătoarea, ca să poți juca un meci.

## Cât durează

Cei mai mulți țin un schimb de mingi după câteva lecții. Cu una sau două lecții pe săptămână, după trei-patru luni poți juca un set cu cineva de nivel apropiat.

## Cum te antrenezi

Inițierea merge în lecții individuale, în doi cu un prieten, în trei sau într-o grupă mică. Durata o alegi la rezervare; la început, 60 de minute sunt de obicei de ajuns.

## Ce aduci

Pantofi sport cu talpă plată (ideal, pantofi de tenis pentru zgură), haine lejere și apă. Racheta și mingile ți le împrumut eu la început.`,
      en: `The beginners programme is for anyone holding a racquet for the first time, or nearly. With children we start with mini tennis: a smaller court, softer balls and plenty of coordination games. With adults we go straight to the full court, with slower balls at first, so the strokes work from the first lessons.

## What we work on

- the grip and the ready position;
- forehand, backhand and a first serve;
- moving on court and staying balanced when you hit;
- the rules and scoring, so you can play a match.

## How long it takes

Most people can keep a rally going after a few lessons. With one or two lessons a week, after three or four months you can play a set with someone of a similar level.

## How you train

You can do it in private lessons, with a friend, as three, or in a small group. You choose the length when you book; at first, 60 minutes is usually enough.

## What to bring

Flat-soled trainers (ideally clay-court tennis shoes), comfortable clothes and water. I lend you a racquet and balls at first.`,
    },
  },
  {
    slug: "competitie",
    configName: "Competiție",
    name: { ro: "Competiție", en: "Competition" },
    summary: {
      ro: "Pentru jucătorii care participă la turnee sau vor să înceapă. Plan de sezon, pregătire tehnică, tactică și fizică, apoi discuția fiecărui meci.",
      en: "For players who compete or want to start. A season plan, technical, tactical and physical preparation, then a review of every match.",
    },
    focusPoints: {
      ro: [
        "plan de sezon, cu turneele alese după nivel și vârstă",
        "lovituri care rezistă la viteză și presiune de meci",
        "tactică: construcția punctului, serviciu și retur",
        "pregătire fizică specifică tenisului",
        "rutine între puncte și gestionarea emoțiilor",
      ],
      en: [
        "a season plan, with tournaments chosen by level and age",
        "strokes that hold up at match speed and under pressure",
        "tactics: building the point, serve and return",
        "tennis-specific conditioning",
        "routines between points and handling nerves",
      ],
    },
    audience: "TOATE",
    level: "COMPETITIE",
    description: {
      ro: `Programul de competiție e pentru copii, juniori și adulți care joacă turnee sau se pregătesc pentru primele. Sunt arbitru național de tenis, așa că regulamentul și felul în care decurge un turneu le cunosc din interior. În pregătire asta înseamnă că știm dinainte ce ne așteaptă: încălzirea, pauzele, momentele tensionate, situațiile de regulament.

## Ce lucrăm

- plan de sezon, cu turneele alese după nivel și vârstă;
- lovituri care rezistă la viteză și presiune de meci;
- tactică: construcția punctului, serviciu și retur;
- pregătire fizică specifică tenisului;
- rutine între puncte și gestionarea emoțiilor.

## După fiecare turneu

Discutăm meciurile: ce a mers, ce nu și ce ducem în antrenamentele următoare. Când ajută, ne uităm și pe filmări.

## Cum te antrenezi

De obicei în lecții individuale sau în doi, cu un partener de nivel apropiat, de 90 sau 120 de minute. O analiză biomecanică la începutul sezonului arată exact ce merită corectat.`,
      en: `The competition programme is for children, juniors and adults who play tournaments or are getting ready for their first. I am a national tennis umpire, so I know the rules and how a tournament runs from the inside. In training that means we know in advance what to expect: the warm-up, the breaks, the tense moments, the rules situations.

## What we work on

- a season plan, with tournaments chosen by level and age;
- strokes that hold up at match speed and under pressure;
- tactics: building the point, serve and return;
- tennis-specific conditioning;
- routines between points and handling nerves.

## After every tournament

We go through the matches: what worked, what did not, and what we take into the next sessions. When it helps, we look at video too.

## How you train

Usually in private lessons or with a partner of a similar level, for 90 or 120 minutes. A biomechanical analysis at the start of the season shows exactly what is worth correcting.`,
    },
  },
  {
    slug: "amatori",
    configName: "Amatori",
    name: { ro: "Amatori", en: "Recreational" },
    summary: {
      ro: "Tenis de plăcere, pentru adulți care joacă sau vor să joace constant: lovituri mai sigure, mai multă mișcare și meciuri mai bune cu prietenii.",
      en: "Tennis for fun, for adults who play or want to play regularly: more reliable strokes, more exercise and better matches with friends.",
    },
    focusPoints: {
      ro: [
        "lovituri mai sigure și mai blânde cu încheietura și umărul",
        "serviciu și retur, care decid cele mai multe puncte",
        "jocul la fileu și dublul",
        "tactică simplă pentru meciurile cu prietenii sau de club",
      ],
      en: [
        "more reliable strokes that are kinder to wrist and shoulder",
        "serve and return, which decide most points",
        "net play and doubles",
        "simple tactics for matches with friends or at the club",
      ],
    },
    audience: "ADULTI",
    level: "TOATE",
    description: {
      ro: `Programul pentru amatori e pentru cei care joacă din plăcere: după program, în weekend, cu prietenii. Nu cere un anumit nivel. Unii vin să repare o lovitură care îi încurcă de ani buni, alții vor să se miște mai mult sau să câștige mai des meciurile de sâmbătă.

## Ce lucrăm

- lovituri mai sigure și mai blânde cu încheietura și umărul;
- serviciu și retur, care decid cele mai multe puncte;
- jocul la fileu și dublul;
- tactică simplă pentru meciurile cu prietenii sau de club.

## Ritmul

Vii cât îți permite programul. O lecție pe săptămână te ține în formă; două aduc progres vizibil. Dacă joci și turnee de amatori, pregătim și meciurile.

## Cum te antrenezi

Merge foarte bine în doi sau în trei, cu prietenii, dar și în lecții individuale sau într-o grupă. La rezervare alegi 60, 90 sau 120 de minute.`,
      en: `The recreational programme is for people who play for fun: after work, at weekends, with friends. No particular level is needed. Some come to fix a stroke that has bothered them for years, others want more exercise or to win Saturday's match more often.

## What we work on

- more reliable strokes that are kinder to wrist and shoulder;
- serve and return, which decide most points;
- net play and doubles;
- simple tactics for matches with friends or at the club.

## The pace

Come as often as your schedule allows. One lesson a week keeps you in shape; two bring visible progress. If you also play amateur tournaments, we prepare for those matches too.

## How you train

It works very well as two or three friends, but also in private lessons or a group. When you book you choose 60, 90 or 120 minutes.`,
    },
  },
];

export const lessonContent: LessonContent[] = [
  {
    slug: "lectie-individuala",
    configName: "Lecție individuală",
    name: { ro: "Lecție individuală", en: "Private lesson" },
    summary: {
      ro: "Doar tu și antrenorul. Tot timpul e al tău: corecturi pe loc, în ritmul tău.",
      en: "Just you and the coach. All the time is yours: on-the-spot corrections, at your pace.",
    },
    minParticipants: 1,
    maxParticipants: 1,
    priceUnit: "LECTIE",
  },
  {
    slug: "lectie-in-doi",
    configName: "Lecție în doi",
    name: { ro: "Lecție în doi", en: "Lesson for two" },
    summary: {
      ro: "Doi jucători de nivel apropiat: prieteni, frați, părinte și copil. Mult joc în schimburi și puncte jucate.",
      en: "Two players of a similar level: friends, siblings, parent and child. Plenty of rallying and points played.",
    },
    minParticipants: 2,
    maxParticipants: 2,
    priceUnit: "PERSOANA",
  },
  {
    slug: "lectie-in-trei",
    configName: "Lecție în trei",
    name: { ro: "Lecție în trei", en: "Lesson for three" },
    summary: {
      ro: "Trei jucători pe un teren. Ritm alert, exerciții prin rotație și jocuri cu puncte.",
      en: "Three players on one court. A brisk pace, rotation drills and point games.",
    },
    minParticipants: 3,
    maxParticipants: 3,
    priceUnit: "PERSOANA",
  },
  {
    slug: "lectie-de-grup",
    configName: "Lecție de grup",
    name: { ro: "Lecție de grup", en: "Group lesson" },
    summary: {
      ro: "Între 4 și 6 jucători de nivel apropiat. Exerciții pe stații, jocuri și multă mișcare.",
      en: "Four to six players of a similar level. Drill stations, games and plenty of movement.",
    },
    minParticipants: 4,
    maxParticipants: 6,
    priceUnit: "PERSOANA",
  },
  {
    slug: "analiza-biomecanica",
    configName: "Analiză biomecanică",
    name: { ro: "Analiză biomecanică", en: "Biomechanical analysis" },
    summary: {
      ro: "Filmăm loviturile și le analizăm cadru cu cadru: priza, lanțul kinetic, punctul de impact. După ședință primești observațiile și exercițiile de corectare.",
      en: "We film your strokes and go through them frame by frame: grip, kinetic chain, contact point. Afterwards you get the notes and the corrective drills.",
    },
    minParticipants: 1,
    maxParticipants: 1,
    priceUnit: "LECTIE",
  },
];
