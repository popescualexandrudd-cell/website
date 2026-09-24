import type { Audience, Level, ProgramFormat } from "../../../lib/generated/prisma/client";

export type ProgramContent = {
  slug: string;
  configName: string;
  name: { ro: string; en: string };
  summary: { ro: string; en: string };
  description: { ro: string; en: string };
  focusPoints: { ro: string[]; en: string[] };
  audience: Audience;
  level: Level;
  format: ProgramFormat;
  bookableOnline: boolean;
  ageMin?: number;
  ageMax?: number;
};

export const programContent: ProgramContent[] = [
  {
    slug: "lectie-individuala",
    configName: "Lecție individuală",
    name: { ro: "Lecție individuală", en: "Private lesson" },
    summary: {
      ro: "Ședință individuală cu un obiectiv operațional clar: corectarea tehnicii, pregătire tactică sau pregătire pentru competiție. Pentru orice vârstă și nivel.",
      en: "A one-to-one session with one clear operational objective: technical correction, tactical work or competition preparation. For any age and level.",
    },
    focusPoints: {
      ro: [
        "evaluare inițială și plan de pregătire pe 8–12 săptămâni",
        "un obiectiv operațional pentru fiecare ședință",
        "corectarea tehnicii cu feedback imediat și filmări scurte",
        "exerciții de consolidare pentru perioada dintre ședințe",
      ],
      en: [
        "assessment and a written 8–12 week plan",
        "one clear goal in every lesson",
        "on-the-spot corrections and short clips when they help",
        "drills you can do on your own between lessons",
      ],
    },
    audience: "TOATE",
    level: "TOATE",
    format: "INDIVIDUAL",
    bookableOnline: true,
    description: {
      ro: `Ședința individuală este forma de pregătire cu cea mai mare densitate de lucru: tot timpul de teren este dedicat unui singur sportiv. Fiecare minge servită, fiecare corectură și fiecare explicație urmăresc obiectivul operațional stabilit în planul de pregătire, iar feedbackul vine imediat, în momentul execuției.

## Pentru cine

Pentru oricine, de la copilul de opt ani care a prins gustul la grupă și vrea mai mult, până la adultul care n-a ținut niciodată o rachetă în mână sau la jucătorul de club care vrea să-și repare reverul înainte de un turneu. Nivelul nu contează; contează să știm de unde pornim.

## Cum arată o oră

Începem cu zece minute de încălzire cu mingea, în careu: ritm, picioare, contact. Apoi lucrăm pe obiectivul lecției, stabilit dinainte în planul tău. Dacă obiectivul e forehandul în diagonală, îl descompunem: priza, pregătirea, pasul de ajustare, punctul de impact, finalul mișcării. Repetăm cu coșul de mingi până când mișcarea devine a ta, apoi o punem la încercare în schimburi și, spre final, într-un joc cu puncte.

Ultimele cinci minute sunt pentru concluzii: ce a mers, ce luăm cu noi la lecția următoare, ce poți exersa singur la perete sau cu un partener.

## Prima lecție

Prima lecție e o evaluare: lovim câteva mingi, îmi spui ce îți dorești de la tenis și plecăm cu primele obiective scrise. Dacă vii după o accidentare sau după o pauză lungă, spune-mi dinainte, ca să potrivim intensitatea de la început.

## Ce primești

- evaluare la prima lecție și un plan scris pe 8–12 săptămâni;
- un singur obiectiv clar în fiecare lecție;
- corecturi pe loc și, când ajută, filmări scurte ale loviturilor;
- rachetă și mingi de împrumut, dacă abia începi.

## Ritmul recomandat

Pentru începători, o lecție pe săptămână aduce progres vizibil; două lecții pe săptămână îl grăbesc mult. Între lecții, 20–30 de minute de exercițiu la perete fac mai mult decât pare.

## Ce aduci

Pantofi de tenis (pe zgură, cu talpă pentru zgură), haine lejere, apă. Racheta o poți împrumuta la început, până aflăm ce mărime și ce greutate ți se potrivesc.`,
      en: `The one-to-one session is the densest form of training: all the court time goes to a single player. Every ball fed, every correction and every explanation serves the operational objective set in the training plan, and feedback comes immediately, at the moment of execution.

## Who it is for

Anyone, from the eight-year-old who caught the bug in a group and wants more, to the adult who has never held a racquet, to the club player who wants to fix a backhand before a tournament. Your level does not matter; what matters is knowing where we start.

## What an hour looks like

We begin with ten minutes of warm-up rallying in the service boxes: rhythm, feet, contact. Then we work on the goal of the lesson, set in advance in your plan. If the goal is the cross-court forehand, we break it down: grip, preparation, adjustment step, contact point, follow-through. We repeat it from the basket until the movement is yours, then test it in rallies and, towards the end, in a points game.

The last five minutes are for conclusions: what worked, what we take to the next lesson, what you can practise on your own against a wall or with a partner.

## The first lesson

The first lesson is an assessment: we hit a few balls, you tell me what you want from tennis and we leave with the first goals in writing. If you are coming back from an injury or a long break, tell me beforehand so we set the right intensity from the start.

## What you get

- an assessment in the first lesson and a written 8–12 week plan;
- one clear goal in every lesson;
- on-the-spot corrections and, when they help, short clips of your strokes;
- a racquet and balls to borrow if you are just starting.

## Recommended rhythm

For beginners, one lesson a week brings visible progress; two a week speed it up a lot. Between lessons, 20–30 minutes against a wall do more than you would think.

## What to bring

Tennis shoes (clay-court soles on clay), comfortable clothes, water. You can borrow a racquet at first, until we find out which size and weight suit you.`,
    },
  },
  {
    slug: "lectie-in-doi",
    configName: "Lecție în doi",
    name: { ro: "Lecție în doi", en: "Lesson for two" },
    summary: {
      ro: "Pregătire în pereche pentru doi sportivi de nivel apropiat: exerciții în cooperare și situații de joc. Prețul este pe persoană.",
      en: "Paired training for two players of a similar level: cooperative drills and match situations. The price is per person.",
    },
    focusPoints: {
      ro: [
        "exerciții în cooperare, construite pentru pereche",
        "schimburi cu sarcini tehnice și de precizie",
        "joc la puncte și primele decizii tactice",
        "obiective individuale pentru fiecare sportiv",
      ],
      en: [
        "drills designed for a pair",
        "rallies between you, with precise tasks",
        "points play and simple tactical choices",
        "separate goals for each of you",
      ],
    },
    audience: "TOATE",
    level: "TOATE",
    format: "SEMI_PRIVAT",
    bookableOnline: true,
    description: {
      ro: `Pregătirea în pereche lucrează cu doi sportivi de nivel apropiat: prieteni, frați, un cuplu sau un părinte cu copilul mai mare. Exercițiile în cooperare și situațiile de joc apar din prima ședință, astfel încât tehnica se exersează direct în condițiile schimbului de mingi. Prețul se calculează pe persoană.

## Cum funcționează

Cei doi ar trebui să fie la un nivel apropiat. Nu trebuie să fie identic; o diferență mică e chiar utilă, pentru că cel mai sigur pe lovituri ține mingea în joc, iar celălalt învață să răspundă. Dacă diferența e mare, vă spun sincer după prima lecție și găsim formatul potrivit.

O oră în doi alternează trei tipuri de lucru: exerciții la coș, unde fiecare primește corecturi pe rând; schimburi între voi, cu sarcini precise (de exemplu, zece mingi la rând în diagonală); și joc cu puncte, în care exersăm alegerile, nu doar loviturile.

## De ce în doi

Pentru mulți adulți, lecția în doi e mai relaxată decât cea individuală: pauzele vin natural, atenția nu stă tot timpul pe tine, iar partenerul te motivează să nu lipsești. Pentru frați, e o oră în care învață să joace unul cu celălalt, nu unul împotriva celuilalt. Iar pentru cupluri, e un sport pe care îl pot continua împreună și în vacanță.

## Ce primiți

- evaluare comună la prima lecție și obiective pentru fiecare dintre voi;
- exerciții gândite pentru pereche, nu o lecție individuală împărțită la doi;
- rachete și mingi de împrumut pentru începători.

## Pentru copii

Pentru copii, lecția în doi funcționează bine de pe la 8–9 ani, când pot ține un schimb scurt cu partenerul. Sub această vârstă recomand mini-tenisul, unde jocul e construit pentru ei. Obiectivele fiecăruia le trec în același plan, ca să vedeți amândoi ce urmează și cine ce are de lucrat.

## Organizare

Rezervarea se face pe numele unuia dintre voi, cu 2 participanți. Dacă unul dintre voi nu poate veni, anunțați-mă cât mai devreme: lecția se poate transforma în lecție individuală sau se mută, după politica de anulare.`,
      en: `Paired training works with two players of a similar level: friends, siblings, a couple or a parent with an older child. Cooperative drills and match situations start from the first session, so technique is practised directly under rally conditions. The price is per person.

## How it works

The two of you should be at a similar level. It does not have to be identical; a small gap even helps, because the steadier player keeps the ball in play while the other learns to respond. If the gap is large, I will tell you honestly after the first lesson and we will find the right format.

An hour for two alternates three kinds of work: basket drills, where each of you gets corrections in turn; rallies between you, with precise tasks (for example, ten balls in a row cross-court); and points play, where we practise decisions, not just strokes.

## Why two

For many adults a lesson for two is more relaxed than a private one: breaks come naturally, the attention is not on you all the time, and your partner keeps you from skipping sessions. For siblings, it is an hour in which they learn to play with each other, not against each other. For couples, it is a sport they can keep playing together on holiday.

## What you get

- a joint assessment in the first lesson and goals for each of you;
- drills designed for a pair, not a private lesson split in two;
- racquets and balls to borrow for beginners.

## For children

For children, a lesson for two works well from about 8 or 9, when they can keep a short rally going with a partner. Below that age I recommend mini tennis, where the game is built for them. I put both sets of goals in the same plan, so you both see what comes next and who needs to work on what.

## Practicalities

Book under one of your names, with 2 participants. If one of you cannot come, let me know as early as possible: the lesson can become a private one or be moved, according to the cancellation policy.`,
    },
  },
  {
    slug: "mini-tenis",
    configName: "Mini-tenis",
    name: { ro: "Mini-tenis", en: "Mini tennis" },
    summary: {
      ro: "Etapa de inițiere pentru 4–7 ani: teren redus, mingi cu presiune scăzută, coordonare și deprinderi motrice de bază dezvoltate prin joc. Grupe de maximum 6 copii.",
      en: "The introduction stage for ages 4–7: a smaller court, low-compression balls, coordination and basic motor skills developed through play. Groups of up to 6.",
    },
    focusPoints: {
      ro: [
        "coordonare oculo-motorie: prindere, aruncare, lovire",
        "echilibru, alergare, opriri și schimbări de direcție",
        "primele lovituri: forehand, rever, serviciul de jos",
        "regulile jocului și schimbul cu un partener",
      ],
      en: [
        "hand–eye coordination: catch, throw, hit",
        "balance, running and stopping",
        "first strokes: forehand, backhand, underarm serve",
        "the rules of the game and rallying with a partner",
      ],
    },
    audience: "COPII",
    level: "INCEPATOR",
    format: "GRUPA",
    bookableOnline: true,
    ageMin: 4,
    ageMax: 7,
    description: {
      ro: `Între 4 și 7 ani, tenisul se învață prin joc. Mini-tenisul adaptează echipamentul la particularitățile de vârstă: teren redus, fileu mai jos, rachete scurte și mingi cu presiune scăzută, mai lente, astfel încât copilul să țină mingea în joc încă din prima ședință. Accentul cade pe coordonare, echilibru și deprinderile motrice de bază, pe care se construiește ulterior tehnica.

## Ce se lucrează

- coordonarea ochi–mână: prinde, aruncă, lovește;
- echilibrul și mișcarea: alergare, opriri, schimbări de direcție;
- primele lovituri: forehand, rever și serviciul de jos;
- regulile jocului, schimbul de mingi cu un partener, așteptarea rândului.

## Cum arată o ședință

45 de minute, într-o grupă de maximum 6 copii. Începem cu jocuri de mișcare, trecem la exerciții cu racheta pe stații (fiecare copil ajunge la fiecare stație) și încheiem cu un joc cu puncte, în care toți au ceva de numărat. Un copil de cinci ani are nevoie să se miște des și să schimbe des activitatea; ședința e construită în jurul acestei nevoi.

## De ce mingi lente

O minge de tenis obișnuită sare prea sus și prea repede pentru un copil de cinci ani: o lovește deasupra umerilor, cu brațul întins, și învață o mișcare greșită. Mingea roșie sare până la talia lui și îi lasă timp să se așeze. Așa învață de la început punctul corect de impact, iar trecerea la mingi mai rapide vine firesc.

## Pentru părinți

Nu trebuie să cumpărați echipament scump. La început, rachetele se împrumută; când copilul prinde gustul, vă spun ce mărime să căutați (de obicei 19–21 de inch la această vârstă). Pantofii sport cu talpă plată ajung în primele săptămâni.

După ședințe vă spun pe scurt ce am lucrat și ce poate exersa copilul acasă: ținut mingea pe rachetă, aruncat la țintă, prins cu o mână. Zece minute pe zi, ca joc, ajută mai mult decât o oră o dată pe săptămână.

## Înscriere

Înscrierea începe cu o ședință de probă. Dacă grupa e plină, puteți intra pe lista de așteptare și vă anunț când se eliberează un loc.`,
      en: `Between 4 and 7, tennis is learned through play. Mini tennis adapts the equipment to the child's stage of development: a smaller court, a lower net, short racquets and slower, low-compression balls, so the child can keep the ball in play from the first session. The focus is on coordination, balance and the basic motor skills on which technique is later built.

## What we work on

- hand–eye coordination: catch, throw, hit;
- balance and movement: running, stopping, changing direction;
- first strokes: forehand, backhand and the underarm serve;
- the rules of the game, rallying with a partner, waiting your turn.

## What a session looks like

45 minutes, in a group of up to 6 children. We start with movement games, move on to racquet drills at stations (every child gets to every station) and finish with a points game in which everyone has something to count. A five-year-old needs to move often and change activity often; the session is built around that need.

## Why slow balls

A regular tennis ball bounces too high and too fast for a five-year-old: they hit it above the shoulder, arm fully stretched, and learn the wrong movement. The red ball bounces to waist height and gives them time to set up. That way they learn the right contact point from the start, and moving on to faster balls comes naturally.

## For parents

You do not need expensive equipment. At first, racquets are lent; once your child is hooked, I will tell you which size to look for (usually 19–21 inches at this age). Flat-soled trainers are fine for the first weeks.

After sessions I will tell you briefly what we worked on and what your child can practise at home: balancing the ball on the racquet, throwing at a target, one-handed catches. Ten minutes a day, as a game, helps more than an hour once a week.

## Enrolment

Enrolment starts with a trial session. If the group is full, you can join the waiting list and I will let you know when a place opens up.`,
    },
  },
  {
    slug: "grupe-copii-juniori",
    configName: "Grupe copii și juniori",
    name: { ro: "Grupe copii și juniori", en: "Children and junior groups" },
    summary: {
      ro: "Pentru 8–16 ani: formare tehnică completă pe etapele de minge, dezvoltarea calităților motrice și inițiere competițională, în grupe de maximum 6 organizate pe niveluri.",
      en: "For ages 8–16: complete technical grounding through the ball stages, motor development and a first taste of competition, in groups of up to 6 organised by level.",
    },
    focusPoints: {
      ro: [
        "toate loviturile: forehand, rever, serviciu, voleu, smeci",
        "deplasare: split-step, pași adăugați, revenire în poziție",
        "tactică de bază și construcția punctului",
        "pregătire fizică adaptată particularităților de vârstă",
        "gestionarea greșelii și concentrarea în joc",
      ],
      en: [
        "every stroke: forehand, backhand, serve, volley, smash",
        "movement: split step, side steps, recovery",
        "basic tactics and building a point",
        "age-appropriate conditioning",
        "how to move on from a mistake",
      ],
    },
    audience: "JUNIORI",
    level: "TOATE",
    format: "GRUPA",
    bookableOnline: true,
    ageMin: 8,
    ageMax: 16,
    description: {
      ro: `Între 8 și 16 ani are loc formarea tehnică completă: toate loviturile, deplasarea pe întreaga suprafață a terenului, tactica de bază și, pentru cei pregătiți, inițierea competițională. Grupele sunt mici (maximum 6 sportivi) și se alcătuiesc după nivel, nu doar după vârstă, ca sarcinile să rămână accesibile și progresive.

## Progresia pe mingi

Folosim etapele de minge folosite de federațiile de tenis: mingea portocalie pe teren de trei sferturi pentru începătorii de 8–10 ani, mingea verde pe teren întreg și apoi mingea galbenă obișnuită. Un copil trece la etapa următoare când controlează mingea în etapa în care e, nu când împlinește o anumită vârstă.

## Ce se lucrează

- tehnica: forehand, rever cu una sau două mâini, serviciu, voleu, smeci;
- mișcarea: pasul de pornire (split-step), deplasarea laterală, revenirea la centru;
- tactica: unde trimit mingea și de ce, cum construiesc un punct;
- pregătire fizică adaptată vârstei: coordonare, viteză, mobilitate;
- mentalul: cum trec peste o greșeală, cum rămân atent un set întreg.

## Cum arată o ședință de 90 de minute

Încălzire dinamică și coordonare (15 minute), un bloc tehnic pe obiectivul săptămânii (30 de minute), exerciții de joc în situații reale (30 de minute) și meciuri scurte cu reguli speciale, care îi obligă pe copii să folosească ce au lucrat (15 minute).

## Competiții

Pentru copiii care vor, primele meciuri se joacă întâi între grupe, apoi în turnee pentru începători, cu mingea etapei lor. Un meci pierdut e o lecție bună dacă după el știm ce avem de lucrat. Nimeni nu e obligat să concureze; mulți copii joacă tenis doar pentru plăcere, și e la fel de bine.

## Pentru părinți

La începutul fiecărui ciclu de 8–12 săptămâni vă spun ce urmărim cu grupa și cu copilul vostru. Pentru cei care vor să joace competiții, discutăm separat despre turnee și despre un calendar realist, fără presiune.

## Înscriere

Începem cu o ședință de probă, în care văd nivelul copilului și îl așez în grupa potrivită. Dacă nu e loc, lista de așteptare e deschisă.`,
      en: `Between 8 and 16, players build a complete technical foundation: every stroke, movement across the whole court, basic tactics and, for those who are ready, a first taste of competition. Groups are small (up to 6 players) and formed by level, not just by age, so tasks stay achievable and progressive.

## Ball stages

We follow the ball stages used by tennis federations: the orange ball on a three-quarter court for beginners aged 8–10, the green ball on a full court, then the regular yellow ball. A child moves up a stage when they control the ball at their current stage, not when they reach a certain age.

## What we work on

- technique: forehand, one- or two-handed backhand, serve, volley, smash;
- movement: the split step, lateral movement, recovering to the centre;
- tactics: where to send the ball and why, how to build a point;
- age-appropriate conditioning: coordination, speed, mobility;
- the mental side: getting past a mistake, staying focused for a whole set.

## What a 90-minute session looks like

A dynamic warm-up and coordination (15 minutes), a technical block on the week's goal (30 minutes), game-based drills in real situations (30 minutes) and short matches with special rules that make the children use what they practised (15 minutes).

## Competition

For children who want it, the first matches are played between groups, then in beginners' tournaments with the ball of their stage. A lost match is a good lesson if afterwards we know what to work on. Nobody has to compete; many children play tennis just for the fun of it, and that is just as good.

## For parents

At the start of each 8–12 week cycle I tell you what we are aiming for with the group and with your child. For those who want to compete, we talk separately about tournaments and a realistic calendar, without pressure.

## Enrolment

We start with a trial session, in which I see your child's level and place them in the right group. If there is no room, the waiting list is open.`,
    },
  },
  {
    slug: "adulti-incepatori",
    configName: "Adulți începători",
    name: { ro: "Adulți începători", en: "Adult beginners" },
    summary: {
      ro: "Grupă de maximum 4 adulți: învățarea corectă a tehnicii de bază, cu o progresie adaptată ritmului fiecăruia, de la primele lovituri până la joc.",
      en: "A group of up to 4 adults: learning sound basic technique, with a progression matched to each person's pace, from the first strokes to match play.",
    },
    focusPoints: {
      ro: [
        "prizele de bază și când se folosește fiecare",
        "forehand și rever din poziție, apoi din deplasare",
        "serviciul pe faze, cu protecția articulației umărului",
        "voleu, schimburi lungi și numărătoarea",
      ],
      en: [
        "the basic grips and when to use each",
        "forehand and backhand from a set position, then on the move",
        "the serve step by step, without straining the shoulder",
        "volleys, longer rallies and scoring",
      ],
    },
    audience: "ADULTI",
    level: "INCEPATOR",
    format: "GRUPA",
    bookableOnline: true,
    description: {
      ro: `Grupa de adulți începători este pentru cei care nu au jucat niciodată sau au jucat puțin, cu mult timp în urmă, și vor să învețe corect de la început. Învățarea tehnicii urmează o progresie clară, de la prize și lovituri din poziție la joc în deplasare, cu un volum de efort adaptat fiecăruia.

## De ce în grupă

Patru oameni pe teren înseamnă că fiecare lovește mult, primește des corecturi și are cu cine să joace. Grupa ține ritmul: e mai greu să amâni antrenamentul când te așteaptă alți trei. Iar costul pe lună e mai mic decât la lecțiile individuale.

## Ce învățăm în primele luni

- priza continentală și cea de forehand, și când se folosește fiecare;
- forehandul și reverul din poziție stabilă, apoi din deplasare;
- serviciul, pas cu pas, fără să forțăm umărul;
- voleul la fileu și primele schimburi lungi;
- regulile și numărătoarea, ca să puteți juca singuri un meci între voi.

## Cum arată o oră

Zece minute de încălzire și mobilitate (mai ales pentru umeri și glezne), patruzeci de minute de tehnică și exerciții în perechi, zece minute de joc. Lucrăm mult în perechi, așa că fiecare lovește sute de mingi într-o oră. Explic de ce facem fiecare exercițiu; adulții învață mai repede când înțeleg logica mișcării.

## La ce să vă așteptați

După 8–10 ședințe, majoritatea adulților țin mingea în joc în schimburi scurte. După trei-patru luni de antrenament constant, puteți juca un set cu reguli simplificate. Contează regularitatea mai mult decât talentul.

## După grupa de începători

Când grupa ajunge să joace seturi, trecem la exerciții de nivel intermediar sau vă recomand, fiecăruia, câteva lecții individuale pe ce are de îmbunătățit. Mulți adulți continuă în aceeași grupă, cu aceiași oameni, și devin parteneri de joc și în afara lecțiilor.

## Ce aduceți

Pantofi de tenis potriviți suprafeței, haine lejere, apă. Rachetele se împrumută la început. Dacă aveți dureri de spate, de umăr sau de genunchi, spuneți-mi la prima ședință și adaptăm exercițiile.`,
      en: `The adult beginners' group is for people who have never played, or played a little a long time ago, and want to learn properly from the start. Technique follows a clear progression, from grips and strokes from a set position to play on the move, with a training load matched to each person.

## Why a group

Four people on court means everyone hits a lot, gets frequent corrections and has someone to play with. The group keeps you going: it is harder to skip training when three others are waiting. And the monthly cost is lower than private lessons.

## What we learn in the first months

- the continental and forehand grips, and when to use each;
- forehand and backhand from a set position, then on the move;
- the serve, step by step, without straining the shoulder;
- volleying at the net and the first longer rallies;
- the rules and scoring, so you can play a match among yourselves.

## What an hour looks like

Ten minutes of warm-up and mobility (especially shoulders and ankles), forty minutes of technique and partner drills, ten minutes of play. We work a lot in pairs, so everyone hits hundreds of balls in an hour. I explain why we do each drill; adults learn faster when they understand the logic of the movement.

## What to expect

After 8–10 sessions, most adults can keep the ball going in short rallies. After three or four months of steady training, you can play a set with simplified rules. Consistency matters more than talent.

## After the beginners' group

When the group gets to playing sets, we move on to intermediate drills, or I suggest a few private lessons for each of you on what you need to improve. Many adults carry on in the same group, with the same people, and become playing partners outside lessons too.

## What to bring

Tennis shoes suited to the surface, comfortable clothes, water. Racquets are lent at first. If you have back, shoulder or knee pain, tell me in the first session and we will adapt the drills.`,
    },
  },
  {
    slug: "performanta-competitie",
    configName: "Performanță și competiție",
    name: { ro: "Performanță și competiție", en: "Performance and competition" },
    summary: {
      ro: "Pentru sportivii care participă la competiții: pregătire tehnico-tactică și fizică specifică, cu periodizare pe sezonul competițional.",
      en: "For players who compete: technical, tactical and sport-specific physical training, periodised around the competition season.",
    },
    focusPoints: {
      ro: [
        "modele de joc după serviciu și după retur",
        "serviciul ca armă tactică și un al doilea serviciu sigur",
        "trecerea din apărare în atac",
        "rutine între puncte și gestionarea momentelor decisive",
        "pregătire fizică specifică și profilaxia accidentărilor",
      ],
      en: [
        "patterns of play after serve and return",
        "the serve as a weapon and a reliable second serve",
        "turning defence into attack",
        "between-point routines and pressure moments",
        "conditioning and injury prevention",
      ],
    },
    audience: "TOATE",
    level: "COMPETITIE",
    format: "INDIVIDUAL",
    bookableOnline: true,
    description: {
      ro: `Programul de performanță se adresează sportivilor care concurează sau se pregătesc pentru competiție: juniori din circuitele de turnee și adulți din ligile și turneele de amatori. Obiectivul nu mai este învățarea loviturii, ci stabilitatea ei în condiții de presiune, oboseală și adversitate, integrată într-un model de joc personal.

## Structura

Fiecare ședință are 90 de minute: aproximativ 60 de minute pe teren și 30 de minute de pregătire fizică specifică tenisului (viteză de reacție, schimbări de direcție, forță pentru serviciu, prevenirea accidentărilor la umăr, cot și genunchi).

## Ce se lucrează

- modele de joc: primele două lovituri după serviciu și după retur;
- serviciul ca armă: plasament, variație de efect, al doilea serviciu sigur;
- apărarea și trecerea din apărare în atac;
- rutinele dintre puncte și gestionarea momentelor tensionate;
- planificarea sezonului: perioade de pregătire, turnee țintă, odihnă.

## Pregătirea fizică

Partea fizică nu înseamnă alergare fără rost. Lucrăm pe ce cere tenisul: porniri scurte, frânare, schimbări de direcție, stabilitate pe un picior, rotația trunchiului. La juniori, exercițiile respectă etapele de creștere, iar forța se construiește cu greutatea corpului, nu cu greutăți mari. Adulții primesc și un program scurt pentru zilele fără tenis.

## Planul de sezon

Împreună alegem turneele care au sens pentru nivelul jucătorului și construim pregătirea în jurul lor. După fiecare turneu discutăm meciurile, cu notițe și, când se poate, cu înregistrări video. Nu urmărim clasamentul cu orice preț; urmărim ca jucătorul să știe ce are de făcut pe teren și de ce.

## Pentru juniori și părinți

Performanța la vârste mici are nevoie de echilibru: școală, somn, alte sporturi. Stabilim împreună un număr de ore realist și îl ajustăm după cum reacționează copilul. Dacă apar dureri sau semne de oboseală, reducem volumul fără discuții.

## Început

Prima ședință este o evaluare completă: joc, tehnică, mișcare și câteva teste fizice simple. Pe baza ei facem planul pe următoarele 8–12 săptămâni.`,
      en: `The performance programme is for players who compete or are preparing to: juniors on the tournament circuits and adults in leagues and amateur events. The goal is no longer learning a stroke but keeping it stable under pressure, fatigue and adversity, within a personal game style.

## Structure

Each session lasts 90 minutes: about 60 minutes on court and 30 minutes of tennis-specific conditioning (reaction speed, changes of direction, strength for the serve, preventing shoulder, elbow and knee injuries).

## What we work on

- patterns of play: the first two shots after the serve and after the return;
- the serve as a weapon: placement, variety of spin, a reliable second serve;
- defending and turning defence into attack;
- between-point routines and handling tense moments;
- season planning: training blocks, target tournaments, rest.

## Conditioning

The physical side is not running for the sake of it. We work on what tennis demands: short starts, braking, changes of direction, single-leg stability, trunk rotation. With juniors, the drills respect growth stages and strength is built with body weight, not heavy loads. Adults also get a short routine for days without tennis.

## The season plan

Together we choose the tournaments that make sense for the player's level and build the preparation around them. After each tournament we go through the matches, with notes and, when possible, video. We do not chase the ranking at any cost; we make sure the player knows what to do on court and why.

## For juniors and parents

Performance at a young age needs balance: school, sleep, other sports. We agree on a realistic number of hours and adjust it to how the child responds. If pain or signs of fatigue appear, we cut the volume, no discussion.

## Getting started

The first session is a full assessment: play, technique, movement and a few simple physical tests. From it we build the plan for the next 8–12 weeks.`,
    },
  },
  {
    slug: "analiza-video",
    configName: "Analiză video a tehnicii",
    name: { ro: "Analiză video a tehnicii", en: "Video technique analysis" },
    summary: {
      ro: "Analiza biomecanică a loviturilor, cadru cu cadru: identificăm două-trei corecturi esențiale și le lucrăm pe teren. Primești înregistrările după ședință.",
      en: "Frame-by-frame biomechanical analysis of your strokes: we identify two or three key corrections and work on them on court. You receive the footage afterwards.",
    },
    focusPoints: {
      ro: [
        "filmare din mai multe unghiuri",
        "analiză cadru cu cadru, împreună",
        "două-trei corecturi esențiale, lucrate pe loc",
        "clipurile și exercițiile, trimise după lecție",
      ],
      en: [
        "filming from several angles",
        "frame-by-frame analysis, together",
        "two or three key corrections, worked on straight away",
        "the clips and drills, sent after the lesson",
      ],
    },
    audience: "TOATE",
    level: "INTERMEDIAR",
    format: "INDIVIDUAL",
    bookableOnline: true,
    description: {
      ro: `Senzația proprie asupra mișcării și execuția reală diferă adesea. Analiza video le aliniază: filmăm loviturile din mai multe unghiuri, le analizăm cadru cu cadru și identificăm în lanțul kinetic punctul în care se pierd viteza sau controlul.

## Cum se desfășoară

În prima parte a orei filmăm, din mai multe unghiuri, loviturile pe care vrei să le analizăm: forehand, rever, serviciu, voleu sau toate, pe rând. Folosim un telefon sau o tabletă pe trepied și, pentru serviciu, filmare cu multe cadre pe secundă, ca să se vadă clar momentul impactului.

În a doua parte ne uităm împreună la imagini, cadru cu cadru. Îți arăt două-trei lucruri esențiale, nu douăzeci: de obicei, o singură corectură la priză, la pregătire sau la transferul greutății schimbă toată lovitura. Apoi ne întoarcem pe teren și lucrăm exact pe ele.

## Ce primești după lecție

- clipurile cu loviturile tale, cu observații scurte;
- o comparație între „înainte” și „după” corectură, dacă o facem în aceeași oră;
- două-trei exerciții concrete pentru următoarele săptămâni.

## Pentru cine

Pentru jucătorii care au deja loviturile de bază și simt că s-au blocat, pentru cei care revin după o pauză lungă și pentru juniorii care se pregătesc de turnee. Funcționează bine și ca verificare la câteva luni, ca să vezi cât s-a schimbat mișcarea.

## Ce aduci

Nimic special: echipamentul obișnuit de joc și, dacă vrei, telefonul tău, ca să ai clipurile imediat. Dacă ai deja filmări din meciuri, adu-le: comparăm ce se întâmplă la antrenament cu ce se întâmplă sub presiune, și de multe ori acolo e răspunsul. Analiza se poate face și la începutul și la sfârșitul unui ciclu de 8–12 săptămâni, ca măsură a progresului.

## Confidențialitate

Înregistrările sunt ale tale. Le folosesc doar pentru analiza noastră și nu le public nicăieri fără acordul tău scris. Pentru minori, acordul îl dă părintele.`,
      en: `How a movement feels and how it is actually executed often differ. Video analysis lines them up: we film your strokes from several angles, study them frame by frame and find the point in the kinetic chain where speed or control is lost.

## How it works

In the first part of the hour we film, from several angles, the strokes you want to analyse: forehand, backhand, serve, volley, or all of them in turn. We use a phone or tablet on a tripod and, for the serve, high frame-rate filming so the moment of contact is clear.

In the second part we go through the footage together, frame by frame. I show you two or three essential things, not twenty: usually a single correction to the grip, the preparation or the weight transfer changes the whole stroke. Then we go back on court and work on exactly those.

## What you get after the lesson

- the clips of your strokes, with short notes;
- a before-and-after comparison, if we make the correction in the same hour;
- two or three concrete drills for the following weeks.

## Who it is for

Players who already have the basic strokes and feel stuck, people coming back after a long break, and juniors preparing for tournaments. It also works well as a check-up every few months, to see how much the movement has changed.

## What to bring

Nothing special: your usual kit and, if you like, your own phone so you have the clips straight away. If you already have match footage, bring it: we compare what happens in training with what happens under pressure, and that is often where the answer lies. The analysis also works at the start and end of an 8–12 week cycle, as a measure of progress.

## Privacy

The recordings are yours. I use them only for our analysis and never publish them without your written consent. For minors, a parent gives consent.`,
    },
  },
  {
    slug: "tabere-clinici",
    configName: "Tabere și clinici de weekend",
    name: { ro: "Tabere și clinici de weekend", en: "Camps and weekend clinics" },
    summary: {
      ro: "Volum mare de pregătire într-un timp scurt: clinici tematice de weekend și tabere de zi pentru copii, în vacanțe.",
      en: "A high training volume in a short time: themed weekend clinics and day camps for children during the holidays.",
    },
    focusPoints: {
      ro: [
        "volum mare de lovituri, cu corecturi pe loc",
        "meciuri cu parteneri diferiți",
        "dublu, reguli de turneu, fair-play",
        "pentru copii: mișcare și plăcerea de a juca",
      ],
      en: [
        "a high volume of shots, with on-the-spot corrections",
        "matches against different partners",
        "doubles, tournament rules, fair play",
        "for children: movement and the joy of playing",
      ],
    },
    audience: "TOATE",
    level: "TOATE",
    format: "EVENIMENT",
    bookableOnline: false,
    description: {
      ro: `Taberele și clinicile de weekend concentrează un volum mare de pregătire într-un interval scurt: câteva ore pe zi, două sau mai multe zile consecutive, cu o temă tehnico-tactică precisă și cu parteneri de joc diferiți.

## Clinicile de weekend

O clinică durează de obicei una sau două dimineți și are o singură temă: serviciul și returul, jocul la fileu, dublu pentru începători, tactica pe zgură. Grupele sunt împărțite pe nivel, iar fiecare clinică se încheie cu un mic turneu în care se aplică ce s-a lucrat.

## Taberele pentru copii

Taberele de zi pentru copii se țin în vacanțe: dimineața tenis, pe grupe de nivel, apoi jocuri, pregătire fizică adaptată vârstei și pauze lungi la umbră. Copiii se întorc acasă după-amiaza, obosiți în sensul bun.

## O zi de tabără, pe scurt

Primirea copiilor, încălzire și jocuri de mișcare; două blocuri de tenis pe grupe de nivel, cu o pauză de gustare între ele; pregătire fizică sub formă de ștafete și jocuri; spre prânz, meciuri scurte și aprecieri pentru fair-play, efort și progres, nu doar pentru victorii. Pentru adulți, clinicile sunt și un mod bun de a cunoaște parteneri de joc de același nivel.

## Ce aduci

Pantofi de tenis, un tricou de schimb, șapcă, cremă de protecție solară, apă și o gustare. Rachetele se pot împrumuta.

## Ce se lucrează

- volum mare de lovituri, cu corecturi pe loc;
- jocuri și meciuri cu parteneri diferiți;
- lucruri pe care lecțiile obișnuite nu le acoperă mereu: dublu, reguli de turneu, fair-play;
- pentru copii: coordonare, mișcare și plăcerea de a juca.

## Calendar și înscriere

Datele, programul zilnic și prețul fiecărei tabere sau clinici se anunță pe această pagină cu câteva săptămâni înainte. Locurile sunt limitate, pentru că raportul dintre antrenor și jucători rămâne mic și în tabere.

Dacă vrei să afli primul când se deschide înscrierea, lasă-ți datele pe lista de așteptare pentru acest program și îți scriu când apare următoarea dată.`,
      en: `Camps and weekend clinics pack a large training volume into a short time: a few hours a day, two or more days in a row, with a precise technical and tactical theme and a variety of practice partners.

## Weekend clinics

A clinic usually runs over one or two mornings and has a single theme: serve and return, net play, doubles for beginners, clay-court tactics. Groups are split by level, and every clinic ends with a small tournament where you put the work into practice.

## Camps for children

Day camps for children run during the school holidays: tennis in the morning, in level groups, then games, age-appropriate conditioning and long breaks in the shade. Children go home in the afternoon, tired in the good way.

## A camp day, briefly

Arrival, warm-up and movement games; two tennis blocks in level groups, with a snack break in between; conditioning as relays and games; towards lunchtime, short matches and recognition for fair play, effort and progress, not just for wins. For adults, clinics are also a good way to meet playing partners at the same level.

## What to bring

Tennis shoes, a spare T-shirt, a cap, sunscreen, water and a snack. Racquets can be borrowed.

## What we work on

- a high volume of shots, with on-the-spot corrections;
- games and matches against different partners;
- things regular lessons do not always cover: doubles, tournament rules, fair play;
- for children: coordination, movement and the joy of playing.

## Dates and enrolment

Dates, the daily schedule and the price of each camp or clinic are announced on this page a few weeks in advance. Places are limited, because the coach-to-player ratio stays small at camps too.

If you want to be the first to know when enrolment opens, leave your details on the waiting list for this programme and I will write to you when the next date is set.`,
    },
  },
];
