type PostContent = {
  slug: string;
  title: { ro: string; en: string };
  excerpt: { ro: string; en: string };
  body: { ro: string; en: string };
  seoTitle: { ro: string; en: string };
  seoDescription: { ro: string; en: string };
};

/**
 * Short articles for players and parents, each written around what people search for (the SEO
 * title and description). Seeded as drafts (CIORNA), to be reviewed before publishing.
 */
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
  {
    slug: "la-ce-varsta-poate-incepe-copilul-tenisul",
    title: {
      ro: "La ce vârstă poate începe un copil tenisul?",
      en: "At what age can a child start tennis?",
    },
    excerpt: {
      ro: "De la 4–5 ani, cu mingi mai lente și terenuri mai mici. Cum arată etapele minge roșie, portocalie, verde și galbenă și cum știi că e momentul.",
      en: "From 4 or 5, with slower balls and smaller courts. What the red, orange, green and yellow ball stages look like and how to tell it is time.",
    },
    seoTitle: {
      ro: "Tenis pentru copii: de la ce vârstă și cum începe (minge roșie, portocalie, verde)",
      en: "Tennis for children: from what age and how it starts (red, orange, green ball)",
    },
    seoDescription: {
      ro: "Vârsta potrivită pentru primele lecții de tenis, etapele pe culori de minge și semnele că un copil e pregătit. Ghid pentru părinți.",
      en: "The right age for a first tennis lesson, the ball-colour stages and the signs a child is ready. A guide for parents.",
    },
    body: {
      ro: `Un copil poate începe tenisul de la 4–5 ani. Condiția nu e forța, ci ca terenul, racheta și mingea să fie pe măsura lui. De aceea tenisul pentru copii nu se joacă de la început pe terenul mare, cu mingea obișnuită.

## Etapele pe culori de minge

Federația Internațională de Tenis împarte primii ani în etape, după culoarea mingii:

- **Minge roșie** (aproximativ 5–8 ani): teren mic, rachetă scurtă, minge moale care sare jos și încet. Copilul are timp să ajungă la minge și să lovească corect.
- **Minge portocalie** (aproximativ 8–10 ani): terenul crește, mingea e ceva mai rapidă. Apar serviciul de sus și primele meciuri.
- **Minge verde** (aproximativ 9–10 ani și peste): terenul întreg, cu o minge puțin mai lentă decât cea standard.
- **Minge galbenă**: mingea și terenul obișnuite, pentru juniorii pregătiți.

Vârstele sunt orientative. Trecerea la etapa următoare se face când copilul stăpânește loviturile și jocul din etapa în care e, nu după calendar.

## Semne că e momentul

- urmează indicații simple, de două-trei pași;
- poate sta concentrat 10–15 minute pe un joc;
- îi place să alerge și să prindă mingea;
- vrea el să vină, nu doar părinții.

Dacă nu sunteți siguri, o primă ședință de probă spune repede dacă e momentul sau dacă mai așteptați câteva luni.

## Cum arată primele lecții

La 4–6 ani, o lecție e mai mult joc decât exercițiu: coordonare, echilibru, prins și aruncat, apoi primele lovituri cu mingea roșie. Copiii învață prin jocuri scurte, cu reguli simple, și pleacă de pe teren cu chef să revină. Racheta potrivită contează mult: una prea lungă îl obligă pe copil să lovească greșit.

## La academia noastră

Fiecare copil începe cu o evaluare: vedem cum se mișcă și cum lovește și vă spunem în ce grupă se potrivește. Grupele, vârstele și programul lor sunt pe pagina Academiei de juniori.`,
      en: `A child can start tennis from 4 or 5. What matters is not strength but a court, racquet and ball sized for them. That is why children's tennis does not start on the full court with the standard ball.

## The ball-colour stages

The International Tennis Federation divides the first years into stages, by the colour of the ball:

- **Red ball** (roughly 5–8): a small court, a short racquet and a soft ball that bounces low and slow. The child has time to reach the ball and hit it properly.
- **Orange ball** (roughly 8–10): the court grows and the ball gets a little faster. The overhead serve and first matches appear.
- **Green ball** (roughly 9–10 and up): the full court, with a ball slightly slower than the standard one.
- **Yellow ball**: the standard ball and court, for juniors who are ready.

The ages are a guide. A child moves to the next stage when they master the strokes and play of the current one, not by the calendar.

## Signs it is time

- they follow simple two- or three-step instructions;
- they can focus on a game for 10–15 minutes;
- they enjoy running and catching a ball;
- they want to come, not just their parents.

If you are not sure, a first trial session quickly shows whether it is time or whether to wait a few months.

## What the first lessons look like

At 4–6, a lesson is more play than drill: coordination, balance, catching and throwing, then the first strokes with the red ball. Children learn through short games with simple rules and leave the court wanting to come back. The right racquet matters a lot: one that is too long forces the child to hit the wrong way.

## At our academy

Every child starts with an assessment: we see how they move and hit, and tell you which group fits. The groups, their ages and schedules are on the Junior academy page.`,
    },
  },
  {
    slug: "tenis-iarna-teren-acoperit-zgura",
    title: {
      ro: "Tenis iarna: de ce contează terenul acoperit și de ce zgura",
      en: "Tennis in winter: why a covered court matters, and why clay",
    },
    excerpt: {
      ro: "Pauza de iarnă șterge mult din progresul verii. Ce câștigi dacă te antrenezi tot anul și ce are special zgura.",
      en: "A winter break wipes out much of the summer's progress. What you gain by training all year and what is special about clay.",
    },
    seoTitle: {
      ro: "Tenis iarna pe teren acoperit de zgură: de ce să nu faci pauză",
      en: "Winter tennis on a covered clay court: why not to take a break",
    },
    seoDescription: {
      ro: "De ce antrenamentul continuu contează, ce avantaje are zgura pentru copii și adulți și cum te pregătești pentru tenisul de iarnă.",
      en: "Why continuous training matters, what clay offers children and adults and how to get ready for winter tennis.",
    },
    body: {
      ro: `Mulți jucători, copii sau adulți, se opresc din noiembrie până în martie. Primăvara, primele săptămâni se duc pe recuperarea a ce s-a pierdut. Un teren acoperit schimbă asta: antrenamentul continuă în același ritm, pe aceeași suprafață.

## Ce pierzi într-o pauză de patru luni

- **Ritmul mingii.** Ochiul și picioarele se dezobișnuiesc repede de viteza schimburilor.
- **Automatismele.** O mișcare nouă, învățată vara, nu e încă fixată; fără repetiție, se întoarce vechiul obicei.
- **Condiția fizică specifică.** Pornirile scurte, frânările și schimbările de direcție nu se antrenează la fel în sală.

La copii, pauza lungă mai are un cost: pierd legătura cu grupa și cu plăcerea jocului.

## De ce zgura

Zgura e suprafața pe care mingea sare mai încet și mai sus decât pe hard. Pentru cine învață, asta înseamnă:

- **mai mult timp** pentru pregătirea loviturii și pentru poziția corectă;
- **schimburi mai lungi**, deci mai multe mingi lovite în aceeași oră;
- **alunecarea** controlată în lovitură, care se învață doar pe zgură;
- **impact mai blând** pentru articulații decât suprafețele dure.

## Cum te pregătești pentru tenisul de iarnă

- Încălzirea durează mai mult când afară e frig: 10–15 minute de mișcare înainte de primele lovituri.
- Haine în straturi: te încălzești repede, dar pauzele sunt reci.
- Pantofi pentru zgură, cu model în zigzag, ca și vara.
- Apă, chiar dacă nu ți-e sete: iarna uiți să bei.

## La noi

Patru dintre terenurile clubului sunt de zgură și acoperite iarna, așa că lecțiile și grupele academiei continuă tot anul. Orele libere le vezi în pagina de rezervare.`,
      en: `Many players, children and adults, stop from November to March. In spring the first weeks go on recovering what was lost. A covered court changes that: training carries on at the same pace, on the same surface.

## What four months off cost you

- **The pace of the ball.** Eyes and feet quickly lose the speed of rallies.
- **Automatic movement.** A new stroke learned in summer is not yet fixed; without repetition, the old habit returns.
- **Tennis-specific fitness.** Short sprints, braking and changes of direction are not trained the same way in a gym.

For children, a long break has another cost: they lose touch with their group and with the joy of playing.

## Why clay

Clay is the surface on which the ball bounces slower and higher than on hard courts. For anyone learning, that means:

- **more time** to prepare the stroke and get into position;
- **longer rallies**, so more balls hit in the same hour;
- **controlled sliding** into the shot, which can only be learned on clay;
- **a softer impact** on the joints than hard surfaces.

## Getting ready for winter tennis

- Warm up for longer when it is cold outside: 10–15 minutes of movement before the first strokes.
- Dress in layers: you warm up quickly, but the breaks are cold.
- Clay-court shoes with a zigzag sole, as in summer.
- Water, even if you are not thirsty: in winter you forget to drink.

## At our club

Four of the club's courts are clay and covered in winter, so lessons and academy groups carry on all year. You can see the free times on the booking page.`,
    },
  },
  {
    slug: "cum-alegi-academia-de-tenis-pentru-copil",
    title: {
      ro: "Cum alegi o academie de tenis pentru copil: 8 întrebări de pus",
      en: "How to choose a tennis academy for your child: 8 questions to ask",
    },
    excerpt: {
      ro: "Câți copii sunt în grupă, cu ce mingi lucrează, ce pregătire au antrenorii și ce se întâmplă iarna: ce merită întrebat înainte de înscriere.",
      en: "How many children per group, which balls they use, the coaches' training and what happens in winter: what to ask before enrolling.",
    },
    seoTitle: {
      ro: "Cum alegi un curs de tenis pentru copii: 8 întrebări pentru academie",
      en: "Choosing tennis lessons for children: 8 questions for the academy",
    },
    seoDescription: {
      ro: "Ce să întrebi înainte să înscrii copilul la tenis: mărimea grupei, etapele pe culori de minge, antrenorii, evaluarea, terenurile de iarnă.",
      en: "What to ask before enrolling your child in tennis: group size, ball-colour stages, the coaches, the assessment, winter courts.",
    },
    body: {
      ro: `Două academii pot avea același preț și un rezultat foarte diferit pentru copil. Iată ce merită întrebat, la orice club, înainte de înscriere.

## 1. Câți copii sunt într-o grupă, la un antrenor?

Într-o grupă mică, fiecare copil lovește multe mingi și primește corecturi. Întreabă numărul maxim, nu cel „de obicei”.

## 2. Cu ce mingi și pe ce teren lucrează cei mici?

Copiii de 5–8 ani ar trebui să joace cu mingi roșii, pe teren mic. Dacă un copil de 6 ani lovește mingi galbene pe terenul mare, învață să se descurce, nu să joace corect.

## 3. Ce pregătire au antrenorii?

O facultate de sport cu specializarea tenis, cursurile federației și experiența cu copii contează. Nu ezita să întrebi cine anume va lucra cu copilul tău.

## 4. Există o evaluare la început?

O evaluare arată nivelul real al copilului și grupa potrivită. Fără ea, copilul ajunge fie într-o grupă prea ușoară, fie într-una în care se descurajează.

## 5. Ce se întâmplă iarna?

Cu terenuri acoperite, antrenamentele continuă tot anul. Fără ele, urmează o pauză lungă sau mutarea într-o sală, pe altă suprafață.

## 6. Cum aflați cum progresează copilul?

Un plan pe câteva luni, obiective clare și o discuție din când în când cu antrenorul valorează mai mult decât o diplomă la final de an.

## 7. Cum se trece de la o grupă la alta?

Trecerea ar trebui să depindă de ce știe copilul, nu doar de vârstă sau de anul de înscriere.

## 8. Poate participa la competiții, dacă vrea?

Nu orice copil vrea să joace turnee, dar e bine să știi că drumul există: pregătire pentru competiții, alegerea turneelor potrivite, însoțire.

## La academia noastră

Răspunsurile noastre le găsești pe pagina Academiei de juniori: grupele pe etape și vârste, programul, antrenorii. Și, ca la orice academie serioasă, totul începe cu o evaluare.`,
      en: `Two academies can charge the same and give a child a very different result. Here is what is worth asking, at any club, before enrolling.

## 1. How many children per group, per coach?

In a small group every child hits plenty of balls and gets corrected. Ask for the maximum, not the "usual" number.

## 2. Which balls and which court do the youngest use?

Children aged 5–8 should play with red balls on a small court. If a six-year-old hits yellow balls on the full court, they learn to cope, not to play properly.

## 3. What training do the coaches have?

A sports degree specialising in tennis, federation courses and experience with children all matter. Feel free to ask who exactly will work with your child.

## 4. Is there an assessment at the start?

An assessment shows the child's real level and the right group. Without one, a child ends up either in a group that is too easy or in one that discourages them.

## 5. What happens in winter?

With covered courts, training goes on all year. Without them, there is a long break or a move indoors onto another surface.

## 6. How will you know how your child is progressing?

A plan for a few months, clear goals and the occasional talk with the coach are worth more than a certificate at the end of the year.

## 7. How do children move from one group to the next?

Moving up should depend on what the child can do, not only on age or the year they joined.

## 8. Can they compete, if they want to?

Not every child wants to play tournaments, but it is good to know the path exists: competition preparation, choosing the right tournaments, support at events.

## At our academy

Our answers are on the Junior academy page: the groups by stage and age, the schedule, the coaches. And, as at any serious academy, everything starts with an assessment.`,
    },
  },
  {
    slug: "ce-castiga-un-copil-din-tenis",
    title: {
      ro: "Ce câștigă un copil din tenis, dincolo de teren",
      en: "What a child gains from tennis, beyond the court",
    },
    excerpt: {
      ro: "Coordonare, răbdare, decizii rapide și obiceiul de a o lua de la capăt după o greșeală: de ce tenisul e o școală bună pentru copii.",
      en: "Coordination, patience, quick decisions and the habit of starting again after a mistake: why tennis is a good school for children.",
    },
    seoTitle: {
      ro: "Beneficiile tenisului pentru copii: ce dezvoltă și de ce contează",
      en: "The benefits of tennis for children: what it develops and why it matters",
    },
    seoDescription: {
      ro: "Ce dezvoltă tenisul la copii: coordonare, atenție, gestionarea emoțiilor, responsabilitate. Ce să urmărești în primul an.",
      en: "What tennis develops in children: coordination, focus, handling emotions, responsibility. What to look for in the first year.",
    },
    body: {
      ro: `Tenisul e un sport individual jucat cu un partener: fiecare punct e al tău, dar nu se joacă fără celălalt. Din această combinație vin multe dintre lucrurile pe care copiii le iau cu ei și în afara terenului.

## Coordonare și mișcare

Un copil care joacă tenis urmărește o minge în zbor, își mișcă picioarele ca să ajungă la ea și coordonează brațul cu tot corpul ca să o lovească. Echilibrul, reacția și orientarea în spațiu se lucrează la fiecare minge.

## Atenție și decizii rapide

Fiecare minge cere o decizie: unde lovesc, cât de tare, înainte sau înapoi. Copiii învață să se concentreze câteva secunde intens, apoi să se relaxeze între puncte, și iar să se concentreze.

## Emoțiile

În tenis greșești des, chiar și la nivel mare. Copilul învață că o greșeală e doar un punct, că poate respira și o poate lua de la capăt. Rutinele dintre puncte sunt, de fapt, lecții despre calm.

## Responsabilitate și fair-play

Pe terenul de antrenament și în meciurile între copii, jucătorii își anunță singuri mingile out. Asta înseamnă onestitate, respect pentru adversar și asumarea propriilor decizii.

## Ce să urmărești în primul an

- dacă vine cu plăcere la antrenament;
- dacă ține un schimb de mingi mai lung decât la început;
- dacă își revine mai repede după o greșeală;
- dacă vorbește acasă despre ce a învățat.

Rezultatele în turnee vin mai târziu, pentru cine le vrea. În primul an contează ca tenisul să devină jocul preferat al copilului.`,
      en: `Tennis is an individual sport played with a partner: every point is yours, but there is no game without the other player. Many of the things children take off the court come from that combination.

## Coordination and movement

A child playing tennis tracks a ball in flight, moves their feet to reach it and coordinates the arm with the whole body to hit it. Balance, reaction and spatial awareness are trained with every ball.

## Focus and quick decisions

Every ball asks for a decision: where to hit, how hard, move forward or back. Children learn to focus intensely for a few seconds, relax between points, and focus again.

## Emotions

In tennis you make mistakes often, even at the top level. A child learns that a mistake is just one point, that they can breathe and start again. The routines between points are really lessons in staying calm.

## Responsibility and fair play

In practice and in children's matches, players call their own balls out. That means honesty, respect for the opponent and owning your decisions.

## What to look for in the first year

- whether they enjoy coming to training;
- whether they keep a rally going longer than at the start;
- whether they bounce back faster after a mistake;
- whether they talk at home about what they learned.

Tournament results come later, for those who want them. In the first year, what matters is that tennis becomes the child's favourite game.`,
    },
  },
];
