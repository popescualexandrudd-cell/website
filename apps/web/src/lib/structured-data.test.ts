import { describe, expect, it } from "vitest";
import type { CalendarItem } from "./events";
import { breadcrumbData, clubData, eventsData, faqData, jsonLdText, pageUrl } from "./structured-data";

const event = (fields: Partial<CalendarItem>): CalendarItem => ({
  id: "e1",
  kind: "dj_night",
  title_ro: "Seară cu DJ",
  title_en: "DJ night",
  text_ro: "Muzică live",
  text_en: "",
  starts_at: "2027-04-03T17:00:00Z",
  ends_at: "2027-04-03T20:00:00Z",
  cancelled: false,
  demo: false,
  tournament: null,
  ...fields,
});

describe("schema.org for search engines (§15.1)", () => {
  it("the club: address, hours every day, the phone only when the panel has it", () => {
    const club = clubData("ro", "Patru terenuri", ["08:00", "23:00"], null);
    expect(club["@type"]).toBe("SportsActivityLocation");
    expect(club.url).toBe(pageUrl("ro"));
    expect(club.openingHoursSpecification).toMatchObject({ opens: "08:00", closes: "23:00" });
    expect(club).not.toHaveProperty("telephone");
    const withPhone = clubData("en", "Four courts", ["08:00", "23:00"], { phone: " 0722 000 000 " } as never);
    expect(withPhone.telephone).toBe("0722 000 000");
    expect(clubData("en", "x", ["08:00", "23:00"], { phone: "  " } as never)).not.toHaveProperty("telephone");
  });

  it("the questions as a FAQPage", () => {
    expect(faqData([{ q: "Când?", a: "08–23" }])).toEqual({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [{ "@type": "Question", name: "Când?", acceptedAnswer: { "@type": "Answer", text: "08–23" } }],
    });
  });

  it("only real events, cancelled ones marked, in the page's language", () => {
    const data = eventsData(
      [
        event({}),
        event({ id: "e2", demo: true }), // invariant 12: demo events are not offered as real
        event({ id: "e3", cancelled: true, ends_at: null, title_en: "", text_ro: "" }),
      ],
      "en",
    );
    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({ "@type": "Event", name: "DJ night", endDate: "2027-04-03T20:00:00Z" });
    expect(data[0]).not.toHaveProperty("description"); // no English text: none
    expect(data[1]).toMatchObject({ name: "Seară cu DJ", eventStatus: "https://schema.org/EventCancelled" });
    expect(data[1]).not.toHaveProperty("endDate");
    expect(eventsData([event({})], "ro")[0]).toMatchObject({ description: "Muzică live", eventStatus: "https://schema.org/EventScheduled" });
  });

  it("the path of a page, and a script text that cannot close its tag", () => {
    const crumbs = breadcrumbData([{ name: "Jungle Padel", url: pageUrl("ro") }, { name: "Padel", url: pageUrl("ro", "/padel") }]);
    expect(crumbs.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Jungle Padel", item: pageUrl("ro") },
      { "@type": "ListItem", position: 2, name: "Padel", item: pageUrl("ro", "/padel") },
    ]);
    expect(pageUrl("en", "/")).toBe(pageUrl("en"));
    expect(jsonLdText({ name: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
});
