type PostContent = {
  slug: string;
  title: { ro: string; en: string };
  excerpt: { ro: string; en: string };
  body: { ro: string; en: string };
  seoTitle: { ro: string; en: string };
  seoDescription: { ro: string; en: string };
};

/** Three short articles, seeded as drafts (CIORNA) for the coach to review before publishing. */
export const postContent: PostContent[] = [
  {
    slug: "prima-racheta-pentru-copil",
    title: {
      ro: "Cum alegi prima rachetă pentru copil",
      en: "How to choose your child's first racquet",
    },
    excerpt: {
      ro: "Lungimea contează mai mult decât marca. Un ghid scurt pe vârste și înălțime, și câteva greșeli de evitat.",
      en: "Length matters more than the brand. A short guide by age and height, and a few mistakes to avoid.",
    },
    seoTitle: {
      ro: "Prima rachetă de tenis pentru copil: mărimea potrivită pe vârste",
      en: "Your child's first tennis racquet: the right size by age",
    },
    seoDescription: {
      ro: "Ce lungime de rachetă se potrivește la 4, 6, 8 sau 10 ani, cum verifici mărimea și ce greșeli fac des părinții.",
      en: "Which racquet length suits a 4, 6, 8 or 10 year old, how to check the size and the mistakes parents often make.",
    },
    body: {
      ro: `Cea mai des întâlnită greșeală la prima rachetă e să cumperi „una mai mare, să-i ajungă câțiva ani”. O rachetă prea lungă și prea grea îl obligă pe copil să o țină de gât, să lovească târziu și să-și forțeze încheietura. În loc să învețe mișcarea, învață să se descurce cu un obiect incomod.

## Lungimea după vârstă și înălțime

Lungimea rachetelor de copii se măsoară în inch. Ca reper:

- **4–5 ani** (sub 110 cm): 19 inch;
- **5–6 ani** (110–120 cm): 21 de inch;
- **7–8 ani** (120–135 cm): 23 de inch;
- **9–10 ani** (135–145 cm): 25 de inch;
- **10 ani și peste** (peste 145 cm): 26 de inch, apoi rachetă de adult pe la 12–13 ani.

Înălțimea contează mai mult decât vârsta. Un copil înalt de 7 ani poate juca liniștit cu 23 sau chiar 25 de inch.

## Cum verifici mărimea

Copilul stă drept, cu brațul întins pe lângă corp, și ține racheta de mâner, cu capul în jos. Dacă vârful rachetei atinge ușor solul sau rămâne la un deget deasupra lui, mărimea e bună. Dacă racheta se sprijină de sol și îl obligă să-și îndoaie cotul, e prea lungă.

## Greutatea și mânerul

La rachetele de copii, greutatea vine odată cu lungimea și rareori e o problemă. Mânerul, în schimb, trebuie să fie subțire: la o priză corectă, între vârfurile degetelor și palmă rămâne loc cam de un deget al celeilalte mâini.

## Mingea potrivită

Racheta merge împreună cu mingea. Copiii mici încep cu mingi roșii (mai mari, mai moi, mai lente), apoi trec la portocalii și verzi, și abia după aceea la mingea galbenă obișnuită. O minge prea rapidă face ca orice rachetă să pară grea.

## Merită o rachetă scumpă?

Nu la început. O rachetă de copii din aluminiu sau compozit, de la un producător de tenis cunoscut, ajunge pentru primii doi-trei ani. Banii se duc mai bine pe pantofi buni și pe mingile potrivite etapei.

Până vă hotărâți, copilul poate folosi la lecții rachetele de împrumut. Vă spun eu când a venit momentul pentru una proprie și ce mărime să căutați.`,
      en: `The most common mistake with a first racquet is buying "a bigger one, so it lasts a few years". A racquet that is too long and too heavy makes a child hold it by the throat, hit late and strain the wrist. Instead of learning the movement, they learn to cope with an awkward object.

## Length by age and height

Junior racquet length is measured in inches. As a guide:

- **ages 4–5** (under 110 cm): 19 inches;
- **ages 5–6** (110–120 cm): 21 inches;
- **ages 7–8** (120–135 cm): 23 inches;
- **ages 9–10** (135–145 cm): 25 inches;
- **10 and over** (over 145 cm): 26 inches, then an adult racquet around 12–13.

Height matters more than age. A tall seven-year-old can happily play with 23 or even 25 inches.

## How to check the size

The child stands straight, arm hanging by their side, holding the racquet by the grip with the head pointing down. If the tip just touches the ground or stays a finger's width above it, the size is right. If the racquet rests on the ground and forces them to bend the elbow, it is too long.

## Weight and grip

With junior racquets, weight comes with length and is rarely an issue. The grip, however, must be thin: with a correct hold, there should be room for about one finger of the other hand between the fingertips and the palm.

## The right ball

The racquet goes together with the ball. Young children start with red balls (bigger, softer, slower), then move to orange and green, and only then to the regular yellow ball. A ball that is too fast makes any racquet feel heavy.

## Is an expensive racquet worth it?

Not at first. An aluminium or composite junior racquet from a known tennis brand is enough for the first two or three years. The money is better spent on good shoes and the right balls for the stage.

Until you decide, your child can use the loan racquets at lessons. I will tell you when the time has come for their own and what size to look for.`,
    },
  },
  {
    slug: "pantofi-pentru-zgura",
    title: {
      ro: "Pantofi pentru zgură: de ce contează talpa",
      en: "Shoes for clay: why the sole matters",
    },
    excerpt: {
      ro: "Pe zgură alunecăm, ne oprim și pornim de sute de ori pe oră. Talpa potrivită te ține pe picioare și protejează terenul.",
      en: "On clay we slide, stop and start hundreds of times an hour. The right sole keeps you on your feet and protects the court.",
    },
    seoTitle: {
      ro: "Pantofi de tenis pentru zgură: cum îi alegi și de ce contează talpa",
      en: "Clay-court tennis shoes: how to choose them and why the sole matters",
    },
    seoDescription: {
      ro: "Diferența dintre pantofii pentru zgură, hard și alergare, ce înseamnă talpa în zigzag și cum îți alegi mărimea.",
      en: "The difference between clay, hard-court and running shoes, what a zigzag sole means and how to choose your size.",
    },
    body: {
      ro: `Tenisul pe zgură e un sport de opriri și porniri: un pas lateral, o alunecare controlată spre minge, o frână, o revenire. Într-o oră de joc, picioarele fac asta de sute de ori. Pantofii potriviți nu sunt un moft, ci prima protecție pentru glezne și genunchi.

## Talpa în zigzag

Pantofii pentru zgură au pe toată talpa un model în zigzag (în engleză, *herringbone*). Canalele dintre dinți lasă zgura să iasă, așa că talpa nu se îmbâcsește și continuă să prindă. Tot modelul acesta te lasă să aluneci controlat spre minge și să te oprești exact unde vrei.

Pantofii pentru hard au de obicei o talpă mixtă, gândită pentru aderență pe suprafețe dure. Pe zgură merg, dar alunecă mai mult și se umplu de nisip.

## De ce nu pantofi de alergare

Pantofii de alergare sunt făcuți pentru mișcare înainte, cu talpă moale și înaltă la călcâi. La deplasările laterale din tenis, piciorul se poate răsuci peste marginea tălpii. În plus, talpa lor strică suprafața terenului, iar multe baze sportive nu îi acceptă.

## Cum alegi

- **Sprijin lateral.** Apasă cu degetul marginea pantofului: trebuie să fie fermă, nu moale ca la un pantof de alergare.
- **Vârful întărit.** La serviciu și la alunecări, vârful se freacă de teren; un vârf întărit ține mult mai mult.
- **Mărimea.** Între vârful degetului mare și vârful pantofului trebuie să rămână cam jumătate de centimetru. Probează pantofii după-amiaza, cu șosetele cu care joci.
- **Greutatea.** La început nu contează mult; contează să fie stabili.

## Pentru copii

Copiii cresc repede, așa că nu are rost să cumpărați modele scumpe. Căutați aceleași trei lucruri: talpă cu model pentru zgură, margini ferme și mărimea corectă, fără „loc de creștere” exagerat. Un pantof prea mare e la fel de periculos ca unul prea mic.

## Îngrijire

După joc, bate pantofii unul de altul ca să iasă zgura și lasă-i să se usuce la aer, nu pe calorifer. Când modelul tălpii s-a tocit în zona degetelor, e timpul pentru o pereche nouă: talpa netedă alunecă necontrolat.`,
      en: `Clay-court tennis is a sport of stops and starts: a side step, a controlled slide into the ball, braking, recovering. In an hour of play your feet do this hundreds of times. The right shoes are not a luxury; they are the first protection for your ankles and knees.

## The zigzag sole

Clay-court shoes have a zigzag (herringbone) pattern across the whole sole. The channels between the ridges let the clay out, so the sole does not clog up and keeps gripping. The same pattern lets you slide into the ball in a controlled way and stop exactly where you want.

Hard-court shoes usually have a mixed sole designed for grip on hard surfaces. They work on clay, but slide more and fill up with grit.

## Why not running shoes

Running shoes are made for forward movement, with soft, high heels. In tennis' lateral movements, your foot can roll over the edge of the sole. They also damage the court surface, and many venues do not allow them.

## How to choose

- **Lateral support.** Press the side of the shoe with your finger: it should feel firm, not soft like a running shoe.
- **Reinforced toe.** When serving and sliding, the toe drags on the court; a reinforced toe lasts much longer.
- **Size.** Leave about half a centimetre between your big toe and the tip of the shoe. Try shoes on in the afternoon, with the socks you play in.
- **Weight.** At first it does not matter much; stability matters.

## For children

Children grow fast, so there is no point in expensive models. Look for the same three things: a clay-court sole, firm sides and the right size, without exaggerated "room to grow". A shoe that is too big is as dangerous as one that is too small.

## Care

After playing, knock the shoes together to get the clay out and let them air-dry, not on a radiator. When the sole pattern has worn smooth under the toes, it is time for a new pair: a smooth sole slides out of control.`,
    },
  },
  {
    slug: "primele-trei-luni-de-tenis",
    title: {
      ro: "Primele trei luni de tenis, ca adult: la ce să te aștepți",
      en: "Your first three months of tennis as an adult: what to expect",
    },
    excerpt: {
      ro: "Un calendar realist pentru cine începe tenisul după 25, 35 sau 50 de ani, lună cu lună.",
      en: "A realistic timeline for anyone starting tennis after 25, 35 or 50, month by month.",
    },
    seoTitle: {
      ro: "Tenis pentru adulți începători: primele trei luni, lună cu lună",
      en: "Tennis for adult beginners: the first three months, month by month",
    },
    seoDescription: {
      ro: "Ce înveți în prima, a doua și a treia lună de tenis, cât de des să joci și ce te ajută să nu renunți.",
      en: "What you learn in your first, second and third month of tennis, how often to play and what keeps you going.",
    },
    body: {
      ro: `Adulții care încep tenisul au de obicei două temeri: că e prea târziu și că vor arăta stângaci. Prima nu e adevărată, iar a doua trece repede. Iată cum arată, realist, primele trei luni pentru cineva care vine o dată sau de două ori pe săptămână.

## Luna întâi: contactul

În primele săptămâni învățăm priza, poziția de așteptare și lovitura de bază, forehandul, din poziție stabilă. Mingea pleacă uneori în plasă, alteori peste gard. E normal. Creierul învață în acest timp să estimeze unde și când ajunge mingea, lucru pe care nu l-a mai făcut niciodată.

La final de lună, majoritatea adulților lovesc forehandul peste fileu în mod constant, dintr-o minge aruncată ușor, și încep reverul.

## Luna a doua: mișcarea

Acum picioarele devin la fel de importante ca brațul. Lucrăm pasul de pornire, deplasarea laterală și revenirea. Lovim din mers, nu doar pe loc. Apare și serviciul, mai întâi fără săritură și fără putere, doar ca mișcare corectă de aruncare.

Tot acum vin și primele schimburi reale: trei, patru, cinci mingi la rând cu partenerul. E momentul în care mulți simt pentru prima dată că „joacă tenis”.

## Luna a treia: jocul

Legăm loviturile într-un punct: serviciu, retur, câteva schimburi. Învățăm numărătoarea și regulile de bază. Jucăm game-uri scurte, cu reguli care te ajută să folosești ce ai învățat. Spre final de lună, un set cu reguli simplificate devine posibil.

## Cât de des

O lecție pe săptămână aduce progres. Două lecții, sau o lecție plus o oră de joc cu un prieten, îl dublează. Cel mai mult ajută regularitatea: patru săptămâni la rând valorează mai mult decât opt lecții înghesuite într-o lună și apoi o pauză.

## Ce te ajută să nu renunți

- **Obiective mici.** Nu „să joc bine”, ci „zece forehanduri la rând peste fileu”.
- **Un partener.** Cineva cu care să joci între lecții, la același nivel.
- **Răbdare cu umărul.** Serviciul vine ultimul. Forțat prea devreme, doare.
- **Să-ți amintești de ce ai început.** Mișcare, aer liber, un joc în care te poți pierde o oră.

Tenisul nu se învață într-o vară. Dar după trei luni știi deja destul cât să te bucuri de el, și de acolo începe partea frumoasă.`,
      en: `Adults starting tennis usually have two fears: that it is too late and that they will look clumsy. The first is not true, and the second passes quickly. Here is a realistic picture of the first three months for someone coming once or twice a week.

## Month one: contact

In the first weeks we learn the grip, the ready position and the basic stroke, the forehand, from a set position. The ball sometimes goes into the net, sometimes over the fence. That is normal. Meanwhile your brain is learning to judge where and when the ball arrives, something it has never done before.

By the end of the month, most adults hit the forehand over the net consistently from a gently fed ball, and start on the backhand.

## Month two: movement

Now your feet become as important as your arm. We work on the split step, lateral movement and recovery. You hit on the move, not just standing still. The serve appears too, first without a jump and without power, just as a correct throwing movement.

This is also when the first real rallies come: three, four, five balls in a row with a partner. It is the moment many people feel, for the first time, that they are "playing tennis".

## Month three: the game

We link the strokes into a point: serve, return, a few rallies. We learn scoring and the basic rules. We play short games with rules that help you use what you have learned. By the end of the month, a set with simplified rules becomes possible.

## How often

One lesson a week brings progress. Two lessons, or a lesson plus an hour of play with a friend, doubles it. Consistency helps most: four weeks in a row are worth more than eight lessons crammed into one month followed by a break.

## What keeps you going

- **Small goals.** Not "play well", but "ten forehands in a row over the net".
- **A partner.** Someone at the same level to play with between lessons.
- **Patience with your shoulder.** The serve comes last. Forced too early, it hurts.
- **Remembering why you started.** Movement, fresh air, a game you can lose yourself in for an hour.

Tennis is not learned in one summer. But after three months you already know enough to enjoy it, and that is where the good part begins.`,
    },
  },
];
