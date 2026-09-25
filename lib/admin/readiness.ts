import "server-only";
import { db } from "../db";
import { TODO_MARK } from "../i18n-content";

export type ReadinessItem = {
  label: string;
  done: boolean;
  /** What is still missing, in a few words (only when not done). */
  detail: string;
  href: string;
};

const GALLERY_TARGET = 6;

function hasTodo(value: unknown): boolean {
  return JSON.stringify(value ?? "").includes(TODO_MARK);
}

/**
 * What a club still has to provide before the site is really its own: real photos and videos,
 * the junior groups' schedule and fees, prices, legal data. Each item links to where it is done.
 */
export async function siteReadiness(): Promise<ReadinessItem[]> {
  const [settings, coaches, groups, lessons, gallery, legalUnreviewed] = await Promise.all([
    db.siteSettings.findUniqueOrThrow({ where: { id: 1 } }),
    db.coach.findMany({ where: { active: true }, select: { name: true, photoId: true } }),
    db.academyGroup.findMany({
      where: { active: true },
      select: { schedule: true, monthlyFee: true },
    }),
    db.lessonType.findMany({ where: { active: true }, select: { hourlyRate: true } }),
    db.galleryItem.count({ where: { published: true } }),
    db.legalPage.count({ where: { reviewedByLawyer: false } }),
  ]);

  const coachesWithout = coaches.filter((c) => !c.photoId);
  const groupsWithoutSchedule = groups.filter((g) => !g.schedule || hasTodo(g.schedule)).length;
  const groupsWithoutFee = groups.filter((g) => g.monthlyFee === null).length;
  const lessonsWithoutRate = lessons.filter((l) => l.hourlyRate === null).length;
  const legalData = [
    settings.legalForm,
    settings.legalName,
    settings.legalCui,
    settings.legalAddress,
  ];

  return [
    {
      label: "Video-ul de deschidere al paginii principale",
      done: Boolean(settings.heroVideoId || settings.heroImageId),
      detail: "un clip filmat la club, orizontal, 10–20 de secunde",
      href: "/admin/continut/setari",
    },
    {
      label: "Logoul clubului",
      done: Boolean(settings.logoId),
      detail: "PNG cu fundal transparent",
      href: "/admin/continut/setari",
    },
    {
      label: "Fotografiile antrenorilor",
      done: coaches.length > 0 && coachesWithout.length === 0,
      detail:
        coachesWithout.length > 0
          ? `lipsesc pentru: ${coachesWithout.map((c) => c.name).join(", ")}`
          : "adaugă echipa de antrenori",
      href: "/admin/continut/antrenori",
    },
    {
      label: "Programul și taxa grupelor de juniori",
      done: groups.length > 0 && groupsWithoutSchedule === 0 && groupsWithoutFee === 0,
      detail: [
        groupsWithoutSchedule > 0 ? `${groupsWithoutSchedule} fără zile și ore` : "",
        groupsWithoutFee > 0 ? `${groupsWithoutFee} fără taxă lunară` : "",
      ]
        .filter(Boolean)
        .join(", "),
      href: "/admin/continut/grupe-juniori",
    },
    {
      label: "Tarifele lecțiilor",
      done: lessons.length > 0 && lessonsWithoutRate === 0,
      detail: `${lessonsWithoutRate} tipuri de lecții fără tarif pe oră`,
      href: "/admin/continut/lectii",
    },
    {
      label: "Galeria foto și video",
      done: gallery >= GALLERY_TARGET,
      detail: `${gallery} din ${GALLERY_TARGET} publicate (primele ${GALLERY_TARGET} apar pe pagina principală)`,
      href: "/admin/continut/galerie",
    },
    {
      label: "Datele legale ale clubului",
      done: !legalData.some(hasTodo),
      detail: "forma de organizare, denumirea, CUI, sediul",
      href: "/admin/continut/setari",
    },
    {
      label: "Paginile legale verificate de un jurist",
      done: legalUnreviewed === 0,
      detail: `${legalUnreviewed} ciorne de verificat`,
      href: "/admin/continut/legal",
    },
  ];
}
