import type { BallStage, Level } from "../../../lib/generated/prisma/client";

type Text = { ro: string; en: string };

/**
 * The club's groups, on the ITF "Play and Stay" stages: mini tennis with the red, orange and
 * green ball (the court, racquet and ball grow with the child), then juniors and seniors with
 * the yellow ball from 11. What differs from club to club (days, hours, fees, places) comes from
 * config/club.yml and the admin.
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
    name: { ro: "Minitenis · minge roșie", en: "Mini tennis · red ball" },
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
    name: { ro: "Minitenis · minge portocalie", en: "Mini tennis · orange ball" },
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
    name: { ro: "Minitenis · minge verde", en: "Mini tennis · green ball" },
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
    slug: "juniori-seniori-minge-galbena",
    name: { ro: "Juniori și seniori · minge galbenă", en: "Juniors and seniors · yellow ball" },
    summary: {
      ro: "De la 11 ani: terenul și mingea standard. Grupe pe niveluri pentru juniori și adulți, de la jocul de club până la turneele federației.",
      en: "From 11: the standard court and ball. Groups by level for juniors and adults, from club play to federation tournaments.",
    },
    focusPoints: {
      ro: [
        "lovituri complete, cu efect și control",
        "tactică: construcția punctului, serviciu și retur",
        "pregătire fizică specifică tenisului",
        "meciuri de antrenament și turnee, pentru cine vrea",
      ],
      en: [
        "complete strokes, with spin and control",
        "tactics: building the point, serve and return",
        "tennis-specific conditioning",
        "practice matches and tournaments, for those who want them",
      ],
    },
    level: "COMPETITIE",
  },
];
