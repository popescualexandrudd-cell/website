import type { ReactElement } from "react";
import { render } from "react-email";
import { db } from "../db";
import { fromAddress, getTransporter } from "./transport";

export type EmailAttachment = { filename: string; content: string; contentType: string };
type Payload = { html: string; text: string; attachments?: EmailAttachment[]; replyTo?: string };

const MAX_ATTEMPTS = 6;
const BACKOFF_MINUTES = [1, 5, 15, 60, 240, 720];

function isPayload(value: unknown): value is Payload {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.html === "string" && typeof v.text === "string";
}

/**
 * Renders the React Email element and records the message in EmailLog (status IN_ASTEPTARE).
 * Delivery happens in `deliverEmail`; failures are retried by the worker with backoff.
 */
export async function queueEmail(options: {
  to: string;
  template: string;
  subject: string;
  element: ReactElement;
  attachments?: EmailAttachment[];
  bookingId?: string;
  replyTo?: string;
}): Promise<string> {
  const html = await render(options.element);
  const text = await render(options.element, { plainText: true });
  const payload: Payload = {
    html,
    text,
    attachments: options.attachments,
    replyTo: options.replyTo,
  };
  const log = await db.emailLog.create({
    data: {
      to: options.to,
      template: options.template,
      subject: options.subject,
      payload,
      bookingId: options.bookingId ?? null,
      status: "IN_ASTEPTARE",
      // The request that queued it delivers it right away; the worker only picks it up later
      // if that first delivery never happened (e.g. the process restarted).
      nextAttemptAt: new Date(Date.now() + 2 * 60_000),
    },
  });
  return log.id;
}

/** Sends one queued email. Returns true when it left the server. */
export async function deliverEmail(id: string): Promise<boolean> {
  const log = await db.emailLog.findUnique({ where: { id } });
  if (!log || log.status === "TRIMIS") return Boolean(log);
  if (!isPayload(log.payload)) {
    await db.emailLog.update({
      where: { id },
      data: { status: "ESUAT", error: "Conținut invalid" },
    });
    return false;
  }
  const payload = log.payload;
  const attempts = log.attempts + 1;
  // Claim the message so a concurrent worker run cannot send it twice.
  const claimed = await db.emailLog.updateMany({
    where: { id, status: "IN_ASTEPTARE", attempts: log.attempts },
    data: { attempts, nextAttemptAt: new Date(Date.now() + 10 * 60_000) },
  });
  if (claimed.count === 0) return false;
  try {
    await getTransporter().sendMail({
      from: fromAddress(),
      to: log.to,
      subject: log.subject,
      html: payload.html,
      text: payload.text,
      replyTo: payload.replyTo,
      attachments: payload.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });
    await db.emailLog.update({
      where: { id },
      data: { status: "TRIMIS", sentAt: new Date(), attempts, error: null, nextAttemptAt: null },
    });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const giveUp = attempts >= MAX_ATTEMPTS;
    const delay = BACKOFF_MINUTES[Math.min(attempts - 1, BACKOFF_MINUTES.length - 1)] ?? 60;
    await db.emailLog.update({
      where: { id },
      data: {
        status: giveUp ? "ESUAT" : "IN_ASTEPTARE",
        attempts,
        error: message.slice(0, 500),
        nextAttemptAt: giveUp ? null : new Date(Date.now() + delay * 60_000),
      },
    });
    console.error(`Email ${id} (${log.template}) nu a plecat, încercarea ${attempts}: ${message}`);
    return false;
  }
}

export async function deliverEmails(ids: string[]): Promise<void> {
  for (const id of ids) await deliverEmail(id);
}

/** Worker: sends everything due (new messages whose first attempt failed or never ran). */
export async function retryDueEmails(limit = 25): Promise<number> {
  const due = await db.emailLog.findMany({
    where: { status: "IN_ASTEPTARE", nextAttemptAt: { lte: new Date() } },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true },
  });
  let sent = 0;
  for (const { id } of due) if (await deliverEmail(id)) sent += 1;
  return sent;
}
