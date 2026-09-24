import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { localDateKey, zonedInstant, addDaysToKey } from "@/lib/availability";
import { deleteExceptionAction, deleteRuleAction } from "@/app/actions/admin-availability";
import { ExceptionForm, RuleForm } from "@/components/admin/AvailabilityForms";

export const metadata: Metadata = { title: "Disponibilitate" };
const DAYS = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"];
const fmtDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function AvailabilityPage() {
  await requireAdmin("PROPRIETAR");
  const settings = await db.siteSettings.findUniqueOrThrow({ where: { id: 1 } });
  const tz = settings.timezone;
  const today = localDateKey(new Date(), tz);
  const [rules, exceptions] = await Promise.all([
    db.availabilityRule.findMany({ orderBy: [{ weekday: "asc" }, { startTime: "asc" }] }),
    db.availabilityException.findMany({
      where: { date: { gte: new Date(`${today}T00:00:00Z`) } },
      orderBy: { date: "asc" },
    }),
  ]);
  // Blocked time that already holds active bookings: the coach must move or cancel them.
  const conflicts = await Promise.all(
    exceptions
      .filter((e) => e.type === "BLOCAT")
      .map(async (e) => {
        const key = fmtDate(e.date);
        const start = e.startTime
          ? zonedInstant(key, e.startTime, tz)
          : zonedInstant(key, "00:00", tz);
        const end = e.endTime
          ? zonedInstant(key, e.endTime, tz)
          : zonedInstant(addDaysToKey(key, 1), "00:00", tz);
        const count = await db.booking.count({
          where: {
            status: { in: ["IN_ASTEPTARE", "CONFIRMATA"] },
            startsAt: { lt: end },
            endsAt: { gt: start },
          },
        });
        return [e.id, count] as const;
      }),
  );
  const conflictMap = new Map(conflicts);

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-title">Disponibilitate</h1>
          <p>
            Orele în care clienții pot rezerva lecții (individuale, în doi, în trei, de grup sau
            analiză biomecanică). Pauza dintre lecții ({settings.bufferMinutes} min), preavizul (
            {settings.minNoticeHours} h) și orizontul ({settings.horizonDays} zile) se schimbă din{" "}
            <Link href="/admin/setari" className="link">
              Setări
            </Link>
            .
          </p>
        </div>
      </div>
      <p className="admin-warning mb-6">
        Numărul „Locuri libere” de pe prima pagină se calculează din aceste ore. Păstrează aici doar
        timpul deschis pentru elevi noi, nu tot programul tău.
      </p>

      <section>
        <h2 className="admin-h2">Săptămâna obișnuită</h2>
        <div className="week">
          {DAYS.map((day, i) => {
            const dayRules = rules.filter((r) => r.weekday === i + 1);
            return (
              <section key={day} className="week-day">
                <h3>{day}</h3>
                {dayRules.length === 0 ? <p className="text-note text-cerneala-2">liber</p> : null}
                {dayRules.map((rule) => (
                  <div key={rule.id} className="week-item" data-kind="rule">
                    <span className="numerals font-medium">
                      {rule.startTime}–{rule.endTime}
                    </span>
                    {rule.validFrom || rule.validTo ? (
                      <span className="block text-note">
                        {fmtDate(rule.validFrom) || "…"} → {fmtDate(rule.validTo) || "…"}
                      </span>
                    ) : null}
                    <form action={deleteRuleAction}>
                      <input type="hidden" name="id" value={rule.id} />
                      <button
                        type="submit"
                        className="link text-note"
                        aria-label={`Șterge intervalul ${day} ${rule.startTime}–${rule.endTime}`}
                      >
                        Șterge
                      </button>
                    </form>
                  </div>
                ))}
              </section>
            );
          })}
        </div>
        <div className="admin-section">
          <RuleForm />
        </div>
      </section>

      <section className="admin-section">
        <h2 className="admin-h2">Excepții următoare</h2>
        {exceptions.length === 0 ? (
          <p className="text-cerneala-2">Nicio zi liberă sau oră în plus programată.</p>
        ) : null}
        <div className="admin-rows">
          {exceptions.map((e) => (
            <div key={e.id} className="admin-row">
              <div>
                <span className="admin-row-title numerals">{fmtDate(e.date)}</span>{" "}
                <span>
                  {e.startTime && e.endTime ? `${e.startTime}–${e.endTime}` : "toată ziua"}
                </span>
                <p className="admin-row-meta">
                  {e.type === "BLOCAT" ? "indisponibil" : "ore în plus"}
                  {e.reason ? ` · ${e.reason}` : ""}
                </p>
                {conflictMap.get(e.id) ? (
                  <p className="admin-warning mt-2 text-note">
                    Atenție: {conflictMap.get(e.id)} rezervări active în acest interval. Anulează-le
                    sau mută-le din Rezervări.
                  </p>
                ) : null}
              </div>
              <form action={deleteExceptionAction}>
                <input type="hidden" name="id" value={e.id} />
                <button type="submit" className="btn btn-secondary btn-small">
                  Șterge
                </button>
              </form>
            </div>
          ))}
        </div>
        <div className="admin-section">
          <ExceptionForm />
        </div>
      </section>
    </>
  );
}
