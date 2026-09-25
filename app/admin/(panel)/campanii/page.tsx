import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/paths";
import { campaignConfig } from "@/lib/campaigns";
import { summarizeSources, type SourceKind } from "@/lib/admin/campaigns";
import { CampaignLinkBuilder } from "@/components/admin/CampaignLinkBuilder";

export const metadata: Metadata = { title: "Campanii" };

const PERIODS = [
  { value: "30", label: "30 de zile" },
  { value: "90", label: "90 de zile" },
  { value: "365", label: "un an" },
];

const COLUMNS: { kind: SourceKind; label: string }[] = [
  { kind: "booking", label: "Rezervări" },
  { kind: "evaluation", label: "Evaluări" },
  { kind: "waitlist", label: "Listă de așteptare" },
  { kind: "message", label: "Mesaje" },
];

/** Everything sent from the site in the last `days` days, grouped by source. */
async function loadSources(days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [bookings, entries, messages] = await Promise.all([
    db.booking.findMany({
      where: { source: "SITE", createdAt: { gte: since } },
      select: { attribution: true },
    }),
    db.waitlistEntry.findMany({
      where: { createdAt: { gte: since } },
      select: { attribution: true, kind: true },
    }),
    db.contactMessage.findMany({
      where: { createdAt: { gte: since } },
      select: { attribution: true },
    }),
  ]);
  return summarizeSources([
    ...bookings.map((b) => ({ kind: "booking" as const, attribution: b.attribution })),
    ...entries.map((e) => ({
      kind: e.kind === "EVALUARE" ? ("evaluation" as const) : ("waitlist" as const),
      attribution: e.attribution,
    })),
    ...messages.map((m) => ({ kind: "message" as const, attribution: m.attribution })),
  ]);
}

/**
 * What each campaign brought: bookings made on the site, assessment requests, waiting-list
 * entries and messages, grouped by where the visitor came from. Independent of Google or Meta,
 * and without cookies: the source travels with the form the visitor sends.
 */
export default async function CampaignsPage({ searchParams }: PageProps<"/admin/campanii">) {
  await requireAdmin("PROPRIETAR");
  const params = await searchParams;
  const period = PERIODS.find((p) => p.value === params.perioada) ?? PERIODS[0]!;
  const [rows, settings] = await Promise.all([
    loadSources(Number(period.value)),
    db.siteSettings.findUniqueOrThrow({
      where: { id: 1 },
      select: { umamiEnabled: true, assistantEnabled: true },
    }),
  ]);
  const totals = COLUMNS.map((c) => rows.reduce((sum, r) => sum + r.counts[c.kind], 0));
  const config = campaignConfig();
  const base = appUrl();
  const tools = [
    { on: Boolean(config.gaId), label: "Google Analytics", detail: config.gaId },
    {
      on: Boolean(config.adsId),
      label: "Google Ads",
      detail: config.adsId
        ? `${config.adsId}; conversii: ${
            [
              config.adsBookingLabel ? "rezervare" : null,
              config.adsLeadLabel ? "cerere (evaluare, mesaj)" : null,
            ]
              .filter(Boolean)
              .join(", ") || "neconfigurate"
          }`
        : null,
    },
    {
      on: Boolean(config.metaPixelId),
      label: "Meta Pixel (Facebook, Instagram)",
      detail: config.metaPixelId,
    },
    {
      on: settings.umamiEnabled && Boolean(process.env.UMAMI_WEBSITE_ID),
      label: "Umami (statistici fără cookie-uri)",
      detail: null,
    },
    {
      on: settings.assistantEnabled && Boolean(process.env.ANTHROPIC_API_KEY),
      label: "Asistentul AI",
      detail: settings.assistantEnabled ? null : "oprit din Setări → Funcții",
    },
  ];

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-title">Campanii</h1>
          <p>
            Ce a adus fiecare sursă în ultimele {period.label}: rezervări făcute pe site, cereri de
            evaluare, înscrieri pe lista de așteptare și mesaje.
          </p>
        </div>
      </div>

      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Perioada">
        {PERIODS.map((p) => (
          <Link
            key={p.value}
            href={`/admin/campanii?perioada=${p.value}`}
            className={`btn btn-small ${p.value === period.value ? "btn-primary" : "btn-secondary"}`}
            aria-current={p.value === period.value ? "page" : undefined}
          >
            {p.label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="text-cerneala-2">Nicio cerere în această perioadă.</p>
      ) : (
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Rezultate pe surse">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Sursa / tipul · campania</th>
                {COLUMNS.map((c) => (
                  <th key={c.kind} scope="col" className="text-right">
                    {c.label}
                  </th>
                ))}
                <th scope="col" className="text-right">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <th scope="row" className="font-normal">
                    <strong>{row.source}</strong> / {row.medium}
                    {row.campaign ? ` · ${row.campaign}` : ""}
                  </th>
                  {COLUMNS.map((c) => (
                    <td key={c.kind} className="numerals text-right">
                      {row.counts[c.kind] || "—"}
                    </td>
                  ))}
                  <td className="numerals text-right">
                    <strong>{row.total}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                {totals.map((total, i) => (
                  <td key={COLUMNS[i]!.kind} className="numerals text-right">
                    <strong>{total}</strong>
                  </td>
                ))}
                <td className="numerals text-right">
                  <strong>{totals.reduce((a, b) => a + b, 0)}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p className="mt-3 text-note text-cerneala-2">
        „cpc” și „paid_social” sunt reclame plătite, „organic” e căutarea obișnuită în Google,
        „social” sunt postările și profilurile, „referral” alte site-uri. Rezervările făcute la
        telefon sau din admin nu apar aici.
      </p>

      <section className="admin-section admin-panel" aria-labelledby="link-builder">
        <h2 id="link-builder" className="admin-h2">
          Link pentru o campanie
        </h2>
        <p className="mb-4 text-note text-cerneala-2">
          Pune acest link în reclamă, în postare sau în codul QR de pe afiș. Tot ce aduce apare în
          tabelul de mai sus sub numele campaniei. Reclamele Google Ads sunt recunoscute și fără el,
          dacă folosesc etichetarea automată.
        </p>
        <CampaignLinkBuilder
          pages={[
            { label: "Pagina principală", url: `${base}/` },
            { label: "Grupele clubului", url: `${base}/programe#grupe` },
            {
              label: "Înscrierea copiilor (2 ședințe gratuite)",
              url: `${base}/programe#inscriere`,
            },
            { label: "Rezervare", url: `${base}/rezervare` },
            { label: "Programe", url: `${base}/programe` },
            { label: "Prețuri", url: `${base}/preturi` },
          ]}
        />
      </section>

      <section className="admin-section" aria-labelledby="tools">
        <h2 id="tools" className="admin-h2">
          Instrumente de măsurare
        </h2>
        <ul className="admin-checklist mt-3">
          {tools.map((tool) => (
            <li key={tool.label} data-on={tool.on}>
              {tool.label}: {tool.on ? "activ" : "neconfigurat"}
              {tool.detail ? <span className="text-cerneala-2"> ({tool.detail})</span> : null}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-note text-cerneala-2">
          Codurile Google Analytics, Google Ads și Meta se pun pe server, în fișierul .env (vezi
          DEPLOY.md). Se încarcă doar după ce vizitatorul acceptă cookie-urile; tabelul de mai sus
          funcționează și fără ele.
        </p>
      </section>
    </>
  );
}
