import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { findBookingByToken, canCancelFree, cancelDeadline, hasStarted } from "@/lib/booking";
import { getSettings, localizedSettings } from "@/lib/content";
import { t as tr } from "@/lib/i18n-content";
import { formatDate, formatTime, telLink, whatsappLink } from "@/lib/format";
import { PageSection } from "@/components/pages/PageHero";
import { CancelForm } from "@/components/booking/CancelForm";
import { TodoText } from "@/components/site/TodoText";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ManageBookingPage({
  params,
}: PageProps<"/[locale]/rezervare/[token]">) {
  const { locale: raw, token } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const [booking, settingsRow, t] = await Promise.all([
    findBookingByToken(token),
    getSettings(),
    getTranslations(),
  ]);
  const settings = localizedSettings(settingsRow, locale);
  const tel = telLink(settings.phone);
  const wa = whatsappLink(settings.whatsapp);
  const contact = (
    <p className="mt-4 flex flex-wrap gap-4">
      {tel ? (
        <a href={tel} className="btn btn-secondary">
          {t("common.call")}
        </a>
      ) : (
        <TodoText value={settings.phone} />
      )}
      {wa ? (
        <a href={wa} className="btn btn-secondary" target="_blank" rel="noopener noreferrer">
          {t("common.whatsapp")}
        </a>
      ) : null}
    </p>
  );

  if (!booking) {
    return (
      <PageSection className="page-section--narrow">
        <h1 className="page-title mt-12">{t("manage.notFound")}</h1>
        <p className="page-intro">{t("manage.notFoundHelp")}</p>
        {contact}
      </PageSection>
    );
  }

  const tz = settings.timezone;
  const when = `${formatDate(booking.startsAt, tz, locale, locale === "en" ? "EEEE d MMMM yyyy" : "EEEE, d MMMM yyyy")}, ${formatTime(booking.startsAt, tz)}–${formatTime(booking.endsAt, tz)}`;
  const active = booking.status === "IN_ASTEPTARE" || booking.status === "CONFIRMATA";
  const past = hasStarted(booking.startsAt);
  const canCancel = active && !past && canCancelFree(booking.startsAt, settings.freeCancelHours);
  const deadline = cancelDeadline(booking.startsAt, settings.freeCancelHours);
  const deadlineText = `${formatDate(deadline, tz, locale, locale === "en" ? "EEEE d MMMM" : "EEEE, d MMMM")}, ${formatTime(deadline, tz)}`;

  return (
    <>
      <PageSection className="page-section--narrow">
        <h1 className="page-title mt-12">{t("manage.title", { code: booking.code })}</h1>
        <dl className="fact-list mt-8">
          <div>
            <dt>{t("manage.statusLabel")}</dt>
            <dd>{t(`booking.status.${booking.status}`)}</dd>
          </div>
          <div>
            <dt>{t("manage.program")}</dt>
            <dd>{tr(booking.program.name, locale)}</dd>
          </div>
          <div>
            <dt>{t("manage.when")}</dt>
            <dd className="capitalize-first">{when}</dd>
          </div>
          {booking.location ? (
            <div>
              <dt>{t("manage.where")}</dt>
              <dd>
                <TodoText value={`${booking.location.name}, ${booking.location.address}`} />
              </dd>
            </div>
          ) : null}
          <div>
            <dt>{t("manage.who")}</dt>
            <dd>{booking.name}</dd>
          </div>
        </dl>
        {active && !past ? (
          <p className="mt-6">
            <a href={`/api/ics/${token}`} className="btn btn-primary" download>
              {t("manage.addToCalendar")}
            </a>
          </p>
        ) : null}
      </PageSection>

      {active && !past ? (
        <PageSection title={t("manage.cancelTitle")} id="anulare" className="page-section--narrow">
          {canCancel ? (
            <>
              <p className="mb-6">{t("manage.cancelText", { deadline: deadlineText })}</p>
              <CancelForm token={token} hours={settings.freeCancelHours} />
            </>
          ) : (
            <>
              <p className="notice">{t("manage.tooLate", { hours: settings.freeCancelHours })}</p>
              <p className="mt-4">{t("manage.tooLateHelp")}</p>
              {contact}
            </>
          )}
        </PageSection>
      ) : (
        <PageSection className="page-section--narrow">
          <p>{past ? t("manage.past") : t("manage.alreadyCancelled")}</p>
        </PageSection>
      )}
    </>
  );
}
