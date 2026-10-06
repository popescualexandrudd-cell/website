/**
 * The events section (§9.2.12, R-110): the club's calendar, read on the server from the public API
 * (`GET /api/v1/events/calendar`): the events published from the panel and the league's open
 * tournaments (§6.14), in time order, plus the event room. Cached under the "events" tag: the
 * backend asks for a refresh when an event changes; tournaments show within five minutes.
 */
import { clubClock, clubDay } from "./live";
import { SERVER_API_URL, LOCATION_SLUG } from "./site";

export const EVENTS_TAG = "events";
export const KINDS = ["dj_night", "social", "club", "tournament"] as const;
export const FORMATS = ["knockout", "groups_knockout", "round_robin", "americano", "mexicano", "king_of_the_court"] as const;

export type CalendarItem = {
  id: string;
  kind: string;
  title_ro: string;
  title_en: string;
  text_ro: string;
  text_en: string;
  starts_at: string;
  ends_at: string | null;
  cancelled: boolean;
  demo: boolean;
  tournament: { format: string; status: string; registration_closes_at: string; places_left: number } | null;
};
export type EventRoom = { capacity: number | null; price_per_hour: number | null; provisional: boolean };
export type Calendar = { items: CalendarItem[]; room: EventRoom | null };

/** The calendar, or null when the API does not answer (the section says so). */
export async function eventsCalendar(fetchImpl: typeof fetch = fetch): Promise<Calendar | null> {
  try {
    const response = await fetchImpl(`${SERVER_API_URL}/api/v1/events/calendar?location=${LOCATION_SLUG}`, {
      next: { revalidate: 300, tags: [EVENTS_TAG] },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as Partial<Calendar>;
    return Array.isArray(data.items) ? { items: data.items, room: data.room ?? null } : null;
  } catch {
    return null;
  }
}

/** The title and text in the page's language (the panel asks for both titles, R-140); a missing
 * English title falls back to the Romanian one, a missing text is left out. */
export function wording(item: CalendarItem, locale: string): { title: string; text: string } {
  return locale === "en" ? { title: item.title_en || item.title_ro, text: item.text_en } : { title: item.title_ro, text: item.text_ro };
}

/** A known kind, or "club" for one added later on the server without texts yet. */
export function kindOf(item: CalendarItem): (typeof KINDS)[number] {
  return (KINDS as readonly string[]).includes(item.kind) ? (item.kind as (typeof KINDS)[number]) : "club";
}

/** When, in club time: the club day ("2027-03-19"), the start and the end ("20:00", "23:00"); a
 * tournament has no end, and an event ending on a later day shows that day's date too. */
export function when(item: CalendarItem): { day: string; from: string; to: string | null; endDay: string | null } {
  const start = new Date(item.starts_at);
  const end = item.ends_at ? new Date(item.ends_at) : null;
  const day = clubDay(start);
  const endDay = end ? clubDay(new Date(end.getTime() - 1)) : null;
  return {
    day,
    from: clubClock(start),
    to: end ? clubClock(end) : null,
    endDay: endDay && endDay !== day ? endDay : null,
  };
}
