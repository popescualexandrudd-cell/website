import { DetailRows, EmailLayout, P, PrimaryButton, QuietLink, SecondaryButton } from "./Layout";
import { coachStrings, strings, type EmailLang } from "./strings";

type Common = { lang: EmailLang; brand: string; ornamentUrl: string };

export type BookingDetails = {
  code: string;
  program: string;
  when: string;
  where: string;
  participants: number;
  clientName: string;
  childLine?: string;
};

function bookingRows(lang: EmailLang, d: BookingDetails): [string, string][] {
  const s = strings[lang].details;
  const rows: [string, string][] = [
    [s.code, d.code],
    [s.program, d.program],
    [s.when, d.when],
    [s.where, d.where],
  ];
  if (d.participants > 1) rows.push([s.participants, String(d.participants)]);
  if (d.childLine) rows.push([s.child, d.childLine]);
  return rows;
}

export type ClientBookingKind =
  "request" | "requestGroup" | "confirmed" | "reminder" | "cancelledByClient" | "cancelledByCoach";

export function ClientBookingEmail(
  props: Common & {
    kind: ClientBookingKind;
    details: BookingDetails;
    manageUrl?: string;
    bookAgainUrl?: string;
    reason?: string;
    freeCancelHours: number;
  },
) {
  const s = strings[props.lang];
  const { kind } = props;
  const title =
    kind === "request" || kind === "requestGroup"
      ? s.requestReceived.title
      : kind === "confirmed"
        ? s.confirmed.title
        : kind === "reminder"
          ? s.reminder.title
          : kind === "cancelledByClient"
            ? s.cancelledClient.titleByClient
            : s.cancelledClient.titleByCoach;
  const preview =
    kind === "request" || kind === "requestGroup"
      ? s.requestReceived.preview
      : kind === "confirmed"
        ? s.confirmed.preview
        : kind === "reminder"
          ? s.reminder.preview
          : s.cancelledClient.preview;
  const body =
    kind === "request"
      ? s.requestReceived.body
      : kind === "requestGroup"
        ? s.requestReceived.groupBody
        : kind === "confirmed"
          ? s.confirmed.body
          : kind === "reminder"
            ? s.reminder.body
            : kind === "cancelledByClient"
              ? s.cancelledClient.bodyByClient
              : s.cancelledClient.bodyByCoach;
  const cancelled = kind === "cancelledByClient" || kind === "cancelledByCoach";
  return (
    <EmailLayout
      lang={props.lang}
      preview={preview}
      title={title}
      ornamentUrl={props.ornamentUrl}
      brand={props.brand}
      footer={s.footerNote}
    >
      <P>{s.greeting(props.details.clientName)}</P>
      <P>{body}</P>
      {cancelled && props.reason ? (
        <P>
          {s.cancelledClient.reason}: {props.reason}
        </P>
      ) : null}
      <DetailRows rows={bookingRows(props.lang, props.details)} />
      {kind === "confirmed" || kind === "reminder" ? (
        <P>{s.confirmed.cancelNote(props.freeCancelHours)}</P>
      ) : null}
      {!cancelled && props.manageUrl ? (
        <PrimaryButton href={props.manageUrl}>{s.manageLink}</PrimaryButton>
      ) : null}
      {cancelled && props.bookAgainUrl ? (
        <SecondaryButton href={props.bookAgainUrl}>{s.cancelledClient.bookAgain}</SecondaryButton>
      ) : null}
      <P>
        {s.signature}
        <br />
        {props.brand}
      </P>
    </EmailLayout>
  );
}

export function CoachBookingEmail(
  props: Common & {
    mode: "request" | "instant" | "cancelled";
    details: BookingDetails;
    contactLine: string;
    message?: string;
    level?: string;
    confirmUrl?: string;
    declineUrl?: string;
    whatsappUrl?: string | null;
    adminUrl: string;
    reason?: string;
  },
) {
  const c = coachStrings;
  const title = props.mode === "cancelled" ? c.cancelled.title : c.newBooking.title;
  const rows = bookingRows("ro", props.details);
  rows.push([strings.ro.details.contact, props.contactLine]);
  if (props.level) rows.push([strings.ro.details.level, props.level]);
  if (props.message) rows.push([strings.ro.details.message, props.message]);
  if (props.reason) rows.push([strings.ro.cancelledClient.reason, props.reason]);
  return (
    <EmailLayout
      lang="ro"
      preview={`${props.details.code} · ${props.details.when}`}
      title={title}
      ornamentUrl={props.ornamentUrl}
      brand={props.brand}
      footer="Notificare automată de pe site."
    >
      {props.mode === "request" ? <P>{c.newBooking.requestNote}</P> : null}
      {props.mode === "instant" ? <P>{c.newBooking.instantNote}</P> : null}
      <DetailRows rows={rows} />
      {props.mode === "request" && props.confirmUrl ? (
        <PrimaryButton href={props.confirmUrl}>{c.newBooking.confirm}</PrimaryButton>
      ) : null}
      {props.mode === "request" && props.declineUrl ? (
        <SecondaryButton href={props.declineUrl}>{c.newBooking.decline}</SecondaryButton>
      ) : null}
      {props.whatsappUrl ? (
        <SecondaryButton href={props.whatsappUrl}>{c.newBooking.whatsapp}</SecondaryButton>
      ) : null}
      <P>
        <QuietLink href={props.adminUrl}>{c.newBooking.open}</QuietLink>
      </P>
    </EmailLayout>
  );
}

export function SimpleEmail(
  props: Common & {
    preview: string;
    title: string;
    paragraphs: string[];
    rows?: [string, string][];
    button?: { href: string; label: string };
    secondary?: { href: string; label: string };
    footer?: string;
  },
) {
  return (
    <EmailLayout
      lang={props.lang}
      preview={props.preview}
      title={props.title}
      ornamentUrl={props.ornamentUrl}
      brand={props.brand}
      footer={props.footer ?? strings[props.lang].footerNote}
    >
      {props.paragraphs.map((text, index) => (
        <P key={index}>{text}</P>
      ))}
      {props.rows ? <DetailRows rows={props.rows} /> : null}
      {props.button ? (
        <PrimaryButton href={props.button.href}>{props.button.label}</PrimaryButton>
      ) : null}
      {props.secondary ? (
        <P>
          <QuietLink href={props.secondary.href}>{props.secondary.label}</QuietLink>
        </P>
      ) : null}
    </EmailLayout>
  );
}
