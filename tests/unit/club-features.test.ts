import { describe, expect, it } from "vitest";
import {
  describeGiftCard,
  generateGiftCode,
  giftCardPrice,
  giftCardState,
  giftExpiry,
  normalizeGiftCode,
} from "@/lib/gift-cards";
import {
  parseScore,
  partnerMatches,
  publicPlayerName,
  standings,
  winnerFromScore,
} from "@/lib/league";
import { formatRating, googleReviewLink, googleReviews, starParts } from "@/lib/reviews";
import { startTimes } from "@/lib/court-hours";

describe("gift cards", () => {
  it("makes readable codes and accepts them however they are typed", () => {
    const code = generateGiftCode();
    expect(code).toMatch(/^CADOU-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(normalizeGiftCode(code.toLowerCase().replaceAll("-", " "))).toBe(code);
    expect(normalizeGiftCode("7kq2m9xp")).toBe("CADOU-7KQ2-M9XP");
    expect(normalizeGiftCode("CADOU-7KQ2-M9X")).toBeNull();
    // 0, O, 1 and I are left out, so they cannot be confused.
    expect(normalizeGiftCode("CADOU-0KQ2-M9XP")).toBeNull();
  });

  it("describes what a card holds, in Romanian grammar", () => {
    expect(
      describeGiftCard(
        { lessonName: "Lecție individuală", lessons: 1, durationMin: 60, amountRon: null },
        "ro",
      ),
    ).toBe("o lecție · Lecție individuală, 60 de minute");
    expect(
      describeGiftCard({ lessonName: null, lessons: 5, durationMin: 90, amountRon: null }, "ro"),
    ).toBe("5 lecții · Lecție de tenis, 90 de minute");
    expect(
      describeGiftCard(
        { lessonName: null, lessons: null, durationMin: null, amountRon: 250 },
        "ro",
      ),
    ).toBe("Card valoric: 250 de lei");
    expect(
      describeGiftCard(
        { lessonName: "Private", lessons: 10, durationMin: 60, amountRon: null },
        "en",
      ),
    ).toBe("10 lessons · Private, 60 minutes");
  });

  it("prices lesson cards from the hourly rate, or leaves the price to the club", () => {
    expect(giftCardPrice({ amountRon: null, hourlyRate: "150", durationMin: 90, lessons: 5 })).toBe(
      1125,
    );
    expect(giftCardPrice({ amountRon: null, hourlyRate: null, durationMin: 60, lessons: 1 })).toBe(
      null,
    );
    expect(
      giftCardPrice({ amountRon: 300, hourlyRate: null, durationMin: null, lessons: null }),
    ).toBe(300);
  });

  it("is valid for a year and can be used once", () => {
    expect(giftExpiry(new Date("2026-09-25T15:00:00Z")).toISOString().slice(0, 10)).toBe(
      "2027-09-25",
    );
    const now = new Date("2026-10-01T10:00:00Z");
    const active = { status: "ACTIVA", expiresAt: new Date("2027-09-25"), bookingId: null };
    expect(giftCardState(active, now)).toBe("usable");
    // Still usable on its last day.
    expect(giftCardState(active, new Date("2027-09-25T20:00:00Z"))).toBe("usable");
    expect(giftCardState(active, new Date("2027-09-26T12:00:00Z"))).toBe("expired");
    expect(giftCardState({ ...active, bookingId: "b1" }, now)).toBe("used");
    expect(giftCardState({ ...active, status: "CERERE" }, now)).toBe("inactive");
  });
});

describe("amateur league", () => {
  it("shows only the first name and an initial", () => {
    expect(publicPlayerName("Andrei Popescu")).toBe("Andrei P.");
    expect(publicPlayerName("  maria ioana stan ")).toBe("maria S.");
    expect(publicPlayerName("Radu")).toBe("Radu");
  });

  it("reads scores and finds the winner", () => {
    expect(parseScore("6-4 3-6 10-7")).toEqual([
      { a: 6, b: 4 },
      { a: 3, b: 6 },
      { a: 10, b: 7 },
    ]);
    expect(parseScore("7-6(5), 6:3")).toEqual([
      { a: 7, b: 6 },
      { a: 6, b: 3 },
    ]);
    expect(parseScore("câștigat")).toBeNull();
    expect(winnerFromScore(parseScore("4-6 2-6"))).toBe("B");
    expect(winnerFromScore(parseScore("6-4 4-6"))).toBeNull();
  });

  it("ranks by points, then sets, games and the match between them", () => {
    const table = standings([
      { playerAId: "ana", playerBId: "bia", score: "6-4 6-4", winner: null, walkover: false },
      { playerAId: "bia", playerBId: "cris", score: "6-1 6-1", winner: null, walkover: false },
      { playerAId: "cris", playerBId: "ana", score: "6-3 3-6 10-8", winner: null, walkover: false },
      { playerAId: "dan", playerBId: "ana", score: null, winner: "B", walkover: true },
      { playerAId: "dan", playerBId: "bia", score: null, winner: null, walkover: false },
    ]);
    expect(table.map((row) => [row.playerId, row.points])).toEqual([
      ["ana", 7],
      ["bia", 4],
      ["cris", 4],
      ["dan", 0],
    ]);
    expect(table[0]).toMatchObject({ played: 3, won: 2, lost: 1, setsWon: 3, setsLost: 2 });
    // A walkover loss scores nothing; a match not played yet does not count.
    expect(table[3]).toMatchObject({ played: 1, lost: 1, points: 0 });
  });

  it("suggests partners of a close level who play at the same times", () => {
    const me = {
      id: "me",
      level: "INTERMEDIAR",
      slots: ["SEARA"],
      singles: true,
      doubles: false,
    };
    const others = [
      { id: "a", level: "INTERMEDIAR", slots: ["SEARA"], singles: true, doubles: false },
      { id: "b", level: "COMPETITIE", slots: ["SEARA"], singles: true, doubles: false },
      { id: "c", level: "AVANSAT", slots: ["WEEKEND"], singles: true, doubles: true },
      { id: "d", level: "INCEPATOR", slots: [], singles: true, doubles: false },
      { id: "e", level: "INTERMEDIAR", slots: ["SEARA"], singles: false, doubles: true },
    ];
    expect(partnerMatches(me, [me, ...others]).map((p) => p.id)).toEqual(["a", "d"]);
  });
});

describe("Google reviews", () => {
  const base = {
    brandName: "Elite Tenis Club",
    googleRating: 4.5,
    googleReviewCount: 257,
    googleReviewUrl: null,
  };

  it("shows the rating only when both numbers are set", () => {
    expect(googleReviews(base)).toEqual({
      rating: 4.5,
      count: 257,
      url: "https://www.google.com/maps/search/?api=1&query=Elite%20Tenis%20Club",
    });
    expect(googleReviews({ ...base, googleReviewCount: null })).toBeNull();
    expect(googleReviews({ ...base, googleRating: 7 })).toBeNull();
  });

  it("uses the club's own review link when it is safe", () => {
    expect(googleReviewLink({ ...base, googleReviewUrl: "https://g.page/r/abc/review" })).toBe(
      "https://g.page/r/abc/review",
    );
    expect(googleReviewLink({ ...base, googleReviewUrl: "javascript:alert(1)" })).toContain(
      "google.com/maps",
    );
  });

  it("draws half stars and writes the rating the local way", () => {
    expect(starParts(4.5)).toEqual(["full", "full", "full", "full", "half"]);
    expect(starParts(4.2)).toEqual(["full", "full", "full", "full", "empty"]);
    expect(formatRating(4.5, "ro")).toBe("4,5");
    expect(formatRating(4.5, "en")).toBe("4.5");
  });
});

describe("court hire hours", () => {
  it("offers start times until an hour before a closing time after midnight", () => {
    const times = startTimes("08:00", "01:00");
    expect(times[0]).toBe("08:00");
    expect(times.at(-1)).toBe("00:00");
    expect(times).toContain("23:30");
    expect(startTimes("08:00", "23:00").at(-1)).toBe("22:00");
  });
});
