import type { BallStage, Level } from "../../../lib/generated/prisma/client";

type Text = { ro: string; en: string };

/**
 * The stages of the junior academy, as the ITF "Play and Stay" programme defines them: the
 * court, the racquet and the ball grow with the child, so the strokes are learnt at a speed and
 * height a child can control. What differs from club to club (days, hours, fees, places) comes
 * from config/club.yml and the admin.
 */
export type StageContent = {
  stage: BallStage;
  /** The value of `etapa:` in config/club.yml. */
  configName: string;
  slug: string;
  name: Text;
  summary: Text;
  focusPoints: { ro: string[]; en: string[] };
  level: Level;
};

export const stageContent: StageContent[] = [
  {
    stage: "ROSU",
    configName: "roșu",
    slug: "minge-rosie",
    name: { ro: "Mini tenis · minge roșie", en: "Mini tennis · red ball" },
    summary: {
      ro: "Primii pași: teren mic, rachetă scurtă și o minge moale, care sare jos și încet. Copiii învață să lovească și să se miște prin joc, iar după câteva săptămâni țin deja un schimb de mingi.",
      en: "First steps: a small court, a short racquet and a soft ball that bounces low and slow. Children learn to hit and move through games, and within a few weeks they can keep a rally going.",
    },
    focusPoints: {
      ro: [
        "coordonare, echilibru și reacție, prin jocuri",
        "forehand și rever cu mingea la înălțimea potrivită",
        "primul serviciu și primele schimburi cu un partener",
        "numărătoarea și regulile, în mini-meciuri",
      ],
      en: [
        "coordination, balance and reactions, through games",
        "forehand and backhand with the ball at the right height",
        "a first serve and first rallies with a partner",
        "scoring and the rules, in mini matches",
      ],
    },
    level: "INCEPATOR",
  },
  {
    stage: "PORTOCALIU",
    configName: "portocaliu",
    slug: "minge-portocalie",
    name: { ro: "Minge portocalie", en: "Orange ball" },
    summary: {
      ro: "Terenul crește la trei sferturi, mingea e ceva mai rapidă. Copiii lovesc cu direcție, servesc de sus și joacă primele meciuri de antrenament.",
      en: "The court grows to three quarters and the ball gets a little faster. Children hit with direction, serve overhead and play their first practice matches.",
    },
    focusPoints: {
      ro: [
        "lovituri cu direcție și înălțime controlate",
        "serviciul de sus, cu mișcarea completă",
        "deplasarea în teren și revenirea la centru",
        "primele meciuri de antrenament",
      ],
      en: [
        "strokes with controlled direction and height",
        "the overhead serve, with the full motion",
        "moving on court and recovering to the centre",
        "first practice matches",
      ],
    },
    level: "INCEPATOR",
  },
  {
    stage: "VERDE",
    configName: "verde",
    slug: "minge-verde",
    name: { ro: "Minge verde", en: "Green ball" },
    summary: {
      ro: "Terenul întreg, cu o minge puțin mai lentă decât cea standard. Apar efectele, serviciul devine o armă, iar jocul capătă tactică: pregătirea pentru primele competiții.",
      en: "The full court, with a ball slightly slower than the standard one. Spin comes in, the serve becomes a weapon and the game gets tactical: preparation for the first competitions.",
    },
    focusPoints: {
      ro: [
        "top-spin și slice, cu priza potrivită",
        "un serviciu constant, cu direcție",
        "tactică de bază: cum construiești punctul",
        "primele competiții pentru vârsta lor",
      ],
      en: [
        "topspin and slice, with the right grip",
        "a consistent serve, with direction",
        "basic tactics: how to build a point",
        "first competitions for their age",
      ],
    },
    level: "INTERMEDIAR",
  },
  {
    stage: "GALBEN",
    configName: "galben",
    slug: "juniori-minge-galbena",
    name: { ro: "Juniori · minge galbenă", en: "Juniors · yellow ball" },
    summary: {
      ro: "Terenul și mingea standard. Pentru juniorii care joacă turnee sau vor să înceapă: plan de sezon, pregătire tehnică, tactică și fizică, apoi discuția fiecărui meci.",
      en: "The standard court and ball. For juniors who play tournaments or want to start: a season plan, technical, tactical and physical preparation, then a review of every match.",
    },
    focusPoints: {
      ro: [
        "plan de sezon, cu turneele alese după nivel și vârstă",
        "lovituri care rezistă la viteză și presiune de meci",
        "pregătire fizică specifică tenisului",
        "rutine între puncte și gestionarea emoțiilor",
      ],
      en: [
        "a season plan, with tournaments chosen by level and age",
        "strokes that hold up at match speed and under pressure",
        "tennis-specific conditioning",
        "routines between points and handling nerves",
      ],
    },
    level: "COMPETITIE",
  },
];
