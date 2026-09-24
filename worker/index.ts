/**
 * Background worker: a separate process from the same Docker image.
 *   every minute      retry emails that have not left yet
 *   every 5 minutes   24-hour reminders
 *   every 30 minutes  review invitations after a first completed lesson
 *   every day 03:15   GDPR retention (anonymisation) and cleanup of expired data
 */
import cron from "node-cron";
import { getEnv } from "../lib/env";
import { db } from "../lib/db";
import {
  cleanup,
  retryDueEmails,
  runRetention,
  sendDueReminders,
  sendDueReviewInvites,
} from "../lib/jobs";

try {
  getEnv();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const running = new Set<string>();

function job(name: string, fn: () => Promise<unknown>) {
  return async () => {
    if (running.has(name)) return;
    running.add(name);
    const started = Date.now();
    try {
      const result = await fn();
      const summary = typeof result === "number" ? result : JSON.stringify(result);
      if (result && summary !== "0" && summary !== "{}")
        console.info(`[worker] ${name}: ${summary} (${Date.now() - started} ms)`);
    } catch (error) {
      console.error(`[worker] ${name} a eșuat:`, error);
    } finally {
      running.delete(name);
    }
  };
}

const settings = await db.siteSettings
  .findUnique({ where: { id: 1 }, select: { timezone: true } })
  .catch(() => null);
const timezone = settings?.timezone ?? "Europe/Bucharest";
const tasks = [
  cron.schedule(
    "* * * * *",
    job("emailuri", () => retryDueEmails()),
    { timezone },
  ),
  cron.schedule(
    "*/5 * * * *",
    job("mementouri", () => sendDueReminders()),
    { timezone },
  ),
  cron.schedule(
    "*/30 * * * *",
    job("invitații recenzie", () => sendDueReviewInvites()),
    { timezone },
  ),
  cron.schedule(
    "15 3 * * *",
    job("retenție", () => runRetention()),
    { timezone },
  ),
  cron.schedule(
    "25 3 * * *",
    job("curățenie", () => cleanup()),
    { timezone },
  ),
];

console.info("[worker] pornit: emailuri, mementouri, invitații, retenție, curățenie.");
void job("emailuri", () => retryDueEmails())();

async function shutdown(signal: string) {
  console.info(`[worker] oprire (${signal})`);
  for (const task of tasks) await task.stop();
  await db.$disconnect();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
