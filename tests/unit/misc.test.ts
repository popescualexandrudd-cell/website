import { describe, expect, it } from "vitest";
import { buildIcs, escapeIcsText, foldIcsLine } from "@/lib/ics";
import { cancelDeadline, canCancelFree } from "@/lib/booking";
import {
  deriveToken,
  generateBookingCode,
  hashToken,
  signPayload,
  verifyPayload,
} from "@/lib/tokens";
import { fillLegalTemplate } from "@/lib/legal";
import { formatPrice, whatsappLink } from "@/lib/format";
import { t, tList, isFilled } from "@/lib/i18n-content";
import { orderedListItems, renderMarkdown } from "@/lib/markdown";

describe("free cancellation limit", () => {
  const startsAt = new Date("2026-05-10T15:00:00Z");
  it("allows cancelling up to exactly 24 hours before", () => {
    expect(cancelDeadline(startsAt, 24).toISOString()).toBe("2026-05-09T15:00:00.000Z");
    expect(canCancelFree(startsAt, 24, new Date("2026-05-09T15:00:00Z"))).toBe(true);
    expect(canCancelFree(startsAt, 24, new Date("2026-05-09T15:00:01Z"))).toBe(false);
    expect(canCancelFree(startsAt, 24, new Date("2026-05-01T10:00:00Z"))).toBe(true);
  });
});

describe("calendar file", () => {
  it("escapes text and folds long lines at 75 octets", () => {
    expect(escapeIcsText("a, b; c\nd\\")).toBe("a\\, b\\; c\\nd\\\\");
    const folded = foldIcsLine(`DESCRIPTION:${"ă".repeat(60)}`);
    for (const line of folded.split("\r\n"))
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });

  it("writes UTC times and the event fields", () => {
    const ics = buildIcs(
      {
        uid: "TN-1@example.ro",
        start: new Date("2026-06-01T07:00:00Z"),
        end: new Date("2026-06-01T08:00:00Z"),
        summary: "Lecție, individuală",
        location: "Baza; Str. 1",
      },
      new Date("2026-05-01T00:00:00Z"),
    );
    expect(ics).toContain("DTSTART:20260601T070000Z");
    expect(ics).toContain("DTEND:20260601T080000Z");
    expect(ics).toContain("SUMMARY:Lecție\\, individuală");
    expect(ics).toContain("LOCATION:Baza\\; Str. 1");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
  });
});

describe("tokens", () => {
  it("signs and verifies payloads, rejecting tampering", () => {
    const token = signPayload({ b: "abc", a: "confirm" }, 60);
    expect(verifyPayload(token)?.b).toBe("abc");
    const [body] = token.split(".");
    expect(verifyPayload(`${body}.AAAA`)).toBeNull();
  });

  it("derives stable tokens and stores only hashes", () => {
    expect(deriveToken("booking-manage", "id1")).toBe(deriveToken("booking-manage", "id1"));
    expect(deriveToken("booking-manage", "id1")).not.toBe(deriveToken("booking-manage", "id2"));
    expect(hashToken("x")).toHaveLength(64);
    expect(generateBookingCode()).toMatch(/^TN-[A-HJ-NP-Z2-9]{6}$/);
  });
});

describe("content helpers", () => {
  it("falls back to Romanian when a translation is missing", () => {
    expect(t({ ro: "Prețuri", en: "Prices" }, "en")).toBe("Prices");
    expect(t({ ro: "Prețuri", en: "" }, "en")).toBe("Prețuri");
    expect(tList({ ro: ["a"], en: [] }, "en")).toEqual(["a"]);
    expect(isFilled("[DE COMPLETAT]")).toBe(false);
  });

  it("formats prices and marks missing ones", () => {
    expect(formatPrice("250.00", "RON", "ro")).toBe("250 lei");
    expect(formatPrice("1200.5", "RON", "en")).toBe("RON 1,200.50");
    expect(formatPrice(null, "RON", "ro")).toBe("[DE COMPLETAT]");
    expect(whatsappLink("+40 722 123 456", "Bună")).toBe(
      "https://wa.me/40722123456?text=Bun%C4%83",
    );
    expect(whatsappLink("[DE COMPLETAT]")).toBeNull();
    // Local Romanian numbers get the country code that wa.me needs.
    expect(whatsappLink("0722 501 748")).toBe("https://wa.me/40722501748");
    expect(whatsappLink("0040 722 501 748")).toBe("https://wa.me/40722501748");
  });

  it("fills the legal templates from the settings", () => {
    const text = fillLegalTemplate(
      "{{entitate.denumire}} · {{anulare.ore}} h · {{necunoscut}}",
      {
        legalName: "PFA Test",
        legalForm: "PFA",
        legalCui: "1",
        legalAddress: "X",
        email: "a@b.ro",
        phone: "1",
        freeCancelHours: 24,
        paymentMethods: ["Numerar"],
        bookingMode: "CERERE",
      } as Parameters<typeof fillLegalTemplate>[1],
      "v1",
      "ro",
      24,
    );
    expect(text).toBe("PFA Test · 24 h · {{necunoscut}}");
  });

  it("renders Markdown without raw HTML and highlights missing content", () => {
    expect(renderMarkdown("<script>alert(1)</script>")).not.toContain("<script>");
    expect(renderMarkdown("Nume: [DE COMPLETAT]")).toContain(
      '<mark class="todo-mark">[DE COMPLETAT]</mark>',
    );
    expect(orderedListItems("1. **Evaluare.** La prima lecție.\n2. Plan")).toEqual([
      { title: "Evaluare", text: "La prima lecție." },
      { title: "", text: "Plan" },
    ]);
  });
});
