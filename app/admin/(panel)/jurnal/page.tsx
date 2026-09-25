import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

export const metadata: Metadata = { title: "Jurnal" };

const PAGE_SIZE = 50;

const ACTIONS: Record<string, string> = {
  login: "Autentificare",
  "login.esuat": "Autentificare eșuată (parolă greșită)",
  "parola.schimbata": "Parolă schimbată",
  "sesiuni.inchise": "Celelalte dispozitive deconectate",
  "continut.creare": "Conținut adăugat",
  "continut.modificare": "Conținut modificat",
  "continut.stergere": "Conținut șters",
  "continut.ordine": "Ordine schimbată",
  "media.incarcare": "Imagine încărcată",
  "media.descriere": "Descrierea imaginii modificată",
  "media.stergere": "Imagine ștearsă",
  "rezervare.confirm": "Rezervare confirmată",
  "rezervare.decline": "Rezervare refuzată",
  "rezervare.cancel": "Rezervare anulată de antrenor",
  "rezervare.done": "Antrenament efectuat",
  "rezervare.noshow": "Neprezentare",
  "rezervare.reopen": "Antrenament redeschis",
  "rezervare.manuala": "Rezervare adăugată manual",
  "rezervare.anulata-client": "Rezervare anulată de client (din link)",
  "rezervare.note": "Note la rezervare",
  "rezervari.export": "Export rezervări (CSV)",
  "disponibilitate.regula.adaugata": "Interval de lucru adăugat",
  "disponibilitate.regula.stearsa": "Interval de lucru șters",
  "disponibilitate.exceptie.adaugata": "Excepție adăugată (concediu, zi liberă)",
  "disponibilitate.exceptie.stearsa": "Excepție ștearsă",
  "mesaj.citit": "Mesaj citit",
  "mesaj.arhivat": "Mesaj arhivat",
  "mesaj.nou": "Mesaj marcat nou",
  "mesaj.stergere": "Mesaj șters",
  "asteptare.contactat": "Listă de așteptare: contactat",
  "asteptare.inscris": "Listă de așteptare: înscris",
  "asteptare.arhivat": "Listă de așteptare: arhivat",
  "asteptare.nou": "Listă de așteptare: marcat nou",
  "asteptare.stergere": "Listă de așteptare: cerere ștearsă",
  "client.modificare": "Client modificat",
  "client.pachet": "Pachet activat",
  "client.export-gdpr": "Export date client (GDPR)",
  "client.stergere-gdpr": "Datele clientului șterse (GDPR)",
  "newsletter.export": "Export newsletter",
  "newsletter.stergere": "Abonat șters",
  "email.test": "Email de test",
  "utilizator.creare": "Cont creat",
  "utilizator.rol": "Rol schimbat",
  "utilizator.parola-resetata": "Parolă resetată",
  "utilizator.stergere": "Cont șters",
};

const ENTITIES: Record<string, string> = {
  Scene: "secțiune a paginii principale",
  Program: "program",
  PricingPlan: "preț",
  LessonType: "tip de antrenament",
  Location: "locație",
  Court: "teren",
  Facility: "facilitate",
  Coach: "antrenor",
  Certification: "certificare",
  AcademyGroup: "grupă de juniori",
  Result: "rezultat",
  Faq: "întrebare",
  Testimonial: "recenzie",
  GalleryItem: "galerie",
  Post: "articol",
  PageHeader: "antet",
  LegalPage: "pagină legală",
  SiteSettings: "setări",
  Media: "fotografie sau video",
  Booking: "rezervare",
  AvailabilityRule: "disponibilitate",
  AvailabilityException: "excepție",
  ContactMessage: "mesaj",
  WaitlistEntry: "listă de așteptare",
  Client: "client",
  NewsletterSubscriber: "newsletter",
  AdminUser: "cont",
  EmailLog: "email",
};

const GROUPS: { value: string; label: string; prefix: string[] }[] = [
  { value: "rezervari", label: "Rezervări", prefix: ["rezervare", "rezervari", "disponibilitate"] },
  { value: "continut", label: "Conținut și imagini", prefix: ["continut", "media"] },
  {
    value: "clienti",
    label: "Clienți și mesaje",
    prefix: ["client", "mesaj", "asteptare", "newsletter"],
  },
  {
    value: "securitate",
    label: "Conturi și securitate",
    prefix: ["login", "parola", "sesiuni", "utilizator"],
  },
];

export default async function JournalPage({ searchParams }: PageProps<"/admin/jurnal">) {
  await requireAdmin("PROPRIETAR");
  const params = await searchParams;
  const group = GROUPS.find((g) => g.value === params.tip);
  const page = Math.max(
    1,
    Number.parseInt(typeof params.pagina === "string" ? params.pagina : "1", 10) || 1,
  );
  const where: Prisma.AuditLogWhereInput = group
    ? { OR: group.prefix.map((p) => ({ action: { startsWith: p } })) }
    : {};
  const [settings, entries, total] = await Promise.all([
    db.siteSettings.findUniqueOrThrow({ where: { id: 1 }, select: { timezone: true } }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { name: true } } },
    }),
    db.auditLog.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (p: number) => `/admin/jurnal?${group ? `tip=${group.value}&` : ""}pagina=${p}`;

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-title">Jurnal</h1>
          <p>
            Cine a schimbat ce și când. Intrările mai vechi decât perioada de păstrare a datelor se
            șterg automat.
          </p>
        </div>
      </div>
      <nav aria-label="Filtru" className="mb-4 flex flex-wrap gap-2">
        <Link
          href="/admin/jurnal"
          aria-current={!group ? "page" : undefined}
          className={`btn btn-small ${!group ? "btn-primary" : "btn-secondary"}`}
        >
          Tot
        </Link>
        {GROUPS.map((g) => (
          <Link
            key={g.value}
            href={`/admin/jurnal?tip=${g.value}`}
            aria-current={group?.value === g.value ? "page" : undefined}
            className={`btn btn-small ${group?.value === g.value ? "btn-primary" : "btn-secondary"}`}
          >
            {g.label}
          </Link>
        ))}
      </nav>
      {entries.length === 0 ? (
        <p className="text-cerneala-2">Nicio intrare.</p>
      ) : (
        <div className="admin-rows">
          {entries.map((e) => (
            <div key={e.id} className="admin-row">
              <div className="min-w-0">
                <p className="admin-row-title">{ACTIONS[e.action] ?? e.action}</p>
                <p className="admin-row-meta">
                  {e.createdAt.toLocaleString("ro-RO", {
                    timeZone: settings.timezone,
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}{" "}
                  · {e.user?.name ?? "sistem / client"} · {ENTITIES[e.entity] ?? e.entity}
                </p>
                {e.diff && JSON.stringify(e.diff) !== "{}" ? (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-note">Detalii</summary>
                    <pre className="mt-2 max-h-80 overflow-auto bg-nisip p-3 text-[0.8rem] whitespace-pre-wrap">
                      {JSON.stringify(e.diff, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
      {pages > 1 ? (
        <nav aria-label="Pagini" className="mt-4 flex gap-3">
          {page > 1 ? (
            <Link href={link(page - 1)} className="btn btn-secondary btn-small">
              Pagina anterioară
            </Link>
          ) : null}
          <span className="self-center text-note">
            Pagina {page} din {pages}
          </span>
          {page < pages ? (
            <Link href={link(page + 1)} className="btn btn-secondary btn-small">
              Pagina următoare
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}
